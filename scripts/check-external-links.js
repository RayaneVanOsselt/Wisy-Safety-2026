#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Contrôle des liens EXTERNES (sources officielles, organismes) — Node 18+ (fetch natif), aucune dépendance

       node scripts/check-external-links.js              → rapport lisible ; code 1 si un lien est mort
       node scripts/check-external-links.js --markdown   → rapport Markdown (utilisé par l'action GitHub mensuelle)

   Liens contrôlés : tous les liens http(s) des pages publiques (hors domaine du site, cartes Google) + tous les
   documents du registre js/sources-data.js (y compris leurs versions linguistiques).
   Verdicts :
     ✓ ok              réponse 2xx (après redirections éventuelles), même domaine, pas de retour à l'accueil
     ↪ accueil         redirigé vers la page d'accueil du site : contenu probablement déplacé → À CORRIGER
     ⇄ domaine         redirigé vers un autre domaine → à vérifier
     ⛨ anti-robot      202 / 403 / 429 typiques d'un pare-feu (EUR-Lex, ECHA…) → vérifier à la main dans un navigateur
     ✗ mort            404, 410, 5xx, erreur réseau ou délai dépassé → À CORRIGER (code de sortie 1)
   Les URL d'archive (Wayback Machine) ne sont jamais affichées sur le site : voir docs/content-sources.md.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const Sources = require("../js/sources-data.js");

const UA = "Mozilla/5.0 (compatible; WisySafety-LinkCheck/1.0; +https://www.wisysafety.be)";
const TIMEOUT = 20000, CONCURRENCY = 4;

function collect() {
  const urls = new Map();                                            // url → [où]
  const add = (u, where) => { u = u.replace(/&amp;/g, "&"); if (!urls.has(u)) urls.set(u, []); urls.get(u).push(where); };
  fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && f !== "404.html").forEach((f) => {
    const html = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of html.matchAll(/href="(https?:\/\/[^"#]+[^"]*)"/g)) {
      const u = m[1];
      if (/^https:\/\/(www\.)?wisysafety\.be\//.test(u) || /^https:\/\/www\.google\.com\/maps/.test(u) || /fonts\.(googleapis|gstatic)\.com/.test(u)) continue;
      add(u, f);
    }
  });
  Sources.DOCUMENTS.forEach((d) => { add(d.url, d.id); Object.keys(d.urls || {}).forEach((l) => add(d.urls[l], d.id + " (" + l + ")")); });
  Sources.ORIENTATION_LINKS.forEach((l) => add(l.url, "orientation : " + l.org));
  return urls;
}

const baseDomain = (h) => h.split(".").slice(-2).join(".");
async function check(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  const go = (method) => fetch(url, { method, redirect: "follow", signal: ctl.signal, headers: { "user-agent": UA, accept: "text/html,application/pdf,*/*" } });
  try {
    let res = await go("HEAD");
    if ([403, 405, 501].includes(res.status) || res.status === 404) res = await go("GET");     // certains serveurs refusent HEAD
    const from = new URL(url), to = new URL(res.url || url);
    if (res.status >= 200 && res.status < 300 && res.status !== 202) {
      if (from.pathname.length > 1 && (to.pathname === "/" || to.pathname === "") ) return { verdict: "accueil", status: res.status, final: res.url };
      if (baseDomain(from.hostname) !== baseDomain(to.hostname)) return { verdict: "domaine", status: res.status, final: res.url };
      return { verdict: "ok", status: res.status, final: res.url };
    }
    if ([202, 403, 429].includes(res.status)) return { verdict: "anti-robot", status: res.status };
    return { verdict: "mort", status: res.status };
  } catch (e) {
    return { verdict: "mort", status: e.name === "AbortError" ? "délai dépassé" : String(e.cause && e.cause.code || e.message) };
  } finally { clearTimeout(t); }
}

async function main() {
  const md = process.argv.includes("--markdown");
  const urls = collect(), list = [...urls.keys()], results = new Map();
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < list.length) { const u = list[i++]; results.set(u, await check(u)); } }));
  const ICON = { ok: "✓", accueil: "↪", domaine: "⇄", "anti-robot": "⛨", mort: "✗" };
  const rows = list.map((u) => ({ u, r: results.get(u), where: urls.get(u) }));
  const bad = rows.filter((x) => ["mort", "accueil"].includes(x.r.verdict));
  const warn = rows.filter((x) => ["domaine", "anti-robot"].includes(x.r.verdict));
  if (md) {
    console.log("# Contrôle des liens externes — " + new Date().toISOString().slice(0, 10) + "\n");
    console.log(rows.length + " liens contrôlés · " + bad.length + " à corriger · " + warn.length + " à vérifier à la main\n");
    console.log("| Verdict | Statut | Lien | Cité par |\n|---|---|---|---|");
    rows.filter((x) => x.r.verdict !== "ok").forEach((x) => console.log("| " + ICON[x.r.verdict] + " " + x.r.verdict + " | " + x.r.status + " | " + x.u + (x.r.final && x.r.final !== x.u ? " → " + x.r.final : "") + " | " + x.where.slice(0, 3).join(", ") + " |"));
  } else {
    rows.forEach((x) => console.log(ICON[x.r.verdict] + " " + String(x.r.status).padEnd(4) + " " + x.u + (x.r.verdict !== "ok" && x.r.final && x.r.final !== x.u ? "  → " + x.r.final : "")));
    console.log("\n" + rows.length + " liens · " + bad.length + " à corriger · " + warn.length + " à vérifier à la main (anti-robot ou changement de domaine)");
  }
  if (bad.length) process.exit(1);
}

module.exports = { collect, check };
if (require.main === module) main();
