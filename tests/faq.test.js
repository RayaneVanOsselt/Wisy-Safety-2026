"use strict";
/* Centre d'aide (FAQ) — intégrité de la source unique (js/faq-data.js), parité des
   données structurées, garde-fous « aucune affirmation inventée » et intégration de
   la page faq.html. `node --test tests/*.test.js` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const FAQ = require("../js/faq-search.js"); // données + moteur : un seul objet

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* Affirmations que le site ne confirme PAS (cf. js/trainings-data.js).
   Elles ne doivent jamais être avancées à propos de la formation Nacelles. */
const NACELLE_BANNED = /CACES|R486|certifi|agr[ée]{1,2}|reconnu|obligatoire/i;

test("catégories : liste stable, non vides, id/label/icon présents", () => {
  const cats = FAQ.categories();
  assert.ok(cats.length >= 4, "au moins 4 domaines");
  cats.forEach((c) => {
    assert.ok(c.id && typeof c.id === "string", "id catégorie");
    assert.ok(c.label && c.label.trim(), "label catégorie");
    assert.ok(c.tagline && c.tagline.trim(), "sous-titre catégorie");
    assert.ok(c.icon && c.icon.trim(), "icône catégorie");
  });
  const ids = cats.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "ids de catégorie uniques");
});

test("questions : ids uniques, catégorie valide, Q/R non vides et bornées", () => {
  const items = FAQ.items();
  assert.ok(items.length >= 12, "un centre d'aide substantiel");
  const catIds = new Set(FAQ.categories().map((c) => c.id));
  const seen = new Set();
  items.forEach((it) => {
    assert.match(it.id, /^faq-[a-z0-9-]+$/, "id normalisé : " + it.id);
    assert.ok(it.id.startsWith("faq-" + it.category + "-"), "id préfixé par sa catégorie : " + it.id);
    assert.ok(!seen.has(it.id), "id unique : " + it.id);
    seen.add(it.id);
    assert.ok(catIds.has(it.category), "catégorie connue : " + it.category);
    assert.ok(it.question && it.question.trim().length > 8, "question non vide : " + it.id);
    assert.match(it.question, /\?\s*$/, "la question se termine par « ? » : " + it.id);
    assert.ok(it.question.length <= 80, "question ≤ 80 caractères (chip de l'assistant) : " + it.id);
    assert.ok(it.answer && it.answer.trim().length > 20, "réponse consistante : " + it.id);
    assert.ok(it.answer.length < 700, "réponse concise : " + it.id);
    assert.doesNotMatch(it.answer + it.question, /<[a-z\/][^>]*>/i, "texte simple, jamais de HTML : " + it.id);
  });
});

test("chaque catégorie contient au moins une question (jamais de filtre vide)", () => {
  const counts = FAQ.counts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, FAQ.items().length, "counts() couvre toutes les questions");
  FAQ.categories().forEach((c) => {
    assert.ok((counts[c.id] || 0) >= 1, "catégorie non vide : " + c.id);
  });
});

test("schéma : mots-clés, synonymes et questions liées valides", () => {
  const ids = new Set(FAQ.items().map((i) => i.id));
  FAQ.items().forEach((it) => {
    assert.ok(Array.isArray(it.keywords) && it.keywords.length >= 3, "au moins 3 mots-clés : " + it.id);
    assert.ok(Array.isArray(it.synonyms) && it.synonyms.length >= 3, "au moins 3 synonymes : " + it.id);
    [].concat(it.keywords, it.synonyms).forEach((k) => assert.ok(typeof k === "string" && k.trim(), "terme non vide : " + it.id));
    const rel = it.relatedQuestions || [];
    assert.ok(rel.length >= 1 && rel.length <= 3, "1 à 3 questions liées : " + it.id);
    rel.forEach((r) => {
      assert.ok(ids.has(r), it.id + " → question liée inconnue : " + r);
      assert.notEqual(r, it.id, "pas d'auto-référence : " + it.id);
    });
    assert.equal(new Set(rel).size, rel.length, "questions liées uniques : " + it.id);
    assert.deepEqual(FAQ.related(it.id, 3).map((r) => r.id).slice(0, rel.length), rel, "related() respecte l'ordre déclaré");
    if (it.action) assert.ok(FAQ.ACTIONS[it.action], "action connue : " + it.id + " → " + it.action);
  });
});

test("actions : uniquement des routes réelles du site", () => {
  Object.keys(FAQ.ACTIONS).forEach((k) => {
    const a = FAQ.ACTIONS[k];
    assert.ok(a.label && a.label.trim(), "libellé de l'action " + k);
    if (a.href) assert.ok(exists(a.href.split("#")[0].split("?")[0]), "la page existe : " + a.href);
  });
});

test("questions essentielles et recherches populaires", () => {
  const feat = FAQ.featured();
  assert.ok(feat.length >= 3 && feat.length <= 5, "3 à 5 questions mises en avant");
  feat.forEach((it) => assert.equal(it.featured, true));
  const pop = FAQ.popular();
  assert.ok(pop.length >= 4, "recherches populaires présentes");
  pop.forEach((p) => {
    assert.ok(p.label && p.query, "libellé + requête");
    assert.ok(FAQ.search(p.query, { partial: true }).hits.length >= 1, "la recherche populaire « " + p.label + " » ne mène jamais à une impasse");
  });
});

