// =========================================================================
// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
// Sources uniques : js/site-content.js (pages, formations) · js/faq-data.js (coordonnées) ·
// js/trainings-data.js (faits de la formation à page dédiée)  →  `node scripts/sync-edge.js`
// (tests/edge-sync.test.js échoue si ce fichier n'est plus à jour).
// =========================================================================

export interface SiteEntry {
  id: string;
  type: "formation" | "page" | "article";
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
    "url": "formation-vca-base.html",
    "signupUrl": "inscription.html?formation=vca-base",
    "duration": "1 jour",
    "level": "Base",
    "priceLabel": "225 €",
    "format": "Présentiel",
    "audience": [
      "ouvriers et personnel opérationnel",
      "techniciens de maintenance",
      "intérimaires",
      "collaborateurs de chantier",
      "sous-traitants",
      "toute personne travaillant dans un environnement présentant des risques"
    ],
    "content": "Maîtrisez les règles fondamentales de sécurité au travail et préparez votre examen VCA Base, en présentiel à Anderlecht (Bruxelles), examen inclus. Objectif : Acquérir les règles fondamentales de sécurité au travail et se préparer à l'examen VCA Base, dans un cadre professionnel. Le tarif est indiqué par personne. Le statut TVA (HT ou TTC) du tarif n'est PAS précisé : ne jamais écrire « HT », « TTC » ni « hors TVA ». L'examen est inclus dans le tarif. Examen officiel (source BeSaCC-VCA, vérifié le 2026-09-26) : 40 questions, 60 minutes, seuil de réussite 64,5 %. Un diplôme de sécurité de base est considéré comme valable s'il date de moins de 10 ans à compter de la date de l'examen. Certification VCA après réussite de l'examen. La formation se déroule au centre Wisy Safety d'Anderlecht. NON CONFIRMÉ (ne jamais l'affirmer) : agréé ; agrément ; accrédité ; reconnu internationalement ; centre d'examen reconnu ; langues FR/NL/EN ; 8 heures ; horaires de la journée ; 12 participants maximum ; taux de réussite ; financement / aides applicables à cette formation.",
    "keywords": [
      "vca",
      "vca base",
      "vca de base",
      "b-vca",
      "bvca",
      "vca basis",
      "basisveiligheid",
      "veiligheid",
      "vca bruxelles",
      "vca anderlecht",
      "vca belgique",
      "certificat vca",
      "diplome vca",
      "certification vca",
      "examen vca",
      "chantier",
      "sous-traitant",
      "interimaire",
      "scc",
      "safety",
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
    "content": "Apprendre, en 15 heures, à protéger, alerter le 112 et secourir une victime en attendant les professionnels : réanimation, défibrillation, position latérale de sécurité, hémorragies, étouffement, malaises et brûlures. Objectif : Rendre chaque participant capable d'intervenir efficacement dès les premières minutes d'une urgence, dans le bon ordre et sans se mettre en danger. Le statut TVA (HT ou TTC) du tarif n'est PAS précisé : ne jamais écrire « HT », « TTC » ni « hors TVA ». AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer.",
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
    "content": "Agenda des formations Wisy Safety : la liste des sessions publiées, avec leurs horaires et leurs disponibilités. Une session y apparaît dès qu'elle est confirmée ; sans session publiée, la page renvoie vers l'équipe pour connaître les prochaines disponibilités.",
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
  },
  {
    "id": "page-article-vca-cout",
    "type": "article",
    "title": "Combien coûte une formation VCA et qui peut la financer ?",
    "url": "article-vca-cout-financement.html",
    "content": "Article : ce qu'il faut vérifier avant de comparer le prix d'une formation VCA, et où se renseigner sur les aides possibles en Belgique (employeur, Constructiv, Actiris, Bruxelles Formation). Tarif Wisy Safety : 225 € par personne, examen inclus.",
    "keywords": [
      "cout",
      "prix",
      "tarif",
      "combien",
      "financement",
      "financer",
      "aide",
      "aides",
      "subvention",
      "prise en charge",
      "employeur",
      "constructiv",
      "actiris",
      "bruxelles formation",
      "demandeur d'emploi",
      "vca",
      "article",
      "conseil",
      "kosten",
      "financiering",
      "cost",
      "funding"
    ]
  },
  {
    "id": "page-article-vca-examen",
    "type": "article",
    "title": "Les erreurs fréquentes à l'examen VCA et comment les éviter",
    "url": "article-vca-erreurs-examen.html",
    "content": "Article : le format officiel de l'examen VCA Base (40 questions, 60 minutes, 64,5 % pour réussir) et les pièges à éviter pour le préparer sereinement.",
    "keywords": [
      "examen",
      "erreurs",
      "erreur",
      "reussir",
      "echec",
      "piege",
      "pieges",
      "preparer",
      "preparation",
      "conseils",
      "stress",
      "temps",
      "questions",
      "64,5",
      "vca",
      "article",
      "exam",
      "fouten",
      "examen vca"
    ]
  },
  {
    "id": "page-peb",
    "type": "page",
    "title": "Devenez certificateur PEB",
    "url": "peb-wallonie-bruxelles.html",
    "content": "Devenir certificateur PEB (performance énergétique des bâtiments) en Wallonie ou à Bruxelles : conditions d'accès, formation réglementaire, examen, demande d'agrément et sessions. Les deux Régions ont des procédures et des autorités distinctes : un agrément wallon ou bruxellois ne permet d'exercer que dans sa propre Région. Tarif de la formation Wisy Safety communiqué sur demande.",
    "keywords": [
      "peb",
      "certificateur peb",
      "certificateur peb bruxelles",
      "certificateur peb wallonie",
      "formation peb",
      "formation peb bruxelles",
      "formation peb wallonie",
      "formation certificateur peb",
      "performance energetique des batiments",
      "performance energetique batiment",
      "agrement peb",
      "agrement certificateur peb",
      "examen peb",
      "examen certificateur peb",
      "prix peb",
      "prix formation peb",
      "tarif peb",
      "devenir certificateur",
      "devenir certificateur peb",
      "spw energie",
      "bruxelles environnement",
      "epb",
      "certificateur epb",
      "energieprestatie",
      "energy performance certificate"
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
  "article-vca-cout-financement.html",
  "article-vca-erreurs-examen.html",
  "peb-wallonie-bruxelles.html",
  "formation-vca-base.html",
  "formation-nacelles-elevatrices.html",
  "formation-beps-premiers-secours.html"
];
