/* =========================================================================
   WISY SAFETY — Registre des formations dotées d'une page dédiée (+ le service VCA Entreprise)
   -------------------------------------------------------------------------
   SOURCE UNIQUE DES FAITS des formations à page dédiée (VCA Base, VCA Ligne
   hiérarchique, Diisocyanates, Nacelles Élévatrices, Fibre optique, BEPS) : route, prix, durée, langues, format, public, mots-clés,
   visuels. Le SERVICE « VCA Entreprise » (accompagnement à la certification d'une
   entreprise — ni formation, ni VCA Base) y est décrit à part (`vcaEntreprise`) :
   il n'entre PAS dans `all()` / `get()` (pas de durée, pas d'examen).

   Consommé par : recherche globale (js/search.js), assistant
   (js/assistant/knowledge.js), parcours d'inscription
   (js/registration-data.js) et les tests. La page elle-même affiche ces
   faits en HTML statique (SEO / sans JS) ; tests/trainings.test.js vérifie
   qu'ils ne divergent pas.

   Module « dual-mode » (navigateur : window.WisyTrainings ; Node : require)
   — aucune dépendance, aucun build.

   VÉRACITÉ — n'y figurent QUE des informations confirmées par Wisy Safety :
   durée, prix, langues, format, public. Aucune certification, aucun CACES,
   aucun agrément : voir `unconfirmed` (liste des affirmations interdites tant
   qu'elles ne sont pas confirmées). Pour en ajouter une : la confirmer
   d'abord, puis la retirer de `unconfirmed`.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyTrainings = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERIFIED_AT = "2026-09-26";
  var IMG = "assets/images/nacelles/";

  var NACELLES = {
    /* Identifiants — `id` reste celui du catalogue (ancre formations.html#nacelle,
       ?formation=nacelle, assistant, recherche) ; `registrationId` celui du
       parcours d'inscription. */
    id: "nacelle",
    registrationId: "nacelle-elevatrice",
    slug: "nacelles-elevatrices",
    category: "technique",

    /* Routes (convention du site : pages HTML à plat, à la racine) */
    url: "formation-nacelles-elevatrices.html",
    signupUrl: "inscription.html?formation=nacelle",
    catalogueUrl: "formations.html#nacelle",

    /* Libellés français de référence (l'assistant répond en français ; les
       traductions de l'interface passent par les clés i18n `dd.nacelle_*`). */
    title: "Nacelles élévatrices",
    fullTitle: "Formation Nacelles Élévatrices",
    summary: "Développez les compétences nécessaires pour utiliser les nacelles élévatrices de manière sûre, efficace et responsable dans un environnement professionnel.",
    objective: "Permettre aux participants d'utiliser les nacelles élévatrices de manière sûre et d'identifier les risques associés.",
    titleKey: "dd.nacelle",
    fullTitleKey: "dd.nacelle_full",
    summaryKey: "dd.nacelle_summary",

    /* Faits confirmés */
    durationDays: 1,
    /* 350 € HT — en centimes, hors TVA (comme registration-data.js) */
    price: { amountCents: 35000, currency: "EUR", vatIncluded: false },
    languages: ["fr", "nl", "en"],
    languageLabels: ["Français", "Néerlandais", "Anglais"],
    format: "theory-practice",
    formatLabel: "Théorie + pratique",
    audience: [
      "opérateurs",
      "techniciens de maintenance",
      "personnel d'entretien",
      "toute personne amenée à utiliser une nacelle dans le cadre de son activité professionnelle"
    ],

    /* Types de nacelles présentés sur la page (ordre d'affichage) */
    types: [
      { id: "ciseaux",      name: "Nacelle ciseaux" },
      { id: "araignee",     name: "Nacelle araignée" },
      { id: "telescopique", name: "Nacelle télescopique" },
      { id: "articulee",    name: "Nacelle articulée" },
      { id: "camion",       name: "Nacelle sur camion" },
      { id: "verticale",    name: "Nacelle verticale" },
      { id: "automotrice",  name: "Nacelle automotrice" }
    ],

    /* Recherche : titre, synonymes, termes métier (sans accents, minuscules) */
    keywords: [
      "nacelle", "nacelles", "nacelle elevatrice", "nacelles elevatrices",
      "formation nacelle", "formation nacelles", "pemp", "mewp",
      "travail en hauteur", "plateforme elevatrice", "securite nacelle",
      "elevatrice", "ciseaux", "araignee", "telescopique", "articulee",
      "camion", "verticale", "automotrice", "lift", "aerial", "hoogwerker"
    ],

    /* Visuels : dérivés WebP des photos d'origine de assets/originaux/nacelles/ */
    images: {
      hero:  IMG + "nacelles-hero-1200.webp",
      card:  IMG + "nacelles-hero-800.webp",
      thumb: IMG + "nacelles-thumb-192.webp",
      og:    "assets/images/partage/formation-nacelles-1200x630.jpg"
    },
    imageAlt: "Nacelle ciseaux bleue déployée en position haute sur un chantier",

    /* Affirmations INTERDITES tant qu'elles ne sont pas confirmées par Wisy Safety */
    unconfirmed: ["CACES", "CACES R486", "certification", "certifiant", "agrément", "agréé", "reconnu", "obligatoire"]
  };

  var IMG_BEPS = "assets/images/beps/";

  /* BEPS — Brevet Européen de Premiers Secours. Faits repris de la fiche déjà publiée par
     Wisy Safety (durée, tarif, certificat, programme) : voir docs/README-BEPS.md. */
  var BEPS = {
    id: "beps",
    registrationId: "beps",
    slug: "beps-premiers-secours",
    category: "secours",

    url: "formation-beps-premiers-secours.html",
    signupUrl: "inscription.html?formation=beps",
    catalogueUrl: "formations.html#beps",

    title: "BEPS — Premier secours",
    fullTitle: "Brevet Européen de Premiers Secours",
    summary: "Apprendre, en 15 heures, à protéger, alerter le 112 et secourir une victime en attendant les professionnels : réanimation, défibrillation, position latérale de sécurité, hémorragies, étouffement, malaises et brûlures.",
    objective: "Rendre chaque participant capable d'intervenir efficacement dès les premières minutes d'une urgence, dans le bon ordre et sans se mettre en danger.",
    titleKey: "dd.beps",
    fullTitleKey: "dd.beps_full",
    summaryKey: "dd.beps_summary",

    /* Faits confirmés (fiche BEPS publiée par Wisy Safety) */
    durationHours: 15,
    /* 70 € — le statut TVA n'est pas précisé sur la fiche source : on n'invente ni HT ni TTC. */
    price: { amountCents: 7000, currency: "EUR", vatIncluded: null },
    languages: ["fr", "nl", "en"],
    languageLabels: ["Français", "Néerlandais", "Anglais"],
    format: "practice-focused",
    formatLabel: "Essentiellement pratique",
    level: "Moyen",
    audience: ["toute personne souhaitant apprendre les gestes qui sauvent"],

    /* Les 6 gestes enseignés (ordre d'affichage de la section « Ce que vous saurez faire ») */
    types: [
      { id: "reanimation",  name: "Réanimation & défibrillation" },
      { id: "pls",          name: "Position latérale de sécurité" },
      { id: "etouffement",  name: "Étouffement & désobstruction" },
      { id: "hemorragies",  name: "Hémorragies & plaies" },
      { id: "malaises",     name: "Malaises & brûlures" },
      { id: "alerte",       name: "Alerter le 112" }
    ],

    /* Recherche : titre, synonymes, termes métier (sans accents, minuscules) */
    keywords: [
      "beps", "premiers secours", "premier secours", "secourisme", "secouriste",
      "brevet europeen de premiers secours", "brevet de secourisme",
      "reanimation", "massage cardiaque", "cpr", "rcp",
      "dea", "defibrillateur", "defibrillation",
      "pls", "position laterale de securite", "victime inconsciente",
      "etouffement", "desobstruction", "obstruction",
      "hemorragie", "plaie", "malaise", "avc", "brulure", "intoxication",
      "urgence", "112", "alerter", "gestes qui sauvent", "sauvetage",
      "first aid", "ehbo", "erste hilfe"
    ],

    /* Visuels : photo de formation réelle (même master que assets/images/formations/beps.webp)
       pour le hero + la miniature de recherche ; illustrations d'accent pour « Pourquoi Wisy Safety ». */
    images: {
      hero:  IMG_BEPS + "beps-hero-1024.webp",
      card:  "assets/images/formations/beps.webp",
      thumb: IMG_BEPS + "beps-thumb-192.webp",
      og:    "assets/images/partage/wisy-safety-1200x630.jpg",
      accents: [
        IMG_BEPS + "geste-secouriste-illustration-240.webp",
        IMG_BEPS + "trousse-secours-illustration-240.webp",
        IMG_BEPS + "mascotte-premiers-secours-240.webp",
        IMG_BEPS + "journee-mondiale-premiers-secours-240.webp"
      ]
    },
    imageAlt: "Formateur Wisy Safety encadrant un massage cardiaque sur mannequin d'entraînement",

    /* Affirmations INTERDITES tant qu'elles ne sont pas confirmées par Wisy Safety */
    unconfirmed: ["CACES", "certification officielle", "agrément", "agréé", "accrédité", "accréditation", "obligatoire", "diplôme d'état"]
  };

  /* ---------------------------------------------------------------------
     VCA Base — page dédiée formation-vca-base.html (refonte du 2026-09-26).

     Trois sortes de faits, jamais mélangées :
       1. CONFIRMÉS par Wisy Safety : brief du propriétaire (225 € / personne, présentiel, examen inclus,
          centre d'Anderlecht, « certification VCA après réussite de l'examen ») + durée « 1 jour » déjà
          publiée par le site (FAQ, catalogue). Adresse / téléphone / horaires : js/faq-data.js (CONTACT).
       2. OFFICIELS (`official`) : organisation VCA belge (Contractor Safety Management / BeSaCC-VCA) et
          SPF Emploi, chacun avec sa source et sa date de vérification. Ce ne sont PAS des engagements de
          Wisy Safety : la page les présente comme « règles officielles ».
       3. NON CONFIRMÉS (`unconfirmedClaims`) : ne jamais afficher comme un fait tant que Wisy Safety ne
          les a pas confirmés (agrément, langues, horaires, effectifs, chiffres de réussite…).
     Programme = structure OFFICIELLE de l'examen B-VCA (matrice d'évaluation, version 2.0 du 01/09/2017).
     --------------------------------------------------------------------- */
  var IMG_VCA = "assets/images/vca-base/";

  var VCA_BASE = {
    id: "vca-base",
    registrationId: "vca-base",
    slug: "vca-base",
    category: "securite",

    url: "formation-vca-base.html",
    signupUrl: "inscription.html?formation=vca-base",
    catalogueUrl: "formations.html#vca-base",

    title: "VCA Base",
    fullTitle: "Formation VCA Base",
    summary: "Maîtrisez les règles fondamentales de sécurité au travail et préparez votre examen VCA Base, en présentiel à Anderlecht (Bruxelles), examen inclus.",
    objective: "Acquérir les règles fondamentales de sécurité au travail et se préparer à l'examen VCA Base, dans un cadre professionnel.",
    titleKey: "dd.vca_base",
    fullTitleKey: "dd.vca_base_full",
    summaryKey: "dd.vca_base_summary",

    /* Faits confirmés */
    durationDays: 1,
    /* 225 € / personne — le statut TVA n'est pas précisé dans le brief : on n'invente ni HT ni TTC. */
    price: { amountCents: 22500, currency: "EUR", vatIncluded: null },
    priceUnit: "participant",
    format: "in-person",
    formatLabel: "Présentiel",
    /* Lieu : « centre » = le centre de formation Wisy Safety (adresse = FAQ.CONTACT) — confirmé par Wisy Safety. */
    venue: "centre",
    level: "Base",
    exam: { included: true },
    /* Langues : NON confirmées (l'ancienne page citait FR / EN / NL, sans que cela soit vérifié) — la page
       affiche « précisée pour chaque session » ; renseigner ici quand Wisy Safety les confirme. */
    languages: null,
    languageLabels: null,
    audience: [
      "ouvriers et personnel opérationnel",
      "techniciens de maintenance",
      "intérimaires",
      "collaborateurs de chantier",
      "sous-traitants",
      "toute personne travaillant dans un environnement présentant des risques"
    ],
    certification: "Certification VCA après réussite de l'examen",

    /* Programme : 4 chapitres / 12 sujets de l'examen B-VCA (matrice officielle) — nombre de questions
       par sujet, total 40. Les libellés affichés sont traduits (clés vca.prog_*). */
    programme: [
      { id: "A", subjects: [{ id: "A.01", questions: 3 }, { id: "A.02", questions: 1 }, { id: "A.03", questions: 2 }] },
      { id: "B", subjects: [{ id: "B.01", questions: 4 }, { id: "B.02", questions: 4 }, { id: "B.03", questions: 6 }, { id: "B.04", questions: 7 }] },
      { id: "C", subjects: [{ id: "C.01", questions: 5 }, { id: "C.02", questions: 3 }, { id: "C.03", questions: 3 }] },
      { id: "D", subjects: [{ id: "D.01", questions: 1 }, { id: "D.02", questions: 1 }] }
    ],

    /* Faits OFFICIELS, avec source. Vérifiés le 2026-09-26 (lecture directe des documents, pas de résumé). */
    official: {
      verifiedAt: "2026-09-26",
      /* Examen B-VCA : matrice d'évaluation officielle v2.0 (01/09/2017) + règlement général des examens
         VCA v2018-03 (art. 31.2, 32.1, 35.5). */
      exam: { questions: 40, minutes: 60, passPercent: 64.5 },
      /* Diplôme « sécurité de base » : moins de 10 ans, à compter de la date de l'examen (BeSaCC-VCA,
         checklist VCA, question 3.2). */
      diplomaValidityYears: 10,
      /* Formation de base en sécurité sur les chantiers temporaires ou mobiles : au moins 8 heures
         (SPF Emploi ; AR du 7 avril 2023). Une formation VCA n'y est acceptée que si l'examen est réussi
         (FAQ SPF Emploi, version du 2 juin 2026). */
      worksiteTrainingMinHours: 8,
      sources: {
        besacc: { fr: "https://www.besacc-vca.be/fr/basisveiligheid-b-vca/", nl: "https://www.besacc-vca.be/basisveiligheid-b-vca/", en: "https://www.besacc-vca.be/en/basisveiligheid-b-vca/" },
        registre: "https://csm-examen.be/cdr",
        reglement: "https://www.besacc-vca.be/wp-content/uploads/2023/09/Reglement-General-Examens-VCA-2018-03.pdf",
        spf: "https://emploi.belgique.be/fr/themes/bien-etre-au-travail/lieux-de-travail/chantiers-temporaires-ou-mobiles/formation-de-base-en",
        constructiv: "https://constructiv.be/fr/regles-et-legislation/faq-formation-securite-de-base/"
      }
    },

    /* Recherche : titre, synonymes, termes métier (sans accents, minuscules) */
    keywords: [
      "vca", "vca base", "vca de base", "b-vca", "bvca", "vca basis", "basisveiligheid", "veiligheid",
      "securite de base", "formation vca", "formation vca base", "formation vca bruxelles", "vca bruxelles",
      "vca anderlecht", "vca belgique", "certificat vca", "diplome vca", "certification vca", "examen vca",
      "chantier", "sous-traitant", "interimaire", "scc", "safety", "sicherheit"
    ],

    /* Mots-clés de la RECHERCHE du site uniquement (mots génériques de prix / d'examen : ils ne doivent pas
       désigner la VCA Base pour l'assistant — voir GENERIC_KEYWORD dans site-content.js). */
    searchExtra: [
      "prix", "prix vca", "tarif", "tarif vca", "cout", "combien coute", "225", "examen", "examen inclus", "diplome", "certificat", "adresse",
      "price", "cost", "fee", "exam", "exam included", "certificate", "diploma",
      "prijs", "kosten", "tarief", "preis", "prufung", "zertifikat", "prezzo", "costo", "esame", "pret", "cena", "izpit", "prys", "eksamen",
      "цена", "изпит", "сертификат", "سعر", "ثمن", "تكلفة", "امتحان", "اختبار", "شهادة"
    ],

    /* Visuels. hero = photo VCA Base existante du site (720 × 540) : pour la remplacer, déposer une
       nouvelle photo dans assets/originaux/vca-base/ puis relancer scripts/optimize-images.py (voir
       docs/README-VCA.md). */
    images: {
      hero:  "assets/images/formations/vca-base.webp",
      card:  "assets/images/formations/vca-base.webp",
      thumb: IMG_VCA + "vca-base-thumb-192.webp",
      og:    "assets/images/partage/formation-vca-base-1200x630.jpg"
    },
    imageAlt: "Trois professionnels en tenue de sécurité haute visibilité sur un site industriel",

    /* Affirmations à ne PAS faire tant que Wisy Safety ne les a pas confirmées (≠ `unconfirmed`, réservé
       aux formations dont même la « certification » n'est pas confirmée : voir assistant/responder.js). */
    unconfirmedClaims: ["agréé", "agrément", "accrédité", "reconnu internationalement", "centre d'examen reconnu",
      "langues FR/NL/EN", "8 heures", "horaires de la journée", "12 participants maximum", "taux de réussite",
      "financement / aides applicables à cette formation"]
  };

  /* ---------------------------------------------------------------------
     VCA Entreprise — SERVICE d'accompagnement à la certification VCA (LSC) d'une ENTREPRISE
     (page vca-entreprise.html, refonte du 2026-09-26).

     ⚠ Ce n'est NI la formation individuelle « VCA Base » (diplôme d'une personne, examen), NI l'organisme
       certificateur : le certificat d'entreprise est délivré par un organisme de certification reconnu, après audit.
       Wisy Safety propose l'ACCOMPAGNEMENT. Les deux produits ont des identifiants, des routes, des textes et des
       lignes de panier distincts — ne jamais les mélanger.

     Trois sortes de faits, jamais mélangées :
       1. CONFIRMÉS par Wisy Safety : ligne du bordereau d'inscription publié sur wisysafety.be/sinscrire/ (lue le
          2026-09-26) — « VCA Entreprise · Accompagnement à la certification LSC · 590 € / pers. », sous la mention
          « Tarifs indicatifs par participant » ; le statut TVA n'y est pas précisé → `vatIncluded: null`.
       2. OFFICIELS (`official`) : niveaux, validité, audits de suivi, organisme certificateur — SSVV (propriétaire du
          schéma VCA), BeSaCC-VCA, Prévention et Intérim ; chacun avec sa source et sa date de vérification.
       3. INDICATIFS (`indicative`) : repris de l'ancienne page wisysafety.be/wisy-vca/ (« 2 à 6 mois selon le niveau
          visé et la préparation ») — affichés comme une INDICATION, à faire confirmer par Wisy Safety.
     Jamais affichés : « 1200+ certifiés », « 98 % de réussite » (ancienne page : aucune source vérifiable) — voir
     `unconfirmedClaims`.
     --------------------------------------------------------------------- */
  var IMG_VCAE = "assets/images/vca-entreprise/";
  var VID_VCAE = "assets/videos/vca-entreprise/";

  var VCA_ENTREPRISE = {
    id: "vca-entreprise",
    registrationId: "vca-entreprise",
    slug: "vca-entreprise",
    kind: "service",

    url: "vca-entreprise.html",
    signupUrl: "inscription.html?formation=vca-entreprise",
    contactUrl: "contact.html?subject=vca-entreprise",

    /* Libellés français de référence. L'appellation TRADUITE (menu, panier, recherche, assistant) est celle de la clé
       `nav.vca_entreprise` — « VCA for Companies », « VCA Bedrijven »… — pour que tout le site nomme le service pareil. */
    title: "VCA Entreprise",
    fullTitle: "VCA Entreprise — accompagnement à la certification VCA de votre entreprise",
    summary: "Wisy Safety accompagne votre entreprise dans sa démarche de certification VCA (LSC), au niveau VCA*, VCA** ou VCA-P : le certificat est délivré par un organisme de certification reconnu, après audit.",
    objective: "Aider une entreprise à préparer sa certification VCA (LSC) et à choisir le niveau qui correspond à son activité.",
    titleKey: "nav.vca_entreprise",
    fullTitleKey: "dd.vca_entreprise_full",
    summaryKey: "dd.vca_entreprise_summary",
    taglineKey: "dd.vca_entreprise_desc",

    /* Faits confirmés — 590 € par participant, tarif INDICATIF (bordereau). Ni HT ni TTC : non précisé. */
    price: { amountCents: 59000, currency: "EUR", vatIncluded: null },
    priceUnit: "participant",
    priceIndicative: true,

    /* Public visé : reprend l'ancienne page (sous-traitants et prestataires, BTP, énergie, maintenance industrielle,
       pétrochimie) et le critère officiel des niveaux (recours ou non à des sous-traitants). */
    audience: [
      "entreprises qui exécutent des travaux à risque chez des donneurs d'ordre",
      "sous-traitants et prestataires",
      "entrepreneurs principaux qui font appel à des sous-traitants",
      "entreprises actives dans la pétrochimie"
    ],
    sectors: ["construction", "industrie", "maintenance industrielle", "énergie", "pétrochimie", "sous-traitance"],

    /* Les trois niveaux du référentiel VCA — CRITÈRE OFFICIEL (SSVV, BeSaCC-VCA) : recours ou non à des sous-traitants,
       activité pétrochimique. Ce n'est PAS la taille de l'entreprise (l'ancienne page disait « grandes entreprises » pour
       VCA** : inexact). `levelFor()` sert au guide « Quel niveau ? » de la page et à l'assistant. */
    levels: [
      { id: "star1", label: "VCA*",  stars: 1, subcontractors: false, petrochemical: false },
      { id: "star2", label: "VCA**", stars: 2, subcontractors: true,  petrochemical: false },
      { id: "petro", label: "VCA-P", stars: 0, subcontractors: null,  petrochemical: true }
    ],

    /* Faits OFFICIELS, avec source (vérifiés le 2026-09-26 par lecture directe des pages citées). */
    official: {
      verifiedAt: "2026-09-26",
      certificateValidityYears: 3,          /* le certificat d'entreprise est valable 3 ans… */
      followUpAudit: "annual",              /* … avec un audit de suivi (intermédiaire) chaque année */
      issuedBy: "certification-body",       /* organisme de certification reconnu — jamais Wisy Safety */
      sources: {
        ssvv:   "https://ssvv.nl/vca/",
        besacc: "https://www.besacc-vca.be/fr/vca-info/",
        pi:     "https://www.p-i.be/fr/themes/partenaires-en-matiere-de-securite/vca"
      }
    },

    /* INDICATIF — ancienne page wisysafety.be/wisy-vca/ : « 2 à 6 mois selon le niveau visé et la préparation de
       l'entreprise ». À faire confirmer par Wisy Safety avant d'en faire un engagement. */
    indicative: { monthsMin: 2, monthsMax: 6, source: "wisysafety.be/wisy-vca/ (2026-09-26)" },

    /* Recherche et assistant : titre, synonymes, niveaux, termes métier, dans les 10 langues (sans accents, minuscules).
       Le mot « vca » SEUL n'y figure pas : « vca » désigne d'abord la formation VCA Base. */
    keywords: [
      "vca entreprise", "vca entreprises", "certification vca entreprise", "certification vca entreprises", "certification entreprise",
      "certifier mon entreprise", "certifier une entreprise", "certification vca", "accompagnement vca", "accompagnement certification vca",
      "accompagnement certification", "securite entreprise", "lsc", "certification lsc", "vca lsc", "scc", "donneur d'ordre",
      "vca*", "vca **", "vca**", "vca *", "vca 1 etoile", "vca 2 etoiles", "vca etoile", "vca p", "vca-p", "vcap", "vca petrochimie",
      "vca petrochemical", "vca petrochemie", "vca petrochimique", "petrochimie", "petrochemical",
      "vca company", "vca companies", "vca for companies", "company certification", "certify my company",
      "vca bedrijf", "vca bedrijven", "bedrijf certificeren", "vca maatskappy", "vca maatskappye", "vca unternehmen", "vca firma",
      "unternehmen zertifizieren", "vca azienda", "vca aziende", "certificare azienda", "vca companie", "vca companii",
      "vca podjetje", "vca podjetja", "certifikacija podjetja", "vca фирма", "vca фирми", "vca компания", "vca شركة", "vca شركات",
      "checklist aannemers", "checklist contractors"
    ],
    /* Mots de la RECHERCHE du site uniquement (prix) — l'assistant les traite à part (voir GENERIC_KEYWORD). */
    searchExtra: ["prix", "tarif", "590", "combien coute", "price", "cost", "prijs", "kosten", "preis", "prezzo", "pret", "cena", "prys", "цена", "سعر", "ثمن"],

    /* Visuels : dérivés de assets/originaux/vca-entreprise/ (scripts/optimize-images.py) ; film : 2 versions MP4 AVEC SON
       (scripts/encode-video.swift), chargées seulement au clic sur « lecture ». */
    images: {
      poster: IMG_VCAE + "poster-1024.webp",
      thumb:  IMG_VCAE + "thumb-192.webp",
      og:     "assets/images/partage/vca-entreprise-1200x630.jpg"
    },
    imageAlt: "Chantier au coucher du soleil : grues et excavatrice devant un bâtiment en construction",
    video: {
      durationSeconds: 19, hasAudio: true,
      sources: { 720: VID_VCAE + "vca-entreprise-720.mp4", 1080: VID_VCAE + "vca-entreprise-1080.mp4" }
    },

    /* Affirmations à ne PAS faire tant que Wisy Safety ne les a pas confirmées. */
    unconfirmedClaims: ["organisme certificateur", "agréé", "accrédité", "certification reconnue internationalement", "conformité garantie",
      "1200 entreprises certifiées", "98 % de réussite", "statut HT ou TTC du tarif", "durée exacte de l'accompagnement",
      "VCA** réservé aux grandes entreprises"]
  };

  /* Formations « fiche technique » (2026-10-01) — docs/content-audit.md, docs/content-sources.md. Prix, durée, format : NON confirmés
     (ancien site contradictoire) → null, jamais affichés ni affirmés. `official` = faits officiels sourcés ; `unconfirmedClaims` = à ne
     jamais reprendre sans preuve. */
  var VCA_LH = {
    id: "vca-hierarchique",
    registrationId: "vca-ligne-hierarchique",
    slug: "vca-ligne-hierarchique",
    category: "management",
    url: "formation-vca-ligne-hierarchique.html",
    signupUrl: "inscription.html?formation=vca-hierarchique",
    catalogueUrl: "formations.html#vca-hierarchique",
    legacyUrl: "https://wisysafety.be/vca-ligne-hierarchique/",
    title: "VCA Ligne hiérarchique",
    fullTitle: "Formation VCA Ligne hiérarchique (VOL-VCA)",
    summary: "Pour les chefs d'équipe, superviseurs et responsables qui encadrent du personnel opérationnel : préparation à l'examen officiel « Sécurité pour les cadres opérationnels » (VOL-VCA).",
    objective: "Préparer l'examen VOL-VCA et donner à l'encadrement les connaissances de sécurité propres à sa mission.",
    titleKey: "dd.vca_hier", fullTitleKey: "dd.vca_hier_full", summaryKey: "dd.vca_hier_summary", taglineKey: "dd.vca_hier_desc",
    factKeys: ["dd.vca_hier_f1", "dd.vca_hier_f2"],
    durationDays: null, price: null, level: "Avancé",
    audience: ["chefs d'équipe", "superviseurs", "responsables qui encadrent du personnel opérationnel", "entreprises certifiées VCA ou en préparation de certification"],
    features: ["Diplôme VOL-VCA (délivré par un centre d'examen reconnu)", "Programme : 14 thèmes officiels", "Diplôme valable 10 ans"],
    exam: { included: null },
    certification: "Le diplôme VOL-VCA est délivré par un centre d'examen reconnu par BeSaCC-VCA, après réussite de l'examen — pas par Wisy Safety",
    official: {
      verifiedAt: "2026-10-01",
      diplomaLabel: "« Sécurité pour les cadres opérationnels » (VOL-VCA)",
      exam: { questions: 70, minutes: 75, minutesNote: "selon le centre d'examen", passPercent: 64.5, passPoints: 4515, maxPoints: 7000 },
      diplomaValidityYears: 10,
      sources: {
        besacc: { fr: "https://www.besacc-vca.be/fr/veiligheid-voor-operationeel-leidinggevenden-vol-vca/", nl: "https://www.besacc-vca.be/veiligheid-voor-operationeel-leidinggevenden-vol-vca/", en: "https://www.besacc-vca.be/en/veiligheid-voor-operationeel-leidinggevenden-vol-vca/" },
        reglement: "https://www.besacc-vca.be/wp-content/uploads/2023/06/Reglement-General-Examens-VCA-2018-03.pdf",
        centres: "https://www.besacc-vca.be/fr/erkende-examencentra-b-vca-vol-vca-vil-vcu/",
        registre: "https://csm-examen.be/cdr"
      }
    },
    /* « vca » SEUL désigne d'abord la VCA Base : seules les formes explicites (ligne hiérarchique, VOL) pointent ici. */
    keywords: ["vca ligne hierarchique", "vca hierarchique", "ligne hierarchique", "vol-vca", "vol", "chef", "chefs", "superviseur", "encadrant",
      "encadrement", "responsable", "cadre operationnel", "cadres operationnels", "leidinggevende", "operationeel leidinggevenden", "supervisor"],
    searchExtra: ["formation vca ligne hierarchique", "chef d'equipe", "chefs d'equipe", "chef de chantier", "vca chef", "vca encadrement", "examen vol", "tarif", "price", "prijs"],
    images: { hero: "assets/images/formations/vca-hierarchique.webp", card: "assets/images/formations/vca-hierarchique.webp",
      thumb: "assets/images/vca-ligne-hierarchique/vca-lh-thumb-192.webp", og: "assets/images/partage/formation-vca-ligne-hierarchique-1200x630.jpg" },
    imageAlt: "Encadrant en casque blanc et gilet haute visibilité qui indique une direction sur un chantier, un ordinateur portable à la main",
    unconfirmedClaims: ["agréé", "agrément", "centre d'examen reconnu", "examen inclus", "certification reconnue au niveau international", "taux de réussite (95 %)",
      "tarifs 280 € / 370 € / 195–345 €", "durée (10 h, 14 h, 1 ou 2 jours)", "repas inclus", "référence WSY-VOL/2025-BE", "« des milliers de professionnels »"]
  };

  var DIISO = {
    id: "diisocyanates",
    registrationId: "diisocyanates",
    slug: "diisocyanates",
    category: "securite",
    url: "formation-diisocyanates.html",
    signupUrl: "inscription.html?formation=diisocyanates",
    catalogueUrl: "formations.html#diisocyanates",
    legacyUrl: "https://wisysafety.be/produit-dangereux/",
    title: "Diisocyanates & substances dangereuses",
    fullTitle: "Formation diisocyanates et substances dangereuses",
    summary: "Depuis le 24 août 2023, un produit contenant 0,1 % ou plus de diisocyanates ne peut être utilisé à titre industriel ou professionnel que par une personne qui a suivi avec succès une formation à leur utilisation sûre (règlement (UE) 2020/1149).",
    objective: "Former à l'utilisation sûre des diisocyanates, comme l'exige le règlement (UE) 2020/1149 avant tout usage industriel ou professionnel.",
    titleKey: "dd.diiso", fullTitleKey: "dd.diiso_full", summaryKey: "dd.diiso_summary", taglineKey: "dd.diiso_desc",
    factKeys: ["dd.diiso_f1", "dd.diiso_f2"],
    durationDays: null, price: null, level: "Spécialisée",
    audience: ["peintres", "façadiers", "étancheurs", "menuisiers", "opérateurs industriels", "toute personne qui utilise ou supervise l'utilisation de produits contenant des diisocyanates"],
    features: ["Règlement (UE) 2020/1149", "Exigée depuis le 24 août 2023", "Renouvellement au moins tous les 5 ans"],
    official: {
      verifiedAt: "2026-10-01",
      regulation: "Règlement (UE) 2020/1149 de la Commission du 3 août 2020 (REACH, annexe XVII, entrée 74)",
      appliesFrom: "2023-08-24", labelFrom: "2022-02-24", thresholdPercentWeight: 0.1, renewalYears: 5,
      levels: ["général", "intermédiaire", "avancé"],
      belgianOel: { since: "2026-06-03", eightHoursUgNco: 10, shortTermUgNco: 20, from2029: { eightHoursUgNco: 6, shortTermUgNco: 12 } },
      sources: {
        eurlex: { fr: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32020R1149", nl: "https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32020R1149", en: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32020R1149" },
        spf: "https://emploi.belgique.be/fr/actualites/nouvelles-valeurs-limites-dexposition-professionnelle-pour-le-plomb-ses-composes-et-les",
        echa: "https://echa.europa.eu/substance-information/-/substanceinfo/100.251.385"
      }
    },
    keywords: ["diisocyanates", "diisocyanate", "isocyanate", "isocyanates", "mdi", "tdi", "hdi", "ipdi", "polyurethane", "polyurethanes", "pu", "mousse pu",
      "reach", "2020/1149", "annexe xvii", "substances dangereuses", "produits dangereux", "produit dangereux", "produits chimiques", "chimique",
      "agents chimiques", "asthme professionnel", "peintre", "facadier", "etancheur", "gevaarlijke stoffen", "diisocyanaten", "dangerous substances"],
    searchExtra: ["formation diisocyanates", "formation obligatoire", "obligatoire", "amende", "prix", "tarif", "price", "prijs"],
    images: { hero: "assets/images/diisocyanates/diisocyanates-laboratoire-flacons-960.webp", card: "assets/images/formations/diisocyanates.webp",
      thumb: "assets/images/diisocyanates/diisocyanates-thumb-192.webp", og: "assets/images/partage/formation-diisocyanates-1200x630.jpg" },
    imageAlt: "Illustration : un technicien en blouse et lunettes de protection manipule des flacons portant un pictogramme de danger",
    unconfirmed: ["certification valable partout en europe", "certificat européen", "agréé", "agrément", "reconnaissance légale européenne"],
    unconfirmedClaims: ["tarif 200 € (ancienne page) ou 95 € (bordereau)", "durée 2–4 h", "format présentiel ou intra-entreprise", "niveau de formation couvert",
      "« +2 500 professionnels »", "« 98 % de satisfaction »", "« 4,9/5 »", "amende de 250 € par jour et par salarié", "« protection santé garantie »"]
  };

  var FIBRE = {
    id: "fibre-optique",
    registrationId: "fibre-optique",
    slug: "fibre-optique",
    category: "technique",
    url: "formation-fibre-optique.html",
    signupUrl: "inscription.html?formation=fibre-optique",
    catalogueUrl: "formations.html#fibre-optique",
    legacyUrl: "https://wisysafety.be/fibre-optique/",
    title: "Fibre optique",
    fullTitle: "Formation fibre optique",
    summary: "Du raccordement à la mesure OTDR : un parcours en trois niveaux et six modules pour les artisans, techniciens et ingénieurs qui interviennent sur les réseaux fibre (FTTH, FTTx).",
    objective: "Installer, raccorder, souder, mesurer et concevoir des réseaux fibre optique, selon le niveau choisi.",
    titleKey: "dd.fibre", fullTitleKey: "dd.fibre_full", summaryKey: "dd.fibre_summary", taglineKey: "dd.fibre_desc",
    factKeys: ["dd.fibre_f1", "dd.fibre_f2"],
    durationDays: null, price: null, level: "Technique",
    audience: ["artisans", "électriciens", "techniciens", "installateurs", "ingénieurs", "chefs de projet"],
    features: ["3 niveaux : débutant, intermédiaire, avancé", "6 modules", "4 formats : intensif, modulaire, mixte, sur chantier"],
    types: [
      { id: "base", name: "Base de la fibre optique" }, { id: "connecteurs", name: "Connecteurs et raccordements" },
      { id: "fusion", name: "Épissure par fusion" }, { id: "mesures", name: "Mesures et diagnostic (OTDR)" },
      { id: "chantier", name: "Installation sur chantier" }, { id: "conception", name: "Conception et planification" }
    ],
    keywords: ["fibre optique", "fibre", "fiber", "fibre optic", "ftth", "fttx", "fttb", "otdr", "reflectometre", "soudure", "epissure", "epissure par fusion",
      "fusion", "raccordement", "connecteur", "connecteurs", "telecom", "telecommunications", "monomode", "multimode", "glasvezel", "glasfaser"],
    searchExtra: ["formation fibre optique", "technicien fibre", "prix", "tarif", "price", "prijs"],
    images: { hero: "assets/images/formations/fibre-optique.webp", card: "assets/images/formations/fibre-optique.webp",
      thumb: "assets/images/fibre-optique/fibre-optique-thumb-192.webp", og: "assets/images/partage/formation-fibre-optique-1200x630.jpg" },
    imageAlt: "Image de synthèse : câble à fibres optiques ouvert, fibres de couleur éclairées sur fond bleu",
    unconfirmed: ["certification", "certifiant", "certifiée", "agréé", "agrément", "attestation reconnue"],
    unconfirmedClaims: ["« 500+ professionnels formés »", "« 15+ ans d'expertise »", "« formés depuis 2010 »", "« 100 % certifications reconnues »",
      "durées des modules (170 h au total) et du format intensif (35–40 h)", "maximum 8 participants", "80 % de pratique", "plateforme e-learning et forum",
      "« techniciens certifiés avec plus de 10 ans d'expérience »", "rencontres avec des employeurs", "tarif (650 € au bordereau)"]
  };

  /* Niveau VCA correspondant à une situation (critères OFFICIELS : sous-traitants, pétrochimie). Sert au guide « Quel niveau ? »
     de la page et à l'assistant — une INDICATION : le niveau exigé dépend surtout des donneurs d'ordre. */
  function vcaLevelFor(situation) {
    var s = situation || {};
    if (s.petrochemical === true) return "petro";
    return s.subcontractors === true ? "star2" : "star1";
  }

  /* Toutes les formations à page dédiée (extensible : ajouter une entrée). */
  var TRAININGS = { "vca-base": VCA_BASE, "vca-hierarchique": VCA_LH, diisocyanates: DIISO, nacelle: NACELLES, "fibre-optique": FIBRE, beps: BEPS };

  /* ---------------------------------------------------------------------
     Formatage (FR) — l'i18n de l'interface passe par les clés `dd.*`.
     --------------------------------------------------------------------- */
  function formatDuration(days) {
    if (days == null) return null;
    return days + (days > 1 ? " jours" : " jour");
  }
  /* 15 -> "15 heures" ; 1 -> "1 heure" ; null -> null (durée non confirmée : jamais affichée) */
  function formatDurationHours(hours) {
    if (hours == null) return null;
    return hours + (hours > 1 ? " heures" : " heure");
  }
  /* 35000/HT -> "350 € HT" ; 24550/HT -> "245,50 € HT" ; 7000/null -> "70 €" (statut TVA non précisé) */
  function formatPrice(p) {
    if (!p) return null;
    var euros = p.amountCents / 100;
    var s = (euros % 1 === 0) ? String(euros) : euros.toFixed(2).replace(".", ",");
    var suffix = p.vatIncluded === true ? " TTC" : p.vatIncluded === false ? " HT" : "";
    return s + " €" + suffix;
  }
  function get(id) { return TRAININGS[id] || null; }
  function all() { return Object.keys(TRAININGS).map(function (k) { return TRAININGS[k]; }); }

  /* Chemin (sans ancre ni requête) de la page dédiée — pour l'allow-list d'URLs. */
  function pagePath(t) { return String((t && t.url) || "").split("#")[0].split("?")[0]; }
  function hasDedicatedPage(t) { return !!t && /^formation-[a-z0-9-]+\.html$/.test(pagePath(t)); }

  return {
    VERIFIED_AT: VERIFIED_AT,
    get: get,
    all: all,
    formatDuration: formatDuration,
    formatDurationHours: formatDurationHours,
    formatPrice: formatPrice,
    pagePath: pagePath,
    hasDedicatedPage: hasDedicatedPage,
    nacelles: NACELLES,
    beps: BEPS,
    vcaBase: VCA_BASE,
    vcaLigneHierarchique: VCA_LH,
    diisocyanates: DIISO,
    fibreOptique: FIBRE,
    vcaEntreprise: VCA_ENTREPRISE,
    vcaLevelFor: vcaLevelFor
  };
});
