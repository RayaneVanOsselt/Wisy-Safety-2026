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

test("recherche : PEMP, « travail en hauteur » et « nacelles » remontent la nacelle en tête", () => {
  ["PEMP", "travail en hauteur", "nacelles élévatrices", "nacelle ciseaux"].forEach((q) => {
    const r = Retrieval.search(q);
    assert.ok(r.length > 0, q);
    assert.equal(r[0].entry.id, "nacelle", q);
  });
});

test("le mot « CACES » n'associe plus la nacelle à une certification", () => {
  const r = Retrieval.bestFormation("caces");
  assert.equal(r, null);
});

test("un jeton ne matche jamais au MILIEU d'un mot (« dure » ≠ « soudure »)", () => {
  /* Régression : « Combien de temps dure la formation ? » désignait « Fibre optique » (sou-dure). */
  assert.equal(Retrieval.bestFormation("Combien de temps dure la formation ?"), null);
  const soudure = Retrieval.search("dure", { types: ["formation"], minScore: 1 });
  assert.ok(soudure.every((r) => r.entry.id !== "fibre-optique"), "« dure » ne doit pas trouver la fibre");
});

test("une correspondance dans le CORPS de texte seul (« jours », « formation ») ne désigne aucune formation", () => {
  ["Combien de jours dure la formation ?", "Durée de cette formation en jours", "une formation de 3 jours"].forEach((q) => {
    assert.equal(Retrieval.bestFormation(q), null, q);
  });
  /* … mais un mot du titre ou des mots-clés reste discriminant */
  assert.equal(Retrieval.bestFormation("formation de 3 jours sur la fibre").id, "fibre-optique");
  assert.equal(Retrieval.bestFormation("formation nacelle de 1 jour").id, "nacelle");
});
