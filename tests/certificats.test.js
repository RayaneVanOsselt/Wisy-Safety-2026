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
  assert.deepEqual(Object.keys(r.certificates[0]).sort(), ["certificateNumber", "expiryDate", "holder", "issueDate", "language", "status", "training", "trainingDate"]);
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

test("langue de la formation : affichée dans la langue du visiteur, valeur inconnue telle quelle", () => {
  assert.equal(C.languageLabel("Français", "fr"), "Français");
  assert.equal(C.languageLabel("francais", "en"), "French");
  assert.equal(C.languageLabel("Français", "nl"), "Frans");
  assert.equal(C.languageLabel("Nederlands", "fr"), "Néerlandais");
  assert.equal(C.languageLabel("Klingon", "fr"), "Klingon");
  assert.equal(C.languageLabel("", "fr"), "");
  assert.equal(C.normalizeResult({ status: "found", certificates: [{ holder: "X", training: "Y", language: "Français", status: "valid" }] }).certificates[0].language, "Français");
});

test("frise de validité : position d'aujourd'hui entre délivrance et fin de validité", () => {
  const p = C.validityProgress({ trainingDate: "2020-01-01", expiryDate: "2030-01-01" }, "2025-01-01");
  assert.ok(p.ratio > 0.49 && p.ratio < 0.51);
  assert.equal(C.validityProgress({ trainingDate: "2020-01-01", expiryDate: null }, "2025-01-01"), null);
});

