"use strict";
/* Vérification des certificats : client du registre (js/certificats-core.js), script Google de la feuille
   (google-sheets/certificats.gs, exécuté ici avec une fausse feuille Google Sheets), page publique, recherche,
   Centre d'aide et assistant.   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const C = require("../js/certificats-core.js");

/* ------------------------------------------------------------------ saisies */
test("nom : nettoyé, obligatoire, lettres / espaces / apostrophes / tirets seulement", () => {
  assert.deepEqual(C.validateName("  Van   Osselt "), { value: "Van Osselt", error: "" });
  assert.equal(C.validateName("D’Hondt").error, "");
  assert.equal(C.validateName("Ngô-Thị").error, "");
  assert.equal(C.validateName("").error, "required");
  assert.equal(C.validateName("Dupont3").error, "invalid");
  assert.equal(C.validateName("<script>").error, "invalid");
  assert.equal(C.validateName("x".repeat(81)).error, "too_long");
});

test("date de naissance : JJ/MM/AAAA ou AAAA-MM-JJ, jamais devinée", () => {
  const today = "2026-10-13";
  assert.deepEqual(C.parseBirthDate("27/03/1985", today), { iso: "1985-03-27", error: "" });
  assert.deepEqual(C.parseBirthDate("1985-03-27", today), { iso: "1985-03-27", error: "" });
  assert.deepEqual(C.parseBirthDate("27031985", today), { iso: "1985-03-27", error: "" });
  assert.equal(C.parseBirthDate("31/02/1990", today).error, "invalid");
  assert.equal(C.parseBirthDate("03/04/90", today).error, "format");
  assert.equal(C.parseBirthDate("01/01/2030", today).error, "future");
  assert.equal(C.parseBirthDate("01/01/1850", today).error, "too_old");
  assert.equal(C.maskBirthInput("27031985"), "27/03/1985");
});

/* ------------------------------------------------------------------ réponse du registre */
test("réponse « found » : seuls les champs publics sont conservés, jamais un faux « valide »", () => {
  const r = C.normalizeResult({
    status: "found", checkedAt: "2026-10-13T10:00:00Z", today: "2026-10-13", timezone: "Europe/Brussels",
    certificates: [{ holder: "Marie Dupont", training: "VCA Base", certificateNumber: "WS-1", trainingDate: "2025-03-12", issueDate: null, expiryDate: "2035-03-12", status: "valid", birthDate: "1992-05-14", email: "x@y.z" }]
  });
  assert.equal(r.kind, "found");
  assert.deepEqual(Object.keys(r.certificates[0]).sort(), ["certificateNumber", "expiryDate", "holder", "issueDate", "status", "training", "trainingDate"]);
  assert.equal(C.normalizeResult({ status: "found", certificates: [{ holder: "X", status: "valide" }] }), null, "statut inconnu → réponse rejetée");
  assert.equal(C.normalizeResult({ status: "found", certificates: [] }), null);
  assert.equal(C.normalizeResult({ status: "not_found" }).kind, "not_found");
  assert.deepEqual(C.normalizeResult({ status: "invalid", fields: { lastName: "required", evil: "x" } }), { kind: "invalid", fields: { lastName: "required" } });
  assert.equal(C.normalizeResult({ status: "rate_limited", retryAfter: 5 }).retryAfter, 60, "attente minimale d'une minute");
});

function fakeFetch(status, body, seen) {
  return (url, init) => {
    if (seen) { seen.url = url; seen.init = init; }
    return Promise.resolve({ status, headers: { get: () => null }, text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)) });
  };
}
const API = "https://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/exec";
const CFG = { API_URL: API };

test("client : adresse acceptée uniquement si c'est un script Google déployé (…/macros/s/…/exec)", () => {
  assert.equal(C.endpoint(CFG), API);
  assert.equal(C.endpoint({ API_URL: "" }), null);
  assert.equal(C.endpoint({ API_URL: "https://exemple.com/api" }), null);
  assert.equal(C.endpoint({ API_URL: "https://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/dev" }), null, "jamais l'URL de test /dev");
  assert.equal(C.endpoint({ API_URL: "http://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/exec" }), null, "http refusé");
  const site = {}; vm.runInNewContext(read("js/certificats-config.js"), { window: site });
  assert.ok(site.WISY_CERTIFICATS && (site.WISY_CERTIFICATS.API_URL === "" || C.endpoint(site.WISY_CERTIFICATS)), "js/certificats-config.js : adresse vide ou valide");
});

