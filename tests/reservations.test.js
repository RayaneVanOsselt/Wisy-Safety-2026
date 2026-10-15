"use strict";
/* Réservations : script de la feuille Google (google-sheets/reservations.gs, exécuté ici sur une FAUSSE feuille
   Google Sheets — tests/helpers/gas-fake.js), client du site (js/reservations.js), source « sheets » de
   js/sessions.js, synchronisation Outlook (Microsoft Graph simulé) et parcours complet « 10 places sur 10 ».
   `node --test tests/*.test.js` — aucune dépendance.

   Ce que ces tests NE prouvent PAS : le comportement réel de Google (verrou entre deux exécutions parallèles,
   délais, quotas) ni celui de Microsoft 365. Voir docs/README-RESERVATIONS.md, « Tests à faire après la mise en
   service » (scripts/test-reservations-live.js envoie de vraies demandes simultanées). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadGas } = require("./helpers/gas-fake.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const R = require("../js/reservations.js");
const SESSION = "2026-10-18-nacelle";
const NOW = "2026-10-15T08:00:00Z";                  // jeudi 15/10/2026, 10 h à Bruxelles

function sheetGas(opts) {
  const G = loadGas("google-sheets/reservations.gs", Object.assign({ now: NOW, answers: [] }, opts || {}));
  G.ctx.installer();
  G.alerts.length = 0;
  return G;
}
let seq = 0;
function order(quantity, extra) {
  seq++;
  return Object.assign({
    action: "book", requestId: "test-request-" + String(seq).padStart(6, "0"), lang: "fr",
    customer: { firstName: "Marie", lastName: "Dupont", email: "client" + seq + "@exemple.be", phone: "0470 00 00 00" },
    billing: { company: "Chantiers Dupont", vat: "", address: "Rue de l'Exemple 1", zip: "1070", city: "Anderlecht", country: "BE" },
    items: [{ training: "nacelle", sessionId: SESSION, quantity, participants: [{ firstName: "Jean", lastName: "Peeters", email: "" }] }]
  }, extra || {});
}
const session = (G) => G.get().sessions.find((s) => s.id === SESSION);
const plain = (x) => JSON.parse(JSON.stringify(x));            // valeurs venues du contexte isolé du script → objets ordinaires
/* Modification « à la main » d'une cellule de l'onglet Sessions : passe par le vrai déclencheur onEdit de la feuille. */
function edit(G, line, field, value) {
  const t = G.ctx.table_("Sessions");
  G.ctx.setCell_(t, line, field, value);
  G.ctx.onEdit({ range: G.sheet("Sessions").getRange(line, 1) });
}
const bookings = (G) => G.sheet("Réservations").records();

/* ------------------------------------------------------------------ installation */
test("installer : 7 onglets, TOUTES les formations du site, la session Nacelles du 18/10/2026 (10 places, publiée), tâche automatique", () => {
  const G = sheetGas();
  assert.deepEqual(G.sheets.map((s) => s.getName()), ["Formations", "Sessions", "Réservations", "Participants", "Écarts Outlook", "File d'envoi", "Journal"]);
  const ctx = { window: {} }; ctx.self = ctx.window;
  vm.runInNewContext(read("js/trainings-data.js"), ctx); vm.runInNewContext(read("js/site-content.js"), ctx);
  const site = ctx.window.WisySite.formations().concat(ctx.window.WisySite.services());
  const rows = G.sheet("Formations").records();
  assert.deepEqual(plain(rows.map((r) => r["Identifiant"])), plain(site.map((f) => f.id)), "mêmes formations, même ordre que le registre du site");
  rows.forEach((r, i) => {
    assert.equal(r["Formation"], site[i].title, "nom = titre du site : " + r["Identifiant"]);
    assert.equal(r["Page du site"], "https://rayanevanosselt.github.io/Wisy-Safety-2026/" + site[i].url);
    if (site[i].priceLabel) assert.ok(r["Tarif"].startsWith(site[i].priceLabel), "tarif du site : " + r["Tarif"]);
    else assert.equal(r["Tarif"], "Sur devis", "aucun tarif inventé : " + r["Identifiant"]);
  });
  const s = G.sheet("Sessions").records();
  assert.equal(s.length, 1);
  assert.equal(s[0]["Identifiant"], SESSION);
  assert.equal(s[0]["Formation"], "Nacelles élévatrices");
  assert.equal(s[0]["Début"], "10:00"); assert.equal(s[0]["Fin"], "18:00");
  assert.equal(s[0]["Places (total)"], 10); assert.equal(s[0]["Restantes"], 10); assert.equal(s[0]["Réservées"], 0);
  assert.equal(s[0]["Statut"], "Ouverte"); assert.equal(s[0]["Publiée sur le site"], true);
  assert.equal(G.triggers.length, 1, "une seule tâche automatique"); assert.equal(G.triggers[0].fn, "tick");
  G.ctx.installer();
  assert.equal(G.sheet("Sessions").records().length, 1, "réinstaller ne duplique rien");
  assert.equal(G.sheet("Formations").records().length, site.length);
  assert.equal(G.triggers.length, 1);
});

test("installer après la date : la session du 18/10 n'est pas recréée dans le passé", () => {
  const G = sheetGas({ now: "2026-10-20T08:00:00Z" });
  assert.equal(G.sheet("Sessions").records().length, 0);
});

/* ------------------------------------------------------------------ liste publique */
test("liste publique : « 10 places disponibles sur 10 », fin des inscriptions 48 h avant, AUCUNE donnée personnelle", () => {
  const G = sheetGas();
  const out = G.get();
  assert.equal(out.status, "ok");
  assert.deepEqual(out.sessions, [{ id: SESSION, training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", language: null, location: null,
    capacity: 10, seatsLeft: 10, status: "open", closesAt: "2026-10-16T10:00" }]);
  G.post(order(2));
  const text = JSON.stringify(G.get({ action: "sessions" }));
  assert.doesNotMatch(text, /Dupont|exemple\.be|0470|Peeters|Rue de/, "jamais un nom, un e-mail, un téléphone ou une adresse");
  assert.equal(G.get({ action: "health" }).status, "ok");
  assert.equal(G.get({ action: "autre" }).status, "error");
});

