#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Générateur SEO (aucune dépendance, aucun build de production)

       node scripts/build-seo.js           → (ré)écrit sitemap.xml, robots.txt et le bloc SEO du <head>
       node scripts/build-seo.js --check   → échoue si l'un d'eux n'est plus à jour (utilisé par les tests)

   Ce que ça produit, à partir d'UNE source — js/site-content.js (pages, formations), js/faq-data.js
   (coordonnées, horaires, position) et js/trainings-data.js (faits de la formation à page dédiée) :

     • sitemap.xml   les pages publiques (URLs canoniques absolues) — jamais les pages techniques
     • robots.txt    tout est explorable ; référence du sitemap
     • dans le <head> de chaque page, entre les marqueurs « seo:start / seo:end » :
         canonical absolu · Open Graph · Twitter · theme-color · données structurées JSON-LD
       (les pages techniques — 404, admin, maquettes — reçoivent uniquement `noindex`)

   Le <title> et la meta description restent écrits À LA MAIN dans chaque page (ils sont traduits par
   l'i18n) : le générateur les lit pour en faire le titre/la description de partage. Rien n'est inventé :
   chaque donnée structurée reprend un fait déjà affiché sur le site (tests/seo.test.js le vérifie).

   Ajouter une page publique : l'ajouter à js/site-content.js (PAGES) ET à DOCS ci-dessous, puis relancer.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const Site = require("../js/site-content.js");
const FAQ = require("../js/faq-data.js");
const Trainings = require("../js/trainings-data.js");

const ORIGIN = Site.ORIGIN;
const C = FAQ.CONTACT;
const ORG_ID = ORIGIN + "/#organization";
const HEAD_START = "<!-- seo:start — bloc généré par scripts/build-seo.js (registre du site + coordonnées) ; ne pas éditer à la main -->";
const HEAD_END = "<!-- seo:end -->";

/* Carte de partage par défaut (générée par scripts/optimize-images.py --og). */
const OG_DEFAULT = {
  file: "assets/images/og/wisy-safety-og-1200x630.jpg", width: 1200, height: 630,
  alt: "Wisy Safety — La sécurité comme une référence. Formations sécurité à Anderlecht, Bruxelles"
};
const N = Trainings.nacelles;
const OG_NACELLES = { file: N.images.og, width: 1200, height: 630, alt: N.imageAlt };

/* Pages indexables. `graph` = nœuds JSON-LD ; `breadcrumb` = fil d'Ariane AFFICHÉ sur la page (les
   données structurées ne décrivent que ce que le visiteur voit). */
const DOCS = [
  { file: "index.html", graph: ["organization", "website"] },
  { file: "formations.html", graph: ["organization", "courseList"] },
  { file: "formation-nacelles-elevatrices.html", graph: ["organization", "breadcrumb", "course"], image: OG_NACELLES,
    breadcrumb: [["Accueil", "index.html"], ["Formations", "formations.html"], ["Nacelles élévatrices", "formation-nacelles-elevatrices.html"]] },
  { file: "inscription.html", graph: ["organization"] },
  { file: "contact.html", graph: ["organization", "contactPage"] },
  { file: "avis.html", graph: ["organization"] },
  { file: "faq.html", graph: ["organization"] },   /* FAQPage : injecté par js/faq-page.js depuis les questions affichées */
  { file: "agenda.html", graph: ["organization", "breadcrumb"], breadcrumb: [["Accueil", "index.html"], ["Agenda", "agenda.html"]] }
];
/* Pages techniques : jamais indexées, jamais dans le sitemap. */
const TECHNICAL = ["404.html", "admin/avis.html", "docs/maquettes/wisy-safety-header.html", "docs/maquettes/wisy-safety-footer.html"];

/* ------------------------------------------------------------------ utilitaires */
const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));

/* Textes français AFFICHÉS sur le site (clés i18n) : les données structurées reprennent ces libellés
   mot pour mot (ex. « VCA de base », titre visible de la carte), pas ceux de l'assistant. */
