"use strict";
/* SEO technique : canonical, métadonnées, Open Graph, données structurées, sitemap, robots.txt, 404.
   Le bloc SEO du <head> et les fichiers sitemap.xml / robots.txt sont GÉNÉRÉS par scripts/build-seo.js :
   ces tests vérifient qu'ils sont à jour ET que leur contenu est juste (aucune donnée inventée).
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Site = require("../js/site-content.js");
const FAQ = require("../js/faq-data.js");
const Trainings = require("../js/trainings-data.js");
const SEO = require("../scripts/build-seo.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const ORIGIN = Site.ORIGIN;
const C = FAQ.CONTACT;
const PUBLIC = SEO.DOCS.map((d) => d.file);
const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;/g, "'");
const head = (html) => html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
const metaContent = (h, attr, name) => { const m = h.match(new RegExp('<meta\\s+' + attr + '="' + name + '"[^>]*content="([^"]*)"')); return m ? decode(m[1]) : null; };
const strip = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

/* Dimensions d'un JPEG (marqueurs SOF) — pour vérifier width/height déclarés dans og:image:*. */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/* ------------------------------------------------------------------ génération */
test("le bloc SEO des pages, sitemap.xml et robots.txt sont à jour (node scripts/build-seo.js)", () => {
  const out = SEO.generate();
  Object.keys(out).forEach((f) => assert.equal(read(f), out[f], f + " obsolète : lancez `node scripts/build-seo.js`"));
});

test("chaque page publique déclarée dans le registre est traitée par le générateur (et inversement)", () => {
  assert.deepEqual(PUBLIC.slice().sort(), Site.publicPaths().slice().sort());
});

/* ------------------------------------------------------------------ métadonnées par page */
test("pages publiques : <html lang=fr>, un seul H1, un seul canonical ABSOLU égal à l'URL du registre", () => {
  PUBLIC.forEach((f) => {
    const html = read(f), h = head(html);
    assert.match(html, /<html lang="fr"/, f + " : langue du document");
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, f + " : un seul H1");
    const canon = h.match(/<link rel="canonical" href="([^"]+)">/g) || [];
    assert.equal(canon.length, 1, f + " : un seul canonical");
    assert.equal(canon[0].match(/href="([^"]+)"/)[1], Site.absoluteUrl(f), f + " : canonical = URL du registre");
    assert.match(canon[0], /href="https:\/\/www\.wisysafety\.be\//, f + " : URL absolue (https, domaine canonique)");
    assert.doesNotMatch(h, /<meta name="robots"[^>]*noindex/, f + " : indexable");
  });
});

test("titres et descriptions : présents, UNIQUES, de longueur raisonnable", () => {
  const titles = new Set(), descs = new Set();
  PUBLIC.forEach((f) => {
    const { title, description } = SEO.metaOf(read(f));
    assert.ok(title.length >= 10 && title.length <= 70, f + " : titre 10–70 caractères (" + title.length + ")");
    assert.ok(description.length >= 70 && description.length <= 175, f + " : description 70–175 caractères, sinon tronquée dans les résultats (" + description.length + ")");
    assert.ok(!titles.has(title), f + " : titre déjà utilisé : " + title);
    assert.ok(!descs.has(description), f + " : description déjà utilisée");
    titles.add(title); descs.add(description);
  });
});

