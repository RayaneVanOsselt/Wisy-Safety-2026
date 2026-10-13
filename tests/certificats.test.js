"use strict";
/* Vérification des certificats : client du registre (js/certificats-core.js), import / export Excel
   (js/certificats-import.js), règles de sécurité du registre (supabase/certificats.sql), page publique,
   administration, recherche et assistant.   `node --test tests/*.test.js` — aucune dépendance.
   Le SQL lui-même a été exécuté sur un vrai PostgreSQL (scénario de 46 contrôles décrit dans
   docs/README-CERTIFICATS.md, § « Ce qui a été vérifié ») ; ici on garde les invariants du fichier. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const C = require("../js/certificats-core.js");
const X = require("../js/certificats-import.js");

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
const CFG = { SUPABASE_URL: "https://projet.supabase.co", SUPABASE_ANON_KEY: "sb_publishable_test" };

test("client : POST JSON vers la fonction verify_certificate, clé publique seulement, rien dans l'URL", async () => {
  const seen = {};
  const r = await C.verify({ config: CFG, lastName: "Dupont", birthDate: "1992-05-14", fetch: fakeFetch(200, { status: "not_found" }, seen) });
  assert.equal(r.kind, "not_found");
  assert.equal(seen.url, "https://projet.supabase.co/rest/v1/rpc/verify_certificate");
  assert.equal(seen.init.method, "POST");
  assert.deepEqual(JSON.parse(seen.init.body), { p_last_name: "Dupont", p_birth_date: "1992-05-14" });
  assert.equal(seen.init.headers.apikey, "sb_publishable_test");
  assert.equal(seen.init.credentials, "omit");
  assert.equal(seen.init.referrerPolicy, "no-referrer");
  assert.doesNotMatch(seen.url, /Dupont|1992/);
});

test("client : registre absent, erreurs et pannes → états explicites, jamais d'exception", async () => {
  assert.equal((await C.verify({ config: {}, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, {}) })).kind, "not_configured");
  assert.equal((await C.verify({ config: { SUPABASE_URL: "https://VOTRE-PROJET.supabase.co", SUPABASE_ANON_KEY: "VOTRE_CLE" }, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, {}) })).kind, "not_configured");
  assert.equal((await C.verify({ config: { SUPABASE_URL: "http://exemple.com", SUPABASE_ANON_KEY: "k" }, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, {}) })).kind, "not_configured", "http non chiffré refusé");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(404, { code: "PGRST202" }) })).kind, "not_configured");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(500, "oups") })).kind, "unavailable");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, "pas du json") })).kind, "unavailable");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: () => Promise.reject(new Error("réseau")) })).kind, "unavailable");
  assert.equal((await C.verify({ config: CFG, lastName: "a", birthDate: "1990-01-01", fetch: fakeFetch(200, { status: "rate_limited", retryAfter: 900 }) })).retryAfter, 900);
});

test("frise de validité : position d'aujourd'hui entre délivrance et fin de validité", () => {
  const p = C.validityProgress({ trainingDate: "2020-01-01", expiryDate: "2030-01-01" }, "2025-01-01");
  assert.ok(p.ratio > 0.49 && p.ratio < 0.51);
  assert.equal(C.validityProgress({ trainingDate: "2020-01-01", expiryDate: null }, "2025-01-01"), null);
});

/* ------------------------------------------------------------------ import / export Excel */
test("import : séparateur détecté, guillemets, BOM, en-têtes français / anglais / ancien modèle WordPress", () => {
  assert.equal(X.detectDelimiter("nom;prenom;formation"), ";");
  assert.equal(X.detectDelimiter("nom,prenom,formation"), ",");
  assert.deepEqual(X.parseCSV('﻿nom;note\r\n"Dupont";"dit ""Jo""; ok"\r\n\r\n'), [["nom", "note"], ["Dupont", 'dit "Jo"; ok']]);
  assert.equal(X.normalizeHeader("N° de diplôme"), "n_de_diplome");
  const a = X.analyze("Nom de famille;Prénom;Date de naissance;Formation suivie;Numéro de diplôme;Valable jusqu'au;id_wordpress\nDupont;Marie;14/05/1992;VCA Base;ws-1;12/03/2035;12\n", {});
  assert.equal(a.ok, true);
  assert.deepEqual(a.ignored, [], "id_wordpress : colonne connue, ignorée sans avertissement");
  assert.deepEqual(a.summary, { create: 1, update: 0, error: 0, warning: 0, total: 1 });
  assert.deepEqual(a.rows[0].record.certificate_number, "WS-1");
  assert.equal(a.rows[0].record.birth_date, "1992-05-14");
  assert.equal(a.rows[0].record.expiry_date, "2035-03-12");
});

