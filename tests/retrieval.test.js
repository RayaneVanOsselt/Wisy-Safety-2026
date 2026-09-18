"use strict";
/* Tests récupération de contexte (retrieval). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Retrieval = require("../js/assistant/retrieval.js");

test("normalize retire les accents et la casse", () => {
  assert.equal(Retrieval.normalize("Élévatrice ÇA"), "elevatrice ca");
});

test("tokenize ignore les mots vides et les tokens courts", () => {
  const tk = Retrieval.tokenize("je cherche une formation sur la fibre");
  assert.ok(tk.includes("formation"));
  assert.ok(tk.includes("fibre"));
  assert.ok(!tk.includes("je"));
  assert.ok(!tk.includes("la"));
});

test("recherche : 'nacelle' remonte la formation nacelle en tête", () => {
  const r = Retrieval.search("nacelle élévatrice");
  assert.ok(r.length > 0);
  assert.equal(r[0].entry.id, "nacelle");
});

test("recherche : 'premiers secours' remonte le BEPS", () => {
  const best = Retrieval.bestFormation("je veux apprendre les premiers secours");
  assert.equal(best.id, "beps");
});

test("recherche : 'fibre optique' → fibre-optique", () => {
  assert.equal(Retrieval.bestFormation("formation fibre optique").id, "fibre-optique");
});

test("détection de catégorie", () => {
  assert.equal(Retrieval.detectCategory(Retrieval.tokenize("formations sécurité")), "securite");
  assert.equal(Retrieval.detectCategory(Retrieval.tokenize("premiers secours")), "secours");
});

test("requête vide → aucun résultat", () => {
  assert.deepEqual(Retrieval.search(""), []);
  assert.deepEqual(Retrieval.search("   "), []);
});

test("filtre par type", () => {
  const r = Retrieval.search("contact téléphone", { types: ["contact"] });
  assert.ok(r.every((x) => x.entry.type === "contact"));
});