test("Open Graph + Twitter complets sur chaque page publique ; l'image de partage existe, à la taille annoncée", () => {
  PUBLIC.forEach((f) => {
    const h = head(read(f)), { title, description } = SEO.metaOf(read(f));
    assert.equal(metaContent(h, "property", "og:title"), title, f + " : og:title = <title>");
    assert.equal(metaContent(h, "property", "og:description"), description, f + " : og:description = meta description");
    assert.equal(metaContent(h, "property", "og:url"), Site.absoluteUrl(f), f + " : og:url = canonical");
    const isArticle = SEO.DOCS.find((d) => d.file === f).ogType === "article";
    assert.equal(metaContent(h, "property", "og:type"), isArticle ? "article" : "website");
    assert.equal(metaContent(h, "property", "og:site_name"), "Wisy Safety");
    assert.equal(metaContent(h, "property", "og:locale"), "fr_BE");
    assert.equal(metaContent(h, "name", "twitter:card"), "summary_large_image");
    assert.equal(metaContent(h, "name", "twitter:image"), metaContent(h, "property", "og:image"));
    assert.ok(metaContent(h, "property", "og:image:alt"), f + " : texte alternatif de l'image de partage");
    const img = metaContent(h, "property", "og:image");
    assert.ok(img.startsWith(ORIGIN + "/"), f + " : og:image absolue");
    const file = img.slice(ORIGIN.length + 1);
    assert.ok(exists(file), f + " : image de partage introuvable : " + file);
    const [w, hh] = jpegSize(fs.readFileSync(path.join(ROOT, file)));
    assert.equal(+metaContent(h, "property", "og:image:width"), w, f + " : largeur annoncée = réelle");
    assert.equal(+metaContent(h, "property", "og:image:height"), hh, f + " : hauteur annoncée = réelle");
    assert.ok(fs.statSync(path.join(ROOT, file)).size < 200 * 1024, f + " : image de partage légère (< 200 Ko)");
  });
});

test("plus de hreflang relatifs ni de balises SEO en double (le bloc généré est la seule source)", () => {
  PUBLIC.forEach((f) => {
    const h = head(read(f));
    assert.doesNotMatch(h, /rel="alternate" hreflang=/, f + " : hreflang (URLs relatives, variantes non indexables) retiré");
    assert.equal((h.match(/property="og:title"/g) || []).length, 1, f + " : og:title unique");
    assert.equal((h.match(/name="theme-color"/g) || []).length, 1, f + " : theme-color unique");
    assert.equal((h.match(/<!-- seo:start/g) || []).length, 1, f + " : un seul bloc généré");
  });
});

/* ------------------------------------------------------------------ données structurées */
test("JSON-LD : valide, types autorisés, une Organisation dont les faits = coordonnées du site", () => {
  const ALLOWED = new Set(["EducationalOrganization", "LocalBusiness", "WebSite", "BreadcrumbList", "ListItem", "ItemList", "Course", "Article", "ContactPage", "PostalAddress", "GeoCoordinates", "OpeningHoursSpecification", "Offer", "PriceSpecification"]);
  PUBLIC.forEach((f) => {
    const blocks = ldBlocks(read(f));
    assert.equal(blocks.length, 1, f + " : un seul bloc JSON-LD statique (le FAQPage de faq.html est injecté à l'exécution)");
    const g = blocks[0];
    assert.equal(g["@context"], "https://schema.org");
    const seen = JSON.stringify(g).match(/"@type":("[A-Za-z]+"|\[[^\]]+\])/g).join(",").match(/[A-Z][A-Za-z]+/g);
    seen.forEach((t) => assert.ok(ALLOWED.has(t), f + " : type non prévu " + t));
    const org = g["@graph"].filter((n) => [].concat(n["@type"]).includes("LocalBusiness"));
    assert.equal(org.length, 1, f + " : une seule Organisation");
    assert.equal(org[0].email, C.email); assert.equal(org[0].telephone, C.phone.replace(/\s+/g, ""));
    assert.equal(org[0].address.streetAddress, C.street); assert.equal(org[0].address.postalCode, C.postalCode);
    assert.equal(org[0].address.addressLocality, C.city);
    assert.deepEqual([org[0].geo.latitude, org[0].geo.longitude], [C.geo.latitude, C.geo.longitude]);
    assert.equal(g["@graph"].filter((n) => n["@type"] === "WebSite").length, f === "index.html" ? 1 : 0, f + " : WebSite sur l'accueil uniquement");
  });
});

