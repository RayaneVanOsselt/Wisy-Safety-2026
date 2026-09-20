"use strict";
/* Barre de recherche du header : sa bande est écrite dans l'en-tête de CHAQUE page (rendu au premier
   affichage : pas de saut de mise en page, pas de barre qui apparaît après 2 à 3 s sur réseau lent) ;
   js/search.js l'anime. Ce test garde le HTML statique et le gabarit JS de repli synchronisés.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda"].map((n) => n + ".html");

/* Gabarit JS de repli : on exécute bandHTML() tel qu'écrit dans search.js. */
function jsBand() {
  const src = read("js/search.js");
  const body = src.slice(src.indexOf("function bandHTML() {"), src.indexOf("function build() {"));
  const ctx = { svg: (inner) => "<svg>" + inner + "</svg>", IC: { search: "S", clear: "C" } };
  vm.createContext(ctx);
  vm.runInContext(body + "\nthis.out = bandHTML();", ctx);
  return ctx.out;
}
/* Squelette comparable : sans icônes ni libellés (posés par refreshStatic), attributs normalisés. */
const skeleton = (html) => html
  .replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")
  .replace(/\s(placeholder|aria-label)="[^"]*"/g, "")
  .replace(/\s*\/>/g, ">")
  .replace(/\s+/g, " ").trim();

function staticBand(html) {
  const i = html.indexOf('<div class="wsy-search">');
  assert.ok(i > 0, "bande statique absente");
  const j = html.indexOf("</header>", i);
  const band = html.slice(i, j).trim();                       // <div class="wsy-search">…</div>
  return band.slice('<div class="wsy-search">'.length, -"</div>".length);   // contenu seul, comme bandHTML()
}
const fr = (() => {
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  ["common", "search"].forEach((n) => vm.runInContext(read("js/i18n-data-" + n + ".js"), ctx));
  return ctx.window.I18N.fr;
})();

test("chaque page a UNE bande de recherche statique, dernier enfant de l'en-tête", () => {
  PAGES.forEach((f) => {
    const html = read(f);
    assert.equal((html.match(/class="wsy-search"/g) || []).length, 1, f + " : une seule bande");
    const head = html.slice(html.indexOf('<header class="site-header"'), html.indexOf("</header>", html.indexOf('<header class="site-header"')));
    assert.ok(head.trimEnd().endsWith("</div></div></div>") && head.includes('<div class="wsy-search">'), f + " : bande = dernier enfant de .site-header");
  });
});

test("le HTML statique = le gabarit JS de repli (mêmes classes, rôles et attributs ARIA)", () => {
  const expected = skeleton(jsBand());
  PAGES.forEach((f) => assert.equal(skeleton(staticBand(read(f))), expected, f + " : bande statique divergente de search.js → bandHTML()"));
});

test("libellés statiques = français du dictionnaire (traduits ensuite par js/search.js)", () => {
  PAGES.forEach((f) => {
    const band = staticBand(read(f));
    assert.ok(band.includes('placeholder="' + fr["search.placeholder"] + '"'), f + " : placeholder");
    assert.equal((band.match(new RegExp('aria-label="' + fr["search.aria_label"] + '"', "g")) || []).length, 2, f + " : nom accessible du champ et de la zone de recherche");
    assert.ok(band.includes('aria-label="' + fr["search.clear"] + '"'), f + " : bouton d'effacement");
  });
});

test("js/search.js anime la bande existante (sans doublon) et ne l'injecte qu'en repli", () => {
  const src = read("js/search.js");
  assert.match(src, /root = header\.querySelector\("\.wsy-search"\);\s*if \(!root\) \{[\s\S]*?header\.appendChild\(root\);/, "injection seulement si la bande est absente");
  /* la réserve d'espace CSS reste un filet pour toute page future sans bande statique */
  assert.match(read("css/search.css"), /body:not\(\.faqc-page\) \.site-header:not\(:has\(\.wsy-search\)\)::after/);
});
