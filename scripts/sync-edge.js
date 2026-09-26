#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Synchronise la fonction Edge (Deno) avec les sources uniques du site.

   La fonction Edge optionnelle (supabase/functions/chat/) tourne sous Deno : elle ne peut pas importer
   les modules « dual-mode » du navigateur. On GÉNÈRE donc des copies typées :

       node scripts/sync-edge.js          → écrit faq.generated.ts (FAQ) ET site.generated.ts
                                             (formations, pages, coordonnées, routes autorisées)
       node scripts/sync-edge.js --check  → échoue si l'un des deux n'est plus à jour

     faq.generated.ts   ← js/faq-data.js        (voir scripts/sync-faq-edge.js)
     site.generated.ts  ← js/site-content.js + js/faq-data.js (coordonnées) + js/trainings-data.js

   tests/edge-sync.test.js exécute la vérification : impossible de modifier une formation, une page ou
   une coordonnée sans régénérer (ou le test échoue) → le site, la recherche, l'assistant local et
   l'assistant IA disent exactement la même chose.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const Site = require("../js/site-content.js");
const FAQ = require("../js/faq-data.js");
const faqSync = require("./sync-faq-edge.js");

const OUT_DIR = path.join(__dirname, "..", "supabase", "functions", "chat");
const OUT_SITE = path.join(OUT_DIR, "site.generated.ts");

/* Contenu factuel donné au modèle : description + objectif ; si des affirmations sont NON confirmées
   (ex. certification), la consigne d'interdiction est ajoutée AU CONTENU (le modèle ne doit rien inventer). */
function contentOf(f) {
  let c = f.description;
  if (f.objective) c += " Objectif : " + f.objective;
  if (f.priceUnit === "participant") c += " Le tarif est indiqué par personne.";
  if (f.price && f.price.vatIncluded !== true && f.price.vatIncluded !== false) c += " Le statut TVA (HT ou TTC) du tarif n'est PAS précisé : ne jamais écrire « HT », « TTC » ni « hors TVA ».";
  if (f.exam && f.exam.included) c += " L'examen est inclus dans le tarif.";
  if (f.official && f.official.exam) {
    const x = f.official.exam;
    c += " Examen officiel (source BeSaCC-VCA, vérifié le " + f.official.verifiedAt + ") : " + x.questions + " questions, " + x.minutes + " minutes, seuil de réussite " + String(x.passPercent).replace(".", ",") + " %.";
  }
  if (f.official && f.official.diplomaValidityYears) c += " Un diplôme de sécurité de base est considéré comme valable s'il date de moins de " + f.official.diplomaValidityYears + " ans à compter de la date de l'examen.";
  if (f.certification) c += " " + f.certification + ".";
  if (f.venue === "centre") c += " La formation se déroule au centre Wisy Safety d'Anderlecht.";
  if (f.unconfirmed && f.unconfirmed.length) c += " AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer.";
  if (f.unconfirmedClaims && f.unconfirmedClaims.length) c += " NON CONFIRMÉ (ne jamais l'affirmer) : " + f.unconfirmedClaims.join(" ; ") + ".";
  return c;
}

function formationEntry(f) {
  const e = { id: f.id, type: "formation", title: f.title, category: f.category, url: f.url, signupUrl: f.signupUrl, duration: f.duration, level: f.level };
  if (f.priceLabel) e.priceLabel = f.priceLabel;
  if (f.format) e.format = f.format;
  if (f.languages) e.languages = f.languages;
  if (f.audience) e.audience = f.audience;
  if (f.subtypes) e.subtypes = f.subtypes;
  e.content = contentOf(f);
  e.keywords = f.keywords;
  return e;
}
const pageEntry = (p) => ({ id: "page-" + p.id, type: p.kind === "article" ? "article" : "page", title: p.title, url: p.url, content: p.content, keywords: p.keywords });

function generateSite() {
  const C = FAQ.CONTACT;
  const contact = { email: C.email, phone: C.phone, phoneHref: C.phoneHref, city: C.city, postalCode: C.postalCode, region: C.region, hours: C.hours, contactUrl: C.contactUrl };
  return [
    "// =========================================================================",
    "// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.",
    "// Sources uniques : js/site-content.js (pages, formations) · js/faq-data.js (coordonnées) ·",
    "// js/trainings-data.js (faits de la formation à page dédiée)  →  `node scripts/sync-edge.js`",
    "// (tests/edge-sync.test.js échoue si ce fichier n'est plus à jour).",
    "// =========================================================================",
    "",
    "export interface SiteEntry {",
    "  id: string;",
    '  type: "formation" | "page" | "article";',
    "  title: string;",
    "  url: string;",
    "  category?: string;",
    "  signupUrl?: string;",
    "  duration?: string;",
    "  level?: string;",
    "  priceLabel?: string;     // uniquement si le tarif est CONFIRMÉ",
    "  format?: string;",
    "  languages?: string[];",
    "  audience?: string[];",
    "  subtypes?: string[];",
    "  content: string;",
    "  keywords: string[];",
    "}",
    "",
    "export const SITE_VERIFIED_AT = " + JSON.stringify(Site.VERIFIED_AT) + ";",
    "",
    "export const SITE_CONTACT = " + JSON.stringify(contact, null, 2) + ";",
    "",
    "export const SITE_FORMATIONS: SiteEntry[] = " + JSON.stringify(Site.formations().map(formationEntry), null, 2) + ";",
    "",
    "export const SITE_PAGES: SiteEntry[] = " + JSON.stringify(Site.pages().map(pageEntry), null, 2) + ";",
    "",
    "// Pages HTML publiques (pages principales + pages dédiées de formation) : base de l'allow-list d'URLs.",
    "export const SITE_PATHS: string[] = " + JSON.stringify(Site.publicPaths(), null, 2) + ";",
    ""
  ].join("\n");
}

function outputs() {
  return [
    { file: faqSync.OUT, content: faqSync.generate() },
    { file: OUT_SITE, content: generateSite() }
  ];
}

if (require.main === module) {
  const check = process.argv.includes("--check");
  let stale = 0;
  outputs().forEach(({ file, content }) => {
    const rel = path.relative(process.cwd(), file);
    const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (cur === content) { if (!check) console.log("= " + rel + " (déjà à jour)"); return; }
    stale++;
    if (check) console.error("✗ " + rel + " n'est plus à jour.");
    else { fs.writeFileSync(file, content, "utf8"); console.log("✓ " + rel); }
  });
  if (check) {
    if (stale) { console.error("→ lancez `node scripts/sync-edge.js`."); process.exit(1); }
    console.log("✓ copies Edge à jour.");
  }
}

module.exports = { generateSite, OUT_SITE, outputs };
