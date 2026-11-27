"use strict";
/* Planning des sessions et inscription sans paiement en ligne (demande de Wisy Safety du 27/11/2026).

   • Feuille Google (google-sheets/reservations.gs, exécuté sur une FAUSSE feuille — tests/helpers/gas-fake.js) :
     menu « 📅 Ouvrir les sessions du planning… » → une session par formation et par jour du planning
     (lundi : Nacelles + CP3 · mardi, jeudi : BA4 · mercredi, dimanche : VCA Base · vendredi : Diisocyanates + CP3 ·
     samedi : Nacelles), du 28/11/2026 au 31/03/2027, 5 places, sans horaire, publiées ; jamais de doublon.
   • BA4 : formation réservable (5 places, la 6e est refusée).
   • Inscription : plus aucun moyen de paiement (Stripe / Mollie / PayPal), plus de « Sur devis » : « Paiement le jour
     de la formation », dans les 10 langues. E-mails : paiement sur place, horaire à confirmer.
   • Plus d'adresse de facturation à l'étape 3 (décision du 27/11/2026) : le script 1.2.1 l'accepte absente, et
     encore présente (anciennes versions du site).
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadGas } = require("./helpers/gas-fake.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const plain = (x) => JSON.parse(JSON.stringify(x));
const NOW = "2026-11-27T16:00:00Z";            // vendredi 27/11/2026, 17 h à Bruxelles (la veille du début du planning)

function sheetGas(opts) {
  const G = loadGas("google-sheets/reservations.gs", Object.assign({ now: NOW, answers: [] }, opts || {}));
  G.ctx.installer();
  G.alerts.length = 0;
  return G;
}
const sessions = (G) => G.sheet("Sessions").records();
const byTraining = (rows) => rows.reduce((o, r) => { o[r["Formation"]] = (o[r["Formation"]] || 0) + 1; return o; }, {});

/* ------------------------------------------------------------------ planning */
test("planning : le bon jour pour chaque formation (lundi → dimanche)", () => {
  const G = sheetGas();
  const week = (from, to) => plain(G.ctx.planDates_(from, to, G.ctx.PLANNING.WEEK)).map((p) => p.date + " " + p.training);
  assert.deepEqual(week("2026-11-30", "2026-12-06"), [
    "2026-11-30 nacelle", "2026-11-30 conseiller-prevention",            // lundi
    "2026-12-01 ba4",                                                    // mardi
    "2026-12-02 vca-base",                                               // mercredi
    "2026-12-03 ba4",                                                    // jeudi
    "2026-12-04 diisocyanates", "2026-12-04 conseiller-prevention",      // vendredi
    "2026-12-05 nacelle",                                                // samedi
    "2026-12-06 vca-base"                                                // dimanche
  ]);
  assert.equal(G.ctx.PLANNING.FROM, "2026-11-28");
  assert.equal(G.ctx.PLANNING.TO, "2027-03-31");
  assert.equal(G.ctx.PLANNING.CAPACITY, 5, "5 personnes maximum par session");
  assert.deepEqual(week("2027-03-28", "2027-03-28"), ["2027-03-28 vca-base"], "passage à l'heure d'été (28/03/2027) : bon jour");
});

test("menu « Ouvrir les sessions du planning » : 159 sessions du 28/11/2026 au 31/03/2027, 5 places, sans horaire, publiées", () => {
  const G = sheetGas();
  const res = plain(G.ctx.ouvrirLePlanning());
  assert.equal(res.created, 159);
  assert.equal(res.first, "2026-11-28"); assert.equal(res.last, "2027-03-31");
  const rows = sessions(G);
  assert.equal(rows.length, 159);
  assert.deepEqual(byTraining(rows), {
    "Nacelles élévatrices": 36, "VCA Base": 36, "Conseiller en prévention niveau III": 35,
    "BA4 — Personne avertie": 35, "Diisocyanates & substances dangereuses": 17
  });
  rows.forEach((r) => {
    assert.equal(r["Places (total)"], 5); assert.equal(r["Restantes"], 5); assert.equal(r["Réservées"], 0);
    assert.equal(r["Début"], ""); assert.equal(r["Fin"], "");
    assert.equal(r["Statut"], "Ouverte"); assert.equal(r["Publiée sur le site"], true);
    assert.match(r["Identifiant"], /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/);
  });
  assert.equal(rows[0]["Identifiant"], "2026-11-28-nacelle", "samedi 28/11 : Nacelles");
  assert.match(G.alerts[G.alerts.length - 1], /159 session\(s\) créée\(s\)/);
  /* Ce que le site reçoit : les 159 sessions, sans horaire, 5 places chacune. */
  const pub = plain(G.get());
  assert.equal(pub.sessions.length, 159, "toutes publiées (limite de la liste publique relevée à 400)");
  assert.ok(pub.sessions.every((s) => s.capacity === 5 && s.seatsLeft === 5 && s.startTime === null));
  assert.equal(pub.sessions.find((s) => s.id === "2026-12-01-ba4").status, "open");
  assert.equal(pub.sessions.find((s) => s.id === "2026-11-28-nacelle").status, "closed", "règle des 48 h : le 28/11 n'est plus réservable le 27 au soir");
});

