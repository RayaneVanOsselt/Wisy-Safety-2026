"use strict";
/* Moteur i18n (js/i18n.js) : choix de la langue au chargement.
   Enjeu SEO : Googlebot annonce « en-US » ; sans garde-fou il indexerait la version anglaise des pages
   françaises. On exécute le vrai fichier dans un bac à sable (aucun navigateur requis). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "js", "i18n.js"), "utf8");

/* Charge i18n.js avec un environnement minimal et renvoie la langue appliquée à <html>. */
function boot({ ua = "Mozilla/5.0 Chrome/126", languages = ["fr-BE"], search = "", stored = null } = {}) {
  const attrs = {};
  const html = { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] };
  const store = stored ? { "wisy-lang": stored } : {};
  const win = { I18N: { fr: { "meta.title": "Titre FR" }, en: { "meta.title": "Title EN" }, nl: { "meta.title": "Titel NL" }, de: {}, __names__: {} } };
  const doc = {
    readyState: "complete", title: "",
    documentElement: html,
    querySelectorAll: () => [], addEventListener: () => {}, dispatchEvent: () => {}
  };
  const ctx = {
    window: win, document: doc, CustomEvent: function CE() {},
    navigator: { userAgent: ua, languages },
    location: { search, href: "https://www.wisysafety.be/index.html" + search },
    history: { replaceState: () => {} },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    URL, URLSearchParams
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "js/i18n.js" });
  return { lang: attrs.lang, dir: attrs.dir, title: doc.title, stored: store["wisy-lang"] };
}

const GOOGLEBOT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BINGBOT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36";
const INSPECTION = "Mozilla/5.0 (compatible; Google-InspectionTool/1.0)";
const LIGHTHOUSE = "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 Chrome-Lighthouse";

test("visiteur humain : la langue du navigateur est respectée (nl-BE → néerlandais)", () => {
  const r = boot({ languages: ["nl-BE", "en"] });
  assert.equal(r.lang, "nl");
  assert.equal(r.title, "Titel NL");
});

test("visiteur humain sans langue prise en charge : français par défaut", () => {
  assert.equal(boot({ languages: ["ja-JP"] }).lang, "fr");
});

test("robots d'indexation (« en-US ») : la version FRANÇAISE, langue source du HTML, est servie", () => {
  [GOOGLEBOT, BINGBOT, INSPECTION, LIGHTHOUSE].forEach((ua) => {
    const r = boot({ ua, languages: ["en-US"] });
    assert.equal(r.lang, "fr", ua.slice(0, 60));
    assert.equal(r.title, "Titre FR");
  });
});

test("robots : ?lang=xx et le choix mémorisé restent honorés (variantes explorables sur demande)", () => {
  assert.equal(boot({ ua: GOOGLEBOT, languages: ["en-US"], search: "?lang=nl" }).lang, "nl");
  assert.equal(boot({ ua: GOOGLEBOT, languages: ["en-US"], stored: "de" }).lang, "de");
});

test("priorité inchangée pour un humain : ?lang > choix mémorisé > navigateur", () => {
  assert.equal(boot({ languages: ["nl"], stored: "de", search: "?lang=en" }).lang, "en");
  assert.equal(boot({ languages: ["nl"], stored: "de" }).lang, "de");
});

test("l'arabe passe en écriture de droite à gauche", () => {
  const r = boot({ languages: ["ar-MA"], search: "" });
  assert.equal(r.lang, "ar");
  assert.equal(r.dir, "rtl");
});
