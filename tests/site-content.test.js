"use strict";
/* Registre commun (js/site-content.js) : cohérence interne, avec le catalogue d'inscription, avec les
   dictionnaires i18n, et avec tout ce qui en dérive (assistant, validation d'URLs, lien profond
   d'inscription). `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Site = require("../js/site-content.js");
const Trainings = require("../js/trainings-data.js");
const Knowledge = require("../js/assistant/knowledge.js");
const Validation = require("../js/assistant/validation.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

/* Dictionnaires : toutes les données i18n chargées ensemble (les clés sont préfixées par page). */
const I18N = (() => {
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  ["common", "search", "assistant", "formations", "home", "nacelles", "inscription"].forEach((n) => vm.runInContext(read("js/i18n-data-" + n + ".js"), ctx));
  return ctx.window.I18N;
})();

/* Catalogue d'inscription tel que le navigateur le charge (window + registre du site). */
const Reg = (() => {
  const win = { WisyTrainings: Trainings, WisySite: Site };
  const ctx = { window: win, document: { dispatchEvent() {} }, CustomEvent: function () {} };
  vm.createContext(ctx); vm.runInContext(read("js/registration-data.js"), ctx);
  return win.WisyRegistrationData;
})();

test("registre : 6 formations, ids uniques, catégories déclarées, comptes cohérents", () => {
  const f = Site.formations(), cats = Site.categories().map((c) => c.id);
  assert.equal(f.length, 6);
  assert.equal(new Set(f.map((x) => x.id)).size, f.length, "ids uniques");
  f.forEach((x) => assert.ok(cats.includes(x.category), "catégorie inconnue : " + x.category));
  cats.forEach((c) => assert.ok(f.some((x) => x.category === c), "catégorie vide : " + c));
  assert.equal(new Set(Site.pages().map((p) => p.id)).size, Site.pages().length, "pages : ids uniques");
});

test("registre ⇄ catalogue d'inscription : chaque formation a son registrationId, et inversement", () => {
  const catalogue = Array.from(Reg.getCatalogue(), (c) => c.id).sort();    // Array.from : sort de l'autre contexte vm
  assert.deepEqual(Site.formations().map((f) => f.registrationId).sort(), catalogue);
});

test("lien profond ?formation= : identifiants du site OU du catalogue ; inconnu → null", () => {
  Site.formations().forEach((f) => {
    assert.equal(Reg.resolveTrainingId(f.id), f.registrationId, "id du site : " + f.id);
    assert.equal(Reg.resolveTrainingId(f.registrationId), f.registrationId, "id du catalogue : " + f.registrationId);
  });
  assert.equal(Reg.resolveTrainingId("vca-hierarchique"), "vca-ligne-hierarchique");
  assert.equal(Reg.resolveTrainingId("nacelle"), "nacelle-elevatrice");
  [null, undefined, "", "inconnue", "__proto__", "<script>"].forEach((x) => assert.equal(Reg.resolveTrainingId(x), null, String(x)));
});

test("clés i18n du registre : présentes dans les 10 langues (titres, accroches, pages, catégories)", () => {
  const keys = new Set();
  Site.formations().forEach((f) => [f.titleKey, f.taglineKey, f.descKey, f.fullTitleKey, f.summaryKey].concat(f.factKeys || []).filter(Boolean).forEach((k) => keys.add(k)));
  Site.pages().forEach((p) => { keys.add(p.titleKey); keys.add(p.descKey); });
  Site.categories().forEach((c) => { keys.add(c.labelKey); keys.add(c.filterKey); });
  const missing = [];
  keys.forEach((k) => LANGS.forEach((l) => { if (!(I18N[l] && I18N[l][k])) missing.push(l + ":" + k); }));
  /* Les textes de la formation Nacelles n'existent qu'en fr/en/nl (langues proposées) : on exige au moins celles-là. */
  const nacelleOnly = missing.filter((m) => /nacelle/.test(m));
  assert.deepEqual(missing.filter((m) => !/nacelle/.test(m)), [], "clés absentes");
  nacelleOnly.forEach((m) => assert.ok(!/^(fr|en|nl):/.test(m), "clé nacelle absente en fr/en/nl : " + m));
});

test("les descriptions du registre = celles affichées en français (fiches du catalogue)", () => {
  Site.formations().filter((f) => !f.dedicatedPage).forEach((f) => assert.equal(I18N.fr[f.descKey], f.description, "description : " + f.id));
  const nacelle = Site.formation("nacelle");
  assert.equal(I18N.fr[nacelle.descKey], nacelle.description, "résumé de la nacelle");
});

test("l'assistant DÉRIVE du registre : mêmes formations, mêmes pages, mêmes URLs autorisées", () => {
  assert.deepEqual(Knowledge.formations().map((f) => f.id), Site.formations().map((f) => f.id));
  assert.deepEqual(Knowledge.pages().map((p) => p.url), Site.pages().map((p) => p.url));
  Site.publicPaths().forEach((u) => assert.ok(Validation.isSafeUrl(u), "route autorisée : " + u));
  Site.formations().forEach((f) => { assert.ok(Validation.isSafeUrl(f.url), f.url); assert.ok(Validation.isSafeUrl(f.signupUrl), f.signupUrl); });
  ["https://evil.example/", "javascript:alert(1)", "faq.html.evil", "//evil.example", "admin/avis.html"].forEach((u) => assert.ok(!Validation.isSafeUrl(u), "refusée : " + u));
});

test("le registre est en LECTURE SEULE pour ses consommateurs (copies)", () => {
  const f = Site.formations(); f[0].title = "MODIFIÉ"; f[0].keywords.push("x");
  assert.notEqual(Site.formation("vca-base").title, "MODIFIÉ");
  assert.ok(!Site.formation("vca-base").keywords.includes("x"));
});

test("URL absolue : la racine pour l'accueil, .html ailleurs, domaine canonique unique", () => {
  assert.equal(Site.ORIGIN, "https://www.wisysafety.be");
  assert.equal(Site.absoluteUrl("index.html"), "https://www.wisysafety.be/");
  assert.equal(Site.absoluteUrl("faq.html"), "https://www.wisysafety.be/faq.html");
  assert.match(read(".env.example"), /ASSISTANT_ALLOWED_ORIGIN=https:\/\/www\.wisysafety\.be/, "même domaine que l'origine CORS de l'assistant");
});

test("chaque page charge le registre AVANT la recherche (et le lanceur le charge à la demande si besoin)", () => {
  ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda"].forEach((n) => {
    const html = read(n + ".html");
    const t = html.indexOf('<script src="js/trainings-data.js">'), s = html.indexOf('<script src="js/site-content.js">'), q = html.indexOf('<script src="js/search.js">');
    assert.ok(t > 0 && t < s && s < q, n + ".html : trainings-data.js → site-content.js → search.js");
    if (html.includes("registration-data.js")) assert.ok(s < html.indexOf("registration-data.js"), n + ".html : registre avant l'inscription");
  });
  const launcher = read("js/assistant/launcher.js");
  assert.ok(launcher.indexOf('"js/site-content.js"') < launcher.indexOf('"js/assistant/knowledge.js"'), "le moteur charge le registre avant la base de connaissances");
});
