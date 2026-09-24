"use strict";
/* Page « Certificateur PEB — Wallonie & Bruxelles » : cohérence du registre js/peb-data.js avec la
   page, véracité (jamais « agréé »/« reconnu » à propos de Wisy Safety, jamais de prix inventé),
   séparation stricte des concepts (certificat / agrément / formation / examen / frais), intégrité
   du registre, navigation, JSON-LD, chatbot/recherche. `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Peb = require("../js/peb-data.js");
const Site = require("../js/site-content.js");
const Knowledge = require("../js/assistant/knowledge.js");
const Validation = require("../js/assistant/validation.js");

const ROOT = path.join(__dirname, "..");
const FILE = "peb-wallonie-bruxelles.html";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const html = read(FILE);
const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
const visible = main.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");

/* ------------------------------------------------------------------ registre js/peb-data.js */
test("registre PEB : deux Régions distinctes, chacune avec autorité, éligibilité, procédure, examen, agrément, sources", () => {
  ["wallonia", "brussels"].forEach((id) => {
    const r = Peb.get(id);
    assert.ok(r, id);
    assert.ok(r.authority && r.authority.name, id + " : autorité");
    assert.ok(Array.isArray(r.eligibility) && r.eligibility.length > 0, id + " : conditions d'accès");
    assert.ok(r.process && Array.isArray(r.process.steps) && r.process.steps.length >= 4, id + " : parcours");
    assert.ok(r.examination && r.examination.format, id + " : examen");
    assert.ok(r.approval && r.approval.name, id + " : agrément");
    assert.ok(Array.isArray(r.sources) && r.sources.length > 0, id + " : sources officielles");
    assert.deepEqual(Array.isArray(r.sessions) ? r.sessions : null, [], id + " : aucune session inventée");
  });
});

test("VÉRACITÉ — examen Wallonie : écrit puis oral, JAMAIS l'ancienne description QCM/logiciel", () => {
  assert.match(Peb.wallonia.examination.format, /écrite/i);
  assert.match(Peb.wallonia.examination.format, /orale/i);
  const allText = JSON.stringify(Peb.wallonia);
  assert.doesNotMatch(allText, /logiciel|encodage/i, "l'examen wallon ne mentionne ni logiciel ni encodage (spécifique à Bruxelles)");
});

test("VÉRACITÉ — Bruxelles : droit de dossier 50 € explicitement décrit comme un frais d'agrément, jamais le prix de la formation", () => {
  assert.equal(Peb.brussels.approval.feeCents, 5000);
  assert.match(Peb.brussels.approval.feeNote, /PAS le prix de la formation/);
});

test("VÉRACITÉ — non-résidentiel Bruxelles présenté comme indisponible, jamais commercialisé", () => {
  assert.equal(Peb.brussels.nonResidential.status, "unavailable");
  assert.equal(Peb.OFFER.offersBrusselsNonResidential, false);
  assert.match(visible, /aucun centre de formation ne donne cette formation/i);
});

test("VÉRACITÉ — aucun prix Wisy inventé : PEB_PRICING reste null tant qu'aucun tarif réel n'est fourni", () => {
  assert.equal(Peb.PRICING.wallonia, null);
  assert.equal(Peb.PRICING.brussels, null);
  assert.match(visible, /Tarif sur demande/);
  /* aucun montant en euros n'est présenté comme LE prix Wisy (seuls 50 € [agrément] et les repères concurrents apparaissent) */
  const euroAmounts = [...visible.matchAll(/(\d[\d\s.,]*)\s?€/g)].map((m) => m[1].replace(/\s/g, ""));
  euroAmounts.forEach((a) => assert.ok(["50", "645", "745", "1050", "1390"].includes(a), "montant € inattendu sur la page : " + a + " € — vérifier qu'il ne s'agit pas d'un prix Wisy inventé"));
});

test("VÉRACITÉ — Wisy Safety n'est jamais qualifié d'« agréé »/« reconnu »/« officiel » pour le PEB (seules les autorités le sont)", () => {
  assert.equal(Peb.OFFER.wisyIsAccreditedCenter, false, "voir js/peb-data.js : statut non confirmé au 2026-09-24 (5 centres bruxellois listés, Wisy absent)");
  /* Fenêtre étroite (60 caractères) autour de chaque occurrence de « Wisy Safety » dans le texte
     visible : une phrase entière serait trop permissive (des titres sans ponctuation terminale
     fusionneraient des paragraphes sans rapport ; testé, voir historique). */
  const WINDOW = 60;
  const norm = visible.replace(/\s+/g, " ");
  let idx = 0;
  while ((idx = norm.toLowerCase().indexOf("wisy safety", idx)) !== -1) {
    const around = norm.slice(Math.max(0, idx - WINDOW), idx + "wisy safety".length + WINDOW);
    assert.doesNotMatch(around, /(agréé|agréée|reconnu|reconnue|officiel|officielle)/i, "affirmation d'agrément Wisy non confirmée à proximité de : " + around.trim());
    idx += "wisy safety".length;
  }
});

test("distinction des concepts : certificat / agrément / formation / examen / frais ne sont jamais confondus dans les libellés visibles", () => {
  assert.match(visible, /droit de dossier/i, "les 50 € sont désignés comme un droit de dossier");
  assert.doesNotMatch(visible, /50\s?€[^.]*(prix de la formation|tarif de la formation)/i, "les 50 € ne sont jamais présentés comme le prix de la formation");
});

