"use strict";
/* Centre d'aide multilingue : chaque traduction (js/faq-i18n/faq-<langue>.js) reste STRICTEMENT alignée
   sur le français de js/faq-data.js — mêmes identifiants, mêmes paragraphes et puces, mêmes coordonnées —
   et la recherche répond dans la langue de la page.  `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const LANGS = ["en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

function fresh() {                                            // un WisyFAQ tout neuf (français + moteur)
  delete require.cache[require.resolve("../js/faq-data.js")];
  delete require.cache[require.resolve("../js/faq-search.js")];
  return require("../js/faq-search.js");
}
function loadPack(F, lang) {
  const file = path.join(ROOT, "js", "faq-i18n", "faq-" + lang + ".js");
  assert.ok(fs.existsSync(file), "traduction absente : js/faq-i18n/faq-" + lang + ".js");
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { WisyFAQ: F }, { filename: file });
}
const shape = (F, answer) => F.blocks(answer).map((b) => (b.type === "ul" ? "ul" + b.items.length : "p")).join(",");

LANGS.forEach((lang) => {
  test("[" + lang + "] traduction du Centre d'aide : parité avec le français", () => {
    const F = fresh();
    loadPack(F, lang);
    assert.ok(F.hasPack(lang), "WisyFAQ.register(« " + lang + " ») non appelé");
    const fr = F.items(), tr = F.items(lang), bad = [];

    // catégories, actions, recherches populaires
    F.categories().forEach((c, i) => { const t = F.categories(lang)[i]; if (t.label === c.label || !t.label || !t.tagline) bad.push("catégorie " + c.id + " non traduite"); });
    Object.keys(F.ACTIONS).forEach((id) => { const a = F.actions(lang)[id]; if (!a || !a.label || a.label === F.ACTIONS[id].label) bad.push("action " + id + " non traduite"); });
    if (F.popular(lang).length !== F.popular().length) bad.push("nombre de recherches populaires différent");

    fr.forEach((it, i) => {
      const t = tr[i];
      if (t.id !== it.id) bad.push("ordre/identifiant : " + it.id);
      if (t.question === it.question || !t.question) bad.push(it.id + " : question non traduite");
      if (!/[?？؟]$/.test(t.question.trim())) bad.push(it.id + " : la question doit se terminer par « ? »");
      if (t.question.length > 110) bad.push(it.id + " : question trop longue (" + t.question.length + ")");
      if (!t.answer || t.answer === it.answer) bad.push(it.id + " : réponse non traduite");
      if (shape(F, t.answer) !== shape(F, it.answer)) bad.push(it.id + " : structure de la réponse (paragraphes / puces) différente du français : " + shape(F, it.answer) + " ≠ " + shape(F, t.answer));
      if (/<[a-z][\s\S]*>/i.test(t.answer + t.question)) bad.push(it.id + " : pas de HTML dans une réponse");
      if ((t.keywords || []).length < 3 || (t.synonyms || []).length < 3) bad.push(it.id + " : mots-clés / synonymes insuffisants");
      // les coordonnées ne se traduisent pas
      [F.CONTACT.phone, F.CONTACT.email, F.CONTACT.street].forEach((c) => { if (it.answer.includes(c) && !t.answer.includes(c)) bad.push(it.id + " : « " + c + " » doit figurer dans la traduction"); });
      // pas de fait nouveau : les chiffres de la réponse (durées, prix…) sont les mêmes qu'en français
      /* arabe : « يوم واحد » / « يومان » portent le 1 et le 2 dans le mot lui-même (pas de chiffre à comparer) */
      const nums = (s) => (s.match(/\d+/g) || []).filter((n) => !(lang === "ar" && (n === "1" || n === "2"))).sort().join(",");
      if (nums(it.answer) !== nums(t.answer)) bad.push(it.id + " : chiffres différents du français (" + nums(it.answer) + " ≠ " + nums(t.answer) + ")");
    });
    assert.deepEqual(bad, [], lang + " : " + bad.length + " écart(s)");
  });

  test("[" + lang + "] la recherche répond dans la langue (recherches populaires + questions exactes)", () => {
    const F = fresh();
    loadPack(F, lang);
    const bad = [];
    F.popular(lang).forEach((p) => { if (!F.search(p.query, { lang }).hits.length) bad.push("recherche populaire sans résultat : « " + p.query + " »"); });
    F.items(lang).forEach((it) => {
      const r = F.search(it.question, { lang });
      if (!r.top || r.top.item.id !== it.id) bad.push("« " + it.question.slice(0, 60) + " » ne retrouve pas sa propre réponse (trouvé : " + (r.top ? r.top.item.id : "rien") + ")");
    });
    assert.deepEqual(bad, [], lang + " : " + bad.join(" | "));
  });
});

test("le français reste la valeur par défaut : sans argument, ni l'assistant ni les tests ne voient de traduction", () => {
  const F = fresh();
  LANGS.forEach((l) => loadPack(F, l));
  assert.equal(F.items()[0].question, "Comment choisir la formation adaptée à mon besoin ?");
  assert.equal(F.items("xx")[0].question, F.items()[0].question, "langue inconnue → français");
  assert.equal(F.search("tarifs").top.item.id, "faq-tarifs-prix");
});
