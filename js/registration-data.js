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
   ► Libellés (name/description) localisés dans les 10 langues du site (fr, en, nl, af, ar, bg, de,
     ro, it, sl ; contrôle : scripts/check-i18n.js) ; repli sur le français si une langue manquait.
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
  /* Idem pour la VCA Base : 225 € / personne vient du registre central (jamais de prix inventé si le registre manque). */
  var VCA_BASE = (window.WisyTrainings && window.WisyTrainings.vcaBase) || null;

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
      priceCents: VCA_BASE ? VCA_BASE.price.amountCents : null,   /* 225 € — registre central */
      onQuote: !VCA_BASE,
      unit: "participant",
      category: "certification",
      icon: "shield",
      image: "assets/images/formations/vca-base.webp",
      name: {
        fr: "VCA Base", en: "VCA Base", nl: "VCA Basis", af: "VCA Basis", ar: "VCA الأساسي",
        bg: "VCA основи", de: "VCA Grundlagen", ro: "VCA de bază", it: "VCA base", sl: "VCA osnovni"
      },
      description: {
        fr: "Sécurité de base — examen inclus",
        en: "Basic safety — exam included",
        nl: "Basisveiligheid — examen inbegrepen",
        af: "Basiese veiligheid — eksamen ingesluit",
        ar: "السلامة الأساسية — الامتحان مشمول",
        bg: "Основна безопасност — включен изпит",
        de: "Grundlegende Sicherheit — Prüfung inklusive",
        ro: "Securitate de bază — examen inclus",
        it: "Sicurezza di base — esame incluso",
        sl: "Osnovna varnost — izpit vključen"
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
      name: {
        fr: "VCA Ligne hiérarchique", en: "VCA for supervisors", nl: "VCA Leidinggevenden", af: "VCA vir Toesighouers",
        ar: "VCA للمشرفين", bg: "VCA за ръководители", de: "VCA für Führungskräfte",
        ro: "VCA pentru personalul de conducere", it: "VCA per responsabili", sl: "VCA za vodstvo"
      },
      description: {
        fr: "Cadres & responsables opérationnels",
        en: "Managers & operational supervisors",
        nl: "Kaderleden & operationeel verantwoordelijken",
        af: "Bestuurders & operasionele toesighouers",
        ar: "الإداريون والمسؤولون التشغيليون",
        bg: "Ръководни кадри и оперативни отговорници",
        de: "Führungskräfte & operative Verantwortliche",
        ro: "Cadre de conducere & responsabili operaționali",
        it: "Dirigenti e responsabili operativi",
        sl: "Vodstveni kader in operativni vodje"
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
      name: {
        fr: "Nacelles élévatrices", en: "Aerial work platform", nl: "Hoogwerker", af: "Hoogwerker",
        ar: "منصة العمل المرتفعة", bg: "Автовишка", de: "Hubarbeitsbühne", ro: "Nacelă elevatoare",
        it: "Piattaforma elevatrice", sl: "Dvižna ploščad"
      },
      description: {
        fr: "Conduite en sécurité — théorie + pratique",
        en: "Safe operation — theory + practice",
        nl: "Veilig besturen — theorie + praktijk",
        af: "Veilige bediening — teorie + praktyk",
        ar: "التشغيل الآمن — نظري + عملي",
        bg: "Безопасно управление — теория + практика",
        de: "Sicheres Bedienen — Theorie + Praxis",
        ro: "Operare în siguranță — teorie + practică",
        it: "Guida in sicurezza — teoria + pratica",
        sl: "Varno upravljanje — teorija + praksa"
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
      name: {
        fr: "Fibre optique", en: "Optical fiber", nl: "Glasvezel", af: "Optiese vesel", ar: "الألياف الضوئية",
        bg: "Оптични влакна", de: "Glasfaser", ro: "Fibră optică", it: "Fibra ottica", sl: "Optična vlakna"
      },
      description: {
        fr: "Raccordement & soudure — pratique terrain",
        en: "Splicing & connection — field practice",
        nl: "Lassen & aansluiten — praktijk op terrein",
        af: "Splitsing & aansluiting — praktyk in die veld",
        ar: "التوصيل واللحام — ممارسة ميدانية",
        bg: "Свързване и заваряване — практика на терен",
        de: "Anschluss & Spleißen — Praxis vor Ort",
        ro: "Racordare & sudură — practică pe teren",
        it: "Giunzione e collegamento — pratica sul campo",
        sl: "Priključitev in spajanje — praksa na terenu"
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
      name: {
        fr: "BEPS — Premier secours", en: "BEPS — First aid", nl: "BEPS — Eerste hulp", af: "BEPS — Noodhulp",
        ar: "BEPS — الإسعافات الأولية", bg: "BEPS — Първа помощ", de: "BEPS — Erste Hilfe",
        ro: "BEPS — Prim ajutor", it: "BEPS — Primo soccorso", sl: "BEPS — Prva pomoč"
      },
      description: {
        fr: "Les gestes qui sauvent — brevet européen reconnu",
        en: "Life-saving skills — recognised European certificate",
        nl: "Levensreddende handelingen — erkend Europees brevet",
        af: "Lewensreddende handelinge — erkende Europese brevet",
        ar: "الإجراءات التي تنقذ الحياة — شهادة أوروبية معترف بها",
        bg: "Действия, които спасяват живот — признато европейско удостоверение",
        de: "Lebensrettende Handgriffe — anerkanntes europäisches Zertifikat",
        ro: "Gesturile care salvează vieți — brevet european recunoscut",
        it: "I gesti che salvano la vita — brevetto europeo riconosciuto",
        sl: "Ukrepi, ki rešujejo življenja — priznano evropsko spričevalo"
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
        nl: "Diisocyanaten & gevaarlijke stoffen",
        af: "Di-isosianate & gevaarlike stowwe",
        ar: "ثنائي الأيزوسيانات والمواد الخطرة",
        bg: "Диизоцианати и опасни вещества",
        de: "Diisocyanate & Gefahrstoffe",
        ro: "Diizocianați & substanțe periculoase",
        it: "Diisocianati & sostanze pericolose",
        sl: "Diizocianati in nevarne snovi"
      },
      description: {
        fr: "Formation obligatoire (REACH)",
        en: "Mandatory training (REACH)",
        nl: "Verplichte opleiding (REACH)",
        af: "Verpligte opleiding (REACH)",
        ar: "تدريب إلزامي (REACH)",
        bg: "Задължително обучение (REACH)",
        de: "Verpflichtende Schulung (REACH)",
        ro: "Formare obligatorie (REACH)",
        it: "Formazione obbligatoria (REACH)",
        sl: "Obvezno usposabljanje (REACH)"
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