test("données structurées = contenu VISIBLE : horaires, position, fil d'Ariane, formation, catalogue", () => {
  /* horaires : ceux du pied de page (lundi→jeudi 10:00–16:00, reste fermé) */
  const idx = read("index.html");
  [1, 2, 3, 4].forEach((d) => assert.match(idx, new RegExp('data-day="' + d + '"><span[^>]*>[^<]+</span><span>10:00 – 16:00</span>'), "pied de page : jour " + d));
  [5, 6, 0].forEach((d) => assert.match(idx, new RegExp('data-day="' + d + '"><span[^>]*>[^<]+</span><span class="closed"'), "pied de page : fermé jour " + d));
  assert.deepEqual(C.openingHours, [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "10:00", closes: "16:00" }]);
  /* position : celle de la carte intégrée à l'accueil */
  const map = idx.match(/!2d(-?[\d.]+)!3d(-?[\d.]+)/);
  assert.ok(Math.abs(+map[1] - C.geo.longitude) < 1e-4 && Math.abs(+map[2] - C.geo.latitude) < 1e-4, "geo = carte de l'accueil");
  assert.ok(idx.includes(C.street), "adresse affichée sur l'accueil");
  /* fils d'Ariane : mêmes libellés que ceux affichés */
  SEO.DOCS.filter((d) => d.breadcrumb).forEach((d) => {
    const html = read(d.file);
    const nav = html.slice(html.indexOf('aria-label="Fil d'), html.indexOf("</nav>", html.indexOf('aria-label="Fil d')));
    const visible = [...nav.matchAll(/<(?:a|span|li)\b[^>]*>([^<]+)</g)].map((m) => decode(m[1]).trim()).filter(Boolean);
    const ld = ldBlocks(html)[0]["@graph"].find((n) => n["@type"] === "BreadcrumbList").itemListElement.map((i) => i.name);
    ld.forEach((name) => assert.ok(visible.includes(name), d.file + " : « " + name + " » absent du fil d'Ariane affiché (" + visible.join(" / ") + ")"));
  });
  /* formation Nacelles : prix, durée, langues du registre — et le prix est affiché sur la page */
  const N = Trainings.nacelles, nac = read(N.url), course = ldBlocks(nac)[0]["@graph"].find((n) => n["@type"] === "Course");
  assert.equal(course.name, N.fullTitle); assert.equal(course.timeRequired, "P1D");
  assert.deepEqual(course.inLanguage, ["fr", "nl", "en"]);
  assert.equal(course.offers.price, "350"); assert.equal(course.offers.priceCurrency, "EUR"); assert.equal(course.offers.priceSpecification.valueAddedTaxIncluded, false);
  assert.match(strip(nac), /350\s*€/, "le prix du JSON-LD est affiché sur la page");
  assert.equal(course.description, SEO.metaOf(nac).description, "description = meta description");
  /* catalogue : chaque Course reprend le titre ET la description affichés sur la carte */
  const fo = read("formations.html"), text = decode(strip(fo));
  const list = ldBlocks(fo)[0]["@graph"].find((n) => n["@type"] === "ItemList").itemListElement;
  assert.equal(list.length, Site.formations().length, "une entrée par formation");
  list.forEach((li) => {
    assert.ok(text.includes(li.item.name), "titre affiché : " + li.item.name);
    assert.ok(text.includes(li.item.description), "description affichée : " + li.item.name);
  });
});

test("VCA Base : la fiche Course reprend le registre (prix, durée) ; langues NON confirmées → aucune `inLanguage`", () => {
  const V = Trainings.vcaBase, html = read(V.url), course = ldBlocks(html)[0]["@graph"].find((n) => n["@type"] === "Course");
  assert.equal(course.name, V.fullTitle); assert.equal(course.timeRequired, "P1D");
  assert.equal(course.offers.price, String(V.price.amountCents / 100)); assert.equal(course.offers.priceCurrency, "EUR");
  assert.ok(!("valueAddedTaxIncluded" in course.offers.priceSpecification), "statut TVA non précisé : jamais inventé");
  assert.ok(!("inLanguage" in course), "langues non confirmées : aucune langue déclarée");
  assert.ok(!("hasCourseInstance" in course), "aucune session inventée dans les données structurées");
  assert.match(strip(html), /225\s*€/, "le prix du JSON-LD est affiché sur la page");
  assert.equal(course.description, SEO.metaOf(html).description, "description = meta description");
});