/* ------------------------------------------------------------------ réservations successives */
test("réservations successives : 10 → 9 → 8 ; une entreprise prend 4 places → 4 ; COMPLÈTE à 0 ; jamais au-delà", () => {
  const G = sheetGas();
  assert.equal(session(G).seatsLeft, 10);
  let r = G.post(order(1));
  assert.equal(r.status, "ok"); assert.match(r.reference, /^WSR-2026-[A-Z2-9]{5}$/);
  assert.deepEqual(r.items, [{ training: "nacelle", sessionId: SESSION, seats: 1, status: "confirmed" }]);
  assert.equal(session(G).seatsLeft, 9);
  G.post(order(1)); assert.equal(session(G).seatsLeft, 8);
  r = G.post(order(4)); assert.equal(r.status, "ok"); assert.equal(session(G).seatsLeft, 4);
  r = G.post(order(5));
  assert.deepEqual(r, { status: "unavailable", problems: [{ sessionId: SESSION, reason: "insufficient", remaining: 4 }] }, "5 places demandées, 4 restantes : refus");
  assert.equal(bookings(G).length, 3, "rien n'est écrit quand la demande est refusée");
  r = G.post(order(4)); assert.equal(r.status, "ok");
  assert.equal(session(G).seatsLeft, 0); assert.equal(session(G).status, "full", "complète automatiquement");
  r = G.post(order(1));
  assert.deepEqual(r, { status: "unavailable", problems: [{ sessionId: SESSION, reason: "full", remaining: 0 }] });
  const s = G.sheet("Sessions").records()[0];
  assert.equal(s["Réservées"], 10); assert.equal(s["Restantes"], 0);
  assert.equal(bookings(G).reduce((n, b) => n + b["Places"], 0), 10, "total réservé = capacité, jamais plus");
});

test("dernière place : deux demandes « simultanées » → une seule réussit (le verrou les fait passer l'une après l'autre)", () => {
  const G = sheetGas();
  G.post(order(9));
  const a = G.post(order(1)), b = G.post(order(1));
  assert.equal([a, b].filter((x) => x.status === "ok").length, 1);
  assert.equal(b.status, "unavailable"); assert.equal(b.problems[0].reason, "full");
  assert.equal(G.stats().flushes >= 2, true, "chaque réservation est écrite (flush) AVANT de rendre le verrou");
});

test("lecture SOUS verrou : une réservation écrite par une autre exécution pendant l'attente du verrou est prise en compte", () => {
  let inject = false, G;
  G = sheetGas({ onLock: () => {
    if (!inject) return;
    inject = false;
    /* Une autre personne vient de réserver 9 places pendant que cette demande attendait le verrou. */
    const t = G.sheet("Réservations"), head = t.getRange(1, 1, 1, t.getLastColumn()).getValues()[0];
    const row = head.map((h) => ({ "Session": SESSION, "Places": 9, "Statut": "Confirmée", "Référence": "WSR-2026-AUTRE", "Formation": "Nacelles élévatrices" }[h] || ""));
    t.getRange(t.getLastRow() + 1, 1, 1, head.length).setValues([row]);
  } });
  assert.equal(session(G).seatsLeft, 10, "avant : 10 places visibles");
  inject = true;
  const r = G.post(order(2));
  assert.deepEqual(r, { status: "unavailable", problems: [{ sessionId: SESSION, reason: "insufficient", remaining: 1 }] }, "jamais 11 places sur 10");
});

test("verrou indisponible (trop de demandes en même temps) → « busy », rien n'est écrit", () => {
  const G = sheetGas({ lockFails: true });
  assert.deepEqual(G.post(order(1)), { status: "busy" });
  assert.equal(bookings(G).length, 0);
});

test("double envoi (même identifiant de requête, ex. coupure réseau puis nouvel essai) → même référence, une seule réservation", () => {
  const G = sheetGas();
  const o = order(3);
  const a = G.post(o), b = G.post(o);
  assert.equal(a.reference, b.reference); assert.equal(b.duplicate, true);
  assert.deepEqual(b.items, [{ training: "nacelle", sessionId: SESSION, seats: 3, status: "confirmed" }]);
  assert.equal(bookings(G).length, 1); assert.equal(session(G).seatsLeft, 7);
});

test("demande sur plusieurs formations : tout ou rien ; une formation sans session = demande « date à convenir » (aucune place prise)", () => {
  const G = sheetGas();
  G.post(order(8));
  let r = G.post(order(0, { items: [
    { training: "vca-base", sessionId: null, quantity: 2, participants: null },
    { training: "nacelle", sessionId: SESSION, quantity: 3, participants: null }] }));
  assert.equal(r.status, "unavailable", "la nacelle n'a plus que 2 places : RIEN n'est enregistré, pas même la VCA");
  assert.equal(bookings(G).length, 1);
  r = G.post(order(0, { items: [
    { training: "vca-base", sessionId: null, quantity: 2, participants: null },
    { training: "nacelle", sessionId: SESSION, quantity: 2, participants: null }] }));
  assert.equal(r.status, "ok");
  assert.deepEqual(r.items.map((i) => i.status), ["request", "confirmed"]);
  const rows = bookings(G).slice(1);
  assert.equal(rows[0]["Statut"], "Demande (date à convenir)"); assert.equal(rows[0]["Date de la session"], "À convenir");
  assert.equal(rows[0]["Participants"], "À communiquer");
  assert.equal(rows[0]["Référence"], rows[1]["Référence"], "une seule référence pour la demande");
  assert.equal(session(G).seatsLeft, 0);
});

