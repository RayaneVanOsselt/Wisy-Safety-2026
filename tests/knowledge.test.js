"use strict";
/* Tests base de connaissances — `node --test tests/` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Knowledge = require("../js/assistant/knowledge.js");

test("6 formations réelles, ids attendus", () => {
  const ids = Knowledge.formations().map((f) => f.id).sort();
  assert.deepEqual(ids, ["beps", "diisocyanates", "fibre-optique", "nacelle", "vca-base", "vca-hierarchique"]);
});

test("chaque entrée respecte le schéma { id, title, url, type, updatedAt }", () => {
  Knowledge.all().forEach((e) => {
    assert.ok(e.id, "id");
    assert.ok(e.title, "title " + e.id);
    assert.ok(typeof e.url === "string", "url " + e.id);
    assert.ok(e.type, "type " + e.id);
    assert.match(e.updatedAt, /^\d{4}-\d{2}-\d{2}$/, "updatedAt " + e.id);
  });
});

test("formations : url = fiche (ancre catalogue OU page dédiée existante), signupUrl = inscription, durée présente", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  Knowledge.formations().forEach((f) => {
    assert.match(f.url, /^(formations\.html#[a-z-]+|formation-[a-z0-9-]+\.html)$/, "url " + f.id);
    if (/^formation-/.test(f.url)) {
      assert.ok(fs.existsSync(path.join(__dirname, "..", f.url)), "la page dédiée existe : " + f.url);
    }
    assert.match(f.signupUrl, /^inscription\.html\?formation=/, "signup " + f.id);
    assert.ok(f.duration && /jour|heure/.test(f.duration), "durée " + f.id);
  });
});

test("byId + formationsByCategory", () => {
  assert.equal(Knowledge.byId("beps").title, "BEPS — Premier secours");
  assert.equal(Knowledge.byId("inconnu"), null);
  const secu = Knowledge.formationsByCategory("securite").map((f) => f.id).sort();
  assert.deepEqual(secu, ["diisocyanates", "vca-base"]);
});

test("HONNÊTETÉ : seul un prix CONFIRMÉ peut figurer sur une formation (registre central)", () => {
  /* Prix confirmés par Wisy Safety, en centimes. Toute autre formation reste sans prix. */
  const CONFIRMED = { nacelle: { cents: 35000, label: "350 € HT" }, beps: { cents: 7000, label: "70 €" } };
  Knowledge.formations().forEach((f) => {
    assert.ok(!("prix" in f), "pas de champ « prix » sur " + f.id);
    if (CONFIRMED[f.id]) {
      assert.equal(f.price.amountCents, CONFIRMED[f.id].cents, "prix confirmé " + f.id);
      assert.equal(f.priceLabel, CONFIRMED[f.id].label, "libellé " + f.id);
    } else {
      assert.ok(!("price" in f) && !f.priceLabel, "pas de prix inventé sur " + f.id);
    }
  });
});

test("HONNÊTETÉ : aucune affirmation CACES / certification / agrément non confirmée", () => {
  const banned = /CACES|R486|certifi|agr[ée]{1,2}|reconnu/i;
  const nacelle = Knowledge.byId("nacelle");
  ["title", "description", "objective", "format", "level"].forEach((k) => {
    assert.doesNotMatch(String(nacelle[k]), banned, "champ « " + k + " » de la nacelle");
  });
  assert.doesNotMatch((nacelle.features || []).join(" "), banned, "features");
  assert.doesNotMatch((nacelle.keywords || []).join(" "), /caces|r486/i, "mots-clés");
  assert.ok(nacelle.unconfirmed.indexOf("CACES") !== -1, "la nacelle déclare CACES comme non confirmé");
});

test("registre central : les faits de la nacelle viennent d'une seule source", () => {
  const T = require("../js/trainings-data.js").nacelles;
  const n = Knowledge.byId("nacelle");
  assert.equal(n.url, T.url);
  assert.equal(n.signupUrl, T.signupUrl);
  assert.equal(n.duration, "1 jour");
  assert.deepEqual(n.languages, ["Français", "Néerlandais", "Anglais"]);
  assert.equal(n.format, "Théorie + pratique");
  assert.equal(n.subtypes.length, 7);
});

test("coordonnées de contact réelles", () => {
  assert.equal(Knowledge.CONTACT.email, "info@wisysafety.be");
  assert.match(Knowledge.CONTACT.phone, /\+32/);
});
