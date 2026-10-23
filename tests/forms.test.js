"use strict";
/* Formulaires du site (contact / devis, WiSy Coordination, test d'éligibilité PEB) :
   - le script de la feuille Google (google-sheets/reservations.gs, action "contact"), exécuté sur une FAUSSE feuille
     (tests/helpers/gas-fake.js) : validation serveur, onglet « Demandes », anti-robots, anti-doublon, limites,
     e-mail à info@wisysafety.be avec « Répondre à » = le visiteur, accusé de réception, réessais ;
   - le client js/forms.js : réponses strictement normalisées, repli EmailJS, jamais de « envoyé » sans confirmation ;
   - les pages : chaque formulaire passe par js/forms.js, aucun identifiant EmailJS en double, aucune donnée en URL.
   `node --test tests/*.test.js` — aucune dépendance.

   Ce que ces tests NE prouvent PAS : la réception réelle dans la boîte info@wisysafety.be (voir
   docs/README-FORMULAIRES.md, « Vérifier en conditions réelles »). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadGas } = require("./helpers/gas-fake.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const F = require("../js/forms.js");
const NOW = "2026-10-23T08:00:00Z";
const plain = (x) => JSON.parse(JSON.stringify(x));

function sheetGas(opts) {
  const G = loadGas("google-sheets/reservations.gs", Object.assign({ now: NOW, answers: [] }, opts || {}));
  G.ctx.installer();
  G.alerts.length = 0;
  G.mails.length = 0;
  return G;
}
let seq = 0;
function demand(extra) {
  seq++;
  return Object.assign({
    action: "contact", form: "contact", requestId: "f-test-" + String(seq).padStart(8, "0"), lang: "fr", page: "/contact.html",
    elapsed: 15000, website: "", consent: true, name: "Marie Dupont", email: "marie" + seq + "@exemple.be", phone: "+32 470 00 00 00",
    company: "Chantiers Dupont", subject: "devis", message: "Bonjour,\nNous souhaitons former 8 personnes au VCA.\nMerci", details: []
  }, extra || {});
}
const requests = (G) => G.sheet("Demandes").records();
const outbox = (G) => G.sheet("File d'envoi").records();

/* ------------------------------------------------------------------ serveur : chemin nominal */
test("demande de devis : enregistrée (WSC-AAAA-XXXXX), e-mail à info@ avec « Répondre à » = visiteur, accusé de réception sans le message", () => {
  const G = sheetGas();
  const d = demand();
  const r = G.post(d);
  assert.equal(r.status, "ok"); assert.match(r.reference, /^WSC-2026-[A-Z2-9]{5}$/); assert.equal(r.notified, true);
  const rows = requests(G);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Référence"], r.reference); assert.equal(rows[0]["Formulaire"], "Contact"); assert.equal(rows[0]["Sujet"], "Demande de devis");
  assert.equal(rows[0]["Nom"], "Marie Dupont"); assert.equal(rows[0]["E-mail"], d.email); assert.equal(rows[0]["Statut"], "Nouvelle");
  assert.equal(rows[0]["Message"], "Bonjour,\nNous souhaitons former 8 personnes au VCA.\nMerci", "retours à la ligne gardés");
  assert.equal(rows[0]["E-mail à l'équipe"], "Envoyé");
  assert.ok(rows[0]["Reçue le"] instanceof Date || typeof rows[0]["Reçue le"] === "object");

  assert.equal(G.mails.length, 2);
  const team = G.mails.find((m) => m.to === "info@wisysafety.be"), ack = G.mails.find((m) => m.to === d.email);
  assert.ok(team && ack, "un e-mail à l'équipe, un accusé au visiteur");
  assert.equal(team.replyTo, d.email, "« Répondre » écrit directement au visiteur");
  assert.equal(team.subject, "[Site] Demande de devis — Marie Dupont (" + r.reference + ")");
  assert.match(team.htmlBody, /former 8 personnes/); assert.match(team.htmlBody, /\+32 470 00 00 00/); assert.match(team.htmlBody, /Chantiers Dupont/);
  assert.match(team.htmlBody, /https:\/\/wisysafety\.be\/contact\.html/, "lien vers la page d'origine, domaine officiel");
  assert.equal(ack.replyTo, "info@wisysafety.be");
  assert.match(ack.subject, new RegExp("demande bien reçue \\(" + r.reference + "\\)"));
  assert.match(ack.htmlBody, new RegExp(r.reference)); assert.match(ack.htmlBody, /Demande de devis/);
  assert.doesNotMatch(ack.htmlBody, /former 8 personnes/, "le texte libre du visiteur n'est jamais renvoyé à l'adresse saisie");
  assert.equal(outbox(G).every((x) => x["Statut"] === "Envoyé"), true);
});