test("import : aucune date devinée, lignes en erreur listées, doublons du fichier refusés", () => {
  const csv = [
    "nom;prenom;date_naissance;formation;numero_certificat;date_formation;date_expiration;revoque;email",
    "Dupont;Marie;31/02/1990;VCA Base;A-1;;;non;",
    "Martin;Paul;01/01/1980;VCA Base;A-2;01/02/2026;01/02/2025;non;",
    "Leroy;Emma;09/09/1999;;A-3;;;peut-être;pas-un-mail",
    "Sans;Date;;BEPS;A-4;;;;",
    "Doublon;X;03/03/1993;VCA Base;a-4;;;;",
    "Serie;Excel;33970;VCA Base;A-5;;;oui;"
  ].join("\n");
  const a = X.analyze(csv, {});
  const by = (n) => a.rows.find((r) => r.record && r.record.certificate_number === n) || a.rows.find((r) => r.label.indexOf(n) === 0);
  assert.equal(a.rows[0].action, "error", "31/02 : date impossible");
  assert.equal(a.rows[1].action, "error", "fin de validité avant la formation");
  assert.equal(a.rows[2].action, "error", "formation manquante, oui/non illisible, e-mail invalide");
  assert.ok(a.rows[2].errors.length >= 3);
  assert.equal(a.rows[3].action, "create");
  assert.match(a.rows[3].warnings.join(" "), /pas être trouvé en ligne/);
  assert.equal(a.rows[4].action, "error", "numéro déjà présent plus haut dans le fichier");
  assert.equal(by("A-5").record.birth_date, "1993-01-01", "numéro de série Excel converti");
  assert.equal(by("A-5").record.revoked, true);
  assert.equal(X.parseDate("03/04/90").error, "format", "année sur deux chiffres : refusée");
});

test("import : mise à jour d'un certificat existant — une cellule vide ne modifie rien", () => {
  const existing = { "A-1": { id: "u1", certificate_number: "A-1", last_name: "Dupont", first_name: "Marie", birth_date: "1992-05-14", training: "VCA Base", training_date: "2025-03-12", issue_date: null, expiry_date: "2035-03-12", revoked: false, company: "SA", email: null, phone: null, notes: "privé", other_last_names: null, revoked_reason: null } };
  const a = X.analyze("numero_certificat;nom;formation;date_expiration;notes\nA-1;;;12/03/2036;\n", { existing });
  assert.equal(a.rows[0].action, "update");
  assert.equal(a.rows[0].record.expiry_date, "2036-03-12");
  assert.equal(a.rows[0].record.last_name, "Dupont");
  assert.equal(a.rows[0].record.notes, "privé");
  assert.equal(a.rows[0].record.birth_date, "1992-05-14");
});

test("import : numéros générés sur demande, uniques ; en-têtes manquants expliqués", () => {
  let i = 0; const rand = () => [0.1, 0.2, 0.3, 0.4, 0.5][i++ % 5];
  const a = X.analyze("nom;formation\nA;VCA Base\nB;VCA Base\n", { generateMissing: true, rand });
  assert.equal(a.summary.create, 2);
  const n = a.rows.map((r) => r.record.certificate_number);
  assert.match(n[0], /^WS-\d{4}-[A-Z2-9]{5}$/);
  assert.notEqual(n[0], n[1]);
  assert.equal(X.analyze("nom;formation\nA;VCA\n", {}).rows[0].action, "error", "sans option : numéro obligatoire");
  assert.match(X.analyze("colonne1;colonne2\na;b\n", {}).error, /nom.*formation/);
});

test("export : modèle et sauvegarde lisibles par Excel, sans injection de formule", () => {
  const empty = X.toCSV([]);
  assert.ok(empty.startsWith("﻿numero_certificat;nom;prenom;"));
  const csv = X.toCSV([{ certificate_number: "A-1", last_name: "=HYPERLINK(\"x\")", first_name: "Marie", birth_date: "1992-05-14", training: "VCA; Base", revoked: false }]);
  assert.match(csv, /14\/05\/1992/);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"VCA; Base"/);
  const back = X.analyze(X.toCSV([{ certificate_number: "B-2", last_name: "D'Hondt", first_name: "Claire", birth_date: "1988-07-21", training: "VCA; Base", expiry_date: "2035-01-31", revoked: true }]), {});
  assert.deepEqual([back.rows[0].action, back.rows[0].record.last_name, back.rows[0].record.birth_date, back.rows[0].record.training, back.rows[0].record.expiry_date, back.rows[0].record.revoked],
    ["create", "D'Hondt", "1988-07-21", "VCA; Base", "2035-01-31", true], "un export se réimporte tel quel");
});

