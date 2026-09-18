/* =========================================================================
   WISY SAFETY — Assistant · Base de connaissances
   -------------------------------------------------------------------------
   Source de vérité UNIQUE et structurée pour l'Assistant Wisy.
   Chaque entrée respecte le schéma :

       { id, title, url, type, content, updatedAt, ... }

   Les données proviennent EXCLUSIVEMENT du site réel (formations.html,
   contact.html, en-tête/pied de page, système de recherche existant).
   Aucune donnée n'est inventée : prix, dates et modalités précises ne
   figurent pas sur le site → elles ne figurent pas ici et l'assistant
   redirige alors vers le contact humain.

   Module « dual-mode » : s'expose comme `window.WisyAssistant.Knowledge`
   dans le navigateur ET comme `module.exports` sous Node (pour les tests),
   sans aucune dépendance ni étape de build.

   Mise à jour : les URLs, ancres et clés i18n reflètent les fichiers du
   dépôt. Pour ajouter une formation, dupliquer une entrée `formation` et
   renseigner les mêmes champs — l'assistant et sa recherche la prendront
   en compte automatiquement (voir aussi supabase/functions/chat/knowledge.ts).
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Knowledge = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Date de dernière vérification du contenu face au site (ISO, statique
     pour rester déterministe et testable). */
  var VERIFIED_AT = "2026-09-18";

  /* --------------------------------------------------------------------- */
  /* Coordonnées réelles (contact.html, en-tête, pied de page)             */
  /* --------------------------------------------------------------------- */
  var CONTACT = {
    company: "Wisy Safety",
    email: "info@wisysafety.be",
    phone: "+32 2 318 86 59",
    phoneHref: "tel:+3223188659",
    city: "Anderlecht",
    postalCode: "1070",
    region: "Bruxelles",
    /* Horaires dérivés de la logique « statut temps réel » du pied de page
       (SCH : lundi→jeudi 10:00–16:00, vendredi/week-end fermé). */
    hours: "Du lundi au jeudi, de 10h00 à 16h00",
    contactUrl: "contact.html"
  };

  /* --------------------------------------------------------------------- */
  /* Catégories (miroir de search.js — labels via i18n dans le navigateur) */
  /* --------------------------------------------------------------------- */
  var CATEGORIES = {
    securite:   { id: "securite",   label: "Sécurité",   labelKey: "fo.filter_securite" },
    secours:    { id: "secours",    label: "Secours",    labelKey: "fo.filter_secours" },
    technique:  { id: "technique",  label: "Technique",  labelKey: "fo.filter_technique" },
    management: { id: "management", label: "Management",  labelKey: "fo.filter_management" }
  };

  /* --------------------------------------------------------------------- */
  /* Formations — contenu réel de formations.html                          */
  /* url        : fiche (ancre sur la page catalogue)                       */
  /* signupUrl  : pré-remplissage du formulaire d'inscription              */
  /* titleKey/descKey : clés i18n existantes (traduction multilingue live) */
  /* --------------------------------------------------------------------- */
  var FORMATIONS = [
    {
      id: "vca-base",
      type: "formation",
      title: "VCA Base",
      titleKey: "dd.vca_base",
      category: "securite",
      url: "formations.html#vca-base",
      signupUrl: "inscription.html?formation=vca-base",
      duration: "1 jour",
      level: "Base",
      description: "Formation sécurité de base pour tous les secteurs professionnels. Certification reconnue au niveau national.",
      descKey: "fo.f1_desc",
      features: ["Certification reconnue", "Formateur expert", "Support complet"],
      keywords: ["vca", "base", "b-vca", "securite", "chantier", "fondamentaux", "certification", "national", "safety", "veiligheid", "sicherheit"]
    },
    {
      id: "vca-hierarchique",
      type: "formation",
      title: "VCA Ligne hiérarchique",
      titleKey: "dd.vca_hier",
      category: "management",
      url: "formations.html#vca-hierarchique",
      signupUrl: "inscription.html?formation=vca-hierarchique",
      duration: "2 jours",
      level: "Avancé",
      description: "Pour responsables et encadrants en milieu professionnel. Approfondissement des concepts de sécurité.",
      descKey: "fo.f2_desc",
      features: ["Management de la sécurité", "Approche pratique", "Cas concrets"],
      keywords: ["vca", "hierarchique", "vol-vca", "ligne", "encadrement", "responsable", "responsables", "manager", "management", "chef", "supervisor", "leidinggevende"]
    },
    {
      id: "diisocyanates",
      type: "formation",
      title: "Diisocyanates & substances dangereuses",
      titleKey: "dd.diiso",
      category: "securite",
      url: "formations.html#diisocyanates",
      signupUrl: "inscription.html?formation=diisocyanates",
      duration: "1 jour",
      level: "Spécialisée",
      description: "Manipulation sécurisée des produits chimiques en entreprise. Conforme aux normes européennes en vigueur.",
      descKey: "fo.f3_desc",
      features: ["Produits chimiques", "Normes REACH", "Équipements adaptés"],
      keywords: ["diisocyanate", "diisocyanates", "isocyanate", "reach", "chimique", "chimiques", "substances", "dangereuses", "produits", "chemical", "gevaarlijke"]
    },
    {
      id: "nacelle",
      type: "formation",
      title: "Nacelle élévatrice",
      titleKey: "dd.nacelle",
      category: "technique",
      url: "formations.html#nacelle",
      signupUrl: "inscription.html?formation=nacelle",
      duration: "1 jour",
      level: "Spécialisée",
      description: "Utilisation sécurisée des plateformes élévatrices mobiles (PEMP). Formation pratique sur machine.",
      descKey: "fo.f4_desc",
      features: ["Pratique sur machine", "Normes de sécurité", "Certification CACES"],
      keywords: ["nacelle", "pemp", "caces", "elevatrice", "élévatrice", "plateforme", "hauteur", "lift", "aerial", "hoogwerker"]
    },
    {
      id: "fibre-optique",
      type: "formation",
      title: "Fibre optique",
      titleKey: "dd.fibre",
      category: "technique",
      url: "formations.html#fibre-optique",
      signupUrl: "inscription.html?formation=fibre-optique",
      duration: "3 jours",
      level: "Technique",
      description: "Soudure et installation professionnelle de fibres optiques. Formation complète avec équipement fourni.",
      descKey: "fo.f5_desc",
      features: ["Équipement fourni", "Expert technique", "Pratique intensive"],
      keywords: ["fibre", "fiber", "optique", "optic", "soudure", "raccordement", "telecom", "installation", "ftth"]
    },
    {
      id: "beps",
      type: "formation",
      title: "BEPS — Premier secours",
      titleKey: "dd.beps",
      category: "secours",
      url: "formations.html#beps",
      signupUrl: "inscription.html?formation=beps",
      duration: "3 jours",
      level: "Moyen",
      description: "Maîtrisez les gestes qui sauvent : réanimation, hémorragies et positions de sécurité. Brevet européen de premiers secours reconnu.",
      descKey: "fo.f6_desc",
      features: ["Gestes qui sauvent", "Brevet reconnu", "Pratique sur mannequin"],
      keywords: ["beps", "secours", "secourisme", "premiers", "brevet", "reanimation", "réanimation", "sauvetage", "first aid", "ehbo", "cpr", "defibrillateur"]
    }
  ];

  /* --------------------------------------------------------------------- */
  /* Pages principales (miroir de search.js PAGES)                          */
  /* --------------------------------------------------------------------- */
  var PAGES = [
    {
      id: "page-home", type: "page", title: "Accueil", url: "index.html",
      titleKey: "search.page_home_t", descKey: "search.page_home_d",
      content: "Page d'accueil de Wisy Safety, centre de formation à la sécurité.",
      keywords: ["accueil", "home", "start", "presentation", "wisy"]
    },
    {
      id: "page-formations", type: "page", title: "Formations", url: "formations.html",
      titleKey: "search.page_formations_t", descKey: "search.page_formations_d",
      content: "Catalogue complet des formations Wisy Safety : sécurité, secours, technique et management.",
      keywords: ["formations", "catalogue", "cours", "liste", "offre", "courses", "opleidingen"]
    },
    {
      id: "page-avis", type: "page", title: "Avis clients", url: "avis.html",
      titleKey: "search.page_avis_t", descKey: "search.page_avis_d",
      content: "Avis et témoignages des participants aux formations Wisy Safety.",
      keywords: ["avis", "temoignages", "reviews", "opinions", "retours", "satisfaction"]
    },
    {
      id: "page-contact", type: "page", title: "Contact", url: "contact.html",
      titleKey: "search.page_contact_t", descKey: "search.page_contact_d",
      content: "Coordonnées de Wisy Safety : téléphone, e-mail, adresse à Anderlecht et formulaire de contact.",
      keywords: ["contact", "adresse", "telephone", "email", "coordonnees", "joindre", "kontakt"]
    },
    {
      id: "page-inscription", type: "page", title: "Inscription", url: "inscription.html",
      titleKey: "search.page_inscription_t", descKey: "search.page_inscription_d",
      content: "Formulaire d'inscription en ligne aux formations Wisy Safety.",
      keywords: ["inscription", "inscrire", "register", "enroll", "signup", "s'inscrire", "reserver"]
    }
  ];

  /* --------------------------------------------------------------------- */
  /* Contact — entrée dédiée                                                */
  /* --------------------------------------------------------------------- */
  var CONTACT_ENTRY = {
    id: "contact-info",
    type: "contact",
    title: "Contacter Wisy Safety",
    url: CONTACT.contactUrl,
    content: "Wisy Safety, " + CONTACT.postalCode + " " + CONTACT.city + " (" + CONTACT.region +
      "). Téléphone " + CONTACT.phone + ", e-mail " + CONTACT.email + ". " + CONTACT.hours +
      ". Formulaire de contact disponible en ligne.",
    keywords: ["contact", "telephone", "téléphone", "appeler", "email", "mail", "adresse", "horaires", "ouvert", "joindre", "conseiller", "humain", "parler"],
    updatedAt: VERIFIED_AT
  };

  /* --------------------------------------------------------------------- */
  /* FAQ — UNIQUEMENT des faits présents sur le site.                       */
  /* Les questions dont la réponse n'est pas sur le site (prix, dates,      */
  /* modalités précises) sont volontairement absentes : l'assistant renvoie */
  /* alors vers le contact plutôt que d'inventer.                           */
  /* --------------------------------------------------------------------- */
  var FAQ = [
    {
      id: "faq-deroulement",
      type: "faq",
      title: "Comment se déroule une formation ?",
      url: "formations.html",
      question: "Comment se déroule une formation ?",
      answer: "Nos formations durent de 1 à 3 jours selon le programme, sont animées par des formateurs experts et alternent théorie et pratique. La plupart débouchent sur une certification reconnue. Pour les dates précises et l'organisation, le mieux est de nous contacter.",
      content: "Déroulement d'une formation : durée de 1 à 3 jours, formateurs experts, théorie et pratique, certification reconnue, organisation déroulement comment ça se passe.",
      keywords: ["deroulement", "déroule", "passe", "comment", "organisation", "duree", "durée", "jours", "pratique", "theorie", "certification", "format"]
    },
    {
      id: "faq-inscription",
      type: "faq",
      title: "Comment s'inscrire à une formation ?",
      url: "inscription.html",
      question: "Comment s'inscrire à une formation ?",
      answer: "Vous pouvez vous inscrire directement en ligne depuis la page Inscription, ou nous contacter si vous préférez être accompagné dans votre choix.",
      content: "Inscription : formulaire en ligne sur la page inscription, ou par contact. S'inscrire réserver une place.",
      keywords: ["inscription", "inscrire", "s'inscrire", "reserver", "réserver", "place", "reservation", "enroll", "formulaire"]
    },
    {
      id: "faq-lieu",
      type: "faq",
      title: "Où se situe Wisy Safety ?",
      url: "contact.html",
      question: "Où se situe le centre de formation ?",
      answer: "Wisy Safety est un centre de formation à la sécurité situé à Anderlecht (1070), à Bruxelles. Pour l'organisation d'une formation ou une intervention sur site, contactez-nous.",
      content: "Localisation : Anderlecht 1070 Bruxelles. Où se trouve le centre lieu adresse situé.",
      keywords: ["lieu", "ou", "où", "adresse", "situe", "située", "anderlecht", "bruxelles", "localisation", "centre", "endroit"]
    },
    {
      id: "faq-tarifs",
      type: "faq",
      title: "Quels sont les tarifs ?",
      url: "contact.html",
      question: "Quels sont les tarifs des formations ?",
      /* Le site n'affiche PAS de prix : réponse honnête + renvoi contact. */
      answer: "Les tarifs ne sont pas indiqués sur le site : ils dépendent de la formation et du contexte (individuel ou entreprise). Contactez-nous et nous vous transmettrons un tarif adapté à votre besoin.",
      content: "Tarifs prix coût combien devis budget : information non disponible sur le site, contacter Wisy Safety.",
      keywords: ["tarif", "tarifs", "prix", "cout", "coût", "combien", "devis", "budget", "euro", "euros", "cher", "gratuit", "financement"],
      unavailableOnSite: true
    },
    {
      id: "faq-contact",
      type: "faq",
      title: "Comment contacter Wisy Safety ?",
      url: "contact.html",
      question: "Comment vous contacter ?",
      answer: "Vous pouvez nous joindre par téléphone au " + CONTACT.phone + ", par e-mail à " + CONTACT.email + ", ou via le formulaire de la page Contact. " + CONTACT.hours + ".",
      content: "Contact téléphone email formulaire horaires. " + CONTACT.hours + ". Joindre appeler écrire.",
      keywords: ["contact", "contacter", "joindre", "telephone", "téléphone", "appeler", "email", "mail", "ecrire", "horaires", "ouvert", "disponible"]
    }
  ];

  /* --------------------------------------------------------------------- */
  /* Index unifié + helpers                                                 */
  /* --------------------------------------------------------------------- */

  /* Normalise le texte indexable d'une entrée en une seule chaîne. */
  function searchableText(entry) {
    var parts = [
      entry.title,
      entry.description,
      entry.answer,
      entry.content,
      entry.level,
      entry.duration,
      (entry.features || []).join(" "),
      (entry.keywords || []).join(" ")
    ];
    if (entry.category && CATEGORIES[entry.category]) parts.push(CATEGORIES[entry.category].label);
    return parts.filter(Boolean).join(" ");
  }

  /* Toutes les entrées, chacune enrichie d'un champ `_text` pour l'index. */
  function all() {
    var list = []
      .concat(FORMATIONS)
      .concat(PAGES)
      .concat([CONTACT_ENTRY])
      .concat(FAQ);
    return list.map(function (e) {
      var copy = Object.assign({}, e);
      if (!copy.updatedAt) copy.updatedAt = VERIFIED_AT;
      copy._text = searchableText(e);
      return copy;
    });
  }

  function formations() { return FORMATIONS.slice(); }
  function pages() { return PAGES.slice(); }
  function faq() { return FAQ.slice(); }

  function byId(id) {
    var found = null;
    all().forEach(function (e) { if (e.id === id) found = e; });
    return found;
  }

  function formationsByCategory(cat) {
    return FORMATIONS.filter(function (f) { return f.category === cat; });
  }

  return {
    VERIFIED_AT: VERIFIED_AT,
    CONTACT: CONTACT,
    CATEGORIES: CATEGORIES,
    all: all,
    formations: formations,
    pages: pages,
    faq: faq,
    byId: byId,
    formationsByCategory: formationsByCategory,
    searchableText: searchableText
  };
});
