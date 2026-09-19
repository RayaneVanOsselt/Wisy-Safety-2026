"use strict";
/* Registre central des formations à page dédiée (js/trainings-data.js) et
   cohérence de TOUS ses consommateurs : page, recherche, assistant, miroir
   serveur, inscription, catalogue, navigation, i18n.
   `node --test tests/` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Trainings = require("../js/trainings-data.js");

const N = Trainings.nacelles;
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const BANNED = /CACES|R486|certifi|agr[ée]{1,2}|reconnu|obligatoire/i;

test("nacelle : faits confirmés par Wisy Safety (durée, prix HT, langues, format, public)", () => {
  assert.equal(N.durationDays, 1);
  assert.deepEqual(N.price, { amountCents: 35000, currency: "EUR", vatIncluded: false });
  assert.equal(Trainings.formatPrice(N.price), "350 € HT");
  assert.equal(Trainings.formatDuration(N.durationDays), "1 jour");
  assert.deepEqual(N.languages, ["fr", "nl", "en"]);
  assert.deepEqual(N.languageLabels, ["Français", "Néerlandais", "Anglais"]);
  assert.equal(N.formatLabel, "Théorie + pratique");
  assert.equal(N.audience.length, 4);
  assert.equal(N.types.length, 7);
});

test("formatPrice : centimes → libellé, TTC/HT", () => {
  assert.equal(Trainings.formatPrice({ amountCents: 24550, currency: "EUR", vatIncluded: false }), "245,50 € HT");
  assert.equal(Trainings.formatPrice({ amountCents: 9500, currency: "EUR", vatIncluded: true }), "95 € TTC");
  assert.equal(Trainings.formatPrice(null), null);
  assert.equal(Trainings.formatDuration(2), "2 jours");
});

test("route : page HTML à plat qui existe ; visuels référencés présents", () => {
  assert.equal(Trainings.hasDedicatedPage(N), true);
  assert.ok(exists(N.url), N.url);
  Object.keys(N.images).forEach((k) => assert.ok(exists(N.images[k]), "image " + k + " : " + N.images[k]));
  N.types.forEach((t) => ["640", "960"].forEach((w) => {
    assert.ok(exists("assets/images/nacelles/nacelle-" + t.id + "-" + w + ".webp"), t.id + " " + w);
  }));
});

test("VÉRACITÉ : aucune certification / CACES / agrément dans les faits du registre", () => {
  const text = [N.title, N.fullTitle, N.summary, N.objective, N.formatLabel, N.audience.join(" "),
    N.types.map((t) => t.name).join(" "), N.imageAlt].join(" ");
  assert.doesNotMatch(text, BANNED);
  assert.doesNotMatch(N.keywords.join(" "), /caces|r486|certif/i);
  ["CACES", "certification", "agrément", "obligatoire"].forEach((w) => assert.ok(N.unconfirmed.indexOf(w) !== -1, w));
});

test("page : les faits affichés (prix, durée, langues, format) = registre", () => {
  const html = read(N.url);
  assert.ok(html.includes('data-i18n="nac.price_value">' + Trainings.formatPrice(N.price) + "<"), "prix");
  assert.ok(html.includes('data-i18n="dd.nacelle_dur">' + Trainings.formatDuration(N.durationDays) + "<"), "durée");
  N.languageLabels.forEach((l) => assert.ok(html.includes(">" + l + "<"), "langue " + l));
  assert.ok(html.includes('data-i18n="dd.nacelle_fmt">' + N.formatLabel + "<"), "format");
});

test("page : JSON-LD exact (Course + BreadcrumbList) — prix HT, durée, langues, aucune note ni certification", () => {
  const html = read(N.url);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const course = ld["@graph"].filter((x) => x["@type"] === "Course")[0];
  assert.equal(course.offers.price, String(N.price.amountCents / 100));
  assert.equal(course.offers.priceCurrency, "EUR");
  assert.equal(course.offers.priceSpecification.valueAddedTaxIncluded, false);
  assert.equal(course.timeRequired, "P" + N.durationDays + "D");
  assert.deepEqual(course.inLanguage, N.languages);
  assert.ok(!("aggregateRating" in course) && !("review" in course) && !("educationalCredentialAwarded" in course));
  const crumbs = ld["@graph"].filter((x) => x["@type"] === "BreadcrumbList")[0].itemListElement;
  assert.equal(crumbs.length, 3);
  assert.match(crumbs[2].item, /formation-nacelles-elevatrices\.html$/);
});

test("page : SEO (title, description, canonical, Open Graph) et image OG existante", () => {
  const html = read(N.url);
  assert.match(html, /<title>Formation Nacelles Élévatrices \| Wisy Safety<\/title>/);
  assert.match(html, /<meta name="description" content="Découvrez la formation Nacelles Élévatrices de Wisy Safety : théorie et pratique/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.wisysafety\.be\/formation-nacelles-elevatrices\.html">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/www\.wisysafety\.be\/assets\/images\/nacelles\/nacelles-og-1200x630\.jpg">/);
  assert.ok(exists("assets/images/nacelles/nacelles-og-1200x630.jpg"));
});

test("VÉRACITÉ : le contenu de la page (main + modal) n'affirme aucune certification / CACES / agrément", () => {
  const html = read(N.url);
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  const visible = main.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, BANNED, "texte de la page");
  const js = read("js/formation-nacelles.js");
  assert.doesNotMatch(js.slice(js.indexOf("const nacelles"), js.indexOf("HEADER — sticky")), BANNED, "contenu du modal");
});

test("témoignages : section prête mais MASQUÉE tant qu'aucun témoignage réel n'est fourni", () => {
  const html = read(N.url);
  const sec = html.slice(html.indexOf('id="temoignages"') - 120, html.indexOf('id="faq"'));
  assert.match(sec, /<section[^>]*id="temoignages"[^>]*\shidden>/);
  assert.ok(sec.includes("[Nom du participant]") && sec.includes("[Entreprise]") && sec.includes("[Témoignage à renseigner]"));
});

test("miroir serveur (Edge Function) : la nacelle du fichier .ts = registre", () => {
  const ts = read("supabase/functions/chat/knowledge.ts");
  const block = ts.slice(ts.indexOf('{ id: "nacelle"'), ts.indexOf('{ id: "fibre-optique"'));
  assert.ok(block.length > 100, "entrée nacelle trouvée");
  [
    'title: "' + N.title + '"', 'url: "' + N.url + '"', 'signupUrl: "' + N.signupUrl + '"',
    'duration: "' + Trainings.formatDuration(N.durationDays) + '"', 'priceLabel: "' + Trainings.formatPrice(N.price) + '"',
    'format: "' + N.formatLabel + '"', 'category: "' + N.category + '"'
  ].forEach((s) => assert.ok(block.indexOf(s) !== -1, "miroir .ts : " + s));
  N.languageLabels.concat(N.audience, N.types.map((t) => t.name)).forEach((s) => assert.ok(block.indexOf('"' + s + '"') !== -1, "miroir .ts : " + s));
  assert.doesNotMatch(block.replace(/AUCUNE certification[^"]*/i, ""), /caces|certifi/i, "mots-clés .ts");
});