test("articles : og:type article, dates du registre AFFICHÉES, auteur = l'organisation, image de partage propre", () => {
  const arts = SEO.DOCS.filter((d) => d.ogType === "article");
  assert.equal(arts.length, 2);
  arts.forEach((d) => {
    const html = read(d.file), h = head(html), meta = SEO.metaOf(html);
    const page = Site.pages().find((p) => p.url === d.file), art = ldBlocks(html)[0]["@graph"].find((n) => n["@type"] === "Article");
    assert.equal(page.kind, "article");
    assert.equal(art.headline, meta.h1, d.file + " : headline = H1 affiché");
    assert.equal(art.description, meta.description);
    assert.equal(art.datePublished, page.published); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(art.datePublished));
    assert.equal(metaContent(h, "property", "article:published_time"), page.published);
    assert.deepEqual(art.author, { "@id": SEO.ORG_ID }); assert.deepEqual(art.publisher, { "@id": SEO.ORG_ID });
    assert.equal(art.image, metaContent(h, "property", "og:image"));
    assert.equal(art.inLanguage, "fr");
    /* la date de publication est celle AFFICHÉE (« 26 septembre 2026 ») */
    const [y, m, dd] = page.published.split("-"), mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    assert.ok(strip(html).includes(+dd + " " + mois[+m - 1] + " " + y), d.file + " : date de publication non affichée");
    assert.doesNotMatch(JSON.stringify(art), /"Person"|aggregateRating|"Review"/, "aucun auteur ni avis inventé");
  });
  assert.notEqual(arts[0].image.file, arts[1].image.file, "une image de partage par article");
});

test("les pages françaises-seulement n'affirment rien qu'elles n'affichent pas : aucune Review/AggregateRating/FAQPage statique/Event", () => {
  PUBLIC.forEach((f) => assert.doesNotMatch(JSON.stringify(ldBlocks(read(f))), /"Review"|AggregateRating|"FAQPage"|"Event"|SearchAction/, f));
});

