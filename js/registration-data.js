/* =========================================================================
   WISY SAFETY — Données du parcours d'inscription (SOURCE UNIQUE)
   -------------------------------------------------------------------------
   Ce fichier centralise TOUTES les données métier de l'inscription :
   catalogue des formations, prix, catégories et configuration.
   Aucun prix ne doit être écrit en dur ailleurs dans le code.

   ► Prix stockés en CENTIMES (entiers) pour éviter toute erreur de virgule
     flottante. 225,00 € => 22500.
   ► Structure prête pour un remplacement par une API / un CMS : il suffira
     de fournir le même objet (mêmes clés) depuis le réseau, puis d'appeler
     window.WisyRegistration.setCatalogue(list).
   ► Les libellés (name / description) sont localisés fr/en/nl avec repli fr.
     Les autres langues du site retombent automatiquement sur le français.

   SÉCURITÉ (future intégration paiement) : ces données sont côté client à des
   fins d'AFFICHAGE et de CALCUL PROVISOIRE uniquement. Le serveur devra
   TOUJOURS recalculer les montants à partir des identifiants de formation
   (id), sans jamais faire confiance au total transmis par le navigateur.
   ========================================================================= */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Configuration globale
     ---------------------------------------------------------------------- */
  var CONFIG = {
    /* Clé localStorage VERSIONNÉE — incrémenter le suffixe casse proprement
       les anciens paniers lors d'une future migration de schéma. */
    storageKey: "wisy-registration-v1",
    schemaVersion: 1,

    /* Affichage monétaire */
    locale: "fr-BE",
    currency: "EUR",

    /* TVA : VOLONTAIREMENT non définie. On ne fixe AUCUN taux arbitrairement.
       - null            => « à déterminer » (affiché tel quel, non calculé)
       - 0.21 (exemple)  => 21 %, activerait le calcul automatique
       Le taux réel devra être confirmé et, à terme, appliqué côté serveur. */
    vatRate: null,

    /* Bornes quantité par formation (zones tactiles et cohérence métier) */
    minQuantity: 1,
    maxQuantity: 99,

    /* Fournisseur de paiement — AUCUN connecté pour l'instant.
       Renseigner provider ("stripe" | "mollie" | "paypal") + ready:true
       activera l'étape de paiement réelle (voir registration.js). */
    payment: {
      provider: null,
      ready: false,
      /* Endpoint serveur prévu pour plus tard (non appelé aujourd'hui).
         Le serveur recevra { items:[{id, quantity}], … } et RECALCULERA. */
      checkoutEndpoint: "/api/checkout"
    }
  };

  /* ----------------------------------------------------------------------
     Catégories — clé stable => libellé i18n (résolu dans registration.js)
     ---------------------------------------------------------------------- */
  var CATEGORIES = [
    { id: "certification", i18n: "reg.cat_certification" },
    { id: "securite",      i18n: "reg.cat_securite" },
    { id: "engins",        i18n: "reg.cat_engins" },
    { id: "telecom",       i18n: "reg.cat_telecom" },
    { id: "reglementation",i18n: "reg.cat_reglementation" },
    { id: "technique",     i18n: "reg.cat_technique" }
  ];

  /* ----------------------------------------------------------------------
     Catalogue des formations (source unique)
     icon => clé du registre d'icônes défini dans registration.js
     ---------------------------------------------------------------------- */
  var CATALOGUE = [
    {
      id: "vca-base",
      code: "VCA-B",
      priceCents: 22500,
      unit: "participant",
      category: "certification",
      icon: "shield",
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
      name: {
        fr: "VCA Ligne hiérarchique",
        en: "VCA for supervisors",
        nl: "VCA Leidinggevenden"
      },
      description: {
        fr: "Cadres & responsables opérationnels",
        en: "Managers & operational supervisors",
        nl: "Kaderleden & operationeel verantwoordelijken"
      }
    },
    {
      id: "diisocyanates",
      code: "DIISO",
      priceCents: 9500,
      unit: "participant",
      category: "securite",
      icon: "hazard",
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
    },
    {
      id: "nacelle-elevatrice",
      code: "NAC",
      priceCents: 24500,
      unit: "participant",
      category: "engins",
      icon: "lift",
      name: {
        fr: "Nacelle élévatrice",
        en: "Aerial work platform",
        nl: "Hoogwerker"
      },
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
      name: { fr: "Fibre optique", en: "Optical fiber", nl: "Glasvezel" },
      description: {
        fr: "Raccordement & soudure — pratique terrain",
        en: "Splicing & connection — field practice",
        nl: "Lassen & aansluiten — praktijk op terrein"
      }
    },
    {
      id: "vca-entreprise",
      code: "VCA-E",
      priceCents: 59000,
      unit: "participant",
      category: "certification",
      icon: "building",
      name: { fr: "VCA Entreprise", en: "VCA Company", nl: "VCA Bedrijf" },
      description: {
        fr: "Accompagnement à la certification LSC",
        en: "Support for LSC certification",
        nl: "Begeleiding naar LSC-certificatie"
      }
    },
    {
      id: "peb-wallonie-bruxelles",
      code: "PEB",
      priceCents: 35000,
      unit: "participant",
      category: "reglementation",
      icon: "clipboard",
      name: {
        fr: "PEB Wallonie & Bruxelles",
        en: "EPB Wallonia & Brussels",
        nl: "EPB Wallonië & Brussel"
      },
      description: { fr: "Formation PEB", en: "EPB training", nl: "EPB-opleiding" }
    },
    {
      id: "securite-reglementation",
      code: "SEC",
      priceCents: 35000,
      unit: "participant",
      category: "securite",
      icon: "shield-check",
      name: {
        fr: "Sécurité & Réglementation",
        en: "Safety & Regulation",
        nl: "Veiligheid & Regelgeving"
      },
      description: {
        fr: "Conseil & mise en conformité",
        en: "Consulting & compliance",
        nl: "Advies & conformiteit"
      }
    },
    {
      id: "session-engins-formateurs",
      code: "ENG-TT",
      priceCents: 59500,
      unit: "participant",
      category: "engins",
      icon: "trainer",
      name: {
        fr: "Session engins (formateurs)",
        en: "Machinery session (trainers)",
        nl: "Machinesessie (lesgevers)"
      },
      description: {
        fr: "Spécialisée train-the-trainer",
        en: "Specialised train-the-trainer",
        nl: "Gespecialiseerd train-the-trainer"
      }
    },
    {
      id: "techniques-dao",
      code: "DAO",
      priceCents: 45000,
      unit: "participant",
      category: "technique",
      icon: "draft",
      name: { fr: "Techniques / DAO", en: "Techniques / CAD", nl: "Technieken / CAD" },
      description: {
        fr: "Dessin assisté par ordinateur",
        en: "Computer-aided design",
        nl: "Computerondersteund tekenen"
      }
    },
    {
      id: "telecommunications-fibres",
      code: "TEL",
      priceCents: 65000,
      unit: "participant",
      category: "telecom",
      icon: "signal",
      name: {
        fr: "Télécommunications & fibres optique",
        en: "Telecommunications & optical fiber",
        nl: "Telecommunicatie & glasvezel"
      },
      description: {
        fr: "Réseaux télécom — pratique terrain",
        en: "Telecom networks — field practice",
        nl: "Telecomnetwerken — praktijk op terrein"
      }
    }
  ];

  /* ----------------------------------------------------------------------
     API publique — figée pour éviter les mutations accidentelles.
     setCatalogue() permet à une future couche API/CMS de remplacer la source.
     ---------------------------------------------------------------------- */
  var mutableCatalogue = CATALOGUE.slice();

  window.WisyRegistrationData = {
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    getCatalogue: function () { return mutableCatalogue.slice(); },
    getTraining: function (id) {
      for (var i = 0; i < mutableCatalogue.length; i++) {
        if (mutableCatalogue[i].id === id) return mutableCatalogue[i];
      }
      return null;
    },
    /* Point d'extension : brancher une API/CMS plus tard. */
    setCatalogue: function (list) {
      if (Array.isArray(list)) {
        mutableCatalogue = list.slice();
        document.dispatchEvent(new CustomEvent("wisy-registration:catalogue"));
      }
    }
  };
})();
