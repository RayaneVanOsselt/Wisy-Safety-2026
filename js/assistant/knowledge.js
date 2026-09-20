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

   Formations, pages et catégories : DÉRIVÉES du registre js/site-content.js
   (source unique, partagée avec la recherche du site, le sitemap et la copie
   Edge). Les faits de la formation à page dédiée (« Nacelles élévatrices » :
   prix, durée, langues, format, public, route) viennent du registre
   js/trainings-data.js, via ce même registre. Rien n'est redéfini ici.

   FAQ — la FAQ de l'assistant n'est PLUS définie ici : elle est DÉRIVÉE de la
   source unique du Centre d'aide (js/faq-data.js + moteur js/faq-search.js).
   La page faq.html et l'assistant ne peuvent donc pas se contredire. Coordonnées
   de contact : même principe (FAQ.CONTACT), avec un repli minimal si le fichier
   n'est pas chargé (un test vérifie que les deux ne dérivent pas).

   Module « dual-mode » : s'expose comme `window.WisyAssistant.Knowledge`
   dans le navigateur ET comme `module.exports` sous Node (pour les tests),
   sans build. Dépend de `window.WisySite` (js/site-content.js, qui lit
   js/trainings-data.js) et de `window.WisyFAQ` (js/faq-data.js puis
   js/faq-search.js), à charger AVANT ce fichier. Sans FAQ chargée, l'assistant
   reste fonctionnel (sans réponses FAQ).

   Mise à jour : pour ajouter une formation ou une page, éditer
   js/site-content.js puis lancer `node scripts/sync-edge.js` — l'assistant,
   la recherche du site et la copie serveur (supabase/functions/chat/) la
   prennent en compte ensemble.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var isNode = (typeof module === "object" && module.exports);
  var Site = isNode ? require("../site-content.js") : root.WisySite;
  var Faq = isNode ? require("../faq-search.js") : root.WisyFAQ;
  var api = factory(Site, Faq);
  if (isNode) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Knowledge = api;
})(typeof self !== "undefined" ? self : this, function (Site, Faq) {
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
  /* Catégories, formations, pages — DÉRIVÉES de js/site-content.js         */
  /* (titleKey/descKey : clés i18n existantes → traduction live du panneau) */
  /* --------------------------------------------------------------------- */
  var CATEGORIES = {};
  (Site ? Site.categories() : []).forEach(function (c) {
    CATEGORIES[c.id] = { id: c.id, label: c.label, labelKey: c.filterKey };
  });

  /* Champs de fiche utiles à l'assistant (les champs d'affichage propres à la recherche — miniature,
     faits clés, mots-clés bruts — restent dans le registre). */
  var FORMATION_FIELDS = ["id", "title", "fullTitle", "titleKey", "category", "url", "signupUrl", "duration", "level",
    "description", "descKey", "objective", "price", "priceLabel", "format", "languages", "audience", "subtypes",
    "unconfirmed", "features", "keywords"];
  var FORMATIONS = (Site ? Site.formations() : []).map(function (f) {
    var e = { type: "formation" };
    FORMATION_FIELDS.forEach(function (k) { if (f[k] !== undefined) e[k] = f[k]; });
    return e;
  });

  /* Pages principales : id « page-<id> » (historique de l'assistant), textes du registre. */
  var PAGES = (Site ? Site.pages() : []).map(function (p) {
    return { id: "page-" + p.id, type: "page", title: p.title, url: p.url, titleKey: p.titleKey, descKey: p.descKey,
      content: p.content, keywords: p.keywords };
  });

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
