"use strict";
/* Launcher de l'Assistant Wisy (AIChatLauncher) : règles de comportement pures, fichiers du moteur,
   assets de la mascotte, contrat CSS (palette, animations, mouvement réduit, cibles tactiles),
   traductions et garde-fous de sécurité. `node --test tests/*.test.js` (aucune dépendance). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const L = require("../js/assistant/launcher.js");

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
/** Règles CSS « feuilles » : [{ selector, body }] (les @media sont aplatis). */
function rules(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(strip(css)))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}
/** Contenu d'un bloc @-rule (accolades équilibrées) dont l'en-tête contient `head`. */
function block(css, head) {
  const src = strip(css);
  const i = src.indexOf(head);
  if (i < 0) return null;
  let d = 0, j = src.indexOf("{", i);
  const start = j + 1;
  for (; j < src.length; j++) {
    if (src[j] === "{") d++;
    else if (src[j] === "}" && --d === 0) return src.slice(start, j);
  }
  return null;
}

/* ------------------------------------------------------------------ logique pure */
test("bulle d'accueil : jamais sans stockage, jamais deux fois par session, jamais sur le Centre d'aide", () => {
  const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
  assert.equal(L.shouldShowIntro({ storage: null, page: "index" }), false, "pas de stockage → on n'insiste pas");
  assert.equal(L.shouldShowIntro(undefined), false);
  const s = mem();
  assert.equal(L.shouldShowIntro({ storage: s, page: "index" }), true, "1re visite de la session");
  assert.equal(L.shouldShowIntro({ storage: s, page: "faq" }), false, "le Centre d'aide présente déjà l'assistant");
  s.setItem(L.KEYS.intro, "1");
  assert.equal(L.shouldShowIntro({ storage: s, page: "index" }), false, "déjà vue");
  const e = mem(); e.setItem(L.KEYS.engaged, "1");
  assert.equal(L.shouldShowIntro({ storage: e, page: "contact" }), false, "le visiteur a déjà interagi");
  const broken = { getItem() { throw new Error("SecurityError"); } };
  assert.equal(L.shouldShowIntro({ storage: broken, page: "index" }), true, "lecture impossible = comme vide, mais safeStorage() écarte ce cas en amont");
  assert.equal(L.safeStorage({ sessionStorage: { setItem() { throw new Error("blocked"); }, removeItem() {} } }), null, "stockage bloqué → null");
});

test("clés de session : drapeaux d'interface uniquement (aucune donnée personnelle)", () => {
  assert.deepEqual(Object.keys(L.KEYS).sort(), ["cues", "engaged", "intro"]);
  assert.equal(L.KEYS.intro, "wisyAssistantIntroSeen");
  const src = read("js/assistant/launcher.js");
  assert.doesNotMatch(src, /localStorage/, "sessionStorage seulement : rien ne survit à la session");
});

test("réglages : bulle après 2–4 s, appels de présence espacés de 16–24 s, 3 maximum par session", () => {
  const c = L.CONFIG;
  assert.ok(c.introDelay >= 2000 && c.introDelay <= 4000, "bulle d'accueil 2–4 s après le chargement");
  assert.ok(c.introDuration >= 5000 && c.introDuration <= 12000, "elle disparaît d'elle-même après quelques secondes");
  assert.ok(c.cueMin >= 15000 && c.cueMax <= 25000 && c.cueMin <= c.cueMax, "une micro-animation toutes les 15–25 s maximum");
  assert.ok(c.cueCount >= 0 && c.cueCount <= 5, "jamais d'animation perpétuelle");
  assert.equal(L.nextCueDelay(0), c.cueMin);
  assert.equal(L.nextCueDelay(1), c.cueMax);
  const mid = L.nextCueDelay(0.5);
  assert.ok(mid > c.cueMin && mid < c.cueMax);
  assert.equal(L.nextCueDelay(-3), c.cueMin, "valeur aléatoire bornée");
  assert.equal(L.nextCueDelay(9), c.cueMax);
  assert.ok(c.cueLiftDuration >= 4000 && c.cueLiftDuration <= 6000, "idle de 4–6 s");
});

