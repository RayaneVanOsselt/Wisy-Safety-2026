"use strict";
/* Moteur de recherche PARTAGÉ du Centre d'aide (js/faq-search.js) : normalisation,
   synonymes, correspondance partielle, tolérance aux fautes, confiance, surlignage.
   Le même moteur sert la page faq.html ET l'assistant — ces tests garantissent donc les
   deux. `node --test tests/*.test.js` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const FAQ = require("../js/faq-search.js");

const top = (q, o) => { const r = FAQ.search(q, Object.assign({ limit: 5 }, o)); return r.top && r.top.item.id; };
const ids = (q, o) => FAQ.search(q, Object.assign({ limit: 20 }, o)).hits.map((h) => h.item.id);

test("normalize : minuscules, accents, ligatures, apostrophes et ponctuation", () => {
  assert.equal(FAQ.normalize("Où s'inscrire ?"), "ou s inscrire");
  assert.equal(FAQ.normalize("  ÉLÉVATRICE   Cœur "), "elevatrice coeur");
  assert.equal(FAQ.normalize("e-mail"), "e mail");
  assert.equal(FAQ.normalize(""), "");
  assert.equal(FAQ.normalize(null), "");
});

/* Exemples imposés par le cahier des charges + variantes courantes. */
const EXPECTED = [
  ["prix", "faq-tarifs-prix"],
  ["tarifs", "faq-tarifs-prix"],
  ["combien coûte une formation", "faq-tarifs-prix"],
  ["payer", "faq-tarifs-paiement"],
  ["comment payer", "faq-tarifs-paiement"],
  ["cpf", "faq-tarifs-financement"],
  ["financement", "faq-tarifs-financement"],
  ["subvention", "faq-tarifs-financement"],
  ["inscription", "faq-inscription-comment"],
  ["s'inscrire", "faq-inscription-comment"],
  ["comment m'inscrire ?", "faq-inscription-comment"],
  ["certificat", "faq-attestations-recevoir"],
  ["attestation", "faq-attestations-recevoir"],
  ["diplôme", "faq-attestations-recevoir"],
  ["prérequis", "faq-inscription-prerequis"],
  ["PREREQUIS", "faq-inscription-prerequis"],
  ["pré-requis", "faq-inscription-prerequis"],
  ["durée", "faq-deroulement-duree"],
  ["combien de temps dure la formation", "faq-deroulement-duree"],
  ["combien de jours", "faq-deroulement-duree"],
  ["horaires", "faq-contact-horaires"],
  ["devis", "faq-entreprises-devis"],
  ["annuler", "faq-inscription-annulation"],
  ["puis-je annuler mon inscription", "faq-inscription-annulation"],
  ["handicap", "faq-deroulement-accessibilite"],
  ["nacelle certifiante", "faq-attestations-nacelle"],
  ["documents", "faq-inscription-informations"],
  ["néerlandais", "faq-choisir-langues"],
  ["téléphone", "faq-contact-contact"],
  ["où se trouve la formation", "faq-deroulement-lieu"],
  ["adresse", "faq-deroulement-lieu"],
  ["former mon équipe", "faq-entreprises-plusieurs"],
  ["formation en entreprise", "faq-entreprises-sur-site"],
  ["dates", "faq-inscription-dates"],
  ["délais", "faq-inscription-dates"],
  ["quelle formation choisir", "faq-choisir-adaptee"],
  ["différence entre vca base et vca ligne hiérarchique", "faq-choisir-vca-difference"],
  ["examen vca", "faq-attestations-vca-examen"],
  ["y a-t-il un chatbot", "faq-contact-assistant"],
  ["la tva est-elle incluse", "faq-tarifs-tva"],
  ["prix ttc", "faq-tarifs-tva"],
  ["dois-je donner le nom des participants", "faq-inscription-participants"],
  ["comment savoir si mon inscription est confirmée", "faq-inscription-confirmation"]
];
EXPECTED.forEach(([q, id]) => {
  test("recherche « " + q + " » → " + id, () => assert.equal(top(q), id));
});

