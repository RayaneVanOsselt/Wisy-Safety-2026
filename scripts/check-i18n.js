#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Contrôle de l'internationalisation (aucune dépendance)

       node scripts/check-i18n.js            → rapport lisible, code de sortie 1 s'il y a des ERREURS
       node scripts/check-i18n.js --all      → montre aussi tous les AVERTISSEMENTS (sinon : les 8 premiers)

   (Le site n'a pas de package.json : cette commande joue le rôle d'un « npm run check ».
    Elle est aussi exécutée par `node --test tests/*.test.js` via tests/i18n-coverage.test.js.)

   Ce qui est vérifié, avec les langues du moteur js/i18n.js (fr, en, nl, af, ar, bg, de, ro, it, sl) :

     1. DICTIONNAIRES (js/i18n-data-*.js) — chaque fichier définit les 10 langues, avec exactement les
        mêmes clés que le français ; aucune valeur vide ; mêmes variables ({n}, {{x}}, %s…), mêmes balises
        HTML et mêmes séparateurs « | » que la source française.
     2. PAGES — chaque clé data-i18n / data-i18n-html / data-i18n-attr d'une page existe dans les 10 langues
        (union des dictionnaires que la page charge) ; la page définit « meta.title » pour son onglet.
     3. CODE JS — chaque clé citée dans un script existe dans les 10 langues.
     4. TEXTE EN DUR — aucun texte ni attribut visible (alt, title, aria-label, placeholder…) laissé
        en français dans le HTML sans data-i18n (hors noms propres, coordonnées et noms de langues).
     5. ENCODAGE — tous les fichiers texte sont de l'UTF-8 valide, sans BOM, sans caractère de
        remplacement (U+FFFD), sans texte « mojibake » (de l'UTF-8 relu comme du Latin-1 : un « é »
        qui s'affiche en deux caractères parasites, idem pour l'arabe ou le cyrillique).

   AVERTISSEMENTS (ne font pas échouer) : traduction identique au français (peut être légitime : nom
   propre, sigle) ; à relire à la main.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];

/* Pages publiques (le HTML doit être intégralement traduisible). */
const PAGES = ["index", "formations", "contact", "avis", "inscription", "faq", "agenda",
  "formation-nacelles-elevatrices", "formation-beps-premiers-secours", "peb-wallonie-bruxelles", "404"].map((n) => n + ".html");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* ------------------------------------------------------------------ dictionnaires */
function loadDict(files) {
  const ctx = { window: {} };
  ctx.window.I18N = {};
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(read(f), ctx, { filename: f }));
  return ctx.window.I18N;
}
const DICT_FILES = fs.readdirSync(path.join(ROOT, "js")).filter((f) => /^i18n-data-.*\.js$/.test(f)).sort().map((f) => "js/" + f);

