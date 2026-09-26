"use strict";
/* Sessions de formation (js/sessions.js) : SOURCE UNIQUE des dates. Validation stricte, tri, logique « à venir »
   à l'heure de Bruxelles, lien d'inscription (formation + session), chargement (fichier ou Supabase, avec repli),
   et — surtout — AUCUNE date écrite dans une page HTML. `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const S = require("../js/sessions.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const ok = (over) => Object.assign({ id: "2099-03-10-fr", training: "vca-base", date: "2099-03-10", startTime: "09:00", endTime: "16:30", language: "fr", capacity: 12, seatsLeft: 5 }, over || {});
const at = (iso) => new Date(iso);                                   // instants UTC : la logique convertit vers Europe/Brussels

/* ------------------------------------------------------------------ validation */
test("une session bien formée est acceptée et normalisée (champs connus seulement)", () => {
  assert.deepEqual(S.validate(ok()), []);
  const n = S.normalize(ok({ intrus: "x" }));
  assert.equal(n.id, "2099-03-10-fr"); assert.equal(n.startsAt, "2099-03-10T09:00"); assert.equal(n.status, "open");
  assert.ok(!("intrus" in n), "aucun champ inconnu n'est conservé");
  assert.equal(S.normalize(ok({ startTime: "09:00:00", endTime: "16:30:00" })).endTime, "16:30", "heure Postgres « hh:mm:ss » acceptée");
});

test("une session mal formée est REFUSÉE (jamais « corrigée » en silence)", () => {
  const bad = [
    [{ id: "X" }, /id/], [{ training: "" }, /training/], [{ date: "2099-02-30" }, /date/], [{ date: "10/03/2099" }, /date/], [{ date: "2099-13-01" }, /date/],
    [{ startTime: "9h" }, /startTime/], [{ endTime: "08:00" }, /endTime/], [{ startTime: null, endTime: "10:00" }, /endTime sans startTime/],
    [{ language: "français" }, /language/], [{ capacity: 0 }, /capacity/], [{ seatsLeft: 99, capacity: 12 }, /seatsLeft/], [{ status: "ouverte" }, /status/],
    [{ priceCents: 12.5 }, /priceCents/], [{ signupUrl: "https://evil.example/x" }, /signupUrl/], [{ signupUrl: "javascript:alert(1)" }, /signupUrl/],
    [{ signupUrl: "//evil.example" }, /signupUrl/], [{ location: "x".repeat(161) }, /location/]
  ];
  bad.forEach(([over, re]) => {
    const why = S.validate(ok(over));
    assert.ok(why.some((w) => re.test(w)), JSON.stringify(over) + " → " + why.join(" ; "));
    assert.equal(S.normalize(ok(over)), null);
  });
  [null, undefined, 42, "x", [], {}].forEach((raw) => assert.ok(S.validate(raw).length > 0));
});

test("l'adresse d'inscription d'une session est une page INTERNE (inscription.html?…) — jamais une URL des données", () => {
  assert.deepEqual(S.validate(ok({ signupUrl: "inscription.html?formation=vca-base&session=2099-03-10-fr" })), []);
  assert.equal(S.signupUrl(S.normalize(ok())), "inscription.html?formation=vca-base&session=2099-03-10-fr");
  assert.equal(S.signupUrl(S.normalize(ok({ training: "vca-hierarchique", id: "2099-05-05-nl" })), "vca-hierarchique"), "inscription.html?formation=vca-hierarchique&session=2099-05-05-nl");
});