test("appels de présence : un seul effet à la fois, alternés ; stoppés dès l'interaction / mouvement réduit", () => {
  assert.deepEqual([0, 1, 2, 3].map(L.cueKind), ["halo", "lift", "halo", "lift"]);
  const base = { count: 0, reduced: false, open: false, engaged: false, hovered: false };
  assert.equal(L.canCue(base), true);
  assert.equal(L.canCue(Object.assign({}, base, { reduced: true })), false, "prefers-reduced-motion");
  assert.equal(L.canCue(Object.assign({}, base, { open: true })), false, "assistant ouvert / en ouverture");
  assert.equal(L.canCue(Object.assign({}, base, { engaged: true })), false, "le visiteur a cliqué / fermé / utilisé l'assistant");
  assert.equal(L.canCue(Object.assign({}, base, { hovered: true })), false, "survol / focus = interaction");
  assert.equal(L.canCue(Object.assign({}, base, { count: L.CONFIG.cueCount })), false, "plafond atteint");
  assert.equal(L.canCue(base, Object.assign({}, L.CONFIG, { cueCount: 0 })), false, "cueCount: 0 désactive tout");
  assert.equal(L.isTyping({ tagName: "TEXTAREA" }), true, "pas d'appel pendant la saisie");
  assert.equal(L.isTyping({ tagName: "INPUT" }), true);
  assert.equal(L.isTyping({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(L.isTyping({ tagName: "BODY" }), false);
  assert.equal(L.isTyping(null), false);
});

/* ------------------------------------------------------------------ moteur à la demande */
test("moteur chargé à la demande : fichiers existants, dans l'ordre de dépendance", () => {
  const f = L.ENGINE_FILES;
  f.concat([L.PANEL_CSS]).forEach((p) => assert.ok(exists(p), "fichier du moteur introuvable : " + p));
  const idx = (n) => f.findIndex((p) => p.endsWith(n));
  assert.ok(idx("faq-data.js") < idx("faq-search.js"), "données → moteur de recherche");
  assert.ok(idx("faq-search.js") < idx("knowledge.js"), "la FAQ partagée précède la base de connaissances");
  assert.ok(idx("knowledge.js") < idx("retrieval.js") && idx("retrieval.js") < idx("responder.js"), "knowledge → retrieval → responder");
  assert.ok(idx("validation.js") < idx("responder.js") || idx("validation.js") < idx("assistant.js"), "validation avant le panneau");
  assert.equal(f[f.length - 1], "js/assistant/assistant.js", "le panneau est chargé en dernier");
  assert.equal(new Set(f).size, f.length, "aucun doublon");
});

test("le launcher est léger et sans dépendance (le moteur ne pèse pas sur le chemin critique)", () => {
  const size = (p) => fs.statSync(path.join(ROOT, p)).size;
  assert.ok(size("js/assistant/launcher.js") < 30 * 1024, "launcher.js < 30 Ko non minifié");
  assert.ok(size("css/assistant.css") < 18 * 1024, "css/assistant.css (chemin critique) < 18 Ko");
  const critical = size("js/assistant/launcher.js") + size("css/assistant.css");
  const lazy = L.ENGINE_FILES.concat([L.PANEL_CSS]).reduce((n, p) => n + size(p), 0);
  assert.ok(lazy > 3 * critical, "l'essentiel du poids est différé (" + lazy + " o) vs critique (" + critical + " o)");
});

/* ------------------------------------------------------------------ mascotte */
function webpSize(b) {
  assert.equal(b.slice(0, 4).toString(), "RIFF"); assert.equal(b.slice(8, 12).toString(), "WEBP");
  const kind = b.slice(12, 16).toString();
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
function avifSize(b) {
  assert.equal(b.slice(4, 12).toString(), "ftypavif", "conteneur AVIF");
  const i = b.indexOf("ispe");
  return [b.readUInt32BE(i + 8), b.readUInt32BE(i + 12)];
}
test("mascotte : dérivés optimisés AVIF + WebP en 144 px et 216 px (2× / 3×), carrés, légers", () => {
  [[144, 7000, 5000], [216, 12000, 8000]].forEach(([px, maxWebp, maxAvif]) => {
    const w = path.join(ROOT, L.ASSET_DIR, "wisy-assistant-" + px + ".webp"), a = path.join(ROOT, L.ASSET_DIR, "wisy-assistant-" + px + ".avif");
    assert.ok(fs.existsSync(w) && fs.existsSync(a), "wisy-assistant-" + px + " (webp + avif)");
    assert.ok(fs.statSync(w).size < maxWebp, px + " px WebP < " + maxWebp + " o (" + fs.statSync(w).size + ")");
    assert.ok(fs.statSync(a).size < maxAvif, px + " px AVIF < " + maxAvif + " o (" + fs.statSync(a).size + ")");
    assert.deepEqual(webpSize(fs.readFileSync(w)), [px, px], "WebP carré " + px);
    assert.deepEqual(avifSize(fs.readFileSync(a)), [px, px], "AVIF carré " + px);
  });
});

test("la mascotte est chargée via <picture> AVIF → WebP avec dimensions explicites (aucun CLS) et repli propre", () => {
  const src = read("js/assistant/launcher.js");
  assert.match(src, /type: "image\/avif"[\s\S]*type: "image\/webp"/, "AVIF puis WebP");
  assert.match(src, /width: px, height: px, alt: ""/, "width/height posés, image décorative");
  assert.match(src, /addEventListener\("error"[\s\S]{0,80}is-fallback/, "repli si l'image ne charge pas");
  const faq = read("faq.html");
  assert.match(faq, /<img src="assets\/images\/assistant\/wisy-assistant-144\.webp"[^>]*width="56" height="56"[^>]*alt=""/, "carte du Centre d'aide : image statique dimensionnée");
  assert.doesNotMatch(faq, /faqc-mascot/, "plus d'injection JS de la mascotte SVG");
  assert.equal(exists("js/assistant/mascot.js"), false, "l'ancienne mascotte SVG est supprimée");
});

/* ------------------------------------------------------------------ contrat CSS */
const CSS_LAUNCHER = read("css/assistant.css"), CSS_PANEL = read("css/assistant-panel.css");

test("palette : aucune couleur hors charte dans les feuilles de l'assistant", () => {
  const HEX = new Set(["#1f6f64", "#2f7d8c", "#48d6c2", "#3fa69b", "#f4faf9", "#5e6d6a", "#1b2d28", "#ffffff", "#fff",
    "#23786c" /* milieu du dégradé d'en-tête */, "#37c9b4" /* survol du turquoise */]);
  [CSS_LAUNCHER, CSS_PANEL].forEach((css) => (strip(css).match(/#[0-9a-fA-F]{3,8}\b/g) || [])
    .forEach((h) => assert.ok(HEX.has(h.toLowerCase()), "couleur hors palette : " + h)));
});

test("turquoise = accent unique : jamais un fond de grande surface", () => {
  const ALLOWED = [".wa-fab__status", ".wa-header__dot", ".wa-contact-link--primary", ".wa-send"];
  [CSS_LAUNCHER, CSS_PANEL].forEach((css) => rules(css).forEach((r) => {
    if (/background(-color)?\s*:[^;]*(--wa-turquoise|#48d6c2)/i.test(r.body)) {
      assert.ok(ALLOWED.includes(r.selector), "fond turquoise interdit sur : " + r.selector);
    }
  }));
  assert.match(strip(CSS_LAUNCHER), /\.wa-fab__status\s*\{[^}]*background:\s*var\(--wa-turquoise\)/, "l'indicateur de disponibilité est turquoise");
  assert.match(strip(CSS_LAUNCHER), /\.wa-fab__badge\s*\{[^}]*background:\s*var\(--wa-epinette\)/, "pastille IA en épinette (pas un 2e accent)");
});

test("launcher : tailles, anneaux et cibles tactiles (72 px desktop, 58 px mobile ≥ 44 px)", () => {
  const css = strip(CSS_LAUNCHER);
  assert.match(css, /--wa-size:\s*72px/, "72 px desktop");
  assert.match(block(css, "@media (max-width: 640px)"), /--wa-size:\s*58px/, "58 px mobile");
  assert.match(block(css, "@media (max-width: 640px)"), /--wa-offset:\s*16px/, "16 px du bord sur mobile");
  assert.match(css, /--wa-offset:\s*clamp\(24px,\s*1\.8vw,\s*32px\)/, "24–32 px sur desktop");
  assert.match(css, /env\(safe-area-inset-bottom/, "safe-area basse");
  assert.match(css, /env\(safe-area-inset-right/, "safe-area droite");
  assert.match(css, /\.wa-invite__close::before\s*\{[^}]*inset:\s*-9px/, "zone tactile 44 px du bouton de fermeture de la bulle");
  assert.match(strip(CSS_PANEL), /\.wa-iconbtn\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/s, "fermer le panneau : 44 × 44 px");
  assert.match(strip(CSS_PANEL), /\.wa-input\s*\{ font-size: 16px; \}/, "champ 16 px sur mobile (pas de zoom iOS)");
});

test("animations : apparition 500–600 ms, appel ≤ 3 px, survol ≤ 1.03 et réservé aux pointeurs précis, jamais de rebond", () => {
  const css = strip(CSS_LAUNCHER);
  assert.match(css, /\.wa-launcher\s*\{[^}]*transform:\s*translateY\(10px\)\s*scale\(0\.97\)/, "apparition : +10 px, ×0.97");
  assert.match(css, /opacity 0\.55s var\(--wa-ease-premium\)/, "apparition ~550 ms");
  assert.match(css, /--wa-ease-premium:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/, "courbe fluide, sans dépassement");
  const lift = block(css, "@keyframes wa-cue-lift");
  const px = (lift.match(/translateY\((-?\d+(?:\.\d+)?)px\)/g) || []).map((v) => Math.abs(parseFloat(v.slice(11))));
  assert.ok(px.length && Math.max.apply(null, px) <= 3, "l'appel « mascotte » bouge de 3 px maximum");
  assert.match(css, /\.is-cue-lift[^{]*\{[^}]*animation:\s*wa-cue-lift 5s ease-in-out 1\b/, "une seule fois, 5 s");
  assert.match(css, /\.is-cue-halo[^{]*\{[^}]*animation:\s*wa-cue-halo [\d.]+s[^;]* 1\b/, "halo : une seule fois");
  /* survol uniquement pour pointeur précis */
  const hoverBlock = block(css, "@media (hover: hover) and (pointer: fine)");
  assert.match(hoverBlock, /\.wa-fab:hover\s*\{[^}]*translateY\(-2px\) scale\(1\.02\)/, "survol : -2 px, ×1.02");
  assert.doesNotMatch(css.replace(hoverBlock, ""), /\.wa-fab:hover\s*\{/, "aucun :hover hors du bloc « pointeur précis »");
  /* états de survol / appui / focus : jamais plus de ×1.03 (le halo décoratif, lui, est un anneau qui s'élargit) */
  [CSS_LAUNCHER, CSS_PANEL].forEach((c) => rules(c).filter((r) => /:(hover|active|focus-visible)/.test(r.selector)).forEach((r) => {
    (r.body.match(/scale\(([\d.]+)\)/g) || []).forEach((s) => assert.ok(parseFloat(s.slice(6)) <= 1.03, "échelle > 1.03 interdite sur " + r.selector + " : " + s));
  }));
  assert.match(css, /\.wa-fab:active\s*\{[^}]*scale\(0\.98\)/, "retour tactile au clic : ×0.98");
  /* ni rebond, ni clignotement, ni rotation permanente */
  [CSS_LAUNCHER, CSS_PANEL].forEach((c) => {
    assert.doesNotMatch(strip(c), /cubic-bezier\([^)]*-\d/, "aucune courbe à dépassement (rebond)");
    assert.doesNotMatch(strip(c), /@keyframes[^{]*(blink|bounce|pulse|shake)/i);
  });
  /* seules animations infinies : chargement (transitoire), points « écrit », respiration pendant l'écriture, spinner d'envoi */
  const infinite = rules(CSS_LAUNCHER).filter((r) => /infinite/.test(r.body)).map((r) => r.selector);
  assert.deepEqual(infinite, [".is-loading .wa-fab__halo"], "le launcher n'a aucune animation perpétuelle hors chargement");
});

test("mouvement réduit : plus d'idle, de halo ni de micro-mouvement ; transitions minimales", () => {
  const lb = block(CSS_LAUNCHER, "@media (prefers-reduced-motion: reduce)");
  assert.ok(lb, "bloc reduced-motion du launcher");
  assert.match(lb, /\.wa-avatar img,[\s\S]*\.wa-fab__halo\s*\{\s*animation:\s*none !important/, "idle + halo coupés");
  assert.match(lb, /\.wa-fab:hover,[\s\S]*\.wa-fab:active\s*\{\s*transform:\s*none/, "plus de survol animé");
  assert.match(lb, /\.wa-launcher\s*\{\s*transform:\s*none/, "apparition = fondu seulement");
  const pb = block(CSS_PANEL, "@media (prefers-reduced-motion: reduce)");
  assert.ok(pb, "bloc reduced-motion du panneau");
  assert.match(pb, /animation-duration:\s*0\.001ms !important/, "animations neutralisées");
  assert.match(pb, /\.wa-typing__dots span\s*\{\s*animation:\s*none/, "points « écrit » figés");
  assert.match(read("js/assistant/launcher.js"), /prefers-reduced-motion: reduce/, "le JS ne programme pas d'appels si le mouvement réduit est demandé");
});

test("accessibilité CSS : focus visible partout, contraste forcé, texte lecteur d'écran sans left:-9999px", () => {
  const css = strip(CSS_LAUNCHER + CSS_PANEL);
  [".wa-fab:focus-visible", ".wa-invite__close:focus-visible", ".wa-invite__cta:focus-visible", ".wa-chip:focus-visible",
   ".wa-iconbtn:focus-visible", ".wa-send:focus-visible", ".wa-newchat:focus-visible", ".wa-newmsg:focus-visible", ".wa-body:focus-visible"]
    .forEach((s) => assert.ok(css.includes(s), "état focus-visible manquant : " + s));
  assert.match(strip(CSS_LAUNCHER), /\.wa-fab:focus-visible\s*\{[^}]*outline:\s*3px solid transparent/, "visible en mode contraste forcé");
  assert.match(strip(CSS_LAUNCHER), /\.wa-fab:focus-visible\s*\{[^}]*var\(--wa-jais\)[^}]*var\(--wa-turquoise\)/s, "focus : jais (fond clair) + turquoise (fond sombre)");
  assert.doesNotMatch(css, /-9999px/, "pas de left:-9999px (10 000 px de scroll en RTL)");
  assert.match(strip(CSS_LAUNCHER), /\.wa-sr\s*\{[^}]*clip-path:\s*inset\(50%\)/, "classe .wa-sr");
});

test("formes à spécificité #id : le `:focus-visible { border-radius: 4px }` des pages ne déforme jamais les composants", () => {
  const shaped = (css) => rules(css).filter((r) => /^#wisy-assistant\s/.test(r.selector) && /border-radius/.test(r.body)).map((r) => r.selector).join(" | ");
  const a = shaped(CSS_LAUNCHER), b = shaped(CSS_PANEL);
  [".wa-fab", ".wa-invite__close"].forEach((n) => assert.ok(a.includes(n), "forme #id manquante (launcher) : " + n));
  [".wa-iconbtn", ".wa-chip", ".wa-newmsg", ".wa-send", ".wa-newchat", "a.wa-card", ".wa-contact-link"].forEach((n) => assert.ok(b.includes(n), "forme #id manquante (panneau) : " + n));
  /* pas de doublon : ces composants ne redéfinissent pas leur rayon dans une règle de base plus faible */
  const weak = rules(CSS_LAUNCHER + CSS_PANEL).filter((r) => /^\.(wa-fab|wa-invite__close|wa-iconbtn|wa-chip|wa-newmsg|wa-send|wa-newchat|wa-contact-link)$/.test(r.selector) && /border-radius/.test(r.body));
  assert.deepEqual(weak.map((r) => r.selector), [], "rayon défini uniquement dans les règles #id");
});

test("z-index : une seule variable (--wa-z: 1150), sous le menu mobile (1200) et au-dessus de l'en-tête (1000)", () => {
  const z = strip(CSS_LAUNCHER).match(/--wa-z:\s*(\d+)/);
  assert.ok(z && +z[1] > 1100 && +z[1] < 1200, "1150 attendu");
  [CSS_LAUNCHER, CSS_PANEL].forEach((c) => assert.doesNotMatch(strip(c), /z-index:\s*\d{4,}/, "z-index en dur interdit : utiliser var(--wa-z)"));
  assert.match(read("css/registration.css"), /body\.reg-bar-active #wisy-assistant \{ --wa-lift: 80px; \}/, "le launcher passe au-dessus de la barre d'inscription mobile");
});

/* ------------------------------------------------------------------ traductions */
function dictionaries() {
  const ctx = { window: {} };
  vm.runInNewContext(read("js/i18n-data-assistant.js"), ctx);
  return ctx.window.I18N;
}
test("traductions : mêmes clés en fr / en / nl ; toutes les clés utilisées par le code existent", () => {
  const D = dictionaries();
  const keys = (l) => Object.keys(D[l]).filter((k) => k.startsWith("assistant.")).sort();
  assert.deepEqual(keys("en"), keys("fr"), "en = fr");
  assert.deepEqual(keys("nl"), keys("fr"), "nl = fr");
  const used = new Set();
  ["js/assistant/launcher.js", "js/assistant/assistant.js"].forEach((f) => {
    const src = read(f);
    (src.match(/\bt\(\s*"(assistant\.[a-z_]+)"/g) || []).forEach((m) => used.add(m.match(/"(.+)"/)[1]));
    (src.match(/label\([^)]*?"(assistant\.[a-z_]+)"/g) || []).forEach((m) => used.add(m.match(/"(assistant\.[a-z_]+)"/)[1]));
  });
  assert.ok(used.size > 20, "clés détectées : " + used.size);
  used.forEach((k) => assert.ok(D.fr[k], "clé absente du dictionnaire fr : " + k));
  ["assistant.launcher_title", "assistant.launcher_text", "assistant.launcher_open", "assistant.header_title", "assistant.header_subtitle"]
    .forEach((k) => assert.ok(D.fr[k] && D.en[k] && D.nl[k], "texte du launcher éditable : " + k));
  assert.equal(D.fr["assistant.launcher_title"], "Besoin d’aide ?");
  assert.equal(D.fr["assistant.launcher_text"], "Demandez à l’Assistant Wisy");
  assert.equal(D.fr["assistant.launcher_open"], "Ouvrir l’Assistant Wisy");
  assert.equal(D.fr["assistant.close"], "Fermer l’Assistant Wisy");
  assert.equal(D.fr["assistant.header_title"], "Assistant Wisy");
  assert.equal(D.fr["assistant.placeholder"], "Posez votre question…");
  assert.equal(D.fr["assistant.error"], "Une erreur est survenue. Réessayez dans quelques instants.");
  assert.ok(!/chatbot|robot|bot\b|lancer l/i.test(D.fr["assistant.launcher_title"] + D.fr["assistant.launcher_text"]), "vocabulaire professionnel : ni « chatbot » ni « robot »");
});

/* ------------------------------------------------------------------ sécurité / hygiène */
test("sécurité : aucun HTML dynamique injecté, aucun secret, aucun log de debug", () => {
  const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  ["js/assistant/launcher.js", "js/assistant/assistant.js"].forEach((f) => {
    const raw = read(f), src = stripJs(raw);
    /* innerHTML : uniquement dans el() (pour nos SVG de confiance) */
    assert.ok((src.match(/innerHTML/g) || []).length <= 1, f + " : innerHTML seulement dans el()");
    (src.match(/\bhtml:\s*[^,}\n]+/g) || []).forEach((h) => {
      assert.match(h, /^html:\s*(icon\(|"<span><\/span><span><\/span><span><\/span>")/, f + " : `html:` réservé aux icônes de confiance → " + h);
    });
    assert.doesNotMatch(src, /\bconsole\.(log|debug|info|warn)\b|\bdebugger\b/, f + " : pas de log de debug");
    assert.doesNotMatch(src, /\bTODO\b|\bFIXME\b/, f + " : pas de TODO abandonné");
    assert.doesNotMatch(src, /(sk-[A-Za-z0-9]{16,}|api[_-]?key\s*[:=]|Bearer\s+[A-Za-z0-9])/i, f + " : aucun secret dans le bundle");
    assert.doesNotMatch(src, /document\.write|\beval\(|new Function\(/, f + " : pas d'évaluation dynamique");
  });
});

test("sémantique du launcher : vrai <button>, nom, état déplié, description ; jamais d'ouverture automatique", () => {
  const src = read("js/assistant/launcher.js");
  assert.match(src, /el\("button", \{\s*type: "button", class: "wa-fab",\s*"aria-haspopup": "dialog", "aria-expanded": "false", "aria-describedby": "wa-fab-desc"/, "bouton nommé, aria-expanded, description");
  assert.match(src, /"aria-controls"|setAttribute\("aria-controls"/, "aria-controls posé quand le panneau existe");
  /* la seule voie d'ouverture est open() ; showIntro / runCue ne l'appellent jamais */
  const intro = src.slice(src.indexOf("function showIntro"), src.indexOf("function showHint"));
  assert.doesNotMatch(intro, /\bopen\(|toggle\(|ask\(/, "la bulle d'accueil n'ouvre jamais le chat");
  const cue = src.slice(src.indexOf("function runCue"), src.indexOf("function stopCues"));
  assert.doesNotMatch(cue, /\bopen\(|toggle\(|ask\(/, "les appels de présence n'ouvrent jamais le chat");
  assert.match(src, /e\.key === "Escape" && !S\.open && inviteVisible\(\)/, "Échap ferme la bulle");
  const panel = read("js/assistant/assistant.js");
  assert.match(panel, /role: "dialog"[\s\S]*"aria-labelledby": titleId, "aria-modal": "false"/, "dialogue nommé, non modal par défaut");
  assert.match(panel, /setAttribute\("aria-modal", on \? "true" : "false"\)/, "modal en mode feuille mobile");
  assert.match(panel, /html\.style\.overflow = App\.prevOverflow \|\| ""/, "défilement restauré exactement");
  assert.match(panel, /setTimeout\(Launcher\.focusFab, 0\)/, "focus rendu au launcher à la fermeture");
  assert.match(panel, /e\.key === "Escape"[\s\S]{0,60}close\(\)/, "Échap ferme");
  assert.match(panel, /if \(App\.busy\) return;\s*\/\/ pas de double envoi/, "double soumission empêchée");
  assert.match(panel, /new AbortController\(\)[\s\S]*REQUEST_TIMEOUT/, "requête annulable avec délai maximal");
});