const VARS = /\{\{\s*[\w.]+\s*\}\}|\{[\w.]+\}|%[sd]|%\w+%|\{\d+\}/g;
const tagsOf = (s) => (String(s).match(/<\/?[a-zA-Z][^>]*>/g) || []).map((t) => t.replace(/\s+/g, " ").replace(/\s*\/>$/, ">").toLowerCase()).join("");
const tagNames = (s) => (String(s).match(/<\/?[a-zA-Z][\w-]*/g) || []).map((t) => t.toLowerCase()).join(",");
const classesOf = (s) => (String(s).match(/class="[^"]*"/g) || []).join("|");
const words = (s) => (String(s).match(/\p{L}{2,}/gu) || []);

/* Traductions légitimement identiques au français (noms propres, sigles, formes internationales). */
const SAME_OK = /^(?:[\p{Lu}\d\s·+&\-–—/().,:;'’"«»…|%€×]|Wisy Safety|VCA|BEPS|PEB|CACES|REACH|PEMP|MEWP|Contact|Agenda|Coordination|Certificat|Certificate|Information|Format|Description|Type|Note|Source|Page|Message|Total|Sécurité|Secours|Management|Nacelle|Nacelles|Fibre|Contact|Mail|E-mail|Email|Photo|Standard|Base|Profil|Programme|Module|Modules|Session|Sessions|Site|Public|Test|Officiel|Article|Vidéo|Musique|Général)+$/u;

/* Formes de pluriel FACULTATIVES (slovène, roumain, arabe…) : « reg.participants_few » n'a pas besoin
   d'exister en français ni dans les autres langues — seule sa clé de base « reg.participants » compte. */
const PLURAL_VARIANT = /_(zero|two|few|many)$/;
const isOptionalPlural = (k, fr) => PLURAL_VARIANT.test(k) && (k.replace(PLURAL_VARIANT, "") in fr);

function dictionaryChecks(out) {
  const perFile = {};
  DICT_FILES.forEach((f) => {
    const I = loadDict([f]);
    const fr = I.fr || {};
    const frKeys = Object.keys(fr);
    perFile[f] = { frKeys: frKeys.length, langs: {} };
    LANGS.forEach((l) => {
      const d = I[l];
      if (!d) { out.errors.push(`[dictionnaire] ${f} : la langue « ${l} » est ABSENTE (${frKeys.length} textes retomberaient sur le français)`); return; }
      const keys = Object.keys(d);
      const missing = frKeys.filter((k) => !(k in d));
      const extra = keys.filter((k) => !(k in fr) && !isOptionalPlural(k, fr));
      if (missing.length) out.errors.push(`[dictionnaire] ${f} · ${l} : ${missing.length} clé(s) manquante(s), ex. ${missing.slice(0, 4).join(", ")}`);
      if (extra.length && l !== "fr") out.errors.push(`[dictionnaire] ${f} · ${l} : ${extra.length} clé(s) absente(s) du français, ex. ${extra.slice(0, 4).join(", ")}`);
      keys.forEach((k) => {
        const v = d[k];
        if (typeof v !== "string") { out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : valeur non textuelle`); return; }
        if (!v.trim()) out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : valeur vide`);
        if (l === "fr" || !(k in fr)) return;
        const src = fr[k];
        const va = (src.match(VARS) || []).sort().join("¦"), vb = (v.match(VARS) || []).sort().join("¦");
        if (va !== vb) out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : variables différentes du français (« ${va} » ≠ « ${vb} »)`);
        if (src.includes("<") || v.includes("<")) {
          if (tagNames(src) !== tagNames(v)) out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : balises HTML différentes du français (${tagNames(src)} ≠ ${tagNames(v)})`);
          else if (classesOf(src) !== classesOf(v)) out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : classes HTML différentes du français`);
        }
        if (src.split("|").length !== v.split("|").length) out.errors.push(`[dictionnaire] ${f} · ${l} · ${k} : nombre d'éléments « | » différent du français (${src.split("|").length} ≠ ${v.split("|").length})`);
        if (v === src && words(src).length >= 2 && !SAME_OK.test(src)) out.warnings.push(`[identique au français] ${f} · ${l} · ${k} : « ${src.slice(0, 60)} »`);
      });
    });
  });
  return perFile;
}

/* ------------------------------------------------------------------ analyse HTML */
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", euro: "€", times: "×", middot: "·", bull: "•", rarr: "→", larr: "←", check: "✓", copy: "©", ecirc: "ê", ocirc: "ô", icirc: "î", acirc: "â", ugrave: "ù", uuml: "ü", ouml: "ö", auml: "ä", thinsp: " ", ensp: " ", emsp: " " };
const decode = (s) => String(s).replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, n) => d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : (NAMED[n] !== undefined ? NAMED[n] : m));
function parseAttrs(s) {
  const o = {};
  const re = /([:@\w.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return o;
}
const VISIBLE_ATTRS = ["alt", "title", "placeholder", "aria-label", "aria-description", "aria-roledescription", "label"];

/* Renvoie { texts:[{text,i18n,line,ctx}], attrs:[{attr,value,i18n,tag,line}], keys:Set, scripts:[src], inlineScripts:[code] } */
function scanHtml(html) {
  const out = { texts: [], attrs: [], keys: new Set(), scripts: [], inlineScripts: [] };
  const stack = [];
  const re = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?)\s*(\/?)>|([^<]+)/g;
  let m;
  const lineAt = (idx) => html.slice(0, idx).split("\n").length;
  const covered = () => stack.some((s) => s.i18nText);
  const skipped = () => stack.some((s) => s.skip);
  const ctxOf = () => stack.slice(-3).map((s) => s.tag + (s.attrs.class ? "." + s.attrs.class.split(/\s+/)[0] : "") + (s.attrs.id ? "#" + s.attrs.id : "")).join(">");
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      if (m[1].toLowerCase() === "script") {
        const a = parseAttrs(m[2]);
        if (a.src) out.scripts.push(a.src);
        else if (!/ld\+json/.test(a.type || "") && m[3].trim()) out.inlineScripts.push(m[3]);
      }
      continue;
    }
    if (m[4]) {
      const tag = m[4].toLowerCase();
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    if (m[5]) {
      const tag = m[5].toLowerCase();
      const attrs = parseAttrs(m[6] || "");
      const self = m[7] === "/" || VOID.has(tag);
      /* Bandeau de recherche : ses libellés sont posés à l'exécution par js/search.js (clés search.*, testées à part). */
      const el = { tag, attrs, i18nText: attrs["data-i18n"] != null || attrs["data-i18n-html"] != null, skip: attrs.translate === "no" || /(^|\s)wsy-search(\s|$)/.test(attrs.class || "") };
      if (attrs["data-i18n"]) out.keys.add(attrs["data-i18n"]);
      if (attrs["data-i18n-html"]) out.keys.add(attrs["data-i18n-html"]);
      const covAttr = {};
      if (attrs["data-i18n-attr"]) attrs["data-i18n-attr"].split(",").forEach((p) => { const i = p.indexOf(":"); if (i > 0) { covAttr[p.slice(0, i).trim()] = 1; out.keys.add(p.slice(i + 1).trim()); } });
      if (!skipped() && !el.skip) {
        VISIBLE_ATTRS.forEach((a) => {
          if (attrs[a] == null) return;
          const v = decode(attrs[a]).trim();
          if (v) out.attrs.push({ attr: a, value: v, tag, i18n: !!covAttr[a] || covered(), line: lineAt(m.index) });
        });
        if (tag === "input" && /^(submit|button|reset)$/.test(attrs.type || "") && attrs.value) out.attrs.push({ attr: "value", value: decode(attrs.value).trim(), tag, i18n: !!covAttr.value, line: lineAt(m.index) });
      }
      if (!self) stack.push(el);
      continue;
    }
    if (m[8] != null) {
      const t = decode(m[8]).replace(/\s+/g, " ").trim();
      if (!t || skipped()) continue;
      const top = stack[stack.length - 1];
      out.texts.push({ text: t, i18n: covered(), line: lineAt(m.index), ctx: ctxOf(), inTitle: !!(top && top.tag === "title") });
    }
  }
  return out;
}