test("client : POST « text/plain » (sans pré-vérification CORS), redirection suivie, rien dans l'URL", async () => {
  const seen = {};
  const r = await C.verify({ config: CFG, lastName: "Dupont", birthDate: "1992-05-14", fetch: fakeFetch(200, { status: "not_found" }, seen) });
  assert.equal(r.kind, "not_found");
  assert.equal(seen.url, API);
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.equal(seen.init.redirect, "follow");
  assert.deepEqual(JSON.parse(seen.init.body), { lastName: "Dupont", birthDate: "1992-05-14" });
  assert.equal(seen.init.credentials, "omit");
  assert.equal(seen.init.referrerPolicy, "no-referrer");
  assert.doesNotMatch(seen.url, /Dupont|1992/);
});

test("client : registre absent, erreurs et pannes → états explicites, jamais d'exception", async () => {
  assert.equal((await C.verify({ config: {}, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, {}) })).kind, "not_configured");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, { status: "not_configured" }) })).kind, "not_configured");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(404, "Not Found") })).kind, "not_configured");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, "<html>Connexion Google</html>") })).kind, "unavailable", "déploiement mal partagé : page HTML");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, { status: "error" }) })).kind, "unavailable");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: () => Promise.reject(new Error("réseau")) })).kind, "unavailable");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, { status: "rate_limited", retryAfter: 900 }) })).retryAfter, 900);
});

test("frise de validité : position d'aujourd'hui entre délivrance et fin de validité", () => {
  const p = C.validityProgress({ trainingDate: "2020-01-01", expiryDate: "2030-01-01" }, "2025-01-01");
  assert.ok(p.ratio > 0.49 && p.ratio < 0.51);
  assert.equal(C.validityProgress({ trainingDate: "2020-01-01", expiryDate: null }, "2025-01-01"), null);
});

