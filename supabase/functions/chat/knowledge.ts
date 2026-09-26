// =========================================================================
// WISY SAFETY — Assistant · Base de connaissances (côté serveur, Deno)
// -------------------------------------------------------------------------
// Runtime Deno (Supabase Edge Functions) : pas de partage direct avec le bundle navigateur.
// Plus AUCUNE copie manuelle : formations, pages, coordonnées et FAQ sont GÉNÉRÉES depuis les
// sources uniques du site par `node scripts/sync-edge.js` (tests/edge-sync.test.js échoue si un
// fichier généré dérive) :
//   • site.generated.ts ← js/site-content.js + js/faq-data.js (coordonnées) + js/trainings-data.js
//   • faq.generated.ts  ← js/faq-data.js
// Le site, la recherche, l'assistant local et l'assistant IA disent donc exactement la même chose.
// Ces données sont la SEULE source factuelle : le modèle ne doit rien ajouter.
// =========================================================================

import { FAQ_ITEMS } from "./faq.generated.ts";
import { SITE_CONTACT, SITE_FORMATIONS, SITE_PAGES, SITE_PATHS } from "./site.generated.ts";

export interface Entry {
  id: string;
  type: "formation" | "page" | "article" | "contact" | "faq";
  title: string;
  url: string;
  duration?: string;
  level?: string;
  category?: string;
  signupUrl?: string;
  priceLabel?: string;     // uniquement si le tarif est CONFIRMÉ
  format?: string;
  languages?: string[];
  audience?: string[];
  subtypes?: string[];
  content: string;
  keywords: string[];
}

export const CONTACT = SITE_CONTACT;

export const FORMATIONS: Entry[] = SITE_FORMATIONS;

export const PAGES: Entry[] = SITE_PAGES;

export const CONTACT_ENTRY: Entry = {
  id: "contact-info", type: "contact", title: "Contacter Wisy Safety", url: CONTACT.contactUrl,
  content: `Téléphone ${CONTACT.phone}, e-mail ${CONTACT.email}, ${CONTACT.postalCode} ${CONTACT.city} (${CONTACT.region}). ${CONTACT.hours}. Formulaire de contact en ligne.`,
  keywords: ["contact", "telephone", "appeler", "email", "adresse", "horaires", "humain", "conseiller"],
};

// FAQ — dérivée de la source unique (voir en-tête). Aucune réponse n'est écrite ici.
export const FAQ: Entry[] = FAQ_ITEMS.map((f) => ({
  id: f.id,
  type: "faq" as const,
  title: f.question,
  url: `faq.html#${f.id}`,
  content: f.answer.replace(/\s+/g, " "),
  keywords: [...f.keywords, ...f.synonyms],
}));

export const ALL: Entry[] = [...FORMATIONS, ...PAGES, CONTACT_ENTRY, ...FAQ];

// Toutes les URLs légitimes (allow-list pour la validation des réponses).
export const ALLOWED_URLS = new Set<string>([
  ...SITE_PATHS,
  ...FORMATIONS.map((f) => f.url),
  ...FORMATIONS.map((f) => f.signupUrl!).filter(Boolean),
  `mailto:${CONTACT.email}`, CONTACT.phoneHref,
]);

// ---- Récupération full-text minimale (mêmes principes que retrieval.js) ----
const STOP = new Set(
  "le la les un une des du de d au aux et ou ou a a en dans sur pour par avec sans je tu il elle on nous vous que qui est sont quel quelle quels quelles the a of to in on for and is are you my this that".split(" "),
);

export function normalize(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w)); // ≥ 3 : voir js/assistant/retrieval.js
}
function text(e: Entry): string {
  return normalize([e.title, e.content, e.level, e.duration, e.format, e.category,
    (e.languages ?? []).join(" "), (e.audience ?? []).join(" "), (e.subtypes ?? []).join(" "),
    e.keywords.join(" ")].filter(Boolean).join(" "));
}

export function contextFor(query: string, limit = 5): Entry[] {
  const tokens = tokenize(query);
  if (!tokens.length) return FORMATIONS.slice(0, 3);
  const scored = ALL.map((e) => {
    const title = normalize(e.title);
    const kw = normalize(e.keywords.join(" "));
    const body = text(e);
    let score = 0;
    for (const tk of tokens) {
      if (title.includes(tk)) score += 6;
      if (kw.includes(tk)) score += 4;
      else if (body.includes(tk)) score += 2;
    }
    if (e.type === "formation" && score > 0) score += 1;
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.e);
}