/* Noms propres, coordonnées, noms de langues, chiffres : ne se traduisent pas. */
const NAMES_OF_LANGS = ["Français", "English", "Nederlands", "Afrikaans", "العربية", "Български", "Deutsch", "Română", "Italiano", "Slovenščina"];
const ALLOW_EXACT = new Set([].concat(NAMES_OF_LANGS, LANGS.map((l) => l.toUpperCase()), [
  "Wisy Safety", "Wisy Safety ·", "info@wisysafety.be", "+32 2 318 86 59", "Avenue d'Itterbeek 378", "Avenue d'Itterbeek 378, 1070 Anderlecht", "Av. d'Itterbeek 378, 1070 Anderlecht",
  "Orange", "Proximus", "Telenet", "Constructel", "VOO", "Unifiber", "VCA", "BEPS", "PEB", "112", "Certibru-RES", "IA",
  "WS · 2026", "RESP", "FACT", "Stripe", "Mollie", "PayPal", "BE0123.456.789"
]));
const ALLOW_PATTERNS = [
  /^[^\p{L}]*$/u,                                           // uniquement chiffres / ponctuation / symboles
  /^\+?\d[\d\s.()/-]{5,}$/,                                 // téléphone
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/,                           // e-mail
  /^https?:\/\/\S+$/,                                       // URL
  /^[\d\s:–-]+$/,                                           // horaires « 10:00 – 16:00 »
  /^(BE\s?)?0[\dX.\s]{8,}$/,
  /^WS-\d{3,4}(-[X\d]+)?$/,                                 // références (WS-001, WS-2026-XXXXX)
  /^[A-Z]{2,3}$/,                                            // initiales d'avatar, sigles (VR, PEB, VCA)
  /^N\d(\s*·\s*(N\d|PEB|VCA))+$/,                            // « N1 · N2 · PEB · VCA » (niveaux et sigles officiels)                                // numéro d'entreprise / de TVA (BE0XXX.XXX.XXX)
  /^!DOCTYPE/i
];
const isLetters = (t) => /\p{L}{2}/u.test(t);
const allowed = (t) => ALLOW_EXACT.has(t) || ALLOW_PATTERNS.some((re) => re.test(t));