/* ------------------------------------------------------------------ annulations / statuts */
test("annulation d'une réservation (menu) : places libérées immédiatement, ligne gardée avec la date d'annulation", () => {
  const answers = [];
  const G = sheetGas({ answers });
  G.post(order(4)); G.post(order(6));
  assert.equal(session(G).status, "full");
  G.sheet("Réservations").select(3, 1);                       // 2e réservation (6 places)
  answers.push("YES", "NO");                                   // confirmer l'annulation · pas d'e-mail
  G.ctx.annulerLaReservation();
  const rows = bookings(G);
  assert.equal(rows.length, 2, "jamais de ligne supprimée");
  assert.equal(rows[1]["Statut"], "Annulée"); assert.ok(rows[1]["Annulée le"] instanceof Date);
  assert.equal(rows[0]["Statut"], "Confirmée", "l'autre réservation est intacte");
  assert.equal(session(G).seatsLeft, 6); assert.equal(session(G).status, "open");
  assert.equal(G.sheet("Sessions").records()[0]["Restantes"], 6);
  assert.equal(G.post(order(6)).status, "ok", "les places libérées sont de nouveau réservables");
});

test("annuler la SESSION : retirée du site, réservations annulées, un e-mail par client", () => {
  const G = sheetGas();
  G.post(order(2)); G.post(order(3));
  const before = G.mails.length;
  G.sheet("Sessions").select(2, 1);
  G.ctx.SpreadsheetApp.getUi().alert = (...a) => { G.alerts.push(a.join(" | ")); return "YES"; };
  G.ctx.annulerLaSession();
  assert.equal(G.get().sessions.length, 0, "session annulée = plus affichée");
  assert.ok(bookings(G).every((b) => b["Statut"] === "Annulée"));
  assert.equal(G.mails.length - before, 2, "un e-mail d'annulation par réservation");
  assert.match(G.mails[G.mails.length - 1].subject, /session annulée/);
  assert.equal(G.post(order(1)).problems[0].reason, "cancelled", "plus aucune réservation possible");
});

test("fermer les inscriptions / date limite passée / session non publiée : visible ou non, mais plus réservable", () => {
  let G = sheetGas({ now: "2026-10-16T09:00:00Z" });         // vendredi 11 h : après la fin des inscriptions (16/10 10 h)
  assert.equal(session(G).status, "closed");
  assert.equal(G.post(order(1)).problems[0].reason, "closed");
  G = sheetGas();
  assert.equal(session(G).status, "open");
  edit(G, 2, "closes", "17/10/2026 18:00");                    // colonne « Fin des inscriptions » remplie à la main
  assert.equal(session(G).closesAt, "2026-10-17T18:00", "modification visible tout de suite (cache renouvelé par onEdit)");
  edit(G, 2, "status", "Fermée");
  assert.equal(session(G).status, "closed");
  edit(G, 2, "status", "Ouverte");
  edit(G, 2, "published", false);
  assert.equal(G.get().sessions.length, 0, "non publiée = invisible");
  assert.equal(G.post(order(1)).problems[0].reason, "unknown");
});

test("mode « validation manuelle » : En attente compte dans les places, puis expire et libère les places", () => {
  let now = new Date(NOW);
  const G = sheetGas({ now: () => now });
  G.ctx.CONFIG.CONFIRMATION = "manual";
  const r = G.post(order(4));
  assert.equal(r.items[0].status, "pending");
  assert.equal(bookings(G)[0]["Statut"], "En attente"); assert.ok(bookings(G)[0]["Expire le"] instanceof Date);
  assert.equal(session(G).seatsLeft, 6, "une demande en attente bloque ses places");
  now = new Date(new Date(NOW).getTime() + 73 * 3600000);       // 73 h plus tard (après la fin des inscriptions : peu importe)
  G.ctx.tick();
  assert.equal(bookings(G)[0]["Statut"], "Expirée");
  assert.equal(G.sheet("Sessions").records()[0]["Restantes"], 10, "places libérées");
});

/* ------------------------------------------------------------------ validation et sécurité */
test("tout ce qu'envoie le site est revalidé (le formulaire peut être contourné)", () => {
  const G = sheetGas();
  const bad = (patch) => G.post(Object.assign(order(1), patch));
  assert.equal(bad({ customer: { firstName: "M", lastName: "D", email: "pas-un-email", phone: "1" } }).fields.email, "invalid");
  assert.equal(bad({ customer: { firstName: "M", lastName: "D", email: "a@b.be", phone: "" } }).fields.phone, "required");
  assert.equal(bad({ requestId: "court" }).fields.requestId, "invalid");
  assert.equal(bad({ items: [] }).fields.items, "invalid");
  assert.equal(bad({ items: [{ training: "inconnue", sessionId: null, quantity: 1 }] }).fields.items, "unknown_training");
  assert.equal(bad({ items: [{ training: "nacelle", sessionId: SESSION, quantity: 0 }] }).fields.items, "invalid_quantity");
  assert.equal(bad({ items: [{ training: "nacelle", sessionId: SESSION, quantity: 51 }] }).fields.items, "invalid_quantity");
  assert.equal(bad({ items: [{ training: "nacelle", sessionId: SESSION, quantity: 1.5 }] }).fields.items, "invalid_quantity");
  assert.equal(bad({ items: [{ training: "nacelle", sessionId: "../x", quantity: 1 }] }).fields.items, "invalid_session");
  assert.equal(bad({ items: [{ training: "beps", sessionId: SESSION, quantity: 1 }] }).problems[0].reason, "unknown", "session d'une autre formation");
  assert.equal(G.post({ action: "autre" }).status, "error");
  assert.equal(G.post("pas du json").status, "error");
  assert.equal(G.post(JSON.stringify(Object.assign(order(1), { notes: "x".repeat(41000) }))).status, "invalid");
  const honeypot = G.post(Object.assign(order(1), { website: "http://spam" }));
  assert.equal(honeypot.status, "ok", "robot : réponse normale…");
  assert.equal(bookings(G).length, 0, "… mais rien n'est enregistré");
});

