#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Synchronise la FAQ de la fonction Edge (Deno) avec la source unique.

   La fonction Edge optionnelle (supabase/functions/chat/) tourne sous Deno et
   ne peut pas importer js/faq-data.js (module « dual-mode » navigateur/Node).
   On GÉNÈRE donc une copie typée à partir de la source unique :

       node scripts/sync-faq-edge.js          → écrit supabase/functions/chat/faq.generated.ts
       node scripts/sync-faq-edge.js --check  → échoue si le fichier n'est plus à jour

   tests/edge-sync.test.js exécute la vérification : impossible de modifier
   js/faq-data.js sans régénérer (ou le test échoue) → aucune divergence entre la
   FAQ du site, l'assistant local et l'assistant IA.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const FAQ = require("../js/faq-data.js");

const OUT = path.join(__dirname, "..", "supabase", "functions", "chat", "faq.generated.ts");

function generate() {
  const items = FAQ.items().map((it) => {
    const o = {
      id: it.id,
      category: it.category,
      question: it.question,
      answer: it.answer,
      keywords: it.keywords || [],
      synonyms: it.synonyms || [],
      relatedQuestions: it.relatedQuestions || []
    };
    if (it.action) o.action = it.action;
    if (it.provisional) o.provisional = true;
    return o;
  });
  return [
    "// =========================================================================",
    "// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.",
    "// Source unique : js/faq-data.js  →  `node scripts/sync-faq-edge.js`",
    "// (tests/edge-sync.test.js échoue si ce fichier n'est plus à jour).",
    "// =========================================================================",
    "",
    "export interface FaqItem {",
    "  id: string;",
    "  category: string;",
    "  question: string;",
    "  answer: string;",
    "  keywords: string[];",
    "  synonyms: string[];",
    "  relatedQuestions: string[];",
    "  action?: string;",
    "  provisional?: boolean;",
    "}",
    "",
    "export const FAQ_VERIFIED_AT = " + JSON.stringify(FAQ.VERIFIED_AT) + ";",
    "",
    "export const FAQ_ITEMS: FaqItem[] = " + JSON.stringify(items, null, 2) + ";",
    ""
  ].join("\n");
}

if (require.main === module) {
  const next = generate();
  if (process.argv.includes("--check")) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (cur !== next) {
      console.error("✗ faq.generated.ts n'est plus à jour : lancez `node scripts/sync-faq-edge.js`.");
      process.exit(1);
    }
    console.log("✓ faq.generated.ts est à jour.");
  } else {
    fs.writeFileSync(OUT, next, "utf8");
    console.log("✓ " + path.relative(process.cwd(), OUT) + " (" + FAQ.items().length + " questions)");
  }
}

module.exports = { generate, OUT };