/* ------------------------------------------------------------------ script Google (fausse feuille Google Sheets) */
const HEAD = ["Numéro de certificat", "Nom", "Prénom", "Autres noms", "Date de naissance", "Formation", "Date de formation", "Date de délivrance", "Valable jusqu'au", "Statut", "Entreprise (interne)", "E-mail (interne)", "Téléphone (interne)", "Notes (interne)", "Validité (automatique)"];
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 10));          // cellule « date » de Google Sheets
const SHEET = [HEAD,
  ["ws-1", "Dupont", "Marie", "Martin; Durand", D(1992, 5, 14), "VCA Base", D(2025, 3, 12), D(2025, 3, 14), D(2035, 3, 12), "Actif", "Entreprise SA", "rh@fictive.test", "0470 00 00 00", "note privée", "Valide"],
  ["WS-2", "Dupont", "Marie", "", "14/05/1992", "Nacelles élévatrices", "10/02/2018", "", "10/02/2023", "", "", "", "", "", ""],
  ["WS-3", "Müller", "Hans", "", "02/11/1978", "VCA Ligne hiérarchique", "05/06/2024", "", "05/06/2034", "Annulé", "", "", "", "", "Annulé"],
  ["WS-4", "D’Hondt", "Claire", "", "21/07/1988", "BEPS", "01/09/2025", "", "", "", "", "", "", "", ""],
  ["WS-5", "Sans-Date", "Lucie", "", "", "VCA Base", "01/02/2026", "", "01/02/2036", "", "", "", "", "", ""],
  ["WS-6", "Erreur", "Date", "", "31/02/1990", "VCA Base", "", "", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["ws-1", "Doublon", "Paul", "", "03/03/1993", "VCA Base", "", "", "", "", "", "", "", "", ""]
];
/* Objet factice dont toutes les méthodes inconnues (mise en forme, couleurs…) ne font rien et se chaînent. */
function chain(real) {
  const p = new Proxy(real || {}, { get: (t, k) => (k in t ? t[k] : typeof k === "symbol" || k === "then" ? undefined : () => p) });
  return p;
}
/* Fausse feuille Google Sheets modifiable (colonnes insérées / supprimées, valeurs lues / écrites). */
function fakeSheet(grid, opts) {
  opts = opts || {};
  let cols = opts.maxColumns || Math.max(...grid.map((r) => r.length));
  const g = grid.map((r) => { const x = r.slice(); while (x.length < cols) x.push(""); return x; });
  while (g.length < (opts.maxRows || 40)) g.push(Array(cols).fill(""));
  const blank = (v) => v === "" || v == null;
  const lastRow = () => { for (let r = g.length; r >= 1; r--) if (g[r - 1].some((v) => !blank(v))) return r; return 0; };
  const lastCol = () => { for (let c = cols; c >= 1; c--) if (g.some((row) => !blank(row[c - 1]))) return c; return 0; };
  const range = (r, c, nr = 1, nc = 1) => chain({
    getValues: () => g.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
    getValue: () => g[r - 1][c - 1],
    setValues: (v) => { assert.equal(v.length, nr); v.forEach((row, i) => { assert.equal(row.length, nc); row.forEach((x, j) => { g[r - 1 + i][c - 1 + j] = x; }); }); },
    setValue: (x) => { g[r - 1][c - 1] = x; },
    getColumn: () => c,
    sort: (specs) => {
      const val = (v) => (v instanceof Date ? v.getTime() : v);
      const block = g.slice(r - 1, r - 1 + nr).sort((a, b) => {
        for (const { column, ascending } of specs) {
          const x = val(a[column - 1]), y = val(b[column - 1]);
          if (blank(x) !== blank(y)) return blank(x) ? 1 : -1;
          if (x !== y) return (x < y ? -1 : 1) * (ascending === false ? -1 : 1);
        }
        return 0;
      });
      block.forEach((row, i) => { g[r - 1 + i] = row; });
    }
  });
  const sheet = chain({
    grid: g, rules: [],
    getRange: range,
    getDataRange: () => range(1, 1, Math.max(lastRow(), 1), Math.max(lastCol(), 1)),
    getLastRow: lastRow, getLastColumn: lastCol, getMaxColumns: () => cols, getMaxRows: () => g.length,
    deleteColumn: (c) => { g.forEach((row) => row.splice(c - 1, 1)); cols--; },
    deleteColumns: (c, n) => { g.forEach((row) => row.splice(c - 1, n)); cols -= n; },
    insertColumnAfter: (c) => { g.forEach((row) => row.splice(c, 0, "")); cols++; },
    insertColumnBefore: (c) => { g.forEach((row) => row.splice(c - 1, 0, "")); cols++; },
    getBandings: () => [], getConditionalFormatRules: () => [], getFilter: () => null, getProtections: () => [],
    setConditionalFormatRules: (rules) => { sheet.rules = rules; }
  });
  return sheet;
}
function loadScript(rows, nowIso, sheet) {
  const store = new Map();
  if (!sheet && rows) sheet = { getDataRange: () => ({ getValues: () => rows }) };
  const ctx = {
    SpreadsheetApp: chain({
      getActiveSpreadsheet: () => chain({
        getSheetByName: (n) => (sheet && n === "Certificats" ? sheet : null),
        getSpreadsheetTimeZone: () => "Europe/Brussels" }),
      getUi: () => { throw new Error("pas d'interface dans les tests"); },
      BandingTheme: {}, ProtectionType: {} }),
    CacheService: { getScriptCache: () => ({
      getAll: (keys) => { const o = {}; keys.forEach((k) => { if (store.has(k)) o[k] = store.get(k); }); return o; },
      put: (k, v, ttl) => { assert.ok(ttl >= 1 && ttl <= 21600, "durée de cache Google : 6 h au plus (" + ttl + ")"); store.set(k, v); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    console: { log: () => {} },
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

test("script Google : recherche EXACTE, seuls les champs publics, du plus ancien au plus récent", () => {
  const { post } = loadScript(SHEET);
  const r = post({ lastName: "dupont", birthDate: "1992-05-14" });
  assert.equal(r.status, "found");
  assert.equal(r.certificates.length, 2);
  assert.deepEqual(r.certificates[1], { holder: "Marie Dupont", training: "VCA Base", language: null, certificateNumber: "WS-001", trainingDate: "2025-03-12", issueDate: "2025-03-14", expiryDate: "2035-03-12", status: "valid" });
  assert.equal(r.certificates[0].issueDate, "2018-02-10", "date de délivrance vide = date de formation");
  assert.equal(r.certificates[0].status, "expired", "le plus ancien (2018) d'abord");
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
  assert.equal(loadScript(SHEET, "2035-03-13T10:00:00Z").post({ lastName: "Dupont", birthDate: "1992-05-14" }).certificates[1].status, "expired", "valable jusqu'au dernier jour inclus");
  assert.equal(loadScript(SHEET, "2035-03-12T20:00:00Z").post({ lastName: "Dupont", birthDate: "1992-05-14" }).certificates[1].status, "valid");
});

test("script Google : « Statut » Actif / Annulé, et l'ancienne colonne « Révoqué » oui / non reste comprise", () => {
  const old = [["Nom", "Prénom", "Date de naissance", "Formation", "Valable jusqu'au", "Révoqué"],
    ["Ancien", "Format", "01/01/1980", "VCA Base", "01/01/2099", "oui"], ["Nouveau", "Format", "01/01/1980", "VCA Base", "01/01/2099", "non"]];
  const o = loadScript(old);
  assert.equal(o.post({ lastName: "Ancien", birthDate: "1980-01-01" }).certificates[0].status, "revoked");
  assert.equal(o.post({ lastName: "Nouveau", birthDate: "1980-01-01" }).certificates[0].status, "valid");
  const bad = loadScript([["Nom", "Date de naissance", "Formation", "Statut"], ["Bizarre", "01/01/1980", "VCA", "peut-être"]]);
  assert.equal(bad.post({ lastName: "Bizarre", birthDate: "1980-01-01" }).status, "not_found", "statut incompréhensible : ligne ignorée");
  assert.match(bad.ctx.readRegistry_().problems.join(" "), /« Actif » ou « Annulé »/);
  const { ctx } = loadScript(SHEET);
  assert.equal(ctx.colLetter_(1) + ctx.colLetter_(10) + ctx.colLetter_(27), "AJAA");
  assert.equal(ctx.HEADER_MAP.validite, undefined, "la colonne calculée n'est jamais lue");
});

test("script Google : nom complet saisi dans « Nom » (reprise WordPress) — retrouvé par le nom de famille, le nom complet ou l'ordre inverse", () => {
  const rows = [["Numéro de certificat", "Nom", "Prénom", "Date de naissance", "Formation", "Valable jusqu'au", "Statut"],
    ["NA-EL-001", "El Hammouchi Ibrahim", "", D(1990, 1, 1), "Nacelle élévatrice", D(2030, 1, 1), "Actif"],
    ["NA-EL-002", "Ekizoglu Tolga", "", D(1985, 6, 15), "Nacelle élévatrice", D(2030, 1, 1), "Actif"]];
  const { post } = loadScript(rows);
  ["El Hammouchi", "Hammouchi", "el-hammouchi", "El Hammouchi Ibrahim", "Ibrahim El Hammouchi"].forEach((n) =>
    assert.equal(post({ lastName: n, birthDate: "1990-01-01" }).status, "found", n));
  assert.equal(post({ lastName: "El", birthDate: "1990-01-01" }).status, "not_found", "fragment trop court");
  assert.equal(post({ lastName: "Hammouchi", birthDate: "1990-01-02" }).status, "not_found", "la date reste exigée");
  const tol = post({ lastName: "Tolga Ekizoglu", birthDate: "1985-06-15" });
  assert.equal(tol.status, "found");
  assert.equal(tol.certificates[0].holder, "Ekizoglu Tolga", "affiché tel que saisi");
});

test("script Google : accents abîmés par un copier-coller (encodage Mac ou Windows) réparés, texte correct jamais modifié", () => {
  const { ctx } = loadScript(SHEET);
  assert.equal(ctx.fixMojibake_("Nacelle \u221a\u00a9l\u221a\u00a9vatrice"), "Nacelle élévatrice");
  assert.equal(ctx.fixMojibake_("Pot\u221a\u00a2rniche Valeriu"), "Potârniche Valeriu");
  assert.equal(ctx.fixMojibake_("Nacelle \u00c3\u00a9l\u00c3\u00a9vatrice"), "Nacelle élévatrice", "Windows");
  assert.equal(ctx.fixMojibake_("»òtefan »öƒÉrnƒÉ"), "Ștefan Țărnă");
  assert.equal(ctx.fixMojibake_("Fran\u221a\u00dfais"), "Français");
  assert.equal(ctx.fixMojibake_("Franc\u00c3\u00dfois"), "François", "accent décomposé (Mac) recomposé");
  assert.equal(ctx.fixMojibake_("M\u00c3\u00bcller V\u00c3\u00a9rifi\u00c3\u00a9"), "Müller Vérifié", "Windows, sans fausse lecture Mac");
  ["Potârniche Valeriu", "Ștefan Țărnă", "Müller Jörg", "D’Hondt", "Nacelle élévatrice", "NA-EL-002", "", "Ÿ"].forEach((x) => assert.equal(ctx.fixMojibake_(x), x, x));
  const rows = [["Numéro de certificat", "Nom", "Date de naissance", "Formation", "Valable jusqu'au", "Statut"],
    ["NA-EL-007", "Pot\u221a\u00a2rniche Valeriu", D(1979, 4, 2), "Nacelle \u221a\u00a9l\u221a\u00a9vatrice", D(2030, 1, 1), "Actif"]];
  const r = loadScript(rows).post({ lastName: "Potârniche", birthDate: "1979-04-02" });
  assert.equal(r.status, "found", "retrouvé même avant la réparation de la feuille");
  assert.equal(r.certificates[0].holder, "Potârniche Valeriu");
  assert.equal(r.certificates[0].training, "Nacelle élévatrice");
});

test("script Google : numéros de certificat au format NA-EL-001", () => {
  const { ctx } = loadScript(SHEET);
  const cases = { "NA-EL012": "NA-EL-012", "NA-EL_015": "NA-EL-015", "NA-ELE-001": "NA-EL-001", "VCA_001": "VCA-001", "na el 3": "NA-EL-003", "NA-EL-002": "NA-EL-002", "NAEL-044": "NA-EL-044", " NA-EL-120 ": "NA-EL-120", "NA-ELEC-001": "NA-ELEC-001" };
  Object.keys(cases).forEach((k) => assert.equal(ctx.normalizeCertNumber_(k), cases[k], k));
  Object.values(cases).forEach((v) => assert.match(v, ctx.CERT_NUMBER_RE));
  const rows = [["Numéro de certificat", "Nom", "Date de naissance", "Formation"], ["NA-EL012", "Un", D(1990, 1, 1), "VCA"], ["1", "Deux", D(1990, 1, 1), "VCA"]];
  const p = loadScript(rows).ctx.readRegistry_().problems.join("\n");
  assert.match(p, /Ligne 2 : numéro écrit « NA-EL012 », affiché « NA-EL-012 »/);
  assert.match(p, /Ligne 3 : numéro « 1 » au format inhabituel/);
});

test("script Google : « Préparer la feuille » — colonnes inutiles retirées, Langue ajoutée, données corrigées, relançable", () => {
  const head = ["Numéro de certificat", "Nom", "Prénom", "Autres noms", "Date de naissance", "Formation", "Date de formation", "Date de délivrance", "Valable jusqu'au", "Statut", "Validité (automatique)", "E-mail (interne)", "", "Remarques"];
  const sheet = fakeSheet([head,
    ["1", "Van Osselt", "Rayane", "", D(2004, 8, 8), "Nacelle élévatrice", D(2025, 1, 1), D(2025, 1, 1), D(2026, 1, 1), "Actif", "Expiré", "rh@fictive.test", "", ""],
    ["NA-EL012", "Pot\u221a\u00a2rniche Valeriu", "", "", D(1979, 4, 2), "Nacelle \u221a\u00a9l\u221a\u00a9vatrice", D(2025, 5, 17), "", D(2030, 5, 17), "Actif", "Valide", "", "", "à rappeler"],
    ["NA-ELE-001", "Dupont Marie", "Marie", "", D(1990, 1, 1), "VCA de base", D(2025, 2, 1), "", D(2035, 2, 1), "non", "Valide", "", "", ""]
  ], { maxColumns: 26 });
  const { ctx, post } = loadScript(null, "2026-10-14T10:00:00Z", sheet);
  const res = ctx.installer();
  const g = sheet.grid, w = sheet.getMaxColumns();
  assert.deepEqual(g[0].slice(0, w), ["Numéro de certificat", "Nom", "Date de naissance", "Formation", "Langue", "Date de formation", "Date de délivrance", "Valable jusqu'au", "Statut", "Remarques"]);
  assert.equal(w, 10, "plus de colonnes vides à droite");
  assert.match(res.kept.join(" "), /« Remarques » contient des données : colonne conservée/);
  assert.match(res.done.join("\n"), /colonnes retirées : « Prénom », « Autres noms », « Validité \(automatique\) », « E-mail \(interne\) »/);
  assert.deepEqual(g[1].slice(0, 9).map(String), ["1", "Van Osselt Rayane", String(D(2004, 8, 8)), "Nacelle élévatrice", "Français", String(D(2025, 1, 1)), String(D(2025, 1, 1)), String(D(2026, 1, 1)), "Actif"]);
  assert.deepEqual([g[3][0], g[3][1], g[3][3], g[3][4], String(g[3][6])], ["NA-EL-012", "Potârniche Valeriu", "Nacelle élévatrice", "Français", String(D(2025, 5, 17))]);
  assert.deepEqual([g[2][0], g[2][1], g[2][8]], ["NA-EL-001", "Dupont Marie", "Actif"], "prénom déjà dans le nom : pas répété");
  assert.deepEqual(g.slice(1, 4).map((row) => row[5].toISOString().slice(0, 10)), ["2025-01-01", "2025-02-01", "2025-05-17"], "plus anciennes en haut");
  assert.equal(g[3][9], "à rappeler", "une colonne conservée suit sa ligne pendant le tri");
  ["2 numéro(s) de certificat remis au format", "2 date(s) de délivrance remplie(s)", "3 langue(s) indiquée(s) : Français", "1 prénom(s) ajouté(s)", "lignes triées par date de formation"].forEach((t) => assert.ok(res.done.join("\n").includes(t), t));
  assert.equal(sheet.rules.length, 5, "couleurs de validité et de statut");
  const r = post({ lastName: "Potârniche", birthDate: "1979-04-02" }).certificates[0];
  assert.deepEqual([r.certificateNumber, r.language, r.issueDate, r.status], ["NA-EL-012", "Français", "2025-05-17", "valid"]);
  assert.equal(post({ lastName: "Van Osselt", birthDate: "2004-08-08" }).certificates[0].status, "expired");
  const before = JSON.stringify(g);
  const again = ctx.installer();
  assert.equal(JSON.stringify(sheet.grid), before, "relancer ne change plus rien");
  assert.deepEqual(again.done, []);
  const empty = fakeSheet([[""]], { maxColumns: 26 });
  loadScript(null, null, empty).ctx.installer();
  assert.deepEqual(empty.grid[0], ["Numéro de certificat", "Nom", "Date de naissance", "Formation", "Langue", "Date de formation", "Date de délivrance", "Valable jusqu'au", "Statut"], "feuille neuve");
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
  assert.match(txt, /Ligne 9 : le numéro « WS-001 » est déjà utilisé à la ligne 2/);
  assert.equal(reg.rows.length, 6, "lignes vides et invalides écartées");
  ["entreprise", "e_mail", "email", "telephone", "notes", "entreprise_interne"].forEach((h) => assert.equal(ctx.HEADER_MAP[h], undefined, "colonne interne jamais lue : " + h));
  assert.deepEqual(Object.keys(reg.rows[0]).sort(), ["birth_date", "certificate_number", "expiry_date", "first_name", "issue_date", "keys", "language", "last_name", "line", "other_last_names", "revoked", "training", "training_date"]);
});

/* ------------------------------------------------------------------ page publique */
const PAGE = read("certificats.html");
test("page : branchée sur la feuille Google Sheets, ni WordPress ni Supabase ; informations techniques retirées", () => {
  assert.doesNotMatch(PAGE, /wp-json|wordpress/i);
  assert.match(PAGE, /<script src="js\/certificats-config\.js"><\/script>\s*<script src="js\/certificats-core\.js"><\/script>\s*<script src="js\/certificats\.js"><\/script>/);
  assert.doesNotMatch(PAGE + read("js/certificats.js") + read("js/certificats-core.js"), /supabase/i, "plus de Supabase pour les certificats");
  ["data-service-status", "wc-steps", "wc-microprint", "wc-how", "wc-priv__", "data-challenge", "cert.trust_"].forEach((s) => assert.ok(!PAGE.includes(s), "retiré : " + s));
  assert.ok(!read("js/certificats.js").includes("/document"), "plus de PDF public");
  assert.match(PAGE, /<link rel="canonical" href="https:\/\/wisysafety\.be\/certificats\.html">/);
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
  infinite.forEach((l) => assert.match(l, /is-busy|wc-skel__line/, "seule la vérification en cours (bouton, contour, squelette de chargement) peut tourner en continu : " + l.trim()));
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
  assert.match(read("sitemap.xml"), /<loc>https:\/\/wisysafety\.be\/certificats\.html<\/loc>/);
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
