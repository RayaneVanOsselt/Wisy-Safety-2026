/* =========================================================================
   WISY SAFETY — Données de la page WiSy Coordination (coordination.html)
   -------------------------------------------------------------------------
   Source unique pour :
     • l'équipe de coordinateurs affichée sur la page (js/coordination.js)
     • les sources réglementaires citées dans la section « Cadre réglementaire »

   ► AUJOURD'HUI : TEAM est VOLONTAIREMENT VIDE. Aucun coordinateur, aucune
   qualification, aucun agrément n'est inventé. Tant que ce tableau est vide,
   la page affiche un état « équipe à venir » avec un lien vers Contact —
   jamais une fausse fiche. Pour publier une personne réelle, ajoutez un
   objet ici avec UNIQUEMENT des faits fournis par Wisy Safety (voir la forme
   ci-dessous) ; aucune photo générée par IA.

   Module « dual-mode » comme js/site-content.js : `window.WISY_COORDINATION`
   dans le navigateur, `module.exports` sous Node (tests).
   ========================================================================= */
(function (root, factory) {
  var mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  else root.WISY_COORDINATION = mod;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Équipe : [{ id, name, role, photo: {webp, avif, alt}, qualifications: [] }, …] — VIDE tant que
     Wisy Safety ne fournit pas de personnes réelles (nom, rôle, photo, qualifications vérifiées). */
  var TEAM = [];

  /* Sources réglementaires VÉRIFIÉES (consultées le 2026-09-27 sur emploi.belgique.be, SPF Emploi,
     Travail et Concertation sociale — domaine déjà autorisé par tests/site-links.test.js). Cadre
     générique belge : ce ne sont PAS des faits propres à Wisy Safety (agrément, niveau du
     coordinateur, zone d'intervention) — ceux-ci restent à confirmer par le propriétaire. */
  var REGULATORY_SOURCES = [
    {
      id: "loi-bien-etre",
      label: "Loi du 4 août 1996 relative au bien-être des travailleurs lors de l'exécution de leur travail",
      url: "https://emploi.belgique.be/fr/themes/bien-etre-au-travail"
    },
    {
      id: "ar-chantiers-mobiles",
      label: "Arrêté royal du 25 janvier 2001 concernant les chantiers temporaires ou mobiles",
      url: "https://emploi.belgique.be/fr/themes/bien-etre-au-travail"
    }
  ];

  /* Affirmations que le BRIEF suggérait comme « éléments de confiance » mais qui ne sont pas encore
     vérifiées pour Wisy Safety spécifiquement (agrément, niveaux A/B réellement couverts, zone
     géographique exclusive). Volontairement NE PAS les afficher tant qu'elles ne sont pas confirmées
     — voir le rapport remis au propriétaire. Gardé ici pour qu'elles soient faciles à activer. */
  var UNCONFIRMED_CLAIMS = [
    "Niveaux de coordinateur (A et/ou B) réellement couverts par l'équipe Wisy Safety",
    "Zones d'intervention exactes (Bruxelles, Wallonie, Flandre ?)",
    "Nombre d'années d'expérience en coordination sécurité-santé",
    "Nombre de chantiers / projets suivis",
    "Agrément ou affiliation professionnelle spécifique du/des coordinateur(s)",
    "Tarification (à la mission, forfait, régie ?)"
  ];

  return { TEAM: TEAM, REGULATORY_SOURCES: REGULATORY_SOURCES, UNCONFIRMED_CLAIMS: UNCONFIRMED_CLAIMS };
});
