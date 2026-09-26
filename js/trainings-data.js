/* =========================================================================
   WISY SAFETY — Registre des formations dotées d'une page dédiée
   -------------------------------------------------------------------------
   SOURCE UNIQUE DES FAITS des formations à page dédiée (VCA Base, Nacelles
   Élévatrices, BEPS) : route, prix, durée, langues, format, public, mots-clés,
   visuels.

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

  var VERIFIED_AT = "2026-09-19";
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

  /* Toutes les formations à page dédiée (extensible : ajouter une entrée). */
  var TRAININGS = { "vca-base": VCA_BASE, nacelle: NACELLES, beps: BEPS };

  /* ---------------------------------------------------------------------
     Formatage (FR) — l'i18n de l'interface passe par les clés `dd.*`.
     --------------------------------------------------------------------- */
  function formatDuration(days) {
    return days + (days > 1 ? " jours" : " jour");
  }
  /* 15 -> "15 heures" ; 1 -> "1 heure" */
  function formatDurationHours(hours) {
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
    vcaBase: VCA_BASE
  };
});