test("inscription : le prix de la nacelle vient du registre (plus de valeur figée)", () => {
  const reg = read("js/registration-data.js");
  assert.match(reg, /priceCents:\s*NACELLE \? NACELLE\.price\.amountCents : null/);
  assert.doesNotMatch(reg, /24500/);
});

test("recherche : l'entrée nacelle est bâtie sur le registre (page dédiée, miniature, faits)", () => {
  const s = read("js/search.js");
  ["TRAINING_NACELLE.url", "TRAINING_NACELLE.images.thumb", "TRAINING_NACELLE.fullTitleKey", "dd.nacelle_dur", "dd.nacelle_fmt", "dd.nacelle_langs"].forEach((k) => {
    assert.ok(s.indexOf(k) !== -1, k);
  });
});

test("navigation : chaque page du site lie la nacelle vers la page dédiée (plus vers l'ancre du catalogue)", () => {
  ["index.html", "formations.html", "contact.html", "avis.html", "inscription.html", N.url].forEach((f) => {
    const h = read(f);
    assert.ok(h.indexOf('href="formations.html#nacelle"') === -1, f + " : ancre du catalogue résiduelle");
    assert.ok(h.indexOf('href="' + N.url + '"') !== -1, f + " : lien vers la page dédiée");
    assert.ok(h.indexOf('<script src="js/trainings-data.js"></script>') !== -1, f + " : registre chargé");
    assert.ok(h.indexOf("Nacelle élévatrice<") === -1, f + " : ancien libellé");
  });
});

