"use strict";
/* Centre d'aide (FAQ) — intégrité de la base de questions (js/faq-data.js),
   parité des données structurées et garde-fous « aucune affirmation inventée ».
   `node --test tests/` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const FAQ = require("../js/faq-data.js");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* Affirmations que le site ne confirme PAS (cf. js/trainings-data.js).
   Elles ne doivent jamais être avancées à propos de la formation Nacelles. */
const NACELLE_BANNED = /CACES|R486|certifi|agr[ée]{1,2}|reconnu|obligatoire/i;

test("catégories : liste stable, non vides, id/label/icon présents", () => {
  const cats = FAQ.categories();
  assert.ok(cats.length >= 4, "au moins 4 domaines");
  cats.forEach((c) => {
    assert.ok(c.id && typeof c.id === "string", "id catégorie");
    assert.ok(c.label && c.label.trim(), "label catégorie");
    assert.ok(c.icon && c.icon.trim(), "icône catégorie");
  });
  /* pas de doublon d'id */
  const ids = cats.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "ids de catégorie uniques");
});

test("questions : ids uniques, catégorie valide, Q/R non vides et bornées", () => {
  const items = FAQ.items();
  assert.ok(items.length >= 12, "un centre d'aide substantiel");
  const catIds = new Set(FAQ.categories().map((c) => c.id));
  const seen = new Set();
  items.forEach((it) => {
    assert.match(it.id, /^faq-[a-z0-9-]+$/, "id normalisé : " + it.id);
    assert.ok(!seen.has(it.id), "id unique : " + it.id);
    seen.add(it.id);
    assert.ok(catIds.has(it.category), "catégorie connue : " + it.category);
    assert.ok(it.question && it.question.trim().length > 8, "question non vide : " + it.id);
    assert.match(it.question, /\?\s*$/, "la question se termine par « ? » : " + it.id);
    assert.ok(it.answer && it.answer.trim().length > 20, "réponse consistante : " + it.id);
    assert.ok(it.answer.length < 700, "réponse concise : " + it.id);
  });
});

test("chaque catégorie contient au moins une question (jamais de filtre vide)", () => {
  const counts = FAQ.counts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, FAQ.items().length, "counts() couvre toutes les questions");
  FAQ.categories().forEach((c) => {
    assert.ok((counts[c.id] || 0) >= 1, "catégorie non vide : " + c.id);
  });
});

test("questions populaires : présentes, marquées et raisonnablement peu nombreuses", () => {
  const feat = FAQ.featured();
  assert.ok(feat.length >= 3 && feat.length <= 4, "3 à 4 questions mises en avant");
  feat.forEach((it) => assert.equal(it.featured, true));
});

test("données structurées FAQPage : une entrée par question réellement présente", () => {
  const sd = FAQ.toStructuredData();
  assert.equal(sd["@type"], "FAQPage");
  const items = FAQ.items();
  assert.equal(sd.mainEntity.length, items.length, "aucune question fantôme, aucune manquante");
  sd.mainEntity.forEach((q, i) => {
    assert.equal(q["@type"], "Question");
    assert.equal(q.name, items[i].question);
    assert.equal(q.acceptedAnswer["@type"], "Answer");
    assert.equal(q.acceptedAnswer.text, items[i].answer);
  });
});

test("garde-fou : aucun « CACES » / « R486 » nulle part (jamais confirmé par le site)", () => {
  FAQ.items().forEach((it) => {
    assert.doesNotMatch(it.question + " " + it.answer, /CACES|R486/i, "sans CACES : " + it.id);
  });
});

test("garde-fou nacelles : la réponse dédiée ne présente pas la formation comme certifiante/agréée", () => {
  const nac = FAQ.items().find((it) => it.id === "faq-attestations-nacelle");
  assert.ok(nac, "la question sur les Nacelles existe");
  assert.doesNotMatch(nac.answer, NACELLE_BANNED, "réponse Nacelles conforme aux faits confirmés");
});

test("contenu provisoire : clairement identifié par une note dans le code", () => {
  FAQ.items().forEach((it) => {
    if (it.provisional) {
      assert.ok(it.note && /PROVISOIRE/i.test(it.note), "note PROVISOIRE présente : " + it.id);
    }
  });
});

test("intégration page : faq.html branche la source unique et les conteneurs générés", () => {
  assert.ok(exists("faq.html"), "faq.html existe");
  const html = read("faq.html");
  assert.match(html, /js\/faq-data\.js/, "faq.html charge js/faq-data.js");
  ["faqc-cats", "faqc-pop", "faqc-list", "faqc-empty"].forEach((id) => {
    assert.match(html, new RegExp('id="' + id + '"'), "conteneur #" + id + " présent");
  });
  assert.doesNotMatch(html, /CACES|R486/i, "faq.html sans CACES");
  /* accessibilité de base : label de recherche + landmark main */
  assert.match(html, /<label[^>]*for="faqc-q"/, "label associé au champ de recherche");
  assert.match(html, /<main[^>]*id="main"/, "landmark main");
});

test("intégration i18n : libellé « footer.faq » disponible (fr/en/nl au moins)", () => {
  const common = read("js/i18n-data-common.js");
  ["fr", "en", "nl"].forEach((lg) => {
    assert.match(common, new RegExp('m\\("' + lg + '", \\{ "footer\\.faq"'), "footer.faq pour " + lg);
  });
});