/* ------------------------------------------------------------------ script Google (fausse feuille Google Sheets) */
const HEAD = ["Numéro de certificat", "Nom", "Prénom", "Autres noms", "Date de naissance", "Formation", "Date de formation", "Date de délivrance", "Valable jusqu'au", "Révoqué", "Entreprise (interne)", "E-mail (interne)", "Téléphone (interne)", "Notes (interne)"];
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 10));          // cellule « date » de Google Sheets
const SHEET = [HEAD,
  ["ws-1", "Dupont", "Marie", "Martin; Durand", D(1992, 5, 14), "VCA Base", D(2025, 3, 12), D(2025, 3, 14), D(2035, 3, 12), "non", "Entreprise SA", "rh@fictive.test", "0470 00 00 00", "note privée"],
  ["WS-2", "Dupont", "Marie", "", "14/05/1992", "Nacelles élévatrices", "10/02/2018", "", "10/02/2023", "", "", "", "", ""],
  ["WS-3", "Müller", "Hans", "", "02/11/1978", "VCA Ligne hiérarchique", "05/06/2024", "", "05/06/2034", "oui", "", "", "", ""],
  ["WS-4", "D’Hondt", "Claire", "", "21/07/1988", "BEPS", "01/09/2025", "", "", "", "", "", "", ""],
  ["WS-5", "Sans-Date", "Lucie", "", "", "VCA Base", "01/02/2026", "", "01/02/2036", "", "", "", "", ""],
  ["WS-6", "Erreur", "Date", "", "31/02/1990", "VCA Base", "", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["ws-1", "Doublon", "Paul", "", "03/03/1993", "VCA Base", "", "", "", "", "", "", "", ""]
];
function loadScript(rows, nowIso) {
  const store = new Map();
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n) => (rows && n === "Certificats" ? { getDataRange: () => ({ getValues: () => rows }) } : null),
      getSpreadsheetTimeZone: () => "Europe/Brussels" }) },
    CacheService: { getScriptCache: () => ({
      getAll: (keys) => { const o = {}; keys.forEach((k) => { if (store.has(k)) o[k] = store.get(k); }); return o; },
      put: (k, v, ttl) => { assert.ok(ttl >= 1 && ttl <= 21600, "durée de cache Google : 6 h au plus (" + ttl + ")"); store.set(k, v); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: {
      formatDate: (d, tz) => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); const g = (t) => p.find((x) => x.type === t).value; return g("year") + "-" + g("month") + "-" + g("day"); },
      computeDigest: (alg, v) => Array.from(crypto.createHash("sha256").update(String(v)).digest()).map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(read("google-sheets/certificats.gs"), ctx);
  vm.runInContext("now_ = function () { return new Date(" + JSON.stringify(nowIso || "2026-10-13T10:00:00Z") + "); };", ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).text);
  return { ctx, store, post };
}

test("script Google : le service répond sans jamais exposer de donnée (doGet)", () => {
  const { ctx } = loadScript(SHEET);
  assert.deepEqual(JSON.parse(ctx.doGet().text), { service: "wisy-certificats", status: "ok" });
  assert.match(read("google-sheets/certificats.gs"), /^\/\*\*\s*\n \* @OnlyCurrentDoc/, "accès limité à la feuille elle-même");
});

test("script Google : recherche EXACTE, seuls les champs publics, plus récent d'abord", () => {
  const { post } = loadScript(SHEET);
  const r = post({ lastName: "dupont", birthDate: "1992-05-14" });
  assert.equal(r.status, "found");
  assert.equal(r.certificates.length, 2);
  assert.deepEqual(r.certificates[0], { holder: "Marie Dupont", training: "VCA Base", certificateNumber: "WS-1", trainingDate: "2025-03-12", issueDate: "2025-03-14", expiryDate: "2035-03-12", status: "valid" });
  assert.equal(r.certificates[1].status, "expired");
  const all = JSON.stringify(r);
  ["1992", "Entreprise", "rh@", "0470", "note privée", "Martin"].forEach((x) => assert.ok(!all.includes(x), "jamais renvoyé : " + x));
  assert.equal(r.today, "2026-10-13");
  assert.equal(post({ lastName: "DUPONT MARIE", birthDate: "1992-05-14" }).status, "found", "nom + prénom");
  assert.equal(post({ lastName: "Martin", birthDate: "1992-05-14" }).status, "found", "autre nom");
  assert.equal(post({ lastName: "dupon", birthDate: "1992-05-14" }).status, "not_found", "nom partiel");
  assert.equal(post({ lastName: "Dupont", birthDate: "1992-05-15" }).status, "not_found", "autre date");
});

test("script Google : statuts, dates texte ou cellules date, lignes invalides ignorées", () => {
  const { post } = loadScript(SHEET);
  assert.equal(post({ lastName: "Müller", birthDate: "1978-11-02" }).certificates[0].status, "revoked");
  const u = post({ lastName: "d hondt", birthDate: "1988-07-21" }).certificates[0];
  assert.equal(u.status, "undetermined");
  assert.equal(u.expiryDate, null);
  assert.equal(post({ lastName: "Sans Date", birthDate: "2000-01-01" }).status, "not_found");
  assert.equal(post({ lastName: "Erreur", birthDate: "1990-02-28" }).status, "not_found", "31/02 : ligne ignorée, jamais devinée");
  assert.equal(loadScript(SHEET, "2035-03-13T10:00:00Z").post({ lastName: "Dupont", birthDate: "1992-05-14" }).certificates[0].status, "expired", "valable jusqu'au dernier jour inclus");
  assert.equal(loadScript(SHEET, "2035-03-12T20:00:00Z").post({ lastName: "Dupont", birthDate: "1992-05-14" }).certificates[0].status, "valid");
});

test("script Google : saisies invalides refusées, corps illisible sans plantage", () => {
  const { post } = loadScript(SHEET);
  assert.deepEqual(post({ lastName: "", birthDate: "31/02/1990" }), { status: "invalid", fields: { lastName: "required", birthDate: "format" } });
  assert.deepEqual(post({ lastName: "Dupont", birthDate: "1990-02-31" }).fields, { birthDate: "invalid" });
  assert.deepEqual(post({ lastName: "Dupont", birthDate: "2999-01-01" }).fields, { birthDate: "future" });
  assert.deepEqual(post({ lastName: "Dupont3", birthDate: "1990-01-01" }).fields, { lastName: "invalid" });
  assert.deepEqual(post({ lastName: "x".repeat(81), birthDate: "1990-01-01" }).fields, { lastName: "too_long" });
  assert.equal(post("pas du json").status, "invalid");
});

test("script Google : feuille absente ou mal intitulée → « bientôt disponible », jamais d'erreur", () => {
  assert.equal(loadScript(null).post({ lastName: "Dupont", birthDate: "1992-05-14" }).status, "not_configured");
  assert.equal(loadScript([["a", "b"], ["x", "y"]]).post({ lastName: "Dupont", birthDate: "1992-05-14" }).status, "not_configured");
});

test("script Google : limites d'essais (par nom, puis au total) — impossible d'essayer toutes les dates", () => {
  const { post, store } = loadScript(SHEET);
  const res = [];
  for (let d = 1; d <= 11; d++) res.push(post({ lastName: "Dupont", birthDate: "1980-01-" + String(d).padStart(2, "0") }).status);
  assert.deepEqual(res.slice(0, 10), Array(10).fill("not_found"));
  assert.equal(res[10], "rate_limited", "11e essai pour le même nom dans l'heure");
  assert.equal(post({ lastName: "dupont", birthDate: "1992-05-14" }).status, "rate_limited", "même nom écrit autrement : même compteur");
  assert.equal(post({ lastName: "Müller", birthDate: "1978-11-02" }).status, "found", "un autre nom n'est pas bloqué");
  const wait = post({ lastName: "Dupont", birthDate: "1992-05-14" }).retryAfter;
  assert.ok(wait >= 60 && wait <= 3600, "délai indiqué : " + wait);
  assert.ok([...store.keys()].every((k) => !/dupont|muller/i.test(k)), "aucun nom en clair dans le cache");
  const g = loadScript(SHEET);
  for (let i = 0; i < 500; i++) g.post({ lastName: "Nom" + "abcdefghijklmnopqrstuvwxyz"[i % 26] + "abcdefghijklmnopqrstuvwxyz"[Math.floor(i / 26) % 26], birthDate: "1990-01-01" });
  assert.equal(g.post({ lastName: "Müller", birthDate: "1978-11-02" }).status, "rate_limited", "plafond global de 500 par heure");
});

test("script Google : « Vérifier les données » signale doublons, dates impossibles, lignes sans date de naissance", () => {
  const { ctx } = loadScript(SHEET);
  const reg = ctx.readRegistry_();
  const txt = reg.problems.join("\n");
  assert.match(txt, /Ligne 7 : date illisible ou impossible/);
  assert.match(txt, /Ligne 6 : sans date de naissance/);
  assert.match(txt, /Ligne 9 : le numéro « WS-1 » est déjà utilisé à la ligne 2/);
  assert.equal(reg.rows.length, 6, "lignes vides et invalides écartées");
  ["entreprise", "e_mail", "email", "telephone", "notes", "entreprise_interne"].forEach((h) => assert.equal(ctx.HEADER_MAP[h], undefined, "colonne interne jamais lue : " + h));
  assert.deepEqual(Object.keys(reg.rows[0]).sort(), ["birth_date", "certificate_number", "expiry_date", "first_name", "issue_date", "keys", "last_name", "line", "other_last_names", "revoked", "training", "training_date"]);
});

/* ------------------------------------------------------------------ page publique */
const PAGE = read("certificats.html");
test("page : branchée sur la feuille Google Sheets, ni WordPress ni Supabase ; informations techniques retirées", () => {
  assert.doesNotMatch(PAGE, /wp-json|wordpress/i);
  assert.match(PAGE, /<script src="js\/certificats-config\.js"><\/script>\s*<script src="js\/certificats-core\.js"><\/script>\s*<script src="js\/certificats\.js"><\/script>/);
  assert.doesNotMatch(PAGE + read("js/certificats.js") + read("js/certificats-core.js"), /supabase/i, "plus de Supabase pour les certificats");
  ["data-service-status", "wc-steps", "wc-microprint", "wc-how", "wc-priv__", "data-challenge", "cert.trust_"].forEach((s) => assert.ok(!PAGE.includes(s), "retiré : " + s));
  assert.ok(!read("js/certificats.js").includes("/document"), "plus de PDF public");
  assert.match(PAGE, /<link rel="canonical" href="https:\/\/www\.wisysafety\.be\/certificats\.html">/);
  assert.match(PAGE, /<input id="wc-last-name" name="lastName"[^>]*autocomplete="off"/);
  assert.match(PAGE, /<input id="wc-birth-date" name="birthDate"[^>]*inputmode="numeric"/);
});

test("page : aucun stockage navigateur ni innerHTML pour les données du registre", () => {
  const js = (read("js/certificats.js") + read("js/certificats-core.js")).replace(/\/\*[\s\S]*?\*\//g, "");   // code seul, sans les commentaires
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie|\.innerHTML\s*=|insertAdjacentHTML/);
  assert.doesNotMatch(js, /history\.(push|replace)State|location\.(search|hash)\s*=/);
});

test("page : animations sans boucle infinie décorative, désactivées en mouvement réduit", () => {
  const css = read("css/certificats.css");
  const infinite = css.split("\n").filter((l) => /infinite/.test(l));
  infinite.forEach((l) => assert.match(l, /is-busy/, "seule la vérification en cours peut tourner en continu : " + l.trim()));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media print/);
});

