/* =========================================================================
   WISY SAFETY — Assistant · Base de connaissances
   -------------------------------------------------------------------------
   Source de vérité UNIQUE et structurée pour l'Assistant Wisy.
   Chaque entrée respecte le schéma :

       { id, title, url, type, content, updatedAt, ... }

   Les données proviennent EXCLUSIVEMENT du site réel (formations.html,
   contact.html, en-tête/pied de page, système de recherche existant).
   Aucune donnée n'est inventée : prix, dates et modalités précises ne
   figurent pas ici tant qu'elles ne sont pas confirmées → l'assistant
   redirige alors vers le contact humain.

   Formations à page dédiée (aujourd'hui : « Nacelles élévatrices ») : leurs
   faits (prix, durée, langues, format, public, route) viennent du registre
   central js/trainings-data.js — une seule définition, partagée avec la
   recherche et le parcours d'inscription.

   FAQ — la FAQ de l'assistant n'est PLUS définie ici : elle est DÉRIVÉE de la
   source unique du Centre d'aide (js/faq-data.js + moteur js/faq-search.js).
   La page faq.html et l'assistant ne peuvent donc pas se contredire. Coordonnées
   de contact : même principe (FAQ.CONTACT), avec un repli minimal si le fichier
   n'est pas chargé (un test vérifie que les deux ne dérivent pas).

   Module « dual-mode » : s'expose comme `window.WisyAssistant.Knowledge`
   dans le navigateur ET comme `module.exports` sous Node (pour les tests),
   sans build. Dépend de `window.WisyTrainings` (js/trainings-data.js) et de
   `window.WisyFAQ` (js/faq-data.js puis js/faq-search.js), à charger AVANT ce
   fichier. Sans FAQ chargée, l'assistant reste fonctionnel (sans réponses FAQ).

   Mise à jour : les URLs, ancres et clés i18n reflètent les fichiers du
   dépôt. Pour ajouter une formation, dupliquer une entrée `formation` et
   renseigner les mêmes champs — l'assistant et sa recherche la prendront
   en compte automatiquement (voir aussi supabase/functions/chat/knowledge.ts).
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var isNode = (typeof module === "object" && module.exports);
  var Trainings = isNode ? require("../trainings-data.js") : root.WisyTrainings;
  var Faq = isNode ? require("../faq-search.js") : root.WisyFAQ;
  var api = factory(Trainings, Faq);
  if (isNode) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Knowledge = api;
})(typeof self !== "undefined" ? self : this, function (Trainings, Faq) {
  "use strict";

  /* Date de dernière vérification du contenu face au site (ISO, statique
     pour rester déterministe et testable). */
  var VERIFIED_AT = "2026-09-18";

  /* --------------------------------------------------------------------- */
  /* Coordonnées réelles (contact.html, en-tête, pied de page)             */
  /* --------------------------------------------------------------------- */
  var CONTACT = (Faq && Faq.CONTACT) ? Object.assign({}, Faq.CONTACT) : {
    /* Repli minimal — utilisé UNIQUEMENT si js/faq-data.js n'est pas chargé. */
    company: "Wisy Safety",
    email: "info@wisysafety.be",
    phone: "+32 2 318 86 59",
    phoneHref: "tel:+3223188659",
    city: "Anderlecht",
    postalCode: "1070",
    region: "Bruxelles",
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
  /* Formation à page dédiée — construite depuis le registre central       */
  /* (js/trainings-data.js). Aucun fait n'est recopié ici.                 */
  /* --------------------------------------------------------------------- */
  /* Mots trop génériques pour discriminer UNE formation : les garder dans
     `keywords` ferait matcher « une formation » sur la nacelle et écraserait
     le contexte de page (voir retrieval.bestFormation). */
  var GENERIC_KEYWORD = /\b(formations?|securite)\b/;

  function fromRegistry(T) {
    return {
      id: T.id,
      type: "formation",
      title: T.title,
      fullTitle: T.fullTitle,
      titleKey: T.titleKey,
      category: T.category,
      url: T.url,
      signupUrl: T.signupUrl,
      duration: Trainings.formatDuration(T.durationDays),
      level: "Spécialisée",
      description: T.summary,
      descKey: T.summaryKey,
      objective: T.objective,
      price: T.price,
      priceLabel: Trainings.formatPrice(T.price),
      format: T.formatLabel,
      languages: T.languageLabels.slice(),
      audience: T.audience.slice(),
      subtypes: T.types.map(function (t) { return t.name; }),
      /* Affirmations réglementaires NON confirmées : l'assistant ne doit jamais
         les avancer (voir responder.js → certification non confirmée). */
      unconfirmed: T.unconfirmed.slice(),
      features: [T.formatLabel, "Approche orientée sécurité", T.languageLabels.join(", ")],
      keywords: T.keywords.filter(function (k) { return !GENERIC_KEYWORD.test(k); })
    };
  }
  var NACELLE = (Trainings && Trainings.nacelles) ? fromRegistry(Trainings.nacelles) : null;

  /* --------------------------------------------------------------------- */
  /* Formations — contenu réel de formations.html                          */
  /* url        : fiche (ancre sur la page catalogue, ou page dédiée)       */
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
    NACELLE,
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
  ].filter(Boolean);

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
    },
    {
      id: "page-faq", type: "page", title: "Centre d'aide", url: "faq.html",
      titleKey: "footer.faq",
      content: "Centre d'aide Wisy Safety : questions fréquentes sur les formations, l'inscription, les tarifs et les attestations.",
      keywords: ["aide", "faq", "questions", "centre d'aide", "assistance", "support", "help", "helpcentrum"]
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
  /* FAQ — DÉRIVÉE de la source unique du Centre d'aide (js/faq-data.js).   */
  /* Aucune réponse n'est écrite ici : modifier js/faq-data.js suffit.      */
  /* --------------------------------------------------------------------- */
  function faqEntries() {
    if (!Faq || !Faq.items) return [];
    return Faq.items().map(function (it) {
      return {
        id: it.id,
        type: "faq",
        title: it.question,
        url: "faq.html#" + it.id,
        question: it.question,
        answer: Faq.plainAnswer(it),
        content: it.question + " " + String(it.answer).replace(/\s+/g, " "),
        keywords: (it.keywords || []).concat(it.synonyms || []),
        action: it.action || null,
        relatedQuestions: (it.relatedQuestions || []).slice(),
        provisional: it.provisional === true
      };
    });
  }

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
      entry.format,
      entry.objective,
      (entry.languages || []).join(" "),
      (entry.audience || []).join(" "),
      (entry.subtypes || []).join(" "),
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
      .concat(faqEntries());
    return list.map(function (e) {
      var copy = Object.assign({}, e);
      if (!copy.updatedAt) copy.updatedAt = VERIFIED_AT;
      copy._text = searchableText(e);
      return copy;
    });
  }

  function formations() { return FORMATIONS.slice(); }
  function pages() { return PAGES.slice(); }
  function faq() { return faqEntries(); }

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
    Faq: Faq,
    all: all,
    formations: formations,
    pages: pages,
    faq: faq,
    byId: byId,
    formationsByCategory: formationsByCategory,
    searchableText: searchableText
  };
});