test("texte des visiteurs écrit comme TEXTE (jamais une formule) ; limites anti-abus par e-mail", () => {
  const G = sheetGas();
  assert.equal(G.ctx.asText_("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  const src = read("google-sheets/reservations.gs");
  ["name", "email", "phone", "company", "vat", "address", "participants"].forEach((f) =>
    assert.match(src, new RegExp(f + ": asText_\\("), "colonne « " + f + " » écrite avec asText_"));
  for (let i = 0; i < 5; i++) assert.equal(G.post(order(1, { customer: { firstName: "A", lastName: "B", email: "meme@exemple.be", phone: "1" } })).status, "ok");
  const r = G.post(order(1, { customer: { firstName: "A", lastName: "B", email: "meme@exemple.be", phone: "1" } }));
  assert.equal(r.status, "rate_limited"); assert.ok(r.retryAfter >= 60);
});

test("aucun secret dans le script ni dans le site : identifiants Microsoft dans les propriétés du script uniquement", () => {
  const src = read("google-sheets/reservations.gs");
  assert.match(src, /@OnlyCurrentDoc/);
  assert.match(src, /PropertiesService\.getScriptProperties\(\)/);
  assert.doesNotMatch(src, /client_secret:\s*"[^"]/, "aucun secret écrit en dur");
  const site = ["js/supabase-config.js", "js/reservations.js", "js/sessions.js", "js/registration.js"].map(read).join("\n");
  assert.doesNotMatch(site, /MS_CLIENT_SECRET|client_secret|login\.microsoftonline\.com|graph\.microsoft\.com/i, "le site ne parle jamais à Microsoft");
  const cfg = {}; vm.runInNewContext(read("js/supabase-config.js"), { window: cfg });
  assert.ok(R.endpoint(cfg.WISY_CONFIG), "adresse publique « Application Web » de la feuille (…/exec), rien d'autre");
  assert.equal(cfg.WISY_CONFIG.SESSIONS_SOURCE, "sheets");
});

/* ------------------------------------------------------------------ e-mails */
test("e-mails : confirmation au client + avis à Wisy Safety ; en cas d'échec → file d'envoi, réessais espacés, abandon journalisé", () => {
  let now = new Date(NOW);
  const G = sheetGas({ now: () => now });
  G.post(order(2));
  assert.equal(G.mails.length, 2);
  assert.equal(G.mails[0].to, "client" + seq + "@exemple.be"); assert.match(G.mails[0].subject, /réservation confirmée WSR-/);
  assert.match(G.mails[0].htmlBody, /dimanche 18 octobre 2026, 10:00–18:00/);
  assert.equal(G.mails[1].to, "info@wisysafety.be"); assert.match(G.mails[1].htmlBody, /8 place\(s\) restante\(s\) sur 10/);
  const F = loadGas("google-sheets/reservations.gs", { now: () => now, mailFails: true });
  F.ctx.installer();
  F.post(order(1));
  let q = F.sheet("File d'envoi").records();
  assert.equal(q.length, 2); assert.ok(q.every((x) => x["Statut"] === "À envoyer" && x["Essais"] === 1 && x["Prochain essai"] instanceof Date));
  F.ctx.processOutbox_(20);
  assert.equal(F.sheet("File d'envoi").records()[0]["Essais"], 1, "pas de nouvel essai avant l'heure prévue");
  for (let i = 0; i < 6; i++) { now = new Date(now.getTime() + 25 * 3600000); F.ctx.processOutbox_(20); }
  q = F.sheet("File d'envoi").records();
  assert.ok(q.every((x) => x["Statut"] === "Échec"), "abandon après 6 essais");
  assert.ok(F.sheet("Journal").records().some((l) => l["Niveau"] === "Erreur" && /Abandon après 6 essais/.test(l["Message"])));
});

/* ------------------------------------------------------------------ Outlook (Microsoft Graph simulé) */
function graphMock() {
  const events = new Map(), calls = [];
  let n = 0, failCreate = 0;
  const http = (url, o) => {
    const method = (o.method || "get").toLowerCase();
    calls.push({ method, url, body: o.payload && typeof o.payload === "string" ? JSON.parse(o.payload) : o.payload, headers: o.headers });
    if (/login\.microsoftonline\.com/.test(url)) return { code: 200, body: { access_token: "jeton-test", expires_in: 3600 } };
    if (/\/sendMail$/.test(url)) return { code: 202, body: "" };
    if (/\/calendar\?/.test(url)) return { code: 200, body: { name: "Calendrier" } };
    const m = url.match(/\/events\/([^?]+)/);
    if (method === "get" && /\/events\?/.test(url)) return { code: 200, body: { value: [...events.values()].filter((e) => decodeURIComponent(url).includes("'" + e.sessionId + "'")).map((e) => ({ id: e.id })) } };
    if (method === "post" && /\/events$/.test(url)) {
      if (failCreate > 0) { failCreate--; return { code: 503, body: { error: { code: "ServiceUnavailable", message: "Réessayez" } } }; }
      const b = JSON.parse(o.payload), id = "evt-" + (++n);
      events.set(id, { id, sessionId: b.singleValueExtendedProperties[0].value, start: b.start, end: b.end, subject: b.subject, isAllDay: b.isAllDay });
      return { code: 201, body: { id } };
    }
    if (m) {
      const e = events.get(decodeURIComponent(m[1]));
      if (!e) return { code: 404, body: { error: { code: "ErrorItemNotFound" } } };
      if (method === "get") return { code: 200, body: { start: { dateTime: e.start.dateTime + ".0000000" }, end: { dateTime: e.end.dateTime + ".0000000" }, isAllDay: !!e.isAllDay, subject: e.subject } };
      if (method === "patch") { const b = JSON.parse(o.payload); Object.assign(e, b.start ? { start: b.start, end: b.end } : {}, { subject: b.subject }); return { code: 200, body: { id: e.id } }; }
    }
    return { code: 400, body: { error: { code: "BadRequest" } } };
  };
  return { http, events, calls, failNextCreate: (k) => { failCreate = k; } };
}
const MS = { MS_TENANT_ID: "tenant-test", MS_CLIENT_ID: "client-test", MS_CLIENT_SECRET: "secret-test", MS_MAILBOX: "formations@wisysafety.be" };

test("Outlook : un événement par session (calendrier dédié), sans doublon, mis à jour quand les places changent", () => {
  const M = graphMock();
  const G = sheetGas({ http: M.http, props: MS });
  G.ctx.tick();
  assert.equal(M.events.size, 1);
  const create = M.calls.find((c) => c.method === "post" && /\/events$/.test(c.url));
  assert.match(create.url, /\/users\/formations%40wisysafety\.be\/events$/, "uniquement la boîte dédiée");
  assert.equal(create.body.transactionId, "wisy-" + SESSION + "-0", "identifiant de transaction : un nouvel essai ne crée pas de doublon");
  assert.equal(create.body.singleValueExtendedProperties[0].value, SESSION);
  assert.deepEqual(create.body.start, { dateTime: "2026-10-18T10:00:00", timeZone: "Romance Standard Time" });
  assert.deepEqual(create.body.end, { dateTime: "2026-10-18T18:00:00", timeZone: "Romance Standard Time" });
  assert.equal(create.body.subject, "Nacelles élévatrices — 0/10 inscrits");
  assert.doesNotMatch(JSON.stringify(create.body), /Dupont|@exemple/, "aucune donnée de client dans Outlook");
  const row = G.sheet("Sessions").records()[0];
  assert.equal(row["ID Outlook (technique)"], "evt-1"); assert.match(row["Outlook"], /^✓ Synchronisée le/);
  const before = M.calls.length;
  G.ctx.tick();
  assert.ok(!M.calls.slice(before).some((c) => c.method === "post" || c.method === "patch"), "rien n'a changé : aucun envoi");
  G.post(order(3));
  G.ctx.tick();
  assert.equal(M.events.size, 1, "toujours UN événement");
  assert.equal(M.events.get("evt-1").subject, "Nacelles élévatrices — 3/10 inscrits");
  assert.ok(M.calls.some((c) => c.method === "post" && /\/sendMail$/.test(c.url)), "les e-mails partent de la boîte Microsoft 365 quand elle est configurée");
  assert.ok(M.calls.every((c) => c.method === "post" && /login/.test(c.url) || c.headers.Authorization === "Bearer jeton-test"));
});

test("Outlook : identifiant perdu → l'événement existant est retrouvé (propriété cachée), pas recréé", () => {
  const M = graphMock();
  const G = sheetGas({ http: M.http, props: MS });
  G.ctx.tick();
  const t = G.ctx.table_("Sessions");
  G.ctx.setCell_(t, 2, "outlook_id", ""); G.ctx.setCell_(t, 2, "outlook_sent", "");
  G.ctx.tick();
  assert.equal(M.events.size, 1, "aucun doublon");
  assert.equal(G.sheet("Sessions").records()[0]["ID Outlook (technique)"], "evt-1");
});

test("Outlook : événement déplacé ou supprimé DANS Outlook → écart à décider ; la feuille et les réservations ne sont jamais écrasées", () => {
  const M = graphMock();
  const G = sheetGas({ http: M.http, props: MS });
  G.post(order(2));
  G.ctx.tick();
  const e = M.events.get("evt-1");
  e.start = { dateTime: "2026-10-18T11:00:00" }; e.end = { dateTime: "2026-10-18T19:00:00" };   // déplacé à la main dans Outlook
  G.post(order(1));                                                                            // pendant ce temps, une réservation
  G.ctx.tick();
  let gaps = G.sheet("Écarts Outlook").records();
  assert.equal(gaps.length, 1); assert.equal(gaps[0]["Changement"], "Déplacé dans Outlook");
  assert.equal(gaps[0]["Dans Outlook"], "18/10/2026 · 11:00–19:00"); assert.equal(gaps[0]["Dans la feuille"], "18/10/2026 · 10:00–18:00");
  assert.equal(e.start.dateTime, "2026-10-18T11:00:00", "l'horaire d'Outlook n'est pas écrasé tant que rien n'est décidé");
  assert.equal(e.subject, "Nacelles élévatrices — 3/10 inscrits", "… mais le nombre d'inscrits reste à jour");
  assert.equal(session(G).startTime, "10:00", "la feuille garde son horaire");
  G.ctx.tick();
  assert.equal(G.sheet("Écarts Outlook").records().length, 1, "un seul écart, pas un par passage");
  G.ctx.setCell_(G.ctx.table_("Écarts Outlook"), 2, "decision", "Appliquer");
  G.ctx.traiterLesEcarts();
  assert.equal(session(G).startTime, "11:00"); assert.equal(session(G).endTime, "19:00");
  assert.equal(session(G).seatsLeft, 7, "les 3 places réservées sont conservées");
  G.ctx.tick();
  assert.equal(G.sheet("Écarts Outlook").records().length, 1, "plus d'écart après la décision");
  M.events.delete("evt-1");                                                                    // supprimé dans Outlook
  G.ctx.tick();
  gaps = G.sheet("Écarts Outlook").records();
  assert.equal(gaps[1]["Changement"], "Supprimé dans Outlook");
  assert.equal(session(G).status, "open", "jamais d'annulation automatique (une suppression par erreur ne coûte aucune réservation)");
  G.ctx.setCell_(G.ctx.table_("Écarts Outlook"), 3, "decision", "Ignorer");
  G.ctx.traiterLesEcarts();
  G.ctx.tick();
  assert.equal(M.events.size, 1, "« Ignorer » : l'événement est recréé dans Outlook");
  assert.equal([...M.events.values()][0].start.dateTime, "2026-10-18T11:00:00");
});

test("Outlook : panne Microsoft → réessai plus tard (5 min, 15 min…), erreur dans le Journal ; non configuré → rien n'est appelé", () => {
  let now = new Date(NOW);
  const M = graphMock();
  const G = sheetGas({ http: M.http, props: MS, now: () => now });
  M.failNextCreate(1);
  G.ctx.tick();
  let row = G.sheet("Sessions").records()[0];
  assert.equal(row["Essais Outlook (technique)"], 1); assert.match(row["Outlook"], /Erreur \(essai 1\)/);
  assert.ok(G.sheet("Journal").records().some((l) => l["Type"] === "Outlook" && l["Niveau"] === "Erreur" && /503/.test(l["Message"])));
  G.ctx.tick();
  assert.equal(M.events.size, 0, "pas de nouvel essai avant 5 minutes");
  now = new Date(now.getTime() + 6 * 60000);
  G.ctx.tick();
  assert.equal(M.events.size, 1);
  row = G.sheet("Sessions").records()[0];
  assert.equal(row["Essais Outlook (technique)"], 0); assert.match(row["Outlook"], /^✓/);
  const N = sheetGas();
  N.ctx.tick(); N.post(order(1));
  assert.equal(N.http.length, 0, "Outlook non configuré : aucun appel réseau, les e-mails partent par Google");
});

/* ------------------------------------------------------------------ client du site */
const API = "https://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/exec";
function fakeFetch(status, body, seen) {
  return (url, init) => { if (seen) { seen.url = url; seen.init = init; } return Promise.resolve({ status, ok: status === 200, text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)), json: () => Promise.resolve(body) }); };
}
const ORDER = { requestId: "r-abcdefghijklmnop", lang: "fr", customer: { firstName: "M" }, billing: {}, items: [{ training: "nacelle", sessionId: SESSION, quantity: 2, participants: null }] };