let FR = null;
function fr(key) {
  if (!FR) {
    const ctx = { window: {} }; ctx.window.I18N = {}; vm.createContext(ctx);
    ["common", "search", "formations", "home", "nacelles"].forEach((n) => vm.runInContext(read("js/i18n-data-" + n + ".js"), ctx));
    FR = ctx.window.I18N.fr;
  }
  return FR[key];
}

function metaOf(html) {
  const title = decode(((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim());
  const tag = (html.match(/<meta\s[^>]*name="description"[^>]*>/i) || [])[0] || "";
  const description = decode((tag.match(/\scontent="([^"]*)"/i) || [])[1] || "");
  return { title, description };
}

/* ------------------------------------------------------------------ JSON-LD */
function organization() {
  return {
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": ORG_ID,
    name: C.company,
    url: ORIGIN + "/",
    logo: ORIGIN + "/assets/logo.png",
    image: ORIGIN + "/" + OG_DEFAULT.file,
    email: C.email,
    telephone: C.phone.replace(/\s+/g, ""),
    address: { "@type": "PostalAddress", streetAddress: C.street, postalCode: C.postalCode, addressLocality: C.city, addressCountry: "BE" },
    geo: { "@type": "GeoCoordinates", latitude: C.geo.latitude, longitude: C.geo.longitude },
    openingHoursSpecification: C.openingHours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes }))
  };
}
const providerOf = () => ({ "@type": "EducationalOrganization", name: C.company, url: ORIGIN + "/" });

const NODES = {
  organization,
  website: () => ({ "@type": "WebSite", "@id": ORIGIN + "/#website", url: ORIGIN + "/", name: Site.SITE_NAME, inLanguage: "fr", publisher: { "@id": ORG_ID } }),
  breadcrumb: (doc) => ({
    "@type": "BreadcrumbList",
    itemListElement: doc.breadcrumb.map(([name, file], i) => ({ "@type": "ListItem", position: i + 1, name, item: Site.absoluteUrl(file) }))
  }),
  course: (doc, meta) => ({
    "@type": "Course",
    name: N.fullTitle,
    description: meta.description,
    url: Site.absoluteUrl(doc.file),
    image: ORIGIN + "/" + N.images.og,
    inLanguage: N.languages.slice(),
    timeRequired: "P" + N.durationDays + "D",
    provider: providerOf(),
    offers: {
      "@type": "Offer", url: Site.absoluteUrl(doc.file), price: String(N.price.amountCents / 100), priceCurrency: N.price.currency,
      priceSpecification: { "@type": "PriceSpecification", price: String(N.price.amountCents / 100), priceCurrency: N.price.currency, valueAddedTaxIncluded: !!N.price.vatIncluded }
    }
  }),
  courseList: () => ({
    "@type": "ItemList",
    name: "Formations Wisy Safety",
    itemListElement: Site.formations().map((f, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "Course", name: fr(f.titleKey), description: fr(f.descKey), url: Site.absoluteUrl(f.url), provider: providerOf() }
    }))
  }),
  contactPage: (doc, meta) => ({ "@type": "ContactPage", url: Site.absoluteUrl(doc.file), name: meta.title })
};

function graphFor(doc, meta) {
  return { "@context": "https://schema.org", "@graph": doc.graph.map((k) => NODES[k](doc, meta)) };
}

/* ------------------------------------------------------------------ bloc <head> */
function headBlock(doc, meta) {
  const url = Site.absoluteUrl(doc.file);
  const img = doc.image || OG_DEFAULT;
  const imgUrl = ORIGIN + "/" + img.file;
  return [
    HEAD_START,
    '<link rel="canonical" href="' + url + '">',
    '<meta name="theme-color" content="#F4FAF9">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + esc(Site.SITE_NAME) + '">',
    '<meta property="og:locale" content="fr_BE">',
    '<meta property="og:title" content="' + esc(meta.title) + '">',
    '<meta property="og:description" content="' + esc(meta.description) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + imgUrl + '">',
    '<meta property="og:image:width" content="' + img.width + '">',
    '<meta property="og:image:height" content="' + img.height + '">',
    '<meta property="og:image:alt" content="' + esc(img.alt) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(meta.title) + '">',
    '<meta name="twitter:description" content="' + esc(meta.description) + '">',
    '<meta name="twitter:image" content="' + imgUrl + '">',
    '<meta name="twitter:image:alt" content="' + esc(img.alt) + '">',
    '<script type="application/ld+json">' + JSON.stringify(graphFor(doc, meta)).replace(/</g, "\\u003c") + "</script>",
    HEAD_END
  ].join("\n");
}
const technicalBlock = () => [HEAD_START, '<meta name="robots" content="noindex,nofollow">', HEAD_END].join("\n");