test("blocks() : paragraphes et puces, sans HTML", () => {
  const b = FAQ.blocks("Intro.\n\nSuite :\n- un\n- deux\n\nFin.");
  assert.deepEqual(b, [
    { type: "p", text: "Intro." },
    { type: "p", text: "Suite :" }, { type: "ul", items: ["un", "deux"] },
    { type: "p", text: "Fin." }
  ]);
  FAQ.items().forEach((it) => assert.ok(FAQ.blocks(it.answer).length >= 1, it.id));
  assert.equal(FAQ.plainAnswer({ answer: "A :\n- x\n- y" }), "A :\n• x\n• y");
});

test("données structurées FAQPage : une entrée par question réellement présente", () => {
  const sd = FAQ.toStructuredData();
  assert.equal(sd["@type"], "FAQPage");
  const items = FAQ.items();
  assert.equal(sd.mainEntity.length, items.length, "aucune question fantôme, aucune manquante");
  sd.mainEntity.forEach((q, i) => {
    assert.equal(q["@type"], "Question");
    assert.equal(q.name, items[i].question);
    assert.equal(q.acceptedAnswer["@type"], "Answer");
    assert.equal(q.acceptedAnswer.text, items[i].answer);
  });
});

/* ------------------------------------------------------------------ véracité */
test("garde-fou : aucun « CACES » / « R486 » dans le contenu affiché (jamais confirmé par le site)", () => {
  FAQ.items().forEach((it) => {
    assert.doesNotMatch(it.question + " " + it.answer, /CACES|R486/i, "sans CACES : " + it.id);
  });
  /* … ni dans les mots-clés stockés : le terme n'est reconnu que côté requête (moteur) */
  FAQ.items().forEach((it) => assert.doesNotMatch([].concat(it.keywords, it.synonyms).join(" "), /CACES|R486/i, "mots-clés : " + it.id));
});

test("garde-fou nacelles : la réponse dédiée ne présente pas la formation comme certifiante/agréée", () => {
  const nac = FAQ.get("faq-attestations-nacelle");
  assert.ok(nac, "la question sur les Nacelles existe");
  assert.doesNotMatch(nac.answer, NACELLE_BANNED, "réponse Nacelles conforme aux faits confirmés");
});

test("garde-fou : aucun prix chiffré, aucun taux de TVA, aucune promesse chiffrée dans les réponses", () => {
  /* Seule exception : le seuil de réussite OFFICIEL de l'examen B-VCA (BeSaCC-VCA), lu dans le registre
     (VCA Base → official.exam.passPercent). Tout autre pourcentage reste interdit. */
  const OFFICIAL_PASS = String(require("../js/trainings-data.js").vcaBase.official.exam.passPercent).replace(".", ",") + " %";
  FAQ.items().forEach((it) => {
    assert.doesNotMatch(it.answer, /€|\beur\b|\beuros?\b/i, "aucun prix codé en dur (registre d'inscription = source des prix) : " + it.id);
    assert.doesNotMatch(it.answer.split(OFFICIAL_PASS).join(""), /\d\s?%/, "aucun pourcentage / taux de TVA inventé : " + it.id);
    assert.doesNotMatch(it.answer, /garanti|100 ?%|satisfait ou remboursé|\bgratuit\b/i, "aucune garantie commerciale : " + it.id);
  });
});

test("garde-fou : durées et langues citées = registre des formations (trainings-data.js)", () => {
  const T = require("../js/trainings-data.js").nacelles;
  const langs = FAQ.get("faq-choisir-langues").answer.toLowerCase();
  T.languageLabels.forEach((l) => assert.ok(langs.includes(l.toLowerCase()), "langue du registre citée : " + l));
  const dur = FAQ.get("faq-deroulement-duree").answer;
  assert.match(dur, new RegExp(T.durationDays + " jour[^s]"), "durée de la nacelle");
});

test("contenu provisoire : clairement identifié par une note dans le code", () => {
  const provisional = FAQ.items().filter((it) => it.provisional);
  assert.ok(provisional.length >= 3, "les réponses prudentes sont marquées");
  provisional.forEach((it) => {
    assert.ok(it.note && /PROVISOIRE/i.test(it.note), "note PROVISOIRE présente : " + it.id);
  });
  FAQ.items().forEach((it) => { if (it.note) assert.equal(it.provisional, true, "une note implique provisional : " + it.id); });
});

