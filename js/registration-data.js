/* =========================================================================
   WISY SAFETY — Données du parcours d'inscription (SOURCE UNIQUE)
   -------------------------------------------------------------------------
   Ce fichier centralise TOUTES les données métier de l'inscription :
   catalogue des formations, prix, catégories et configuration.
   Aucun prix ne doit être écrit en dur ailleurs dans le code.

   ► Prix stockés en CENTIMES (entiers) pour éviter toute erreur de virgule
     flottante. 225,00 € => 22500. priceCents:null + onQuote:true => « Sur devis »
     (formation non tarifée : exclue du sous-total, tarif communiqué séparément).
   ► Structure prête pour un remplacement par une API / un CMS : il suffira
     de fournir le même objet (mêmes clés) depuis le réseau, puis d'appeler
     window.WisyRegistration.setCatalogue(list).
   ► Libellés (name/description) localisés fr/en/nl avec repli fr.
   ► image : visuel de la formation (fiche). alt = nom de la formation.

   SÉCURITÉ (future intégration paiement) : ces données sont côté client à des
   fins d'AFFICHAGE et de CALCUL PROVISOIRE uniquement. Le serveur devra
   TOUJOURS recalculer les montants à partir des identifiants de formation
   (id), sans jamais faire confiance au total transmis par le navigateur.
   ========================================================================= */