/* Balises SEO écrites à la main AVANT la génération : retirées une fois (jamais de doublon). */
const LEGACY = [
  /[ \t]*<link rel="canonical"[^>]*>\n?/g,
  /[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>\n?/g,
  /[ \t]*<meta property="og:[^"]*"[^>]*>\n?/g,
  /[ \t]*<meta name="twitter:[^"]*"[^>]*>\n?/g,
  /[ \t]*<meta name="theme-color"[^>]*>\n?/g,
  /[ \t]*<meta name="robots"[^>]*>\n?/g,
  /[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g
];
const MARKERS = /[ \t]*<!-- seo:start[^>]*-->[\s\S]*?<!-- seo:end -->\n?/;

function withBlock(html, block) {
  if (MARKERS.test(html)) return html.replace(MARKERS, () => block + "\n");
  const i = html.indexOf("<head>"), j = html.indexOf("</head>");
  if (i < 0 || j < 0) throw new Error("<head> introuvable");
  let head = html.slice(i, j);
  LEGACY.forEach((re) => { head = head.replace(re, ""); });
  const anchor = head.match(/<meta\s[^>]*name="description"[^>]*>\n?/i) || head.match(/<title[^>]*>[\s\S]*?<\/title>\n?/i);
  if (!anchor) throw new Error("ni description ni titre : point d'insertion introuvable");
  const at = head.indexOf(anchor[0]) + anchor[0].length;
  const glue = anchor[0].endsWith("\n") ? "" : "\n";
  head = head.slice(0, at) + glue + block + "\n" + head.slice(at);
  return html.slice(0, i) + head + html.slice(j);
}

/* ------------------------------------------------------------------ sitemap + robots */
function sitemap() {
  const urls = DOCS.map((d) => Site.absoluteUrl(d.file));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") + "\n</urlset>\n";
}
function robots() {
  return [
    "# Wisy Safety — tout le site public est explorable (CSS, JS et images compris : ils servent au rendu).",
    "# Les pages techniques (admin, 404, maquettes) portent `noindex` ; rien n'est bloqué ici pour que",
    "# les moteurs puissent lire cette consigne.",
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: " + ORIGIN + "/sitemap.xml",
    ""
  ].join("\n");
}

/* ------------------------------------------------------------------ orchestration */
function generate() {
  const out = {};
  DOCS.forEach((doc) => {
    const html = read(doc.file);
    out[doc.file] = withBlock(html, headBlock(doc, metaOf(html)));
  });
  TECHNICAL.forEach((f) => { if (exists(f)) out[f] = withBlock(read(f), technicalBlock()); });
  out["sitemap.xml"] = sitemap();
  out["robots.txt"] = robots();
  return out;
}

if (require.main === module) {
  const next = generate();
  const check = process.argv.includes("--check");
  let stale = 0;
  Object.keys(next).forEach((f) => {
    const cur = exists(f) ? read(f) : null;
    if (cur === next[f]) return;
    stale++;
    if (check) console.error("✗ " + f + " n'est plus à jour.");
    else { fs.writeFileSync(path.join(ROOT, f), next[f], "utf8"); console.log("✓ " + f); }
  });
  if (check) {
    if (stale) { console.error("→ lancez `node scripts/build-seo.js`."); process.exit(1); }
    console.log("✓ SEO à jour (" + Object.keys(next).length + " fichiers).");
  } else if (!stale) console.log("✓ déjà à jour.");
}

module.exports = { generate, DOCS, TECHNICAL, HEAD_START, HEAD_END, metaOf, ORG_ID };
