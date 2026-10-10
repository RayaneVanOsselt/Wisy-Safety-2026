"use strict";
/* Page d'accueil (index.html) : en-tête et pied de page INCHANGÉS, destinations réelles, faits repris du registre
   (aucune donnée inventée), cartes entièrement cliquables, entrée de marque sûre (courte, jamais bloquante, jamais en
   mouvement réduit, LCP inchangé), section VCA sans section VCA Entreprise (retirée). `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Site = require("../js/site-content.js");
const Trainings = require("../js/trainings-data.js");
const FAQ = require("../js/faq-data.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const HTML = read("index.html");
const MAIN = HTML.slice(HTML.indexOf('<main class="home"'), HTML.indexOf("</main>"));
const TEXT = MAIN.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const part = (s, a, b) => { const i = s.indexOf(a); return s.slice(i, s.indexOf(b, i) + b.length); };
const noCurrent = (s) => s.replace(/\s*aria-current="page"/g, "");
const I18N = (() => { const ctx = { window: {} }; ctx.window.I18N = {}; require("node:vm").runInNewContext(read("js/i18n-data-common.js") + read("js/i18n-data-search.js") + read("js/i18n-data-home.js"), ctx); return ctx.window.I18N; })();

/* ------------------------------------------------------------------ en-tête / pied de page */
test("en-tête (menu mobile compris) et pied de page : identiques à ceux des autres pages, octet pour octet", () => {
  ["contact.html", "formations.html", "avis.html"].forEach((f) => {
    const other = read(f);
    assert.equal(noCurrent(part(HTML, '<header class="site-header"', "</aside>")), noCurrent(part(other, '<header class="site-header"', "</aside>")), "en-tête ≠ " + f);
    assert.equal(noCurrent(part(HTML, '<footer class="site-footer">', "</footer>")), noCurrent(part(other, '<footer class="site-footer">', "</footer>")), "pied de page ≠ " + f);
  });
  /* la couche de l'accueil ne cible jamais les éléments partagés */
  const css = read("css/home.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = css.split("}").map((r) => r.split("{")[0].trim()).filter((s) => s && !s.startsWith("@") && !/^(from|to|\d+%)$/.test(s));
  selectors.forEach((sel) => sel.split(",").forEach((one) => {
    const s = one.trim();
    assert.match(s, /(\.home|\.js|html|\[dir="rtl"\]|:root)/, "sélecteur non préfixé : " + s);
    assert.doesNotMatch(s, /\.site-header|\.site-footer|\.m-panel|\.wsy-search|#wisy-assistant|\.wcc-banner/, "la couche d'accueil ne touche pas au chrome partagé : " + s);
  }));
  assert.match(HTML, /<link rel="stylesheet" href="css\/home\.css">/, "feuille dédiée");
  assert.match(HTML, /<script src="js\/home\.js"><\/script>/, "script dédié");
});

/* ------------------------------------------------------------------ destinations */
test("chaque carte / bloc cliquable est un lien complet vers une destination réelle (aucun « # », aucun lien imbriqué)", () => {
  const links = [...MAIN.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  assert.ok(links.length >= 30, "liens de l'accueil : " + links.length);
  links.forEach(([, attrs, inner]) => {
    const href = (attrs.match(/href="([^"]*)"/) || [])[1];
    assert.ok(href && href !== "#", "href manquant ou mort : " + attrs.slice(0, 80));
    assert.doesNotMatch(inner, /<a\b|<button\b/, "élément interactif imbriqué dans un lien : " + href);
    if (/^#/.test(href)) assert.match(MAIN, new RegExp('id="' + href.slice(1) + '"'), "ancre locale introuvable : " + href);
  });
  const cards = ["home-path", "home-tr ", "home-tr-row", "home-pass", "home-exam", "home-vlink", "home-step", "home-float"];
  cards.forEach((c) => {
    const n = (MAIN.match(new RegExp('class="' + c.trim() + '[\\s"]', "g")) || []).length;
    const asLink = (MAIN.match(new RegExp('<a class="' + c.trim() + '[\\s"]', "g")) || []).length;
    assert.ok(n > 0 && n === asLink, c + " : toutes les cartes sont des <a> (" + asLink + "/" + n + ")");
  });
});

test("formations mises en avant = registre du site (route, titre traduit, durée)", () => {
  const byUrl = {};
  Site.formations().forEach((f) => { byUrl[f.url] = f; });
  const cards = [...MAIN.matchAll(/<a class="home-(?:tr|tr-row)\b[^"]*" href="([^"]+)"[\s\S]*?<\/a>/g)];
  const seen = cards.map((m) => m[1]).filter((u) => u !== "peb-wallonie-bruxelles.html");
  assert.deepEqual(seen.slice().sort(), Site.formations().map((f) => f.url).sort(), "les six formations du registre, chacune une fois");
  cards.forEach(([block, url]) => {
    if (url === "peb-wallonie-bruxelles.html") { assert.ok(Site.pages().some((p) => p.url === url)); return; }
    const f = byUrl[url];
    assert.ok(block.includes('data-i18n="' + f.titleKey + '"'), url + " : titre = clé du registre " + f.titleKey);
    /* Durée NON confirmée (fiches 2026-10-01) : aucune durée affichée, mais un fait vérifié du registre (factKeys). */
    if (f.duration == null) {
      assert.doesNotMatch(block, /data-i18n="(dd\.[a-z_]+_dur|home\.dur_\dd)"/, url + " : aucune durée non confirmée affichée");
      assert.ok((f.factKeys || []).some((k) => block.includes('data-i18n="' + k + '"')), url + " : un fait vérifié du registre est affiché");
      return;
    }
    const dur = (block.match(/data-i18n="(dd\.[a-z_]+_dur|home\.dur_\dd)"/) || [])[1];
    assert.ok(dur, url + " : durée affichée");
    assert.equal(I18N.fr[dur], f.duration, url + " : durée = registre (" + f.duration + ")");
  });
  /* VCA Base : prix et faits confirmés du registre */
  assert.equal(I18N.fr["home.vca_price"].replace(/ /g, " "), Trainings.vcaBase.price.amountCents / 100 + " € / personne");
  ["dd.vca_base_dur", "dd.vca_base_fmt", "dd.vca_base_exam"].forEach((k) => assert.ok(MAIN.includes('data-i18n="' + k + '"'), k));
});

test("VCA : formation VCA Base + ressources ; pas de section VCA Entreprise sur l'accueil (retirée), parcours entreprise → devis réel", () => {
  const vca = part(MAIN, '<section class="home-section home-vca"', "</section>");
  assert.match(vca, /<a class="home-pass[^"]*" href="formation-vca-base\.html"/); assert.match(vca, /<a class="home-exam[^"]*" href="formation-vca-base\.html#examen"/);
  assert.match(vca, /href="article-vca-cout-financement\.html"/); assert.match(vca, /href="article-vca-erreurs-examen\.html"/); assert.match(vca, /href="formation-vca-ligne-hierarchique\.html"/);
  /* examen officiel : les chiffres affichés = registre (faits OFFICIELS sourcés, js/trainings-data.js) */
  const ex = Trainings.vcaBase.official.exam;
  assert.match(vca, new RegExp('data-count="' + ex.questions + '"')); assert.match(vca, new RegExp('data-count="' + ex.minutes + '"'));
  assert.equal(I18N.fr["home.exam_pass"].replace(/\u00a0/g, " "), String(ex.passPercent).replace(".", ",") + " %", "seuil affiché = registre");
  assert.match(read("css/home.css"), new RegExp("stroke-dashoffset: " + (100 - ex.passPercent) + ";"), "jauge = seuil officiel");
  assert.match(I18N.fr["home.exam_src"], /BeSaCC-VCA/, "source officielle citée");
  /* section « VCA Entreprise » retirée de l'accueil à la demande du propriétaire (2026-09-26) : plus de bloc ni d'ancre */
  assert.doesNotMatch(MAIN, /home-biz|id="entreprises"|href="#entreprises"|homeBizVideo/);
  assert.doesNotMatch(read("css/home.css") + read("js/home.js"), /home-biz|homeBizVideo/, "aucun style ni script résiduel");
  /* « Former mon équipe » (hero) et la carte « Je forme mes équipes » mènent au formulaire de devis RÉEL */
  assert.match(MAIN, /<a class="home-btn home-btn--ghost" href="contact\.html#wisy-contact-form"><span data-i18n="home\.hero_cta2">/);
  assert.match(MAIN, /<a class="home-path home-path--team[^"]*" href="contact\.html#wisy-contact-form"/);
  assert.match(read("contact.html"), /id="wisy-contact-form"/);
  assert.ok(FAQ.items().some((it) => it.id === "faq-entreprises-devis"), "le devis pour les entreprises est une réponse publiée du Centre d'aide");
});

/* ------------------------------------------------------------------ véracité */
test("aucune affirmation interdite ou inventée dans le contenu de l'accueil", () => {
  assert.doesNotMatch(TEXT, /CACES|R486|certifiant|Certification reconnue|agréé|accrédit|taux de réussite|témoignage|★/i);
  const nac = part(MAIN, 'href="formation-nacelles-elevatrices.html"', "</a>");
  assert.doesNotMatch(nac, /certif|agré|reconnu|obligatoire/i, "nacelles : jamais présentée comme certifiante (registre : unconfirmed)");
  /* chiffres : uniquement ceux déjà publiés par le site (accueil historique, contact, agenda) */
  const ex = Trainings.vcaBase.official.exam;
  assert.deepEqual([...MAIN.matchAll(/data-count="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b), [10, ex.questions, ex.minutes, 100, 250, 500].sort((a, b) => a - b));
  assert.doesNotMatch(TEXT, /\b(1[1-9]|[2-9]\d)\s*ans\b|\b\d{2,3}\s*%\s*de réussite/i, "aucune autre ancienneté ni taux");
  /* aucune date écrite en dur (les sessions ne viennent que de js/sessions-data.js) */
  assert.doesNotMatch(TEXT, /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+20\d{2}\b/i);
});

/* ------------------------------------------------------------------ entrée de marque */
test("entrée de marque : décidée avant l'affichage, une fois par session, courte, sans fichier à charger, jamais bloquante", () => {
  const head = HTML.slice(0, HTML.indexOf("</head>"));
  assert.match(head, /sessionStorage\.getItem\(k\);sessionStorage\.setItem\(k,"1"\)/, "une seule fois par session");
  assert.match(head, /!seen&&!location\.hash&&/, "pas d'entrée si une ancre est demandée");
  assert.match(head, /document\.visibilityState!=="hidden"&&/, "pas d'entrée dans un onglet ouvert en arrière-plan");
  assert.match(head, /bot\\b\|crawl\|spider/, "pas d'entrée pour les robots");
  assert.match(head, /catch\(e\)\{seen="1";\}/, "stockage indisponible → pas d'entrée");

  /* la scène : juste après le lien d'évitement (peinte dès le premier affichage), décor pur, cachée sans CSS */
  const body = HTML.slice(HTML.indexOf("<body>"));
  const stage = part(body, '<div class="home-entrance"', "\n</div>");
  assert.ok(body.indexOf('<div class="home-entrance"') < body.indexOf('<header class="site-header"'), "avant l'en-tête");
  assert.match(stage, /^<div class="home-entrance" hidden aria-hidden="true" data-entrance>/, "cachée sans CSS, ignorée des lecteurs d'écran");
  assert.doesNotMatch(stage, /<(img|video|picture|iframe|a|button|input|select|textarea)\b|\b(src|srcset|href|tabindex)=|url\((?!#)/i, "aucun fichier à charger, rien de cliquable ni de focalisable");
  assert.match(stage, /<svg class="home-entrance__logo" viewBox="106 96 289 319"/, "logo vectoriel en ligne, même cadre que l'image du logo de l'en-tête");
  assert.match(stage, /<p class="home-entrance__tag" data-i18n="home\.hero_tag">/, "signature traduite");

  /* durée : un seul réglage partagé par le CSS et le JS, garde-fou, et tout geste la passe */
  const css = read("css/home.css"), js = read("js/home.js");
  const lift = +css.match(/html\.home-intro \{ --e-lift: (\d+)ms;/)[1];
  assert.equal(+js.match(/ENTRANCE_LIFT = (\d+);/)[1], lift, "CSS et JS calés sur le même lever du rideau");
  assert.ok(lift <= 1300, "le rideau se lève avant 1,3 s : " + lift + " ms");
  assert.ok(+js.match(/ENTRANCE_MAX = (\d+);/)[1] <= 4000, "garde-fou : scène retirée au plus tard après 4 s");
  ["pointerdown", "keydown", "wheel", "touchmove", "scroll", "visibilitychange"].forEach((ev) => assert.ok(js.includes('"' + ev + '"'), "passer l'entrée : " + ev));

  /* au-dessus de l'en-tête (1000), du bandeau cookies (1130), de l'assistant (1150) et du menu (1200) ; sous le centre de préférences (1400) */
  const z = +css.match(/html\.home-intro \.home-entrance \{[^}]*z-index: (\d+)/)[1];
  assert.ok(z > 1200 && z < 1400, "z-index de la scène : " + z);

  /* fluidité : rien que des propriétés composées (transform, opacity) + le tracé du petit logo SVG — aucune mise en page */
  const allowed = new Set(["transform", "opacity", "visibility", "scale", "stroke-dashoffset", "fill-opacity", "stroke-opacity"]);
  const frames = [...css.matchAll(/^@keyframes (home-entrance-[\w-]+) \{(.*)\}$/gm)];
  assert.ok(frames.length >= 10, "images clés de l'entrée : " + frames.length);
  frames.forEach(([, name, body]) => [...body.matchAll(/([a-z-]+)\s*:/g)].forEach(([, prop]) => assert.ok(allowed.has(prop), name + " anime " + prop)));

  /* LCP : sous le rideau, le hero est DÉJÀ peint (titre, texte, affiche du logo) ; son entrée ne joue que sur transform */
  assert.match(css, /\.js\.home-intro \.home-hero \[data-hero-step\], \.js\.home-intro \.home-hero \.home-line__in \{ opacity: 1; transform: none; filter: none; \}/);
  assert.match(css, /\.js\.home-intro \.home-hero:not\(\.is-revealed\) \.home-hero__screen \{ opacity: 1; \}/);

  /* mouvement réduit : aucune entrée (ni scène, ni vidéo) */
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.home-entrance \{ display: none !important; \}/, "mouvement réduit : aucune entrée de marque");
  assert.match(css, /\.home-still \.home-hero__still \{ display: block; \}/, "mouvement réduit : image fixe du logo");

  /* l'ancienne intro vidéo (≈ 11,5 s, dépendante du chargement de la vidéo) a disparu */
  assert.doesNotMatch(HTML + css + js + read("js/i18n-data-home.js"), /home-intro-skip|home-hero__stage|home-intro-tagline|INTRO_HOLD|intro_skip/);
});

test("vidéo du logo : contrôle lecture / pause accessible et traduit ; aucune lecture automatique hors écran", () => {
  const toggles = [...MAIN.matchAll(/<button class="home-hero__toggle"[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
  assert.equal(toggles.length, 1, "un seul contrôle : la vidéo du logo");
  toggles.forEach((t) => assert.match(t, /<span class="home-sr" data-i18n="home\.video_pause">/, "nom accessible traduit"));
  const js = read("js/home.js");
  ["home.video_pause", "home.video_play", "home.video_replay"].forEach((k) => ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => assert.ok(I18N[l][k], l + " " + k)));
  assert.match(js, /else if \(!video\.paused\) video\.pause\(\)/, "pause dès que la vidéo sort de l'écran");
});
