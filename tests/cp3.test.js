"use strict";
/* =========================================================================
   Fiche « Conseiller en prévention niveau III » (CP3) — formation-conseiller-prevention-niveau-3.html
   Protège les règles d'honnêteté du brief (docs/prompt-cp3.md, docs/README-CP3.md) :
     • aucune affirmation « agréé / reconnu par le SPF / certificat officiel », même une fois Wisy Safety inscrite sur la liste ;
     • l'inscription sur la liste du SPF n'est affirmée que si le registre la confirme (`official.spfListed`) ET qu'une source vérifiée l'atteste ;
     • aucun prix, durée exacte ou date inventés ; chaque fait réglementaire porte un data-src SRC-CP3-… connu du registre ;
     • la règle de l'outil « Quel niveau pour mon entreprise ? » (groupes A–D, art. II.1-2) ;
     • le lien est dans les menus (bureau + mobile) de toutes les pages.
   ========================================================================= */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const Trainings = require("../js/trainings-data.js");
const Sources = require("../js/sources-data.js");

const PAGE_FILE = "formation-conseiller-prevention-niveau-3.html";
const PAGE = fs.readFileSync(path.join(ROOT, PAGE_FILE), "utf8");
const CP3 = Trainings.conseillerPrevention;
const LANGS = ["en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
/* Texte lisible : sans script, style, commentaires ni balises (donc sans les URL des href, dont « /fr/agrements/ » du SPF). */
const visible = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const MAIN = PAGE.slice(PAGE.indexOf("<main"), PAGE.indexOf("</main>"));
const MAIN_TEXT = visible(MAIN);

test("registre : la formation est une fiche à page dédiée, sans prix ni durée inventés", () => {
  assert.equal(Trainings.get("conseiller-prevention"), CP3);
  assert.ok(Trainings.hasDedicatedPage(CP3), "l'URL doit respecter formation-*.html");
  assert.equal(CP3.url, PAGE_FILE);
  assert.equal(CP3.price, null, "aucun tarif confirmé");
  assert.equal(CP3.durationDays, null, "aucune durée en jours confirmée (le Code impose 40 h minimum, pas une durée de session)");
  assert.equal(CP3.official.minHours, 40, "art. II.4-25, 3° : 40 heures minimum");
  assert.equal(CP3.official.levelIIAccessYears, 5, "art. II.4-4, § 4 : cinq ans d'expérience");
  ["agréé", "agrément", "reconnu par le spf", "certificat officiel"].forEach((w) => assert.ok(CP3.unconfirmed.indexOf(w) !== -1, w + " reste interdit"));
  assert.ok(!CP3.unconfirmedClaims.some((c) => /liste du SPF/i.test(c)), "l'inscription sur la liste n'est plus « non confirmée » une fois constatée");
});

test("outil « Quel niveau ? » : groupes A, B, C (ou D) d'après l'art. II.1-2", () => {
  const f = Trainings.cp3Outcome;
  assert.equal(f("lt20", null), "c", "moins de 20 → C (D si l'employeur est lui-même conseiller), quel que soit le secteur");
  assert.equal(f("lt20", "yes"), "c");
  assert.equal(f("gt1000", null), "a", "plus de 1 000 → A, aucun secteur n'élève le seuil");
  assert.equal(f("lt200", "no"), "c");
  assert.equal(f("lt1000", "no"), "b");
  ["yes", "unknown"].forEach((r) => { assert.equal(f("lt200", r), "risk"); assert.equal(f("lt1000", r), "risk"); });
  assert.equal(f("lt200", null), null, "réponse incomplète → pas de verdict");
  assert.equal(f("lt1000", null), null);
  assert.equal(f(null, "no"), null);
  assert.equal(f("n'importe quoi", "no"), null);
});

test("outil : la page propose exactement les tailles et les résultats que la règle connaît", () => {
  const sizes = [...MAIN.matchAll(/name="cp3-size" value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sizes, ["lt20", "lt200", "lt1000", "gt1000"]);
  const risks = [...MAIN.matchAll(/name="cp3-risk" value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(risks, ["yes", "no", "unknown"]);
  const results = [...MAIN.matchAll(/data-fx-result="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(results, ["a", "b", "c", "risk"]);
  const reachable = new Set();
  sizes.forEach((s) => risks.concat([null]).forEach((r) => { const o = Trainings.cp3Outcome(s, r); if (o) reachable.add(o); }));
  assert.deepEqual([...reachable].sort(), results, "chaque bloc de résultat est atteignable");
  assert.match(fs.readFileSync(path.join(ROOT, "js/formation-fiche.js"), "utf8"), /cp3Outcome/, "le script de la page utilise la règle du registre");
});

test("honnêteté : jamais « agréé », « reconnu par le SPF », « certificat officiel » (page + 10 langues)", () => {
  const FORBIDDEN = /agr[ée]{1,2}(?!\w)|agr[ée]ment|reconnu par le SPF|certificat officiel|examen officiel|garanti|approved by|accredited|erkend door|anerkannt vom/i;
  assert.doesNotMatch(MAIN_TEXT, FORBIDDEN, "page");
  assert.doesNotMatch(visible(fs.readFileSync(path.join(ROOT, "js/i18n-data-cp3.js"), "utf8").replace(/href=\\"[^"]*\\"/g, "")), FORBIDDEN, "dictionnaire");
  LANGS.forEach((l) => {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, "content/i18n/cp3/" + l + ".json"), "utf8"));
    Object.keys(json).forEach((k) => assert.doesNotMatch(visible(String(json[k])), FORBIDDEN, l + " · " + k));
  });
  const reg = JSON.stringify([CP3.summary, CP3.objective, CP3.fullTitle, CP3.features, CP3.audience, CP3.imageAlt]);
  assert.doesNotMatch(reg, FORBIDDEN, "registre");
});

test("honnêteté : aucun tarif, aucune durée de session, aucune date de session inventés", () => {
  assert.doesNotMatch(MAIN_TEXT, /\d\s?(€|euros?|EUR)\b|€\s?\d/i, "aucun montant");
  assert.doesNotMatch(MAIN_TEXT, /\b\d+\s?(jours?|journées?)\s+de formation/i, "aucune durée de session");
  assert.match(MAIN_TEXT, /Durée, tarif et dates\s+communiqués sur demande/, "durée, tarif et dates : sur demande");
  /* « 40 heures » n'apparaît que comme minimum légal (art. II.4-25), jamais comme durée de la session de Wisy Safety. */
  [...MAIN_TEXT.matchAll(/[^.]{0,80}\b40 (?:h|heures)[^.]{0,60}/g)].forEach((m) => assert.match(m[0], /minim|\bmin\b|au moins/i, "40 h = minimum légal : " + m[0]));
});

test("liste du SPF : affirmée seulement si le registre la confirme et qu'une source vérifiée l'atteste", () => {
  const claim = Sources.claim("SRC-CP3-010");
  const says = /figure sur (la|cette) liste|est inscrite sous le nom/i.test(MAIN_TEXT);
  if (CP3.official.spfListed === true) {
    assert.ok(says, "registre = inscrite → la page le dit");
    assert.ok(claim && Sources.PUBLISHABLE[claim.status], "SRC-CP3-010 est une affirmation publiable");
    assert.equal(claim.doc, "DOC-SPF-CP-LISTE");
    assert.ok(Sources.doc("DOC-SPF-CP-LISTE").url.indexOf("liste-des-institutions-qui-dispensent-des-cours-de-base") > 0, "document = la liste officielle");
    assert.match(CP3.official.spfListedAs, /Wisy/);
    assert.match(CP3.official.spfListVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(MAIN_TEXT, /Wisy asbl/, "nom exact de l'entrée de la liste");
    assert.match(MAIN_TEXT, /notification/i, "l'inscription est présentée pour ce qu'elle est : une notification, pas un agrément");
    assert.match(MAIN_TEXT, /II\.4-27/, "elle peut être retirée après contrôle");
  } else {
    assert.ok(!says, "registre = non confirmé → la page ne l'affirme pas");
  }
});

test("sources : chaque affirmation réglementaire porte un data-src SRC-CP3-… publiable", () => {
  const ids = [...MAIN.matchAll(/data-src="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  assert.ok(ids.length >= 25, "au moins 25 affirmations sourcées, trouvé " + ids.length);
  ids.forEach((id) => {
    assert.match(id, /^SRC-CP3-\d{3}$/, id);
    const c = Sources.claim(id);
    assert.ok(c && Sources.PUBLISHABLE[c.status], id + " inconnu ou non publiable");
    assert.ok(c.pages.indexOf(PAGE_FILE) !== -1, id + " ne déclare pas la page");
    assert.ok(c.passage && Sources.doc(c.doc), id + " : passage et document requis");
  });
  /* Éléments qui énoncent le droit et portent LEUR PROPRE data-src : lead, résultats de l'outil, encadré, réponses de la FAQ. */
  ["cp3.lead", "cp3.r_c", "cp3.r_b", "cp3.r_a", "cp3.r_risk", "cp3.s6_p2", "cp3.q1_a", "cp3.q2_a", "cp3.q3_a", "cp3.q4_a", "cp3.q5_a", "cp3.q7_a"].forEach((k) => {
    const m = MAIN.match(new RegExp("<[^>]*data-i18n(?:-html)?=\"" + k.replace(/\./g, "\\.") + "\"[^>]*>"));
    assert.ok(m && /data-src="SRC-CP3-\d{3}/.test(m[0]), k + " : data-src attendu sur l'élément");
  });
  /* Conteneurs qui portent le data-src de leurs lignes : plaque du Code, 4 fiches, 3 étapes du parcours, encadré de la liste, programme. */
  assert.match(MAIN, /<div class="fx-plate" data-src="SRC-CP3-/);
  assert.equal((MAIN.match(/<div class="cp3-sheet__item" data-src="SRC-CP3-/g) || []).length, 4);
  assert.equal((MAIN.match(/<li data-src="SRC-CP3-\d{3}[^"]*"><span class="fx-path__step"/g) || []).length, 3);
  assert.match(MAIN, /<div class="cp3-callout" data-src="SRC-CP3-/);
  assert.match(MAIN, /<ol class="fx-steps fx-steps--2col" data-src="SRC-CP3-002">/);
});

test("faits : les chiffres de la page sont ceux du Code (groupes, 40 h, 5 ans)", () => {
  assert.match(MAIN_TEXT, /40 heures de cours au minimum/);
  assert.match(MAIN_TEXT, /moins de 200 travailleurs \(groupe C\)/);
  assert.match(MAIN_TEXT, /moins de 20 travailleurs qui exerce lui-même la fonction \(groupe D\)/);
  assert.match(MAIN_TEXT, /au moins cinq ans d'expérience pratique utile dans un service interne ou externe/);
  assert.match(MAIN_TEXT, /Le Code ne fixe pas son volume pour le niveau III/);
  assert.match(MAIN_TEXT, /dès 50 travailleurs/, "exemple de la construction (art. II.1-2, groupe B dès 50)");
});

test("menus : le lien est dans l'en-tête et le menu mobile des pages du site", () => {
  const pages = fs.readdirSync(ROOT).filter((f) => /\.html$/.test(f) && f !== "404.html");
  assert.ok(pages.length >= 25, "au moins 25 pages, trouvé " + pages.length);
  pages.forEach((f) => {
    const html = fs.readFileSync(path.join(ROOT, f), "utf8");
    const n = html.split('href="' + PAGE_FILE + '"').length - 1;
    assert.ok(n >= 2, f + " : lien CP3 attendu dans le menu bureau ET mobile (trouvé " + n + ")");
    assert.match(html, /data-i18n="dd\.cp3"/, f + " : libellé traduit");
  });
});

test("inscription : aucun prix inventé, paiement le jour de la formation, parcours et feuille Réservations alignés", () => {
  const reg = fs.readFileSync(path.join(ROOT, "js/registration-data.js"), "utf8");
  const block = reg.slice(reg.indexOf('id: "conseiller-prevention"'), reg.indexOf('id: "conseiller-prevention"') + 2500);
  assert.match(block, /onQuote: !registryPriceCents\("conseillerPrevention"\)/, "sur devis tant que le registre n'a pas de prix");
  assert.match(block, /priceCents: registryPriceCents\("conseillerPrevention"\)/);
  assert.match(fs.readFileSync(path.join(ROOT, "google-sheets/reservations.gs"), "utf8"), /\["conseiller-prevention", "[^"]+", "Formation", PAY_ON_SITE/);
});

test("documentation : docs/README-CP3.md reflète l'état réel de l'inscription sur la liste", () => {
  const doc = fs.readFileSync(path.join(ROOT, "docs/README-CP3.md"), "utf8");
  if (CP3.official.spfListed === true) assert.match(doc, /Wisy asbl/, "la doc décrit l'entrée de la liste");
  else assert.match(doc, /À faire AVANT de vendre/, "la doc rappelle la démarche d'inscription");
});