test("coordination et test PEB : sujet fixé par le serveur, détails structurés, message facultatif ; accusé en néerlandais", () => {
  const G = sheetGas();
  let r = G.post(demand({ form: "coordination", subject: "", message: "", details: [["Services souhaités", "Coordination Sécurité-Santé, Audit"], ["Phase du projet", "Conception"], ["Démarrage souhaité", ""]] }));
  assert.equal(r.status, "ok");
  r = G.post(demand({ form: "peb", subject: "", message: "", lang: "nl", details: [["Région", "Région wallonne"], ["Profil", "architecte"]] }));
  assert.equal(r.status, "ok");
  const rows = requests(G);
  assert.equal(rows[0]["Formulaire"], "Coordination"); assert.equal(rows[0]["Sujet"], "Coordination sécurité-santé (WiSy Coordination)");
  assert.equal(rows[0]["Détails"], "Services souhaités : Coordination Sécurité-Santé, Audit\nPhase du projet : Conception", "détail vide ignoré");
  assert.equal(rows[1]["Formulaire"], "Test PEB"); assert.equal(rows[1]["Sujet"], "Certification PEB — test d'éligibilité");
  const ackNl = G.mails.filter((m) => m.to !== "info@wisysafety.be").pop();
  assert.match(ackNl.subject, /aanvraag ontvangen/); assert.match(ackNl.htmlBody, /Beste Marie Dupont/);
});

/* ------------------------------------------------------------------ serveur : validation */
test("validation serveur : e-mail, nom, sujet hors liste, consentement, longueurs, téléphone → refus détaillé, RIEN d'écrit ni d'envoyé", () => {
  const G = sheetGas();
  const cases = [
    [{ email: "pas-un-email" }, "email", "invalid"], [{ email: "a@b" }, "email", "invalid"], [{ name: "" }, "name", "required"],
    [{ name: "12345" }, "name", "required"], [{ name: "M".repeat(121) }, "name", "too_long"], [{ subject: "pub" }, "subject", "invalid"],
    [{ consent: "true" }, "consent", "required"], [{ consent: false }, "consent", "required"], [{ message: "" }, "message", "required"],
    [{ message: "x".repeat(5001) }, "message", "too_long"], [{ phone: "appelez-moi" }, "phone", "invalid"], [{ company: "S".repeat(121) }, "company", "too_long"],
    [{ requestId: "court" }, "requestId", "invalid"], [{ details: [["a", "b", "c"]] }, "details", "invalid"], [{ details: [["x".repeat(61), "b"]] }, "details", "invalid"]
  ];
  cases.forEach(([extra, field, reason]) => {
    const r = G.post(demand(extra));
    assert.equal(r.status, "invalid", JSON.stringify(extra).slice(0, 60)); assert.equal(r.fields[field], reason, field + " : " + JSON.stringify(r.fields));
  });
  assert.deepEqual(plain(G.post(demand({ form: "newsletter" }))), { status: "invalid", fields: { form: "invalid" } });
  assert.equal(requests(G).length, 0); assert.equal(G.mails.length, 0);
  assert.equal(G.post({ action: "inconnue" }).status, "error");
  ["李雷", "Ольга Петрова", "José Núñez", "محمد"].forEach((name) => assert.equal(G.post(demand({ name })).status, "ok", "nom accepté : " + name));
});

test("anti-robots : champ piège ou envoi en moins de 2,5 s → réponse normale, rien d'enregistré, aucun e-mail ; message à liens → « Indésirable » sans e-mail", () => {
  const G = sheetGas();
  let r = G.post(demand({ website: "https://spam.example" }));
  assert.equal(r.status, "ok"); assert.match(r.reference, /^WSC-/);
  r = G.post(demand({ elapsed: 800 }));
  assert.equal(r.status, "ok");
  assert.equal(requests(G).length, 0); assert.equal(G.mails.length, 0);
  r = G.post(demand({ message: "Promo http://a.example http://b.example www.c.example https://d.example" }));
  assert.equal(r.status, "ok");
  assert.equal(requests(G)[0]["Statut"], "Indésirable"); assert.equal(G.mails.length, 0, "l'équipe n'est pas dérangée, la ligne reste vérifiable");
});

