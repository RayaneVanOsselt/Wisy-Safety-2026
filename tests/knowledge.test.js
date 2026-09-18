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

test("formations : url = fiche, signupUrl = inscription, durée présente", () => {
  Knowledge.formations().forEach((f) => {
    assert.match(f.url, /^formations\.html#/, "url " + f.id);
    assert.match(f.signupUrl, /^inscription\.html\?formation=/, "signup " + f.id);
    assert.ok(f.duration && /jour/.test(f.duration), "durée " + f.id);
  });
});

test("byId + formationsByCategory", () => {
  assert.equal(Knowledge.byId("beps").title, "BEPS — Premier secours");
  assert.equal(Knowledge.byId("inconnu"), null);
  const secu = Knowledge.formationsByCategory("securite").map((f) => f.id).sort();
  assert.deepEqual(secu, ["diisocyanates", "vca-base"]);
});

test("HONNÊTETÉ : aucune formation ne contient de prix inventé", () => {
  Knowledge.formations().forEach((f) => {
    assert.ok(!("price" in f) && !("prix" in f), "pas de prix sur " + f.id);
  });
});

test("coordonnées de contact réelles", () => {
  assert.equal(Knowledge.CONTACT.email, "info@wisysafety.be");
  assert.match(Knowledge.CONTACT.phone, /\+32/);
});
