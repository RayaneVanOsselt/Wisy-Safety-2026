/* =========================================================================
   WISY SAFETY — Centre d'aide · Base de données de la FAQ (SOURCE UNIQUE)
   -------------------------------------------------------------------------
   Toutes les questions/réponses du Centre d'aide (faq.html) sont définies
   ICI, une seule fois. La page génère AUTOMATIQUEMENT à partir de ce fichier :
   navigation par catégorie, questions populaires, accordéons, compteur de
   résultats, recherche et données structurées (JSON-LD FAQPage).
   → Pour ajouter/modifier une réponse : éditez le tableau `ITEMS` ci-dessous.
   → Pour ajouter une catégorie : ajoutez une entrée à `CATEGORIES` (l'`id`
     doit correspondre au champ `category` d'au moins une question).

   VÉRACITÉ — RÈGLE ABSOLUE
   Ne figurent ici QUE des informations confirmées par les données réelles du
   site : js/trainings-data.js (registre des formations), js/registration-data.js
   (catalogue d'inscription), js/assistant/knowledge.js (base de l'assistant),
   en-tête / pied de page (coordonnées, horaires). Aucune certification, aucun
   agrément, aucun prix, aucune durée, aucune obligation réglementaire ni
   garantie commerciale n'est inventé. Lorsqu'une information n'est pas
   disponible, la réponse renvoie honnêtement vers le contact humain — comme le
   fait déjà l'assistant.

   ⚠ Rappel « nacelles » (js/trainings-data.js → `unconfirmed`) : ne jamais
   présenter la formation Nacelles élévatrices comme certifiante / agréée /
   reconnue / obligatoire, ni évoquer un CACES, tant que Wisy Safety ne l'a pas
   confirmé.

   CONTENU PROVISOIRE — les entrées marquées `provisional: true` contiennent une
   formulation prudente à valider/compléter par Wisy Safety (voir le champ
   `note`, présent uniquement dans le code — jamais affiché aux visiteurs).

   i18n — le contenu des réponses est rédigé en français (langue source du
   site). L'ossature de page (en-tête, pied de page, sélecteur de langue) reste
   traduite via le système i18n existant. La traduction du contenu FAQ dans les
   autres langues est un ajout ultérieur (une clé par champ, même structure).

   Module « dual-mode » : `window.WisyFAQ` dans le navigateur ET `module.exports`
   sous Node (tests) — aucune dépendance, aucun build.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyFAQ = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Date de dernière vérification du contenu face aux données du site. */
  var VERIFIED_AT = "2026-09-19";

  /* ---------------------------------------------------------------------
     CATÉGORIES — navigation par intention.
     `icon` = clé SVG dessinée dans faq.html (icônes linéaires maison).
     --------------------------------------------------------------------- */
  var CATEGORIES = [
    { id: "choisir",      label: "Choisir ma formation",        tagline: "Trouver l'offre adaptée à votre objectif", icon: "compass" },
    { id: "inscription",  label: "Inscription & prérequis",     tagline: "S'inscrire et savoir si vous êtes concerné", icon: "clipboard" },
    { id: "deroulement",  label: "Déroulement des formations",  tagline: "Durée, format et organisation",            icon: "steps" },
    { id: "attestations", label: "Attestations & certifications", tagline: "Ce qui vous est remis à l'issue",        icon: "award" },
    { id: "entreprises",  label: "Entreprises & équipes",       tagline: "Former plusieurs collaborateurs",          icon: "team" },
    { id: "pratique",     label: "Questions pratiques",         tagline: "Tarifs, paiement et contact",              icon: "info" }
  ];

  /* ---------------------------------------------------------------------
     QUESTIONS — `answer` est du texte simple (pas de HTML) : cela permet la
     mise en évidence sûre du terme recherché et une génération fiable du
     JSON-LD. Les liens d'action sont fournis par les blocs CTA de la page.
     Champs : id · category · question · answer · featured? · provisional? · note?
     --------------------------------------------------------------------- */
  var ITEMS = [
    /* ---- Choisir ma formation ---------------------------------------- */
    {
      id: "faq-choisir-adaptee",
      category: "choisir",
      featured: true,
      question: "Comment choisir la formation adaptée à mon besoin ?",
      answer: "Notre catalogue s'organise autour de quatre domaines : Sécurité, Secours, Technique et Management. Partez de votre objectif — travailler en sécurité sur chantier, maîtriser les gestes de premiers secours, conduire une nacelle élévatrice ou manipuler des substances dangereuses — puis explorez les formations correspondantes depuis la page Formations. Si vous hésitez, notre équipe vous aide à identifier la formation la plus adaptée à votre situation."
    },
    {
      id: "faq-choisir-catalogue",
      category: "choisir",
      question: "Quelles formations proposez-vous ?",
      answer: "Nous proposons aujourd'hui six formations : VCA Base, VCA Ligne hiérarchique, Nacelles élévatrices, Fibre optique, BEPS – Premier secours, ainsi que Diisocyanates & substances dangereuses. Le détail de chaque programme est présenté sur la page Formations."
    },
    {
      id: "faq-choisir-vca-difference",
      category: "choisir",
      question: "Quelle est la différence entre la VCA Base et la VCA Ligne hiérarchique ?",
      answer: "La VCA Base dure 1 jour et s'adresse à l'ensemble des collaborateurs de terrain : elle couvre les fondamentaux de la sécurité. La VCA Ligne hiérarchique dure 2 jours et vise les cadres et responsables opérationnels qui encadrent des équipes."
    },
    {
      id: "faq-choisir-langues",
      category: "choisir",
      question: "Les formations sont-elles disponibles en plusieurs langues ?",
      answer: "Cela dépend de la formation. La formation Nacelles élévatrices est par exemple proposée en français, en néerlandais et en anglais. Pour connaître les langues disponibles pour une formation ou une session précise, contactez-nous."
    },

    /* ---- Inscription & prérequis ------------------------------------- */
    {
      id: "faq-inscription-comment",
      category: "inscription",
      question: "Comment s'inscrire à une formation ?",
      answer: "Vous pouvez vous inscrire directement en ligne depuis la page Inscription : choisissez votre formation, indiquez le nombre de participants et renseignez vos coordonnées. Si vous préférez être accompagné dans votre choix, contactez-nous et nous finalisons l'inscription avec vous."
    },
    {
      id: "faq-inscription-prerequis",
      category: "inscription",
      featured: true,
      question: "Quels sont les prérequis pour participer ?",
      answer: "Les prérequis éventuels dépendent de la formation choisie. La formation Nacelles élévatrices, par exemple, s'adresse aux opérateurs, aux techniciens de maintenance, au personnel d'entretien et à toute personne amenée à utiliser une nacelle dans le cadre de son travail. Pour connaître les prérequis précis d'une formation, contactez-nous."
    },
    {
      id: "faq-inscription-dates",
      category: "inscription",
      question: "Puis-je choisir la date de ma formation ?",
      answer: "Les dates de session ne sont pas encore publiées en ligne. Indiquez vos disponibilités au moment de votre demande, ou contactez-nous : nous fixons ensemble la session qui vous convient."
    },
    {
      id: "faq-inscription-confirmation",
      category: "inscription",
      provisional: true,
      note: "PROVISOIRE — le processus exact de confirmation d'inscription n'est pas documenté dans les données du site. À confirmer/compléter par Wisy Safety.",
      question: "Comment savoir si mon inscription est confirmée ?",
      answer: "Après l'envoi de votre demande, notre équipe vous recontacte pour confirmer la session et les modalités pratiques. Pour toute question sur une inscription en cours, contactez-nous."
    },

    /* ---- Déroulement des formations ---------------------------------- */
    {
      id: "faq-deroulement-comment",
      category: "deroulement",
      question: "Comment se déroule une formation ?",
      answer: "Nos formations durent de 1 à 3 jours selon le programme, sont animées par des formateurs expérimentés et alternent théorie et pratique. Pour les dates précises et l'organisation, le mieux est de nous contacter."
    },
    {
      id: "faq-deroulement-duree",
      category: "deroulement",
      question: "Combien de temps dure une formation ?",
      answer: "La durée varie de 1 à 3 jours selon la formation : par exemple 1 jour pour la VCA Base ou les Nacelles élévatrices, 2 jours pour la VCA Ligne hiérarchique, et 3 jours pour la Fibre optique comme pour le BEPS – Premier secours."
    },
    {
      id: "faq-deroulement-theorie-pratique",
      category: "deroulement",
      question: "Les formations sont-elles théoriques ou pratiques ?",
      answer: "Elles associent généralement théorie et pratique. La formation Nacelles élévatrices combine par exemple une partie théorique et une mise en pratique, et la Fibre optique comprend une pratique de terrain avec l'équipement fourni."
    },
    {
      id: "faq-deroulement-lieu",
      category: "deroulement",
      question: "Où ont lieu les formations ?",
      answer: "Wisy Safety est un centre de formation situé à Anderlecht (1070), à Bruxelles. Pour une formation organisée dans vos locaux ou une intervention sur site, contactez-nous."
    },

    /* ---- Attestations & certifications ------------------------------- */
    {
      id: "faq-attestations-recevoir",
      category: "attestations",
      featured: true,
      question: "Que vais-je recevoir après ma formation ?",
      answer: "Cela dépend de la formation suivie. Plusieurs de nos formations débouchent sur une reconnaissance officielle : la VCA Base inclut un examen agréé et le BEPS prépare au brevet européen de premiers secours. Pour savoir précisément ce qui vous est remis à l'issue d'une formation donnée, contactez-nous."
    },
    {
      id: "faq-attestations-vca-examen",
      category: "attestations",
      question: "La formation VCA débouche-t-elle sur un examen ?",
      answer: "Oui : la VCA Base inclut un examen agréé. Pour les modalités de l'examen (déroulé, langue, conditions), contactez-nous."
    },
    {
      id: "faq-attestations-nacelle",
      category: "attestations",
      /* ⚠ Réponse volontairement prudente : la formation Nacelles élévatrices
         n'est PAS présentée comme certifiante/agréée (voir `unconfirmed` dans
         js/trainings-data.js). Ne pas modifier sans confirmation de Wisy Safety. */
      question: "La formation Nacelles élévatrices est-elle certifiante ?",
      answer: "La formation Nacelles élévatrices a pour objectif de vous apprendre à utiliser les nacelles élévatrices en toute sécurité et à identifier les risques associés. Pour toute question sur la reconnaissance de cette formation, contactez notre équipe."
    },

    /* ---- Entreprises & équipes --------------------------------------- */
    {
      id: "faq-entreprises-plusieurs",
      category: "entreprises",
      featured: true,
      question: "Puis-je inscrire plusieurs collaborateurs ?",
      answer: "Oui. Lors de l'inscription en ligne, vous pouvez préciser le nombre de participants pour chaque formation. Pour former une équipe complète ou planifier plusieurs sessions, contactez-nous : nous adaptons l'organisation à votre entreprise."
    },
    {
      id: "faq-entreprises-sur-site",
      category: "entreprises",
      question: "Organisez-vous des formations en entreprise ou sur site ?",
      answer: "Pour l'organisation d'une formation dédiée à votre entreprise ou une intervention sur site, contactez-nous afin d'étudier votre besoin ensemble."
    },
    {
      id: "faq-entreprises-devis",
      category: "entreprises",
      question: "Pouvez-vous établir un devis ?",
      answer: "Oui. Décrivez-nous votre besoin — formation souhaitée, nombre de participants, échéance — et nous vous transmettons une proposition adaptée."
    },

    /* ---- Questions pratiques ----------------------------------------- */
    {
      id: "faq-pratique-tarifs",
      category: "pratique",
      question: "Quels sont les tarifs des formations ?",
      answer: "Les tarifs varient selon la formation et le contexte (participant individuel ou entreprise). Une partie des tarifs est indiquée au moment de l'inscription en ligne ; certaines formations sont proposées sur devis. Pour un tarif adapté à votre besoin, contactez-nous."
    },
    {
      id: "faq-pratique-tva",
      category: "pratique",
      question: "Les prix affichés incluent-ils la TVA ?",
      answer: "Les tarifs indiqués sont exprimés hors TVA (HT). Le montant définitif vous est confirmé lors de votre inscription."
    },
    {
      id: "faq-pratique-paiement",
      category: "pratique",
      provisional: true,
      note: "PROVISOIRE — le paiement en ligne n'est pas encore actif (js/registration-data.js → payment.ready = false). Mettre à jour dès que le paiement sera disponible.",
      question: "Comment se passe le paiement ?",
      answer: "Une fois votre demande d'inscription transmise, notre équipe vous communique les modalités de paiement et de facturation. Pour toute question sur le règlement, contactez-nous."
    },
    {
      id: "faq-pratique-contact",
      category: "pratique",
      question: "Comment contacter Wisy Safety si je ne trouve pas ma réponse ?",
      answer: "Vous pouvez nous joindre par téléphone au +32 2 318 86 59, par e-mail à info@wisysafety.be, ou via le formulaire de la page Contact. Nous sommes disponibles du lundi au jeudi, de 10h00 à 16h00."
    },
    {
      id: "faq-pratique-assistant",
      category: "pratique",
      question: "Puis-je poser une question directement en ligne ?",
      answer: "Oui : l'assistant Wisy, accessible en bas de chaque page, répond à vos questions courantes à tout moment. Pour un échange personnalisé, notre équipe reste joignable via la page Contact."
    }
  ];

  /* ---------------------------------------------------------------------
     Helpers (partagés navigateur + tests)
     --------------------------------------------------------------------- */
  function categories() { return CATEGORIES.slice(); }
  function items() { return ITEMS.slice(); }

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function byCategory(id) {
    return ITEMS.filter(function (it) { return it.category === id; });
  }

  function featured() {
    return ITEMS.filter(function (it) { return it.featured === true; });
  }

  /* Nombre de questions par catégorie — { choisir: 4, ... } */
  function counts() {
    var out = {};
    CATEGORIES.forEach(function (c) { out[c.id] = 0; });
    ITEMS.forEach(function (it) {
      if (out[it.category] == null) out[it.category] = 0;
      out[it.category] += 1;
    });
    return out;
  }

  /* Données structurées Schema.org FAQPage — construites depuis la MÊME source
     que la page : elles ne peuvent donc jamais contenir une question absente de
     la page (exigence SEO). */
  function toStructuredData() {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": ITEMS.map(function (it) {
        return {
          "@type": "Question",
          "name": it.question,
          "acceptedAnswer": { "@type": "Answer", "text": it.answer }
        };
      })
    };
  }

  return {
    VERIFIED_AT: VERIFIED_AT,
    CATEGORIES: CATEGORIES,
    ITEMS: ITEMS,
    categories: categories,
    items: items,
    categoryById: categoryById,
    byCategory: byCategory,
    featured: featured,
    counts: counts,
    toStructuredData: toStructuredData
  };
});