test("planning relancé : aucun doublon ; une session annulée n'est jamais recréée ; dates passées ignorées", () => {
  const G = sheetGas();
  G.ctx.openPlanning_("2026-11-28", "2027-03-31", 5);
  const t = G.ctx.table_("Sessions");
  const line = sessions(G).findIndex((r) => r["Identifiant"] === "2026-12-01-ba4") + 2;
  G.ctx.setCell_(t, line, "status", "Annulée");
  const again = plain(G.ctx.openPlanning_("2026-11-28", "2027-03-31", 5));
  assert.equal(again.created, 0); assert.equal(again.existing, 159);
  assert.equal(sessions(G).length, 159);
  const later = sheetGas({ now: "2027-03-20T10:00:00Z" });
  const r = plain(later.ctx.openPlanning_("2026-11-28", "2027-03-31", 5));
  assert.ok(r.past > 140, "les dates passées ne sont pas créées");
  assert.equal(r.first, "2027-03-20");
});

test("planning : une autre période se tape dans la fenêtre (« 01/04/2027 30/06/2027 ») ; période illisible → message, rien créé", () => {
  const answers = [];                                             // réponses de la fenêtre (après l'installation, qui en consomme une)
  const G = sheetGas({ answers });
  answers.push("du 01/04/2027 au 30/04/2027");
  const res = plain(G.ctx.ouvrirLePlanning());
  assert.equal(res.first, "2027-04-01"); assert.equal(res.last, "2027-04-30");
  assert.ok(res.created > 30 && res.created < 45, String(res.created));
  const answers2 = [];
  const H = sheetGas({ answers: answers2 });
  answers2.push("31/02/2027 30/06/2027");
  assert.equal(H.ctx.ouvrirLePlanning(), null);
  assert.match(H.alerts[H.alerts.length - 1], /Période illisible/);
  assert.equal(sessions(H).length, 0);
});

test("feuille déjà utilisée : les sessions s'écrivent juste sous la dernière session, pas sous les 1 000 cases à cocher vides", () => {
  const G = sheetGas({ now: "2026-10-15T08:00:00Z" });          // l'installation crée la session Nacelles du 18/10 (ligne 2)
  const t = G.ctx.table_("Sessions");
  const pubCol = t.col.published + 1;
  for (let r = 3; r <= 1000; r++) G.sheet("Sessions").getRange(r, pubCol).setValue(false);   // cases décochées (comme dans la vraie feuille)
  assert.equal(G.sheet("Sessions").getLastRow(), 1000, "Google compte les cases décochées comme remplies");
  G.ctx.openPlanning_("2026-11-28", "2026-11-30", 5);
  const grid = G.sheet("Sessions").grid;
  assert.equal(grid[2][t.col.id], "2026-11-28-nacelle", "1re session du planning en ligne 3");
  assert.equal(grid[1][t.col.id], "2026-10-18-nacelle", "la session existante est intacte");
  const h = plain(G.get({ action: "health" }));
  assert.equal(h.version, "1.2.1"); assert.ok(h.features.includes("planning"));
  assert.deepEqual(h.sessions.problems, {}, "les lignes de cases vides ne sont plus signalées comme sessions incomplètes");
});