function hardcoded(html) {
  const r = scanHtml(html);
  const items = [];
  r.texts.filter((t) => !t.i18n && !t.inTitle && isLetters(t.text) && !allowed(t.text)).forEach((t) => items.push({ line: t.line, kind: "texte", value: t.text, ctx: t.ctx }));
  r.attrs.filter((a) => !a.i18n && isLetters(a.value) && !allowed(a.value)).forEach((a) => items.push({ line: a.line, kind: a.tag + "[" + a.attr + "]", value: a.value, ctx: "" }));
  return items;
}

/* ------------------------------------------------------------------ pages */
function dictFilesOf(scripts) {
  return scripts.map((s) => s.replace(/^\//, "")).filter((s) => /^js\/i18n-data-.*\.js$/.test(s));
}
function pageChecks(out) {
  const KEYNS = new Set(Object.keys(loadDict(DICT_FILES).fr || {}).map((k) => k.split(".")[0]));
  const perPage = {};
  PAGES.forEach((p) => {
    if (!fs.existsSync(path.join(ROOT, p))) { out.errors.push(`[page] ${p} introuvable`); return; }
    const html = read(p);
    const r = scanHtml(html);
    const files = dictFilesOf(r.scripts);
    const I = loadDict(files);
    const miss = {};
    [...r.keys].forEach((k) => {
      if (!(I.fr && k in I.fr)) { out.errors.push(`[page] ${p} : clé « ${k} » absente du dictionnaire français des fichiers chargés (${files.join(", ") || "aucun"})`); return; }
      LANGS.forEach((l) => { if (!(I[l] && k in I[l])) (miss[l] = miss[l] || []).push(k); });
    });
    Object.keys(miss).forEach((l) => out.errors.push(`[page] ${p} · ${l} : ${miss[l].length} texte(s) retomberaient sur le français, ex. ${miss[l].slice(0, 3).join(", ")}`));
    LANGS.forEach((l) => { if (!(I[l] && "meta.title" in I[l])) out.errors.push(`[page] ${p} · ${l} : « meta.title » manquant (l'onglet du navigateur resterait en français)`); });
    const hc = hardcoded(html);
    hc.forEach((h) => out.errors.push(`[texte en dur] ${p}:${h.line} ${h.kind} « ${h.value.slice(0, 70)} »`));
    perPage[p] = { keys: r.keys.size, hardcoded: hc.length, dictFiles: files.length };
  });

  /* Clés citées dans le code (littéraux « ns.cle ») : présentes dans les 10 langues */
  const all = loadDict(DICT_FILES);
  const jsFiles = [];
  ["js", "js/assistant"].forEach((d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".js") && !/^i18n-data-/.test(f)).forEach((f) => jsFiles.push(d + "/" + f)));
  const used = new Map();
  jsFiles.forEach((f) => {
    const src = read(f);
    for (const m of src.matchAll(/["'`]([a-z][a-z0-9]*\.[a-z0-9_]+)["'`]/g)) {
      const k = m[1];
      if (KEYNS.has(k.split(".")[0]) && !/\.(html|js|css|json|png|webp|jpe?g|svg|xml|txt|ts|md)$/.test(k)) { if (!used.has(k)) used.set(k, new Set()); used.get(k).add(f); }
    }
  });
  const dyn = /^(nac\.t_|nac\.alt_)/;                        // clés construites : nac.t_<type>_<champ>
  used.forEach((files, k) => {
    if (dyn.test(k)) return;
    if (/_$/.test(k)) {                                       // préfixe d'une clé construite (« av.rating_ » + n)
      if (!Object.keys(all.fr || {}).some((x) => x.startsWith(k))) out.errors.push(`[code] ${[...files].join(", ")} : aucune clé du dictionnaire ne commence par « ${k} »`);
      return;
    }
    if (!(all.fr && k in all.fr)) { out.errors.push(`[code] ${[...files].join(", ")} : clé « ${k} » absente du dictionnaire français`); return; }
    const lacking = LANGS.filter((l) => !(all[l] && k in all[l]));
    if (lacking.length) out.errors.push(`[code] ${[...files].join(", ")} : clé « ${k} » absente en ${lacking.join(", ")}`);
  });
  return perPage;
}

/* ------------------------------------------------------------------ encodage */
const TEXT_EXT = /\.(html|js|css|json|md|xml|txt|ts|sql|py|yml|yaml)$/i;
function walk(dir, acc) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((e) => {
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()) { if (!/^(\.git|node_modules|\.claude|assets)$/.test(e.name)) walk(rel, acc); }
    else if (TEXT_EXT.test(e.name)) acc.push(rel);
  });
  return acc;
}
const MOJIBAKE = /[ÃÂ][\u0080-¿]|â€[\u0080-¿™œ“”˜]|Ø[§©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]|Ù[\u0080-¿]|Ð[\u0080-¿]|Ñ[\u0080-¿]/;
function encodingChecks(out) {
  const files = walk("", []);
  const dec = new TextDecoder("utf-8", { fatal: true });
  files.forEach((f) => {
    const buf = fs.readFileSync(path.join(ROOT, f));
    let s;
    try { s = dec.decode(buf); } catch (e) { out.errors.push(`[encodage] ${f} : UTF-8 invalide`); return; }
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) out.errors.push(`[encodage] ${f} : BOM UTF-8 en tête de fichier`);
    if (s.includes("\uFFFD")) out.errors.push(`[encodage] ${f} : caractère de remplacement U+FFFD`);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) out.errors.push(`[encodage] ${f} : caractère de contrôle parasite`);
    s.split("\n").forEach((line, i) => { if (MOJIBAKE.test(line)) out.errors.push(`[encodage] ${f}:${i + 1} texte « mojibake » : ${line.trim().slice(0, 70)}`); });
  });
  return files.length;
}