test("injections : HTML échappé dans l'e-mail, formule de tableur écrite comme texte, saut de ligne impossible dans l'objet", () => {
  let written = [];
  const G = sheetGas();
  const t = G.sheet("Demandes"), orig = t.getRange;
  t.getRange = function () { const rg = orig.apply(this, arguments), sv = rg.setValues; rg.setValues = (v) => { written = written.concat(v); return sv(v); }; return rg; };
  const r = G.post(demand({ name: "=HYPERLINK(\"http://x\";\"y\")", message: "<script>alert(1)</script><b>gras</b>", company: "A\r\nBcc: victime@exemple.be" }));
  assert.equal(r.status, "ok");
  const row = written.find((w) => w.some((x) => String(x).indexOf("HYPERLINK") >= 0));
  assert.ok(row.some((x) => x === "'=HYPERLINK(\"http://x\";\"y\")"), "apostrophe initiale : Google Sheets n'exécute pas la formule");
  const team = G.mails.find((m) => m.to === "info@wisysafety.be");
  assert.doesNotMatch(team.htmlBody, /<script>|<b>gras/); assert.match(team.htmlBody, /&lt;script&gt;/);
  assert.doesNotMatch(team.subject, /[\r\n]/); assert.match(team.htmlBody, /A Bcc: victime@exemple\.be/, "retour à la ligne neutralisé");
  const ack = G.mails.find((m) => m.to !== "info@wisysafety.be");
  assert.match(ack.htmlBody, /<p>Bonjour,<\/p>/, "nom suspect : salutation sans le nom");
});

/* ------------------------------------------------------------------ serveur : doublons, limites, pannes */
test("même clé de requête (nouvel essai après coupure) → même référence, une seule ligne, aucun second e-mail", () => {
  const G = sheetGas();
  const d = demand();
  const a = G.post(d), b = G.post(d);
  assert.equal(b.status, "ok"); assert.equal(b.reference, a.reference); assert.equal(b.duplicate, true);
  assert.equal(requests(G).length, 1); assert.equal(G.mails.length, 2);
});

test("limites : 5 demandes par adresse et par heure (compteurs séparés des réservations) ; verrou indisponible → « busy »", () => {
  const G = sheetGas();
  for (let i = 0; i < 5; i++) assert.equal(G.post(demand({ email: "meme@exemple.be" })).status, "ok");
  const r = G.post(demand({ email: "meme@exemple.be" }));
  assert.equal(r.status, "rate_limited"); assert.ok(r.retryAfter >= 60);
  assert.equal(requests(G).length, 5);
  assert.equal(G.post(demand()).status, "ok", "une autre adresse passe");
  const L = sheetGas({ lockFails: true });
  assert.equal(L.post(demand()).status, "busy");
  assert.equal(requests(L).length, 0);
});

test("e-mail en panne : la demande est QUAND MÊME enregistrée (ok, notified:false), l'e-mail reste en file avec son « Répondre à » et part au réessai", () => {
  let now = new Date(NOW);
  const G = loadGas("google-sheets/reservations.gs", { now: () => now, mailFails: true });
  G.ctx.installer();
  const d = demand();
  const r = G.post(d);
  assert.equal(r.status, "ok"); assert.equal(r.notified, false);
  assert.equal(requests(G)[0]["E-mail à l'équipe"], "En file (réessai automatique)");
  const q = outbox(G).filter((x) => x["Destinataire"] === "info@wisysafety.be");
  assert.equal(q.length, 1); assert.equal(q[0]["Statut"], "À envoyer"); assert.equal(q[0]["Répondre à"], d.email);
  /* Le service revient : la tâche automatique renvoie l'e-mail, avec le bon « Répondre à ». */
  G.ctx.MailApp.sendEmail = (o) => { G.mails.push(o); };
  now = new Date(now.getTime() + 6 * 60000);
  G.ctx.processOutbox_(20);
  const team = G.mails.find((m) => m.to === "info@wisysafety.be");
  assert.ok(team, "envoyé au réessai"); assert.equal(team.replyTo, d.email);
});

