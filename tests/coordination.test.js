"use strict";
/* Page « WiSy Coordination » (coordination.html) — v3 interactive : sections retirées à la demande du propriétaire,
   chapitres cohérents (sommaire du hero, rail, intertitres), équivalent sans JavaScript de chaque composant interactif,
   simulateur limité au texte légal vérifié, lien « Demander ce service » → formulaire, RÈGLE « rien d'inventé ».
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Data = require("../js/coordination-data.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const A = {
  match: (s, re, msg) => assert.ok(re.test(String(s)), (msg || "") + " — motif introuvable : " + re),
  doesNotMatch: (s, re, msg) => { const m = re.exec(String(s)); assert.ok(!m, (msg || "") + " — trouvé : « " + (m ? m[0].slice(0, 90) : "") + " »"); }
};
const HTML = read("coordination.html");
const CSS = read("css/coordination.css");
const JS = read("js/coordination.js");
const MAIN = HTML.slice(HTML.indexOf("<main"), HTML.indexOf("</main>") + 7);
const visible = (h) => h.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<svg\b[\s\S]*?<\/svg>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const I18N = (() => { const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx); vm.runInContext(read("js/i18n-data-coordination.js"), ctx); return ctx.window.I18N; })();
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];
const all = (re, s) => [...String(s).matchAll(re)].map((m) => m[1]);

test("sections retirées (La mission, Vue d'ensemble / Coordination Control, Domaines d'intervention) : absentes partout", () => {
  [["HTML", HTML], ["CSS", CSS], ["JS", JS]].forEach(([n, s]) => A.doesNotMatch(s, /co-(mission|control|domains?|timeline)\b|data-(timeline|control-rail)|modal-domain/, n));
  LANGS.forEach((l) => Object.keys(I18N[l]).forEach((k) => A.doesNotMatch(k, /^coord\.(mission|control|domains?_|domain\d|modal_)/, l + " : clé " + k)));
  A.doesNotMatch(visible(MAIN), /Domaines d'intervention|Coordination Control|Vue d'ensemble|La mission/, "texte visible");
});

test("chapitres : sommaire du hero, rail et intertitres — 6 chapitres, même ordre, ancres existantes, numérotés 01 → 06", () => {
  const toc = all(/<ol class="co-toc__list">([\s\S]*?)<\/ol>/g, HTML)[0];
  const rail = all(/<div class="co-rail"[^>]*>([\s\S]*?)<\/div>/g, HTML)[0];
  const tocHrefs = all(/<a href="#([^"]+)"/g, toc), railHrefs = all(/<a href="#([^"]+)"/g, rail);
  assert.deepEqual(tocHrefs, ["co-why", "co-legal", "co-services", "co-process", "co-team", "co-cta"]);
  assert.deepEqual(railHrefs, tocHrefs, "le rail reprend exactement le sommaire");
  const sections = all(/<section class="[^"]*" id="([^"]+)"/g, MAIN);
  assert.deepEqual(sections, ["co-hero-top"].concat(tocHrefs), "ordre des sections = ordre du sommaire");
  assert.deepEqual(all(/<span class="co-kicker__n">(\d\d)<\/span>/g, MAIN), ["01", "02", "03", "04", "05", "06"]);
  assert.deepEqual(all(/<span class="co-toc__n">(\d\d)<\/span>/g, toc), ["01", "02", "03", "04", "05", "06"]);
  LANGS.forEach((l) => {
    const labels = ["why", "legal", "services", "process", "team", "cta"].map((k) => I18N[l]["coord." + k + "_kicker"]);
    assert.equal(new Set(labels).size, 6, l + " : six intitulés distincts dans le sommaire (" + labels.join(" | ") + ")");
    labels.forEach((t) => A.doesNotMatch(t, /^\d/, l + " : le numéro de chapitre est dans le HTML, pas dans la traduction"));
  });
});

test("sans JavaScript, tout reste lisible : fiches empilées, accordéons ouverts, commandes interactives masquées", () => {
  assert.equal((MAIN.match(/data-explore-tab>/g) || []).length, 4, "4 onglets piliers");
  assert.equal((MAIN.match(/data-explore-panel>/g) || []).length, 4, "4 fiches piliers");
  assert.equal((MAIN.match(/data-steps-tab>/g) || []).length, 5, "5 étapes (onglets)");
  assert.equal((MAIN.match(/data-steps-panel>/g) || []).length, 5, "5 étapes (fiches)");
  A.match(CSS, /\.co-explore__tabs\{display:none;/, "onglets des piliers masqués tant que le JS n'a pas pris la main");
  A.match(CSS, /\.co-explore\.is-ready \.co-explore__tabs\{display:flex\}/);
  A.match(CSS, /\.co-steps__track\{display:none;/, "frise de la méthode masquée sans JS");
  A.match(CSS, /\.co-svc__body\{position:relative;z-index:1;display:grid;grid-template-rows:1fr\}/, "services dépliés sans JS");
  A.match(MAIN, /<div class="co-sim" data-sim data-state="many" hidden>/, "simulateur masqué sans JS (le texte légal reste affiché)");
  A.match(MAIN, /data-steps-nav hidden/); A.match(MAIN, /data-explore-next hidden/);
  A.match(CSS, /\.co-main \[hidden\]\{display:none!important\}/, "hidden l'emporte sur le display des boutons");
  /* chaque en-tête de service pilote son panneau */
  all(/aria-controls="(co-svc-\d)"/g, MAIN).forEach((id) => A.match(MAIN, new RegExp('<div class="co-svc__body" id="' + id + '" role="region" aria-labelledby="' + id + '-head">'), id));
});

