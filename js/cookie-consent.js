/* =========================================================================
   WISY SAFETY — Consentement aux cookies (bannière + centre de préférences)
   -------------------------------------------------------------------------
   Chargé (defer) sur toutes les pages sauf 404.html (page technique
   autonome, sans script). Construit et affiche, à la 1re visite ou après un
   changement de CONSENT_VERSION, un bandeau en bas d'écran, puis, à la
   demande, un centre de préférences modal. Aucune dépendance externe.

   Catégories réellement gérées (voir le rapport d'audit du projet) :
     • necessary  — toujours actives, non désactivables (langue, formulaires,
       stockage du choix lui-même).
     • analytics  — relaie les événements internes `wisy:analytics` déjà
       émis par js/assistant/launcher.js et js/faq-page.js (voir
       docs/README-ASSISTANT.md §4 : « rien n'est envoyé ; à relayer plus
       tard avec le consentement »). Aucun outil de mesure d'audience n'est
       installé à ce jour : le relais ci-dessous est un point d'intégration
       prêt, pas un envoi réel. Le brancher sur un outil (Plausible, Matomo,
       GA4 en Consent Mode…) le jour où il sera installé.
     • functional — active l'intégration Google Maps de la page d'accueil ;
       sans consentement, un encart de remplacement est affiché à sa place.
   « Marketing » n'est pas proposé : aucune technologie correspondante
   n'existe sur le site (pas de pixel publicitaire, pas d'outil de
   personnalisation des communications). Ne pas ajouter cette catégorie sans
   installer d'abord l'outil correspondant — voir CATEGORIES ci-dessous.

   Stockage : localStorage["wisy-consent"] =
     { v: CONSENT_VERSION, ts: Date.now(), categories: { analytics, functional } }
   Un changement de CONSENT_VERSION invalide tout consentement antérieur.

   API publique : window.WisyConsent = { open, getConsent, CONSENT_VERSION }
   Module « dual-mode » : la logique pure (fusion/validité du consentement)
   s'exporte sous Node pour les tests ; la partie DOM ne s'exécute que dans
   un navigateur (voir js/assistant/launcher.js pour le même principe).
   ========================================================================= */