test("synonymes : « prix » retrouve les questions liées aux tarifs, « payer » le paiement ET le financement", () => {
  const prix = ids("prix");
  ["faq-tarifs-prix", "faq-tarifs-tva", "faq-tarifs-paiement"].forEach((id) => assert.ok(prix.includes(id), "prix → " + id));
  const payer = ids("payer");
  ["faq-tarifs-paiement", "faq-tarifs-financement"].forEach((id) => assert.ok(payer.includes(id), "payer → " + id));
});

test("« inscription » retrouve inscription, s'inscrire, prérequis, délais d'inscription", () => {
  const r = ids("inscription");
  ["faq-inscription-comment", "faq-inscription-prerequis", "faq-inscription-dates"].forEach((id) => assert.ok(r.includes(id), "inscription → " + id));
});

test("« certificat » retrouve certification / attestation / examen", () => {
  const r = ids("certificat");
  ["faq-attestations-recevoir", "faq-attestations-vca-examen", "faq-attestations-nacelle"].forEach((id) => assert.ok(r.includes(id), "certificat → " + id));
});

test("insensible à la casse, aux accents et aux espaces superflus", () => {
  const ref = ids("prérequis");
  ["PRÉREQUIS", "prerequis", "  Prérequis  ", "PréRequis"].forEach((v) => assert.deepEqual(ids(v), ref, v));
});

test("« CACES » n'est jamais affirmé : il oriente vers la réponse prudente sur la nacelle", () => {
  assert.equal(top("caces"), "faq-attestations-nacelle");
  const a = FAQ.get("faq-attestations-nacelle").answer;
  assert.doesNotMatch(a, /CACES|R486|certifiante\b(?! ?\?)/i);
});

test("correspondance partielle « en tapant » (option partial)", () => {
  assert.equal(top("insc", { partial: true }), "faq-inscription-comment");
  assert.equal(top("prer", { partial: true }), "faq-inscription-prerequis");
  assert.ok(ids("tarif", { partial: true }).includes("faq-tarifs-prix"));
  /* sans `partial`, un mot incomplet ne déclenche rien (l'assistant ne devine pas) */
  assert.equal(FAQ.search("insc").hits.length, 0);
});

test("tolérance aux fautes de frappe (une lettre, une transposition)", () => {
  assert.equal(top("inscirption"), "faq-inscription-comment");
  assert.equal(top("prerequisss"), "faq-inscription-prerequis");
  assert.equal(top("financment"), "faq-tarifs-financement");
});

test("mots vides et formulations naturelles ne dégradent pas la recherche", () => {
  assert.equal(top("Bonjour, je voudrais savoir comment je peux m'inscrire à une formation"), "faq-inscription-comment");
  assert.equal(top("est-ce que vous faites des devis ?"), "faq-entreprises-devis");
});

test("aucun résultat : requêtes vides, hors sujet ou absurdes", () => {
  ["", "   ", "?!", "xyzzy", "licorne cosmique", "recette de crêpes", "quelle est la capitale de la France", "quel temps fait-il demain", "j'ai besoin d'aide"].forEach((q) => {
    const r = FAQ.search(q);
    assert.ok(r.confidence === "none" || r.confidence === "low", "pas de réponse fiable pour : « " + q + " » (" + r.confidence + ")");
  });
  assert.equal(FAQ.search("").hits.length, 0);
});

test("exact() : la question telle qu'affichée est reconnue (casse, ponctuation)", () => {
  FAQ.items().forEach((it) => {
    assert.equal(FAQ.exact(it.question).id, it.id, it.id);
    assert.equal(FAQ.exact(it.question.toUpperCase()).id, it.id, "casse : " + it.id);
    assert.equal(FAQ.exact(it.question.replace(/\s*\?$/, "")).id, it.id, "sans « ? » : " + it.id);
    assert.equal(FAQ.search(it.question).confidence, "exact", "confiance exacte : " + it.id);
  });
  assert.equal(FAQ.exact("n'importe quoi"), null);
});

