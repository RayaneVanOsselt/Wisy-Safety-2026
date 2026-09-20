"use strict";
/* Garde-fous de performance et d'images (Core Web Vitals) : poids des images, dimensions déclarées
   (anti-CLS), attributs alt, chargement différé, vidéo d'accueil, iframes, polices, JS partagé.
   Ces seuils reflètent l'état OPTIMISÉ : ils échouent si une image lourde ou non dimensionnée revient.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda"].map((n) => n + ".html");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const noScripts = (html) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
const attrOf = (tag, name) => { const m = tag.match(new RegExp("\\s" + name + '="([^"]*)"')); return m ? m[1] : null; };
const KB = 1024;

/* Toutes les images que le navigateur peut charger : <img src|srcset>, <source srcset>, poster, preload, JS. */
function referencedImages() {
  const set = new Map();                                    // fichier → « où »
  const add = (u, where) => { u = decodeURI(u.split("?")[0]); if (/\.(png|jpe?g|webp|avif|gif)$/i.test(u) && !u.startsWith("data:") && !/^https?:/.test(u)) set.set(u, (set.get(u) || []).concat(where)); };
  PAGES.forEach((f) => {
    const html = noScripts(read(f));
    for (const m of html.matchAll(/<(img|source|video|link)\b[^>]*>/gi)) {
      ["src", "poster", "href"].forEach((a) => { const v = attrOf(m[0], a); if (v) add(v, f); });
      ["srcset", "imagesrcset"].forEach((a) => { const v = attrOf(m[0], a); if (v) v.split(",").forEach((s) => add(s.trim().split(/\s+/)[0], f)); });
    }
  });
  const reg = read("js/registration-data.js");
  for (const m of reg.matchAll(/image:\s*"([^"]+)"/g)) add(m[1], "registration-data.js");
  return set;
}

test("aucune image chargée par le site ne dépasse 200 Ko ; les visuels par défaut restent légers", () => {
  const heavy = [];
  referencedImages().forEach((where, file) => {
    assert.ok(fs.existsSync(path.join(ROOT, file)), "image introuvable : " + file);
    const kb = size(file) / KB;
    if (kb > 200) heavy.push(file + " " + Math.round(kb) + " Ko (" + where[0] + ")");
  });
  assert.deepEqual(heavy, [], "originaux lourds à remplacer par un dérivé optimisé (python3 scripts/optimize-images.py)");
});

test("logos, icônes et logos partenaires : formats modernes et poids minimal", () => {
  assert.ok(size("assets/images/logo/logo-102.webp") < 12 * KB, "logo 102 px");
  assert.ok(size("assets/images/logo/logo-204.webp") < 25 * KB, "logo 204 px");
  fs.readdirSync(path.join(ROOT, "assets/images/partenaires")).filter((f) => /-240\.webp$/.test(f)).forEach((f) => assert.ok(size("assets/images/partenaires/" + f) < 10 * KB, "partenaire " + f));
  assert.equal(fs.readdirSync(path.join(ROOT, "assets/images/partenaires")).filter((f) => /-240\.webp$/.test(f)).length, 6, "6 logos partenaires optimisés");
  PAGES.forEach((f) => assert.doesNotMatch(noScripts(read(f)), /src="assets\/logo\.png"/, f + " : le logo PNG de 76 Ko n'est plus chargé"));
});

test("chaque <img> : alt présent (vide si décorative) ; largeur ET hauteur déclarées (aucun décalage de mise en page)", () => {
  const bad = [];
  PAGES.forEach((f) => {
    for (const m of noScripts(read(f)).matchAll(/<img\b[^>]*>/gi)) {
      const t = m[0], src = (attrOf(t, "src") || "").slice(0, 50);
      if (attrOf(t, "alt") === null) bad.push(f + " : alt manquant → " + src);
      if (!attrOf(t, "width") || !attrOf(t, "height")) bad.push(f + " : width/height manquants → " + src);
    }
  });
  assert.deepEqual(bad, []);
});

