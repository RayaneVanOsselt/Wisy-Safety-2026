"use strict";
/* Fonction Edge optionnelle (assistant IA) : sa FAQ est GÉNÉRÉE depuis la source unique.
   Si js/faq-data.js change sans `node scripts/sync-faq-edge.js`, ce test échoue —
   l'assistant IA ne peut donc jamais contredire la page FAQ ni l'assistant local. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const FAQ = require("../js/faq-data.js");
const { generate, OUT } = require("../scripts/sync-faq-edge.js");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("supabase/functions/chat/faq.generated.ts est à jour vis-à-vis de js/faq-data.js", () => {
  assert.ok(fs.existsSync(OUT), "fichier généré présent");
  assert.equal(fs.readFileSync(OUT, "utf8"), generate(), "obsolète : lancez `node scripts/sync-faq-edge.js`");
});

test("le fichier généré contient chaque question, mot pour mot", () => {
  const gen = fs.readFileSync(OUT, "utf8");
  FAQ.items().forEach((it) => {
    assert.ok(gen.includes(JSON.stringify(it.question)), "question : " + it.id);
    assert.ok(gen.includes(JSON.stringify(it.answer)), "réponse : " + it.id);
  });
});

test("knowledge.ts dérive sa FAQ du fichier généré (plus aucune copie manuelle)", () => {
  const ts = read("supabase/functions/chat/knowledge.ts");
  assert.match(ts, /from "\.\/faq\.generated\.ts"/, "import du fichier généré");
  assert.match(ts, /FAQ_ITEMS\.map/, "dérivation");
  assert.doesNotMatch(ts, /id: "faq-(deroulement|tarifs|lieu)"/, "l'ancienne mini-FAQ divergente a disparu");
  assert.doesNotMatch(ts, /débouchent le plus souvent sur une certification reconnue/, "l'affirmation non confirmée a disparu");
});

test("knowledge.ts : routes autorisées et coordonnées = celles du site", () => {
  const ts = read("supabase/functions/chat/knowledge.ts");
  assert.match(ts, /"faq\.html"/, "faq.html figure dans l'allow-list d'URLs");
  assert.ok(ts.includes(FAQ.CONTACT.email) && ts.includes(FAQ.CONTACT.phone) && ts.includes(FAQ.CONTACT.phoneHref) && ts.includes(FAQ.CONTACT.hours), "coordonnées identiques à la source unique");
});

test("index.ts : la réponse « pas assez d'informations » est celle prescrite (aucune invention)", () => {
  const ts = read("supabase/functions/chat/index.ts");
  const S = "Je n'ai pas encore suffisamment d'informations pour répondre précisément à cette question. Vous pouvez contacter l'équipe Wisy Safety pour obtenir une réponse personnalisée.";
  assert.ok(ts.includes(S), "phrase prescrite présente (prompt + repli)");
  assert.ok((ts.match(/pas encore suffisamment d'informations/g) || []).length >= 2, "dans le prompt ET dans le repli");
});