test("chaque question est retrouvée en PREMIER par sa propre formulation (aucune question orpheline)", () => {
  FAQ.items().forEach((it) => assert.equal(top(it.question), it.id, it.id));
});

test("confiance : « high » sur les requêtes précises, « none » quand rien ne correspond", () => {
  assert.ok(["exact", "high"].includes(FAQ.search("comment payer").confidence));
  assert.ok(["exact", "high"].includes(FAQ.search("nacelle certifiante").confidence));
  assert.equal(FAQ.search("xyzzy").confidence, "none");
});

test("filtre de catégorie", () => {
  const r = FAQ.search("prix", { category: "tarifs", limit: 20 });
  assert.ok(r.hits.length >= 1);
  r.hits.forEach((h) => assert.equal(h.item.category, "tarifs"));
  assert.equal(FAQ.search("prix", { category: "contact" }).hits.filter((h) => h.item.category !== "contact").length, 0);
});

test("résultats classés par score décroissant, limités, sans doublon", () => {
  const r = FAQ.search("formations", { limit: 5, partial: true });
  assert.ok(r.hits.length <= 5 && r.total >= r.hits.length);
  for (let i = 1; i < r.hits.length; i++) assert.ok(r.hits[i - 1].score >= r.hits[i].score, "tri par score");
  assert.equal(new Set(r.hits.map((h) => h.item.id)).size, r.hits.length);
});

test("la recherche est pure : mêmes entrées, mêmes sorties, aucun effet de bord", () => {
  const a = JSON.stringify(FAQ.search("financement").hits.map((h) => [h.item.id, +h.score.toFixed(6)]));
  FAQ.search("prix"); FAQ.search("inscirption");
  const b = JSON.stringify(FAQ.search("financement").hits.map((h) => [h.item.id, +h.score.toFixed(6)]));
  assert.equal(a, b);
});

/* -------------------------------------------------------------- surlignage */
test("highlight : segments sûrs (jamais de HTML), insensible aux accents, pluriels et équivalents", () => {
  const r = FAQ.search("prerequis", { partial: true });
  const segs = FAQ.highlight("Quels sont les prérequis pour participer ?", r.terms);
  assert.deepEqual(segs.filter((s) => s.mark).map((s) => s.text), ["prérequis"]);
  assert.equal(segs.map((s) => s.text).join(""), "Quels sont les prérequis pour participer ?", "le texte est conservé à l'identique");

  const tarif = FAQ.search("prix").terms;
  assert.deepEqual(FAQ.highlight("Les tarifs et les prix", tarif).filter((s) => s.mark).map((s) => s.text), ["tarifs", "prix"]);

  const evil = FAQ.highlight("<img src=x onerror=alert(1)> prix", tarif);
  assert.equal(evil.map((s) => s.text).join(""), "<img src=x onerror=alert(1)> prix", "aucune transformation du texte");
  assert.ok(evil.every((s) => typeof s.text === "string" && typeof s.mark === "boolean"));
});

test("highlight : préfixe du mot en cours de frappe", () => {
  const r = FAQ.search("insc", { partial: true });
  assert.ok(FAQ.highlight("Comment s'inscrire à une formation ?", r.terms).some((s) => s.mark), "« inscrire » surligné");
});

test("highlight sans terme : texte inchangé", () => {
  assert.deepEqual(FAQ.highlight("Bonjour", { stems: {}, prefixes: [] }), [{ text: "Bonjour", mark: false }]);
  assert.deepEqual(FAQ.highlight("Bonjour", null), [{ text: "Bonjour", mark: false }]);
});

test("performance : 500 recherches successives en moins de 500 ms", () => {
  const qs = ["prix", "inscription", "certificat", "où se trouve la formation", "comment payer", "cpf", "durée", "handicap", "insc", "inscirption"];
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 500; i++) FAQ.search(qs[i % qs.length], { partial: i % 2 === 0 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 500, "500 recherches : " + ms.toFixed(1) + " ms");
});