test("feuille installée avec la version 1.0 (sans onglet « Demandes » ni colonne « Répondre à ») : tout est ajouté au premier envoi", () => {
  const G = sheetGas();
  /* Simule l'ancienne feuille : onglet Demandes supprimé, colonne « Répondre à » retirée de la file d'envoi. */
  G.ss.deleteSheet(G.sheet("Demandes"));
  const ob = G.sheet("File d'envoi"), head = ob.getRange(1, 1, 1, ob.getLastColumn()).getValues()[0], col = head.indexOf("Répondre à") + 1;
  ob.getRange(1, col).setValue("");
  const d = demand();
  assert.equal(G.post(d).status, "ok");
  assert.equal(requests(G).length, 1);
  assert.equal(G.mails.find((m) => m.to === "info@wisysafety.be").replyTo, d.email);
});

test("santé (?action=health) : demandes et file d'envoi en COMPTES seulement ; anonymisation désactivée par défaut, puis active si une durée est fixée", () => {
  let now = new Date(NOW);
  const G = loadGas("google-sheets/reservations.gs", { now: () => now });
  G.ctx.installer();
  G.post(demand()); G.post(demand());
  const h = G.get({ action: "health" });
  assert.deepEqual(plain(h.requests), { total: 2, open: 2 });
  assert.equal(h.mail.outbox.sent, 4); assert.equal(h.mail.notify, true);
  assert.doesNotMatch(JSON.stringify(h), /Dupont|exemple\.be|470|WSC-/, "aucune donnée personnelle ni référence");
  now = new Date("2029-12-01T08:00:00Z");
  assert.equal(G.ctx.purgeOldRequests_(), 0, "0 mois = jamais d'anonymisation automatique");
  G.ctx.CONFIG.REQUEST_RETENTION_MONTHS = 36;
  assert.equal(G.ctx.purgeOldRequests_(), 2);
  const rows = requests(G);
  assert.ok(rows.every((x) => x["Statut"] === "Effacée" && !x["Nom"] && !x["E-mail"] && !x["Message"] && x["Référence"].startsWith("WSC-")));
  assert.equal(G.ctx.purgeOldRequests_(), 0, "déjà anonymisées");
});

/* ------------------------------------------------------------------ client js/forms.js */
const CFG = { RESERVATIONS_API_URL: "https://script.google.com/macros/s/AKfycbw4fV7ZDyLcEk0J41INJjwQ_41ASkyCSGx7_ZuVxU1U/exec",
  EMAILJS_PUBLIC_KEY: "pub", EMAILJS_SERVICE_ID: "service_x", EMAILJS_TEMPLATE_ID_CONTACT: "template_x" };
function fakeFetch(status, json, seen) {
  return (url, init) => { if (seen) seen.push({ url, init }); return Promise.resolve({ status, text: () => Promise.resolve(typeof json === "string" ? json : JSON.stringify(json)) }); };
}
function fakeEmailjs(behaviour, seen) {
  return { init: () => {}, send: (s, t, p) => { if (seen) seen.push({ s, t, p }); return behaviour === "fail" ? Promise.reject({ status: 412, text: "bad" }) : Promise.resolve({ status: 200, text: "OK" }); } };
}
const payload = (extra) => Object.assign({ form: "contact", requestId: "f-abcdefghijkmnopqrstuv", lang: "fr", page: "/contact.html", elapsed: 9000, consent: true,
  name: "Marie Dupont", email: "marie@exemple.be", phone: "", company: "", subject: "devis", message: "Bonjour", details: [] }, extra || {});

test("client : adresse du script (FORMS_API_URL, sinon celle des réservations), jamais une adresse arbitraire", () => {
  assert.equal(F.endpoint(CFG), CFG.RESERVATIONS_API_URL);
  assert.equal(F.endpoint({ RESERVATIONS_API_URL: CFG.RESERVATIONS_API_URL, FORMS_API_URL: "https://script.google.com/macros/s/AKfycbwOTHERxxxxxxxxxxxxxxxxxxxxxxx/exec" }),
    "https://script.google.com/macros/s/AKfycbwOTHERxxxxxxxxxxxxxxxxxxxxxxx/exec");
  ["https://evil.example/exec", "http://script.google.com/macros/s/AKfycbw4fV7ZDyLcEk0J41INJjwQ/exec", "", null].forEach((u) => assert.equal(F.endpoint({ RESERVATIONS_API_URL: u }), null, String(u)));
  assert.match(F.newRequestId(), /^f-[a-z2-9]{22}$/);
});

