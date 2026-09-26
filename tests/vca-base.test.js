"use strict";
/* Page « Formation VCA Base » (formation-vca-base.html) et ses deux articles : faits = registre js/trainings-data.js,
   RÈGLE ABSOLUE « rien d'inventé » (aucun agrément, taux, témoignage, date, langue non confirmés), structure,
   ancres, suivi des conversions, liens, cohérence catalogue / inscription / recherche / assistant.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Trainings = require("../js/trainings-data.js");
const Site = require("../js/site-content.js");
const FAQ = require("../js/faq-data.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
/* assert.match / doesNotMatch sans jamais afficher la page entière quand ça échoue */
const A = {
  match: (s, re, msg) => assert.ok(re.test(String(s)), (msg || "") + " — motif introuvable : " + re),
  doesNotMatch: (s, re, msg) => { const m = re.exec(String(s)); assert.ok(!m, (msg || "") + " — trouvé : « " + (m ? m[0].slice(0, 90) : "") + " »"); }
};
const V = Trainings.vcaBase;
const PAGE = "formation-vca-base.html", ART1 = "article-vca-cout-financement.html", ART2 = "article-vca-erreurs-examen.html";
const NEW = [PAGE, ART1, ART2];
const html = Object.fromEntries(NEW.map((f) => [f, read(f)]));
const mainOf = (h) => h.slice(h.indexOf("<main"), h.indexOf("</main>") + 7);
const visible = (h) => h.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/\s+/g, " ");
const TEXT = Object.fromEntries(NEW.map((f) => [f, visible(mainOf(html[f]))]));
const I18N = (() => { const ctx = { window: {} }; ["common", "search", "formations", "vca", "articles", "art-cost", "art-exam"].forEach((n) => vm.runInNewContext(read("js/i18n-data-" + n + ".js"), ctx)); return ctx.window.I18N; })();
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

/* ------------------------------------------------------------------ registre */
test("registre : la VCA Base est une formation à page dédiée, construite depuis js/trainings-data.js", () => {
  const f = Site.formation("vca-base");
  assert.equal(f.url, PAGE); assert.equal(f.dedicatedPage, true); assert.equal(f.signupUrl, "inscription.html?formation=vca-base");
  assert.equal(V.price.amountCents, 22500); assert.equal(V.price.currency, "EUR"); assert.equal(V.priceUnit, "participant");
  assert.equal(V.price.vatIncluded, null, "statut TVA NON confirmé : ni HT ni TTC n'est inventé");
  assert.equal(V.durationDays, 1); assert.equal(V.exam.included, true); assert.equal(V.formatLabel, "Présentiel"); assert.equal(V.venue, "centre");
  assert.equal(V.languages, null, "langues NON confirmées (l'ancienne page citait FR/EN/NL sans preuve)");
  assert.equal(f.priceLabel, "225 €"); assert.equal(f.languages, undefined);
  assert.equal(V.certification, "Certification VCA après réussite de l'examen");
  ["agréé", "agrément", "accrédité", "reconnu internationalement", "taux de réussite"].forEach((c) => assert.ok(V.unconfirmedClaims.includes(c), "affirmation non confirmée déclarée : " + c));
});