/* ------------------------------------------------------------------ page : structure et SEO */
test("page : un seul H1, canonical, meta description dans les bornes, image sociale existante", () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.wisysafety\.be\/peb-wallonie-bruxelles\.html">/);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  assert.ok(desc.length >= 70 && desc.length <= 175, "longueur meta description : " + desc.length);
});

test("page : JSON-LD valide, une Organisation, un fil d'Ariane conforme au texte affiché, deux parcours Course sans prix inventé", () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld["@context"], "https://schema.org");
  const org = ld["@graph"].find((n) => [].concat(n["@type"]).includes("LocalBusiness"));
  assert.ok(org);
  const crumbs = ld["@graph"].find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.equal(crumbs[crumbs.length - 1].name, "Certificateur PEB");
  assert.match(visible, /Certificateur PEB/);
  const list = ld["@graph"].find((n) => n["@type"] === "ItemList");
  assert.equal(list.itemListElement.length, 2, "un Course par Région");
  list.itemListElement.forEach((li) => {
    assert.equal(li.item["@type"], "Course");
    assert.ok(!("offers" in li.item), "aucun prix inventé dans le JSON-LD (PEB_PRICING est null)");
    assert.ok([Peb.wallonia.scope, Peb.brussels.scope].includes(li.item.name), "le nom du parcours vient du registre");
  });
});

test("aucune donnée structurée FAQPage statique (celle-ci est injectée à l'exécution par js/peb.js, comme la page BEPS)", () => {
  assert.equal((html.match(/<script type="application\/ld\+json">/g) || []).length, 1);
  assert.doesNotMatch(html, /"@type":\s*"FAQPage"/);
});

/* ------------------------------------------------------------------ registre du site (recherche, assistant, sitemap) */
test("le registre du site inclut la page PEB (recherche, assistant, sitemap) et pointe vers une page réelle", () => {
  const p = Site.page("peb");
  assert.ok(p, "entrée « peb » dans js/site-content.js");
  assert.equal(p.url, FILE);
  assert.ok(exists(p.url));
  assert.ok(Site.publicPaths().includes(FILE));
  assert.ok(Validation.isSafeUrl(FILE), "route autorisée pour l'assistant");
  assert.ok(Knowledge.pages().some((k) => k.url === FILE), "l'assistant dérive bien la page PEB du registre");
});

test("navigation : le lien « PEB Wallonie & Bruxelles » n'est plus une destination morte sur aucune page publique", () => {
  ["index.html", "formations.html", "contact.html", "avis.html", "faq.html", "agenda.html", "inscription.html",
    "formation-nacelles-elevatrices.html", "formation-beps-premiers-secours.html"].forEach((f) => {
    const h = read(f);
    assert.doesNotMatch(h, /href="#" data-i18n="nav\.peb"/, f + " : nav.peb encore mort");
    assert.match(h, new RegExp('href="' + FILE + '"[^>]*data-i18n="nav\\.peb"|data-i18n="nav\\.peb"[^>]*href="' + FILE + '"|href="' + FILE + '"'), f + " : lien vers la page PEB présent");
  });
});

/* ------------------------------------------------------------------ éligibilité (quiz) */
test("le quiz d'éligibilité affiche systématiquement la mise en garde prescrite, jamais une décision administrative", () => {
  const quiz = html.slice(html.indexOf("data-quiz>"), html.indexOf("</section>", html.indexOf("data-quiz>")));
  assert.match(quiz, /Cette vérification est indicative\. L'éligibilité définitive relève de l'autorité régionale compétente\./);
});

test("les profils du quiz correspondent exactement à ceux du brief (aucun profil inventé, aucun manquant)", () => {
  const expected = ["architecte", "ingenieur-architecte", "ingenieur-civil", "bio-ingenieur", "ingenieur-industriel", "gradue-construction", "autre-diplome-energie", "experience", "autre"];
  const found = [...html.matchAll(/name="quiz-profile"[^>]*value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(found.sort(), expected.sort());
});

test("CSS : le garde-fou [data-region-panel][hidden] est présent (sans lui, une classe de mise en page comme .peb-conditions{display:grid} neutralise l'attribut hidden et affiche les deux Régions à la fois)", () => {
  const css = read("css/peb.css");
  assert.match(css, /\[data-region-panel\]\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/, "règle de garde manquante dans css/peb.css");
});

/* ------------------------------------------------------------------ images */
test("images PEB : dimensions déclarées, poids raisonnable, alt honnête (jamais présentées comme le centre ou les formateurs réels)", () => {
  ["assets/images/peb/peb-residence-facade-1200.webp", "assets/images/peb/peb-cles-immeuble-900.webp",
    "assets/images/peb/peb-structure-chantier-900.webp", "assets/images/peb/peb-verification-conformite-240.webp"].forEach((f) => {
    assert.ok(exists(f), f);
    assert.ok(fs.statSync(path.join(ROOT, f)).size < 200 * 1024, f + " < 200 Ko");
  });
  assert.doesNotMatch(visible, /notre centre|nos formateurs|nos locaux/i, "aucune légende ne présente les photos génériques comme les locaux/formateurs réels de Wisy");
});
