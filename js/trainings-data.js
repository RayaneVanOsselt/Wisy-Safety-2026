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

  /* Toutes les formations à page dédiée (extensible : ajouter une entrée). */
  var TRAININGS = { nacelle: NACELLES };

  /* ---------------------------------------------------------------------
     Formatage (FR) — l'i18n de l'interface passe par les clés `dd.*`.
     --------------------------------------------------------------------- */
  function formatDuration(days) {
    return days + (days > 1 ? " jours" : " jour");
  }
  /* 35000 -> "350 € HT" ; 24550 -> "245,50 € HT" */
  function formatPrice(p) {
    if (!p) return null;
    var euros = p.amountCents / 100;
    var s = (euros % 1 === 0) ? String(euros) : euros.toFixed(2).replace(".", ",");
    return s + " €" + (p.vatIncluded ? " TTC" : " HT");
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
    formatPrice: formatPrice,
    pagePath: pagePath,
    hasDedicatedPage: hasDedicatedPage,
    nacelles: NACELLES
  };
});