test("client : réponses du script normalisées STRICTEMENT", () => {
  assert.deepEqual(F.normalize({ status: "ok", reference: "WSC-2026-ABCDE", notified: true, extra: "<b>" }), { kind: "ok", channel: "sheet", reference: "WSC-2026-ABCDE", duplicate: false, notified: true });
  assert.equal(F.normalize({ status: "ok", reference: "<img onerror>" }).reference, null);
  assert.deepEqual(F.normalize({ status: "invalid", fields: { email: "invalid", __proto__x: "y", name: "required" } }), { kind: "invalid", fields: { email: "invalid", name: "required" } });
  assert.deepEqual(F.normalize({ status: "rate_limited", retryAfter: 1e9 }), { kind: "rate_limited", retryAfter: 86400 });
  assert.deepEqual(F.normalize({ status: "error" }), { kind: "unsupported" });
  assert.equal(F.normalize("<html>Connexion Google</html>"), null);
});

test("client : le script répond ok → résultat « sheet », corps POST text/plain sans donnée dans l'adresse, aucun EmailJS", async () => {
  const seen = [], ej = [];
  const r = await F.send({ config: CFG, fetch: fakeFetch(200, { status: "ok", reference: "WSC-2026-ABCDE", notified: true }, seen), emailjs: fakeEmailjs("ok", ej), payload: payload() });
  assert.equal(r.kind, "ok"); assert.equal(r.channel, "sheet"); assert.equal(r.reference, "WSC-2026-ABCDE");
  assert.equal(seen.length, 1); assert.equal(seen[0].url, CFG.RESERVATIONS_API_URL, "aucun paramètre dans l'adresse");
  assert.equal(seen[0].init.method, "POST"); assert.equal(seen[0].init.headers["Content-Type"], "text/plain;charset=utf-8");
  const body = JSON.parse(seen[0].init.body);
  assert.equal(body.action, "contact"); assert.equal(body.email, "marie@exemple.be"); assert.equal(body.consent, true);
  assert.equal(ej.length, 0);
});

test("client : réponses définitives (invalide, limite, occupé) → jamais de second canal", async () => {
  for (const [json, kind] of [[{ status: "invalid", fields: { email: "invalid" } }, "invalid"], [{ status: "rate_limited", retryAfter: 600 }, "rate_limited"], [{ status: "busy" }, "busy"]]) {
    const ej = [];
    const r = await F.send({ config: CFG, fetch: fakeFetch(200, json), emailjs: fakeEmailjs("ok", ej), payload: payload() });
    assert.equal(r.kind, kind); assert.equal(ej.length, 0, kind + " : pas d'EmailJS");
  }
});

test("client : script pas encore à jour (« error ») ou injoignable → secours EmailJS (gabarit contact, en français, référence WSW)", async () => {
  for (const f of [fakeFetch(200, { status: "error" }), fakeFetch(500, "panne"), () => Promise.reject(new TypeError("Failed to fetch")), fakeFetch(200, "<html>Google</html>")]) {
    const ej = [];
    const r = await F.send({ config: CFG, fetch: f, emailjs: fakeEmailjs("ok", ej), payload: payload({ form: "coordination", subject: "", company: "ACME", details: [["Phase du projet", "Conception"]] }) });
    assert.equal(r.kind, "ok"); assert.equal(r.channel, "email"); assert.match(r.reference, /^WSW-\d{4}-[A-Z2-9]{5}$/);
    assert.equal(ej.length, 1); assert.equal(ej[0].s, "service_x"); assert.equal(ej[0].t, "template_x");
    assert.equal(ej[0].p.user_email, "marie@exemple.be"); assert.match(ej[0].p.subject, /^Coordination sécurité-santé \(WiSy Coordination\) — WSW-/);
    assert.match(ej[0].p.message, /Société : ACME\nPhase du projet : Conception/); assert.match(ej[0].p.message, /Consentement RGPD : oui/);
  }
});

test("client : tout échoue → « unavailable » (jamais « ok ») ; sans script ni EmailJS → « not_configured »", async () => {
  let r = await F.send({ config: CFG, fetch: fakeFetch(200, { status: "error" }), emailjs: fakeEmailjs("fail"), payload: payload() });
  assert.equal(r.kind, "unavailable");
  r = await F.send({ config: CFG, fetch: () => Promise.reject(new Error("x")), emailjs: null, payload: payload() });
  assert.equal(r.kind, "unavailable");
  r = await F.send({ config: {}, fetch: fakeFetch(200, {}), emailjs: null, payload: payload() });
  assert.equal(r.kind, "not_configured");
  r = await F.send({ config: { EMAILJS_PUBLIC_KEY: "p", EMAILJS_SERVICE_ID: "s", EMAILJS_TEMPLATE_ID_CONTACT: "t" }, fetch: null, emailjs: fakeEmailjs("ok"), payload: payload() });
  assert.equal(r.kind, "ok"); assert.equal(r.channel, "email", "sans script configuré : EmailJS directement");
  r = await F.send({ config: CFG, fetch: fakeFetch(200, {}), payload: payload({ form: "inconnu" }) });
  assert.equal(r.kind, "invalid");
});

