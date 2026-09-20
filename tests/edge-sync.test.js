"use strict";
/* Fonction Edge optionnelle (assistant IA) : sa FAQ, ses formations, ses pages et ses coordonnées sont
   GÉNÉRÉES depuis les sources uniques du site (`node scripts/sync-edge.js`). Si js/faq-data.js,
   js/site-content.js ou js/trainings-data.js change sans régénération, ce test échoue —
   l'assistant IA ne peut donc jamais contredire le site, la recherche ni l'assistant local. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const FAQ = require("../js/faq-data.js");
const Site = require("../js/site-content.js");
const { generate, OUT } = require("../scripts/sync-faq-edge.js");
const { generateSite, OUT_SITE } = require("../scripts/sync-edge.js");

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

test("supabase/functions/chat/site.generated.ts est à jour vis-à-vis du registre du site", () => {
  assert.ok(fs.existsSync(OUT_SITE), "fichier généré présent");
  assert.equal(fs.readFileSync(OUT_SITE, "utf8"), generateSite(), "obsolète : lancez `node scripts/sync-edge.js`");
});

test("site.generated.ts : mêmes formations, pages, routes et coordonnées que le site", () => {
  const ts = fs.readFileSync(OUT_SITE, "utf8");
  const arr = (name) => JSON.parse(ts.slice(ts.indexOf("=", ts.indexOf("export const " + name)) + 1, ts.indexOf("];", ts.indexOf("export const " + name)) + 1));
  assert.deepEqual(arr("SITE_FORMATIONS").map((f) => f.id), Site.formations().map((f) => f.id), "formations");
  assert.deepEqual(arr("SITE_PAGES").map((p) => p.url), Site.pages().map((p) => p.url), "pages");
  assert.deepEqual(arr("SITE_PATHS"), Site.publicPaths(), "routes publiques");
  assert.ok(ts.includes(FAQ.CONTACT.email) && ts.includes(FAQ.CONTACT.phone) && ts.includes(FAQ.CONTACT.phoneHref) && ts.includes(FAQ.CONTACT.hours), "coordonnées identiques à la source unique");
  assert.ok(arr("SITE_PATHS").includes("faq.html") && arr("SITE_PATHS").includes("agenda.html"), "faq.html et agenda.html dans l'allow-list");
});

test("knowledge.ts dérive de site.generated.ts (plus aucune formation, page ni coordonnée écrite à la main)", () => {
  const ts = read("supabase/functions/chat/knowledge.ts");
  assert.match(ts, /from "\.\/site\.generated\.ts"/, "import du fichier généré");
  assert.match(ts, /SITE_FORMATIONS/); assert.match(ts, /SITE_PAGES/); assert.match(ts, /SITE_PATHS/);
  assert.doesNotMatch(ts, /id: "(vca-base|nacelle|beps)"|info@wisysafety\.be|\+32 2 318/, "aucune donnée du site recopiée");
});

test("index.ts : la réponse « pas assez d'informations » est celle prescrite (aucune invention)", () => {
  const ts = read("supabase/functions/chat/index.ts");
  const S = "Je n'ai pas encore suffisamment d'informations pour répondre précisément à cette question. Vous pouvez contacter l'équipe Wisy Safety pour obtenir une réponse personnalisée.";
  assert.ok(ts.includes(S), "phrase prescrite présente (prompt + repli)");
  assert.ok((ts.match(/pas encore suffisamment d'informations/g) || []).length >= 2, "dans le prompt ET dans le repli");
});