test("coordonnées : source unique, cohérente avec l'en-tête / le pied de page réels", () => {
  const C = FAQ.CONTACT;
  const contact = FAQ.get("faq-contact-contact").answer;
  assert.ok(contact.includes(C.phone) && contact.includes(C.email), "téléphone + e-mail dans la réponse contact");
  const hours = FAQ.get("faq-contact-horaires").answer;
  assert.ok(hours.toLowerCase().includes(C.hours.slice(1).toLowerCase()), "horaires de la réponse = horaires du pied de page");
  const html = read("faq.html");
  assert.ok(html.includes('href="tel:+3223188659"') && C.phoneHref === "tel:+3223188659", "tel: identique");
  assert.ok(html.includes("mailto:" + C.email), "mailto: identique");
  assert.ok(html.includes("Du lundi au jeudi, de 10h00 à 16h00"), "horaires affichés");
  assert.ok(FAQ.get("faq-deroulement-lieu").answer.includes(C.street), "adresse = adresse du pied de page");
  assert.ok(html.includes(C.street), "l'adresse figure bien dans le pied de page de la page");
});

/* ------------------------------------------------------------- page faq.html */
test("intégration page : faq.html branche la source unique, le moteur et les conteneurs générés", () => {
  assert.ok(exists("faq.html") && exists("js/faq-page.js"), "faq.html + js/faq-page.js existent");
  const html = read("faq.html");
  const pos = (re) => html.search(re);
  const data = pos(/js\/faq-data\.js/), search = pos(/js\/faq-search\.js/), page = pos(/js\/faq-page\.js/), launcher = pos(/js\/assistant\/launcher\.js/);
  assert.ok(data > 0 && data < search, "faq-data.js avant faq-search.js");
  assert.ok(search < launcher, "les données et le moteur sont chargés AVANT le launcher (qui ne les recharge pas)");
  assert.ok(page > search, "faq-page.js chargé après les données et le moteur");
  assert.doesNotMatch(html, /js\/assistant\/(knowledge|retrieval|validation|responder|assistant)\.js/, "le moteur de l'assistant se charge à la demande (launcher.js)");
  ["faqc-form", "faqc-q", "faqc-suggest", "faqc-cats", "faqc-pop", "faqc-groups", "faqc-results", "faqc-empty", "faqc-live", "faqc-try-list", "faqc-ask-form", "faqc-ask-q"].forEach((id) => {
    assert.match(html, new RegExp('id="' + id + '"'), "conteneur #" + id + " présent");
  });
  assert.doesNotMatch(html, /CACES|R486/i, "faq.html sans CACES");
  assert.match(html, /<label[^>]*for="faqc-q"/, "label associé au champ de recherche");
  assert.match(html, /<main[^>]*id="main"/, "landmark main");
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "un seul H1");
  assert.match(html, /<title>[^<]*Centre d'aide/, "titre de page");
  assert.match(html, /name="description"/, "meta description");
});

test("page : structure de la charte (hero, 3 façons, catégories, FAQ + assistant, aide, CTA final)", () => {
  const html = read("faq.html");
  ["Comment pouvons-nous vous aider", "Centre d'aide Wisy Safety", "Recherches populaires", "Explorer par catégorie",
   "Questions fréquentes", "Vous n'avez pas trouvé votre réponse", "Une question sur votre projet de formation"].forEach((t) => {
    assert.ok(html.includes(t), "texte attendu : " + t);
  });
  assert.equal((html.match(/data-way="/g) || []).length, 3, "trois façons d'obtenir une réponse");
  /* un seul CTA turquoise dominant dans la section finale */
  const final = html.slice(html.indexOf('class="faqc-final"'), html.indexOf("</main>"));
  assert.equal((final.match(/btn--cta/g) || []).length, 1, "un seul CTA turquoise dans la section finale");
  /* la charte : jamais de couleur hors palette (violet, bleu électrique, orange, rouge) dans le CSS de la page */
  const css = html.slice(html.indexOf("CENTRE D'AIDE (FAQ) — styles propres"), html.indexOf("</style>"));
  const HEX = new Set(["#1f6f64", "#2f7d8c", "#48d6c2", "#3fa69b", "#f4faf9", "#5e6d6a", "#1b2d28", "#2a8477", "#fff", "#ffffff"]);
  (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach((h) => assert.ok(HEX.has(h.toLowerCase()), "couleur hors palette : " + h));
});

test("accessibilité de la page : liens d'évitement, combobox, statut live, jamais de tabindex positif", () => {
  const html = read("faq.html");
  assert.match(html, /class="faqc-skips"[\s\S]*href="#faqc-q"[\s\S]*href="#faqc-answers"/, "liens d'évitement");
  assert.match(html, /role="combobox"[^>]*aria-controls="faqc-suggest"/, "combobox → listbox");
  assert.match(html, /id="faqc-live"/, "zone d'annonce");
  assert.match(html, /<p[^>]*id="faqc-live"[^>]*aria-live="polite"|<p[^>]*aria-live="polite"[^>]*id="faqc-live"/, "annonces polies");
  assert.doesNotMatch(html, /tabindex="[1-9]/, "aucun tabindex positif");
  const js = read("js/faq-page.js");
  assert.match(js, /aria-expanded/, "accordéons aria-expanded");
  assert.match(js, /aria-controls/, "accordéons aria-controls");
});

test("intégration i18n : libellé « footer.faq » disponible dans les 10 langues", () => {
  const common = read("js/i18n-data-common.js");
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((lg) => {
    assert.match(common, new RegExp('m\\("' + lg + '", \\{ "footer\\.faq"'), "footer.faq pour " + lg);
  });
});