test("liste : doublons d'id, sessions invalides écartées et signalées, tri chronologique", () => {
  const r = S.normalizeAll([ok({ id: "b-2099-05-01", date: "2099-05-01" }), ok({ id: "a-2099-03-10" }), ok({ id: "a-2099-03-10", date: "2099-04-04" }), { id: "nope" }, ok({ id: "c-2099-03-10", startTime: "08:00", endTime: "12:00" })]);
  assert.deepEqual(r.sessions.map((s) => s.id), ["c-2099-03-10", "a-2099-03-10", "b-2099-05-01"], "trié par date puis heure");
  assert.equal(r.rejected.length, 2);
  assert.match(r.rejected[0].reasons[0], /déjà utilisé/); assert.equal(r.rejected[1].id, "nope");
  assert.deepEqual(S.normalizeAll(undefined), { sessions: [], rejected: [] });
});

test("statut « complet » déduit de seatsLeft = 0 ; une session annulée n'est jamais « à venir »", () => {
  assert.equal(S.normalize(ok({ seatsLeft: 0 })).status, "full");
  const list = S.normalizeAll([ok(), ok({ id: "x-2099-03-11", date: "2099-03-11", status: "cancelled" })]).sessions;
  assert.deepEqual(S.upcoming(list, at("2099-01-01T10:00:00Z")).map((s) => s.id), ["2099-03-10-fr"]);
});

/* ------------------------------------------------------------------ temps : jour civil à Bruxelles */
test("« à venir » : le jour même tant que la session n'est pas finie (heure de Bruxelles, été et hiver)", () => {
  const s = S.normalize(ok({ date: "2099-07-01", startTime: "09:00", endTime: "16:30" }));
  assert.equal(S.todayISO(at("2099-06-30T22:30:00Z")), "2099-07-01", "22:30 UTC = 00:30 à Bruxelles (UTC+2) : déjà le lendemain");
  assert.equal(S.isUpcoming(s, at("2099-07-01T13:00:00Z")), true, "15:00 Bruxelles : en cours");
  assert.equal(S.isUpcoming(s, at("2099-07-01T14:31:00Z")), false, "16:31 Bruxelles : terminée");
  assert.equal(S.isUpcoming(s, at("2099-06-30T21:00:00Z")), true);
  const w = S.normalize(ok({ date: "2099-01-15", startTime: "09:00", endTime: "12:00" }));
  assert.equal(S.isUpcoming(w, at("2099-01-15T10:59:00Z")), true, "11:59 Bruxelles (UTC+1)");
  assert.equal(S.isUpcoming(w, at("2099-01-15T11:00:00Z")), false, "12:00 Bruxelles");
  assert.equal(S.isUpcoming(S.normalize(ok({ date: "2099-01-15", startTime: null, endTime: null })), at("2099-01-15T22:00:00Z")), true, "sans heure : toute la journée");
});

test("inscription possible = à venir + ouverte + des places", () => {
  const now = at("2099-01-01T10:00:00Z");
  assert.equal(S.isBookable(S.normalize(ok()), now), true);
  assert.equal(S.isBookable(S.normalize(ok({ seatsLeft: 0 })), now), false, "complet");
  assert.equal(S.isBookable(S.normalize(ok({ status: "full" })), now), false);
  assert.equal(S.isBookable(S.normalize(ok({ seatsLeft: null, capacity: null })), now), true, "places non renseignées : ouverte");
  assert.equal(S.isBookable(S.normalize(ok({ date: "2098-12-31" })), now), false, "passée");
  const list = S.normalizeAll([ok({ id: "a-2099-03-10" }), ok({ id: "b-2099-03-20", date: "2099-03-20", seatsLeft: 0 }), ok({ id: "c-2099-04-01", date: "2099-04-01", training: "nacelle" })]).sessions;
  assert.equal(S.nextFor(list, "vca-base", now).id, "a-2099-03-10");
  assert.equal(S.nextFor(list, "beps", now), null);
  assert.deepEqual(S.forTraining(list, "vca-base", now).map((s) => s.id), ["a-2099-03-10", "b-2099-03-20"], "la session complète reste listée (mais pas réservable)");
});