test("simulateur « le déclencheur » : illustre le texte légal vérifié, sans seuil ni avis juridique inventé", () => {
  const sim = MAIN.slice(MAIN.indexOf('<div class="co-sim"'), MAIN.indexOf("</article>", MAIN.indexOf('<div class="co-sim"')));
  A.match(MAIN, /data-i18n="coord\.legal_card1_text">Dès qu'un chantier temporaire ou mobile réunit plusieurs entrepreneurs — simultanément ou successivement — un coordinateur sécurité-santé doit être désigné\.</, "texte légal affiché au-dessus du simulateur");
  A.match(sim, /data-i18n="coord\.sim_note"/, "mention « pas un avis juridique » toujours visible avec le simulateur");
  LANGS.forEach((l) => {
    Object.keys(I18N[l]).filter((k) => /^coord\.sim_/.test(k)).forEach((k) => A.doesNotMatch(I18N[l][k], /\d/, l + " · " + k + " : aucun chiffre (seuil, niveau, délai) inventé"));
  });
  A.match(I18N.fr["coord.sim_note"], /pas un avis juridique/);
  ["coord.sim_yes", "coord.sim_no", "coord.sim_one", "coord.sim_many_sim", "coord.sim_many_succ"].forEach((k) => {
    A.match(JS, new RegExp('"' + k.replace(".", "\\.") + '"'), "clé posée par le script : " + k);
    LANGS.forEach((l) => assert.ok(I18N[l][k], l + " : " + k));
  });
  A.match(JS, /const MIN = 1, MAX = 6;/, "de 1 à 6 entreprises");
  A.match(JS, /setAttribute\("data-i18n", key\)/, "le texte posé suit la langue (data-i18n mis à jour)");
});

test("« Demander ce service » : chaque service de la section 03 coche sa case dans le formulaire", () => {
  const picks = all(/data-svc-pick="([^"]+)"/g, MAIN), boxes = all(/<input type="checkbox" name="services" value="([^"]+)">/g, MAIN);
  assert.deepEqual(picks, ["coordination", "conseiller", "audit", "documents"]);
  assert.deepEqual(boxes, picks, "une case par service, même ordre");
  const titles = all(/<span class="co-svc__tt" data-i18n="([^"]+)"/g, MAIN), labels = all(/<span class="co-pick__box"[\s\S]*?<\/span><span data-i18n="([^"]+)"/g, MAIN);
  assert.deepEqual(labels, titles, "libellés des cases = titres des services (même clé de traduction)");
  A.match(JS, /"Services souhaités : "/, "services cochés repris dans le message envoyé");
});

test("rien d'inventé : équipe vide assumée, aucune affirmation non confirmée (agrément, zone, ancienneté, volume, tarif)", () => {
  assert.deepEqual(Data.TEAM, [], "TEAM reste vide tant qu'aucune personne réelle n'est fournie");
  A.match(MAIN, /data-team-empty>/); A.match(MAIN, /<div class="co-team__grid" data-team-list hidden><\/div>/);
  A.doesNotMatch(visible(MAIN), /agréé|agrément|€|tarif|\bans d'expérience|chantiers suivis|projets suivis|Flandre|Wallonie|Bruxelles|certifi|témoign/i, "texte visible de la page");
  LANGS.forEach((l) => A.doesNotMatch(Object.values(I18N[l]).join(" "), /€|\d+\s*(ans|years|jaar|jahre)\b/i, l));
});

test("accessibilité et mouvement : rail décoratif hors tabulation, boutons icônes nommés, aucune animation infinie", () => {
  A.match(HTML, /<div class="co-rail" data-rail aria-hidden="true">/);
  assert.equal((HTML.match(/data-rail-link/g) || []).length, 6);
  assert.equal((HTML.match(/<a href="#[^"]+" tabindex="-1" data-rail-link>/g) || []).length, 6, "liens du rail hors tabulation");
  A.match(MAIN, /data-sim-step="-1" aria-label="Retirer une entreprise" data-i18n-attr="aria-label:coord\.sim_minus"/);
  A.match(MAIN, /data-sim-step="1" aria-label="Ajouter une entreprise" data-i18n-attr="aria-label:coord\.sim_plus"/);
  A.match(MAIN, /data-steps-prev aria-label="Précédent" data-i18n-attr="aria-label:coord\.prev"/);
  A.match(MAIN, /role="radiogroup" aria-labelledby="co-sim-mode-label"/);
  A.doesNotMatch(CSS, /infinite/, "css/coordination.css");
  A.match(JS, /if \(reducedMotion\(\)\) return;\n    const visual/, "loupe et parallaxe désactivées en mouvement réduit");
  A.match(JS, /e\.pointerType !== "mouse"/, "loupe : souris uniquement (jamais au toucher)");
});
