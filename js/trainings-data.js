/* =========================================================================
   WISY SAFETY — Registre des formations dotées d'une page dédiée
   -------------------------------------------------------------------------
   SOURCE UNIQUE DES FAITS de la « Formation Nacelles Élévatrices » :
   route, prix, durée, langues, format, public, mots-clés, visuels.

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

  /* Toutes les formations à page dédiée (extensible : ajouter une entrée). */
  var TRAININGS = { nacelle: NACELLES, beps: BEPS };

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
    beps: BEPS
  };
});
