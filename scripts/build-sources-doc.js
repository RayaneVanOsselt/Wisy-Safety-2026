#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Génère docs/content-sources.md depuis js/sources-data.js (une seule source de vérité)

       node scripts/build-sources-doc.js          → (ré)écrit docs/content-sources.md
       node scripts/build-sources-doc.js --check  → échoue si le document n'est plus à jour (utilisé par les tests)
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const S = require("../js/sources-data.js");
const OUT = "docs/content-sources.md";

function render() {
  const L = [];
  L.push("# Traçabilité des sources — pages formation « fiche »", "");
  L.push("> **Document généré** par `node scripts/build-sources-doc.js` à partir de `js/sources-data.js` — ne pas éditer à la main.",
    "> Chaque affirmation publiée porte son identifiant dans le HTML (`data-src=\"SRC-…\"`) ; `node scripts/check-sources.js`",
    "> échoue si une affirmation affichée n'a pas de source vérifiée. Date de vérification : **" + S.CHECKED + "**.", "");
  L.push("Statuts : **Verified** (vérifié tel quel) · **Corrected** (corrigé par rapport à l'ancien site) · **Removed** (affirmation de l'ancien site",
    "supprimée ; le site affiche à la place ce que dit réellement la source) · **Needs confirmation** (jamais affiché).", "");
  L.push("## Documents consultés", "", "| Id | Type | Organisme | Document | Lien |", "|---|---|---|---|---|");
  S.DOCUMENTS.forEach((d) => L.push("| " + d.id + " | " + d.type + " | " + d.org + " | " + d.title.replace(/\|/g, "/") + (d.note ? " — *" + d.note.replace(/\|/g, "/") + "*" : "") + " | " + d.url + " |"));
  L.push("", "## Affirmations publiées", "");
  S.CLAIMS.forEach((c) => {
    const d = S.doc(c.doc);
    L.push("### " + c.id, "",
      "**Affirmation publiée** — " + c.text, "",
      "*Pages* : " + c.pages.join(", ") + " · *langues* : 10 (traductions : docs/translations-review.md)", "",
      "**Source** — " + d.title + " — " + d.org + " — " + d.url, "",
      "**Type** — " + d.type, "",
      "**Passage justificatif** — " + c.passage, "",
      "**Consulté le** — " + S.CHECKED, "");
    if (c.second) { const d2 = S.doc(c.second.doc); L.push("**Deuxième source** — " + d2.title + " — " + d2.org + " — " + d2.url + " — " + S.CHECKED + " — " + c.second.passage, ""); }
    L.push("**Statut** — " + c.status, "");
    if (c.notes) L.push("**Notes** — " + c.notes, "");
  });
  L.push("## Données institutionnelles (pied de page — §2.4 du brief)", "",
    "| Donnée | Ancien site | Nouveau site | Source publique | Statut |", "|---|---|---|---|---|",
    "| Numéro d'entreprise / TVA | BE 1027.725.391 | BE 1027.725.391 | BCE : entité 1027.725.391, active | **Verified** (DOC-KBO-WISY) |",
    "| Forme juridique | ASBL | ASBL | BCE : association sans but lucratif depuis le 14/09/2025 | **Verified** |",
    "| Dénomination | « WiSy Safety ASBL » | « Wisy Safety ASBL » | BCE : dénomination officielle « WISY » | **Needs confirmation** — « Wisy Safety » est un nom d'usage : à faire confirmer pour les mentions légales |",
    "| Adresse du siège | Avenue d'Itterbeek 378, 1070 Anderlecht | idem | BCE : Avenue d'Itterbeek 378 **boîte 1**, 1070 Anderlecht | **Verified** (numéro de boîte absent du site) |",
    "| Téléphone · e-mail | +32 2 318 86 59 · info@wisysafety.be | idem | — (donnée interne) | **Primary (Wisy Safety)** — publiée par Wisy Safety sur ses deux sites |",
    "| Horaires | lundi–jeudi 10:00–16:00, vendredi–dimanche fermé | idem | — (donnée interne) | **Primary (Wisy Safety)** |", "");
  L.push("## Liens d'orientation (sans affirmation)", "", "Liens vers des organismes à contacter, sans fait attribué : " +
    S.ORIENTATION_LINKS.map((l) => l.org + " (" + l.url + ")").join(" · ") + ".", "");
  L.push("## Archives (Wayback Machine)", "", "Non enregistrées à ce jour (aucune capture demandée). À faire lors du prochain contrôle mensuel : pour chaque",
    "document ci-dessus, enregistrer une capture sur https://web.archive.org/ et noter son URL ici — jamais affichée sur le site.", "");
  return L.join("\n");
}

if (require.main === module) {
  const txt = render(), file = path.join(ROOT, OUT);
  const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (process.argv.includes("--check")) { if (cur !== txt) { console.log(OUT + " n'est plus à jour : node scripts/build-sources-doc.js"); process.exit(1); } }
  else if (cur !== txt) { fs.writeFileSync(file, txt); console.log("écrit " + OUT); }
}
module.exports = { render, OUT };