/* ------------------------------------------------------------------ affichage */
test("format() : date lisible dans chaque langue du site, jour civil exact (aucun décalage de fuseau)", () => {
  const s = S.normalize(ok({ date: "2099-03-10", language: "nl" }));
  assert.equal(S.format(s, "fr").dateLong, "Mardi 10 mars 2099");
  assert.equal(S.format(s, "fr").day, "10");
  assert.equal(S.format(s, "fr").time, "09:00 – 16:30");
  assert.match(S.format(s, "fr").language, /Néerlandais/);
  ["en", "nl", "de", "it", "ro", "sl", "bg", "af", "ar"].forEach((l) => {
    const f = S.format(s, l);
    assert.ok(f.dateLong && f.month && f.weekday, l + " : date localisée");
    assert.match(f.dateLong, /2099|٢٠٩٩/, l + " : année");
  });
  assert.equal(S.format(S.normalize(ok({ date: "2099-12-31" })), "fr").dateLong, "Jeudi 31 décembre 2099", "fin d'année : pas de décalage");
  assert.equal(S.format(S.normalize(ok({ startTime: null, endTime: null })), "fr").time, "");
});

/* ------------------------------------------------------------------ chargement */
test("load() : source « data » par défaut ; lit window.WISY_SESSIONS ; met en cache ; ne rejette jamais", async () => {
  S.reset();
  const data = { sessions: [ok(), { id: "bad" }] };
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  const r = await S.load({ env: { config: {}, data } });
  console.warn = warn; assert.equal(warned, 1, "la session refusée est SIGNALÉE (console) au propriétaire");
  assert.equal(r.source, "data"); assert.equal(r.sessions.length, 1); assert.equal(r.rejected.length, 1);
  assert.equal(S.peek().length, 1);
  const again = await S.load({ env: { config: {}, data: { sessions: [] } } });
  assert.equal(again, r, "mis en cache pour la durée de la page");
  S.reset();
  assert.equal((await S.load({ env: { config: {}, data: undefined } })).sessions.length, 0, "fichier absent → aucune session");
  S.reset();
});

test("load() : source « supabase » (table training_sessions) avec repli sur le fichier si elle est injoignable", async () => {
  const cfg = { SESSIONS_SOURCE: "supabase", SUPABASE_URL: "https://x.supabase.co/", SUPABASE_ANON_KEY: "sb_publishable_test" };
  const rows = [{ id: "2099-03-10-fr", training: "vca-base", session_date: "2099-03-10", start_time: "09:00:00", end_time: "16:30:00", language: "fr", location: null, capacity: 12, seats_left: 5, status: "open", price_cents: null, signup_url: null }];
  let seen = null;
  S.reset();
  const a = await S.load({ env: { config: cfg, data: { sessions: [] }, fetch: async (url, init) => { seen = { url, init }; return { ok: true, json: async () => rows }; } } });
  assert.equal(a.source, "supabase"); assert.equal(a.sessions[0].startTime, "09:00");
  assert.match(seen.url, /^https:\/\/x\.supabase\.co\/rest\/v1\/training_sessions\?select=\*&published=eq\.true&order=session_date\.asc&limit=200$/);
  assert.equal(seen.init.headers.apikey, "sb_publishable_test");
  assert.doesNotMatch(JSON.stringify(seen.init.headers), /service_role/, "jamais de clé privée");
  S.reset();
  const b = await S.load({ env: { config: cfg, data: { sessions: [ok({ id: "fichier-2099-03-10" })] }, fetch: async () => { throw new Error("réseau"); } } });
  assert.equal(b.source, "data", "table injoignable → repli sur js/sessions-data.js"); assert.equal(b.sessions[0].id, "fichier-2099-03-10");
  S.reset();
  const c = await S.load({ env: { config: cfg, data: { sessions: [] }, fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) } });
  assert.equal(c.source, "data", "HTTP 500 → repli");
  S.reset();
  const d = await S.load({ env: { config: cfg, data: { sessions: [] }, fetch: async () => ({ ok: true, json: async () => ({ message: "pas un tableau" }) }) } });
  assert.equal(d.source, "data", "réponse inattendue → repli");
  S.reset();
  const e = await S.load({ env: { config: { SESSIONS_SOURCE: "supabase" }, data: { sessions: [] }, fetch: async () => { throw new Error("ne doit pas être appelé"); } } });
  assert.equal(e.source, "data", "supabase demandé sans URL/clé → fichier");
  S.reset();
});

