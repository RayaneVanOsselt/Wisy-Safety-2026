// =========================================================================
// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
// Sources uniques : js/site-content.js (pages, formations) · js/faq-data.js (coordonnées) ·
// js/trainings-data.js (faits de la formation à page dédiée)  →  `node scripts/sync-edge.js`
// (tests/edge-sync.test.js échoue si ce fichier n'est plus à jour).
// =========================================================================

export interface SiteEntry {
  id: string;
  type: "formation" | "page";
  title: string;
  url: string;
  category?: string;
  signupUrl?: string;
  duration?: string;
  level?: string;
  priceLabel?: string;     // uniquement si le tarif est CONFIRMÉ
  format?: string;
  languages?: string[];
  audience?: string[];
  subtypes?: string[];
  content: string;
  keywords: string[];
}

export const SITE_VERIFIED_AT = "2026-09-20";

export const SITE_CONTACT = {
  "email": "info@wisysafety.be",
  "phone": "+32 2 318 86 59",
  "phoneHref": "tel:+3223188659",
  "city": "Anderlecht",
  "postalCode": "1070",
  "region": "Bruxelles",
  "hours": "Du lundi au jeudi, de 10h00 à 16h00",
  "contactUrl": "contact.html"
};

export const SITE_FORMATIONS: SiteEntry[] = [
  {
    "id": "vca-base",
    "type": "formation",
    "title": "VCA Base",
    "category": "securite",
    "url": "formations.html#vca-base",
    "signupUrl": "inscription.html?formation=vca-base",
    "duration": "1 jour",
    "level": "Base",
    "content": "Formation sécurité de base pour tous les secteurs professionnels. Certification reconnue au niveau national.",
    "keywords": [
      "vca",
      "base",
      "b-vca",
      "securite",
      "chantier",
      "fondamentaux",
      "certification",
      "national",
      "safety",
      "veiligheid",
      "sicherheit"
    ]
  },
  {
    "id": "vca-hierarchique",
    "type": "formation",
    "title": "VCA Ligne hiérarchique",
    "category": "management",
    "url": "formations.html#vca-hierarchique",
    "signupUrl": "inscription.html?formation=vca-hierarchique",
    "duration": "2 jours",
    "level": "Avancé",
    "content": "Pour responsables et encadrants en milieu professionnel. Approfondissement des concepts de sécurité.",
    "keywords": [
      "vca",
      "hierarchique",
      "vol-vca",
      "ligne",
      "encadrement",
      "responsable",
      "responsables",
      "manager",
      "management",
      "chef",
      "supervisor",
      "leidinggevende"
    ]
  },
  {
    "id": "diisocyanates",
    "type": "formation",
    "title": "Diisocyanates & substances dangereuses",
    "category": "securite",
    "url": "formations.html#diisocyanates",
    "signupUrl": "inscription.html?formation=diisocyanates",
    "duration": "1 jour",
    "level": "Spécialisée",
    "content": "Manipulation sécurisée des produits chimiques en entreprise. Conforme aux normes européennes en vigueur.",
    "keywords": [
      "diisocyanate",
      "diisocyanates",
      "isocyanate",
      "reach",
      "chimique",
      "chimiques",
      "substances",
      "dangereuses",
      "produits",
      "chemical",
      "gevaarlijke"
    ]
  },
  {
    "id": "nacelle",
    "type": "formation",
    "title": "Nacelles élévatrices",
    "category": "technique",
    "url": "formation-nacelles-elevatrices.html",
    "signupUrl": "inscription.html?formation=nacelle",
    "duration": "1 jour",
    "level": "Spécialisée",
    "priceLabel": "350 € HT",
    "format": "Théorie + pratique",
    "languages": [
      "Français",
      "Néerlandais",
      "Anglais"
    ],
    "audience": [
      "opérateurs",
      "techniciens de maintenance",
      "personnel d'entretien",
      "toute personne amenée à utiliser une nacelle dans le cadre de son activité professionnelle"
    ],
    "subtypes": [
      "Nacelle ciseaux",
      "Nacelle araignée",
      "Nacelle télescopique",
      "Nacelle articulée",
      "Nacelle sur camion",
      "Nacelle verticale",
      "Nacelle automotrice"
    ],
    "content": "Développez les compétences nécessaires pour utiliser les nacelles élévatrices de manière sûre, efficace et responsable dans un environnement professionnel. Objectif : Permettre aux participants d'utiliser les nacelles élévatrices de manière sûre et d'identifier les risques associés. AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer.",
    "keywords": [
      "nacelle",
      "nacelles",
      "nacelle elevatrice",
      "nacelles elevatrices",
      "pemp",
      "mewp",
      "travail en hauteur",
      "plateforme elevatrice",
      "elevatrice",
      "ciseaux",
      "araignee",
      "telescopique",
      "articulee",
      "camion",
      "verticale",
      "automotrice",
      "lift",
      "aerial",
      "hoogwerker"
    ]
  },
  {
    "id": "fibre-optique",
    "type": "formation",
    "title": "Fibre optique",
    "category": "technique",
    "url": "formations.html#fibre-optique",
    "signupUrl": "inscription.html?formation=fibre-optique",
    "duration": "3 jours",
    "level": "Technique",
    "content": "Soudure et installation professionnelle de fibres optiques. Formation complète avec équipement fourni.",
    "keywords": [
      "fibre",
      "fiber",
      "optique",
      "optic",
      "soudure",
      "raccordement",
      "telecom",
      "installation",
      "ftth"
    ]
  },
  {
    "id": "beps",
    "type": "formation",
    "title": "BEPS — Premier secours",
    "category": "secours",
    "url": "formation-beps-premiers-secours.html",
    "signupUrl": "inscription.html?formation=beps",
    "duration": "15 heures",
    "level": "Moyen",
    "priceLabel": "70 €",
    "format": "Essentiellement pratique",
    "languages": [
      "Français",
      "Néerlandais",
      "Anglais"
    ],
    "audience": [
      "toute personne souhaitant apprendre les gestes qui sauvent"
    ],
    "subtypes": [
      "Réanimation & défibrillation",
      "Position latérale de sécurité",
      "Étouffement & désobstruction",
      "Hémorragies & plaies",
      "Malaises & brûlures",
      "Alerter le 112"
    ],
    "content": "Apprendre, en 15 heures, à protéger, alerter le 112 et secourir une victime en attendant les professionnels : réanimation, défibrillation, position latérale de sécurité, hémorragies, étouffement, malaises et brûlures. Objectif : Rendre chaque participant capable d'intervenir efficacement dès les premières minutes d'une urgence, dans le bon ordre et sans se mettre en danger. AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer.",
    "keywords": [
      "beps",
      "premiers secours",
      "premier secours",
      "secourisme",
      "secouriste",
      "brevet europeen de premiers secours",
      "brevet de secourisme",
      "reanimation",
      "massage cardiaque",
      "cpr",
      "rcp",
      "dea",
      "defibrillateur",
      "defibrillation",
      "pls",
      "victime inconsciente",
      "etouffement",
      "desobstruction",
      "obstruction",
      "hemorragie",
      "plaie",
      "malaise",
      "avc",
      "brulure",
      "intoxication",
      "urgence",
      "112",
      "alerter",
      "gestes qui sauvent",
      "sauvetage",
      "first aid",
      "ehbo",
      "erste hilfe"
    ]
  }
];