test("i18n : les 10 langues ont toutes les clés du français ; chaque clé de la page et du script existe", () => {
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  vm.runInContext(read("js/i18n-data-certificats.js"), ctx);
  const I = ctx.window.I18N, fr = Object.keys(I.fr);
  ["en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => assert.deepEqual(Object.keys(I[l]).sort(), fr.slice().sort(), l));
  const used = new Set((PAGE.match(/data-i18n(?:-html)?="(cert\.[\w]+)"|:(cert\.[\w]+)"/g) || []).map((m) => m.match(/cert\.[\w]+/)[0])
    .concat((read("js/certificats.js").match(/"cert\.[\w]+"/g) || []).map((m) => m.slice(1, -1))));
  used.forEach((k) => assert.ok(fr.includes(k), "clé absente du dictionnaire : " + k));
});

/* ------------------------------------------------------------------ recherche + assistant */
test("recherche : la page figure dans le registre du site (10 langues) et dans le sitemap", () => {
  const Site = require("../js/site-content.js");
  const p = Site.page("certificats");
  assert.ok(p && p.url === "certificats.html");
  assert.ok(Site.publicPaths().includes("certificats.html"));
  assert.match(read("sitemap.xml"), /<loc>https:\/\/www\.wisysafety\.be\/certificats\.html<\/loc>/);
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  vm.runInContext(read("js/i18n-data-search.js"), ctx);
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => assert.ok(ctx.window.I18N[l]["search.page_cert_t"] && ctx.window.I18N[l]["search.page_cert_d"], l));
  assert.match(read("js/search.js"), /page_certificats:/);
  assert.match(read("supabase/functions/chat/site.generated.ts"), /certificats\.html/);
});

test("assistant : « vérifier un certificat » → page de vérification, sans jamais consulter le registre", () => {
  const R = require("../js/assistant/responder.js");
  ["Comment vérifier un certificat ?", "Mon certificat est-il encore valide ?", "J'ai perdu mon attestation, comment la retrouver ?", "Un employeur peut-il vérifier un certificat ?", "Jean Dupont né le 12/03/1985 a-t-il un certificat valide ?"].forEach((q) => {
    const r = R.respond(q);
    assert.equal(r.meta.intent, "certificate_verification", q);
    assert.ok(r.cards.some((c) => c.url === "certificats.html"), q);
    assert.doesNotMatch(r.message, /Dupont|1985/, "ne répète jamais une donnée personnelle");
  });
  assert.notEqual(R.respond("Le certificat VCA est valable combien de temps ?").meta.intent, "certificate_verification", "VCA : registre central BeSaCC");
  assert.notEqual(R.respond("La formation nacelle est-elle reconnue officiellement ?").meta.intent, "certificate_verification");
  assert.notEqual(R.respond("Combien coûte la formation VCA ?").meta.intent, "certificate_verification");
  assert.match(read("supabase/functions/chat/index.ts"), /certificats\.html/, "l'assistant IA serveur connaît la règle");
});

test("Centre d'aide : question « vérifier un certificat » en 10 langues, avec lien vers la page", () => {
  const F = require("../js/faq-search.js");
  const it = F.get("faq-attestations-verifier");
  assert.ok(it && it.action === "certificats");
  assert.equal(F.ACTIONS.certificats.href, "certificats.html");
  assert.equal(F.search("Comment vérifier la validité d'un certificat Wisy Safety ?").top.item.id, "faq-attestations-verifier");
  assert.match(read("supabase/functions/chat/faq.generated.ts"), /faq-attestations-verifier/);
});
