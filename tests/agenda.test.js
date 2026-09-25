"use strict";
/* Page Agenda (agenda.html) : structure sémantique, contenu HONNÊTE (aucune date, aucune disponibilité,
   aucune métrique inventée), charte graphique, animations légères, accessibilité, composant
   AgendaCalendarSection (URL Outlook future), navigation et intégration recherche / assistant / FAQ.
   `node --test tests/*.test.js` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const HTML = read("agenda.html");
const CSS = read("css/agenda.css");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const MAIN = HTML.slice(HTML.indexOf("<main"), HTML.indexOf("</main>") + 7);
const TEXT = MAIN.replace(/<!--[\s\S]*?-->/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const Cal = require("../js/agenda-calendar.js");
const Knowledge = require("../js/assistant/knowledge.js");
const Validation = require("../js/assistant/validation.js");
const Responder = require("../js/assistant/responder.js");
const FAQ = require("../js/faq-search.js");

/* ------------------------------------------------------------------ fichiers & SEO */
test("fichiers de la page Agenda présents, scripts liés, feuille propre à la page", () => {
  ["agenda.html", "css/agenda.css", "js/agenda-calendar.js", "js/agenda.js", "docs/README-AGENDA.md"].forEach((f) => assert.ok(exists(f), f));
  assert.match(HTML, /<link rel="stylesheet" href="css\/agenda\.css">/);
  assert.match(HTML, /<script defer src="js\/agenda-calendar\.js"><\/script>/);
  assert.match(HTML, /<script defer src="js\/agenda\.js"><\/script>/);
  assert.match(HTML, /<script defer src="js\/assistant\/launcher\.js"><\/script>/, "assistant : launcher seul");
  assert.match(HTML, /<body class="agenda-page">/);
});

test("SEO : title, meta description, un seul H1, landmarks, canonical absolu (bloc généré)", () => {
  assert.match(HTML, /<title>Agenda des formations \| Wisy Safety<\/title>/);
  const d = HTML.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(d && d[1].length >= 100 && d[1].length <= 170, "meta description 100–170 caractères : " + (d && d[1].length));
  assert.match(d[1], /formation/i);
  assert.equal((HTML.match(/<h1[\s>]/g) || []).length, 1, "un seul H1");
  assert.match(HTML, /<main id="main">/, "main SANS lang ni dir imposés : la page suit la langue choisie (français, arabe RTL…)");
  assert.doesNotMatch(HTML, /<main\b[^>]*\b(lang|dir)=/, "aucun forçage de langue / de sens de lecture sur le contenu");
  assert.ok((HTML.match(/<section /g) || []).length >= 7, "sections sémantiques");
  assert.match(HTML, /<nav data-i18n-attr="aria-label:ag\.crumbs_label" class="ag-crumbs" aria-label="Fil d'Ariane">/, "fil d'Ariane (libellé traduit)");
  assert.match(HTML, /<link rel="canonical" href="https:\/\/www\.wisysafety\.be\/agenda\.html">/, "canonical absolu");
  assert.doesNotMatch(HTML, /rel="alternate" hreflang=/, "pas de hreflang relatif (langues = même URL traduite en JS)");
  assert.doesNotMatch(HTML, /"@type"\s*:\s*"Event"|schema\.org\/Event/, "aucune donnée structurée d'événement fictif");
});

