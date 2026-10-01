#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Dictionnaires des pages « fiche formation » et de leurs articles (aucune dépendance)

       node scripts/build-i18n-fiches.js           → (ré)écrit js/i18n-data-{fiche,vlh,diiso,fibre,fibre-art,art-fib1,art-fib2}.js
       node scripts/build-i18n-fiches.js --check   → échoue si un dictionnaire n'est plus à jour ou si une traduction manque
       node scripts/build-i18n-fiches.js --missing → écrit content/i18n/_missing/<dict>.<langue>.json (clés à traduire, texte FR)

   UNE seule source par langue :
     • le FRANÇAIS est lu DANS LE HTML des pages (data-i18n · data-i18n-html · data-i18n-attr, <title> → meta.title) :
       on ne le recopie jamais à la main, le dictionnaire français est donc toujours le miroir exact de la page
       (tests/i18n-static.test.js) ;
     • les 9 autres langues sont dans content/i18n/<dictionnaire>/<langue>.json (clé → texte), relues par un humain
       pour les textes réglementaires (docs/translations-review.md).
   Le dictionnaire produit a le format des autres fichiers js/i18n-data-*.js (window.I18N, 10 langues) ; le contrôle
   habituel s'applique ensuite : node scripts/check-i18n.js (mêmes clés, mêmes chiffres, mêmes balises).
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];
const PAGES = ["formation-vca-ligne-hierarchique.html", "formation-diisocyanates.html", "formation-fibre-optique.html",
  "article-fibre-parcours-professionnels.html", "article-fibre-devenir-expert.html"];
/* dictionnaire → préfixes de clés qu'il porte ; `meta` : page dont le <title> devient sa clé meta.title */
const DICTS = {
  "fiche":     { prefixes: ["fx."], label: "éléments communs des pages formation « fiche » (sources, modale, outil, appels à l'action)" },
  "vlh":       { prefixes: ["vlh."], meta: "formation-vca-ligne-hierarchique.html", label: "page Formation VCA Ligne hiérarchique et ses 3 dossiers" },
  "diiso":     { prefixes: ["dii."], meta: "formation-diisocyanates.html", label: "page Formation Diisocyanates et ses 3 articles" },
  "fibre":     { prefixes: ["fib."], meta: "formation-fibre-optique.html", label: "page Formation Fibre optique" },
  "fibre-art": { prefixes: ["fiba."], label: "les 2 articles fibre optique (modale de la page fibre + pages d'articles)" },
  "art-fib1":  { prefixes: [], meta: "article-fibre-parcours-professionnels.html", label: "titre d'onglet de la page article-fibre-parcours-professionnels.html" },
  "art-fib2":  { prefixes: [], meta: "article-fibre-devenir-expert.html", label: "titre d'onglet de la page article-fibre-devenir-expert.html" }
};

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => String(s).replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, x, n) => d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : (NAMED[n] !== undefined ? NAMED[n] : m));
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
function attrsOf(s) {
  const o = {}; const re = /([:@\w.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g; let m;
  while ((m = re.exec(s))) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return o;
}

/* Extrait { clé: texte français } d'une page (contenu des éléments, fragments HTML, attributs). */
function extract(file) {
  const html = read(file).replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length));
  const out = {}, where = {};
  const put = (k, v, kind) => {
    if (k in out && out[k] !== v) throw new Error(file + " : la clé « " + k + " » a deux textes français différents :\n  « " + out[k] + " »\n  « " + v + " »");
    out[k] = v; where[k] = kind;
  };
  const title = html.match(/<title>([\s\S]*?)<\/title>/);
  if (title) put("meta.title", decode(squash(title[1])), "title");
  const stack = [];
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?)\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) continue;
    if (m[2]) {
      const tag = m[2].toLowerCase();
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag !== tag) continue;
        const el = stack[i]; stack.length = i;
        const inner = html.slice(el.end, m.index);
        if (el.a["data-i18n"]) put(el.a["data-i18n"], decode(squash(inner.replace(/<[^>]+>/g, ""))), "text");
        if (el.a["data-i18n-html"]) put(el.a["data-i18n-html"], squash(inner), "html");
        break;
      }
      continue;
    }
    const tag = m[3].toLowerCase(), a = attrsOf(m[4] || "");
    if (a["data-i18n-attr"]) a["data-i18n-attr"].split(",").forEach((pair) => {
      const i = pair.indexOf(":"); if (i < 0) return;
      const attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
      if (a[attr] == null) throw new Error(file + " : attribut « " + attr + " » absent pour la clé " + key);
      put(key, decode(a[attr]), "attr");
    });
    if (!VOID.has(tag) && !m[0].endsWith("/>")) stack.push({ tag, a, end: m.index + m[0].length });
  }
  return { out, where };
}

function dictOf(key) {
  return Object.keys(DICTS).find((d) => DICTS[d].prefixes.some((p) => key.startsWith(p)));
}

