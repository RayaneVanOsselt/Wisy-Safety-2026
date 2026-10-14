"use strict";
/* Avis clients : client de la feuille (js/avis-core.js), script Google de la feuille (google-sheets/avis.gs, exécuté
   ici avec une fausse feuille Google Sheets), page publique et pages légales.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const A = require("../js/avis-core.js");

/* ------------------------------------------------------------------ client du site */
function fakeFetch(status, body, seen) {
  return (url, init) => {
    if (seen) { seen.url = url; seen.init = init; seen.calls = (seen.calls || 0) + 1; }
    return Promise.resolve({ status, headers: { get: () => null }, text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)) });
  };
}
const API = "https://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/exec";
const CFG = { API_URL: API };
const REVIEW = { first_name: "Marie", last_name: "D.", email: "marie@exemple.be", company: "", rating: 5, title: "", comment: "Très bonne formation.", consent: true };

test("client : adresse acceptée uniquement si c'est un script Google déployé (…/macros/s/…/exec)", () => {
  assert.equal(A.endpoint(CFG), API);
  assert.equal(A.endpoint({ API_URL: "" }), null);
  assert.equal(A.endpoint({ API_URL: "https://exemple.com/api" }), null);
  assert.equal(A.endpoint({ API_URL: API.replace("/exec", "/dev") }), null, "jamais l'URL de test /dev");
  assert.equal(A.endpoint({ API_URL: API.replace("https:", "http:") }), null, "http refusé");
  const site = {}; vm.runInNewContext(read("js/avis-config.js"), { window: site });
  assert.ok(site.WISY_AVIS && (site.WISY_AVIS.API_URL === "" || A.endpoint(site.WISY_AVIS)), "js/avis-config.js : adresse vide ou valide");
});

test("client : envoi en POST « text/plain » (sans pré-vérification CORS), redirection suivie, rien dans l'URL", async () => {
  const seen = {};
  const r = await A.submit({ config: CFG, review: REVIEW, fetch: fakeFetch(200, { status: "ok", reference: "WS-2026-AB2CD" }, seen) });
  assert.deepEqual(r, { kind: "ok", reference: "WS-2026-AB2CD" });
  assert.equal(seen.url, API, "aucune donnée dans l'adresse");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.equal(seen.init.redirect, "follow");
  assert.equal(seen.init.credentials, "omit");
  const body = JSON.parse(seen.init.body);
  assert.deepEqual(Object.keys(body).sort(), ["comment", "company", "consent", "email", "first_name", "last_name", "rating", "title", "website"]);
  assert.equal(body.consent, true);
});

test("client : lecture des avis en GET ; seuls les champs publics sont gardés, avis incomplets écartés", async () => {
  const seen = {};
  const r = await A.list({ config: CFG, fetch: fakeFetch(200, {
    status: "ok", stats: { count: 3, average: 4.67 },
    reviews: [
      { reference: "WS-2026-AAAAA", first_name: "Marie", last_name: "D.", company: "QHSE", rating: 5, title: "Top", comment: "Clair.", date: "2026-10-14", email: "fuite@exemple.be" },
      { first_name: "Sans note", comment: "x", rating: 0 },
      { first_name: "", comment: "Sans prénom", rating: 4 },
      { first_name: "Paul", comment: "Bien.", rating: 4, date: "2026-02-31" }
    ]
  }, seen) });
  assert.equal(seen.init.method, "GET");
  assert.equal(seen.init.body, undefined);
  assert.equal(r.kind, "ok");
  assert.equal(r.reviews.length, 2);
  assert.deepEqual(Object.keys(r.reviews[0]).sort(), ["comment", "company", "date", "first_name", "last_name", "rating", "reference", "title"]);
  assert.equal(r.reviews[1].date, null, "date impossible → pas de date");
  assert.deepEqual(r.stats, { count: 3, average: 4.67 });
  assert.equal(A.normalizeList({ status: "ok", reviews: [], stats: { count: 0, average: null } }).stats, null);
});

