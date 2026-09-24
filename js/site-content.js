/* =========================================================================
   WISY SAFETY — Registre du contenu public (SOURCE UNIQUE des pages, catégories
   et formations)
   -------------------------------------------------------------------------
   Ce fichier décrit, UNE SEULE FOIS, ce que le site propose : ses pages, ses
   catégories et ses six formations (route, ancre, clés i18n, mots-clés, faits
   de fiche). Il alimente :

     1. la recherche du site            (js/search.js)
     2. l'assistant Wisy                (js/assistant/knowledge.js, validation.js)
     3. le sitemap et les balises SEO   (scripts/build-seo.js → sitemap.xml + <head>)
     4. la copie serveur de l'assistant (scripts/sync-edge.js → site.generated.ts)
     5. les tests de cohérence          (tests/site-content.test.js)

   Ajouter / modifier une formation ou une page = éditer CE fichier (+ ses
   textes i18n), puis lancer `node scripts/build-seo.js && node scripts/sync-edge.js`.
   Les tests échouent si l'une des copies générées est obsolète.

   Ce qui n'est PAS ici (sources uniques distinctes, volontairement) :
     • coordonnées, horaires             → js/faq-data.js  (FAQ.CONTACT)
     • prix, durée, langues, format de la formation à page dédiée
                                         → js/trainings-data.js
     • prix du parcours d'inscription    → js/registration-data.js
     • questions / réponses              → js/faq-data.js

   VÉRACITÉ — aucune donnée inventée : titres, durées, niveaux et descriptions
   reprennent mot pour mot ceux de formations.html / des clés i18n existantes.

   Module « dual-mode » : `window.WisySite` dans le navigateur ET `module.exports`
   sous Node (tests, générateurs) — aucune dépendance, aucun build.
   Dépend de `window.WisyTrainings` (js/trainings-data.js), à charger AVANT.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var isNode = (typeof module === "object" && module.exports);
  var Trainings = isNode ? require("./trainings-data.js") : root.WisyTrainings;
  var api = factory(Trainings);
  if (isNode) module.exports = api;
  root.WisySite = api;
})(typeof self !== "undefined" ? self : this, function (Trainings) {
  "use strict";

  /* Domaine canonique de production (déjà utilisé par la page Nacelles et .env.example). */
  var ORIGIN = "https://www.wisysafety.be";
  var SITE_NAME = "Wisy Safety";
  var VERIFIED_AT = "2026-09-20";

  /* ---------------------------------------------------------------------
     Catégories — l'ordre est celui de l'affichage (filtres, recherche).
     labelKey : clé i18n de la recherche ; filterKey : clé des filtres de formations.html.
     --------------------------------------------------------------------- */
  var CATEGORIES = [
    { id: "securite",   label: "Sécurité",         labelKey: "search.cat_securite",   filterKey: "fo.filter_securite" },
    { id: "secours",    label: "Premiers secours", labelKey: "search.cat_secours",    filterKey: "fo.filter_secours" },
    { id: "technique",  label: "Technique",        labelKey: "search.cat_technique",  filterKey: "fo.filter_technique" },
    { id: "management", label: "Management",       labelKey: "search.cat_management", filterKey: "fo.filter_management" }
  ];

  /* ---------------------------------------------------------------------
     Formations
       url        fiche : ancre du catalogue (formations.html#id) ou page dédiée
       signupUrl  pré-remplissage du parcours d'inscription
       registrationId  identifiant dans js/registration-data.js (catalogue de prix)
       titleKey / taglineKey / descKey : clés i18n (titre · accroche courte · description)
       keywords   mots-clés de recherche et de l'assistant (sans accents, minuscules)
     --------------------------------------------------------------------- */
  var CATALOGUE = [
    {
      id: "vca-base", registrationId: "vca-base", category: "securite",
      title: "VCA Base", titleKey: "dd.vca_base", taglineKey: "dd.vca_base_desc", descKey: "fo.f1_desc",
      url: "formations.html#vca-base", signupUrl: "inscription.html?formation=vca-base",
      duration: "1 jour", level: "Base",
      description: "Formation sécurité de base pour tous les secteurs professionnels. Certification reconnue au niveau national.",
      features: ["Certification reconnue", "Formateur expert", "Support complet"],
      keywords: ["vca", "base", "b-vca", "securite", "chantier", "fondamentaux", "certification", "national", "safety", "veiligheid", "sicherheit"]
    },
    {
      id: "vca-hierarchique", registrationId: "vca-ligne-hierarchique", category: "management",
      title: "VCA Ligne hiérarchique", titleKey: "dd.vca_hier", taglineKey: "dd.vca_hier_desc", descKey: "fo.f2_desc",
      url: "formations.html#vca-hierarchique", signupUrl: "inscription.html?formation=vca-hierarchique",
      duration: "2 jours", level: "Avancé",
      description: "Pour responsables et encadrants en milieu professionnel. Approfondissement des concepts de sécurité.",
      features: ["Management de la sécurité", "Approche pratique", "Cas concrets"],
      keywords: ["vca", "hierarchique", "vol-vca", "ligne", "encadrement", "responsable", "responsables", "manager", "management", "chef", "supervisor", "leidinggevende"]
    },
    {
      id: "diisocyanates", registrationId: "diisocyanates", category: "securite",
      title: "Diisocyanates & substances dangereuses", titleKey: "dd.diiso", taglineKey: "dd.diiso_desc", descKey: "fo.f3_desc",
      url: "formations.html#diisocyanates", signupUrl: "inscription.html?formation=diisocyanates",
      duration: "1 jour", level: "Spécialisée",
      description: "Manipulation sécurisée des produits chimiques en entreprise. Conforme aux normes européennes en vigueur.",
      features: ["Produits chimiques", "Normes REACH", "Équipements adaptés"],
      keywords: ["diisocyanate", "diisocyanates", "isocyanate", "reach", "chimique", "chimiques", "substances", "dangereuses", "produits", "chemical", "gevaarlijke"]
    },
    /* Nacelles élévatrices : construite depuis le registre js/trainings-data.js (voir plus bas). */
    { id: "nacelle", fromTrainings: true },
    {
      id: "fibre-optique", registrationId: "fibre-optique", category: "technique",
      title: "Fibre optique", titleKey: "dd.fibre", taglineKey: "dd.fibre_desc", descKey: "fo.f5_desc",
      url: "formations.html#fibre-optique", signupUrl: "inscription.html?formation=fibre-optique",
      duration: "3 jours", level: "Technique",
      description: "Soudure et installation professionnelle de fibres optiques. Formation complète avec équipement fourni.",
      features: ["Équipement fourni", "Expert technique", "Pratique intensive"],
      keywords: ["fibre", "fiber", "optique", "optic", "soudure", "raccordement", "telecom", "installation", "ftth"]
    },
    /* BEPS — Premier secours : construite depuis le registre js/trainings-data.js (voir plus bas),
       comme la nacelle. Page dédiée formation-beps-premiers-secours.html. */
    { id: "beps", fromTrainings: true }
  ];

  /* Formation à page dédiée : TOUS ses faits viennent du registre js/trainings-data.js
     (aucun n'est recopié ici). Sans registre chargé, l'entrée est simplement omise. */
  function fromTrainings(T) {
    return {
      id: T.id, registrationId: T.registrationId, category: T.category,
      title: T.title, fullTitle: T.fullTitle,
      titleKey: T.titleKey, fullTitleKey: T.fullTitleKey, taglineKey: "dd." + T.id + "_desc", summaryKey: T.summaryKey, descKey: T.summaryKey,
      url: T.url, signupUrl: T.signupUrl,
      duration: T.durationDays != null ? Trainings.formatDuration(T.durationDays) : Trainings.formatDurationHours(T.durationHours),
      level: T.level || "Spécialisée",
      description: T.summary, objective: T.objective,
      price: T.price, priceLabel: Trainings.formatPrice(T.price),
      format: T.formatLabel, languages: T.languageLabels.slice(), audience: T.audience.slice(),
      subtypes: T.types.map(function (t) { return t.name; }),
      unconfirmed: T.unconfirmed.slice(),
      features: [T.formatLabel, "Approche orientée sécurité", T.languageLabels.join(", ")],
      /* Mots-clés bruts (avec « formation nacelle », « securite nacelle »…) : utiles à la recherche du
         site, qui traite les mots génériques à part. `keywords` (assistant) n'en garde que les
         termes discriminants — voir GENERIC_KEYWORD. */
      searchKeywords: T.keywords.slice(),
      keywords: T.keywords.filter(function (k) { return !GENERIC_KEYWORD.test(k); }),
      thumb: T.images.thumb, image: T.images.card, imageAlt: T.imageAlt,
      factKeys: ["dd." + T.id + "_dur", "dd." + T.id + "_fmt", "dd." + T.id + "_langs"],
      dedicatedPage: true
    };
  }
  /* Mots trop génériques pour discriminer UNE formation (« une formation », « sécurité ») :
     les garder ferait matcher n'importe quelle demande sur la nacelle. */
  var GENERIC_KEYWORD = /\b(formations?|securite)\b/;

  /* ---------------------------------------------------------------------
     Pages publiques (l'ordre = celui de la recherche et du plan du site)
     --------------------------------------------------------------------- */
  var PAGES = [
    {
      id: "home", url: "index.html", title: "Accueil", titleKey: "search.page_home_t", descKey: "search.page_home_d",
      content: "Page d'accueil de Wisy Safety, centre de formation à la sécurité.",
      keywords: ["accueil", "home", "start", "startseite", "acasa", "presentation", "wisy"]
    },
    {
      id: "formations", url: "formations.html", title: "Formations", titleKey: "search.page_formations_t", descKey: "search.page_formations_d",
      content: "Catalogue complet des formations Wisy Safety : sécurité, secours, technique et management.",
      keywords: ["formations", "catalogue", "courses", "cours", "liste", "offre", "opleidingen", "schulungen", "corsi"]
    },
    {
      id: "avis", url: "avis.html", title: "Avis clients", titleKey: "search.page_avis_t", descKey: "search.page_avis_d",
      content: "Avis et témoignages des participants aux formations Wisy Safety.",
      keywords: ["avis", "reviews", "temoignages", "feedback", "opinions", "retours", "satisfaction", "bewertungen", "recensioni"]
    },
    {
      id: "contact", url: "contact.html", title: "Contact", titleKey: "search.page_contact_t", descKey: "search.page_contact_d",
      content: "Coordonnées de Wisy Safety : téléphone, e-mail, adresse à Anderlecht et formulaire de contact.",
      keywords: ["contact", "adresse", "telephone", "email", "coordonnees", "joindre", "kontakt"]
    },
    {
      id: "inscription", url: "inscription.html", title: "Inscription", titleKey: "search.page_inscription_t", descKey: "search.page_inscription_d",
      content: "Formulaire d'inscription en ligne aux formations Wisy Safety.",
      keywords: ["inscription", "inscrire", "register", "registration", "enroll", "signup", "s'inscrire", "reserver", "anmeldung", "iscrizione"]
    },
    {
      id: "faq", url: "faq.html", title: "Centre d'aide", titleKey: "search.page_faq_t", descKey: "search.page_faq_d",
      content: "Centre d'aide Wisy Safety : questions fréquentes sur les formations, l'inscription, les tarifs et les attestations.",
      keywords: ["aide", "centre", "faq", "questions", "centre d'aide", "help", "helpcentrum", "hulp", "hilfe", "aiuto", "ajutor", "assistance", "support"]
    },
    {
      id: "agenda", url: "agenda.html", title: "Agenda des formations", titleKey: "search.page_agenda_t", descKey: "search.page_agenda_d",
      content: "Agenda des formations Wisy Safety : la page qui accueillera les prochaines sessions, leurs horaires et leurs disponibilités. L'agenda en ligne arrive prochainement : aucune date n'y est publiée pour le moment.",
      keywords: ["agenda", "calendrier", "dates", "date", "sessions", "session", "prochaines", "prochaine", "horaires", "planning", "quand", "disponibilites", "calendar", "schedule", "upcoming", "termine", "kalender", "calendario", "urnik", "program", "datum"]
    },
    {
      id: "peb", url: "peb-wallonie-bruxelles.html", title: "Devenez certificateur PEB", titleKey: "search.page_peb_t", descKey: "search.page_peb_d",
      content: "Devenir certificateur PEB (performance énergétique des bâtiments) en Wallonie ou à Bruxelles : conditions d'accès, formation réglementaire, examen, demande d'agrément et sessions. Les deux Régions ont des procédures et des autorités distinctes : un agrément wallon ou bruxellois ne permet d'exercer que dans sa propre Région. Tarif de la formation Wisy Safety communiqué sur demande.",
      keywords: ["peb", "certificateur peb", "certificateur peb bruxelles", "certificateur peb wallonie", "formation peb", "formation peb bruxelles", "formation peb wallonie", "formation certificateur peb", "performance energetique des batiments", "performance energetique batiment", "agrement peb", "agrement certificateur peb", "examen peb", "examen certificateur peb", "prix peb", "prix formation peb", "tarif peb", "devenir certificateur", "devenir certificateur peb", "spw energie", "bruxelles environnement", "epb", "certificateur epb", "energieprestatie", "energy performance certificate"]
    }
  ];

  /* ---------------------------------------------------------------------
     Accès (toujours des COPIES : un consommateur ne peut pas corrompre le registre)
     --------------------------------------------------------------------- */
  function clone(o) {
    var c = {};
    Object.keys(o).forEach(function (k) { c[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; });
    return c;
  }
  function buildFormations() {
    return CATALOGUE.map(function (f) {
      if (f.fromTrainings) {
        var t = Trainings && Trainings.get ? Trainings.get(f.id) : null;
        return t ? fromTrainings(t) : null;
      }
      return clone(f);
    }).filter(Boolean);
  }
  var FORMATIONS = buildFormations();

  function categories() { return CATEGORIES.map(clone); }
  function category(id) { return CATEGORIES.filter(function (c) { return c.id === id; }).map(clone)[0] || null; }
  function formations() { return FORMATIONS.map(clone); }
  function formation(id) { return FORMATIONS.filter(function (f) { return f.id === id; }).map(clone)[0] || null; }
  function formationsByCategory(cat) { return FORMATIONS.filter(function (f) { return f.category === cat; }).map(clone); }
  function pages() { return PAGES.map(clone); }
  function page(id) { return PAGES.filter(function (p) { return p.id === id; }).map(clone)[0] || null; }

  /* Chemin (sans ancre ni requête) d'une URL interne. */
  function pathOf(url) { return String(url || "").split("#")[0].split("?")[0]; }

  /* Tous les chemins de pages HTML publiques : pages + pages dédiées de formation.
     (Sert d'allow-list à l'assistant et de base au sitemap.) */
  function publicPaths() {
    var seen = {}, out = [];
    PAGES.map(function (p) { return p.url; })
      .concat(FORMATIONS.filter(function (f) { return f.dedicatedPage; }).map(function (f) { return pathOf(f.url); }))
      .forEach(function (u) { if (!seen[u]) { seen[u] = 1; out.push(u); } });
    return out;
  }

  /* URL absolue canonique d'un chemin du site ; la page d'accueil est la racine « / ». */
  function absoluteUrl(path) {
    var p = String(path || "");
    return p === "index.html" || p === "" || p === "/" ? ORIGIN + "/" : ORIGIN + "/" + p.replace(/^\//, "");
  }

  return {
    ORIGIN: ORIGIN,
    SITE_NAME: SITE_NAME,
    VERIFIED_AT: VERIFIED_AT,
    categories: categories,
    category: category,
    formations: formations,
    formation: formation,
    formationsByCategory: formationsByCategory,
    pages: pages,
    page: page,
    publicPaths: publicPaths,
    absoluteUrl: absoluteUrl,
    pathOf: pathOf
  };
});
