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
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda", "peb-wallonie-bruxelles", "formation-beps-premiers-secours", "formation-vca-base", "article-vca-cout-financement", "article-vca-erreurs-examen"].map((n) => n + ".html");
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

test("image LCP des pages : jamais en lazy (nacelles) ; index : affiche du logo animé (WebP) préchargée en priorité haute", () => {
  const nac = noScripts(read("formation-nacelles-elevatrices.html"));
  const hero = nac.match(/<img\b[^>]*nacelles-hero-800[^>]*>/)[0];
  assert.doesNotMatch(hero, /loading="lazy"/, "l'image principale n'est pas différée");
  assert.match(hero, /fetchpriority="high"/);
  /* Accueil : l'élément principal est l'écran de la vidéo du logo — son affiche (1re image) est peinte sans attendre le média. */
  const idx = read("index.html");
  assert.match(idx, /<link rel="preload" href="assets\/videos\/accueil\/logo-animation-debut\.webp" as="image" type="image\/webp" fetchpriority="high">/);
  assert.match(idx, /poster="assets\/videos\/accueil\/logo-animation-debut\.webp"/);
  assert.equal((idx.match(/rel="preload"[^>]*as="image"/g) || []).length, 1, "une seule image préchargée");
  ["logo-animation-debut.webp", "logo-animation-fin.webp", "poster.webp"].forEach((f) => assert.ok(size("assets/videos/accueil/" + f) < 100 * KB, "affiche < 100 Ko : " + f));
  /* sous 0,05 bit/pixel affiché, Chrome ignore une image « de faible entropie » pour le LCP : l'affiche doit rester au-dessus */
  assert.ok(size("assets/videos/accueil/logo-animation-debut.webp") * 8 / (960 * 1200) > 0.05, "affiche assez détaillée pour compter comme LCP (écran 2x)");
});

test("vidéos d'accueil : jamais préchargées d'office, jamais en mouvement réduit / économie de données, sans son, légères", () => {
  const idx = read("index.html");
  /* le choix est fait AVANT le premier affichage par le script du <head> : html.home-still = aucune vidéo */
  const head = idx.slice(0, idx.indexOf("</head>"));
  assert.match(head, /prefers-reduced-motion: reduce[^;]*\|\|c\.saveData\)\{r\.classList\.add\("home-still"\);return;\}/, "mouvement réduit / économie de données → image fixe");
  /* vidéo du logo : l'intro (1re visite de la session) la charge tout de suite — c'est alors le contenu principal ;
     sinon, ses sources ne sont posées qu'après l'événement load, pour ne pas concurrencer le contenu critique */
  const tag = idx.match(/<video[^>]*id="homeLogoVideo"[^>]*>/)[0];
  assert.match(tag, /preload="none"/, "aucun préchargement dans le HTML");
  assert.match(tag, /aria-hidden="true"/); assert.match(tag, /muted/); assert.match(tag, /playsinline/);
  const script = idx.slice(idx.indexOf("Vidéo du logo : l'AFFICHE"), idx.indexOf("})();", idx.indexOf("Vidéo du logo : l'AFFICHE")));
  assert.match(script, /classList\.contains\('home-still'\)\)return;/, "rien n'est chargé en mouvement réduit / économie de données");
  assert.match(script, /addEventListener\('load',start/, "hors intro : chargement après l'événement load");
  assert.match(script, /logo-animation-480\.mp4/, "petits écrans : version 480 px");
  /* vidéo « VCA Entreprise » : sans source dans le HTML, posée par js/home.js à l'approche de la section */
  const biz = idx.match(/<video[^>]*id="homeBizVideo"[^>]*>/)[0];
  assert.match(biz, /preload="none"/); assert.match(biz, /muted/); assert.match(biz, /playsinline/); assert.doesNotMatch(biz, /\ssrc=/);
  const js = read("js/home.js");
  assert.match(js, /biz && !still && hasIO/, "pas de vidéo « entreprise » en mouvement réduit / économie de données");
  assert.match(js, /rootMargin: "300px 0px"/, "chargée seulement à l'approche de la section");
  /* poids : versions web du logo animé (8 s, sans piste audio) */
  assert.ok(size("assets/videos/accueil/logo-animation-720.mp4") < 1000 * KB, "logo animé 720 px < 1 Mo");
  assert.ok(size("assets/videos/accueil/logo-animation-480.mp4") < 550 * KB, "logo animé 480 px < 550 Ko");
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
  /* site-content (+ 2 articles, VCA Base) 16 → 20 Ko ; trainings-data (+ fiche VCA Base : programme, sources officielles) 14 → 18 Ko ;
     search.js 42 → 46 Ko (groupes Articles / Sessions, suggestions, état de chargement). */
  const budget = { "js/site-content.js": 20, "js/search.js": 46, "js/i18n.js": 8, "js/trainings-data.js": 18, "js/assistant/launcher.js": 30, "css/search.css": 17, "css/site-header.css": 12, "css/assistant.css": 18, "css/fonts.css": 6 };
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
