#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Contrôle des sources des pages « fiche » (aucune dépendance)

       node scripts/check-sources.js      → rapport ; code de sortie 1 s'il y a une ERREUR

   Vérifie, à partir de js/sources-data.js :
     1. chaque attribut data-src="SRC-…" des pages renvoie à une affirmation connue, au statut publiable
        (Verified · Corrected · Removed · Primary confirmé), dont le document source existe ;
     2. chaque affirmation du registre est réellement utilisée par une page qu'elle déclare (pas de source « orpheline ») ;
     3. aucun marqueur « [À CONFIRMER] » / « À COMPLÉTER » n'est visible dans les pages contrôlées ;
     4. chaque lien externe des pages contrôlées est un document tracé (DOCUMENTS) ou un lien d'orientation déclaré —
        aucun lien « de mémoire » ne peut être publié sans passer par le registre ;
     5. aucune affirmation interdite de l'ancien site (unconfirmedClaims du registre js/trainings-data.js) ne réapparaît.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const Sources = require("../js/sources-data.js");
const Trainings = require("../js/trainings-data.js");

const PAGES = ["formation-vca-ligne-hierarchique.html", "formation-diisocyanates.html", "formation-fibre-optique.html",
  "article-fibre-parcours-professionnels.html", "article-fibre-devenir-expert.html"];
/* Formulations de l'ancien site qui ne doivent JAMAIS revenir (vérifiées fausses, non sourcées ou marketing). */
const FORBIDDEN = [/250\s?€\s*par jour/i, /70\s?% de la consommation/i, /certification valide partout/i, /reconnaissance légale européenne/i,
  /\+?\s?2\s?500 professionnels/i, /98\s?% de satisfaction/i, /4[,.]9\s?\/\s?5/, /acc[eè]s illimit[ée] à vie/i, /offre limit[ée]e/i, /première leçon offerte/i,
  /taux de réussite[^.]{0,30}95/i, /500\+/, /15\+ ans/i, /100\s?% certifications/i, /maximum 8 participants/i, /80\s?% de pratique/i, /révolutionn/i, /garanti(e)? /i,
  /QCM de 70 questions/i, /45\/70/];

function run() {
  const errors = [], warnings = [];
  const used = new Map();
  const extLinks = new Set();
  const known = new Set();
  Sources.DOCUMENTS.forEach((d) => { known.add(d.url); Object.values(d.urls || {}).forEach((u) => known.add(u)); });
  Sources.ORIENTATION_LINKS.forEach((l) => known.add(l.url));

  PAGES.forEach((p) => {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    const body = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    for (const m of body.matchAll(/\sdata-src="([^"]+)"/g)) {
      m[1].split(/\s+/).filter(Boolean).forEach((id) => {
        const c = Sources.claim(id);
        if (!c) { errors.push(p + " : source inconnue " + id); return; }
        if (!Sources.PUBLISHABLE[c.status]) errors.push(p + " : " + id + " a le statut « " + c.status + " » — non publiable");
        if (!Sources.doc(c.doc)) errors.push(id + " : document " + c.doc + " absent de DOCUMENTS");
        if (c.second && !Sources.doc(c.second.doc)) errors.push(id + " : deuxième document " + c.second.doc + " absent");
        if (!c.passage) errors.push(id + " : passage justificatif manquant");
        if (c.pages.indexOf(p) < 0) warnings.push(id + " utilisé par " + p + " mais la page n'est pas déclarée dans claims.pages");
        used.set(id, (used.get(id) || 0) + 1);
      });
    }
    const visible = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
    if (/\[?\s*À\s+CONFIRMER\s*\]?|À COMPLÉTER/i.test(visible)) errors.push(p + " : marqueur « À CONFIRMER / À COMPLÉTER » visible");
    FORBIDDEN.forEach((re) => { if (re.test(visible)) errors.push(p + " : formulation interdite de l'ancien site → " + re); });
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const u = m[1].replace(/&amp;/g, "&");
      if (/^https:\/\/www\.wisysafety\.be\//.test(u)) continue;      // canonical / partage (domaine du site)
      if (/^https:\/\/www\.google\.com\/maps/.test(u)) continue;
      extLinks.add(u);
      if (!known.has(u)) errors.push(p + " : lien externe non tracé dans js/sources-data.js → " + u);
    }
  });
  Sources.CLAIMS.forEach((c) => { if (!used.has(c.id)) errors.push(c.id + " : affirmation du registre utilisée par aucune page (retirer ou relier)"); });
  /* Le dictionnaire des traductions ne doit pas réintroduire d'affirmation interdite non plus. */
  ["js/i18n-data-vlh.js", "js/i18n-data-diiso.js", "js/i18n-data-fibre.js", "js/i18n-data-fibre-art.js"].forEach((f) => {
    if (!fs.existsSync(path.join(ROOT, f))) return;
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    FORBIDDEN.forEach((re) => { if (re.test(t)) errors.push(f + " : formulation interdite → " + re); });
  });
  ["vcaLigneHierarchique", "diisocyanates", "fibreOptique"].forEach((k) => {
    const T = Trainings[k];
    if (!T) { errors.push("registre : formation " + k + " absente de js/trainings-data.js"); return; }
    if (T.price != null) warnings.push(k + " : un prix est renseigné — vérifier qu'il est confirmé PAR ÉCRIT par Wisy Safety (docs/content-audit.md)");
  });
  return { errors, warnings, stats: { pages: PAGES.length, claims: Sources.CLAIMS.length, documents: Sources.DOCUMENTS.length, used: used.size, links: extLinks.size } };
}

module.exports = { run, PAGES, FORBIDDEN };
if (require.main === module) {
  const r = run();
  console.log("Sources : " + r.stats.claims + " affirmations · " + r.stats.documents + " documents · " + r.stats.used + " utilisées · " + r.stats.links + " liens externes · " + r.stats.pages + " pages");
  r.warnings.forEach((w) => console.log("⚠ " + w));
  r.errors.forEach((e) => console.log("✗ " + e));
  console.log(r.errors.length ? "\n" + r.errors.length + " erreur(s)." : "\nAucune erreur.");
  if (r.errors.length) process.exit(1);
}
