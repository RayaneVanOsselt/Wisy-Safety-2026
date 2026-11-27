"use strict";
/* Planning des sessions et inscription sans paiement en ligne (demande de Wisy Safety du 27/11/2026).

   • Feuille Google (google-sheets/reservations.gs, exécuté sur une FAUSSE feuille — tests/helpers/gas-fake.js) :
     menu « 📅 Ouvrir les sessions du planning… » → une session par formation et par jour du planning
     (lundi : Nacelles · mardi, jeudi : BA4 · mercredi, dimanche : VCA Base · vendredi : Diisocyanates · samedi : Nacelles),
     du 28/11/2026 au 31/03/2027, 5 places, sans horaire, publiées ; jamais de doublon.
   • CP3 (décision du 27/11/2026, soir) : UN cycle de 7 jours par mois (lundis + vendredis, 1er lundi du mois) = UNE session
     de 5 places sur plusieurs jours (colonne « Jours de la formation ») ; menu « 🔁 Regrouper le CP3 en cycles » pour passer
     de l'ancien découpage (une session CP3 par lundi et par vendredi) aux 4 cycles.
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
    "2026-11-30 nacelle",                                                // lundi (CP3 : cycles)
    "2026-12-01 ba4",                                                    // mardi
    "2026-12-02 vca-base",                                               // mercredi
    "2026-12-03 ba4",                                                    // jeudi
    "2026-12-04 diisocyanates",                                          // vendredi (CP3 : cycles)
    "2026-12-05 nacelle",                                                // samedi
    "2026-12-06 vca-base"                                                // dimanche
  ]);
  assert.equal(G.ctx.PLANNING.FROM, "2026-11-28");
  assert.equal(G.ctx.PLANNING.TO, "2027-03-31");
  assert.equal(G.ctx.PLANNING.CAPACITY, 5, "5 personnes maximum par session");
  assert.deepEqual(week("2027-03-28", "2027-03-28"), ["2027-03-28 vca-base"], "passage à l'heure d'été (28/03/2027) : bon jour");
  /* CP3 : 4 cycles de 7 jours, lundis et vendredis en alternance, aucun jour férié, un par mois. */
  const cycles = plain(G.ctx.PLANNING.CYCLES);
  assert.deepEqual(cycles.map((c) => c.days[0]), ["2026-11-30", "2027-01-04", "2027-02-01", "2027-03-01"]);
  const HOLIDAYS = ["2026-12-25", "2027-01-01", "2027-03-28", "2027-03-29"];
  cycles.forEach((c) => {
    assert.equal(c.training, "conseiller-prevention");
    assert.equal(c.days.length, 7);
    c.days.forEach((d, i) => {
      assert.equal(new Date(d + "T12:00:00Z").getUTCDay(), i % 2 ? 5 : 1, d + " : lundi puis vendredi en alternance");
      assert.ok(!HOLIDAYS.includes(d), d + " n'est pas un jour férié");
      if (i) assert.ok(d > c.days[i - 1]);
    });
  });
});

test("menu « Ouvrir les sessions du planning » : 124 sessions d'un jour + 4 cycles CP3 de 7 jours, 5 places, sans horaire, publiées", () => {
  const G = sheetGas();
  const res = plain(G.ctx.ouvrirLePlanning());
  assert.equal(res.created, 128); assert.equal(res.cycles, 4); assert.equal(res.converted, 0);
  assert.equal(res.first, "2026-11-28"); assert.equal(res.last, "2027-03-31");
  const rows = sessions(G);
  assert.equal(rows.length, 128);
  assert.deepEqual(byTraining(rows), {
    "Nacelles élévatrices": 36, "VCA Base": 36, "Conseiller en prévention niveau III": 4,
    "BA4 — Personne avertie": 35, "Diisocyanates & substances dangereuses": 17
  });
  const cp3 = rows.filter((r) => r["Formation"] === "Conseiller en prévention niveau III");
  assert.deepEqual(cp3.map((r) => r["Identifiant"]), ["2026-11-30-conseiller-prevention", "2027-01-04-conseiller-prevention",
    "2027-02-01-conseiller-prevention", "2027-03-01-conseiller-prevention"]);
  assert.equal(cp3[0]["Jours de la formation"], "30/11/2026, 04/12/2026, 07/12/2026, 11/12/2026, 14/12/2026, 18/12/2026, 21/12/2026");
  rows.filter((r) => r["Formation"] !== "Conseiller en prévention niveau III").forEach((r) => assert.equal(r["Jours de la formation"], ""));
  rows.forEach((r) => {
    assert.equal(r["Places (total)"], 5); assert.equal(r["Restantes"], 5); assert.equal(r["Réservées"], 0);
    assert.equal(r["Début"], ""); assert.equal(r["Fin"], "");
    assert.equal(r["Statut"], "Ouverte"); assert.equal(r["Publiée sur le site"], true);
    assert.match(r["Identifiant"], /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/);
  });
  assert.equal(rows[0]["Identifiant"], "2026-11-28-nacelle", "samedi 28/11 : Nacelles");
  assert.match(G.alerts[G.alerts.length - 1], /128 session\(s\) créée\(s\)/);
  /* Ce que le site reçoit : les 128 sessions, sans horaire, 5 places chacune ; un cycle porte ses 7 jours. */
  const pub = plain(G.get());
  assert.equal(pub.sessions.length, 128, "toutes publiées (limite de la liste publique relevée à 400)");
  const c1 = pub.sessions.find((s) => s.id === "2026-11-30-conseiller-prevention");
  assert.deepEqual(c1.days, ["2026-11-30", "2026-12-04", "2026-12-07", "2026-12-11", "2026-12-14", "2026-12-18", "2026-12-21"]);
  assert.equal(c1.date, "2026-11-30"); assert.equal(c1.capacity, 5);
  assert.equal(pub.sessions.find((s) => s.id === "2026-12-01-ba4").days, null);
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
  assert.equal(again.created, 0); assert.equal(again.existing, 128); assert.equal(again.converted, 0);
  assert.equal(sessions(G).length, 128);
  const later = sheetGas({ now: "2027-03-20T10:00:00Z" });
  const r = plain(later.ctx.openPlanning_("2026-11-28", "2027-03-31", 5));
  assert.ok(r.past > 110, "les dates passées ne sont pas créées");
  assert.equal(r.first, "2027-03-20");
});