test("hiérarchie des titres sans saut (H1 → H2 → H3) et cibles ARIA existantes", () => {
  const levels = [...MAIN.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  assert.equal(levels[0], 1);
  levels.reduce((prev, l) => { assert.ok(l <= prev + 1, "saut de niveau : h" + prev + " → h" + l); return l; }, 1);
  assert.equal(levels.filter((l) => l === 2).length, 6, "6 sections H2");
  [...HTML.matchAll(/aria-labelledby="([^"]+)"/g)].forEach((m) => assert.match(HTML, new RegExp('id="' + m[1] + '"'), "id cible : " + m[1]));
  assert.match(HTML, /<a data-i18n="ag\.skip" class="ag-skip" href="#main">/, "lien d'évitement");
  [...HTML.matchAll(/<img\b[^>]*>/g)].forEach((m) => assert.match(m[0], /width="\d+" height="\d+"/, "dimensions explicites (aucun CLS) : " + m[0].slice(0, 60)));
});

test("tous les liens internes pointent vers une page ou une ancre existante", () => {
  [...MAIN.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).forEach((h) => {
    if (/^(tel:|mailto:)/.test(h)) return;
    if (h.startsWith("#")) return assert.match(HTML, new RegExp('id="' + h.slice(1) + '"'), "ancre : " + h);
    assert.ok(exists(h.split("#")[0].split("?")[0]), "page : " + h);
  });
  assert.match(HTML, /class="btn btn--cta" href="#agenda" data-ag-jump/, "CTA principal → zone calendrier");
  assert.match(HTML, /<section class="ag-cal" id="agenda"/);
});

/* ------------------------------------------------------------------ contenu honnête */
test("AUCUNE date, aucune disponibilité, aucun calendrier factice dans la page", () => {
  const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
  assert.doesNotMatch(TEXT, new RegExp("\\b\\d{1,2}(er)?\\s+(" + MOIS + ")\\b", "i"), "jour + mois");
  assert.doesNotMatch(TEXT, new RegExp("\\b(" + MOIS + ")\\s+20\\d{2}\\b", "i"), "mois + année");
  assert.doesNotMatch(TEXT, /\b20\d{2}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/(20)?\d{2}\b/, "dates numériques");
  assert.doesNotMatch(TEXT, /\b2025\b/, "pas de « Calendrier 2025 » repris de l'ancienne page");
  assert.doesNotMatch(TEXT, /places? (restantes?|disponibles?)|complet\b|derni(è|e)res places/i, "aucune disponibilité inventée");
  assert.doesNotMatch(HTML, /<table|role="grid"|aria-label="[^"]*calendrier"/i, "aucun faux calendrier fonctionnel");
  assert.doesNotMatch(strip(read("js/agenda-calendar.js") + read("js/agenda.js")), /\b(reserv|booking|payment|panier)\w*/i, "aucune logique de réservation fictive");
});

test("métriques : uniquement des chiffres déjà validés par le site (accueil / contact) — pas ceux, contradictoires, de l'ancienne page", () => {
  const counts = [...HTML.matchAll(/data-count="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b);
  assert.deepEqual(counts, [10, 100, 250, 500], "10+ ans, 100 % de satisfaction, 250+ certifications délivrées, 500+ professionnels");
  const home = read("index.html"), contact = read("contact.html");
  [["500", home], ["250", home], ["10", home], ["100", home], ["10", contact], ["500", contact], ["100", contact]].forEach(([n, src]) =>
    assert.match(src, new RegExp('data-count="' + n + '"'), "chiffre présent ailleurs sur le site : " + n));
  assert.doesNotMatch(TEXT, /\b(15\s*ans|98\s*%|24\s*(formations|h\b)|24h)\b/i, "chiffres de l'ancienne page non repris (15 ans, 98 %, 24 formations, 24 h)");
  assert.match(TEXT, /Lun\. – Jeu\. Équipe joignable de 10 h à 16 h/, "support = horaires réels du pied de page");
});

test("certification : jamais un « 100 % certifiées » ; renvoi vers la fiche de chaque formation (garde-fou nacelles)", () => {
  assert.doesNotMatch(TEXT, /100\s*%\s*certifi|toutes nos formations sont (reconnues|certifi)/i);
  assert.match(TEXT, /formations concernées/);
  assert.match(TEXT, /La fiche de chaque formation précise/);
  assert.doesNotMatch(TEXT, /CACES|R486/i);
});

test("coordonnées = celles du pied de page et de la base de connaissances", () => {
  const C = Knowledge.CONTACT;
  assert.ok(HTML.includes('href="tel:+3223188659"') && C.phoneHref === "tel:+3223188659");
  assert.ok(HTML.includes("mailto:" + C.email));
  assert.ok(TEXT.includes("+32 2 318 86 59") && TEXT.includes("Avenue d'Itterbeek 378, 1070 Anderlecht"));
  assert.ok(TEXT.includes("Du lundi au jeudi, de 10h00 à 16h00"));
});

/* ------------------------------------------------------------------ AgendaCalendarSection */
test("AgendaCalendarSection : URL vide par défaut, aucune URL fictive, état « Intégration Outlook prévue »", () => {
  assert.match(HTML, /<div class="agc" data-agenda-calendar data-calendar-url=""/);
  assert.doesNotMatch(HTML.replace(/<!--[\s\S]*?-->/g, ""), /https?:\/\/[^"'\s>]*(outlook|office365|live\.com)/i, "aucune URL Outlook dans la page");
  assert.match(HTML, /<span data-i18n="ag\.st_planned" data-agc-status>Intégration Outlook prévue<\/span>/);
  assert.doesNotMatch(MAIN.match(/<p class="agc__status"[\s\S]*?<\/p>/)[0], /[Ss]ynchronis/, "jamais « synchronisé » comme état réel");
  ["data-agc-empty", "data-agc-frame", "data-agc-slot", "data-agc-open"].forEach((a) => assert.match(HTML, new RegExp(a), "gabarit : " + a));
  assert.match(HTML, /<div class="agc__frame" data-agc-frame hidden/, "cadre de l'agenda masqué tant qu'aucune URL n'est configurée");
});

test("safeCalendarUrl : https + hôte Outlook exact, sans identifiants ni port exotique", () => {
  const ok = [
    "https://outlook.office365.com/owa/calendar/wisy@wisysafety.be/abc123/calendar.html",
    "https://outlook.live.com/owa/calendar/00000000-0000/calendar.html",
    "https://outlook.office.com/bookwithme/user/abc",
    "  https://OUTLOOK.office365.com/owa/calendar/x/calendar.html  "
  ];
  ok.forEach((u) => assert.ok(Cal.safeCalendarUrl(u), "accepté : " + u));
  assert.equal(Cal.safeCalendarUrl("https://OUTLOOK.office365.com/x"), "https://outlook.office365.com/x", "normalisée");
  [
    "", "   ", null, undefined, 42, {},
    "http://outlook.office365.com/x", "ftp://outlook.office365.com/x", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
    "//outlook.office365.com/x", "outlook.office365.com/x", "/owa/calendar/x",
    "https://evil.example/outlook.office365.com", "https://outlook.office365.com.evil.example/x", "https://evil-outlook.office365.com/x", "https://office365.com/x",
    "https://user:pass@outlook.office365.com/x", "https://outlook.office365.com:8443/x",
    "https://outlook.office365.com/a b", "https://outlook.office365.com/\nx", "https://outlook.office365.com/" + "a".repeat(2100)
  ].forEach((u) => assert.equal(Cal.safeCalendarUrl(u), null, "refusée : " + String(u).slice(0, 60)));
  assert.equal(Cal.safeCalendarUrl("https://agenda.example.org/cal", []), null, "hôte non listé par défaut");
  assert.ok(Cal.safeCalendarUrl("https://agenda.example.org/cal", ["agenda.example.org"]), "hôte ajouté explicitement");
  assert.equal(Cal.safeCalendarUrl("https://sub.agenda.example.org/cal", ["agenda.example.org"]), null, "hôtes exacts, pas de sous-domaines implicites");
  assert.deepEqual(Cal.parseHosts("A.example.org, b.example.org  http://mauvais/ x_y"), ["a.example.org", "b.example.org"]);
});

test("resolveConfig : data-calendar-url d'abord, sinon WISY_CONFIG.AGENDA_CALENDAR_URL ; titre accessible par défaut", () => {
  const el = (attrs) => ({ getAttribute: (n) => (n in attrs ? attrs[n] : null) });
  const URL1 = "https://outlook.office365.com/owa/calendar/a@b.be/1/calendar.html", URL2 = "https://outlook.live.com/owa/calendar/2/calendar.html";
  assert.equal(Cal.resolveConfig(el({ "data-calendar-url": URL1 }), { WISY_CONFIG: { AGENDA_CALENDAR_URL: URL2 } }).url, URL1);
  assert.equal(Cal.resolveConfig(el({ "data-calendar-url": "" }), { WISY_CONFIG: { AGENDA_CALENDAR_URL: URL2 } }).url, URL2);
  assert.equal(Cal.resolveConfig(el({}), {}).url, null, "rien de configuré → état vide");
  assert.equal(Cal.resolveConfig(el({ "data-calendar-url": "http://outlook.live.com/x" }), {}).url, null, "URL refusée → état vide, sans erreur visible");
  assert.equal(Cal.resolveConfig(el({}), {}).title, "Agenda des formations Wisy Safety");
  assert.equal(Cal.resolveConfig(el({ "data-calendar-title": "Mon agenda" }), {}).title, "Mon agenda");
  assert.ok(Cal.resolveConfig(el({ "data-calendar-url": "https://x.example.org/c", "data-allowed-hosts": "x.example.org" }), {}).url);
});

test("états du composant : libellés honnêtes ; « Synchronisé avec Outlook » seulement pour un agenda Outlook réellement chargé", () => {
  assert.equal(Cal.statusText("planned"), "Intégration Outlook prévue");
  assert.equal(Cal.statusText("loading"), "Chargement de l’agenda…");
  assert.equal(Cal.statusText("slow"), "L’agenda met du temps à répondre");
  assert.equal(Cal.statusText("ready", "https://outlook.office365.com/owa/calendar/x/calendar.html"), "Synchronisé avec Outlook");
  assert.equal(Cal.statusText("ready", "https://agenda.example.org/c"), "Agenda en ligne");
  assert.equal(Cal.statusText("n'importe quoi"), "Intégration Outlook prévue");
});

test("iframe : isolé (sandbox sans navigation du parent), titre, chargement paresseux, délai de repli", () => {
  assert.doesNotMatch(Cal.SANDBOX, /allow-top-navigation/, "l'agenda ne peut pas rediriger la page");
  assert.match(Cal.SANDBOX, /allow-scripts/); assert.match(Cal.SANDBOX, /allow-popups/);
  assert.equal(Cal.LOAD_TIMEOUT, 12000);
  const src = read("js/agenda-calendar.js");
  assert.match(src, /f\.title = tr\("ag\.cal_title", cfg\.title\)/); assert.match(src, /f\.loading = "lazy"/); assert.match(src, /referrerPolicy = "strict-origin-when-cross-origin"/);
  assert.match(src, /IntersectionObserver/, "chargement quand la section approche de l'écran");
  assert.match(src, /setAttribute\("aria-busy", "true"\)/, "état de chargement annoncé");
  assert.match(HTML, /data-agc-open href="#agenda" target="_blank" rel="noopener noreferrer" hidden/, "lien de secours (href remplacé par le composant ; #agenda le rend explorable tant qu'il est masqué) sans fuite d'opener");
  assert.doesNotMatch(strip(src), /console\.|innerHTML|document\.write|eval\(/, "aucun log, aucune injection HTML");
});

/* ------------------------------------------------------------------ charte, mouvement, accessibilité */
test("palette : aucune couleur hors charte ; le turquoise reste réservé aux .btn--cta du design system", () => {
  const HEX = new Set(["#1f6f64", "#2f7d8c", "#48d6c2", "#3fa69b", "#f4faf9", "#5e6d6a", "#1b2d28", "#ffffff", "#fff"]);
  (strip(CSS).match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach((h) => assert.ok(HEX.has(h.toLowerCase()), "couleur hors palette : " + h));
  assert.doesNotMatch(strip(CSS), /turquoise|#48d6c2|72,\s*214,\s*194/i, "aucun turquoise dans les styles de la page (ni fond, ni décor)");
  const ctas = (MAIN.match(/class="btn btn--cta"/g) || []).length;
  assert.equal(ctas, 2, "deux CTA turquoise : hero + section finale");
  const finalBlock = MAIN.slice(MAIN.indexOf('class="ag-final"'));
  assert.equal((finalBlock.match(/btn--cta/g) || []).length, 1, "un seul CTA turquoise dans la section finale");
  assert.match(strip(CSS), /\.ag-final__panel\s*\{[^}]*background:\s*var\(--noir-jais\)/s, "CTA final sur fond #1B2D28");
  assert.doesNotMatch(strip(CSS), /backdrop-filter|filter:\s*blur/, "aucun glassmorphism ni flou coûteux");
});

test("mouvement : uniquement transform + opacity (transitions, animations, keyframes) ; entrée du hero ≈ 600 ms", () => {
  const css = strip(CSS);
  const props = (decl) => decl.split(",").map((p) => p.trim().split(/\s+/)[0]);
  [...css.matchAll(/transition\s*:\s*([^;}]+)/g)].forEach((m) => {
    if (m[1].trim() === "none") return;
    props(m[1]).forEach((p) => assert.ok(["transform", "opacity"].includes(p), "transition interdite : " + p));
  });
  [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\}\s*)\}/g)].forEach((m) => {
    const body = m[2].replace(/[\d.%]+|from|to/g, "");
    (body.match(/([a-z-]+)\s*:/g) || []).map((x) => x.replace(/[\s:]/g, "")).forEach((p) =>
      assert.ok(["transform", "opacity"].includes(p), "@keyframes " + m[1] + " anime « " + p + " »"));
  });
  assert.match(css, /\.ag-in\s*\{[^}]*translateY\(16px\)[^}]*animation:\s*ag-in \.46s var\(--ease-premium\)/s, "titre : opacité + 16 px");
  assert.match(css, /animation-delay:\s*calc\(var\(--i, 0\) \* 50ms\)/, "décalage 50 ms par élément → ~610 ms au total");
  assert.match(css, /@keyframes ag-float \{ from \{ transform: translateY\(-3px\); \} to \{ transform: translateY\(3px\); \} \}/, "flottement ±3 px");
  assert.match(css, /animation:\s*ag-float 9s ease-in-out infinite alternate/, "sur une longue durée");
  assert.match(css, /\.ag-from-l:not\(\.in\)\s*\{\s*transform:\s*translateX\(-20px\)/);
  assert.match(css, /\.ag-from-r:not\(\.in\)\s*\{\s*transform:\s*translateX\(20px\)/);
  assert.match(css, /@media \(max-width: 899px\)[\s\S]*\.ag-from-l:not\(\.in\), \.ag-from-r:not\(\.in\) \{ transform: translateY\(12px\); \}/, "mobile : mouvement vertical seulement");
  assert.doesNotMatch(css, /cubic-bezier\([^)]*-\d|bounce|rotate\(\s*[1-9]\d\d/i, "aucun rebond");
  assert.match(HTML, /\.reveal\{opacity:0;transform:translateY\(20px\);transition:opacity var\(--t-reveal\)/, "système .reveal du site réutilisé (560 ms)");
  assert.match(HTML, /--motion-slow:560ms/);
});

test("survol : pointeur précis seulement, ≤ ×1.03, cibles tactiles ≥ 44 px", () => {
  const css = strip(CSS);
  const hover = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine)"));
  assert.match(hover, /\.ag-contact__row:hover \{ transform: translateY\(-2px\) scale\(1\.02\); \}/);
  assert.doesNotMatch(css.replace(hover.slice(0, hover.indexOf("\n}\n") + 3), ""), /:hover\s*\{[^}]*(scale|translate)/, "aucun survol animé hors du bloc « pointeur précis »");
  (css.match(/scale\(([\d.]+)\)/g) || []).forEach((s) => assert.ok(parseFloat(s.slice(6)) <= 1.03, "échelle > 1.03 : " + s));
  assert.match(css, /\.ag-link \{[^}]*min-height: 44px/s);
  assert.match(css, /\.ag-assist button \{[^}]*min-height: 44px/s);
  assert.match(css, /\.ag-contact__row \{[^}]*min-height: 72px/s);
  assert.match(HTML, /\.btn\{[^}]*min-height:48px/, "boutons du design system ≥ 48 px");
});

test("mouvement réduit : entrées, flottements et révélations neutralisés ; contenu jamais dépendant d'une animation", () => {
  const block = strip(CSS).slice(strip(CSS).indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block, /\.ag-in, \.ag-in--fade \{ opacity: 1; transform: none; animation: none; \}/);
  assert.match(block, /\.ag-board, \.ag-chip \{ animation: none; \}/);
  assert.match(block, /\.ag-from-l:not\(\.in\), \.ag-from-r:not\(\.in\) \{ transform: none; \}/);
  assert.match(HTML, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.reveal\{opacity:1;transform:none\}/, "le site rend .reveal visible");
  assert.match(HTML, /var reduce=matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/, "compteurs sans animation");
  assert.match(HTML, /querySelectorAll\("\[data-count\]"\)/, "compteurs animés par le script commun (une seule fois)");
  assert.match(MAIN, /<span data-i18n="ag\.sr_500" class="ag-sr">Plus de 500<\/span>/, "valeur finale lisible sans animation (texte pour lecteur d'écran)");
});

test("accessibilité CSS : focus visible épinette (crème sur fond sombre), lien d'évitement sans left:-9999px, éléments décoratifs masqués", () => {
  const css = strip(CSS);
  assert.match(css, /\.agenda-page :focus-visible \{ outline: 3px solid var\(--epinette\)/);
  assert.match(css, /\.ag-final :focus-visible \{ outline-color: var\(--creme\)/);
  assert.match(css, /\.ag-skip:focus/);
  assert.doesNotMatch(css, /-9999px/);
  assert.match(HTML, /<div class="ag-visual ag-in" style="--i:2" aria-hidden="true">/, "composition décorative masquée aux lecteurs d'écran");
  assert.match(HTML, /<div class="agc__art" aria-hidden="true">/);
  assert.ok(!/tabindex="[1-9]/.test(HTML), "jamais de tabindex positif");
  assert.match(HTML, /<p class="agc__status" role="status">/, "changements d'état annoncés poliment");
});

/* ------------------------------------------------------------------ navigation partagée */
test("navigation : « Agenda » pointe vers agenda.html sur les 8 pages ; page courante identifiable sur /agenda seulement", () => {
  const pages = ["index", "formations", "contact", "avis", "inscription", "faq", "formation-nacelles-elevatrices", "agenda"];
  pages.forEach((n) => {
    const h = read(n + ".html");
    assert.equal((h.match(/href="agenda\.html"[^>]*data-i18n="nav\.agenda"|href="agenda\.html" aria-current="page" data-i18n="nav\.agenda"/g) || []).length, 3, n + " : nav + menu mobile + pied de page");
    assert.doesNotMatch(h, /href="#" data-i18n="nav\.agenda"/, n + " : plus de lien mort");
    assert.equal((h.match(/aria-current="page" data-i18n="nav\.agenda"/g) || []).length, n === "agenda" ? 3 : 0, n + " : aria-current seulement sur /agenda");
  });
  const hdr = read("css/site-header.css");
  assert.match(hdr, /\.site-header \.nav-link\[aria-current="page"\]/, "état actif discret et accessible");
  assert.match(hdr, /\.site-header \.nav-link\[aria-current="page"\]::after \{ transform: scaleX\(1\)/, "soulignement plein : la couleur n'est jamais le seul signal");
});

test("en-tête sticky et chrome partagés : la page réutilise les blocs communs (aucun Header / Footer / Button recréé)", () => {
  ["contact", "avis"].forEach((n) => {
    const other = read(n + ".html");
    const hdr = (h) => h.slice(h.indexOf('<header class="site-header"'), h.indexOf("</header>") + 9).replace(/aria-current="page" /g, "");
    assert.equal(hdr(HTML).replace(/href="agenda\.html"/g, 'href="#"'), hdr(other).replace(/href="agenda\.html"/g, 'href="#"'), "en-tête identique à " + n + ".html");
  });
  assert.match(HTML, /\.site-header\{position:sticky;top:0;z-index:1000\}/, "sticky d'origine conservé");
  assert.match(HTML, /\.btn--cta\{background:var\(--turquoise\);color:var\(--noir-jais\)\}/, "bouton turquoise = texte jais");
  assert.match(strip(CSS), /\.agenda-page \.site-footer \.f-cta \{ display: none; \}/, "un seul CTA final (le bandeau du pied de page est masqué)");
});

/* ------------------------------------------------------------------ recherche, assistant, Centre d'aide */
test("recherche du site : la page Agenda est indexée en 10 langues (titre + description)", () => {
  const reg = read("js/site-content.js");
  assert.match(reg, /id: "agenda", url: "agenda\.html", title: "Agenda des formations", titleKey: "search\.page_agenda_t", descKey: "search\.page_agenda_d"/, "page déclarée dans le registre commun");
  assert.match(read("js/search.js"), /page_agenda:\s+'<rect/, "icône");
  const ctx = { window: {} }; vm.runInNewContext(read("js/i18n-data-search.js"), ctx);
  const D = ctx.window.I18N;
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    assert.ok(D[l]["search.page_agenda_t"] && D[l]["search.page_agenda_d"], "traduction " + l);
  });
  assert.equal(D.fr["search.page_agenda_t"], "Agenda des formations");
});

test("assistant : page connue, route autorisée, miroir serveur à jour", () => {
  const p = Knowledge.byId("page-agenda");
  assert.equal(p.url, "agenda.html"); assert.equal(p.type, "page");
  assert.doesNotMatch(p.content, /\b(20\d\d|\d{1,2}\s+(janvier|février|mars|avril|mai|juin))\b/i, "aucune date dans le contenu de la page");
  assert.ok(Validation.isSafeUrl("agenda.html") && Validation.isSafeUrl("agenda.html#agenda"));
  const kts = read("supabase/functions/chat/site.generated.ts");
  assert.match(kts, /"id": "page-agenda"[^}]*"url": "agenda\.html"/s, "page Agenda dans la copie serveur (générée)");
  assert.match(kts, /"agenda\.html"/, "allow-list serveur");
  assert.match(read("supabase/functions/chat/index.ts"), /AUCUNE date ni disponibilité[\s\S]*agenda\.html/, "consigne du prompt serveur");
});

test("assistant : questions d'agenda → page Agenda / formations / contact, JAMAIS une date ni une disponibilité", () => {
  const Q = ["Quand est la prochaine formation ?", "Où voir l’agenda ?", "Quelles sont les prochaines dates ?", "Je cherche une date de formation",
    "Où trouver les horaires ?", "Avez-vous des formations le week-end ?", "Avez-vous des formations en soirée ?", "Agenda", "Quel est le calendrier des sessions ?"];
  Q.forEach((q) => {
    const r = Responder.respond(q);
    const urls = (r.cards || []).map((c) => c.url);
    assert.ok(urls.includes("agenda.html"), q + " → carte Agenda");
    assert.ok(urls.includes("contact.html"), q + " → carte Contact");
    assert.doesNotMatch(r.message, /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b|\b20\d{2}\b|\d{1,2}\/\d{1,2}\//i, q + " → aucune date inventée : " + r.message);
    assert.doesNotMatch(r.message, /places? (restantes?|disponibles?)|il reste|prochaine session (est|aura)/i, q + " → aucune disponibilité inventée");
    (r.cards || []).forEach((c) => assert.ok(Validation.isSafeUrl(c.url), "URL sûre : " + c.url));
  });
  const wk = Responder.respond("Avez-vous des formations le week-end ?");
  assert.equal(wk.meta.intent, "schedule_format_unconfirmed");
  assert.match(wk.message, /pas d’information confirmée/);
  assert.doesNotMatch(wk.message, /lundi au jeudi|fermé/i, "ne confond pas formats de formation et horaires d'ouverture de l'équipe");
  assert.equal(Responder.respond("Où voir l’agenda ?").meta.intent, "agenda_location");
  assert.equal(Responder.respond("Êtes-vous ouverts le samedi ?").meta.faqId, "faq-contact-horaires", "les horaires d'ouverture restent ceux du pied de page");
});

test("Centre d'aide : la réponse « dates » renvoie vers la page Agenda (action réelle) et reste véridique", () => {
  const it = FAQ.get("faq-inscription-dates");
  assert.equal(it.action, "agenda");
  assert.deepEqual(FAQ.ACTIONS.agenda, { label: "Consulter l'agenda", href: "agenda.html" });
  assert.match(it.answer, /page Agenda/); assert.match(it.answer, /pas encore publiés/);
  assert.doesNotMatch(it.answer, /\b20\d\d\b/);
  assert.ok(read("supabase/functions/chat/faq.generated.ts").includes("la page Agenda les accueillera prochainement"), "miroir Edge régénéré (npm : node scripts/sync-faq-edge.js)");
});