test("images sous la ligne de flottaison : chargement différé (pied de page, partenaires, cartes)", () => {
  const bad = [];
  PAGES.forEach((f) => {
    for (const m of noScripts(read(f)).matchAll(/<img\b[^>]*>/gi)) {
      const t = m[0], cls = attrOf(t, "class") || "";
      const below = /f-brand__logo|fo-card__img|nac-card|hex__face/.test(cls) || /partenaires\//.test(attrOf(t, "src") || "");
      if (below && attrOf(t, "loading") !== "lazy" && !/nacelles-hero/.test(t)) bad.push(f + " : " + (attrOf(t, "src") || "").slice(0, 50));
    }
  });
  assert.deepEqual(bad, []);
});

test("image LCP des pages : jamais en lazy (nacelles) ; index : affiche vidéo WebP préchargée en priorité haute", () => {
  const nac = noScripts(read("formation-nacelles-elevatrices.html"));
  const hero = nac.match(/<img\b[^>]*nacelles-hero-800[^>]*>/)[0];
  assert.doesNotMatch(hero, /loading="lazy"/, "l'image principale n'est pas différée");
  assert.match(hero, /fetchpriority="high"/);
  const idx = read("index.html");
  assert.match(idx, /<link rel="preload" href="assets\/videos\/Accueil\/poster\.webp" as="image" type="image\/webp" fetchpriority="high">/);
  assert.match(idx, /poster="assets\/videos\/Accueil\/poster\.webp"/);
  assert.ok(size("assets/videos/Accueil/poster.webp") < 100 * KB, "affiche < 100 Ko");
});

test("vidéo d'accueil : sources injectées APRÈS le chargement, jamais en mouvement réduit / économie de données", () => {
  const idx = read("index.html");
  const tag = idx.match(/<video[^>]*id="heroVideo"[^>]*>/)[0];
  assert.doesNotMatch(tag, /preload="auto"/, "plus de pré-chargement automatique");
  assert.match(tag, /aria-hidden="true"/); assert.match(tag, /muted/); assert.match(tag, /playsinline/);
  const script = idx.slice(idx.indexOf("Hero vidéo : l'AFFICHE"), idx.indexOf("})();", idx.indexOf("Hero vidéo : l'AFFICHE")));
  assert.match(script, /prefers-reduced-motion: reduce/, "respecte la préférence de mouvement réduit");
  assert.match(script, /saveData/, "respecte l'économie de données");
  assert.match(script, /addEventListener\('load',start/, "chargement après l'événement load");
});

test("iframes : chargement différé, titre accessible et politique de référent", () => {
  PAGES.forEach((f) => {
    for (const m of noScripts(read(f)).matchAll(/<iframe\b[^>]*>/gi)) {
      assert.equal(attrOf(m[0], "loading"), "lazy", f + " : iframe en lazy");
      assert.ok((attrOf(m[0], "title") || "").length > 10, f + " : iframe titrée");
      assert.ok(attrOf(m[0], "referrerpolicy"), f + " : referrerpolicy");
    }
  });
});

test("JS et CSS partagés : budgets non minifiés (chemin critique de chaque page)", () => {
  const budget = { "js/site-content.js": 16, "js/search.js": 42, "js/i18n.js": 8, "js/trainings-data.js": 8, "js/assistant/launcher.js": 30, "css/search.css": 17, "css/site-header.css": 12, "css/assistant.css": 18, "css/fonts.css": 6 };
  Object.keys(budget).forEach((f) => assert.ok(size(f) <= budget[f] * KB, f + " : " + Math.round(size(f) / KB) + " Ko > " + budget[f] + " Ko"));
  /* le FAQ (37 Ko) n'est JAMAIS sur le chemin critique : il ne se charge qu'à la première utilisation de la recherche */
  PAGES.filter((f) => f !== "faq.html").forEach((f) => assert.doesNotMatch(read(f), /<script[^>]+js\/faq-data\.js/, f + " : faq-data.js chargé d'emblée"));
});

test("polices : poids raisonnable, seul le critique est préchargé", () => {
  const fonts = fs.readdirSync(path.join(ROOT, "assets/fonts")).filter((f) => f.endsWith(".woff2"));
  assert.ok(fonts.length <= 9, "au plus 9 fichiers de police (sous-ensembles)");
  const critical = ["inter-latin.woff2", "poppins-600-latin.woff2", "poppins-700-latin.woff2"].reduce((n, f) => n + size("assets/fonts/" + f), 0);
  assert.ok(critical < 70 * KB, "polices critiques préchargées : " + Math.round(critical / KB) + " Ko");
});