test("planning : une autre période se tape dans la fenêtre (« 01/04/2027 30/06/2027 ») ; période illisible → message, rien créé", () => {
  const answers = [];                                             // réponses de la fenêtre (après l'installation, qui en consomme une)
  const G = sheetGas({ answers });
  answers.push("du 01/04/2027 au 30/04/2027");
  const res = plain(G.ctx.ouvrirLePlanning());
  assert.equal(res.first, "2027-04-01"); assert.equal(res.last, "2027-04-30");
  assert.equal(res.created, 30, "avril 2027 : une session par jour, aucun cycle CP3 prévu (à ajouter dans PLANNING.CYCLES)");
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
  assert.equal(h.version, "1.3.0"); assert.ok(h.features.includes("planning")); assert.ok(h.features.includes("cycles"));
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

/* ------------------------------------------------------------------ CP3 : cycles de 7 jours (décision du 27/11/2026, soir) */
/* Feuille dans l'état du 27/11 après-midi : ancien planning (une session CP3 par lundi et par vendredi), 3 sessions CP3
   fériées déjà annulées, une réservation sur le CP3 du 04/12. */
function oldPlanningSheet() {
  const G = sheetGas();
  const P = G.ctx.PLANNING, week = P.WEEK, cycles = P.CYCLES;
  P.WEEK = Object.assign({}, week, { 1: ["nacelle", "conseiller-prevention"], 5: ["diisocyanates", "conseiller-prevention"] });
  P.CYCLES = [];
  assert.equal(plain(G.ctx.openPlanning_("2026-11-28", "2027-03-31", 5)).created, 159);
  P.WEEK = week; P.CYCLES = cycles;
  const t = G.ctx.table_("Sessions");
  ["2026-12-25-conseiller-prevention", "2027-01-01-conseiller-prevention", "2027-03-29-conseiller-prevention"].forEach((id) => {
    G.ctx.setCell_(t, sessions(G).findIndex((r) => r["Identifiant"] === id) + 2, "status", "Annulée");
  });
  const r = G.post({ action: "book", requestId: "cycle-request-000001", lang: "fr",
    customer: { firstName: "Marie", lastName: "Dupont", email: "deja@exemple.be", phone: "0470 00 00 00" },
    items: [{ training: "conseiller-prevention", sessionId: "2026-12-04-conseiller-prevention", quantity: 1, participants: null }] });
  assert.equal(r.status, "ok", JSON.stringify(r));
  return G;
}

test("menu « Regrouper le CP3 en cycles » : 27 sessions d'un jour annulées, 4 cycles (1er jour converti), la session réservée est gardée", () => {
  const G = oldPlanningSheet();
  const dry = plain(G.ctx.regroupCycles_(false));
  assert.equal(dry.cancel.length, 27, "35 CP3 − 4 premiers jours − 3 déjà annulées − 1 réservée");
  assert.equal(dry.keep.length, 1);
  assert.equal(sessions(G).filter((r) => r["Statut"] === "Annulée").length, 3, "le décompte ne modifie rien");
  const res = plain(G.ctx.regroupCycles_(true));
  assert.equal(res.planning.converted, 4); assert.equal(res.planning.cycles, 4); assert.equal(res.planning.created, 0);
  const rows = sessions(G), cp3 = rows.filter((r) => r["Formation"] === "Conseiller en prévention niveau III");
  assert.equal(cp3.filter((r) => r["Statut"] === "Annulée").length, 30);
  const open = cp3.filter((r) => r["Statut"] !== "Annulée");
  assert.deepEqual(open.map((r) => r["Identifiant"]), ["2026-11-30-conseiller-prevention", "2026-12-04-conseiller-prevention",
    "2027-01-04-conseiller-prevention", "2027-02-01-conseiller-prevention", "2027-03-01-conseiller-prevention"]);
  assert.equal(open[1]["Jours de la formation"], "", "la session déjà réservée reste une session d'un jour");
  assert.equal(open[2]["Jours de la formation"], "04/01/2027, 08/01/2027, 11/01/2027, 15/01/2027, 18/01/2027, 22/01/2027, 25/01/2027");
  /* Les autres formations ne bougent pas. */
  assert.equal(rows.filter((r) => r["Formation"] !== "Conseiller en prévention niveau III" && r["Statut"] === "Annulée").length, 0);
  /* Site : 4 cycles + la session réservée ; relancer ne change plus rien. */
  const pub = plain(G.get()).sessions.filter((s) => s.training === "conseiller-prevention");
  assert.deepEqual(pub.map((s) => (s.days ? s.days.length : 1)), [7, 1, 7, 7, 7]);
  const again = plain(G.ctx.regroupCycles_(false));
  assert.equal(again.cancel.length, 0, "relancer : plus rien à annuler");
  assert.equal(again.keep.length, 1, "la session réservée reste signalée");
  const h = plain(G.get({ action: "health" }));
  assert.deepEqual(h.sessions.problems, {});
  /* Menu : la fenêtre de confirmation liste les cycles ; « Non » ne fait rien. */
  const H = oldPlanningSheet();
  assert.equal(H.ctx.regrouperLesCycles(), null, "« Non » (pas de réponse OUI) : rien n'est fait");
  assert.match(H.alerts[H.alerts.length - 1], /30\/11\/2026 → 21\/12\/2026 : 30\/11, 04\/12, 07\/12, 11\/12, 14\/12, 18\/12, 21\/12/);
  assert.match(H.alerts[H.alerts.length - 1], /27 session\(s\) CP3 d'un seul jour seront ANNULÉES/);
  assert.equal(sessions(H).filter((r) => r["Statut"] === "Annulée").length, 3);
});

test("cycle CP3 : une inscription = les 7 jours ; 5 places ; e-mail avec toutes les dates ; visible jusqu'au dernier jour", () => {
  const G = sheetGas();
  G.ctx.openPlanning_("2026-11-28", "2027-03-31", 5);
  const book = (n, quantity) => G.post({ action: "book", requestId: "cycle-book-" + String(n).padStart(8, "0"), lang: "fr",
    customer: { firstName: "Marie", lastName: "Dupont", email: "cp3-" + n + "@exemple.be", phone: "0470 00 00 00" },
    items: [{ training: "conseiller-prevention", sessionId: "2027-01-04-conseiller-prevention", quantity, participants: null }] });
  assert.equal(book(1, 4).status, "ok");
  const mail = G.mails.find((m) => m.to === "cp3-1@exemple.be");
  assert.match(mail.htmlBody, /7 jours, du lundi 4 janvier 2027 au lundi 25 janvier 2027 \(04\/01, 08\/01, 11\/01, 15\/01, 18\/01, 22\/01, 25\/01\), horaire à confirmer/);
  assert.equal(book(2, 2).status, "unavailable", "5 places pour tout le cycle");
  assert.equal(plain(G.get()).sessions.find((s) => s.id === "2027-01-04-conseiller-prevention").seatsLeft, 1);
  /* Le 10/01 (cycle commencé) : toujours affiché jusqu'au 25/01, mais plus réservable ; disparu le 26/01. */
  const mid = sheetGas({ now: "2027-01-10T10:00:00Z" });
  mid.ctx.openPlanning_("2026-11-28", "2027-03-31", 5);
  /* (les cycles dont le 1er jour est passé ne sont pas créés : on simule un cycle déjà en cours) */
  const t = mid.ctx.table_("Sessions");
  mid.ctx.writeRowsAtFree_(t, [mid.ctx.rowFor_(t, { id: "2027-01-04-cp3-test", training: "Conseiller en prévention niveau III",
    date: mid.ctx.at_("2027-01-04", "12:00"), days: "04/01/2027, 08/01/2027, 11/01/2027, 15/01/2027, 18/01/2027, 22/01/2027, 25/01/2027",
    start: "", end: "", capacity: 5, status: "Ouverte", published: true })]);
  const s = plain(mid.get()).sessions.find((x) => x.id === "2027-01-04-cp3-test");
  assert.ok(s, "cycle en cours : encore affiché"); assert.equal(s.status, "closed");
  const after = plain(mid.ctx.sessionDays_("04/01/2027, 25/01/2027", "2027-01-04"));
  assert.deepEqual(after.days, ["2027-01-04", "2027-01-25"]);
});

test("colonne « Jours de la formation » : lecture tolérante, erreurs claires", () => {
  const G = sheetGas();
  const d = (v, first) => plain(G.ctx.sessionDays_(v, first));
  assert.deepEqual(d("", "2027-01-04"), { days: [], problem: null }, "vide = un seul jour");
  assert.deepEqual(d("08/01/2027; 04/01/2027\n11/01/2027", "2027-01-04").days, ["2027-01-04", "2027-01-08", "2027-01-11"], "triés, séparateurs variés");
  assert.deepEqual(d("11/01/2027", "2027-01-04").days, ["2027-01-04", "2027-01-11"], "la colonne Date est ajoutée si elle manque");
  assert.deepEqual(d("04/01/2027", "2027-01-04").days, [], "un seul jour");
  assert.match(d("04/01/2027, 31/02/2027", "2027-01-04").problem, /illisibles/);
  assert.match(d("lundi et vendredi", "2027-01-04").problem, /illisibles/);
  assert.match(d("01/01/2027, 08/01/2027", "2027-01-04").problem, /1er jour/);
});

test("durées : BA4 = 1 jour, CP3 = 7 jours dans l'onglet Formations (une durée saisie à la main n'est jamais écrasée)", () => {
  const G = sheetGas();
  const dur = (id) => G.sheet("Formations").records().find((r) => r["Identifiant"] === id)["Durée"];
  assert.equal(dur("ba4"), "1 jour");
  assert.equal(dur("conseiller-prevention"), "7 jours");
  const t = G.ctx.table_("Formations");
  G.ctx.setCell_(t, G.sheet("Formations").records().findIndex((r) => r["Identifiant"] === "ba4") + 2, "duration", "8 heures");
  G.ctx.ensureFormations_();
  assert.equal(dur("ba4"), "8 heures");
});

test("site : un cycle CP3 (7 jours) = UNE session, affichée « du … au … » avec chaque jour, à venir jusqu'à son dernier jour", () => {
  const S = require("../js/sessions.js");
  const UI = require("../js/sessions-ui.js");
  const days = ["2026-11-30", "2026-12-04", "2026-12-07", "2026-12-11", "2026-12-14", "2026-12-18", "2026-12-21"];
  const raw = { id: "2026-11-30-conseiller-prevention", training: "conseiller-prevention", date: "2026-11-30", days, capacity: 5, seatsLeft: 5,
    status: "open", closesAt: "2026-11-29T18:00", live: true };
  assert.deepEqual(S.validate(raw), []);
  assert.ok(S.validate(Object.assign({}, raw, { days: ["2026-12-04", "2026-11-30"] })).length, "jours non triés : refusé");
  assert.ok(S.validate(Object.assign({}, raw, { days: ["2026-12-01", "2026-12-04"] })).length, "le 1er jour doit être la date");
  const s = S.normalize(raw);
  assert.equal(s.lastDate, "2026-12-21");
  assert.ok(S.isUpcoming(s, new Date("2026-12-10T10:00:00Z")), "cycle commencé : encore « à venir »");
  assert.ok(!S.isBookable(s, new Date("2026-12-10T10:00:00Z")), "mais plus réservable");
  assert.ok(!S.isUpcoming(s, new Date("2026-12-22T10:00:00Z")), "fini après le dernier jour");
  const f = S.format(s, "fr");
  assert.equal(f.dayCount, 7);
  assert.match(f.dateLong, /^Lundi 30 novembre.*21 décembre 2026$/);
  assert.equal(f.days.length, 7); assert.match(f.days[1], /4 déc/);
  const one = S.normalize({ id: "2026-12-01-ba4", training: "ba4", date: "2026-12-01", capacity: 5, seatsLeft: 5 });
  assert.equal(S.format(one, "fr").dayCount, 1);
  assert.equal(UI.daysText.length, 1);
  /* Libellé « 7 jours : lun. 30 nov., … » dans les 10 langues. */
  globalThis.window = {};
  delete require.cache[require.resolve("../js/i18n-data-sessions.js")];
  require("../js/i18n-data-sessions.js");
  const I = globalThis.window.I18N;
  delete globalThis.window;
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => assert.match(I[l]["sess.days_n"], /\{n\}/, l));
  assert.equal(I.fr["sess.days_n"], "{n} jours");
});
