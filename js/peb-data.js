/* =========================================================================
   WISY SAFETY — Registre « Certificateur PEB » (SOURCE UNIQUE)
   -------------------------------------------------------------------------
   Source unique des faits affichés par peb-wallonie-bruxelles.html : autorité
   compétente, conditions d'accès, formation, examen, agrément, tarifs,
   sessions et sources officielles — SÉPARÉMENT pour la Wallonie et Bruxelles
   (deux régions, deux procédures, jamais interchangeables).

   RÈGLE D'OR : rien ici ne doit être une invention. Chaque bloc régional porte
   `verified: true` UNIQUEMENT pour les faits confirmés le 2026-09-24 sur les
   sources officielles listées dans `sources` (contrôle multi-sources, voir
   docs/README-PEB.md pour le détail et les points encore incertains listés
   ci-dessous). Toute donnée non confirmée reste absente plutôt qu'inventée.

   NON CONFIRMÉ (ne jamais afficher tant que non vérifié directement par Wisy
   Safety sur la source officielle) :
     - durée de validité / recyclage de l'AGRÉMENT wallon (le CERTIFICAT, lui,
       est valable 10 ans en résidentiel existant — ne pas confondre) ;
     - délai de traitement de la demande d'agrément bruxelloise (seul un délai
       de 10 jours pour un dossier INCOMPLET est confirmé) ;
     - frais de participation à l'examen centralisé bruxellois lui-même
       (le seul montant confirmé est le droit de dossier de 50 € de la
       demande d'AGRÉMENT, distinct de l'examen) ;
     - dates précises de sessions d'examen 2026 (celles trouvées proviennent
       du calendrier d'un centre de formation tiers, pas d'une page SPW
       propre : jamais affichées ici comme des sessions Wisy Safety).

   PRIX WISY — volontairement séparé du benchmark concurrentiel : `PRICING`
   reste `null` tant qu'aucun tarif réel n'est fourni par Wisy Safety (jamais
   de prix inventé). Le benchmark ne sert qu'au POSITIONNEMENT commercial.

   ⚠️ Bruxelles Environnement liste actuellement 5 centres reconnus pour la
   formation « habitations individuelles » (Environment & Economics for Total
   Quality, UGEB-ULEB, Homegrade asbl, Mezure/Syntra Brussel, Certinergie) —
   Wisy Safety n'y figure pas à la date de cette vérification. Voir
   `OFFER.wisyIsAccreditedCenter` : reste `false` tant que Wisy Safety n'a pas
   confirmé son propre statut. La page ne doit JAMAIS présenter Wisy Safety
   comme « agréé » ou « reconnu » par une autorité — seules les AUTORITÉS le
   sont. Voir docs/README-PEB.md.

   Module « dual-mode » (navigateur : window.PebData ; Node : require) — aucune
   dépendance, aucun build. Même famille que js/trainings-data.js.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PebData = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Date du contrôle multi-sources face aux sites officiels (voir docs/README-PEB.md). */
  var LAST_VERIFIED = "2026-09-24";

  /* -----------------------------------------------------------------------
     WALLONIE — certificateur PEB bâtiment résidentiel existant
     Sources vérifiées le 2026-09-24 (voir `sources`).
     ----------------------------------------------------------------------- */
  var WALLONIA = {
    id: "wallonia",
    label: "Wallonie",
    verified: true,

    authority: {
      name: "SPW Énergie — Direction des Bâtiments durables",
      short: "SPW Énergie",
      note: "L'agrément est formellement délivré par le Ministre wallon de l'Énergie.",
      registerUrl: "https://energie.wallonie.be/"
    },

    scope: "Certificateur PEB pour bâtiment résidentiel existant",

    eligibility: [
      { id: "diploma", label: "Diplôme d'architecte, d'ingénieur architecte, d'ingénieur civil, de bio-ingénieur, d'ingénieur industriel, de gradué/bachelier en construction, ou tout autre diplôme de l'enseignement supérieur couvrant les aspects énergétiques des bâtiments" },
      { id: "experience", label: "À défaut de diplôme admissible : justifier d'au moins 2 ans d'expérience professionnelle concernant les aspects énergétiques des bâtiments" },
      { id: "admin", label: "Ne pas avoir eu d'agrément retiré depuis moins de 3 ans" }
    ],

    process: {
      steps: [
        { no: 1, title: "Vérifier les conditions d'accès", text: "Diplôme admissible ou expérience professionnelle d'au moins 2 ans concernant les aspects énergétiques des bâtiments." },
        { no: 2, title: "Introduire une demande d'agrément au SPW Énergie", text: "Formulaire officiel envoyé par courrier ou e-mail ; un accusé de réception est délivré sous 10 jours." },
        { no: 3, title: "Être autorisé à s'inscrire à la formation et à l'examen", text: "L'administration autorise le candidat à s'inscrire auprès d'un centre de formation agréé." },
        { no: 4, title: "Suivre la formation réglementaire", text: "Formation dispensée par le centre agréé, conforme au programme fixé par le SPW Énergie." },
        { no: 5, title: "Réussir l'épreuve écrite puis l'épreuve orale", text: "Les deux épreuves sont organisées par le centre agréé, selon le calendrier de la session suivie." },
        { no: 6, title: "Obtenir l'agrément", text: "Le centre transmet le rapport de session à l'administration ; l'agrément est délivré par le Ministre dans les 40 jours qui suivent, et permet d'exercer comme certificateur PEB en Wallonie." }
      ]
    },

    examination: {
      format: "Épreuve écrite, puis épreuve orale",
      notes: "Organisées par le centre de formation agréé, selon le calendrier publié pour la session suivie."
    },

    approval: {
      name: "Agrément de certificateur PEB (Wallonie)",
      deliveredBy: "Ministre wallon de l'Énergie, sur base du dossier instruit par le SPW Énergie",
      fee: null, /* aucun droit de dossier communiqué pour la Wallonie : ne pas en afficher */
      note: "L'agrément wallon permet d'exercer uniquement en Wallonie."
    },

    pricing: {
      wisy: null, /* PEB_PRICING.wallonia — jamais de prix inventé, voir PEB_PRICING plus bas */
      dossierFeeCents: null,
      benchmark: [
        { org: "Certinergie Academy", priceLabel: "1 050 € TTC", context: "formation wallonne annoncée en 2026", officialSource: false },
        { org: "IFAPME Dinant", priceLabel: "1 390 €", context: "formation de 56 h / 8 jours annoncée en 2026", officialSource: false }
      ]
    },

    sessions: [], /* aucune session réelle connue : la section affiche l'état vide */

    sources: [
      { label: "Wallonie.be — Devenir certificateur PEB (bâtiment résidentiel)", url: "https://www.wallonie.be/fr/demarches/devenir-certificateur-peb-batiment-residentiel" },
      { label: "SPW Énergie — Devenir certificateur PEB", url: "https://energie.wallonie.be/home/performance-energetique-des-batiments/pour-les-professionnels--outils-formations-et-agrements/formations-et-agrements/Devenir%20Certificateur%20PEB/devenir-certificateur-peb.html" },
      { label: "SPW Énergie — Agrément des certificateurs PEB de bâtiment public", url: "https://energie.wallonie.be/fr/agrement-des-certificateurs-peb-de-batiment-public.html?IDC=9698" }
    ]
  };

  /* -----------------------------------------------------------------------
     BRUXELLES — certificateur PEB habitations individuelles
     Sources vérifiées le 2026-09-24 (voir `sources`). Règlement d'examen en
     vigueur depuis le 27/01/2026 (examen.environnement.brussels/fr/conditions).
     ----------------------------------------------------------------------- */
  var BRUSSELS = {
    id: "brussels",
    label: "Bruxelles",
    verified: true,

    authority: {
      name: "Bruxelles Environnement",
      short: "Bruxelles Environnement",
      registerUrl: "https://environnement.brussels/"
    },

    scope: "Certificateur PEB pour habitations individuelles",

    eligibility: [
      { id: "diploma", label: "Diplôme en architecture, ingénierie ou construction (belge ou équivalent étranger)" },
      { id: "experience", label: "À défaut de diplôme admissible : au moins 2 ans d'expérience professionnelle liée aux aspects énergétiques des bâtiments" },
      { id: "exam", label: "Attestation de réussite de l'examen centralisé, datant de moins de 6 mois au moment du dépôt du dossier d'agrément" }
    ],

    process: {
      steps: [
        { no: 1, title: "Suivre une formation reconnue", text: "Formation reconnue par Bruxelles Environnement. L'attestation de formation obtenue permet de s'inscrire à 2 séances d'examen maximum." },
        { no: 2, title: "Réussir l'examen centralisé", text: "Épreuve théorique et épreuve pratique, organisées par Bruxelles Environnement via sa plateforme officielle — attestation de réussite à la clé." },
        { no: 3, title: "Introduire la demande d'agrément", text: "Dossier déposé auprès de Bruxelles Environnement : attestation de réussite (< 6 mois), preuve du droit de dossier (50 €), diplôme ou preuve d'expérience, extrait de casier judiciaire." },
        { no: 4, title: "Recevoir l'agrément", text: "Délivré par Bruxelles Environnement : il permet d'exercer comme certificateur PEB à Bruxelles." },
        { no: 5, title: "Apparaître au registre des certificateurs agréés", text: "Inscription au registre public bruxellois, condition pour exercer." }
      ]
    },

    examination: {
      format: "Épreuve théorique (20 questions à choix multiple) et épreuve pratique (encodage d'un cas avec le logiciel Certibru-RES) — 4 heures maximum",
      passThresholds: "Au moins 15/30 à la théorie, 35/70 à la pratique, et 60/100 au total",
      notes: "Règlement d'examen en vigueur depuis le 27/01/2026 : à vérifier sur la plateforme officielle avant chaque session. Frais de participation éventuels à l'examen lui-même : à confirmer directement auprès de Bruxelles Environnement (distincts du droit de dossier de l'agrément).",
      platformUrl: "https://examen.environnement.brussels/fr/conditions"
    },

    approval: {
      name: "Agrément de certificateur PEB — habitations individuelles (Bruxelles)",
      deliveredBy: "Bruxelles Environnement",
      feeCents: 5000,
      feeLabel: "50 €",
      feeNote: "Droit de dossier de la demande d'agrément résidentiel — PAS le prix de la formation. Montant selon les informations actuellement publiées par Bruxelles Environnement ; susceptible d'être modifié par l'autorité compétente.",
      note: "L'agrément bruxellois permet d'exercer uniquement à Bruxelles."
    },

    /* Non-résidentiel : citation exacte de Bruxelles Environnement (2026-09-24). Ne jamais présenter
       cette formation comme disponible chez Wisy Safety. */
    nonResidential: {
      status: "unavailable",
      label: "Formation actuellement indisponible",
      quote: "Pour le moment, aucun centre de formation ne donne cette formation.",
      note: "Bruxelles Environnement travaille à une évolution de la législation et des outils concernant la certification PEB des unités PEB tertiaires. Lorsque cela sera finalisé, les centres de formation devraient recommencer à donner ces formations.",
      sourceUrl: "https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/formations-des-certificateurs-peb"
    },

    /* Bâtiments publics : 3ᵉ type d'agrément, distinct du résidentiel et du non-résidentiel. */
    publicBuildings: {
      distinctFromResidential: true,
      note: "Bruxelles Environnement distingue 3 agréments de certificateur PEB : résidentiel, non-résidentiel et bâtiment public — chacun avec sa propre formation. Non détaillé ici tant que l'offre Wisy Safety pour ce troisième agrément n'est pas confirmée.",
      sourceUrl: "https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/trouver-un-certificateur-peb-batiment-public"
    },

    /* Évolution réglementaire annoncée mais PAS encore en vigueur — mentionnée uniquement comme
       repère de veille, jamais comme un fait déjà applicable en 2026. */
    upcomingChange: {
      note: "Bruxelles Environnement prévoit à terme la fusion des métiers de certificateur PEB et de conseiller PEB en un agrément unique d'« expert PEB ». Le logiciel et le lancement des formations correspondantes sont annoncés au plus tôt pour 2027, avec un délai de 3 ans laissé aux professionnels déjà agréés. Non applicable en 2026.",
      sourceUrl: "https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/devenir-certificateur-ou-certificatrice-peb"
    },

    pricing: {
      wisy: null, /* PEB_PRICING.brussels — jamais de prix inventé, voir PEB_PRICING plus bas */
      dossierFeeCents: 5000,
      benchmark: [
        { org: "Homegrade", priceLabel: "645 €", context: "formation PEB habitations individuelles annoncée en octobre 2026", officialSource: false },
        { org: "Certinergie Academy", priceLabel: "745 € TVAC", context: "session Bruxelles / Overijse 2026", officialSource: false }
      ]
    },

    sessions: [],

    sources: [
      { label: "Bruxelles Environnement — Devenir certificateur·rice PEB", url: "https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/devenir-certificateur-ou-certificatrice-peb" },
      { label: "Plateforme officielle de l'examen centralisé — Conditions", url: "https://examen.environnement.brussels/fr/conditions" },
      { label: "Bruxelles Environnement — Formations des certificateurs PEB", url: "https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/formations-des-certificateurs-peb" }
    ]
  };

  /* -----------------------------------------------------------------------
     Offre Wisy Safety — CE QUE WISY PROPOSE RÉELLEMENT (à confirmer)
     -----------------------------------------------------------------------
     Aucun agrément, aucune reconnaissance ni aucune officialité ne doit être
     affirmée pour Wisy Safety tant qu'elle n'est pas confirmée ici. */
  var OFFER = {
    /* true seulement si Wisy Safety confirme dispenser réellement la formation pour cette Région. */
    offersWallonia: true,
    offersBrussels: true,
    offersBrusselsNonResidential: false,   /* voir BRUSSELS.nonResidential : indisponible sur le marché */
    offersPublicBuildings: false,          /* passer à true + compléter BRUSSELS.publicBuildings si confirmé */
    /* Wisy Safety est-il lui-même reconnu/agréé comme centre de formation pour cette formation ?
       Bruxelles Environnement liste actuellement 5 centres reconnus pour l'habitation individuelle
       (Environment & Economics for Total Quality, UGEB-ULEB, Homegrade, Mezure/Syntra Brussel,
       Certinergie) : Wisy Safety n'y figurait pas au 2026-09-24. Tant que ce point n'est pas
       confirmé/mis à jour par Wisy Safety, la page ne doit JAMAIS utiliser « agréé », « reconnu »
       ou « officiel » à propos de Wisy Safety lui-même — seulement à propos des autorités. */
    wisyIsAccreditedCenter: false
  };

  /* -----------------------------------------------------------------------
     Tarifs Wisy — SOURCE UNIQUE, modifiable depuis CE seul endroit.
     null => « Tarif sur demande » (jamais de prix inventé pour compléter le design).
     ----------------------------------------------------------------------- */
  var PEB_PRICING = {
    wallonia: null,
    brussels: null
  };

  /* -----------------------------------------------------------------------
     Programme — partagé entre les deux Régions (connaissances techniques,
     indépendantes de la procédure régionale). Pas de nombre d'heures inventé
     par module : uniquement titre + description + compétences. */
  var CURRICULUM = [
    { no: 1, title: "Cadre réglementaire PEB", desc: "Principes de la performance énergétique des bâtiments et rôle du certificateur.", skills: ["Repères réglementaires", "Rôle et responsabilités du certificateur"] },
    { no: 2, title: "Enveloppe du bâtiment", desc: "Lecture des plans, composition des parois et ponts thermiques.", skills: ["Lecture de plans", "Repérage des ponts thermiques"] },
    { no: 3, title: "Isolation et performances thermiques", desc: "Matériaux isolants, résistances thermiques et méthodes d'évaluation.", skills: ["Évaluation de l'isolation", "Repérage des matériaux"] },
    { no: 4, title: "Chauffage et eau chaude sanitaire", desc: "Systèmes de production et de distribution de chaleur.", skills: ["Identification des systèmes", "Collecte des données techniques"] },
    { no: 5, title: "Ventilation et systèmes techniques", desc: "Systèmes de ventilation et leur incidence sur la performance énergétique.", skills: ["Identification des systèmes de ventilation"] },
    { no: 6, title: "Énergies renouvelables", desc: "Installations solaires, pompes à chaleur et autres sources renouvelables.", skills: ["Repérage des installations", "Collecte des données"] },
    { no: 7, title: "Collecte des données sur site", desc: "Méthode de relevé sur place, mesures et photos requises.", skills: ["Relevé de terrain", "Rigueur documentaire"] },
    { no: 8, title: "Logiciel / méthode applicable", desc: "Méthode d'encodage utilisée pour produire le certificat, selon la Région.", skills: ["Utilisation de la méthode régionale"] },
    { no: 9, title: "Cas pratique", desc: "Mise en situation sur un dossier complet, du relevé au certificat.", skills: ["Application pratique", "Synthèse d'un dossier"] },
    { no: 10, title: "Préparation aux épreuves", desc: "Révision ciblée et mise en conditions avant l'examen régional.", skills: ["Préparation à l'examen"] }
  ];

  /* -----------------------------------------------------------------------
     FAQ — réponses différentes selon la Région lorsque nécessaire.
     `answer` = commune ; `answerWallonia`/`answerBrussels` = spécifique (prime sur `answer`).
     ----------------------------------------------------------------------- */
  var FAQ = [
    {
      id: "devenir-2026",
      q: "Comment devenir certificateur PEB en 2026 ?",
      answerWallonia: "En Wallonie : vérifier les conditions d'accès, introduire une demande d'agrément auprès du SPW Énergie, suivre la formation auprès d'un centre agréé, réussir l'épreuve écrite puis l'épreuve orale, puis obtenir l'agrément délivré par le Ministre.",
      answerBrussels: "À Bruxelles : suivre une formation reconnue par Bruxelles Environnement, réussir l'examen centralisé (épreuve théorique et pratique), puis introduire la demande d'agrément auprès de Bruxelles Environnement."
    },
    {
      id: "formation-wallonie",
      q: "Quelle formation faut-il suivre en Wallonie ?",
      answer: "Une formation réglementaire dispensée par un centre agréé, préparant aux épreuves écrite et orale du parcours wallon — accessible après l'introduction d'une demande d'agrément auprès du SPW Énergie."
    },
    {
      id: "formation-bruxelles",
      q: "Quelle formation faut-il suivre à Bruxelles ?",
      answer: "Une formation reconnue par Bruxelles Environnement, préparant à l'examen centralisé (théorique et pratique, avec le logiciel Certibru-RES) organisé par cette même autorité."
    },
    {
      id: "conditions-acces",
      q: "Quelles sont les conditions d'accès ?",
      answer: "Elles dépendent de la Région choisie : un diplôme admissible (architecture, ingénierie, construction ou énergie du bâtiment) ou, à défaut, au moins 2 ans d'expérience professionnelle liée aux aspects énergétiques des bâtiments. Voir la section « Conditions d'accès » ci-dessus selon la Région."
    },
    {
      id: "experience-2-ans",
      q: "Peut-on devenir certificateur PEB avec 2 ans d'expérience ?",
      answer: "Oui, dans les deux Régions : à défaut d'un diplôme admissible, au moins 2 ans d'expérience professionnelle concernant les aspects énergétiques des bâtiments peuvent remplacer le diplôme, selon les conditions administratives propres à chaque autorité."
    },
    {
      id: "agrement-double-region",
      q: "L'agrément wallon est-il valable à Bruxelles ?",
      answer: "Non. La Wallonie et Bruxelles appliquent chacune leur propre législation, leur propre autorité (SPW Énergie / Bruxelles Environnement), leur propre examen et leur propre registre de certificateurs. Un agrément obtenu dans une Région ne permet pas d'exercer dans l'autre : choisissez la Région dans laquelle vous souhaitez exercer."
    },
    {
      id: "examen-wallonie",
      q: "Comment se déroule l'examen en Wallonie ?",
      answer: "Le parcours wallon prévoit une épreuve écrite, puis une épreuve orale, organisées par le centre de formation agréé selon le calendrier de la session suivie."
    },
    {
      id: "examen-bruxelles",
      q: "Comment fonctionne l'examen centralisé à Bruxelles ?",
      answer: "Il comprend une épreuve théorique (20 questions à choix multiple) et une épreuve pratique (encodage d'un cas avec le logiciel Certibru-RES), sur 4 heures maximum, organisé directement par Bruxelles Environnement. Le règlement en vigueur est à vérifier sur la plateforme officielle avant chaque session."
    },
    {
      id: "prix-formation",
      q: "Combien coûte une formation de certificateur PEB ?",
      answer: "Le tarif de la formation Wisy Safety est communiqué sur demande pour la prochaine session, dans la Région choisie. Des ordres de grandeur observés chez d'autres organismes sont indiqués à titre de repère dans la section Tarifs, mais ne reflètent pas le tarif Wisy Safety."
    },
    {
      id: "prix-agrement-bruxelles",
      q: "Combien coûte la demande d'agrément à Bruxelles ?",
      answer: "Un droit de dossier de 50 € s'applique actuellement à la demande d'agrément résidentiel, selon les informations publiées par Bruxelles Environnement. Ce montant est fixé par l'autorité compétente et peut évoluer — ce n'est pas le prix de la formation."
    },
    {
      id: "duree-parcours",
      q: "Combien de temps faut-il pour devenir certificateur ?",
      answer: "La durée totale dépend de la Région, du centre de formation et des délais propres à chaque autorité (inscription, session, résultats, traitement de la demande d'agrément) : elle n'est pas communiquée ici pour éviter toute estimation non confirmée. Contactez-nous pour un point sur les délais actuels."
    },
    {
      id: "deux-regions",
      q: "Puis-je exercer dans les deux Régions ?",
      answer: "Seulement en obtenant les deux agréments séparément : un parcours complet (formation, examen, agrément) dans chaque Région où vous souhaitez exercer."
    }
  ];

  function get(id) { return id === "wallonia" ? WALLONIA : id === "brussels" ? BRUSSELS : null; }
  function all() { return [WALLONIA, BRUSSELS]; }

  return {
    LAST_VERIFIED: LAST_VERIFIED,
    wallonia: WALLONIA,
    brussels: BRUSSELS,
    OFFER: OFFER,
    PRICING: PEB_PRICING,
    CURRICULUM: CURRICULUM,
    FAQ: FAQ,
    get: get,
    all: all
  };
});
