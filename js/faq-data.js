/* =========================================================================
   WISY SAFETY — Centre d'aide · Base de données de la FAQ (SOURCE UNIQUE)
   -------------------------------------------------------------------------
   Toutes les questions/réponses du Centre d'aide (faq.html) sont définies
   ICI, une seule fois. Ce fichier alimente TROIS consommateurs :
     1. la page faq.html (catégories, accordéons, recherche, JSON-LD FAQPage) ;
     2. l'assistant Wisy (js/assistant/knowledge.js → responder.js) ;
     3. la copie serveur optionnelle (supabase/functions/chat/faq.generated.ts,
        régénérée par `node scripts/sync-faq-edge.js` — un test vérifie qu'elle
        n'a pas dérivé).
   Le moteur de recherche partagé (normalisation, synonymes, score) vit dans
   js/faq-search.js : la page et l'assistant interrogent donc EXACTEMENT les
   mêmes données avec EXACTEMENT la même logique.

   COMMENT MODIFIER
   → Ajouter/modifier une réponse : éditez le tableau `ITEMS` ci-dessous.
   → Ajouter une catégorie : ajoutez une entrée à `CATEGORIES` (son `id` doit
     être utilisé par au moins une question : une catégorie vide n'est jamais
     affichée et un test l'interdit).
   Schéma d'une question :
     id                 « faq-<catégorie>-<slug> », unique et stable (ancre #id)
     category           id de catégorie
     question           se termine par « ? », ≤ 80 caractères (chips de l'assistant)
     answer             texte simple. Paragraphes séparés par une ligne vide ;
                        une ligne commençant par « - » = puce de liste. Jamais de HTML.
     keywords           mots-clés forts (recherche + assistant, non affichés)
     synonyms           autres formulations / termes alternatifs (non affichés)
     relatedQuestions   ids de 1 à 3 questions liées (proposées après la réponse)
     action             (optionnel) prochaine étape utile : clé de `ACTIONS`
     featured           (optionnel) question mise en avant (« essentielles »)
     provisional / note (optionnel) réponse prudente à valider par Wisy Safety
                        (la `note` reste dans le code, jamais affichée)

   VÉRACITÉ — RÈGLE ABSOLUE
   Ne figurent ici QUE des informations confirmées par les données réelles du
   site : js/trainings-data.js (registre des formations), js/registration-data.js
   et le parcours d'inscription (js/i18n-data-inscription.js), la page
   Formations, l'en-tête / le pied de page (coordonnées, horaires). Aucune
   certification, aucun agrément, aucun prix, aucune durée, aucune obligation
   réglementaire ni garantie commerciale n'est inventé. Lorsqu'une information
   n'est pas disponible, la réponse renvoie honnêtement vers le contact humain.

   ⚠ Rappel « nacelles » (js/trainings-data.js → `unconfirmed`) : ne jamais
   présenter la formation Nacelles élévatrices comme certifiante / agréée /
   reconnue / obligatoire, ni évoquer un CACES, tant que Wisy Safety ne l'a pas
   confirmé. (Le terme « caces » n'est reconnu que côté requête, dans le moteur
   de recherche, pour orienter vers la réponse prudente.)

   i18n — le contenu est rédigé en français (langue source du site) ; c'est CE fichier
   qui fait foi (identifiants, catégories, liens entre questions, actions, questions
   « provisoires »). Les traductions vivent à part, en un fichier par langue :
   js/faq-i18n/faq-<langue>.js, chargé à la demande par faq.html, qui appelle
   `WisyFAQ.register(langue, { categories, actions, popular, items })`. Une traduction
   ne fait que REMPLACER des textes (question, réponse, mots-clés, synonymes, libellés)
   pour des identifiants existants : la structure, les liens et les drapeaux restent
   ceux d'ici. Toutes les fonctions d'accès acceptent un dernier argument `lang`
   facultatif ; sans lui (assistant, tests, copie serveur) elles renvoient le français.
   L'ossature de la page (titres, boutons, messages) est traduite via le dictionnaire
   js/i18n-data-faq.js.

   Module « dual-mode » : `window.WisyFAQ` dans le navigateur ET `module.exports`
   sous Node (tests) — aucune dépendance, aucun build.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyFAQ = Object.assign(root.WisyFAQ || {}, api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Date de dernière vérification du contenu face aux données du site. */
  var VERIFIED_AT = "2026-09-20";

  /* ---------------------------------------------------------------------
     Coordonnées réelles (en-tête, pied de page, contact.html).
     Source unique pour les réponses ET pour l'assistant (knowledge.js).
     --------------------------------------------------------------------- */
  var CONTACT = {
    company: "Wisy Safety",
    email: "info@wisysafety.be",
    phone: "+32 2 318 86 59",
    phoneHref: "tel:+3223188659",
    street: "Avenue d'Itterbeek 378",
    city: "Anderlecht",
    postalCode: "1070",
    region: "Bruxelles",
    /* Horaires du pied de page : lundi→jeudi 10:00–16:00, vendredi/week-end fermé. */
    hours: "Du lundi au jeudi, de 10h00 à 16h00",
    contactUrl: "contact.html",
    /* Faits STRUCTURÉS (données Schema.org générées par scripts/build-seo.js) : mêmes horaires que le
       pied de page ; latitude / longitude = celles de la carte intégrée à l'accueil (Google Maps).
       tests/seo.test.js vérifie qu'ils ne divergent pas de ces deux sources. */
    openingHours: [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "10:00", closes: "16:00" }],
    geo: { latitude: 50.834996, longitude: 4.276271 }
  };

  /* ---------------------------------------------------------------------
     ACTIONS — prochaines étapes utiles, uniquement vers des routes RÉELLES.
     Rendues en bouton-lien sous la réponse (page) et en carte (assistant).
     `assistant` n'a pas de route : ouvre l'assistant (page uniquement).
     --------------------------------------------------------------------- */
  var ACTIONS = {
    formations:  { label: "Voir les formations",             href: "formations.html" },
    inscription: { label: "Accéder à l'inscription",         href: "inscription.html" },
    contact:     { label: "Contacter l'équipe",              href: "contact.html" },
    agenda:      { label: "Consulter l'agenda",              href: "agenda.html" },
    nacelle:     { label: "Découvrir la formation Nacelles", href: "formation-nacelles-elevatrices.html" },
    assistant:   { label: "Poser la question à l'assistant", href: null }
  };

  /* ---------------------------------------------------------------------
     CATÉGORIES — navigation par intention.
     `icon` = clé SVG dessinée dans faq.html (icônes linéaires maison).
     --------------------------------------------------------------------- */
  var CATEGORIES = [
    { id: "choisir",      label: "Choisir ma formation",          tagline: "Trouver l'offre adaptée à votre objectif",      icon: "compass" },
    { id: "inscription",  label: "Inscription & prérequis",       tagline: "S'inscrire et savoir si vous êtes concerné",    icon: "clipboard" },
    { id: "tarifs",       label: "Tarifs & paiement",             tagline: "Prix, TVA, règlement et financement",           icon: "tag" },
    { id: "deroulement",  label: "Organisation des formations",   tagline: "Durée, format, lieu et accessibilité",          icon: "steps" },
    { id: "attestations", label: "Attestations & certifications", tagline: "Ce qui vous est remis à l'issue",               icon: "award" },
    { id: "entreprises",  label: "Entreprises & équipes",         tagline: "Former plusieurs collaborateurs",               icon: "team" },
    { id: "contact",      label: "Contact & assistance",          tagline: "Nous joindre, horaires et assistant en ligne",  icon: "chat" }
  ];

  /* ---------------------------------------------------------------------
     RECHERCHES POPULAIRES — raccourcis affichés sous la barre de recherche.
     Chaque `query` DOIT renvoyer au moins un résultat (test).
     --------------------------------------------------------------------- */
  var POPULAR = [
    { label: "Inscriptions",   query: "inscription" },
    { label: "Tarifs",         query: "tarifs" },
    { label: "Financement",    query: "financement" },
    { label: "Certifications", query: "certification" },
    { label: "Formations",     query: "formations" },
    { label: "Délais",         query: "délais" }
  ];

  /* ---------------------------------------------------------------------
     QUESTIONS
     --------------------------------------------------------------------- */
  var ITEMS = [
    /* ==== Choisir ma formation ========================================== */
    {
      id: "faq-choisir-adaptee",
      category: "choisir",
      featured: true,
      question: "Comment choisir la formation adaptée à mon besoin ?",
      answer: "Notre catalogue s'organise autour de quatre domaines : Sécurité, Secours, Technique et Management.\n\n" +
        "Partez de votre objectif — travailler en sécurité sur chantier, maîtriser les gestes de premiers secours, conduire une nacelle élévatrice ou manipuler des substances dangereuses — puis explorez les formations correspondantes depuis la page Formations.\n\n" +
        "Si vous hésitez, notre équipe vous aide à identifier la formation la plus adaptée à votre situation.",
      keywords: ["choisir", "orientation", "catalogue", "domaines", "objectif", "conseil", "quelle formation"],
      synonyms: ["quelle formation choisir", "aide au choix", "je ne sais pas quelle formation", "conseiller", "orienter", "hésiter", "être conseillé"],
      relatedQuestions: ["faq-choisir-catalogue", "faq-choisir-vca-difference", "faq-inscription-comment"],
      action: "formations"
    },
    {
      id: "faq-choisir-catalogue",
      category: "choisir",
      question: "Quelles formations proposez-vous ?",
      answer: "Nous proposons aujourd'hui six formations :\n" +
        "- VCA Base\n" +
        "- VCA Ligne hiérarchique\n" +
        "- Nacelles élévatrices\n" +
        "- Fibre optique\n" +
        "- BEPS – Premier secours\n" +
        "- Diisocyanates & substances dangereuses\n\n" +
        "Le détail de chaque programme est présenté sur la page Formations.",
      keywords: ["formations", "catalogue", "liste", "offre", "programme", "six formations", "vca", "nacelle", "fibre", "beps", "diisocyanates"],
      synonyms: ["cours", "que proposez-vous", "quelles formations", "domaines", "thèmes", "sujets", "toutes les formations"],
      relatedQuestions: ["faq-choisir-adaptee", "faq-deroulement-duree", "faq-inscription-comment"],
      action: "formations"
    },
    {
      id: "faq-choisir-vca-difference",
      category: "choisir",
      question: "Quelle est la différence entre la VCA Base et la VCA Ligne hiérarchique ?",
      answer: "- VCA Base (1 jour) : elle s'adresse à l'ensemble des collaborateurs de terrain et couvre les fondamentaux de la sécurité.\n" +
        "- VCA Ligne hiérarchique (2 jours) : elle vise les cadres et responsables opérationnels qui encadrent des équipes.",
      keywords: ["vca", "vca base", "ligne hiérarchique", "différence", "base", "cadre", "responsable", "encadrement", "b-vca", "vol-vca"],
      synonyms: ["comparer", "lequel choisir", "niveau", "manager", "chef d'équipe", "superviseur"],
      relatedQuestions: ["faq-deroulement-duree", "faq-attestations-vca-examen", "faq-choisir-catalogue"]
    },
    {
      id: "faq-choisir-langues",
      category: "choisir",
      question: "Les formations sont-elles disponibles en plusieurs langues ?",
      answer: "Cela dépend de la formation. La formation Nacelles élévatrices est par exemple proposée en français, en néerlandais et en anglais. Pour connaître les langues disponibles pour une formation ou une session précise, contactez-nous.",
      keywords: ["langue", "langues", "français", "néerlandais", "anglais", "nl", "fr", "en"],
      synonyms: ["flamand", "dutch", "english", "traduction", "en néerlandais", "en anglais", "bilingue", "nederlands"],
      relatedQuestions: ["faq-inscription-prerequis", "faq-deroulement-lieu", "faq-entreprises-sur-site"],
      action: "contact"
    },

    /* ==== Inscription & prérequis ======================================= */
    {
      id: "faq-inscription-comment",
      category: "inscription",
      question: "Comment s'inscrire à une formation ?",
      answer: "Vous pouvez vous inscrire directement en ligne depuis la page Inscription : choisissez votre formation, indiquez le nombre de participants et renseignez vos coordonnées.\n\n" +
        "Si vous préférez être accompagné dans votre choix, contactez-nous et nous finalisons l'inscription avec vous.",
      keywords: ["inscription", "inscrire", "s'inscrire", "réserver", "formulaire", "en ligne"],
      synonyms: ["m'inscrire", "je veux m'inscrire", "réservation", "enregistrer", "participer", "comment faire", "procédure", "démarches"],
      relatedQuestions: ["faq-inscription-informations", "faq-inscription-participants", "faq-tarifs-paiement"],
      featured: true,
      action: "inscription"
    },
    {
      id: "faq-inscription-prerequis",
      category: "inscription",
      featured: true,
      question: "Quels sont les prérequis pour participer ?",
      answer: "Les prérequis éventuels dépendent de la formation choisie. La formation Nacelles élévatrices, par exemple, s'adresse aux opérateurs, aux techniciens de maintenance, au personnel d'entretien et à toute personne amenée à utiliser une nacelle dans le cadre de son travail.\n\n" +
        "Pour connaître les prérequis précis d'une formation, contactez-nous.",
      keywords: ["prérequis", "conditions", "niveau requis", "public", "destinataires", "pour qui"],
      synonyms: ["pré-requis", "conditions d'accès", "est-ce pour moi", "qui peut participer", "expérience", "diplôme", "âge", "profil", "à qui s'adresse"],
      relatedQuestions: ["faq-choisir-adaptee", "faq-inscription-comment", "faq-contact-contact"],
      action: "contact"
    },
    {
      id: "faq-inscription-informations",
      category: "inscription",
      question: "Quelles informations dois-je fournir pour m'inscrire ?",
      answer: "L'inscription en ligne vous demande :\n" +
        "- les formations souhaitées et le nombre de participants ;\n" +
        "- les coordonnées de la personne responsable de l'inscription ;\n" +
        "- les informations de facturation : entreprise, numéro de TVA et adresse.\n\n" +
        "Ces informations figurent sur votre confirmation et votre facture.",
      keywords: ["informations", "données", "coordonnées", "facturation", "tva", "documents", "renseignements"],
      synonyms: ["documents à fournir", "ce qu'il faut fournir", "papiers", "numéro de tva", "adresse de facturation", "champs du formulaire", "dossier", "pièces"],
      relatedQuestions: ["faq-inscription-comment", "faq-inscription-participants", "faq-tarifs-tva"],
      action: "inscription"
    },
    {
      id: "faq-inscription-participants",
      category: "inscription",
      question: "Dois-je connaître le nom des participants dès l'inscription ?",
      answer: "Non. Lors de l'inscription en ligne, vous pouvez renseigner les participants pour chaque formation, ou les communiquer plus tard, après la confirmation de l'inscription.",
      keywords: ["participants", "noms", "plus tard", "liste", "communiquer"],
      synonyms: ["noms des participants", "sans les noms", "ajouter des noms plus tard", "stagiaires", "personnes", "prénoms"],
      relatedQuestions: ["faq-inscription-informations", "faq-entreprises-plusieurs", "faq-inscription-confirmation"]
    },
    {
      id: "faq-inscription-plusieurs-formations",
      category: "inscription",
      question: "Puis-je m'inscrire à plusieurs formations en une seule fois ?",
      answer: "Oui. Le parcours d'inscription vous permet d'ajouter une ou plusieurs formations, puis d'ajuster le nombre de participants pour chacune. Le récapitulatif de votre inscription se met à jour au fur et à mesure.",
      keywords: ["plusieurs formations", "sélection", "ajouter", "cumuler", "récapitulatif"],
      synonyms: ["combiner", "plusieurs cours", "deux formations", "enchaîner", "panier", "en une seule fois"],
      relatedQuestions: ["faq-entreprises-plusieurs", "faq-tarifs-prix", "faq-inscription-comment"],
      action: "inscription"
    },
    {
      id: "faq-inscription-dates",
      category: "inscription",
      question: "Puis-je choisir la date de ma formation ?",
      answer: "Les dates et horaires des sessions ne sont pas encore publiés en ligne : la page Agenda les accueillera prochainement. En attendant, contactez-nous pour connaître les prochaines disponibilités.",
      keywords: ["dates", "session", "sessions", "calendrier", "agenda", "planning", "quand", "prochaine", "disponibilités", "délai"],
      synonyms: ["prochaines dates", "agenda", "horaires de la formation", "à quelle date", "délais", "date de début", "jour de la formation", "urgent", "rapidement"],
      relatedQuestions: ["faq-inscription-confirmation", "faq-deroulement-duree", "faq-contact-horaires"],
      action: "agenda"
    },
    {
      id: "faq-inscription-confirmation",
      category: "inscription",
      provisional: true,
      note: "PROVISOIRE — le processus exact de confirmation d'une inscription n'est pas documenté dans les données du site (le parcours en ligne ne transmet pas encore de demande). À confirmer/compléter par Wisy Safety.",
      question: "Comment savoir si mon inscription est confirmée ?",
      answer: "Votre inscription en ligne aboutit à un récapitulatif de votre demande. Pour confirmer une session, ou pour toute question sur une inscription en cours, contactez-nous.",
      keywords: ["confirmation", "confirmer", "confirmée", "validation", "récapitulatif", "suivi"],
      synonyms: ["mon inscription est-elle prise en compte", "accusé de réception", "e-mail de confirmation", "statut", "délai de confirmation", "délai de réponse"],
      relatedQuestions: ["faq-inscription-dates", "faq-tarifs-paiement", "faq-contact-contact"],
      action: "contact"
    },
    {
      id: "faq-inscription-annulation",
      category: "inscription",
      provisional: true,
      note: "PROVISOIRE — aucune condition d'annulation ni de report n'est publiée (les conditions générales ne sont pas encore en ligne). À compléter par Wisy Safety.",
      question: "Puis-je annuler ou reporter mon inscription ?",
      answer: "Les conditions d'annulation et de report ne sont pas détaillées en ligne pour le moment. Pour modifier, reporter ou annuler une inscription, contactez-nous.",
      keywords: ["annulation", "annuler", "reporter", "report", "modifier", "remboursement"],
      synonyms: ["se désister", "désistement", "changer de date", "déplacer", "empêchement", "remboursé", "modification d'inscription", "conditions d'annulation"],
      relatedQuestions: ["faq-contact-contact", "faq-inscription-confirmation", "faq-inscription-dates"],
      action: "contact"
    },

    /* ==== Tarifs & paiement ============================================= */
    {
      id: "faq-tarifs-prix",
      category: "tarifs",
      featured: true,
      question: "Quels sont les tarifs des formations ?",
      answer: "Les tarifs varient selon la formation et le contexte (participant individuel ou entreprise). Une partie des tarifs est indiquée au moment de l'inscription en ligne ; certaines formations sont proposées sur devis.\n\n" +
        "Pour un tarif adapté à votre besoin, contactez-nous.",
      keywords: ["tarif", "tarifs", "prix", "coût", "combien", "devis"],
      synonyms: ["combien ça coûte", "budget", "montant", "euros", "cher", "prix de la formation", "grille tarifaire", "coût par participant", "gratuit"],
      relatedQuestions: ["faq-tarifs-tva", "faq-tarifs-paiement", "faq-entreprises-devis"],
      action: "contact"
    },
    {
      id: "faq-tarifs-tva",
      category: "tarifs",
      question: "Les prix affichés incluent-ils la TVA ?",
      answer: "Les tarifs indiqués sont exprimés hors TVA (HT). Le taux de TVA applicable n'est pas encore affiché dans le parcours d'inscription en ligne : pour connaître le montant TTC, contactez-nous.",
      keywords: ["tva", "ht", "ttc", "hors taxe"],
      synonyms: ["taxe", "prix ttc", "montant ttc", "taux de tva", "toutes taxes comprises", "hors tva"],
      relatedQuestions: ["faq-tarifs-prix", "faq-tarifs-paiement", "faq-tarifs-financement"],
      action: "contact"
    },
    {
      id: "faq-tarifs-paiement",
      category: "tarifs",
      provisional: true,
      note: "PROVISOIRE — le paiement en ligne n'est pas encore actif (js/registration-data.js → payment.ready = false ; « aucun montant n'est débité pour le moment »). Mettre à jour dès que le paiement sera disponible.",
      question: "Comment se passe le paiement ?",
      answer: "Le paiement en ligne n'est pas encore disponible : aucun montant n'est débité lors de votre inscription en ligne.\n\n" +
        "Pour connaître les modalités de règlement et de facturation, contactez-nous.",
      keywords: ["paiement", "payer", "règlement", "facture", "facturation"],
      synonyms: ["comment payer", "payement", "modalités de paiement", "virement", "carte bancaire", "acompte", "paiement en ligne", "régler", "facturer"],
      relatedQuestions: ["faq-tarifs-tva", "faq-tarifs-financement", "faq-inscription-confirmation"],
      action: "contact"
    },
    {
      id: "faq-tarifs-financement",
      category: "tarifs",
      provisional: true,
      note: "PROVISOIRE — la page Formations affiche le bandeau « Financement possible » sans aucun détail (dispositifs, conditions). À compléter par Wisy Safety.",
      question: "Existe-t-il des aides ou des financements pour suivre une formation ?",
      answer: "La page Formations indique qu'un financement est possible. Les dispositifs et conditions concernés ne sont pas détaillés en ligne : pour savoir ce qui peut s'appliquer à votre projet, contactez-nous.",
      keywords: ["financement", "financer", "subvention", "prise en charge", "aides financières"],
      synonyms: ["aide financière", "subsides", "subside", "fonds de formation", "cpf", "opco", "compte formation", "aide à la formation", "payer la formation", "frais de formation"],
      relatedQuestions: ["faq-tarifs-prix", "faq-tarifs-paiement", "faq-contact-contact"],
      action: "contact"
    },

    /* ==== Organisation des formations =================================== */
    {
      id: "faq-deroulement-comment",
      category: "deroulement",
      question: "Comment se déroule une formation ?",
      answer: "Nos formations durent de 1 à 3 jours selon le programme, sont animées par des formateurs expérimentés et alternent théorie et pratique.\n\n" +
        "Pour les dates précises et l'organisation, le mieux est de nous contacter.",
      keywords: ["déroulement", "organisation", "programme", "format", "fonctionnement", "formateurs"],
      synonyms: ["comment ça se passe", "comment se passe une formation", "journée type", "déroulé", "modalités pratiques", "modalités", "organisée"],
      relatedQuestions: ["faq-deroulement-duree", "faq-deroulement-theorie-pratique", "faq-deroulement-lieu"],
      action: "contact"
    },
    {
      id: "faq-deroulement-duree",
      category: "deroulement",
      question: "Combien de temps dure une formation ?",
      answer: "La durée varie de 1 à 3 jours selon la formation :\n" +
        "- 1 jour : VCA Base, Nacelles élévatrices, Diisocyanates & substances dangereuses ;\n" +
        "- 2 jours : VCA Ligne hiérarchique ;\n" +
        "- 3 jours : Fibre optique, BEPS – Premier secours.",
      keywords: ["durée", "jours", "heures", "combien de temps"],
      synonyms: ["combien de jours", "la formation dure", "durée de la formation", "long", "journée", "1 jour", "2 jours", "3 jours", "longueur"],
      relatedQuestions: ["faq-deroulement-comment", "faq-choisir-vca-difference", "faq-inscription-dates"],
      action: "formations"
    },
    {
      id: "faq-deroulement-theorie-pratique",
      category: "deroulement",
      question: "Les formations sont-elles théoriques ou pratiques ?",
      answer: "Elles associent généralement théorie et pratique. La formation Nacelles élévatrices combine par exemple une partie théorique et une mise en pratique, et la Fibre optique comprend une pratique de terrain avec l'équipement fourni.",
      keywords: ["théorie", "pratique", "exercices", "mise en pratique", "terrain", "équipement"],
      synonyms: ["cours théorique", "travaux pratiques", "matériel", "équipement fourni", "sur machine", "manipulation", "théorique ou pratique"],
      relatedQuestions: ["faq-deroulement-comment", "faq-deroulement-duree", "faq-attestations-recevoir"]
    },
    {
      id: "faq-deroulement-lieu",
      category: "deroulement",
      question: "Où ont lieu les formations ?",
      answer: "Wisy Safety est un centre de formation situé à Anderlecht (1070), à Bruxelles : " + CONTACT.street + ".\n\n" +
        "Pour une formation organisée dans vos locaux ou une intervention sur site, contactez-nous.",
      keywords: ["lieu", "adresse", "anderlecht", "bruxelles", "localisation", "où"],
      synonyms: ["où se trouve", "où se situe", "où êtes-vous", "où se déroule", "où a lieu", "accès", "comment venir", "plan", "itinéraire", "transports", "parking", "centre de formation", "situé"],
      relatedQuestions: ["faq-entreprises-sur-site", "faq-contact-horaires", "faq-contact-contact"],
      action: "contact"
    },
    {
      id: "faq-deroulement-accessibilite",
      category: "deroulement",
      provisional: true,
      note: "PROVISOIRE — aucune information sur l'accessibilité des locaux (PMR) n'est publiée. À compléter par Wisy Safety.",
      question: "Les formations sont-elles accessibles aux personnes à mobilité réduite ?",
      answer: "Nous ne publions pas encore d'informations sur l'accessibilité de nos locaux. Si vous avez des besoins particuliers, contactez-nous avant votre inscription afin d'obtenir une réponse précise.",
      keywords: ["accessibilité", "accessible", "mobilité réduite", "pmr", "handicap"],
      synonyms: ["personne handicapée", "fauteuil roulant", "besoins particuliers", "aménagements", "situation de handicap", "ascenseur", "accès pmr"],
      relatedQuestions: ["faq-deroulement-lieu", "faq-contact-contact", "faq-inscription-comment"],
      action: "contact"
    },

    /* ==== Attestations & certifications ================================= */
    {
      id: "faq-attestations-recevoir",
      category: "attestations",
      featured: true,
      question: "Que vais-je recevoir après ma formation ?",
      answer: "Cela dépend de la formation suivie. Plusieurs de nos formations débouchent sur une reconnaissance officielle :\n" +
        "- la VCA Base inclut un examen agréé ;\n" +
        "- le BEPS prépare au brevet européen de premiers secours.\n\n" +
        "Pour savoir précisément ce qui vous est remis à l'issue d'une formation donnée, contactez-nous.",
      keywords: ["attestation", "certificat", "certification", "diplôme", "brevet", "reconnaissance"],
      synonyms: ["que reçois-je", "ce que je reçois", "document remis", "preuve de formation", "certificat de formation", "attestation de présence", "reconnu", "après la formation", "à l'issue de la formation", "en fin de formation", "document à la fin", "fin de formation"],
      relatedQuestions: ["faq-attestations-vca-examen", "faq-attestations-nacelle", "faq-deroulement-duree"],
      action: "contact"
    },
    {
      id: "faq-attestations-vca-examen",
      category: "attestations",
      question: "La formation VCA débouche-t-elle sur un examen ?",
      answer: "Oui : la VCA Base inclut un examen agréé. Pour les modalités de l'examen (déroulé, langue, conditions), contactez-nous.",
      keywords: ["examen", "vca", "agréé", "test", "évaluation"],
      synonyms: ["passer l'examen", "examen vca", "examen agréé", "qcm", "réussite", "échec", "repasser l'examen", "note"],
      relatedQuestions: ["faq-attestations-recevoir", "faq-choisir-vca-difference", "faq-contact-contact"],
      action: "contact"
    },
    {
      id: "faq-attestations-nacelle",
      category: "attestations",
      /* ⚠ Réponse volontairement prudente : la formation Nacelles élévatrices
         n'est PAS présentée comme certifiante/agréée (voir `unconfirmed` dans
         js/trainings-data.js). Ne pas modifier sans confirmation de Wisy Safety. */
      question: "La formation Nacelles élévatrices est-elle certifiante ?",
      answer: "La formation Nacelles élévatrices a pour objectif de vous apprendre à utiliser les nacelles élévatrices en toute sécurité et à identifier les risques associés. Pour toute question sur la reconnaissance de cette formation, contactez notre équipe.",
      keywords: ["nacelle", "nacelles", "certifiante", "pemp", "mewp", "travail en hauteur"],
      synonyms: ["nacelle élévatrice", "hoogwerker", "reconnue", "agréée", "certificat nacelle", "obligatoire", "réglementaire", "légal", "reconnaissance de la formation"],
      relatedQuestions: ["faq-attestations-recevoir", "faq-deroulement-theorie-pratique", "faq-contact-contact"],
      action: "nacelle"
    },

    /* ==== Entreprises & équipes ========================================= */
    {
      id: "faq-entreprises-plusieurs",
      category: "entreprises",
      question: "Puis-je inscrire plusieurs collaborateurs ?",
      answer: "Oui. Lors de l'inscription en ligne, vous pouvez préciser le nombre de participants pour chaque formation.\n\n" +
        "Pour former une équipe complète ou planifier plusieurs sessions, contactez-nous : nous adaptons l'organisation à votre entreprise.",
      keywords: ["plusieurs collaborateurs", "équipe", "entreprise", "groupe", "participants"],
      synonyms: ["former mon équipe", "former mes employés", "plusieurs personnes", "salariés", "personnel", "nombre de participants", "inscription groupée", "inscription de groupe", "collaborateurs"],
      relatedQuestions: ["faq-entreprises-devis", "faq-entreprises-sur-site", "faq-inscription-participants"],
      action: "inscription"
    },
    {
      id: "faq-entreprises-sur-site",
      category: "entreprises",
      question: "Organisez-vous des formations en entreprise ou sur site ?",
      answer: "Pour l'organisation d'une formation dédiée à votre entreprise ou une intervention sur site, contactez-nous afin d'étudier votre besoin ensemble.",
      keywords: ["entreprise", "sur site", "dans vos locaux", "intra", "sur mesure"],
      synonyms: ["formation en entreprise", "formation intra-entreprise", "chez nous", "dans nos locaux", "intervention sur site", "déplacement", "formateur qui vient", "dédiée", "formation privée"],
      relatedQuestions: ["faq-entreprises-devis", "faq-entreprises-plusieurs", "faq-deroulement-lieu"],
      action: "contact"
    },
    {
      id: "faq-entreprises-devis",
      category: "entreprises",
      question: "Pouvez-vous établir un devis ?",
      answer: "Oui. Décrivez-nous votre besoin — formation souhaitée, nombre de participants, échéance — et nous vous transmettons une proposition adaptée.",
      keywords: ["devis", "proposition", "estimation", "sur mesure"],
      synonyms: ["demander un devis", "offre de prix", "estimation tarifaire", "formation sur devis", "proposition commerciale", "tarif entreprise", "offre entreprise"],
      relatedQuestions: ["faq-tarifs-prix", "faq-entreprises-sur-site", "faq-contact-contact"],
      action: "contact"
    },

    /* ==== Contact & assistance ========================================== */
    {
      id: "faq-contact-contact",
      category: "contact",
      question: "Comment contacter Wisy Safety si je ne trouve pas ma réponse ?",
      answer: "Vous pouvez nous joindre par téléphone au " + CONTACT.phone + ", par e-mail à " + CONTACT.email + ", ou via le formulaire de la page Contact.\n\n" +
        "Nous sommes disponibles " + lowerFirst(CONTACT.hours) + ".",
      keywords: ["contact", "téléphone", "e-mail", "email", "joindre", "formulaire"],
      synonyms: ["appeler", "écrire", "coordonnées", "numéro", "adresse mail", "parler à quelqu'un", "contacter l'équipe", "service client", "rappel", "conseiller"],
      relatedQuestions: ["faq-contact-horaires", "faq-contact-assistant", "faq-inscription-comment"],
      action: "contact"
    },
    {
      id: "faq-contact-horaires",
      category: "contact",
      question: "Quels sont vos horaires d'ouverture ?",
      answer: "Notre équipe est joignable " + lowerFirst(CONTACT.hours) + ". Nous sommes fermés le vendredi, le samedi et le dimanche.",
      keywords: ["horaires", "ouverture", "heures d'ouverture", "ouvert", "fermé"],
      synonyms: ["quand appeler", "jours d'ouverture", "disponibilité de l'équipe", "jusqu'à quelle heure", "week-end", "vendredi", "lundi", "jeudi"],
      relatedQuestions: ["faq-contact-contact", "faq-inscription-dates", "faq-contact-assistant"],
      action: "contact"
    },
    {
      id: "faq-contact-assistant",
      category: "contact",
      question: "Puis-je poser une question directement en ligne ?",
      answer: "Oui : l'assistant Wisy Safety, accessible en bas de chaque page, répond à vos questions courantes à partir des informations publiées sur ce site.\n\n" +
        "Pour un échange personnalisé, notre équipe reste joignable via la page Contact.",
      keywords: ["assistant", "chatbot", "question en ligne", "poser une question", "chat"],
      synonyms: ["robot", "aide en ligne", "discuter", "conversation", "assistant virtuel", "wisy", "bot"],
      relatedQuestions: ["faq-contact-contact", "faq-choisir-adaptee", "faq-inscription-comment"],
      action: "assistant"
    }
  ];

  /* Met la première lettre en minuscule (« Du lundi… » → « du lundi… »). */
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* ---------------------------------------------------------------------
     Helpers (partagés navigateur + assistant + tests)
     --------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------
     Traductions (facultatives) — packs enregistrés par js/faq-i18n/faq-<langue>.js.
     Une langue sans pack (ou « fr ») renvoie exactement les données françaises.
     --------------------------------------------------------------------- */
  var PACKS = {}, LOCAL = {};
  function register(lang, pack) { if (lang && pack) { PACKS[lang] = pack; delete LOCAL[lang]; } }
  function hasPack(lang) { return !!PACKS[lang]; }
  function packLangs() { return Object.keys(PACKS); }
  function activeLang(lang) { return lang && lang !== "fr" && PACKS[lang] ? lang : "fr"; }

  /* Vue localisée (construite une fois par langue) : mêmes objets que ITEMS, textes remplacés. */
  function view(lang) {
    var l = activeLang(lang);
    if (l === "fr") return null;
    if (LOCAL[l]) return LOCAL[l];
    var p = PACKS[l], v = { items: [], byId: {}, categories: [], popular: [], actions: {} };
    ITEMS.forEach(function (it) {
      var t = (p.items && p.items[it.id]) || {}, o = {}, k;
      for (k in it) o[k] = it[k];
      if (typeof t.question === "string" && t.question) o.question = t.question;
      if (typeof t.answer === "string" && t.answer) o.answer = t.answer;
      if (t.keywords) o.keywords = t.keywords.slice();
      if (t.synonyms) o.synonyms = t.synonyms.slice();
      v.items.push(o); v.byId[o.id] = o;
    });
    CATEGORIES.forEach(function (c) {
      var t = (p.categories && p.categories[c.id]) || {}, o = {}, k;
      for (k in c) o[k] = c[k];
      if (t.label) o.label = t.label;
      if (t.tagline) o.tagline = t.tagline;
      v.categories.push(o);
    });
    POPULAR.forEach(function (pp, i) {
      var t = (p.popular && p.popular[i]) || {};
      v.popular.push({ label: t.label || pp.label, query: t.query || pp.query });
    });
    Object.keys(ACTIONS).forEach(function (id) {
      var o = {}, k;
      for (k in ACTIONS[id]) o[k] = ACTIONS[id][k];
      if (p.actions && p.actions[id]) o.label = p.actions[id];
      v.actions[id] = o;
    });
    LOCAL[l] = v;
    return v;
  }

  var byIdIndex = null;
  function indexById() {
    if (byIdIndex) return byIdIndex;
    byIdIndex = {};
    ITEMS.forEach(function (it) { byIdIndex[it.id] = it; });
    return byIdIndex;
  }

  function categories(lang) { var v = view(lang); return (v ? v.categories : CATEGORIES).slice(); }
  function items(lang) { var v = view(lang); return (v ? v.items : ITEMS).slice(); }
  function popular(lang) { var v = view(lang); return (v ? v.popular : POPULAR).slice(); }
  function actions(lang) { var v = view(lang); return v ? v.actions : ACTIONS; }

  function categoryById(id, lang) {
    var list = categories(lang);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function get(id, lang) { var v = view(lang); return (v ? v.byId[id] : indexById()[id]) || null; }

  function byCategory(id, lang) {
    return items(lang).filter(function (it) { return it.category === id; });
  }

  function featured(lang) {
    return items(lang).filter(function (it) { return it.featured === true; });
  }

  /* Nombre de questions par catégorie — { choisir: 4, ... } (identique dans toutes les langues) */
  function counts() {
    var out = {};
    CATEGORIES.forEach(function (c) { out[c.id] = 0; });
    ITEMS.forEach(function (it) {
      if (out[it.category] == null) out[it.category] = 0;
      out[it.category] += 1;
    });
    return out;
  }

  /* Questions liées (1 à n) — d'abord celles déclarées, à défaut la même catégorie. */
  function related(id, n, lang) {
    var it = get(id, lang);
    if (!it) return [];
    var max = n || 3, out = [], seen = {};
    seen[id] = true;
    (it.relatedQuestions || []).forEach(function (rid) {
      var r = get(rid, lang);
      if (r && !seen[rid] && out.length < max) { seen[rid] = true; out.push(r); }
    });
    if (out.length < max) {
      byCategory(it.category, lang).forEach(function (r) {
        if (!seen[r.id] && out.length < max) { seen[r.id] = true; out.push(r); }
      });
    }
    return out;
  }

  /* Paragraphes / listes d'une réponse — structure prête à rendre SANS innerHTML.
     [{ type:"p", text } | { type:"ul", items:[text…] }] */
  function blocks(answer) {
    var out = [];
    String(answer).split(/\n{2,}/).forEach(function (chunk) {
      var lines = chunk.split("\n"), para = [], list = [];
      function flushPara() { if (para.length) { out.push({ type: "p", text: para.join(" ") }); para = []; } }
      function flushList() { if (list.length) { out.push({ type: "ul", items: list }); list = []; } }
      lines.forEach(function (ln) {
        var m = /^\s*-\s+(.*)$/.exec(ln);
        if (m) { flushPara(); list.push(m[1]); }
        else if (ln.trim()) { flushList(); para.push(ln.trim()); }
      });
      flushPara(); flushList();
    });
    return out;
  }

  /* Réponse en texte brut pour l'assistant (les puces deviennent « • »). */
  function plainAnswer(it) {
    return String(it.answer).replace(/^\s*-\s+/gm, "• ");
  }

  /* Données structurées Schema.org FAQPage — construites depuis la MÊME source
     que la page : elles ne peuvent donc jamais contenir une question absente de
     la page (exigence SEO). */
  function toStructuredData(lang) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "inLanguage": activeLang(lang),
      "mainEntity": items(lang).map(function (it) {
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
    CONTACT: CONTACT,
    ACTIONS: ACTIONS,
    CATEGORIES: CATEGORIES,
    ITEMS: ITEMS,
    POPULAR: POPULAR,
    categories: categories,
    items: items,
    popular: popular,
    actions: actions,
    register: register,
    hasPack: hasPack,
    packLangs: packLangs,
    categoryById: categoryById,
    get: get,
    byCategory: byCategory,
    featured: featured,
    counts: counts,
    related: related,
    blocks: blocks,
    plainAnswer: plainAnswer,
    toStructuredData: toStructuredData
  };
});