/* ------------------------------------------------------------------ BA4 + 5 places + e-mails */
test("BA4 : formation réservable ; 5 places → la 6e personne est refusée ; e-mails « paiement sur place » et « horaire à confirmer »", () => {
  const G = sheetGas();
  G.ctx.openPlanning_("2026-11-28", "2026-12-31", 5);
  let seq = 0;
  const book = (quantity) => G.post({
    action: "book", requestId: "plan-request-" + String(++seq).padStart(6, "0"), lang: "fr",
    customer: { firstName: "Marie", lastName: "Dupont", email: "client" + seq + "@exemple.be", phone: "0470 00 00 00" },
    billing: { company: "", vat: "", address: "Rue de l'Exemple 1", zip: "1070", city: "Anderlecht", country: "BE" },
    items: [{ training: "ba4", sessionId: "2026-12-01-ba4", quantity, participants: [] }]
  });
  let r = book(3);
  assert.equal(r.status, "ok", JSON.stringify(r));
  const client = G.mails.find((m) => m.to === "client1@exemple.be");
  assert.match(client.htmlBody, /BA4 — Personne avertie/);
  assert.match(client.htmlBody, /mardi 1 décembre 2026, horaire à confirmer/);
  assert.match(client.htmlBody, /Paiement :<\/b> sur place, le jour de la formation/);
  assert.match(client.htmlBody, /horaire de la session vous sera confirmé/);
  assert.doesNotMatch(client.htmlBody, /facture/i, "plus de « l'équipe vous envoie la facture »");
  const team = G.mails.find((m) => m.to === "info@wisysafety.be");
  assert.ok(team, "chaque réservation arrive dans info@wisysafety.be");
  assert.match(team.htmlBody, /2 place\(s\) restante\(s\) sur 5/);
  r = book(3);
  assert.equal(r.status, "unavailable");
  assert.deepEqual(plain(r.problems), [{ sessionId: "2026-12-01-ba4", reason: "insufficient", remaining: 2 }]);
  r = book(2); assert.equal(r.status, "ok");
  assert.equal(plain(G.get()).sessions.find((s) => s.id === "2026-12-01-ba4").status, "full", "5/5 : complète");
});

/* ------------------------------------------------------------------ inscription : aucun moyen de paiement */
test("inscription : plus aucun moyen de paiement en ligne (Stripe, Mollie, PayPal, « Procéder au paiement »)", () => {
  const html = read("inscription.html"), css = read("css/registration.css"), js = read("js/registration.js");
  assert.doesNotMatch(html, /Stripe|Mollie|PayPal|reg-provider-tag|Procéder au paiement|reg\.pay_action|reg\.step_payment/);
  assert.doesNotMatch(css, /reg-provider-tag/);
  assert.match(html, /data-i18n="sess\.book_action" data-step4="action">Confirmer ma réservation</);
  assert.equal((html.match(/data-step4="label"/g) || []).length, 3, "parcours, étapes et titre de l'étape 4 : « Réservation »");
  assert.doesNotMatch(js, /reg\.on_quote|reg\.cta_pay|Aller au paiement|Paiement sécurisé|createSession/);
  assert.match(js, /function grandTotalLabel\(totals\) \{\s*if \(totals\.subtotalCents > 0\) return money\(totals\.totalCents\);\s*return onSiteTotalLabel\(\);/);
  const cfg = read("js/registration-data.js");
  assert.match(cfg, /payment: \{\s*provider: null,\s*ready: false,\s*onSite: true/);
});

test("inscription : « Paiement le jour de la formation » (jamais « Sur devis ») et horaire « à confirmer », dans les 10 langues", () => {
  globalThis.window = {};
  require("../js/i18n-data-inscription.js"); require("../js/i18n-data-sessions.js"); require("../js/i18n-data-common.js");
  const I = globalThis.window.I18N;
  delete globalThis.window;
  assert.equal(I.fr["reg.pay_onsite"], "Paiement le jour de la formation");
  assert.equal(I.fr["reg.pay_onsite_total"], "Sur place, le jour de la formation");
  assert.equal(I.fr["sess.time_tbc"], "Horaire à confirmer");
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    ["reg.pay_onsite", "reg.pay_onsite_total", "reg.pay_onsite_note", "reg.settlement", "reg.cta_review", "sess.time_tbc", "dd.ba4", "dd.ba4_full"]
      .forEach((k) => assert.ok(I[l][k], l + " · " + k));
    ["reg.on_quote", "reg.quote_note", "reg.pay_action", "reg.step_payment", "reg.vat_tbd", "sess.all_day"].forEach((k) => assert.equal(I[l][k], undefined, l + " · " + k + " retiré"));
    assert.doesNotMatch(I[l]["sess.book_desc"], /factur|invoice|Rechnung|factuur|faktuur|factur|fattura|фактур|فاتورة|račun/i, l + " : plus de facture annoncée");
  });
});

