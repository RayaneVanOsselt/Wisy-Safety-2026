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
    "url": "formation-vca-ligne-hierarchique.html",
    "signupUrl": "inscription.html?formation=vca-hierarchique",
    "duration": null,
    "level": "Avancé",
    "audience": [
      "chefs d'équipe",
      "superviseurs",
      "responsables qui encadrent du personnel opérationnel",
      "entreprises certifiées VCA ou en préparation de certification"
    ],
    "content": "Pour les chefs d'équipe, superviseurs et responsables qui encadrent du personnel opérationnel : préparation à l'examen officiel « Sécurité pour les cadres opérationnels » (VOL-VCA). Objectif : Préparer l'examen VOL-VCA et donner à l'encadrement les connaissances de sécurité propres à sa mission. Examen officiel (source BeSaCC-VCA, vérifié le 2026-10-01) : 70 questions, 75 minutes, seuil de réussite 64,5 %. Un diplôme de sécurité de base est considéré comme valable s'il date de moins de 10 ans à compter de la date de l'examen. Le diplôme VOL-VCA est délivré par un centre d'examen reconnu par BeSaCC-VCA, après réussite de l'examen — pas par Wisy Safety. NON CONFIRMÉ (ne jamais l'affirmer) : agréé ; agrément ; centre d'examen reconnu ; examen inclus ; certification reconnue au niveau international ; taux de réussite (95 %) ; tarifs 280 € / 370 € / 195–345 € ; durée (10 h, 14 h, 1 ou 2 jours) ; repas inclus ; référence WSY-VOL/2025-BE ; « des milliers de professionnels ».",
    "keywords": [
      "vca ligne hierarchique",
      "vca hierarchique",
      "ligne hierarchique",
      "vol-vca",
      "vol",
      "chef",
      "chefs",
      "superviseur",
      "encadrant",
      "encadrement",
      "responsable",
      "cadre operationnel",
      "cadres operationnels",
      "leidinggevende",
      "operationeel leidinggevenden",
      "supervisor"
    ]
  },
  {
    "id": "diisocyanates",
    "type": "formation",
    "title": "Diisocyanates & substances dangereuses",
    "category": "securite",
    "url": "formation-diisocyanates.html",
    "signupUrl": "inscription.html?formation=diisocyanates",
    "duration": null,
    "level": "Spécialisée",
    "audience": [
      "peintres",
      "façadiers",
      "étancheurs",
      "menuisiers",
      "opérateurs industriels",
      "toute personne qui utilise ou supervise l'utilisation de produits contenant des diisocyanates"
    ],
    "content": "Depuis le 24 août 2023, un produit contenant 0,1 % ou plus de diisocyanates ne peut être utilisé à titre industriel ou professionnel que par une personne qui a suivi avec succès une formation à leur utilisation sûre (règlement (UE) 2020/1149). Objectif : Former à l'utilisation sûre des diisocyanates, comme l'exige le règlement (UE) 2020/1149 avant tout usage industriel ou professionnel. AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer. NON CONFIRMÉ (ne jamais l'affirmer) : tarif 200 € (ancienne page) ou 95 € (bordereau) ; durée 2–4 h ; format présentiel ou intra-entreprise ; niveau de formation couvert ; « +2 500 professionnels » ; « 98 % de satisfaction » ; « 4,9/5 » ; amende de 250 € par jour et par salarié ; « protection santé garantie ».",
    "keywords": [
      "diisocyanates",
      "diisocyanate",
      "isocyanate",
      "isocyanates",
      "mdi",
      "tdi",
      "hdi",
      "ipdi",
      "polyurethane",
      "polyurethanes",
      "pu",
      "mousse pu",
      "reach",
      "2020/1149",
      "annexe xvii",
      "substances dangereuses",
      "produits dangereux",
      "produit dangereux",
      "produits chimiques",
      "chimique",
      "agents chimiques",
      "asthme professionnel",
      "peintre",
      "facadier",
      "etancheur",
      "gevaarlijke stoffen",
      "diisocyanaten",
      "dangerous substances"
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
    "url": "formation-fibre-optique.html",
    "signupUrl": "inscription.html?formation=fibre-optique",
    "duration": null,
    "level": "Technique",
    "audience": [
      "artisans",
      "électriciens",
      "techniciens",
      "installateurs",
      "ingénieurs",
      "chefs de projet"
    ],
    "subtypes": [
      "Base de la fibre optique",
      "Connecteurs et raccordements",
      "Épissure par fusion",
      "Mesures et diagnostic (OTDR)",
      "Installation sur chantier",
      "Conception et planification"
    ],
    "content": "Du raccordement à la mesure OTDR : un parcours en trois niveaux et six modules pour les artisans, techniciens et ingénieurs qui interviennent sur les réseaux fibre (FTTH, FTTx). Objectif : Installer, raccorder, souder, mesurer et concevoir des réseaux fibre optique, selon le niveau choisi. AUCUNE certification, CACES, agrément ou reconnaissance officielle n'est confirmé : ne jamais l'affirmer. NON CONFIRMÉ (ne jamais l'affirmer) : « 500+ professionnels formés » ; « 15+ ans d'expertise » ; « formés depuis 2010 » ; « 100 % certifications reconnues » ; durées des modules (170 h au total) et du format intensif (35–40 h) ; maximum 8 participants ; 80 % de pratique ; plateforme e-learning et forum ; « techniciens certifiés avec plus de 10 ans d'expérience » ; rencontres avec des employeurs ; tarif (650 € au bordereau).",
    "keywords": [
      "fibre optique",
      "fibre",
      "fiber",
      "fibre optic",
      "ftth",
      "fttx",
      "fttb",
      "otdr",
      "reflectometre",
      "soudure",
      "epissure",
      "epissure par fusion",
      "fusion",
      "raccordement",
      "connecteur",
      "connecteurs",
      "telecom",
      "telecommunications",
      "monomode",
      "multimode",
      "glasvezel",
      "glasfaser"
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
    "id": "page-article-vlh-communication",
    "type": "article",
    "title": "Communication hiérarchique : faire passer les messages sécurité",
    "url": "formation-vca-ligne-hierarchique.html#article-communication-hierarchique",
    "content": "Conseils de l'équipe pédagogique pour les encadrants : message clair, cohérent et répété, outils (briefings, causeries, retours d'expérience), rôle du responsable.",
    "keywords": [
      "communication",
      "briefing",
      "causerie",
      "message securite",
      "encadrant",
      "manager",
      "ligne hierarchique",
      "vca"
    ]
  },
  {
    "id": "page-article-vlh-erreurs",
    "type": "article",
    "title": "Les erreurs fréquentes de la hiérarchie en matière de sécurité",
    "url": "formation-vca-ligne-hierarchique.html#article-erreurs-hierarchie",
    "content": "Conseils de l'équipe pédagogique : manque d'exemplarité, communication inefficace, facteur humain sous-estimé, écoute du terrain, pilotage, production avant sécurité.",
    "keywords": [
      "erreurs",
      "exemplarite",
      "encadrement",
      "hierarchie",
      "chef d'equipe",
      "prevention",
      "vca"
    ]
  },
  {
    "id": "page-article-vlh-culture",
    "type": "article",
    "title": "Ligne hiérarchique et culture sécurité : le rôle de l'encadrement",
    "url": "formation-vca-ligne-hierarchique.html#article-culture-securite",
    "content": "Conseils de l'équipe pédagogique : rôle de la ligne hiérarchique, piliers d'une culture sécurité, leviers de l'encadrement.",
    "keywords": [
      "culture securite",
      "leadership",
      "encadrement",
      "ligne hierarchique",
      "vca"
    ]
  },
  {
    "id": "page-article-dii-definition",
    "type": "article",
    "title": "Les diisocyanates : définition, familles et dangers",
    "url": "formation-diisocyanates.html#article-diisocyanates-definition",
    "content": "Article sourcé : définition (règlement REACH, annexe XVII, entrée 74), MDI, TDI, HDI, IPDI, NDI, sensibilisants respiratoires et cutanés de catégorie 1, asthme professionnel.",
    "keywords": [
      "diisocyanates",
      "isocyanate",
      "mdi",
      "tdi",
      "hdi",
      "ipdi",
      "ndi",
      "polyurethane",
      "asthme professionnel",
      "sensibilisant",
      "definition"
    ]
  },
  {
    "id": "page-article-dii-reglementation",
    "type": "article",
    "title": "Le règlement (UE) 2020/1149, point par point",
    "url": "formation-diisocyanates.html#article-diisocyanates-reglementation",
    "content": "Article sourcé : calendrier (24 février 2022, 24 août 2023), personnes visées, obligations de l'employeur, trois niveaux de formation, renouvellement au moins tous les cinq ans, valeurs limites belges.",
    "keywords": [
      "reglement 2020/1149",
      "reach",
      "obligation",
      "formation obligatoire",
      "24 aout 2023",
      "employeur",
      "amende",
      "diisocyanates",
      "reglementation"
    ]
  },
  {
    "id": "page-article-dii-substances",
    "type": "article",
    "title": "Autres substances dangereuses : les repères officiels",
    "url": "formation-diisocyanates.html#article-substances-dangereuses",
    "content": "Article sourcé : amiante (directive 1999/77/CE), silice cristalline alvéolaire et chrome VI (directive (UE) 2017/2398), formaldéhyde (directive (UE) 2019/983), comparés aux diisocyanates.",
    "keywords": [
      "amiante",
      "silice",
      "silice cristalline",
      "chrome vi",
      "chrome 6",
      "formaldehyde",
      "cancerigene",
      "substances dangereuses",
      "produits dangereux"
    ]
  },
  {
    "id": "page-article-fibre-parcours",
    "type": "article",
    "title": "Les parcours professionnels dans la fibre optique : du technicien à l'ingénieur réseau",
    "url": "article-fibre-parcours-professionnels.html",
    "content": "Article : niveaux de postes (technicien, chef d'équipe, ingénieur réseau), compétences, exemples de certifications (CFOT de la FOA, CCNA de Cisco).",
    "keywords": [
      "metier fibre",
      "technicien fibre",
      "ingenieur reseau",
      "carriere",
      "parcours",
      "cfot",
      "ccna",
      "certification fibre",
      "fibre optique"
    ]
  },
  {
    "id": "page-article-fibre-expert",
    "type": "article",
    "title": "Devenir expert en fibre optique : compétences techniques et outils",
    "url": "article-fibre-devenir-expert.html",
    "content": "Article sourcé : fibre monomode et multimode, recommandations UIT-T G.652 et G.657, OM3 et OM4, pertes typiques (connecteur, épissure), microscope, photomètre, VFL, OTDR.",
    "keywords": [
      "otdr",
      "epissure",
      "soudure",
      "monomode",
      "multimode",
      "g.652",
      "g.657",
      "om3",
      "om4",
      "budget optique",
      "vfl",
      "expert fibre",
      "fibre optique"
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
  },
  {
    "id": "page-coordination",
    "type": "page",
    "title": "WiSy Coordination",
    "url": "coordination.html",
    "content": "Coordination sécurité-santé de chantier (niveaux A et B) : plan de sécurité et de santé (PSS), coordination des intervenants, visites de chantier, dossier d'intervention ultérieure (DIU), conseil en prévention et accompagnement réglementaire pour maîtres d'ouvrage, architectes et entreprises. Cadre légal belge : loi du 4 août 1996 relative au bien-être des travailleurs et arrêté royal du 25 janvier 2001 concernant les chantiers temporaires ou mobiles.",
    "keywords": [
      "coordination",
      "coordination securite sante",
      "coordination securite",
      "coordinateur",
      "coordinateur securite sante",
      "coordinateur securite",
      "coordinateur chantier",
      "coordinateur niveau a",
      "coordinateur niveau b",
      "niveau a",
      "niveau b",
      "pss",
      "plan de securite et de sante",
      "diu",
      "dossier d'intervention ulterieure",
      "conseiller en prevention",
      "audit securite",
      "chantier temporaire",
      "chantier mobile",
      "chantier temporaire ou mobile",
      "maitre d'ouvrage",
      "bien etre au travail",
      "wisy coordination",
      "demander une coordination",
      "securite chantier"
    ]
  },
  {
    "id": "page-mentions-legales",
    "type": "page",
    "title": "Mentions légales",
    "url": "mentions-legales.html",
    "content": "Mentions légales de Wisy Safety ASBL : éditeur et responsable de publication, coordonnées, numéro d'entreprise et numéro de TVA, propriété intellectuelle, protection des données (RGPD), cookies et droit applicable.",
    "keywords": [
      "mentions legales",
      "mentions legales wisy safety",
      "informations legales",
      "editeur du site",
      "responsable de publication",
      "numero d'entreprise",
      "numero bce",
      "numero de tva",
      "propriete intellectuelle",
      "droit applicable",
      "wisy safety asbl"
    ]
  },
  {
    "id": "page-politique-confidentialite",
    "type": "page",
    "title": "Politique de confidentialité",
    "url": "politique-de-confidentialite.html",
    "content": "Politique de confidentialité de Wisy Safety ASBL, rédigée à partir du fonctionnement réel du site : données traitées par les formulaires (contact, demande de coordination, test d'éligibilité PEB, avis clients), bases juridiques, prestataires techniques (EmailJS, Supabase, jsDelivr, Google Maps uniquement après consentement), transferts hors UE, durées de conservation, cookies et stockage du navigateur (inventaire complet, visible et effaçable sur votre appareil), droits RGPD (accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement) avec un modèle de demande prêt à envoyer, et réclamation auprès de l'Autorité de protection des données. Les questions posées à l'Assistant Wisy et les recherches sont traitées dans le navigateur et ne sont pas transmises.",
    "keywords": [
      "politique de confidentialite",
      "confidentialite",
      "privee",
      "donnees personnelles",
      "rgpd",
      "gdpr",
      "cookies",
      "cookie",
      "traceurs",
      "droits rgpd",
      "supprimer mes donnees",
      "effacer mes donnees",
      "rectification",
      "portabilite",
      "consentement",
      "dpo",
      "apd",
      "sous-traitants",
      "privacy",
      "privacybeleid",
      "datenschutz"
    ]
  },
  {
    "id": "page-conditions-utilisation",
    "type": "page",
    "title": "Conditions générales d'utilisation",
    "url": "conditions-generales-utilisation.html",
    "content": "Conditions générales d'utilisation (CGU) du site Wisy Safety : accès gratuit sans compte, informations publiées à titre général, outils interactifs (recherche, Assistant Wisy, test d'éligibilité PEB, guide du niveau VCA, parcours d'inscription) et leurs limites, règles de publication et de modération des avis clients, propriété intellectuelle, usages interdits, liens externes, responsabilité, droit belge. Les conditions d'achat d'une formation relèvent de conditions générales de vente distinctes, en préparation ; le paiement en ligne n'est pas encore disponible.",
    "keywords": [
      "conditions generales d'utilisation",
      "conditions d'utilisation",
      "cgu",
      "moderation",
      "usages interdits",
      "terms of use",
      "gebruiksvoorwaarden",
      "nutzungsbedingungen"
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
  "formation-vca-ligne-hierarchique.html",
  "formation-diisocyanates.html",
  "article-fibre-parcours-professionnels.html",
  "article-fibre-devenir-expert.html",
  "peb-wallonie-bruxelles.html",
  "coordination.html",
  "mentions-legales.html",
  "politique-de-confidentialite.html",
  "conditions-generales-utilisation.html",
  "formation-vca-base.html",
  "formation-nacelles-elevatrices.html",
  "formation-fibre-optique.html",
  "formation-beps-premiers-secours.html",
  "vca-entreprise.html"
];
