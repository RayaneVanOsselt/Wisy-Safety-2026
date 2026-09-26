"use strict";
/* Couverture multilingue — exécute scripts/check-i18n.js (le même contrôle que `node scripts/check-i18n.js`) :
   dictionnaires alignés sur le français (clés, variables {…}, balises HTML, chiffres, doublons vides), clés utilisées par
   les pages et par les scripts, textes visibles restés en dur, encodage UTF-8 (caractère de remplacement, texte mal décodé, BOM).
   S'ajoute à tests/i18n-static.test.js (le HTML servi = le français du dictionnaire) et à tests/faq-i18n.test.js
   (contenu de la FAQ). `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Check = require("../scripts/check-i18n.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("i18n : aucune erreur de couverture (node scripts/check-i18n.js pour le détail)", () => {
  const r = Check.run();
  assert.deepEqual(r.errors, [], "\n" + r.errors.slice(0, 25).join("\n") + (r.errors.length > 25 ? "\n… " + (r.errors.length - 25) + " autres" : ""));
});

test("i18n : les 10 langues sont présentes dans chaque dictionnaire", () => {
  assert.deepEqual(Check.LANGS, ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"]);
  Check.DICT_FILES.forEach((f) => {
    const I = Check.loadDict([f]);
    Check.LANGS.forEach((l) => assert.ok(I[l] && Object.keys(I[l]).length > 0, f + " : langue « " + l + " » absente"));
  });
});

test("i18n : le <title> servi de chaque page = meta.title français (l'onglet ne change pas au chargement en français)", () => {
  Check.PAGES.forEach((page) => {
    const html = read(page);
    const title = Check.decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").replace(/\s+/g, " ").trim();
    const files = [...html.matchAll(/<script src="\/?(js\/i18n-data-[\w-]+\.js)"/g)].map((m) => m[1]);
    const fr = Check.loadDict(files).fr || {};
    assert.ok(title, page + " : <title> absent");
    assert.equal(fr["meta.title"], title, page + " : meta.title (français) ≠ <title> du HTML");
  });
});

test("i18n : <html lang> d'origine = fr, jamais de dir/lang figés dans le corps de page", () => {
  Check.PAGES.forEach((page) => {
    const html = read(page);
    assert.match(html, /<html lang="fr"/, page + " : <html lang=\"fr\"> attendu (langue source)");
    const body = html.slice(html.indexOf("<body"));
    assert.doesNotMatch(body, /<(main|section|div|article)\b[^>]*\slang="fr"/, page + " : lang=\"fr\" figé dans le corps de page (resterait français quand la langue change)");
    assert.doesNotMatch(body, /<(main|section|div|article)\b[^>]*\sdir="ltr"/, page + " : dir=\"ltr\" figé dans le corps de page (casserait l'arabe)");
  });
});