test("statut : même règle que le serveur (révoqué > sans date > valide jusqu'au dernier jour inclus)", () => {
  assert.equal(X.statusOf({ revoked: true, expiry_date: "2099-01-01" }, "2026-10-13"), "revoked");
  assert.equal(X.statusOf({ expiry_date: null }, "2026-10-13"), "undetermined");
  assert.equal(X.statusOf({ expiry_date: "2026-10-13" }, "2026-10-13"), "valid");
  assert.equal(X.statusOf({ expiry_date: "2026-10-12" }, "2026-10-13"), "expired");
});

/* ------------------------------------------------------------------ sécurité du registre (SQL) */
const SQL = read("supabase/certificats.sql");
test("SQL : table privée, RLS activée, aucun droit du public sur les tables", () => {
  assert.match(SQL, /alter table public\.certificates\s+enable row level security/);
  assert.match(SQL, /alter table public\.certificate_lookups\s+enable row level security/);
  assert.match(SQL, /alter table public\.certificate_settings\s+enable row level security/);
  assert.match(SQL, /revoke all on public\.certificates, public\.certificate_lookups, public\.certificate_settings from anon;/);
  assert.doesNotMatch(SQL, /grant [^;]*on public\.certificates[^;]* to anon/i);
  assert.doesNotMatch(SQL, /create policy[^;]*to anon/i, "aucune politique pour le public");
  (SQL.match(/create policy "[^"]+" on public\.certificates[^;]+;/g) || []).forEach((p) => assert.match(p, /is_wisy_admin\(\)/, "politique réservée à l'administrateur : " + p.slice(0, 60)));
});

test("SQL : une seule porte publique, sûre (security definer + search_path vide), réponse minimale", () => {
  assert.match(SQL, /grant execute on function public\.verify_certificate\(text, text\) to anon, authenticated;/);
  const fn = SQL.slice(SQL.indexOf("create or replace function public.verify_certificate"), SQL.indexOf("comment on function public.verify_certificate"));
  assert.match(fn, /security definer\s+set search_path = ''/);
  const out = fn.slice(fn.indexOf("jsonb_build_object(\n               'holder'"));
  ["birth_date", "email", "phone", "company", "notes", "revoked_reason", "document_path"].forEach((f) => assert.doesNotMatch(out.slice(0, out.indexOf(") as cert")), new RegExp("c\\." + f + "\\b"), f + " jamais renvoyé"));
  assert.match(fn, /where c\.birth_date = v_birth\s+and v_key = any \(c\.name_keys\)/, "correspondance EXACTE nom + date");
  assert.match(fn, /c_per_window\s+constant int\s+:= 10/);
  assert.match(fn, /c_global_hour constant int\s+:= 1500/);
  assert.match(fn, /sha256\(convert_to\(v_ip/, "empreinte salée, jamais l'IP");
  assert.match(SQL, /create or replace function public\.is_wisy_admin\(\)[\s\S]*?app_metadata' ->> 'role'\) = 'admin'/);
  assert.match(SQL, /'certificats', 'certificats', false/, "stockage des PDF privé");
});

/* ------------------------------------------------------------------ page publique */
const PAGE = read("certificats.html");
test("page : branchée sur Supabase, plus sur WordPress ; informations techniques retirées", () => {
  assert.doesNotMatch(PAGE, /wp-json|wordpress/i);
  assert.match(PAGE, /<script src="js\/supabase-config\.js"><\/script>\s*<script src="js\/certificats-core\.js"><\/script>\s*<script src="js\/certificats\.js"><\/script>/);
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

/* ------------------------------------------------------------------ administration */
test("administration : non indexée, connexion Supabase, aucune clé secrète", () => {
  const html = read("admin/certificats.html");
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /supabase-js@2\.116\.0" integrity="sha384-/);
  const all = html + read("js/certificats-admin.js") + read("js/supabase-config.js");
  assert.doesNotMatch(all, /sb_secret_|eyJhbGciOi/, "ni clé secrète ni jeton JWT dans le dépôt");
  assert.doesNotMatch(read("js/certificats-admin.js"), /\.innerHTML\s*=|insertAdjacentHTML/);
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