test("client : adresse acceptée seulement si c'est un script Google déployé (ou localhost) ; identifiant de requête aléatoire", () => {
  assert.equal(R.endpoint({ RESERVATIONS_API_URL: API }), API);
  ["", "https://evil.example/macros/s/x/exec", "http://script.google.com/macros/s/AKfycbx_EXEMPLE_exemple_1234567890abcdef/exec", API + "?x=1", "javascript:alert(1)"]
    .forEach((u) => assert.equal(R.endpoint({ RESERVATIONS_API_URL: u }), null, u));
  assert.equal(R.endpoint({ RESERVATIONS_API_URL: "http://localhost:4180/exec" }), "http://localhost:4180/exec");
  const a = R.newRequestId(), b = R.newRequestId();
  assert.match(a, /^r-[a-z2-9]{22}$/); assert.notEqual(a, b);
});

test("client : POST text/plain (sans pré-vérification CORS) ; réponses normalisées, champs inattendus ignorés ; pannes → états explicites", async () => {
  const seen = {};
  let r = await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "ok", reference: "WSR-2026-ABCDE", items: [{ training: "nacelle", sessionId: SESSION, seats: 2, status: "confirmed", evil: "<b>" }] }, seen) });
  assert.equal(seen.init.method, "POST"); assert.equal(seen.init.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.equal(seen.init.credentials, "omit"); assert.equal(seen.init.redirect, "follow");
  const body = JSON.parse(seen.init.body);
  assert.equal(body.action, "book"); assert.equal(body.requestId, ORDER.requestId); assert.equal(body.items[0].quantity, 2);
  assert.deepEqual(r, { kind: "ok", reference: "WSR-2026-ABCDE", items: [{ training: "nacelle", sessionId: SESSION, seats: 2, status: "confirmed" }], duplicate: false });
  r = await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "unavailable", problems: [{ sessionId: SESSION, reason: "insufficient", remaining: 1 }, { sessionId: "<x>", reason: "?" }] }) });
  assert.deepEqual(r, { kind: "seats", problems: [{ sessionId: SESSION, reason: "insufficient", remaining: 1 }] });
  assert.deepEqual(await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "invalid", fields: { email: "invalid", evil: "x" } }) }), { kind: "invalid", fields: { email: "invalid" } });
  assert.deepEqual(await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "busy" }) }), { kind: "busy" });
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "rate_limited", retryAfter: 5 }) })).retryAfter, 60);
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(404, "Not found") })).kind, "not_configured");
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, "<html>connexion Google</html>") })).kind, "unavailable");
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: () => Promise.reject(new Error("réseau")) })).kind, "unavailable");
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: "" }, order: ORDER, fetch: fakeFetch(200, {}) })).kind, "not_configured");
  assert.equal((await R.book({ config: { RESERVATIONS_API_URL: API }, order: ORDER, fetch: fakeFetch(200, { status: "ok", reference: "<script>" }) })).reference, null);
});