/* ------------------------------------------------------------------ sitemap + robots */
test("sitemap.xml : exactement les URLs canoniques des pages indexables, sans doublon ni page technique", () => {
  const xml = read("sitemap.xml");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, "aucun doublon");
  assert.deepEqual(locs, PUBLIC.map((f) => Site.absoluteUrl(f)), "URLs canoniques, dans l'ordre du registre");
  locs.forEach((u) => assert.ok(u.startsWith("https://www.wisysafety.be/") && !/[?#]/.test(u), "URL propre : " + u));
  SEO.TECHNICAL.forEach((f) => assert.ok(!xml.includes(f), "page technique exclue : " + f));
  assert.doesNotMatch(xml, /\?lang=|search|\/admin\//, "ni variantes de langue, ni recherche, ni admin");
});

test("robots.txt : rien de public n'est bloqué, le sitemap est référencé", () => {
  const txt = read("robots.txt");
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, /^Sitemap: https:\/\/www\.wisysafety\.be\/sitemap\.xml$/m);
  assert.doesNotMatch(txt, /^Disallow:\s*(\/?|\/(css|js|assets)\b.*)$/m, "ni le site, ni ses ressources de rendu ne sont bloqués");
});

test("pages techniques (404, admin, maquettes header/footer) : noindex ; 404 utile et autonome", () => {
  SEO.TECHNICAL.forEach((f) => assert.match(head(read(f)), /<meta name="robots" content="noindex,nofollow">/, f + " : noindex"));
  const nf = read("404.html");
  ["/index.html", "/formations.html", "/agenda.html", "/inscription.html", "/faq.html", "/contact.html"].forEach((u) => {
    assert.ok(nf.includes('href="' + u + '"'), "404 → " + u);
    assert.ok(exists(u.slice(1)), "la cible existe : " + u);
  });
  /* servie à n'importe quelle profondeur : uniquement des chemins racine (jamais relatifs) */
  [...nf.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|tel:|#)/.test(u)).forEach((u) => {
    assert.ok(u.startsWith("/"), "404 : chemin racine attendu : " + u);
    assert.ok(exists(u.slice(1)), "404 : ressource introuvable : " + u);
  });
  assert.ok(nf.includes(C.email) && nf.includes(C.phone), "coordonnées identiques à la source unique");
});

/* ------------------------------------------------------------------ polices, icônes */
test("polices auto-hébergées : plus aucune requête Google Fonts ; chaque fichier @font-face et chaque preload existe", () => {
  const pages = PUBLIC.concat(["404.html", "admin/avis.html"]);
  pages.forEach((f) => assert.doesNotMatch(read(f), /fonts\.(googleapis|gstatic)\.com/, f + " : plus de Google Fonts"));
  const css = read("css/fonts.css");
  const files = [...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 9, "Inter (3 sous-ensembles) + Poppins (3 graisses × 2)");
  files.forEach((u) => assert.ok(exists(u), "police introuvable : " + u));
  const faces = css.split("@font-face").slice(1);
  const web = faces.filter((b) => /url\("/.test(b)), fallback = faces.filter((b) => !/url\("/.test(b));
  assert.equal(web.length, files.length, "un @font-face par fichier");
  web.forEach((b) => assert.match(b, /font-display: swap/, "font-display: swap : " + b.slice(0, 80).replace(/\s+/g, " ")));
  assert.equal(fallback.length, 2, "deux polices de repli à métriques ajustées (Inter, Poppins)");
  fallback.forEach((b) => assert.match(b, /size-adjust:[^;]+;\s*ascent-override:[^;]+;\s*descent-override:[^;]+;\s*line-gap-override/, "métriques du repli"));
  PUBLIC.concat(["404.html"]).forEach((f) => {
    assert.match(read(f), /--font-titre:"Poppins","Poppins Fallback",/, f + " : repli Poppins dans la pile de titres");
    assert.match(read(f), /--font-texte:"Inter","Inter Fallback",/, f + " : repli Inter dans la pile de texte");
  });
  PUBLIC.forEach((f) => {
    const pre = [...read(f).matchAll(/<link rel="preload" href="([^"]+\.woff2)" as="font" type="font\/woff2" crossorigin>/g)].map((m) => m[1]);
    assert.ok(pre.length >= 1 && pre.length <= 3, f + " : 1 à 3 préchargements de polices (seulement le critique)");
    pre.forEach((u) => assert.ok(exists(u), f + " : preload introuvable " + u));
    assert.ok(read(f).indexOf('href="css/fonts.css"') > 0, f + " : css/fonts.css chargé");
  });
});

test("icônes : favicon, apple-touch-icon et favicon.ico existent ; aucune page ne charge plus le logo de 76 Ko comme favicon", () => {
  ["favicon.ico", "assets/icons/favicon-48.png", "assets/icons/favicon-192.png", "assets/icons/apple-touch-icon.png"].forEach((f) => {
    assert.ok(exists(f), f);
    assert.ok(fs.statSync(path.join(ROOT, f)).size < 12 * 1024, f + " < 12 Ko");
  });
  PUBLIC.forEach((f) => {
    const h = head(read(f));
    assert.match(h, /<link rel="icon" href="assets\/icons\/favicon-48\.png" sizes="48x48"/, f + " : favicon 48 px (multiple de 48, requis par Google)");
    assert.match(h, /<link rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon\.png">/, f);
  });
});