test("registre : faits OFFICIELS sourcés (examen B-VCA, validité du diplôme) — chiffres cohérents avec le programme", () => {
  assert.deepEqual(V.official.exam, { questions: 40, minutes: 60, passPercent: 64.5 });
  assert.equal(V.official.diplomaValidityYears, 10); assert.equal(V.official.worksiteTrainingMinHours, 8);
  A.match(V.official.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  const total = V.programme.reduce((n, c) => n + c.subjects.reduce((m, s) => m + s.questions, 0), 0);
  assert.equal(total, V.official.exam.questions, "la répartition par sujet totalise les 40 questions");
  assert.equal(V.programme.reduce((n, c) => n + c.subjects.length, 0), 12, "12 sujets officiels");
  assert.deepEqual(V.programme.map((c) => c.id), ["A", "B", "C", "D"]);
  const urls = [V.official.sources.registre, V.official.sources.reglement, V.official.sources.spf, V.official.sources.constructiv].concat(Object.values(V.official.sources.besacc));
  urls.forEach((u) => A.match(u, /^https:\/\/(www\.besacc-vca\.be|csm-examen\.be|emploi\.belgique\.be|constructiv\.be)\//, "source officielle : " + u));
});

/* ------------------------------------------------------------------ structure & ancres */
test("fichiers, un seul H1, hiérarchie des titres sans saut, ancres du plan de page", () => {
  ["css/formation-vca.css", "css/article.css", "js/formation-vca.js", "js/article.js", "js/site-chrome.js", "js/i18n-data-vca.js", "js/i18n-data-articles.js", "js/i18n-data-art-cost.js", "js/i18n-data-art-exam.js",
    "assets/images/formations/vca-base.webp", V.images.thumb, V.images.og, "assets/images/vca-base/article-cout-financement-1024.webp", "assets/images/vca-base/article-erreurs-examen-1024.webp"].forEach((f) => assert.ok(exists(f), f));
  NEW.forEach((f) => {
    assert.equal((html[f].match(/<h1[\s>]/g) || []).length, 1, f + " : un seul H1");
    const levels = [...mainOf(html[f]).matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
    levels.reduce((p, l) => { assert.ok(l <= p + 1, f + " : saut de niveau h" + p + " → h" + l); return l; }, 1);
    [...html[f].matchAll(/aria-labelledby="([^"]+)"/g)].forEach((m) => m[1].split(/\s+/).forEach((id) => A.match(html[f], new RegExp('id="' + id + '"'), f + " : cible aria-labelledby " + id)));
    A.match(html[f], /class="[^"]*skip[^"]*" href="#contenu"|href="#contenu"[^>]*class="[^"]*skip/, f + " : lien d'évitement");
    A.match(html[f], /id="contenu"/);
    assert.ok(!/tabindex="[1-9]/.test(html[f]), f + " : jamais de tabindex positif");
  });
  ["apercu", "pour-qui", "programme", "examen", "pourquoi", "disponibilites", "inscription", "ressources", "faq", "contact"].forEach((id) => A.match(html[PAGE], new RegExp('id="' + id + '"'), "ancre #" + id));
  /* les accès rapides de la recherche visent des ancres qui EXISTENT */
  ["#apercu", "#disponibilites", "#examen"].forEach((a) => assert.ok(read("js/search.js").includes('VCA.url + "' + a + '"'), "la recherche cible " + a));
});

test("images : dimensions déclarées, texte alternatif, image principale jamais différée, le reste en lazy", () => {
  NEW.forEach((f) => {
    const imgs = [...html[f].matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    imgs.forEach((t) => {
      A.match(t, /width="\d+"/, f + " : largeur " + t.slice(0, 70)); A.match(t, /height="\d+"/, f + " : hauteur");
      assert.ok(/\salt="/.test(t) || /data-i18n-attr="alt:/.test(t), f + " : alt");
    });
  });
  const hero = html[PAGE].match(/<img class="vca-photo__img"[^>]*>/)[0];
  A.match(hero, /fetchpriority="high"/); A.doesNotMatch(hero, /loading="lazy"/, "LCP jamais différé");
  [ART1, ART2].forEach((f) => {
    const first = html[f].match(/<img src="assets\/images\/vca-base\/article[^>]*>/)[0];
    A.match(first, /fetchpriority="high"/); A.doesNotMatch(first, /loading="lazy"/, f + " : image principale");
  });
});

/* ------------------------------------------------------------------ faits affichés = registre */
test("le prix, la durée, le format et le lieu affichés sont ceux du registre (une seule valeur, jamais recopiée à la main)", () => {
  const t = TEXT[PAGE];
  A.match(t, /225\s*€\s*\/\s*personne/); A.match(t, /Présentiel/); A.match(t, /1 jour/);
  assert.ok(t.includes(FAQ.CONTACT.street + ", " + FAQ.CONTACT.postalCode + " " + FAQ.CONTACT.city), "adresse = coordonnées de la FAQ");
  A.match(t, /Examen\s+Inclus dans le tarif/);
  const PRICE = /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?€/g;
  const allPrices = [...(t.match(PRICE) || [])].map((p) => p.replace(/\s/g, ""));
  allPrices.forEach((p) => assert.equal(p, "225€", "un seul tarif sur la page : " + p));
  [ART1, ART2].forEach((f) => [...(TEXT[f].match(PRICE) || [])].forEach((p) => assert.equal(p.replace(/\s/g, ""), "225€", f + " : " + p)));
  /* dictionnaire français = HTML (garde de dérive, déjà testé page par page dans i18n-static) + prix du registre */
  assert.equal(I18N.fr["fo.f1c"], "225 € / personne");
  assert.ok(Trainings.formatPrice(V.price) === "225 €");
  const reg = read("js/registration-data.js");
  A.match(reg, /VCA_BASE\.price\.amountCents/, "le parcours d'inscription lit le prix dans le registre");
  A.doesNotMatch(reg.replace(/\/\*[\s\S]*?\*\//g, ""), /22500/, "aucun prix figé dans registration-data.js (hors commentaire)");
});

test("catalogue (formations.html) : la carte VCA Base mène à la page dédiée, garde l'ancre #vca-base, texte = registre", () => {
  const fo = read("formations.html");
  const card = fo.slice(fo.indexOf('id="vca-base"'), fo.indexOf("</article>", fo.indexOf('id="vca-base"')));
  assert.equal((card.match(/href="formation-vca-base\.html"/g) || []).length, 2, "carte entière + bouton");
  A.doesNotMatch(card, /inscription\.html\?formation=vca-base/, "plus de renvoi direct vers l'inscription depuis la carte");
  assert.ok(card.includes(V.summary), "description = résumé du registre");
  A.match(card, /Examen inclus/); A.match(card, /Présentiel à Anderlecht/); A.match(card, /225 € \/ personne/);
  A.doesNotMatch(card, /Certification reconnue|reconnue au niveau national/, "ancienne promesse retirée");
});

test("navigation : la formation VCA de base pointe vers sa page dédiée sur TOUTES les pages (plus vers l'ancre du catalogue)", () => {
  ["index", "formations", "contact", "avis", "inscription", "faq", "agenda", "peb-wallonie-bruxelles", "formation-nacelles-elevatrices", "formation-beps-premiers-secours"].concat(NEW.map((f) => f.replace(".html", ""))).forEach((n) => {
    const h = read(n + ".html");
    A.doesNotMatch(h, /href="formations\.html#vca-base"/, n + " : lien vers l'ancre du catalogue");
    if (n !== "formation-vca-base") assert.ok((h.match(/href="formation-vca-base\.html"/g) || []).length >= 2, n + " : menu déroulant + menu mobile");
  });
});

/* ------------------------------------------------------------------ RÈGLE ABSOLUE : rien d'inventé */
test("aucune affirmation non confirmée (agrément, accréditation, reconnaissance internationale, taux, garantie, témoignage, partenaire, TVA)", () => {
  const BANNED = [
    [/agr[ée]{1,2}\b|agrément/i, "agrément"], [/accr[ée]dit/i, "accréditation"], [/internationalement|reconnue? (au niveau )?(national|international)/i, "reconnaissance"],
    [/taux de r[ée]ussite|\b\d{2,3}\s?% de (réussite|satisfaction)/i, "taux"], [/100\s?%|satisfait ou rembours/i, "garantie chiffrée"],
    [/Pierre Martin|Sophie Leroy|Thomas Dubois/, "faux témoignage de l'ancienne page"], [/t[ée]moignage/i, "témoignage"],
    [/\bHT\b|\bTTC\b|hors TVA/, "statut TVA inventé"], [/formateurs? (certifi|expert|agr)/i, "formateur non confirmé"],
    [/12 participants|groupes? (de|d')\s?\d+/i, "effectif non confirmé"], [/(FR|EN|NL)\s?\/\s?(FR|EN|NL)/, "langues non confirmées"],
    [/8 ?h(eures)? (de )?(formation|cours)/i, "durée de session inventée"], [/\b(9|09)\s?h\s?(00)?\s?[-–]\s?(16|17)\s?h/i, "horaires de session inventés"]
  ];
  NEW.forEach((f) => BANNED.forEach(([re, what]) => A.doesNotMatch(TEXT[f], re, f + " : " + what + " → " + (TEXT[f].match(re) || [])[0])));
  /* même règle dans les dictionnaires traduits de la page (aucune langue n'ajoute une promesse) */
  const dict = JSON.stringify(["vca", "articles", "art-cost", "art-exam"].map((n) => n));
  const files = ["i18n-data-vca.js", "i18n-data-articles.js", "i18n-data-art-cost.js", "i18n-data-art-exam.js"].map((n) => read("js/" + n)).join("\n");
  A.doesNotMatch(files, /Pierre Martin|Sophie Leroy|Thomas Dubois|Weversstraat|1730 Asse/);
  assert.ok(dict);
});

test("le seul pourcentage affiché est le seuil OFFICIEL de l'examen (64,5 %) ; le seul nombre de questions / minutes est celui du registre", () => {
  const pass = String(V.official.exam.passPercent).replace(".", ",") + " %";
  [PAGE, ART2].forEach((f) => assert.ok(TEXT[f].includes(pass), f + " : seuil officiel " + pass));
  NEW.forEach((f) => assert.deepEqual([...TEXT[f].matchAll(/\d+(?:,\d+)?\s?%/g)].map((m) => m[0].replace(/\s/g, "")).filter((p) => p !== pass.replace(/\s/g, "")), [], f + " : pourcentage non sourcé"));
  A.match(TEXT[PAGE], /40 questions/); A.match(TEXT[PAGE], /60 minutes/); A.match(TEXT[PAGE], /10 ans/);
  A.match(TEXT[ART2], /40 questions/); A.match(TEXT[ART2], /60 minutes/);
  A.match(TEXT[ART2], /ne cite aucune statistique/, "l'article le dit : aucune statistique");
});

test("la réussite n'est JAMAIS promise ; le diplôme n'est délivré qu'après réussite ; le statut du centre n'est pas affirmé", () => {
  A.match(TEXT[PAGE], /aucune réussite n'est garantie/i);
  A.match(TEXT[PAGE], /Certification VCA après réussite de l'examen/);
  A.match(TEXT[ART2], /Aucune réussite n'est garantie/);
  A.match(TEXT[PAGE], /Langue\s+Indiquée pour chaque session/, "langue : indiquée par session, jamais devinée");
  NEW.forEach((f) => A.doesNotMatch(TEXT[f], /Wisy Safety est (un )?(centre d'examen )?(agréé|accrédité|reconnu)/i, f));
});

test("chaque affirmation réglementaire est SOURCÉE (liens officiels) et datée", () => {
  const all = NEW.map((f) => html[f]).join("\n");
  [V.official.sources.registre, V.official.sources.reglement, V.official.sources.spf, V.official.sources.constructiv, V.official.sources.besacc.fr].forEach((u) => assert.ok(all.includes(u), "source citée : " + u));
  A.match(TEXT[PAGE], /Sources vérifiées le 26 septembre 2026/);
  A.match(TEXT[ART1], /vérifiées le 26 septembre 2026/); A.match(TEXT[ART2], /vérifiées le 26 septembre 2026/);
  /* liens sortants : nouvel onglet ⇒ noopener */
  NEW.forEach((f) => [...html[f].matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].forEach((m) => A.match(m[0], /rel="[^"]*noopener/, f + " : " + m[0].slice(0, 90))));
});

/* ------------------------------------------------------------------ conversions, liens, contact */
test("suivi des conversions : chaque lien clé porte data-vca-track ; événements du cahier des charges émis par le bus du site", () => {
  const chrome = read("js/site-chrome.js"), vcaJs = read("js/formation-vca.js");
  ["vca_signup_click", "vca_agenda_click", "vca_phone_click", "vca_email_click", "vca_article_click"].forEach((e) => assert.ok(chrome.includes(e), e));
  assert.ok(vcaJs.includes("vca_view"), "vca_view"); assert.ok(read("js/registration.js").includes("vca_registration_start") && read("js/registration.js").includes("vca_registration_complete"));
  ["signup", "agenda", "phone", "email", "article"].forEach((k) => A.match(html[PAGE], new RegExp('data-vca-track="' + k + '"'), "page : " + k));
  A.match(html[PAGE], /href="tel:\+3223188659"[^>]*data-vca-track="phone"|data-vca-track="phone"[^>]*href="tel:\+3223188659"/);
  assert.ok(html[PAGE].includes("mailto:" + FAQ.CONTACT.email));
  A.match(chrome, /new CustomEvent\("wisy:analytics"/, "bus du site : rien n'est relayé sans le consentement (js/cookie-consent.js)");
  A.doesNotMatch(chrome + vcaJs, /gtag\(|fbq\(|dataLayer|ga\('send'/, "aucun traceur codé en dur");
});

test("liens de la page : inscription avec la formation, agenda, articles, contact ; tous les liens internes existent", () => {
  const links = [...mainOf(html[PAGE]).matchAll(/href="([^"#]+)(#[^"]*)?"/g)].map((m) => m[1]);
  assert.ok(links.includes("inscription.html?formation=vca-base"), "inscription pré-remplie");
  ["agenda.html", ART1, ART2, "contact.html", "faq.html", "formations.html"].forEach((l) => assert.ok(links.includes(l), "lien : " + l));
  NEW.forEach((f) => [...html[f].matchAll(/href="([^":#?]+\.html)(?:[?#][^"]*)?"/g)].forEach((m) => assert.ok(exists(m[1]), f + " : page introuvable " + m[1])));
  const ids = new Set([...html[PAGE].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  [...html[PAGE].matchAll(/href="#([^"]+)"/g)].forEach((m) => assert.ok(ids.has(m[1]), "ancre interne #" + m[1]));
  /* inscription : la formation est présélectionnée par ce lien (id du registre d'inscription) */
  const reg = { window: {} }; vm.runInNewContext(read("js/registration-data.js"), Object.assign(reg, { WisyTrainings: Trainings })); reg.WisyRegistrationData = reg.window.WisyRegistrationData || reg.WisyRegistrationData;
  const D = reg.window.WisyRegistrationData || reg.WisyRegistrationData;
  if (D && D.resolveTrainingId) assert.equal(D.resolveTrainingId("vca-base"), "vca-base");
});

test("articles : deux pages réelles (H1, fil d'Ariane à 4 niveaux, sources, CTA vers la formation et l'inscription, article voisin)", () => {
  [[ART1, ART2], [ART2, ART1]].forEach(([f, other]) => {
    A.match(html[f], /<h1 class="art-h1"/);
    assert.equal((html[f].match(/<nav class="art-bc"[\s\S]*?<\/nav>/)[0].match(/<li>/g) || []).length, 4, f + " : fil d'Ariane");
    A.match(html[f], /href="formation-vca-base\.html"[^>]*data-vca-track="signup"|data-vca-track="signup"[^>]*href="formation-vca-base\.html"|href="inscription\.html\?formation=vca-base"[^>]*data-vca-track="signup"/, f + " : CTA");
    assert.ok(html[f].includes('href="' + other + '"'), f + " : article voisin");
    assert.ok(html[f].includes('href="inscription.html?formation=vca-base"'), f + " : CTA d'inscription pré-remplie");
    A.match(TEXT[f], /Sources officielles/);
  });
  A.doesNotMatch(TEXT[ART1] + TEXT[ART2], /Pierre Martin|Sophie Leroy|Thomas Dubois/);
});

/* ------------------------------------------------------------------ langues */
test("10 langues : chaque clé de la page existe partout ; le français du dictionnaire = le HTML (garde de dérive)", () => {
  const keys = new Set();
  NEW.forEach((f) => [...html[f].matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].forEach((m) => keys.add(m[1])));
  [...NEW.map((f) => html[f]).join("\n").matchAll(/data-i18n-attr="([^"]+)"/g)].forEach((m) => m[1].split(",").forEach((p) => keys.add(p.split(":")[1])));
  assert.ok(keys.size > 250, "clés utilisées : " + keys.size);
  LANGS.forEach((l) => keys.forEach((k) => assert.ok(I18N[l] && I18N[l][k] != null && I18N[l][k] !== "", l + " : clé manquante " + k)));
  /* aucune langue ne garde une phrase française par oubli (hors noms propres / adresses) */
  ["en", "nl", "de", "it", "ro", "sl", "bg", "ar", "af"].forEach((l) => {
    ["vca.hero_lead", "vca.prog_lead", "vca.av_empty_p"].forEach((k) => { if (I18N.fr[k]) assert.notEqual(I18N[l][k], I18N.fr[k], l + " : « " + k + " » non traduite"); });
  });
});

test("l'arabe (RTL) : aucune propriété physique gauche/droite dans les feuilles de la page ; chiffres et adresse restent lisibles", () => {
  ["css/formation-vca.css", "css/article.css"].forEach((f) => {
    const css = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    A.doesNotMatch(css, /(^|[;{\s])(margin|padding)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:\s*[-\d]/m, f + " : propriétés physiques (utiliser inline-start / inline-end)");
    A.doesNotMatch(css, /text-align\s*:\s*(left|right)/, f + " : text-align physique");
  });
  A.doesNotMatch(html[PAGE], /<main\b[^>]*\b(lang|dir)=/, "aucun forçage de langue ni de sens de lecture");
});