test("inscription : coupure réseau → MÊME identifiant au nouvel essai ; refus net (places, champs, limite) → nouvelle demande", () => {
  const js = read("js/registration.js");
  assert.match(js, /if \(!bookingRequestId\) bookingRequestId = Booking\.newRequestId\(\);/);
  assert.match(js, /if \(res\.kind === "seats"\) \{\s*bookingRequestId = null;/);
  assert.match(js, /Coupure réseau : on ne sait pas si la feuille a enregistré — le même identifiant est gardé/);
  assert.match(js, /clearStorage\(\);\s*\/\* les données personnelles ne restent pas dans le navigateur une fois transmises \*\/\s*track\("registration_booked"/);
  assert.match(js, /function save\(\) \{\s*if \(transmitted\) return;/, "après l'envoi, rien n'est réécrit dans le navigateur (bug vu dans le navigateur le 15/10/2026)");
  assert.match(js, /bookingSent = true;\s*transmitted = true;/); assert.match(js, /requestSent = true;\s*transmitted = true;/);
  assert.match(js, /"wisy:sessions", function \(\) \{\s*if \(transmitted\) return;/, "pas d'alerte « session plus disponible » juste après avoir réservé la dernière place");
  assert.match(js, /return selectedIds\(\)\.length > 0 && !over\.length;/, "étape 1 bloquée si plus de participants que de places restantes");
  assert.match(js, /\(lim != null && qty >= lim\) \? " disabled"/, "bouton + désactivé à la limite des places");
});

/* ------------------------------------------------------------------ js/sessions.js : source « sheets » */
const S = require("../js/sessions.js");
test("sessions.js : source « sheets » = places CALCULÉES par la feuille (live) ; panne → repli sur js/sessions-data.js (capacité seule)", async () => {
  const cfg = { SESSIONS_SOURCE: "sheets", RESERVATIONS_API_URL: API };
  const data = { sessions: [{ id: SESSION, training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", capacity: 10 }] };
  const seen = {};
  S.reset();
  let r = await S.load({ env: { config: cfg, data, fetch: (url, init) => { seen.url = url; seen.init = init; return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: "ok", sessions: [{ id: SESSION, training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", capacity: 10, seatsLeft: 7, status: "open", closesAt: "2026-10-16T10:00" }] }) }); } } });
  assert.equal(seen.url, API + "?action=sessions"); assert.equal(seen.init.credentials, "omit");
  assert.equal(r.source, "sheets"); assert.equal(r.sessions[0].live, true); assert.equal(r.sessions[0].seatsLeft, 7); assert.equal(r.sessions[0].closesAt, "2026-10-16T10:00");
  S.reset();
  r = await S.load({ env: { config: cfg, data, fetch: () => Promise.reject(new Error("panne")) } });
  assert.equal(r.source, "data"); assert.equal(r.sessions[0].live, false); assert.equal(r.sessions[0].seatsLeft, null);
  S.reset();
  r = await S.load({ env: { config: { SESSIONS_SOURCE: "sheets", RESERVATIONS_API_URL: "" }, data, fetch: () => { throw new Error("ne doit pas être appelé"); } } });
  assert.equal(r.source, "data", "adresse vide : fichier, sans appel réseau");
  S.reset();
  r = await S.load({ env: { config: cfg, data, fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: "ok", sessions: [{ id: "x", training: "nacelle", date: "2026-02-31", capacity: 10 }] }) }) } });
  assert.equal(r.sessions.length, 0, "session invalide envoyée par la feuille : ignorée"); assert.equal(r.rejected.length, 1);
  S.reset();
});

test("sessions.js : fin des inscriptions, complète, fermée → plus réservable (heure de Bruxelles)", () => {
  const base = S.normalize({ id: SESSION, training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", capacity: 10, seatsLeft: 3, closesAt: "2026-10-16T10:00", live: true });
  assert.equal(S.isBookable(base, new Date("2026-10-16T07:59:00Z")), true, "jeudi… vendredi 9 h 59 à Bruxelles : encore ouverte");
  assert.equal(S.isBookable(base, new Date("2026-10-16T08:00:00Z")), false, "vendredi 10 h à Bruxelles : clôturée");
  assert.equal(S.stateOf(base, new Date("2026-10-16T08:00:00Z")), "closed");
  assert.equal(S.stateOf(S.normalize(Object.assign({}, { id: "a-b-c", training: "nacelle", date: "2026-10-18", capacity: 10, seatsLeft: 0 })), new Date(NOW)), "full");
  assert.equal(S.stateOf(S.normalize({ id: "a-b-c", training: "nacelle", date: "2026-10-18", capacity: 10, status: "closed" }), new Date(NOW)), "closed");
  assert.deepEqual(S.validate({ id: "a-b-c", training: "nacelle", date: "2026-10-18", closesAt: "demain" }), ["closesAt : AAAA-MM-JJTHH:MM"]);
});

/* ------------------------------------------------------------------ parcours complet (le scénario du brief) */
test("PARCOURS COMPLET : le site affiche 10 sur 10 → 9 → 8 → une entreprise prend 4 → 4 → … → « Complet » ; jamais de 11e place", async () => {
  const G = sheetGas();
  const site = (url, init) => {
    const isPost = init && init.method === "POST";
    const out = isPost ? G.post(JSON.parse(init.body)) : G.get({ action: new URL(url).searchParams.get("action") });
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
  };
  const cfg = { SESSIONS_SOURCE: "sheets", RESERVATIONS_API_URL: API };
  const UI = require("../js/sessions-ui.js");
  const t = (k, fb) => fb;
  const shown = async () => { S.reset(); const r = await S.load({ env: { config: cfg, data: { sessions: [] }, fetch: site } }); return UI.seatsText(S, r.sessions[0], t, new Date(NOW)); };
  const book = (n) => R.book({ config: cfg, fetch: site, order: { requestId: R.newRequestId(), lang: "fr", customer: { firstName: "A", lastName: "B", email: "p" + (++seq) + "@exemple.be", phone: "0470" }, billing: { address: "Rue 1", zip: "1070", city: "Anderlecht", country: "BE" }, items: [{ training: "nacelle", sessionId: SESSION, quantity: n, participants: null }] } });
  assert.equal(await shown(), "10 places disponibles sur 10");
  assert.equal((await book(1)).kind, "ok"); assert.equal(await shown(), "9 places disponibles sur 10");
  assert.equal((await book(1)).kind, "ok"); assert.equal(await shown(), "8 places disponibles sur 10");
  assert.equal((await book(4)).kind, "ok"); assert.equal(await shown(), "4 places disponibles sur 10");
  assert.deepEqual(await book(5), { kind: "seats", problems: [{ sessionId: SESSION, reason: "insufficient", remaining: 4 }] });
  assert.equal((await book(3)).kind, "ok"); assert.equal(await shown(), "1 place disponible sur 10");
  assert.equal((await book(1)).kind, "ok"); assert.equal(await shown(), "Complet");
  assert.equal((await book(1)).problems[0].reason, "full");
  S.reset();
});

/* ------------------------------------------------------------------ pages et données */
test("pages : scripts chargés dans le bon ordre ; bloc « Prochaines sessions » sur la page Nacelles ; session du 18/10 dans le fichier de secours", () => {
  const nac = read("formation-nacelles-elevatrices.html");
  assert.match(nac, /<section class="wss-section" id="sessions" data-sessions-for="nacelle" aria-labelledby="nac-sess-t" hidden>/);
  assert.match(nac, /<script defer src="js\/supabase-config\.js"><\/script>\n<script defer src="js\/sessions-data\.js"><\/script>\n<script defer src="js\/sessions\.js"><\/script>\n<script defer src="js\/sessions-ui\.js"><\/script>/);
  const ins = read("inscription.html");
  assert.match(ins, /<script src="js\/sessions\.js"><\/script>\n<script src="js\/sessions-ui\.js"><\/script>\n<script src="js\/reservations\.js"><\/script>\n[\s\S]*<script src="js\/registration\.js"><\/script>/);
  ["agenda.html", "inscription.html", "formation-nacelles-elevatrices.html", "formation-vca-base.html"].forEach((f) => assert.match(read(f), /<script src="js\/i18n-data-sessions\.js"><\/script>/, f));
  const ctx = { window: {} }; vm.runInNewContext(read("js/sessions-data.js"), ctx);
  assert.deepEqual(plain(ctx.window.WISY_SESSIONS.sessions), [{ id: SESSION, training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", capacity: 10 }],
    "secours : capacité seule, jamais des places restantes saisies à la main");
  assert.doesNotMatch(read("js/sessions-data.js"), /seatsLeft/, "aucun compteur de places dans le fichier (ni dans les données, ni dans le modèle)");
  assert.match(read("google-sheets/reservations.gs"), /\{ training: "nacelle", date: "2026-10-18", start: "10:00", end: "18:00", capacity: 10 \}/, "même session dans la feuille");
});

test("sessions.js : fetch du navigateur rattaché à window (sinon « Illegal invocation » et repli silencieux sur le fichier)", async () => {
  const src = read("js/sessions.js");
  assert.match(src, /root\.fetch\.bind\(root\)/);
  /* Simulation : un fetch qui exige d'être appelé avec `this === window`, comme dans un navigateur. */
  const win = { WISY_CONFIG: { SESSIONS_SOURCE: "sheets", RESERVATIONS_API_URL: API }, WISY_SESSIONS: { sessions: [] } };
  win.fetch = function (url) {
    if (this !== win) return Promise.reject(new TypeError("Illegal invocation"));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: "ok", sessions: [{ id: SESSION, training: "nacelle", date: "2026-10-18", capacity: 10, seatsLeft: 10, status: "open" }] }) });
  };
  const ctx = { self: win, setTimeout, clearTimeout, Intl, Date, Promise };
  vm.runInNewContext(read("js/sessions.js"), ctx);
  const r = await win.WisySessions.load();
  assert.equal(r.source, "sheets", "la feuille est bien lue dans un vrai navigateur");
});

/* ------------------------------------------------------------------ comportements de la VRAIE feuille Google (15/10/2026) */
test("dimensions de Google : installation sur une feuille de 1 000 lignes, puis la feuille s'agrandit au-delà (jamais « hors des dimensions »)", () => {
  const G = sheetGas({ maxRows: 40 });                          // petite feuille : mêmes règles que les 1 000 lignes de Google
  assert.equal(G.sheet("Sessions").getMaxRows(), 40);
  for (let i = 0; i < 45; i++) {
    const r = G.post(order(0, { customer: { firstName: "A", lastName: "B", email: "grand" + i + "@exemple.be", phone: "1" },
      items: [{ training: "vca-base", sessionId: null, quantity: 1, participants: null }] }));
    assert.equal(r.status, "ok", "demande " + i);
  }
  assert.equal(bookings(G).length, 45);
  assert.ok(G.sheet("Réservations").getMaxRows() > 45, "lignes ajoutées automatiquement");
  G.ctx.installer();                                             // réparer / réinstaller après agrandissement : sans erreur
});

test("heure gardée avec son apostrophe par Google (« '10:00 ») : la session reste valide et affichée", () => {
  const G = sheetGas();
  const sh = G.sheet("Sessions"), head = sh.grid[0];
  sh.grid[1][head.indexOf("Début")] = "'10:00"; sh.grid[1][head.indexOf("Fin")] = "'18:00";   // écrit directement, apostrophe comprise
  G.ctx.clearCache_();
  const s = session(G);
  assert.ok(s, "toujours publiée");
  assert.equal(s.startTime, "10:00"); assert.equal(s.endTime, "18:00");
});

test("diagnostic à distance (?action=health) : onglets, tâche automatique, nombre de sessions et raisons — sans aucune donnée personnelle", () => {
  const fresh = loadGas("google-sheets/reservations.gs", { now: NOW });
  let h = fresh.get({ action: "health" });
  assert.equal(h.version, "1.0.1"); assert.equal(h.tabs.Sessions, false, "feuille pas encore installée");
  assert.equal(h.sessions.rows, 0); assert.equal(h.automaticTask, false);
  const G = sheetGas();
  G.post(order(2));
  edit(G, 2, "capacity", "dix");
  h = G.get({ action: "health" });
  assert.deepEqual(plain(h.tabs), { Formations: true, Sessions: true, "Réservations": true, Participants: true, "Écarts Outlook": true, "File d'envoi": true, Journal: true });
  assert.equal(h.automaticTask, true);
  assert.deepEqual(plain(h.sessions), { rows: 1, valid: 0, published: 0, upcoming: 0, problems: { "places (total) : nombre entier de 1 à 500": 1 } });
  assert.doesNotMatch(JSON.stringify(h), /Dupont|exemple\.be|0470|Nacelles|2026-10-18/, "aucun nom, e-mail, ni session non publiée");
});