/* ------------------------------------------------------------------ fichier de sessions du propriétaire */
test("js/sessions-data.js : toutes les sessions publiées sont VALIDES, sans doublon, avec une formation connue du site", () => {
  const ctx = { window: {} }; vm.runInNewContext(read("js/sessions-data.js"), ctx);
  const list = ctx.window.WISY_SESSIONS.sessions;
  assert.ok(Array.isArray(list), "WISY_SESSIONS.sessions est un tableau");
  const Site = require("../js/site-content.js");
  const r = S.normalizeAll(list);
  assert.deepEqual(r.rejected, [], "session invalide dans js/sessions-data.js (la console du navigateur l'indique aussi) : " + JSON.stringify(r.rejected));
  list.forEach((s) => assert.ok(Site.formation(s.training), "formation inconnue du site : " + s.training));
  assert.match(ctx.window.WISY_SESSIONS.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("supabase/sessions.sql : table training_sessions, lecture publique des sessions PUBLIÉES seulement, écriture réservée à l'admin", () => {
  const sql = read("supabase/sessions.sql");
  assert.match(sql, /create table if not exists public\.training_sessions/i);
  assert.match(sql, /alter table public\.training_sessions enable row level security/i);
  assert.match(sql, /for select[\s\S]*using \(published = true\)/i, "lecture publique = lignes publiées");
  assert.doesNotMatch(sql, /service_role|grant all/i, "aucune clé ni droit large");
  ["id", "training", "session_date", "start_time", "end_time", "language", "location", "capacity", "seats_left", "status", "price_cents", "signup_url", "published"].forEach((c) => assert.match(sql, new RegExp("\\b" + c + "\\b"), "colonne " + c));
  /* les colonnes lues par js/sessions.js (fromRow) existent toutes dans la table */
  const src = read("js/sessions.js"), fromRow = src.slice(src.indexOf("function fromRow"), src.indexOf("var cache = null"));
  const cols = [...fromRow.matchAll(/\br\.([a-z_]+)/g)].map((m) => m[1]);
  assert.ok(cols.length >= 12, "colonnes lues par fromRow : " + cols.length);
  cols.forEach((c) => assert.match(sql, new RegExp("\\b" + c + "\\b"), "colonne lue par le site : " + c));
});

/* ------------------------------------------------------------------ AUCUNE date dans les pages */
test("aucune date de session écrite dans une page HTML (les dates ne viennent que de js/sessions-data.js ou de Supabase)", () => {
  const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
  const strip = (h) => h.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  /* Seules dates tolérées : celles de la RÉGLEMENTATION citée (arrêté royal du 7 avril 2023, chantiers après le 15 avril 2023)
     et la date de vérification des sources (registre : official.verifiedAt) — ce ne sont pas des sessions. */
  const V = require("../js/trainings-data.js").vcaBase.official.verifiedAt.split("-");
  const NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const verified = +V[2] + " " + NOMS[+V[1] - 1] + " " + V[0];
  const ALLOWED = new Set(["7 avril 2023", "15 avril 2023", verified]);
  ["formation-vca-base.html", "agenda.html", "inscription.html", "formations.html", "index.html", "article-vca-cout-financement.html", "article-vca-erreurs-examen.html"].forEach((f) => {
    const t = strip(read(f)), found = [...t.matchAll(new RegExp("\\b\\d{1,2}(?:er)?\\s+(?:" + MOIS + ")\\s+20\\d{2}\\b", "gi"))].map((m) => m[0]).filter((d) => !ALLOWED.has(d));
    assert.deepEqual(found, [], f + " : date écrite en dur (les sessions ne viennent que de js/sessions-data.js ou de Supabase)");
    assert.doesNotMatch(t, /\b20[2-9]\d-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/20\d{2}\b/, f + " : date numérique en dur");
  });
  /* les anciennes données de la page d'origine ne reviennent pas */
  ["formation-vca-base.html", "article-vca-cout-financement.html", "article-vca-erreurs-examen.html"].forEach((f) => {
    assert.doesNotMatch(read(f), /15 septembre 2025|Weversstraat|1730 Asse/, f + " : donnée de l'ancienne page");
  });
});

/* ------------------------------------------------------------------ câblage des consommateurs */
test("consommateurs : VCA Base, agenda, inscription, recherche et assistant lisent WisySessions (jamais de copie)", () => {
  const vca = read("formation-vca-base.html"), ag = read("agenda.html"), reg = read("inscription.html");
  [vca, ag, reg].forEach((h, i) => {
    assert.match(h, /src="js\/sessions\.js"/, ["VCA", "agenda", "inscription"][i] + " charge js/sessions.js");
    assert.ok(h.indexOf("js/sessions-data.js") > -1 && h.indexOf("js/supabase-config.js") > -1);
  });
  assert.match(read("js/formation-vca.js"), /WisySessions/);
  assert.match(read("js/agenda.js"), /Sessions\.upcoming\(Sessions\.peek\(\)\)/);
  assert.match(read("js/registration.js"), /Sessions\.isBookable\(s\)/, "la session de l'adresse est VÉRIFIÉE avant d'être retenue");
  assert.match(read("js/search.js"), /window\.WisySessions/);
  assert.match(read("js/assistant/assistant.js"), /S\.upcoming\(S\.peek\(\)\)/);
  const L = require("../js/assistant/launcher.js");
  ["js/supabase-config.js", "js/sessions-data.js", "js/sessions.js"].forEach((f) => assert.ok(L.ENGINE_FILES.includes(f), "moteur de l'assistant : " + f));
  assert.ok(L.ENGINE_FILES.indexOf("js/sessions.js") < L.ENGINE_FILES.indexOf("js/assistant/assistant.js"));
});

test("inscription : session validée (formation ET session), retirée si complète / passée / inconnue ; identifiant filtré ; événements VCA", () => {
  const r = read("js/registration.js");
  assert.match(r, /SESSION_ID_RE = \/\^\[a-z0-9\]\[a-z0-9-\]\{2,63\}\$\//, "identifiant de session filtré avant tout usage");
  assert.match(r, /DATA\.resolveTrainingId\(s\.training\) === pendingSession\.trainingId/, "la session doit appartenir à la formation demandée");
  assert.match(r, /!Sessions\.isBookable\(s2\)\) \{ delete state\.sessions\[id\]/, "session devenue complète / passée : retirée");
  assert.match(r, /sessionId: state\.sessions\[id\] \|\| null/, "la session est transmise dans la commande");
  assert.match(r, /vca_registration_start/); assert.match(r, /vca_registration_complete/);
  assert.match(r, /new CustomEvent\("wisy:analytics"/, "bus du site (consentement géré par cookie-consent.js)");
  assert.doesNotMatch(r.slice(r.indexOf("function track("), r.indexOf("function track(") + 400), /email|phone|firstName|lastName/i, "aucune donnée personnelle dans les événements");
  /* clés de traduction du parcours, dans les 10 langues */
  const ctx = { window: {} }; vm.runInNewContext(read("js/i18n-data-inscription.js"), ctx);
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => ["reg.session_label", "reg.session_remove", "reg.session_note_ok", "reg.session_note_gone", "reg.a11y_session_removed"].forEach((k) => assert.ok(ctx.window.I18N[l][k], l + " " + k)));
  ["en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => assert.ok(ctx.window.I18N[l]["reg.session_note_ok"].includes("{date}"), l + " : variable {date} conservée"));
});