export const SITE_PAGES: SiteEntry[] = [
  {
    "id": "page-home",
    "type": "page",
    "title": "Accueil",
    "url": "index.html",
    "content": "Page d'accueil de Wisy Safety, centre de formation à la sécurité.",
    "keywords": [
      "accueil",
      "home",
      "start",
      "startseite",
      "acasa",
      "presentation",
      "wisy"
    ]
  },
  {
    "id": "page-formations",
    "type": "page",
    "title": "Formations",
    "url": "formations.html",
    "content": "Catalogue complet des formations Wisy Safety : sécurité, secours, technique et management.",
    "keywords": [
      "formations",
      "catalogue",
      "courses",
      "cours",
      "liste",
      "offre",
      "opleidingen",
      "schulungen",
      "corsi"
    ]
  },
  {
    "id": "page-avis",
    "type": "page",
    "title": "Avis clients",
    "url": "avis.html",
    "content": "Avis et témoignages des participants aux formations Wisy Safety.",
    "keywords": [
      "avis",
      "reviews",
      "temoignages",
      "feedback",
      "opinions",
      "retours",
      "satisfaction",
      "bewertungen",
      "recensioni"
    ]
  },
  {
    "id": "page-contact",
    "type": "page",
    "title": "Contact",
    "url": "contact.html",
    "content": "Coordonnées de Wisy Safety : téléphone, e-mail, adresse à Anderlecht et formulaire de contact.",
    "keywords": [
      "contact",
      "adresse",
      "telephone",
      "email",
      "coordonnees",
      "joindre",
      "kontakt"
    ]
  },
  {
    "id": "page-inscription",
    "type": "page",
    "title": "Inscription",
    "url": "inscription.html",
    "content": "Formulaire d'inscription en ligne aux formations Wisy Safety.",
    "keywords": [
      "inscription",
      "inscrire",
      "register",
      "registration",
      "enroll",
      "signup",
      "s'inscrire",
      "reserver",
      "anmeldung",
      "iscrizione"
    ]
  },
  {
    "id": "page-faq",
    "type": "page",
    "title": "Centre d'aide",
    "url": "faq.html",
    "content": "Centre d'aide Wisy Safety : questions fréquentes sur les formations, l'inscription, les tarifs et les attestations.",
    "keywords": [
      "aide",
      "centre",
      "faq",
      "questions",
      "centre d'aide",
      "help",
      "helpcentrum",
      "hulp",
      "hilfe",
      "aiuto",
      "ajutor",
      "assistance",
      "support"
    ]
  },
  {
    "id": "page-agenda",
    "type": "page",
    "title": "Agenda des formations",
    "url": "agenda.html",
    "content": "Agenda des formations Wisy Safety : la page qui accueillera les prochaines sessions, leurs horaires et leurs disponibilités. L'agenda en ligne arrive prochainement : aucune date n'y est publiée pour le moment.",
    "keywords": [
      "agenda",
      "calendrier",
      "dates",
      "date",
      "sessions",
      "session",
      "prochaines",
      "prochaine",
      "horaires",
      "planning",
      "quand",
      "disponibilites",
      "calendar",
      "schedule",
      "upcoming",
      "termine",
      "kalender",
      "calendario",
      "urnik",
      "program",
      "datum"
    ]
  }
];

// Pages HTML publiques (pages principales + pages dédiées de formation) : base de l'allow-list d'URLs.
export const SITE_PATHS: string[] = [
  "index.html",
  "formations.html",
  "avis.html",
  "contact.html",
  "inscription.html",
  "faq.html",
  "agenda.html",
  "formation-nacelles-elevatrices.html",
  "formation-beps-premiers-secours.html"
];