test("client : feuille absente, erreurs et pannes → états explicites, jamais d'exception", async () => {
  assert.equal((await A.list({ config: { API_URL: "" }, fetch: fakeFetch(200, {}) })).kind, "not_configured");
  assert.equal((await A.list({ config: CFG, fetch: fakeFetch(404, "Not found") })).kind, "not_configured");
  assert.equal((await A.list({ config: CFG, fetch: fakeFetch(200, "<html>connexion Google</html>") })).kind, "unavailable");
  assert.equal((await A.list({ config: CFG, fetch: () => Promise.reject(new Error("réseau")) })).kind, "unavailable");
  assert.equal((await A.submit({ config: CFG, review: REVIEW, fetch: fakeFetch(500, "") })).kind, "unavailable");
  assert.deepEqual(await A.submit({ config: CFG, review: REVIEW, fetch: fakeFetch(200, { status: "invalid", fields: { email: "invalid", evil: "x" } }) }), { kind: "invalid", fields: { email: "invalid" } });
  assert.equal((await A.submit({ config: CFG, review: REVIEW, fetch: fakeFetch(200, { status: "rate_limited", retryAfter: 5 }) })).retryAfter, 60);
  assert.equal((await A.submit({ config: CFG, review: REVIEW, fetch: fakeFetch(200, { status: "ok", reference: "<b>x</b>" }) })).reference, null, "référence inattendue ignorée");
});

/* ------------------------------------------------------------------ script Google (fausse feuille Google Sheets) */
/* Objet factice dont toutes les méthodes inconnues (mise en forme, couleurs…) ne font rien et se chaînent. */
function chain(real) {
  const p = new Proxy(real || {}, { get: (t, k) => (k in t ? t[k] : typeof k === "symbol" || k === "then" ? undefined : () => p) });
  return p;
}
/* Comme Google Sheets : une apostrophe initiale force le texte et n'apparaît pas dans la cellule. */
const store = (x, log) => { if (log) log.push(x); return typeof x === "string" && x.charAt(0) === "'" ? x.slice(1) : x; };

function fakeSheet(name, grid, opts) {
  opts = opts || {};
  let cols = Math.max(opts.maxColumns || 26, ...grid.map((r) => r.length));          // nouvelle feuille Google : 26 colonnes
  const g = grid.map((r) => { const x = r.slice(); while (x.length < cols) x.push(""); return x; });
  while (g.length < (opts.maxRows || 30)) g.push(Array(cols).fill(""));
  const writes = [];
  const blank = (v) => v === "" || v == null;
  const lastRow = () => { for (let r = g.length; r >= 1; r--) if (g[r - 1].some((v) => !blank(v))) return r; return 0; };
  const lastCol = () => { for (let c = cols; c >= 1; c--) if (g.some((row) => !blank(row[c - 1]))) return c; return 0; };
  let sheet;
  const range = (r, c, nr = 1, nc = 1) => {
    if (typeof r === "string") return chain();
    while (g.length < r - 1 + nr) g.push(Array(cols).fill(""));
    if (c - 1 + nc > cols) { cols = c - 1 + nc; g.forEach((row) => { while (row.length < cols) row.push(""); }); }
    return chain({
      getValues: () => g.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
      getValue: () => g[r - 1][c - 1],
      setValues: (v) => { assert.equal(v.length, nr); v.forEach((row, i) => { assert.equal(row.length, nc); row.forEach((x, j) => { g[r - 1 + i][c - 1 + j] = store(x, writes); }); }); return range(r, c, nr, nc); },
      setValue: (x) => { g[r - 1][c - 1] = store(x, writes); return range(r, c, nr, nc); },
      getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc, getLastRow: () => r + nr - 1,
      getSheet: () => sheet
    });
  };
  let sheetName = name;
  sheet = chain({
    grid: g, writes, rules: [],
    getName: () => sheetName, setName: (n) => { sheetName = n; return sheet; },
    getRange: range,
    getDataRange: () => range(1, 1, Math.max(lastRow(), 1), Math.max(lastCol(), 1)),
    getLastRow: lastRow, getLastColumn: lastCol, getMaxColumns: () => cols, getMaxRows: () => g.length,
    deleteColumns: (c, n) => { g.forEach((row) => row.splice(c - 1, n)); cols -= n; },
    insertColumnAfter: (c) => { g.forEach((row) => row.splice(c, 0, "")); cols++; },
    insertColumnBefore: (c) => { g.forEach((row) => row.splice(c - 1, 0, "")); cols++; },
    getBandings: () => [], getFilter: () => null, getProtections: () => [],
    setConditionalFormatRules: (rules) => { sheet.rules = rules; },
    getActiveRangeList: () => ({ getRanges: () => (opts.selection || []).map(([r, n]) => range(r, 1, n, cols)) })
  });
  return sheet;
}

