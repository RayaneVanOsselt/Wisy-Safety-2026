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
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda", "peb-wallonie-bruxelles", "formation-beps-premiers-secours", "formation-vca-base", "vca-entreprise", "article-vca-cout-financement", "article-vca-erreurs-examen", "coordination", "mentions-legales", "politique-de-confidentialite", "conditions-generales-utilisation", "formation-vca-ligne-hierarchique", "formation-diisocyanates", "formation-fibre-optique", "article-fibre-parcours-professionnels", "article-fibre-devenir-expert"].map((n) => n + ".html");

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

/* ------------------------------------------------------------------ barre « suggestive » (d'après Aceternity UI, 21st.dev) */
const I18N_ALL = (() => {
  const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
  ["common", "search"].forEach((n) => vm.runInContext(read("js/i18n-data-" + n + ".js"), ctx));
  return ctx.window.I18N;
})();
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

test("suggestions animées : 7 vraies recherches par langue, gabarit {q}, nom du bouton d'envoi — dans les 10 langues", () => {
  LANGS.forEach((l) => {
    const d = I18N_ALL[l], list = d["search.fx_list"].split("|");
    assert.equal(list.length, 7, l + " : 7 suggestions");
    list.forEach((q) => assert.ok(q.trim() && q.trim() === q && q.length <= 40, l + " : suggestion propre et courte « " + q + " »"));
    assert.equal(new Set(list).size, 7, l + " : aucune suggestion en double");
    assert.ok(d["search.fx_try"].includes("{q}"), l + " : gabarit avec {q}");
    assert.ok(d["search.go"] && d["search.go"].trim(), l + " : nom accessible du bouton d'envoi");
  });
});

test("bande : calque des suggestions masqué aux lecteurs d'écran, bouton d'envoi désactivé tant que le champ est vide", () => {
  PAGES.forEach((f) => {
    const band = staticBand(read(f));
    assert.ok(band.includes('<span class="wsy-search__fx" aria-hidden="true"></span>'), f + " : calque des suggestions");
    assert.ok(band.includes('<button class="wsy-search__go" type="button" disabled aria-label="' + fr["search.go"] + '">'), f + " : bouton d'envoi nommé, désactivé au départ");
  });
});

test("mouvement et robustesse : rien d'animé en mouvement réduit, suggestions limitées à 2 tours hors focus, navigation jamais bloquée", () => {
  const src = read("js/search.js");
  assert.match(src, /if \(fx && !reduceMotion\) \{ root\.classList\.add\("is-fx"\); fxStart\(\); \}/, "suggestions animées seulement sans mouvement réduit");
  assert.match(src, /if \(reduceMotion \|\| !text\.trim\(\) \|\| !W\) \{ done\(\); return; \}/, "dissolution ignorée en mouvement réduit");
  assert.match(src, /document\.activeElement !== input && fxTurns >= 2\) \{ fxStop\(\); return; \}/, "pas de défilement infini hors focus");
  assert.match(src, /setTimeout\(finish, 1100\)/, "filet de sécurité : la navigation a lieu même si requestAnimationFrame est suspendu");
  assert.match(src, /if \(document\.hidden \|\| root\.classList\.contains\("has-text"\)\) return;/, "pause quand l'onglet est masqué ou que l'on tape");
  assert.match(read("css/search.css"), /\.wsy-search\.is-entering \.wsy-search__item \{ animation: none; \}/, "cascade coupée en mouvement réduit");
});

test("mode Spotlight : filtres, aperçu et pastilles « Essayez » dans la bande ; voile au niveau du <body> ; tarif de l'aperçu = règles de la liste", () => {
  const src = read("js/search.js");
  PAGES.forEach((f) => {
    const band = staticBand(read(f));
    ["wsy-search__tries", "wsy-search__scopes", "wsy-search__main", "wsy-search__preview"].forEach((c) => assert.ok(band.includes('<div class="' + c + '">'), f + " : " + c));
  });
  assert.match(src, /document\.body\.appendChild\(scrim\)/, "voile hors de la bande (son backdrop-filter piégerait un position:fixed)");
  assert.match(src, /x\.priceLabel && x\.priceUnit === "participant" \?/, "aperçu : tarif « par personne » confirmé seulement");
  assert.match(src, /x\.priceIndicative \? " · " \+ t\("search\.indicative"\)/, "aperçu : « tarif indicatif » signalé");
  assert.match(src, /var path = e\.composedPath \? e\.composedPath\(\) : \[e\.target\];/, "clic sur un filtre re-rendu : le panneau reste ouvert");
  LANGS.forEach((l) => ["search.scope_all", "search.pv_open", "search.pv_call", "search.pv_mail", "search.try"].forEach((k) =>
    assert.ok(I18N_ALL[l][k] && I18N_ALL[l][k].trim(), l + " : " + k)));
});