test("catalogue : la carte mène à la page dédiée, garde l'ancre #nacelle, sans CACES", () => {
  const h = read("formations.html");
  const card = h.slice(h.indexOf('id="nacelle"'), h.indexOf('id="fibre-optique"'));
  assert.ok(card.indexOf('href="' + N.url + '"') !== -1);
  assert.ok(card.indexOf('src="' + N.images.card + '"') !== -1);
  assert.doesNotMatch(card, /CACES|certifi/i);
  assert.ok(card.indexOf('data-i18n="dd.nacelle_summary"') !== -1);
});

/* ---------------------------- intégrité i18n ---------------------------- */
function loadDictionaries() {
  const w = {};
  ["common", "search", "assistant", "nacelles", "formations"].forEach((n) => {
    new Function("window", read("js/i18n-data-" + n + ".js"))(w);
  });
  return w.I18N;
}
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();

test("i18n : toutes les clés de la page existent en français, et en/nl pour les clés « nac. »", () => {
  const I = loadDictionaries();
  const html = read(N.url);
  const body = html.slice(html.indexOf("<body"));
  const keys = [];
  body.replace(/data-i18n(?:-html)?="([^"]+)"/g, (_, k) => keys.push(k));
  body.replace(/data-i18n-attr="([^"]+)"/g, (_, v) => v.split(",").forEach((p) => keys.push(p.split(":").slice(1).join(":"))));
  assert.ok(keys.length > 150, "clés trouvées : " + keys.length);
  keys.forEach((k) => {
    assert.ok(I.fr[k] != null, "clé absente du français : " + k);
    if (k.indexOf("nac.") === 0 || k.indexOf("dd.nacelle") === 0) {
      assert.ok(I.en[k] != null, "clé absente de l'anglais : " + k);
      assert.ok(I.nl[k] != null, "clé absente du néerlandais : " + k);
    }
  });
});

test("i18n : le français du dictionnaire est IDENTIQUE au texte inline du HTML (aucune dérive)", () => {
  const I = loadDictionaries();
  const html = read(N.url);
  const body = html.slice(html.indexOf("<body"), html.indexOf("<script src="));
  let checked = 0;
  body.replace(/<([a-z0-9]+)\b[^>]*\sdata-i18n="((?:nac\.|dd\.nacelle)[^"]+)"[^>]*>([^<]*)</g, (_, tag, key, text) => {
    assert.equal(norm(text), norm(I.fr[key]), "dérive FR pour " + key);
    checked++;
    return "";
  });
  assert.ok(checked > 120, "textes comparés : " + checked);
});

test("i18n : les dictionnaires nacelles couvrent le modal (7 types × desc/principe/usages/avantages/limites) en en/nl", () => {
  const I = loadDictionaries();
  N.types.forEach((t) => ["desc", "principle", "uses", "pros", "cons"].forEach((f) => {
    ["en", "nl"].forEach((l) => assert.ok(I[l]["nac.t_" + t.id + "_" + f], l + " nac.t_" + t.id + "_" + f));
  }));
  /* mêmes nombres d'éléments par liste dans toutes les langues (usages / avantages / limites) */
  const js = read("js/formation-nacelles.js");
  N.types.forEach((t) => ["uses", "pros", "cons"].forEach((f) => {
    assert.equal(I.en["nac.t_" + t.id + "_" + f].split("|").length, I.nl["nac.t_" + t.id + "_" + f].split("|").length, t.id + " " + f);
  }));
  assert.ok(js.indexOf("const nacelles = {") !== -1);
});

test("i18n : titre complet et résumé de la formation traduits dans les 10 langues du site", () => {
  const I = loadDictionaries();
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    ["dd.nacelle_full", "dd.nacelle_summary", "dd.nacelle_dur", "dd.nacelle_fmt", "dd.nacelle_langs"].forEach((k) => {
      assert.ok(I[l][k] && I[l][k].length > 2, l + " " + k);
    });
  });
});