test("client : délai dépassé → la requête est interrompue et le secours prend le relais", async () => {
  let aborted = false;
  const hang = (url, init) => new Promise((res, rej) => { init.signal.addEventListener("abort", () => { aborted = true; rej(new Error("AbortError")); }); });
  const r = await F.send({ config: CFG, fetch: hang, emailjs: fakeEmailjs("ok"), payload: payload(), timeout: 50 });
  assert.equal(aborted, true); assert.equal(r.kind, "ok"); assert.equal(r.channel, "email");
});

test("client : lien e-mail de secours pré-rempli (sujet en français, corps borné)", () => {
  const href = F.mailtoHref(payload({ message: "x".repeat(5000), company: "ACME", phone: "0470" }));
  assert.match(href, /^mailto:info@wisysafety\.be\?subject=Demande%20de%20devis&body=/);
  assert.ok(decodeURIComponent(href.split("&body=")[1]).length <= 1600);
});

/* ------------------------------------------------------------------ pages */
test("pages : contact, coordination et PEB passent par js/forms.js ; identifiants EmailJS à UN seul endroit ; formulaires en POST", () => {
  [["contact.html", /WisyForms\.controller\(/], ["coordination.html", /js\/coordination\.js/], ["peb-wallonie-bruxelles.html", /js\/peb\.js/]].forEach(([f, re]) => {
    const html = read(f);
    assert.match(html, /<script src="js\/supabase-config\.js"><\/script>\s*<script src="js\/forms\.js"><\/script>/, f + " : config puis js/forms.js");
    assert.match(html, re, f);
    assert.doesNotMatch(html, /<form(?![^>]*method="post")[^>]*(?:wisy-contact-form|co-form|novalidate>\s*\n\s*<div class="peb-quiz)/, f + " : sans JavaScript, jamais de données dans l'adresse (GET)");
  });
  assert.match(read("js/coordination.js"), /WisyForms\.controller\(/);
  assert.match(read("js/peb.js"), /WisyForms\.controller\(/);
  const files = ["contact.html", "coordination.html", "peb-wallonie-bruxelles.html", "inscription.html", "js/coordination.js", "js/peb.js", "js/registration.js", "js/forms.js"];
  files.forEach((f) => assert.doesNotMatch(read(f), /k2JkXtD2RO8TkoO77|service_k348qw9|template_0p9dah6/, f + " : identifiants EmailJS seulement dans js/supabase-config.js"));
  assert.match(read("js/supabase-config.js"), /EMAILJS_TEMPLATE_ID_CONTACT: "template_0p9dah6"/);
});

test("contact : sujets à codes stables (= ceux du script), présélection ?subject=… (dont vca-entreprise), limites de longueur", () => {
  const html = read("contact.html");
  const codes = [...html.matchAll(/<option value="([a-z]+)" data-i18n="ct\.f_opt\d">/g)].map((m) => m[1]);
  assert.deepEqual(codes, Object.keys(F.SUBJECTS));
  const G = loadGas("google-sheets/reservations.gs", { now: NOW });
  assert.deepEqual(plain(Object.keys(G.ctx.CONTACT_FORMS.contact.subjects)), codes, "mêmes codes côté serveur");
  assert.match(html, /params\.get\("subject"\)/); assert.match(html, /wanted === "vca-entreprise"/);
  assert.match(html, /id="wf-message" name="message"[^>]*maxlength="5000"/); assert.match(html, /id="wf-email"[^>]*maxlength="160"/);
});

test("test PEB : case de consentement obligatoire avant tout envoi, traduite dans les 10 langues", () => {
  assert.match(read("peb-wallonie-bruxelles.html"), /<input type="checkbox" name="quiz-consent" required>/);
  const src = read("js/i18n-data-peb.js");
  assert.equal((src.match(/"peb\.quiz_consent_html":/g) || []).length, 10);
  assert.match(read("js/peb.js"), /consent: !!\(form\.querySelector\('\[name="quiz-consent"\]'\)/);
});
