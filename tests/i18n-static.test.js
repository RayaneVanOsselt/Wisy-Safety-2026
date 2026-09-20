"use strict";
/* Le HTML servi EST le français du dictionnaire : chaque texte, fragment HTML et attribut lié par
   data-i18n / data-i18n-html / data-i18n-attr est identique à la valeur française de js/i18n-data-*.js.
   Conséquences (toutes testées ici) :
     • ce que voient les robots (HTML brut) = ce que voit un visiteur francophone (après JS) ;
     • js/i18n.js peut ne PAS réécrire ~1 000 nœuds au premier affichage en français (moins de travail
       au chargement, aucun « nouveau premier affichage » du texte, donc un LCP plus stable).
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda"];

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", euro: "€", times: "×", middot: "·", bull: "•", rarr: "→", check: "✓" };
const decode = (s) => String(s).replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, n) => d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : (NAMED[n] !== undefined ? NAMED[n] : m));
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
const text = (html) => norm(html.replace(/<[^>]+>/g, ""));

/* Dictionnaire français tel que la page le charge (mêmes fichiers, même ordre). */
function frOf(html) {
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  [...html.matchAll(/<script[^>]*\bsrc="(js\/i18n-data-[^"]+)"/g)].forEach((m) => vm.runInContext(read(m[1]), ctx, { filename: m[1] }));
  return ctx.window.I18N.fr || {};
}

PAGES.forEach((name) => {
  test("[" + name + ".html] HTML statique = français du dictionnaire (texte, HTML, attributs)", () => {
    const html = read(name + ".html").replace(/<!--[\s\S]*?-->/g, ""), fr = frOf(html), bad = [];
    /* data-i18n : le texte de l'élément */
    for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const want = fr[m[2]];
      if (want == null) bad.push("[texte] clé absente du dictionnaire : " + m[2]);
      else if (text(String(want)) !== text(m[3])) bad.push("[texte] " + m[2] + " : « " + text(m[3]).slice(0, 50) + " » ≠ « " + text(String(want)).slice(0, 50) + " »");
    }
    /* data-i18n-html : le fragment HTML */
    for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*?\sdata-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const want = fr[m[2]];
      if (want == null) bad.push("[html] clé absente : " + m[2]);
      else if (norm(String(want)) !== norm(m[3])) bad.push("[html] " + m[2] + " : « " + norm(m[3]).slice(0, 50) + " » ≠ « " + norm(String(want)).slice(0, 50) + " »");
    }
    /* data-i18n-attr : « attr:cle,attr2:cle2 » */
    for (const m of html.matchAll(/<[a-z0-9]+\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/gi)) {
      for (const pair of m[1].split(",")) {
        const [attr, ...k] = pair.split(":"), key = k.join(":").trim(), a = attr.trim();
        const got = m[0].match(new RegExp("\\s" + a + '="([^"]*)"')), want = fr[key];
        if (want == null) bad.push("[attr " + a + "] clé absente : " + key);
        else if (!got || decode(got[1]) !== String(want)) bad.push("[attr " + a + "] " + key + " : « " + (got ? decode(got[1]).slice(0, 50) : "∅") + " » ≠ « " + String(want).slice(0, 50) + " »");
      }
    }
    assert.deepEqual(bad, [], name + ".html : corriger le HTML (ou le dictionnaire) — ils doivent dire la même chose en français");
  });
});

/* ------------------------------------------------------------------ comportement de js/i18n.js */
const SRC = read("js/i18n.js");
function boot({ languages = ["fr-BE"], search = "" } = {}) {
  const calls = [], attrs = {};
  const doc = {
    readyState: "complete", title: "",
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] },
    querySelectorAll: (sel) => { calls.push(sel); return []; }, addEventListener: () => {}, dispatchEvent: () => {}
  };
  const win = { I18N: { fr: { "meta.title": "Titre" }, en: { "meta.title": "Title" }, __names__: {} } };
  const ctx = { window: win, document: doc, CustomEvent: function () {}, navigator: { userAgent: "Mozilla/5.0", languages },
    location: { search, href: "https://x/index.html" + search }, history: { replaceState: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} }, URL, URLSearchParams };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { calls, attrs, win, doc };
}

test("premier affichage en FRANÇAIS : aucun nœud n'est réécrit (le HTML est déjà le dictionnaire)", () => {
  const r = boot({ languages: ["fr-BE"] });
  assert.equal(r.attrs.lang, "fr");
  assert.ok(!r.calls.some((s) => /data-i18n(?!-lang)/.test(s) && !/data-lang/.test(s)), "aucune requête data-i18n / -html / -attr au premier rendu français : " + r.calls.join(" ; "));
  assert.equal(r.doc.title, "Titre", "le titre de l'onglet reste posé");
});

test("premier affichage dans une autre langue : le contenu est bien traduit", () => {
  const r = boot({ languages: ["en-GB"] });
  assert.equal(r.attrs.lang, "en");
  ["[data-i18n]", "[data-i18n-html]", "[data-i18n-attr]"].forEach((s) => assert.ok(r.calls.includes(s), "réécriture attendue : " + s));
});

test("retour au français APRÈS une autre langue : le DOM (devenu étranger) est bien restauré", () => {
  const r = boot({ languages: ["en-GB"] });
  r.calls.length = 0;
  r.win.WisyI18N.set("fr");
  ["[data-i18n]", "[data-i18n-html]", "[data-i18n-attr]"].forEach((s) => assert.ok(r.calls.includes(s), "restauration attendue : " + s));
});