/* ------------------------------------------------------------------ données localisées */
/* Champs « { fr, en, nl… } » des fichiers de données (catalogue d'inscription) : les 10 langues, aucune vide. */
function localized(out, label, obj) {
  LANGS.forEach((l) => {
    if (typeof obj[l] !== "string" || !obj[l].trim()) out.errors.push(`[données] ${label} : « ${l} » manquant ou vide`);
  });
  Object.keys(obj).forEach((l) => { if (!LANGS.includes(l)) out.errors.push(`[données] ${label} : langue inconnue « ${l} »`); });
}
function dataChecks(out) {
  const ctx = { window: { WisyTrainings: require("../js/trainings-data.js"), WisySite: require("../js/site-content.js") }, document: { dispatchEvent() {} }, CustomEvent: function () {} };
  vm.createContext(ctx);
  vm.runInContext(read("js/registration-data.js"), ctx, { filename: "js/registration-data.js" });
  const cat = ctx.window.WisyRegistrationData.getCatalogue();
  cat.forEach((t) => { localized(out, "js/registration-data.js · " + t.id + " · name", t.name); localized(out, "js/registration-data.js · " + t.id + " · description", t.description); });
  return cat.length;
}

/* ------------------------------------------------------------------ exécution */
function run() {
  const out = { errors: [], warnings: [], stats: {} };
  out.stats.dictionaries = dictionaryChecks(out);
  out.stats.pages = pageChecks(out);
  out.stats.catalogue = dataChecks(out);
  out.stats.filesEncoding = encodingChecks(out);
  return out;
}
module.exports = { run, scanHtml, hardcoded, allowed, isLetters, decode, parseAttrs, VOID, LANGS, PAGES, DICT_FILES, loadDict };

if (require.main === module) {
  const showAll = process.argv.includes("--all");
  const r = run();
  const group = (arr) => { const g = {}; arr.forEach((e) => { const k = (e.match(/^\[[^\]]+\]/) || ["[autre]"])[0]; (g[k] = g[k] || []).push(e); }); return g; };
  console.log("Contrôle i18n — langues : " + LANGS.join(", "));
  console.log("Dictionnaires : " + DICT_FILES.length + " fichiers · Pages : " + PAGES.length + " · Fichiers texte (encodage) : " + r.stats.filesEncoding);
  const ge = group(r.errors);
  Object.keys(ge).forEach((k) => {
    console.log("\n✗ " + k + " — " + ge[k].length + " erreur(s)");
    ge[k].slice(0, showAll ? 1e9 : 25).forEach((e) => console.log("   " + e.replace(/^\[[^\]]+\]\s*/, "")));
    if (!showAll && ge[k].length > 25) console.log("   … (" + (ge[k].length - 25) + " autres, --all pour tout voir)");
  });
  if (r.warnings.length) {
    console.log("\n⚠ " + r.warnings.length + " avertissement(s) « identique au français » (à relire, souvent légitime)");
    r.warnings.slice(0, showAll ? 1e9 : 8).forEach((w) => console.log("   " + w.replace(/^\[[^\]]+\]\s*/, "")));
  }
  console.log("\n" + (r.errors.length ? "✗ " + r.errors.length + " erreur(s)" : "✓ Aucune erreur") + " · " + r.warnings.length + " avertissement(s)");
  process.exit(r.errors.length ? 1 : 0);
}