(function () {
  "use strict";

  var CONFIG = {
    storageKey: "wisy-registration-v1",   /* clé VERSIONNÉE (migrations futures) */
    schemaVersion: 1,
    locale: "fr-BE",
    currency: "EUR",
    /* TVA : VOLONTAIREMENT non définie — aucun taux appliqué arbitrairement.
       null => « à déterminer » ; 0.21 => activerait le calcul (à confirmer serveur). */
    vatRate: null,
    minQuantity: 1,
    maxQuantity: 99,
    payment: {
      provider: null,          /* "stripe" | "mollie" | "paypal" */
      ready: false,
      checkoutEndpoint: "/api/checkout"  /* le serveur RECALCULE d'après items[].id */
    }
  };

  /* Formation « Nacelles élévatrices » : ses faits (prix HT…) viennent du registre
     central js/trainings-data.js (chargé AVANT ce fichier) — une seule définition
     partagée avec la page dédiée, la recherche et l'assistant. Sans registre :
     « Sur devis » (jamais de prix inventé). */
  var NACELLE = (window.WisyTrainings && window.WisyTrainings.nacelles) || null;
  /* Idem pour le BEPS (voir js/trainings-data.js) : 70 € — jamais de prix inventé si le registre manque. */
  var BEPS = (window.WisyTrainings && window.WisyTrainings.beps) || null;

  /* Catégories — clé stable => libellé i18n (résolu dans registration.js) */
  var CATEGORIES = [
    { id: "certification", i18n: "reg.cat_certification" },
    { id: "securite",      i18n: "reg.cat_securite" },
    { id: "secours",       i18n: "reg.cat_secours" },
    { id: "engins",        i18n: "reg.cat_engins" },
    { id: "telecom",       i18n: "reg.cat_telecom" }
  ];

  /* ----------------------------------------------------------------------
     Catalogue — 6 formations (source unique)
     ---------------------------------------------------------------------- */
  var CATALOGUE = [
    {
      id: "vca-base",
      code: "VCA-B",
      priceCents: 22500,
      unit: "participant",
      category: "certification",
      icon: "shield",
      image: "assets/images/formations/vca-base.webp",
      name: { fr: "VCA Base", en: "VCA Base", nl: "VCA Basis" },
      description: {
        fr: "Sécurité de base — examen agréé inclus",
        en: "Basic safety — accredited exam included",
        nl: "Basisveiligheid — erkend examen inbegrepen"
      }
    },
    {
      id: "vca-ligne-hierarchique",
      code: "VCA-LH",
      priceCents: 29500,
      unit: "participant",
      category: "certification",
      icon: "hierarchy",
      image: "assets/images/formations/vca-hierarchique.webp",
      name: { fr: "VCA Ligne hiérarchique", en: "VCA for supervisors", nl: "VCA Leidinggevenden" },
      description: {
        fr: "Cadres & responsables opérationnels",
        en: "Managers & operational supervisors",
        nl: "Kaderleden & operationeel verantwoordelijken"
      }
    },
    {
      id: "nacelle-elevatrice",
      code: "NAC",
      priceCents: NACELLE ? NACELLE.price.amountCents : null,   /* 350 € HT — registre central */
      onQuote: !NACELLE,
      unit: "participant",
      category: "engins",
      icon: "lift",
      image: "assets/images/formations/nacelle-elevatrice.webp",
      name: { fr: "Nacelles élévatrices", en: "Aerial work platform", nl: "Hoogwerker" },
      description: {
        fr: "Conduite en sécurité — théorie + pratique",
        en: "Safe operation — theory + practice",
        nl: "Veilig besturen — theorie + praktijk"
      }
    },
    {
      id: "fibre-optique",
      code: "FIB",
      priceCents: 65000,
      unit: "participant",
      category: "telecom",
      icon: "fiber",
      image: "assets/images/formations/fibre-optique.webp",
      name: { fr: "Fibre optique", en: "Optical fiber", nl: "Glasvezel" },
      description: {
        fr: "Raccordement & soudure — pratique terrain",
        en: "Splicing & connection — field practice",
        nl: "Lassen & aansluiten — praktijk op terrein"
      }
    },
    {
      id: "beps",
      code: "BEPS",
      priceCents: BEPS ? BEPS.price.amountCents : null,   /* 70 € — registre central */
      onQuote: !BEPS,
      unit: "participant",
      category: "secours",
      icon: "aid",
      image: "assets/images/formations/beps.webp",
      name: { fr: "BEPS — Premier secours", en: "BEPS — First aid", nl: "BEPS — Eerste hulp" },
      description: {
        fr: "Les gestes qui sauvent — brevet européen reconnu",
        en: "Life-saving skills — recognised European certificate",
        nl: "Levensreddende handelingen — erkend Europees brevet"
      }
    },
    {
      id: "diisocyanates",
      code: "DIISO",
      priceCents: 9500,
      unit: "participant",
      category: "securite",
      icon: "hazard",
      image: "assets/images/formations/diisocyanates.webp",
      name: {
        fr: "Diisocyanates & substances dangereuses",
        en: "Diisocyanates & hazardous substances",
        nl: "Diisocyanaten & gevaarlijke stoffen"
      },
      description: {
        fr: "Formation obligatoire (REACH)",
        en: "Mandatory training (REACH)",
        nl: "Verplichte opleiding (REACH)"
      }
    }
  ];

  var mutableCatalogue = CATALOGUE.slice();

  /* Paramètre d'URL `?formation=` (cartes du catalogue, recherche, assistant) → identifiant du catalogue
     d'inscription. Accepte l'identifiant du site (registre js/site-content.js : « vca-hierarchique »,
     « nacelle »…) ou celui du catalogue. Renvoie null si la formation est inconnue. */
  function resolveTrainingId(param) {
    var wanted = String(param == null ? "" : param);
    if (!wanted) return null;
    var site = (window.WisySite && window.WisySite.formations) ? window.WisySite.formations() : [];
    for (var i = 0; i < site.length; i++) {
      if (site[i].id === wanted && site[i].registrationId) { wanted = site[i].registrationId; break; }
    }
    for (var j = 0; j < mutableCatalogue.length; j++) {
      if (mutableCatalogue[j].id === wanted) return wanted;
    }
    return null;
  }

  window.WisyRegistrationData = {
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    getCatalogue: function () { return mutableCatalogue.slice(); },
    resolveTrainingId: resolveTrainingId,
    getTraining: function (id) {
      for (var i = 0; i < mutableCatalogue.length; i++) {
        if (mutableCatalogue[i].id === id) return mutableCatalogue[i];
      }
      return null;
    },
    setCatalogue: function (list) {
      if (Array.isArray(list)) {
        mutableCatalogue = list.slice();
        document.dispatchEvent(new CustomEvent("wisy-registration:catalogue"));
      }
    }
  };
})();