function build() {
  const fr = {}; Object.keys(DICTS).forEach((d) => { fr[d] = {}; });
  PAGES.forEach((p) => {
    const { out } = extract(p);
    Object.keys(out).forEach((k) => {
      if (k === "meta.title") {
        const d = Object.keys(DICTS).find((x) => DICTS[x].meta === p);
        if (d) fr[d]["meta.title"] = out[k];
        return;
      }
      const d = dictOf(k);
      if (!d) return;                                   // clé d'un autre dictionnaire (dd.*, nav.*, footer.*…)
      if (k in fr[d] && fr[d][k] !== out[k]) throw new Error("clé « " + k + " » : texte français différent selon la page (" + p + ")");
      fr[d][k] = out[k];
    });
  });
  const result = {}, problems = [];
  Object.keys(DICTS).forEach((d) => {
    const keys = Object.keys(fr[d]);
    const langs = { fr: fr[d] };
    LANGS.slice(1).forEach((l) => {
      const f = path.join(ROOT, "content/i18n", d, l + ".json");
      const tr = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
      const missing = keys.filter((k) => !(k in tr) || !String(tr[k]).trim());
      const extra = Object.keys(tr).filter((k) => !(k in fr[d]));
      if (missing.length) problems.push({ dict: d, lang: l, missing });
      if (extra.length) problems.push({ dict: d, lang: l, extra });
      langs[l] = {}; keys.forEach((k) => { if (k in tr) langs[l][k] = tr[k]; });
    });
    result[d] = { keys, langs };
  });
  return { result, problems, fr };
}

function render(d, data) {
  const L = (l) => ({ fr: "FRANÇAIS (langue source — lu dans le HTML)", en: "ENGLISH", nl: "NEDERLANDS", af: "AFRIKAANS", ar: "العربية", bg: "БЪЛГАРСКИ", de: "DEUTSCH", ro: "ROMÂNĂ", it: "ITALIANO", sl: "SLOVENŠČINA" }[l]);
  const lines = [
    "/* =========================================================================",
    "   WISY SAFETY — Traductions : " + DICTS[d].label,
    "   FICHIER GÉNÉRÉ par scripts/build-i18n-fiches.js — ne pas éditer à la main.",
    "   Français : lu dans le HTML des pages ; autres langues : content/i18n/" + d + "/<langue>.json.",
    "   Fusionne dans window.I18N (10 langues). Contrôle : node scripts/check-i18n.js",
    "   ========================================================================= */",
    "(function () {",
    "  var I = window.I18N || (window.I18N = {});",
    "  function m(lang, obj) { I[lang] = Object.assign(I[lang] || {}, obj); }"
  ];
  LANGS.forEach((l) => {
    const obj = data.langs[l] || {};
    lines.push("", "  /* ---------------- " + L(l) + " ---------------- */", "  m(\"" + l + "\", {");
    const ks = data.keys.filter((k) => k in obj);
    ks.forEach((k, i) => lines.push("    " + JSON.stringify(k) + ": " + JSON.stringify(obj[k]) + (i < ks.length - 1 ? "," : "")));
    lines.push("  });");
  });
  lines.push("})();", "");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const { result, problems, fr } = build();
  if (args.includes("--missing")) {
    problems.filter((p) => p.missing).forEach((p) => {
      const dir = path.join(ROOT, "content/i18n/_missing");
      const o = {}; p.missing.forEach((k) => { o[k] = fr[p.dict][k]; });
      fs.writeFileSync(path.join(dir, p.dict + "." + p.lang + ".json"), JSON.stringify(o, null, 1) + "\n");
    });
    console.log("Clés manquantes écrites dans content/i18n/_missing/");
    return;
  }
  let stale = 0;
  Object.keys(result).forEach((d) => {
    const file = "js/i18n-data-" + d + ".js";
    const txt = render(d, result[d]);
    const cur = fs.existsSync(path.join(ROOT, file)) ? read(file) : "";
    if (args.includes("--check")) { if (cur !== txt) { stale++; console.log("✗ " + file + " n'est plus à jour : relancer node scripts/build-i18n-fiches.js"); } }
    else if (cur !== txt) { fs.writeFileSync(path.join(ROOT, file), txt); console.log("écrit " + file + " (" + result[d].keys.length + " clés)"); }
  });
  problems.forEach((p) => console.log((p.missing ? "✗ traductions manquantes" : "⚠ clés inconnues du français") + " — " + p.dict + " · " + p.lang + " : " + (p.missing || p.extra).length + " (ex. " + (p.missing || p.extra).slice(0, 3).join(", ") + ")"));
  if (args.includes("--check") && (stale || problems.some((p) => p.missing))) process.exit(1);
}

module.exports = { build, extract, render, DICTS, PAGES, LANGS };
if (require.main === module) main();