function loadScript(opts) {
  opts = opts || {};
  const cache = new Map();
  const mails = [], alerts = [], toasts = [], formulas = [];
  const sheets = opts.sheets || [fakeSheet("Feuille 1", [[]])];
  let fileName = opts.fileName || "Feuille de calcul sans titre";
  const dashboard = () => {
    const d = chain({ getName: () => "Tableau de bord", getRange: () => { const c = chain({ setFormula: (f) => { formulas.push(f); return c; } }); return c; } });
    return d;
  };
  const ss = chain({
    getSheetByName: (n) => sheets.find((s) => s.getName() === n) || null,
    getSheets: () => sheets,
    insertSheet: (n) => { const s = n === "Tableau de bord" ? dashboard() : fakeSheet(n, [[]]); sheets.push(s); return s; },
    getName: () => fileName, rename: (n) => { fileName = n; },
    getUrl: () => "https://docs.google.com/spreadsheets/d/EXEMPLE/edit",
    getActiveSheet: () => sheets[0],
    toast: (m) => { toasts.push(m); }
  });
  const ui = chain({ alert: (...a) => { alerts.push(a.join(" | ")); }, ButtonSet: { OK: "OK" } });
  const ctx = {
    SpreadsheetApp: chain({ getActiveSpreadsheet: () => ss, getUi: () => ui, BandingTheme: {}, ProtectionType: {} }),
    CacheService: { getScriptCache: () => ({
      get: (k) => (cache.has(k) ? cache.get(k) : null),
      getAll: (keys) => { const o = {}; keys.forEach((k) => { if (cache.has(k)) o[k] = cache.get(k); }); return o; },
      put: (k, v, ttl) => { assert.ok(ttl >= 1 && ttl <= 21600, "durée de cache Google : 6 h au plus (" + ttl + ")"); cache.set(k, v); },
      remove: (k) => { cache.delete(k); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    MailApp: { getRemainingDailyQuota: () => (opts.noQuota ? 0 : 100), sendEmail: (to, subject, body, o) => { mails.push({ to, subject, body, o }); } },
    console: { log: () => {} },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: {
      formatDate: (d, tz, fmt) => {
        const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
        const v = (t) => p.find((x) => x.type === t).value;
        return fmt.replace("yyyy", v("year")).replace("MM", v("month")).replace("dd", v("day")).replace("HH", v("hour")).replace("mm", v("minute"));
      },
      computeDigest: (alg, v) => Array.from(crypto.createHash("sha256").update(String(v)).digest()).map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" }
    },
    Date                                                       // dates de la feuille comparables dans les tests
  };
  vm.createContext(ctx);
  vm.runInContext(read("google-sheets/avis.gs"), ctx);
  vm.runInContext("now_ = function () { return new Date(" + JSON.stringify(opts.now || "2026-10-14T10:00:00Z") + "); };", ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).text);
  const get = () => JSON.parse(ctx.doGet({ parameter: {} }).text);
  return { ctx, ss, sheets, cache, mails, alerts, toasts, formulas, post, get, fileName: () => fileName };
}
const HEADER = ["Reçu le", "Statut", "Note", "Prénom", "Nom", "Société / fonction", "Titre", "Avis", "E-mail (jamais publié)", "Publié le", "Référence"];
const avisSheet = (s) => s.sheets.find((x) => x.getName() === "Avis");
const rowsOf = (sheet) => sheet.grid.filter((r) => r.some((v) => v !== "" && v != null));

test("script Google : « Préparer la feuille » — fichier renommé, onglet « Avis » à 11 colonnes, tableau de bord, relançable", () => {
  const s = loadScript();
  s.ctx.installer();
  assert.equal(s.fileName(), "Avis - Wisy Safety");
  const sheet = avisSheet(s);
  assert.ok(sheet, "« Feuille 1 » vide renommée « Avis »");
  assert.equal(s.sheets.length, 2, "Avis + Tableau de bord");
  assert.deepEqual(sheet.grid[0].slice(0, 11), HEADER);
  assert.equal(sheet.getMaxColumns(), 11, "la feuille s'arrête à la dernière colonne utile");
  assert.equal(sheet.rules.length, 5, "couleurs : 3 statuts + ligne en attente + ligne refusée");
  assert.ok(s.formulas.some((f) => /^=COUNTIF\('Avis'!\$B\$2:\$B,"Confirmé"\)$/.test(f)), "compteur des avis publiés");
  assert.ok(s.formulas.some((f) => /AVERAGEIF\('Avis'!\$B\$2:\$B,"Confirmé",'Avis'!\$C\$2:\$C\)/.test(f)), "note moyenne publiée");
  assert.ok(s.formulas.some((f) => /SPARKLINE/.test(f)), "barres de répartition des notes");
  s.ctx.installer();
  assert.deepEqual(avisSheet(s).grid[0].slice(0, 11), HEADER, "relancé : rien n'est dupliqué");
  assert.match(s.alerts[0], /Feuille prête/);
  assert.match(read("google-sheets/avis.gs"), /^\/\*\*\s*\n \* @OnlyCurrentDoc/, "accès limité à la feuille elle-même");
});

test("script Google : un avis envoyé arrive « En attente » avec sa référence — rien n'est publié — et l'équipe est prévenue", () => {
  const s = loadScript();
  s.ctx.installer();
  const r = s.post(Object.assign({}, REVIEW, { last_name: "Dubois", company: "Entreprise X", title: "Super" }));
  assert.equal(r.status, "ok");
  assert.match(r.reference, /^WS-2026-[A-HJ-NP-Z2-9]{5}$/);
  const rows = rowsOf(avisSheet(s));
  assert.equal(rows.length, 2);
  const row = rows[1];
  assert.ok(row[0] instanceof Date, "Reçu le = date et heure");
  assert.deepEqual(row.slice(1, 11), ["En attente", 5, "Marie", "Dubois", "Entreprise X", "Super", "Très bonne formation.", "marie@exemple.be", "", r.reference]);
  assert.deepEqual(s.get(), { status: "ok", stats: { count: 0, average: null }, reviews: [] }, "en attente = invisible sur le site");
  assert.equal(s.mails.length, 1);
  assert.equal(s.mails[0].to, "info@wisysafety.be");
  assert.match(s.mails[0].subject, /Nouvel avis à valider — 5\/5 — Marie Dubois/);
  assert.match(s.mails[0].body, /PAS encore publié[\s\S]*marie@exemple\.be[\s\S]*Confirmé/);
  assert.equal(s.mails[0].o.replyTo, "marie@exemple.be", "« Répondre » écrit directement au client");
  assert.doesNotMatch(s.mails[0].o.htmlBody, /<script/i);
});

test("script Google : « Confirmé » publie (Publié le rempli tout seul), « Refusé » / « En attente » retirent ; jamais l'e-mail", () => {
  const s = loadScript();
  s.ctx.installer();
  s.post(REVIEW);
  s.post(Object.assign({}, REVIEW, { email: "paul@exemple.be", first_name: "Paul", rating: 3, comment: "Correct." }));
  const sheet = avisSheet(s);
  assert.equal(s.get().reviews.length, 0);
  s.get();                                                             // liste vide mise en cache
  sheet.getRange(2, 2).setValue("Confirmé");
  s.ctx.onEdit({ range: sheet.getRange(2, 2) });                       // la liste déroulante déclenche onEdit
  const pub = sheet.grid[1][9];
  assert.ok(pub instanceof Date, "« Publié le » rempli au passage à Confirmé");
  assert.equal(s.ctx.Utilities.formatDate(pub, "Europe/Brussels", "yyyy-MM-dd"), "2026-10-14");
  const out = s.get();
  assert.equal(out.reviews.length, 1, "le cache est renouvelé à chaque modification de la feuille");
  assert.deepEqual(out.reviews[0], { reference: sheet.grid[1][10], first_name: "Marie", last_name: "D.", company: null, rating: 5, title: null, comment: "Très bonne formation.", date: "2026-10-14" });
  assert.deepEqual(out.stats, { count: 1, average: 5 });
  assert.doesNotMatch(s.ctx.doGet().text, /@/, "aucune adresse e-mail ne sort de la feuille");
  sheet.getRange(3, 2).setValue("confirmé"); s.ctx.onEdit({ range: sheet.getRange(3, 2) });
  assert.deepEqual(s.get().stats, { count: 2, average: 4 });
  sheet.getRange(2, 2).setValue("Refusé"); s.ctx.onEdit({ range: sheet.getRange(2, 2) });
  assert.deepEqual(s.get().reviews.map((r) => r.first_name), ["Paul"]);
  sheet.getRange(3, 2).setValue("En attente"); s.ctx.onEdit({ range: sheet.getRange(3, 2) });
  assert.equal(s.get().reviews.length, 0);
});

test("script Google : menu « Publier les avis sélectionnés » ; ordre du plus récent au plus ancien ; date « Publié le » modifiable", () => {
  const sheet = fakeSheet("Avis", [HEADER,
    [new Date("2025-03-01T10:00:00Z"), "En attente", 4, "Ancien", "", "", "", "Avis ancien.", "a@x.be", "", "WS-2025-AAAAA"],
    [new Date("2026-09-01T10:00:00Z"), "En attente", 5, "Récent", "", "", "", "Avis récent.", "b@x.be", "", "WS-2026-BBBBB"],
    [new Date("2026-09-02T10:00:00Z"), "Confirmé", 5, "Daté", "", "", "", "Avis daté à la main.", "c@x.be", "03/09/2025", "WS-2026-CCCCC"]
  ], { selection: [[2, 2]] });
  const s = loadScript({ sheets: [sheet] });
  s.ctx.publierLaSelection();
  assert.match(s.toasts[0], /2 avis : « Confirmé »/);
  /* Plus récent d'abord ; à date égale, la ligne la plus basse (la plus récente) d'abord. */
  assert.deepEqual(s.get().reviews.map((r) => [r.first_name, r.date]), [["Récent", "2026-10-14"], ["Ancien", "2026-10-14"], ["Daté", "2025-09-03"]]);
  s.ctx.refuserLaSelection();
  assert.deepEqual(s.get().reviews.map((r) => r.first_name), ["Daté"]);
});

test("script Google : textes écrits tels quels — jamais une formule, un nombre ou une date (injection)", () => {
  const s = loadScript();
  s.ctx.installer();
  s.post(Object.assign({}, REVIEW, { comment: "=IMPORTXML(\"https://evil.example\",\"//a\")", title: "+33 123", company: "-1", last_name: "@moi" }));
  const sheet = avisSheet(s);
  const raw = sheet.writes.filter((x) => typeof x === "string" && /IMPORTXML|\+33|^'-1$|@moi/.test(x));
  assert.ok(raw.length === 4 && raw.every((x) => x.charAt(0) === "'"), "apostrophe initiale sur chaque texte saisi : " + raw.join(" · "));
  const row = rowsOf(sheet)[1];
  assert.equal(row[7], "=IMPORTXML(\"https://evil.example\",\"//a\")", "affiché comme texte, jamais exécuté");
});

test("script Google : revalidation serveur, champ piège, double envoi, limites par e-mail", () => {
  const s = loadScript();
  s.ctx.installer();
  assert.deepEqual(s.post({}), { status: "invalid", fields: { first_name: "required", email: "invalid", rating: "required", comment: "too_short", consent: "required" } });
  assert.equal(s.post(Object.assign({}, REVIEW, { rating: 6 })).fields.rating, "required");
  assert.equal(s.post(Object.assign({}, REVIEW, { consent: "true" })).fields.consent, "required", "consentement : vrai booléen seulement");
  assert.equal(s.post(Object.assign({}, REVIEW, { comment: "x".repeat(2001) })).fields.comment, "too_long");
  assert.equal(s.post(Object.assign({}, REVIEW, { email: "a@b.c" })).fields.email, "invalid");
  assert.equal(s.post("pas du JSON").status, "invalid", "corps illisible : refus propre, sans plantage");
  assert.equal(s.post("[1,2]").status, "invalid");
  const bot = s.post(Object.assign({}, REVIEW, { website: "http://spam.example" }));
  assert.equal(bot.status, "ok", "robot : réponse normale…");
  assert.equal(rowsOf(avisSheet(s)).length, 1, "… mais rien n'est enregistré");
  assert.equal(s.mails.length, 0);
  const a = s.post(REVIEW), b = s.post(REVIEW);
  assert.equal(b.reference, a.reference, "double clic : même référence, pas de doublon");
  assert.equal(rowsOf(avisSheet(s)).length, 2);
  s.post(Object.assign({}, REVIEW, { comment: "Deuxième avis." }));
  const limited = s.post(Object.assign({}, REVIEW, { comment: "Troisième avis." }));
  assert.equal(limited.status, "rate_limited", "3 envois par heure et par e-mail (double clic compris)");
  assert.ok(limited.retryAfter >= 60);
  assert.equal(s.post(Object.assign({}, REVIEW, { email: "autre@exemple.be" })).status, "ok", "une autre adresse n'est pas bloquée");
});

test("script Google : limite globale contre les robots ; e-mail en panne ou quota épuisé n'empêche jamais l'enregistrement", () => {
  const s = loadScript({ noQuota: true });
  s.ctx.installer();
  for (let i = 0; i < 30; i++) assert.equal(s.post(Object.assign({}, REVIEW, { email: "p" + i + "@exemple.be" })).status, "ok");
  assert.equal(s.post(Object.assign({}, REVIEW, { email: "p31@exemple.be" })).status, "rate_limited", "30 avis par heure au total");
  assert.equal(s.mails.length, 0, "quota d'e-mails épuisé : aucun envoi, avis enregistrés quand même");
  assert.equal(rowsOf(avisSheet(s)).length, 31);
  const t = loadScript();
  t.ctx.MailApp.sendEmail = () => { throw new Error("panne"); };
  t.ctx.installer();
  assert.equal(t.post(REVIEW).status, "ok");
});

test("script Google : feuille absente → créée au premier avis ; statut incompris jamais publié et signalé", () => {
  const s = loadScript();
  assert.equal(s.get().status, "not_configured", "liste : feuille pas encore préparée");
  assert.equal(s.post(REVIEW).status, "ok", "le premier avis prépare la feuille");
  assert.deepEqual(avisSheet(s).grid[0].slice(0, 11), HEADER);
  const sheet = avisSheet(s);
  sheet.getRange(2, 2).setValue("peut-être");
  s.ctx.onEdit({ range: sheet.getRange(2, 2) });
  assert.equal(s.get().reviews.length, 0);
  s.ctx.verifierLesDonnees();
  assert.match(s.alerts.join("\n"), /Ligne 2 : statut « peut-être » incompris/);
});

/* ------------------------------------------------------------------ page publique */
test("page : branchée sur la feuille Google Sheets — plus de Supabase, d'EmailJS ni de page d'administration", () => {
  const page = read("avis.html");
  assert.match(page, /<script src="js\/avis-config\.js"><\/script>\s*(<!--[^>]*-->\s*)?<script src="js\/avis-core\.js"><\/script>\s*(<!--[^>]*-->\s*)?<script src="js\/reviews\.js"><\/script>/);
  assert.doesNotMatch(page, /supabase|emailjs|cdn\.jsdelivr\.net/i, "aucune bibliothèque tierce sur la page Avis");
  assert.doesNotMatch(read("js/reviews.js") + read("js/avis-core.js"), /supabase|emailjs|localStorage\s*\.|sessionStorage\s*\./i, "ni Supabase, ni EmailJS, ni stockage navigateur");
  assert.doesNotMatch(read("js/reviews.js"), /DEMO_REVIEWS|_demo/, "jamais de faux avis affichés");
  assert.ok(!exists("admin/avis.html") && !exists("supabase/schema.sql"), "ancien système Supabase des avis retiré");
  assert.doesNotMatch(read("js/supabase-config.js"), /EMAILJS_TEMPLATE_ID_REVIEW|TURNSTILE_SITE_KEY/);
});

test("page : le formulaire et le registre gardent exactement leurs éléments (design inchangé)", () => {
  const page = read("avis.html");
  ["rc-form", "rc-rate", "rc-rating", "rc-submit", "rc-status", "rc-success", "rc-success-ref", "rc-success-again", "rc-stats", "rc-carousel", "rc-loading", "rc-empty", "rc-config-note"]
    .forEach((id) => assert.match(page, new RegExp('id="' + id + '"'), "#" + id));
  ["first_name", "last_name", "email", "company", "rating", "title", "comment", "website", "consent"]
    .forEach((n) => assert.match(page, new RegExp('name="' + n + '"'), "champ " + n));
});

test("i18n : note « pas encore relié » à jour dans les 10 langues", () => {
  const ctx = { window: {} }; ctx.window.window = ctx.window;
  vm.runInNewContext(read("js/i18n-data-avis.js"), ctx);
  const I = ctx.window.I18N;
  const langs = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];
  langs.forEach((l) => {
    assert.match(I[l]["av.config_note"], /Google[ -]Sheets[\s\S]*js\/avis-config\.js/, l);
    assert.doesNotMatch(JSON.stringify(I[l]), /supabase/i, l);
  });
});

test("pages légales : les avis sont hébergés dans Google Sheets, plus aucune mention de Supabase", () => {
  ["politique-de-confidentialite.html", "mentions-legales.html", "js/i18n-data-privacy.js", "js/i18n-data-mentions-legales.js"].forEach((f) => {
    assert.doesNotMatch(read(f), /supabase/i, f);
  });
  assert.match(read("politique-de-confidentialite.html"), /data-i18n="pp\.p_gsheets_p1"/);
  assert.match(read("js/i18n-data-privacy.js"), /"pp\.sec2": "Chaque avis est relu avant publication et une même adresse e-mail ne peut pas envoyer plus de 3 avis par heure\."/);
  assert.match(read("google-sheets/avis.gs"), /PER_EMAIL_PER_HOUR: 3,/, "la limite annoncée est celle du script");
});
