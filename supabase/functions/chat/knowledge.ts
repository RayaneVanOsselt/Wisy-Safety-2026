// =========================================================================
// WISY SAFETY — Assistant · Base de connaissances (côté serveur, Deno)
// -------------------------------------------------------------------------
// Miroir TypeScript de js/assistant/knowledge.js. Gardez les deux SYNCHRONISÉS
// (mêmes formations, durées, URLs). Runtime Deno (Supabase Edge Functions) :
// pas de partage direct avec le bundle navigateur, d'où cette copie compacte.
// Les faits de la formation « Nacelles élévatrices » proviennent du registre
// js/trainings-data.js ; tests/trainings.test.js vérifie que cette copie ne dérive pas.
// Ces données sont la SEULE source factuelle : le modèle ne doit rien ajouter.
// =========================================================================

export interface Entry {
  id: string;
  type: "formation" | "page" | "contact" | "faq";
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

export const CONTACT = {
  email: "info@wisysafety.be",
  phone: "+32 2 318 86 59",
  phoneHref: "tel:+3223188659",
  city: "Anderlecht",
  postalCode: "1070",
  region: "Bruxelles",
  hours: "Du lundi au jeudi, de 10h00 à 16h00",
  contactUrl: "contact.html",
};

export const FORMATIONS: Entry[] = [
  { id: "vca-base", type: "formation", title: "VCA Base", category: "securite",
    url: "formations.html#vca-base", signupUrl: "inscription.html?formation=vca-base",
    duration: "1 jour", level: "Base",
    content: "Formation sécurité de base pour tous les secteurs professionnels. Certification reconnue au niveau national.",
    keywords: ["vca", "base", "securite", "chantier", "certification"] },
  { id: "vca-hierarchique", type: "formation", title: "VCA Ligne hiérarchique", category: "management",
    url: "formations.html#vca-hierarchique", signupUrl: "inscription.html?formation=vca-hierarchique",
    duration: "2 jours", level: "Avancé",
    content: "Pour responsables et encadrants en milieu professionnel. Approfondissement des concepts de sécurité.",
    keywords: ["vca", "hierarchique", "encadrement", "responsable", "management"] },
  { id: "diisocyanates", type: "formation", title: "Diisocyanates & substances dangereuses", category: "securite",
    url: "formations.html#diisocyanates", signupUrl: "inscription.html?formation=diisocyanates",
    duration: "1 jour", level: "Spécialisée",
    content: "Manipulation sécurisée des produits chimiques en entreprise. Conforme aux normes européennes en vigueur.",
    keywords: ["diisocyanate", "isocyanate", "reach", "chimique", "substances", "dangereuses"] },
  { id: "nacelle", type: "formation", title: "Nacelles élévatrices", category: "technique",
    url: "formation-nacelles-elevatrices.html", signupUrl: "inscription.html?formation=nacelle",
    duration: "1 jour", level: "Spécialisée",
    priceLabel: "350 € HT", format: "Théorie + pratique",
    languages: ["Français", "Néerlandais", "Anglais"],
    audience: ["opérateurs", "techniciens de maintenance", "personnel d'entretien",
      "toute personne amenée à utiliser une nacelle dans le cadre de son activité professionnelle"],
    subtypes: ["Nacelle ciseaux", "Nacelle araignée", "Nacelle télescopique", "Nacelle articulée",
      "Nacelle sur camion", "Nacelle verticale", "Nacelle automotrice"],
    content: "Développez les compétences nécessaires pour utiliser les nacelles élévatrices de manière sûre, efficace et responsable dans un environnement professionnel. Objectif : utiliser les nacelles élévatrices de manière sûre et identifier les risques associés. AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer.",
    keywords: ["nacelle", "nacelles", "pemp", "mewp", "travail en hauteur", "plateforme elevatrice", "elevatrice", "ciseaux", "araignee", "telescopique", "articulee", "camion", "verticale", "automotrice", "hoogwerker"] },
  { id: "fibre-optique", type: "formation", title: "Fibre optique", category: "technique",
    url: "formations.html#fibre-optique", signupUrl: "inscription.html?formation=fibre-optique",
    duration: "3 jours", level: "Technique",
    content: "Soudure et installation professionnelle de fibres optiques. Formation complète avec équipement fourni.",
    keywords: ["fibre", "optique", "soudure", "raccordement", "telecom", "ftth"] },
  { id: "beps", type: "formation", title: "BEPS — Premier secours", category: "secours",
    url: "formations.html#beps", signupUrl: "inscription.html?formation=beps",
    duration: "3 jours", level: "Moyen",
    content: "Maîtrisez les gestes qui sauvent : réanimation, hémorragies et positions de sécurité. Brevet européen de premiers secours reconnu.",
    keywords: ["beps", "secours", "secourisme", "premiers", "brevet", "reanimation", "cpr"] },
];

export const PAGES: Entry[] = [
  { id: "page-formations", type: "page", title: "Formations", url: "formations.html",
    content: "Catalogue complet des formations : sécurité, secours, technique et management.",
    keywords: ["formations", "catalogue", "cours", "liste"] },
  { id: "page-contact", type: "page", title: "Contact", url: "contact.html",
    content: "Coordonnées de Wisy Safety : téléphone, e-mail, adresse à Anderlecht et formulaire de contact.",
    keywords: ["contact", "adresse", "telephone", "email", "joindre"] },
  { id: "page-inscription", type: "page", title: "Inscription", url: "inscription.html",
    content: "Formulaire d'inscription en ligne aux formations.",
    keywords: ["inscription", "inscrire", "reserver", "s'inscrire"] },
  { id: "page-avis", type: "page", title: "Avis clients", url: "avis.html",
    content: "Avis et témoignages des participants aux formations.",
    keywords: ["avis", "temoignages", "reviews", "retours"] },
];

export const CONTACT_ENTRY: Entry = {
  id: "contact-info", type: "contact", title: "Contacter Wisy Safety", url: CONTACT.contactUrl,
  content: `Téléphone ${CONTACT.phone}, e-mail ${CONTACT.email}, ${CONTACT.postalCode} ${CONTACT.city} (${CONTACT.region}). ${CONTACT.hours}. Formulaire de contact en ligne.`,
  keywords: ["contact", "telephone", "appeler", "email", "adresse", "horaires", "humain", "conseiller"],
};

export const FAQ: Entry[] = [
  { id: "faq-deroulement", type: "faq", title: "Comment se déroule une formation ?", url: "formations.html",
    content: "Les formations durent de 1 à 3 jours, sont animées par des formateurs experts, alternent théorie et pratique et débouchent le plus souvent sur une certification reconnue. Pour les dates précises, contacter Wisy Safety.",
    keywords: ["deroulement", "deroule", "passe", "organisation", "duree", "pratique"] },
  { id: "faq-tarifs", type: "faq", title: "Tarifs", url: "contact.html",
    content: "Seul le tarif de la formation Nacelles élévatrices est confirmé : 350 € HT (hors TVA). Pour toutes les AUTRES formations, le tarif n'est PAS confirmé ici : inviter à contacter Wisy Safety pour un tarif adapté. NE JAMAIS inventer de prix.",
    keywords: ["tarif", "prix", "cout", "combien", "devis", "budget"] },
  { id: "faq-lieu", type: "faq", title: "Localisation", url: "contact.html",
    content: "Centre de formation à la sécurité situé à Anderlecht (1070), Bruxelles.",
    keywords: ["lieu", "ou", "adresse", "anderlecht", "bruxelles", "situe"] },
];

export const ALL: Entry[] = [...FORMATIONS, ...PAGES, CONTACT_ENTRY, ...FAQ];

// Toutes les URLs légitimes (allow-list pour la validation des réponses).
export const ALLOWED_URLS = new Set<string>([
  "index.html", "formations.html", "contact.html", "avis.html", "inscription.html",
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