(function (root) {
  "use strict";

  var CONSENT_VERSION = "2026-01";
  var STORE_KEY = "wisy-consent";

  /* Catégories affichées dans le centre de préférences, dans l'ordre. `active`
     conditionne l'affichage : une catégorie sans technologie réelle derrière
     elle n'apparaît pas (voir l'en-tête ci-dessus). */
  var CATEGORIES = [
    {
      id: "necessary", locked: true, active: true,
      title: "Cookies nécessaires",
      desc: "Indispensables au fonctionnement, à la sécurité et aux fonctionnalités essentielles du site."
    },
    {
      id: "analytics", locked: false, active: true,
      title: "Mesure d'audience",
      desc: "Nous aide à comprendre comment le site est utilisé afin d'améliorer ses performances et son contenu."
    },
    {
      id: "functional", locked: false, active: true,
      title: "Fonctionnalités",
      desc: "Permet d'activer certaines fonctionnalités supplémentaires et de mémoriser vos préférences."
    },
    {
      id: "marketing", locked: false, active: false,
      title: "Marketing",
      desc: "Permet de mesurer l'efficacité de nos campagnes et, le cas échéant, de personnaliser certaines communications."
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Logique pure (testée sous Node)                                     */
  /* ------------------------------------------------------------------ */

  /** Catégories visibles dans le centre de préférences (nécessaires + celles avec une technologie réelle). */
  function visibleCategories(cats) {
    cats = cats || CATEGORIES;
    var out = [];
    for (var i = 0; i < cats.length; i++) if (cats[i].active) out.push(cats[i]);
    return out;
  }

  /** Choix par défaut avant toute décision : rien d'optionnel n'est autorisé. */
  function defaultChoices() {
    return { analytics: false, functional: false };
  }

  /** Un enregistrement stocké est-il exploitable pour la version de consentement courante ? */
  function isValidRecord(rec, version) {
    return !!(rec && typeof rec === "object" && rec.v === version && rec.categories && typeof rec.categories === "object");
  }

  /** Choix effectifs à appliquer : ceux stockés (si valides) sinon les valeurs par défaut. */
  function resolveChoices(rec, version) {
    if (!isValidRecord(rec, version)) return defaultChoices();
    var d = defaultChoices();
    return {
      analytics: rec.categories.analytics === true || d.analytics,
      functional: rec.categories.functional === true || d.functional
    };
  }

  function allChoices(value) { return { analytics: value, functional: value }; }

  /* ------------------------------------------------------------------ */
  /* Stockage (persistant : le choix doit survivre aux visites suivantes) */
  /* ------------------------------------------------------------------ */
  function safeStorage() {
    try {
      var s = root.localStorage;
      var k = "__wcc";
      s.setItem(k, "1"); s.removeItem(k);
      return s;
    } catch (e) { return null; }
  }

  function readRecord(storage) {
    if (!storage) return null;
    try {
      var raw = storage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeRecord(storage, categories) {
    if (!storage) return;
    try {
      storage.setItem(STORE_KEY, JSON.stringify({ v: CONSENT_VERSION, ts: Date.now(), categories: categories }));
    } catch (e) { /* silencieux : mode privé strict, quota dépassé… */ }
  }

  /* Le reste ne s'exécute que dans un navigateur (document indisponible sous Node). */
  if (typeof document === "undefined") {
    root.WisyConsentLogic = {
      CONSENT_VERSION: CONSENT_VERSION, CATEGORIES: CATEGORIES,
      visibleCategories: visibleCategories, defaultChoices: defaultChoices,
      isValidRecord: isValidRecord, resolveChoices: resolveChoices, allChoices: allChoices
    };
    return;
  }

  var storage = safeStorage();
  var storedRecord = readRecord(storage);
  var current = resolveChoices(storedRecord, CONSENT_VERSION);
  var hasDecided = isValidRecord(storedRecord, CONSENT_VERSION);

  var elBanner = null, elScrim = null, elModal = null, lastFocused = null;
  var reduceMotion = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Icônes (même style que le reste du site : trait, 24x24, currentColor) */
  /* ------------------------------------------------------------------ */
  var ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3.2v5.1c0 4.6-3 8.7-7 9.9-4-1.2-7-5.3-7-9.9V6.2L12 3z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Application des choix : n'active RIEN qui ne soit pas autorisé       */
  /* ------------------------------------------------------------------ */
  function applyConsent(cats) {
    // Fonctionnalités → carte Google Maps intégrée (voir index.html, data-consent-src)
    document.querySelectorAll("[data-consent-src]").forEach(function (frame) {
      var gate = frame.closest("[data-consent-gate]");
      if (cats.functional) {
        var real = frame.getAttribute("data-consent-src");
        if (frame.getAttribute("src") !== real) frame.setAttribute("src", real);
        if (gate) gate.classList.add("is-granted");
      } else {
        frame.setAttribute("src", "about:blank");
        if (gate) gate.classList.remove("is-granted");
      }
    });

    // Mesure d'audience → relais du bus d'événements interne wisy:analytics
    document.removeEventListener("wisy:analytics", relayAnalyticsEvent);
    if (cats.analytics) document.addEventListener("wisy:analytics", relayAnalyticsEvent);

    current = cats;
  }

  /** Point d'intégration : aucun outil de mesure d'audience n'est installé à ce
      jour, ce relais ne fait donc rien de plus que respecter le consentement.
      Brancher ici l'envoi réel (Plausible, Matomo, GA4 en Consent Mode…) le
      jour où un outil sera choisi : il ne recevra alors QUE ce qui est autorisé. */
  function relayAnalyticsEvent(evt) { /* voir commentaire ci-dessus */ }

  function persist(cats) { writeRecord(storage, cats); hasDecided = true; applyConsent(cats); }

  /* ------------------------------------------------------------------ */
  /* Bandeau                                                              */
  /* ------------------------------------------------------------------ */
  function bannerHTML() {
    return (
      '<div class="wcc-banner" role="region" aria-label="Consentement aux cookies" tabindex="-1">' +
        '<div class="wcc-banner__inner">' +
          '<span class="wcc-icon">' + ICON_SHIELD + '</span>' +
          '<div class="wcc-banner__body">' +
            '<p class="wcc-banner__title">Votre vie privée, votre choix</p>' +
            '<p class="wcc-banner__text">Nous utilisons des cookies nécessaires au bon fonctionnement de Wisy Safety. Avec votre accord, nous pouvons également utiliser des cookies de mesure d’audience et d’autres technologies afin d’améliorer votre expérience.</p>' +
            '<a class="wcc-banner__link" href="#" data-i18n="cookies.privacy_link">En savoir plus sur notre politique de confidentialité</a>' +
          '</div>' +
          '<div class="wcc-banner__actions">' +
            '<button type="button" class="btn btn--outline wcc-btn" data-wcc-action="reject">Tout refuser</button>' +
            '<button type="button" class="wcc-btn--text" data-wcc-action="customize">Personnaliser</button>' +
            '<button type="button" class="btn btn--cta wcc-btn" data-wcc-action="accept">Tout accepter</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  var bannerResizeObs = null;
  function syncBannerHeight() {
    if (!elBanner) return;
    document.documentElement.style.setProperty("--wcc-banner-h", elBanner.getBoundingClientRect().height + "px");
  }

  function showBanner() {
    if (elBanner) return;
    var host = document.createElement("div");
    host.innerHTML = bannerHTML();
    elBanner = host.firstElementChild;
    document.body.appendChild(elBanner);

    syncBannerHeight();
    document.body.classList.add("has-wcc-banner");
    // Re-mesure si le contenu change de hauteur (rotation, zoom, retour à la ligne) : l'assistant
    // flottant (--wa-lift, voir css/assistant.css) ne doit jamais rester caché derrière le bandeau.
    if (root.ResizeObserver) {
      bannerResizeObs = new root.ResizeObserver(syncBannerHeight);
      bannerResizeObs.observe(elBanner);
    }

    void elBanner.offsetWidth; // force le style initial : la transition d'apparition se joue dès le 1er affichage
    elBanner.classList.add("is-visible");
    if (!reduceMotion) {
      setTimeout(function () { if (elBanner) elBanner.focus({ preventScroll: true }); }, 260);
    } else {
      elBanner.focus({ preventScroll: true });
    }
  }

  function hideBanner() {
    if (!elBanner) return;
    var node = elBanner;
    elBanner = null;
    if (bannerResizeObs) { bannerResizeObs.disconnect(); bannerResizeObs = null; }
    document.body.classList.remove("has-wcc-banner");
    node.classList.remove("is-visible");
    node.classList.add("is-hiding");
    var done = function () { if (node.parentNode) node.parentNode.removeChild(node); };
    if (reduceMotion) done(); else setTimeout(done, 320);
  }

  /* ------------------------------------------------------------------ */
  /* Centre de préférences (dialogue modal)                              */
  /* ------------------------------------------------------------------ */
  function categoryHTML(cat, checked) {
    var locked = cat.locked;
    var inputAttrs = 'type="checkbox" id="wcc-cat-' + cat.id + '"' +
      (checked ? ' checked' : '') + (locked ? ' checked disabled' : '');
    return (
      '<div class="wcc-cat">' +
        '<div class="wcc-cat__text">' +
          '<p class="wcc-cat__title" id="wcc-cat-' + cat.id + '-title">' + cat.title + '</p>' +
          '<p class="wcc-cat__desc">' + cat.desc + '</p>' +
          (locked ? '<span class="wcc-cat__locked-tag">' + ICON_LOCK + ' Toujours actif</span>' : '') +
        '</div>' +
        '<div class="wcc-cat__control">' +
          '<label class="wcc-switch">' +
            '<input ' + inputAttrs + ' data-wcc-cat="' + cat.id + '" aria-labelledby="wcc-cat-' + cat.id + '-title">' +
            '<span class="wcc-switch__track"><span class="wcc-switch__thumb"></span></span>' +
          '</label>' +
        '</div>' +
      '</div>'
    );
  }

  function modalHTML(draft) {
    var rows = visibleCategories().map(function (cat) {
      return categoryHTML(cat, cat.id === "necessary" ? true : !!draft[cat.id]);
    }).join("");
    return (
      '<div class="wcc-scrim" data-wcc-scrim></div>' +
      '<div class="wcc-modal" role="dialog" aria-modal="true" aria-labelledby="wcc-modal-title" tabindex="-1">' +
        '<div class="wcc-modal__head">' +
          '<h2 class="wcc-modal__title" id="wcc-modal-title">Préférences de confidentialité</h2>' +
          '<button type="button" class="wcc-modal__close" data-wcc-close aria-label="Fermer">' + ICON_CLOSE + '</button>' +
        '</div>' +
        '<div class="wcc-modal__body">' +
          '<p class="wcc-modal__intro">Choisissez les catégories de cookies que vous souhaitez autoriser. Les cookies strictement nécessaires au fonctionnement du site restent toujours actifs.</p>' +
          rows +
        '</div>' +
        '<div class="wcc-modal__foot">' +
          '<button type="button" class="btn btn--outline wcc-btn" data-wcc-action="reject">Tout refuser</button>' +
          '<button type="button" class="btn btn--cta wcc-btn" data-wcc-action="save">Enregistrer mes choix</button>' +
          '<button type="button" class="btn btn--outline wcc-btn" data-wcc-action="accept">Tout accepter</button>' +
        '</div>' +
      '</div>'
    );
  }

  function readDraftFromModal() {
    var draft = {};
    visibleCategories().forEach(function (cat) {
      if (cat.locked) return;
      var input = elModal.querySelector('[data-wcc-cat="' + cat.id + '"]');
      draft[cat.id] = !!(input && input.checked);
    });
    return Object.assign(defaultChoices(), draft);
  }

  function openPreferences(triggerEl) {
    lastFocused = triggerEl || document.activeElement;
    var host = document.createElement("div");
    host.innerHTML = modalHTML(current);
    elScrim = host.querySelector("[data-wcc-scrim]");
    elModal = host.querySelector(".wcc-modal");
    document.body.appendChild(elScrim);
    document.body.appendChild(elModal);

    var htmlEl = document.documentElement;
    htmlEl.dataset.wccPrevOverflow = htmlEl.style.overflow || "";
    htmlEl.style.overflow = "hidden";
    Array.prototype.forEach.call(document.body.children, function (n) {
      if (n === elModal || n === elScrim || n === elBanner || n.tagName === "SCRIPT") return;
      if (!n.hasAttribute("inert")) { n.setAttribute("inert", ""); n.setAttribute("data-wcc-inerted", ""); }
    });

    document.addEventListener("keydown", onModalKeydown, true);

    void elModal.offsetWidth;
    elScrim.classList.add("is-visible");
    elModal.classList.add("is-visible");
    setTimeout(function () { if (elModal) elModal.focus({ preventScroll: true }); }, reduceMotion ? 0 : 120);
  }

  function closePreferences() {
    if (!elModal) return;
    var modal = elModal, scrim = elScrim;
    elModal = null; elScrim = null;

    modal.classList.remove("is-visible");
    scrim.classList.remove("is-visible");

    var htmlEl = document.documentElement;
    htmlEl.style.overflow = htmlEl.dataset.wccPrevOverflow || "";
    delete htmlEl.dataset.wccPrevOverflow;
    document.querySelectorAll("[data-wcc-inerted]").forEach(function (n) {
      n.removeAttribute("inert"); n.removeAttribute("data-wcc-inerted");
    });
    document.removeEventListener("keydown", onModalKeydown, true);

    var done = function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
    };
    if (reduceMotion) done(); else setTimeout(done, 260);

    if (lastFocused && typeof lastFocused.focus === "function") {
      try { lastFocused.focus({ preventScroll: true }); } catch (e) { /* silencieux */ }
    }
  }

  /** Tab / Maj+Tab restent dans le centre de préférences (même principe que js/assistant/assistant.js). */
  function trapTab(e) {
    var sel = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]';
    var nodes = Array.prototype.filter.call(elModal.querySelectorAll(sel), function (n) {
      return n.offsetParent !== null;
    });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || !elModal.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !elModal.contains(active))) { e.preventDefault(); first.focus(); }
  }

  function onModalKeydown(e) {
    if (!elModal) return;
    if (e.key === "Escape") { e.stopPropagation(); closePreferences(); }
    else if (e.key === "Tab") trapTab(e);
  }

  /* ------------------------------------------------------------------ */
  /* Décisions                                                            */
  /* ------------------------------------------------------------------ */
  function decide(cats) {
    persist(cats);
    hideBanner();
    closePreferences();
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-wcc-open]");
    if (openBtn) { e.preventDefault(); openPreferences(openBtn); return; }

    var customize = e.target.closest('[data-wcc-action="customize"]');
    if (customize) { openPreferences(customize); return; }

    var close = e.target.closest("[data-wcc-close]");
    if (close) { closePreferences(); return; }

    if (elScrim && e.target === elScrim) { closePreferences(); return; }

    var accept = e.target.closest('[data-wcc-action="accept"]');
    if (accept) { decide(allChoices(true)); return; }

    var reject = e.target.closest('[data-wcc-action="reject"]');
    if (reject) { decide(allChoices(false)); return; }

    var save = e.target.closest('[data-wcc-action="save"]');
    if (save && elModal) { decide(readDraftFromModal()); return; }
  });

  /* ------------------------------------------------------------------ */
  /* Lien « Préférences cookies » — injecté dans le pied de page          */
  /* ------------------------------------------------------------------ */
  function injectFooterLink() {
    document.querySelectorAll(".f-legal__links").forEach(function (nav) {
      if (nav.querySelector("[data-wcc-open]")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wcc-footer-link";
      btn.setAttribute("data-wcc-open", "");
      btn.textContent = "Préférences cookies";
      nav.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Initialisation                                                       */
  /* ------------------------------------------------------------------ */
  applyConsent(current); // état par défaut (rien d'optionnel) tant qu'aucun choix valide n'existe
  injectFooterLink();
  if (!hasDecided) showBanner();

  root.WisyConsent = {
    CONSENT_VERSION: CONSENT_VERSION,
    getConsent: function () { return Object.assign({ necessary: true }, current); },
    open: function () { openPreferences(document.activeElement); }
  };
})(typeof window !== "undefined" ? window : this);
