/* =========================================================================
   WISY SAFETY — Registre de données de la page Mentions légales
   -------------------------------------------------------------------------
   Documentation-as-code : ce fichier n'est PAS consommé pour injecter du
   texte dans mentions-legales.html (comme REGULATORY_SOURCES /
   UNCONFIRMED_CLAIMS dans js/coordination-data.js, ces faits juridiques
   critiques restent écrits en dur dans le HTML — visibles même si le JS
   échoue). Il sert de SOURCE DE VÉRITÉ AUDITÉE : chaque donnée affichée sur
   la page a ici sa provenance, sa date de vérification et, pour l'adresse,
   le conflit détecté et sa résolution. Voir docs/LEGAL_PAGE_RESEARCH_REPORT.md
   pour le rapport complet destiné au propriétaire.

   Module « dual-mode » comme js/coordination-data.js : `window.WISY_LEGAL`
   dans le navigateur, `module.exports` sous Node (aucun test ne le consomme
   aujourd'hui ; gardé dual-mode par cohérence avec le reste du registre).
   ========================================================================= */
(function (root, factory) {
  var mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  else root.WISY_LEGAL = mod;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Identité de l'association, vérifiée le 2026-09-28 sur l'ancien site en production
     https://wisysafety.be/mentions-legales/ (page « Fiche d'identité » + pied de page global,
     valeurs cohérentes à 3 endroits distincts de ce même site) — jamais inventée. */
  var ORG = {
    denomination: "Wisy Safety ASBL",
    formeJuridique: "ASBL (association sans but lucratif)",
    numeroEntreprise: "1027.725.391",
    numeroTVA: "BE 1027.725.391",
    siege: { ligne: "Avenue d'Itterbeek 378", cp: "1070", ville: "Anderlecht", pays: "Belgique" },
    responsable: { nom: "Rayane Van Osselt", fonction: "Coordinateur · Wisy Safety ASBL" },
    email: "info@wisysafety.be",
    telephoneAffiche: "+32 2 318 86 59",
    telephoneHref: "+3223188659",
    marque: "Wisy Safety®",
    refDocument: "ML 2026",
    derniereMAJ: "2026-09-28"
  };

  /* Provenance de chaque champ ci-dessus. */
  var SOURCES = [
    { field: "denomination, numeroTVA, responsable, email, telephoneAffiche, marque, refDocument",
      source: "Ancien site wisysafety.be/mentions-legales/ (page « Fiche d'identité de l'association » + pied de page global)",
      verifiedOn: "2026-09-28", method: "Lecture directe de la page en production via navigateur" },
    { field: "numeroEntreprise",
      source: "Déduit de numeroTVA : en Belgique le numéro de TVA = numéro d'entreprise (BCE) préfixé « BE » (SPF Économie / Xerius / StarterPass — voir le rapport)",
      verifiedOn: "2026-09-28", method: "Recherche web sur sources spécialisées belges, non une source officielle unique" },
    { field: "siege",
      source: "Résolu depuis un CONFLIT DE DONNÉES — voir DATA_CONFLICTS ci-dessous",
      verifiedOn: "2026-09-28", method: "Recoupement JSON-LD interne (9 pages) + pied de page global + fiche Google Maps" }
  ];

  /* Conflit détecté (brief §5) : l'ancienne page « Mentions légales » elle-même affichait une adresse
     incomplète/différente de celle utilisée PARTOUT ailleurs sur le même site (dont son propre pied
     de page). Documenté ici, jamais affiché tel quel au visiteur — la page publique montre uniquement
     la valeur résolue ci-dessous. */
  var DATA_CONFLICTS = [
    {
      champ: "Adresse du siège / établissement",
      valeurs: [
        { valeur: "Avenue d'Itterbeek, 1070 Bruxelles", source: "Corps de texte de l'ancienne page « Mentions légales » (section Coordonnées + Fiche d'identité)" },
        { valeur: "Avenue d'Itterbeek 378, 1070 Anderlecht", source: "Pied de page global de CE MÊME ancien site (wisysafety.be, toutes pages) + lien Google Maps qu'il contient lui-même" }
      ],
      retenue: "Avenue d'Itterbeek 378, 1070 Anderlecht",
      raison: "Triple recoupement indépendant, tous convergents : (1) le pied de page GLOBAL de l'ancien site wisysafety.be lui-même (toutes les pages, y compris la page mentions légales) ; (2) la fiche Google Maps publique « Wisy Safety · Centre de formation » géocodée à cette adresse exacte, liée par l'ancien site lui-même ; (3) le JSON-LD structuré déjà publié sur LES 15 PAGES du nouveau site (chantier en cours, écrit lors de sessions précédentes), avec géocoordonnées précises (50.834996, 4.276271). Seul le corps de texte de l'ancienne page « Mentions légales » — probablement jamais mis à jour après un déménagement ou une correction d'adresse — portait la version incomplète « Bruxelles » sans numéro. « Anderlecht » et « Bruxelles » ne sont pas non plus contradictoires en soi : Anderlecht fait partie de la Région de Bruxelles-Capitale, d'où l'usage courant « Anderlecht (Bruxelles) » déjà présent ailleurs sur le site (ex. formation-vca-base.html).",
      statut: "résolu avec confiance élevée — non « validation requise »"
    }
  ];

  /* Sous-traitants / technologies tierces RÉELLEMENT détectés dans le code (grep exhaustif de js/*.js
     et *.html, 2026-09-28) — jamais supposés. Aucun outil de mesure d'audience, aucun pixel publicitaire,
     aucun reCAPTCHA, aucune police tierce (polices auto-hébergées, voir css/fonts.css). */
  var PROCESSORS = [
    { name: "EmailJS", role: "Acheminement des e-mails transactionnels (formulaire de contact, notification admin optionnelle sur nouvel avis)", evidence: "contact.html, avis.html, js/reviews.js, js/peb.js, js/coordination.js — cdn.jsdelivr.net/npm/@emailjs/browser, clé publique dans js/supabase-config.js" },
    { name: "Supabase", role: "Hébergement de la base de données des avis clients (avis.html) ; l'e-mail du déposant n'est jamais exposé par la vue publique (Row Level Security)", evidence: "js/supabase-config.js, js/reviews.js" },
    { name: "Google Maps (embed)", role: "Carte intégrée en page d'accueil UNIQUEMENT, chargée seulement après consentement « Fonctionnalités » (sinon iframe src=\"about:blank\")", evidence: "index.html data-consent-src, js/cookie-consent.js applyConsent()" }
  ];

  /* Stockage navigateur RÉEL (grep de tout le dépôt, 2026-09-28) — 5 clés au total, toutes de même
     origine (jamais transmises à un tiers), aucune n'est un traceur publicitaire. */
  var STORAGE_KEYS = [
    { key: "wisy-consent", file: "js/cookie-consent.js", role: "Le choix de cookies lui-même (nécessaire à son propre fonctionnement)" },
    { key: "(langue préférée)", file: "js/i18n.js", role: "Langue d'affichage choisie" },
    { key: "(région PEB, sessionStorage)", file: "js/peb.js", role: "Région choisie dans le simulateur PEB — le temps de la session uniquement" },
    { key: "(brouillon d'inscription)", file: "js/registration.js", role: "Poursuite du parcours d'inscription en 4 étapes après un rafraîchissement" },
    { key: "(recherches récentes)", file: "js/search.js", role: "5 dernières recherches sur le site, pour affichage rapide" }
  ];

  /* Sources officielles consultées pour le cadrage réglementaire général (brief §6) — obligations
     génériques belges, PAS des faits propres à Wisy Safety. */
  var LEGAL_SOURCES = [
    { id: "spf-economie-mentions", label: "SPF Économie — Informations obligatoires sur le site web de votre entreprise", url: "https://news.economie.fgov.be/203681-informations-obligatoires-sur-le-site-web-de-votre-entreprise/" },
    { id: "justice-aisbl", label: "SPF Justice — Mentions obligatoires (associations, AISBL)", url: "https://justice.belgium.be/fr/themes_et_dossiers/societes_associations_et_fondations/associations/aisbl/mentions_obligatoires" }
  ];

  /* Affirmations de l'ancienne page reprises TELLES QUELLES (auto-déclarées par l'organisation sur son
     propre site déjà en ligne) mais non vérifiables indépendamment par une recherche de ce périmètre :
     à confirmer par le propriétaire si besoin, jamais retirées unilatéralement ni modifiées. */
  var UNVERIFIED_CARRYOVER = [
    "« Wisy Safety® — marque déposée » : statut d'enregistrement (BOIP/EUIPO) non consulté dans le cadre de cette mission ; affirmation reprise de l'ancienne page officielle, à confirmer si un usage juridique en dépend."
  ];

  return {
    ORG: ORG, SOURCES: SOURCES, DATA_CONFLICTS: DATA_CONFLICTS, PROCESSORS: PROCESSORS,
    STORAGE_KEYS: STORAGE_KEYS, LEGAL_SOURCES: LEGAL_SOURCES, UNVERIFIED_CARRYOVER: UNVERIFIED_CARRYOVER
  };
});
