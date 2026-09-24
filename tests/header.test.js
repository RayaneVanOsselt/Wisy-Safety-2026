"use strict";
/* En-tête partagé : l'accès « Centre d'aide » doit exister, rester visible sur mobile
   (cause du bug : `.header-actions{display:none}` masquait l'icône) et être identique
   sur les 8 pages. `node --test tests/*.test.js` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const PAGES = ["index", "formations", "contact", "avis", "inscription", "formation-nacelles-elevatrices", "faq", "agenda", "peb-wallonie-bruxelles"];

PAGES.forEach((name) => {
  test("[" + name + ".html] accès Centre d'aide : icône d'en-tête, lien de la barre utilitaire, rangée du menu mobile", () => {
    const html = read(name + ".html");
    const isFaq = name === "faq";

    /* 1) feuille partagée, après i18n.css */
    const i = html.indexOf('href="css/i18n.css"'), j = html.indexOf('href="css/site-header.css"');
    assert.ok(i > 0 && j > i, "css/site-header.css chargé après css/i18n.css");
    assert.equal((html.match(/css\/site-header\.css/g) || []).length, 1);

    /* 2) l'icône n'est PAS dans .header-actions (masqué ≤ 1359 px) : elle est un enfant direct de .main-inner */
    const actions = html.match(/<div class="header-actions">[\s\S]*?<\/div>/)[0];
    assert.doesNotMatch(actions, /header-help/, "l'icône n'est plus dans .header-actions");
    assert.match(html, /<a class="header-help" href="faq\.html"[^>]*aria-label="Centre d'aide"[^>]*data-tip="Centre d'aide"/, "lien d'en-tête nommé");
    assert.match(html, /data-i18n-attr="aria-label:footer\.faq,data-tip:footer\.faq"/, "nom accessible et info-bulle traduits");
    assert.doesNotMatch(html, /^\.header-help\{/m, "plus de règle .header-help inlinée (tout est dans css/site-header.css)");

    /* 3) ordre DOM = ordre visuel du groupe d'actions : l'icône précède Contact / S'inscrire */
    assert.ok(html.indexOf('class="header-help"') < html.indexOf('class="header-actions"'), "icône avant les boutons");

    /* 4) barre utilitaire (desktop) et menu mobile */
    assert.match(html, /<a class="util-help" href="faq\.html"/, "lien libellé dans la barre utilitaire");
    const mHelp = html.match(/<a class="m-help" href="faq\.html"[^>]*>/);
    assert.ok(mHelp, "rangée « Centre d'aide » dans le menu mobile");
    assert.ok(html.indexOf('class="m-help"') < html.indexOf('class="m-actions"'), "rangée avant les boutons d'action");
    assert.doesNotMatch(html.slice(html.indexOf('class="m-nav"'), html.indexOf("</ul>", html.indexOf('class="m-nav"'))), /footer\.faq/, "plus enfouie parmi les liens morts du menu");

    /* 5) état actif uniquement sur la page Centre d'aide */
    const currents = (html.match(/(header-help|util-help|m-help)[^>]*aria-current="page"/g) || []).length;
    assert.equal(currents, isFaq ? 3 : 0, "aria-current=\"page\" seulement sur faq.html");

    /* 6) assistant : SEUL le launcher est chargé d'emblée (moteur + panneau : à la demande) */
    assert.match(html, /<script defer src="js\/assistant\/launcher\.js"><\/script>/, "launcher.js en defer");
    assert.doesNotMatch(html, /<script[^>]+js\/assistant\/(knowledge|retrieval|validation|responder|assistant|mascot)\.js/, "aucun script du moteur sur le chemin critique");
    const d = html.indexOf("js/faq-data.js"), s = html.indexOf("js/faq-search.js"), l = html.indexOf("js/assistant/launcher.js");
    if (isFaq) assert.ok(d > 0 && d < s && s < l, "faq-data.js → faq-search.js → launcher.js (la page les utilise elle-même)");
    else assert.ok(d < 0 && s < 0, "les données FAQ ne sont plus chargées d'emblée hors du Centre d'aide");
    assert.equal((html.match(/css\/assistant\.css/g) || []).length, 1, "feuille du launcher");
    assert.doesNotMatch(html, /css\/assistant-panel\.css/, "la feuille du panneau se charge à la demande");
  });
});

test("css/site-header.css : l'icône n'est jamais masquée, cibles tactiles ≥ 44 px, focus visible", () => {
  const css = read("css/site-header.css").replace(/\/\*[\s\S]*?\*\//g, ""); // sans les commentaires
  /* aucune règle display:none ne cible .header-help lui-même */
  css.split("}").forEach((rule) => {
    if (/display:\s*none/.test(rule)) assert.doesNotMatch(rule.split("{")[0], /\.header-help(?!\s*::after)/, "règle masquant l'icône : " + rule.trim().slice(0, 80));
  });
  assert.match(css, /\.header-help\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/s, "icône 44 × 44 px");
  assert.match(css, /\.lang-btn\s*\{\s*min-height:\s*44px/, "sélecteur de langue ≥ 44 px sur mobile");
  assert.match(css, /\.header-help:focus-visible/, "focus visible");
  assert.match(css, /\.header-help\[aria-current="page"\]/, "état actif (forme + remplissage)");
  assert.match(css, /@media \(max-width: 1359px\)[\s\S]*\.header-actions\s*\{\s*display:\s*none/, "seules les actions sont masquées en mode hamburger");
  assert.match(css, /prefers-reduced-motion: reduce/, "mouvement réduit respecté");
  /* aucune couleur hors palette */
  const HEX = new Set(["#1f6f64", "#2f7d8c", "#48d6c2", "#3fa69b", "#f4faf9", "#5e6d6a", "#1b2d28"]);
  (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach((h) => assert.ok(HEX.has(h.toLowerCase()), "couleur hors palette : " + h));
});

test("le breakpoint du hamburger (≤ 1359 px) remplace la nav cassée : nav sur une seule ligne au-dessus", () => {
  const css = read("css/site-header.css");
  assert.match(css, /@media \(min-width: 1360px\)[\s\S]*white-space:\s*nowrap/, "pas de retour à la ligne des entrées de nav ≥ 1360 px");
});