test("catalogue d'inscription : BA4 ajoutée (sans photo ni prix inventés), 9 entrées", () => {
  globalThis.window = { WisyTrainings: require("../js/trainings-data.js") };
  delete require.cache[require.resolve("../js/registration-data.js")];
  require("../js/registration-data.js");
  const Reg = globalThis.window.WisyRegistrationData;
  delete globalThis.window;
  const ba4 = Reg.getTraining("ba4");
  assert.ok(ba4);
  assert.equal(ba4.priceCents, null); assert.equal(ba4.image, null); assert.equal(ba4.code, "BA4");
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => { assert.ok(ba4.name[l], l); assert.ok(ba4.description[l], l); });
  assert.equal(Reg.getCatalogue().length, 9);
});

/* ------------------------------------------------------------------ étape 3 : plus d'adresse de facturation */
test("feuille 1.2.1 : une réservation SANS adresse de facturation est acceptée ; avec adresse (ancien site), toujours acceptée", () => {
  const G = sheetGas();
  G.ctx.openPlanning_("2026-11-30", "2026-11-30", 5);
  const order = (n, billing) => Object.assign({
    action: "book", requestId: "bill-request-" + String(n).padStart(6, "0"), lang: "fr",
    customer: { firstName: "Marie", lastName: "Dupont", email: "client" + n + "@exemple.be", phone: "0470 00 00 00" },
    items: [{ training: "nacelle", sessionId: "2026-11-30-nacelle", quantity: 1, participants: null }]
  }, billing ? { billing } : {});
  let r = G.post(order(1));
  assert.equal(r.status, "ok", JSON.stringify(r));
  const team = G.mails.filter((m) => m.to === "info@wisysafety.be").pop();
  assert.doesNotMatch(team.htmlBody, /Particulier|, ,/, "aucune ligne de facturation vide dans l'avis à l'équipe");
  r = G.post(order(2, { company: "Chantiers Dupont", vat: "", address: "Rue de l'Exemple 1", zip: "1070", city: "Anderlecht", country: "BE" }));
  assert.equal(r.status, "ok", JSON.stringify(r));
  assert.match(G.mails.filter((m) => m.to === "info@wisysafety.be").pop().htmlBody, /Chantiers Dupont<br>Rue de l&#39;Exemple 1, 1070 Anderlecht, BE|Chantiers Dupont<br>Rue de l'Exemple 1, 1070 Anderlecht, BE/);
  const rows = G.sheet("Réservations").records();
  assert.equal(rows.length, 2);
  assert.equal(rows[0]["Adresse de facturation"], "", "rien d'inventé quand le client n'a rien donné");
  assert.equal(rows[1]["Adresse de facturation"], "Rue de l'Exemple 1, 1070 Anderlecht, BE");
});

test("inscription : l'étape 3 ne demande plus d'adresse de facturation (page, moteur, 10 langues, FAQ, confidentialité)", () => {
  const html = read("inscription.html"), js = read("js/registration.js");
  assert.doesNotMatch(html, /reg-bill-|reg\.bill_|reg\.f_(company|vat|address|zip|city|country)|reg\.country_/);
  assert.doesNotMatch(js, /reg-bill-|state\.billing|billing:/, "le site n'envoie plus d'adresse de facturation");
  const step3 = html.slice(html.indexOf('data-step="3"'), html.indexOf('data-step="4"'));
  ["reg-cust-firstname", "reg-cust-lastname", "reg-cust-email", "reg-cust-phone", 'id="reg-consent"'].forEach((id) => assert.ok(step3.includes(id), id));
  globalThis.window = {};
  ["../js/i18n-data-inscription.js", "../js/i18n-data-home.js", "../js/i18n-data-privacy.js"].forEach((f) => {
    delete require.cache[require.resolve(f)];   // déjà chargé par un test précédent avec un autre « window »
    require(f);
  });
  const I = globalThis.window.I18N;
  delete globalThis.window;
  const INVOICE = /factur|invoice|billing|Rechnung|faktuur|faktur|fattur|фактур|فاتور|račun/i;
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    ["reg.s3_title", "reg.s3_sub", "reg.consent", "home.step3_d", "pp.insc_data", "pp.k_reg"].forEach((k) => {
      assert.ok(I[l][k], l + " · " + k);
      assert.doesNotMatch(I[l][k], INVOICE, l + " · " + k + " : plus de facturation annoncée");
    });
    ["reg.bill_title", "reg.bill_sub", "reg.f_company", "reg.f_vat", "reg.f_address", "reg.f_zip", "reg.f_city", "reg.f_country", "reg.country_be"]
      .forEach((k) => assert.equal(I[l][k], undefined, l + " · " + k + " retiré"));
  });
  assert.equal(I.fr["reg.s3_title"], "Vos coordonnées");
  assert.doesNotMatch(read("js/faq-data.js"), /numéro de TVA et adresse/);
});
