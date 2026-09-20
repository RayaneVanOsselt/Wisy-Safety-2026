/* =========================================================================
   WISY SAFETY — Assistant Wisy · AIChatLauncher
   -------------------------------------------------------------------------
   Seul script de l'assistant chargé (defer) sur toutes les pages : petit,
   sans dépendance. Il fabrique :

       [ bulle d'invitation ]  ( mascotte )   ← vrai <button>, en bas à droite

   et charge À LA DEMANDE tout le reste (moteur de réponses + panneau) :
     • en tâche de fond : pré-téléchargement (sans exécution) 3 s après le
       chargement, sauf économie de données / connexion lente (navigateurs sans
       <link rel="prefetch">, ex. Safari : chargement anticipé à ce moment-là) ;
     • au 1er survol, focus clavier ou toucher : chargement + exécution ;
     • au clic : si le moteur n'est pas encore prêt, le launcher passe en
       état « chargement » puis ouvre — jamais de clic perdu.

   Comportement (réglages : CONFIG ci-dessous, surchargeables via
   window.WISY_ASSISTANT_CONFIG.launcher = { cueCount: 0, … }) :
     • apparition douce (opacité + 10 px, ~550 ms) une fois la page stable ;
     • 1re visite de la SESSION : bulle « Besoin d'aide ? » 3 s après le
       chargement, visible ~9 s, une seule fois (sessionStorage) ; jamais sur
       le Centre d'aide (qui présente déjà l'assistant) ; le chat ne s'ouvre
       JAMAIS tout seul ;
     • « appels de présence » très discrets : au plus UNE micro-animation à la
       fois (mascotte -3 px OU halo), toutes les 16–24 s, 3 fois maximum par
       SESSION, arrêtés dès que le visiteur interagit, quand la page est masquée,
       quand un champ de saisie a le focus ou si le mouvement réduit est demandé ;
     • survol / focus clavier : la bulle se révèle (desktop) ;
     • aucun secret, aucune donnée personnelle : seul un drapeau d'interface
       (« bulle déjà vue ») est mémorisé, en sessionStorage.

   API publique :
     window.WisyAssistant.controller = { open, close, toggle, ask(texte), isOpen }
        → `ask` ouvre l'assistant ET envoie la question (Centre d'aide).
     window.WisyAssistant.Launcher   = utilitaires partagés avec le panneau
        (el, avatarInto, setOpen, attachPanel, focusFab, track, reduced…).

   Module « dual-mode » : la logique pure (règles de la bulle, cadence des
   appels, liste des fichiers du moteur) s'exporte sous Node pour les tests ;
   la partie DOM ne s'exécute que dans un navigateur.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var scriptSrc = (typeof document !== "undefined" && document.currentScript && document.currentScript.src) || "";
  var api = factory(root, scriptSrc);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    root.WisyAssistant = root.WisyAssistant || {};
    root.WisyAssistant.Launcher = api;
    api.boot();
  }
})(typeof self !== "undefined" ? self : this, function (root, scriptSrc) {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Réglages (un seul endroit)                                          */
  /* ------------------------------------------------------------------ */
  var CONFIG = {
    introDelay: 3000,        // ms entre le montage et la bulle d'accueil (2–4 s)
    introDuration: 9000,     // ms de visibilité de la bulle d'accueil
    hintDelay: 140,          // ms de survol avant de révéler la bulle
    hintHold: 260,           // ms avant de la masquer après la sortie du survol
    cueMin: 16000,           // intervalle mini entre deux appels de présence
    cueMax: 24000,           // intervalle maxi
    cueCount: 3,             // appels maximum par SESSION (0 = aucun)
    cueLiftDuration: 5000,   // durée de la micro-animation « mascotte -3 px »
    cueHaloDuration: 3400,   // durée du halo
    noticeDuration: 9000,    // ms de visibilité de l'avis « indisponible »
    prefetchDelay: 3000,     // ms après le chargement avant le pré-téléchargement
    loadTimeout: 12000       // ms max pour charger le moteur
  };
  var KEYS = { intro: "wisyAssistantIntroSeen", engaged: "wisyAssistantEngaged", cues: "wisyAssistantCues" };   // drapeaux / compteur d'interface, en sessionStorage

  /* Fichiers du moteur, DANS L'ORDRE d'exécution (chemins depuis la racine du site). */
  var ENGINE_FILES = [
    "js/faq-data.js",
    "js/faq-search.js",
    "js/assistant/knowledge.js",
    "js/assistant/retrieval.js",
    "js/assistant/validation.js",
    "js/assistant/responder.js",
    "js/assistant/assistant.js"
  ];
  var PANEL_CSS = "css/assistant-panel.css";
  var ASSET_DIR = "assets/images/assistant/";

  /* ------------------------------------------------------------------ */
  /* Logique pure (testée sous Node)                                     */
  /* ------------------------------------------------------------------ */
  function read(storage, key) { try { return storage ? storage.getItem(key) : null; } catch (e) { return null; } }
  function write(storage, key, value) { try { if (storage) storage.setItem(key, value); } catch (e) { /* silencieux */ } }

  /** Stockage de session utilisable, sinon null (mode privé strict, cookies bloqués…). */
  function safeStorage(host) {
    try {
      var s = (host || root).sessionStorage;
      s.setItem("__wa", "1"); s.removeItem("__wa");
      return s;
    } catch (e) { return null; }
  }

  /**
   * La bulle d'accueil doit-elle s'afficher ?
   * Jamais si : pas de stockage (on ne saurait pas s'en souvenir → on n'insiste pas),
   * déjà vue ou engagement dans la session, page Centre d'aide.
   */
  function shouldShowIntro(o) {
    if (!o || !o.storage) return false;
    if (o.page === "faq") return false;
    if (read(o.storage, KEYS.intro) || read(o.storage, KEYS.engaged)) return false;
    return true;
  }

  /** Délai (ms) avant le prochain appel de présence : 16–24 s, jamais plus fréquent. */
  function nextCueDelay(rand, cfg) {
    cfg = cfg || CONFIG;
    var r = typeof rand === "number" ? rand : Math.random();
    return Math.round(cfg.cueMin + (cfg.cueMax - cfg.cueMin) * Math.min(1, Math.max(0, r)));
  }

  /** Nature du n-ième appel : alternance halo / mascotte — jamais deux effets à la fois. */
  function cueKind(n) { return n % 2 === 0 ? "halo" : "lift"; }

  /** Un appel de présence est-il autorisé maintenant ? */
  function canCue(s, cfg) {
    cfg = cfg || CONFIG;
    return cfg.cueCount > 0 && s.count < cfg.cueCount && !s.reduced && !s.open && !s.engaged && !s.hovered;
  }

  var TYPING = /^(INPUT|TEXTAREA|SELECT)$/;
  /** L'utilisateur est-il en train de saisir ? (ne jamais distraire pendant la saisie) */
  function isTyping(node) {
    return !!node && (TYPING.test(node.tagName || "") || node.isContentEditable === true);
  }

  /* ------------------------------------------------------------------ */
  /* Partie navigateur                                                   */
  /* ------------------------------------------------------------------ */
  var IC = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'
  };
  function icon(inner, w) {
    return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }

  /** Création d'éléments — jamais d'innerHTML pour du texte ; `html` réservé à nos SVG de confiance. */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "class") n.className = v;
        else n.setAttribute(k, v);
      }
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  var NS = null;                                  // window.WisyAssistant (posé par boot)
  var S = {                                       // état du launcher
    mounted: false, open: false, opening: false, engine: null, prefetched: false,
    root: null, wrap: null, fab: null, invite: null, live: null,
    storage: null, page: "", reduceMq: null,
    hovered: false, engaged: false, introShown: false, cues: 0, pending: null, quiet: false,
    timers: {}, off: []
  };
  var SITE = (function () {
    try { return scriptSrc ? new URL("../../", scriptSrc).href : document.baseURI; } catch (e) { return ""; }
  })();

  function url(rel) { try { return new URL(rel, SITE).href; } catch (e) { return rel; } }
  function lang() { return (root.WisyI18N && root.WisyI18N.current()) || document.documentElement.getAttribute("lang") || "fr"; }
  function t(key, fallback) {
    var v = root.WisyI18N ? root.WisyI18N.get(lang(), key) : null;
    return (v == null || v === "") ? fallback : v;
  }
  function reduced() { return !!(S.reduceMq && S.reduceMq.matches); }

  function later(name, fn, ms) { clearTimeout(S.timers[name]); S.timers[name] = setTimeout(fn, ms); }
  function clear(name) { clearTimeout(S.timers[name]); delete S.timers[name]; }
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    S.off.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function idle(fn, timeout) {
    if (root.requestIdleCallback) root.requestIdleCallback(fn, { timeout: timeout || 1500 });
    else setTimeout(fn, 250);
  }

  /** Événements anonymes, SANS contenu ni donnée personnelle : aucune requête réseau ici —
      le site peut les relayer vers son outil analytics EN RESPECTANT son consentement. */
  function track(name, data) {
    try {
      document.dispatchEvent(new CustomEvent("wisy:analytics", { detail: Object.assign({ event: name }, data || {}) }));
    } catch (e) { /* silencieux */ }
  }

  function pageName() { return (location.pathname.split("/").pop() || "index.html").toLowerCase().replace(/\.html$/, ""); }

  /* ---------------- Mascotte (image responsive + repli propre) ---------------- */
  function assetSet(fmt) {
    return url(ASSET_DIR + "wisy-assistant-144." + fmt) + " 144w, " + url(ASSET_DIR + "wisy-assistant-216." + fmt) + " 216w";
  }
  /**
   * Insère la mascotte dans `host` : <picture> AVIF → WebP, tailles 144/216 px (2×/3×),
   * dimensions explicites (aucun CLS), décorative (le nom accessible vient du bouton).
   * Si l'image ne charge pas : glyphe assistant (classe .is-fallback), jamais un cercle cassé.
   */
  function avatarInto(host, o) {
    o = o || {};
    var sizes = o.sizes || "72px", px = o.size || 72;
    var pic = el("picture", { class: "wa-avatar" }, [
      el("source", { type: "image/avif", srcset: assetSet("avif"), sizes: sizes }),
      el("source", { type: "image/webp", srcset: assetSet("webp"), sizes: sizes })
    ]);
    var img = el("img", {
      src: url(ASSET_DIR + "wisy-assistant-144.webp"), srcset: assetSet("webp"), sizes: sizes,
      width: px, height: px, alt: "", decoding: "async", draggable: "false"
    });
    img.addEventListener("error", function () { host.classList.add("is-fallback"); });
    pic.appendChild(img);
    host.appendChild(pic);
    host.appendChild(el("span", { class: "wa-fallback", "aria-hidden": "true", html: icon(IC.chat) }));
    return host;
  }

  /* ---------------- Construction ---------------- */
  function build() {
    S.root = el("div", { id: "wisy-assistant", dir: "ltr" });   // interface fr/en/nl : jamais inversée, même sur le site arabe (RTL)
    S.wrap = el("div", { class: "wa-launcher" });

    S.invite = el("div", { class: "wa-invite" }, [
      el("button", { type: "button", class: "wa-invite__close", html: icon(IC.close, 14) }),
      el("p", { class: "wa-invite__title" }),
      el("p", { class: "wa-invite__text" }),
      el("a", { class: "wa-invite__cta", href: "contact.html" })
    ]);

    var disc = avatarInto(el("span", { class: "wa-disc" }), { sizes: "(max-width: 640px) 58px, 72px", size: 72 });
    S.fab = el("button", {
      type: "button", class: "wa-fab",
      "aria-haspopup": "dialog", "aria-expanded": "false", "aria-describedby": "wa-fab-desc"
    }, [
      disc,
      el("span", { class: "wa-fab__halo", "aria-hidden": "true" }),
      el("span", { class: "wa-fab__status", "aria-hidden": "true" }),
      el("span", { class: "wa-fab__badge", "aria-hidden": "true" }),
      el("span", { class: "wa-fab__chev", "aria-hidden": "true", html: icon(IC.chevron, 12) })
    ]);
    S.live = el("span", { class: "wa-sr", "aria-live": "polite", "aria-atomic": "true" });

    S.wrap.appendChild(S.invite);
    S.wrap.appendChild(S.fab);
    S.wrap.appendChild(el("span", { id: "wa-fab-desc", class: "wa-sr" }));
    S.wrap.appendChild(S.live);
    S.root.appendChild(S.wrap);
    document.body.appendChild(S.root);
    relabel();
  }

  /** (Re)pose tous les libellés : à la construction et à chaque changement de langue. */
  function relabel() {
    if (!S.fab) return;
    S.fab.setAttribute("aria-label", S.open ? t("assistant.launcher_close", "Fermer l’Assistant Wisy") : t("assistant.launcher_open", "Ouvrir l’Assistant Wisy"));
    S.wrap.querySelector("#wa-fab-desc").textContent = t("assistant.launcher_desc", "Assistant virtuel de Wisy Safety : il répond automatiquement à vos questions à partir des informations publiées sur ce site.");
    S.fab.querySelector(".wa-fab__badge").textContent = t("assistant.badge_ai", "IA");
    S.invite.querySelector(".wa-invite__close").setAttribute("aria-label", t("assistant.bubble_dismiss", "Masquer ce message"));
    S.invite.querySelector(".wa-invite__cta").textContent = t("assistant.unavailable_cta", "Nous contacter");
    setInviteText(S.inviteKind || "default");
  }

  function setInviteText(kind) {
    S.inviteKind = kind;
    var notice = kind === "notice";
    S.invite.querySelector(".wa-invite__title").textContent = notice
      ? t("assistant.unavailable_title", "Assistant momentanément indisponible")
      : t("assistant.launcher_title", "Besoin d’aide ?");
    S.invite.querySelector(".wa-invite__text").textContent = notice
      ? t("assistant.unavailable_text", "Réessayez dans un instant ou contactez l’équipe.")
      : t("assistant.launcher_text", "Demandez à l’Assistant Wisy");
  }

  /* ---------------- Bulle : intro, survol, avis ---------------- */
  function inviteVisible() {
    var c = S.root.classList;
    return c.contains("is-intro") || c.contains("is-hint") || c.contains("is-notice");
  }
  function hideInvite() {
    clear("introHide"); clear("hintShow"); clear("hintHide"); clear("notice");
    S.root.classList.remove("is-intro", "is-hint", "is-notice");
  }

  function scheduleIntro() {
    if (!shouldShowIntro({ storage: S.storage, page: S.page })) return;
    later("intro", function () { whenVisible(showIntro); }, CONFIG.introDelay);
  }
  function whenVisible(fn) {
    if (!document.hidden) return fn();
    var h = function () { if (!document.hidden) { document.removeEventListener("visibilitychange", h); fn(); } };
    document.addEventListener("visibilitychange", h);
    S.off.push(function () { document.removeEventListener("visibilitychange", h); });
  }
  function showIntro() {
    if (S.open || S.opening || S.engaged || S.hovered || S.introShown) return;
    if (!shouldShowIntro({ storage: S.storage, page: S.page })) return;
    S.introShown = true;
    write(S.storage, KEYS.intro, "1");                 // « vue » dès l'affichage : jamais deux fois par session
    setInviteText("default");
    S.root.classList.add("is-intro");
    track("assistant_intro_shown", { page: S.page });
    later("introHide", function () { S.root.classList.remove("is-intro"); scheduleCue(); }, CONFIG.introDuration);
  }

  function showHint() {
    if (S.open || S.root.classList.contains("is-notice")) return;
    setInviteText("default");
    S.root.classList.add("is-hint");
  }
  function hideHint() { S.root.classList.remove("is-hint"); }

  function showNotice() {
    setInviteText("notice");
    S.root.classList.remove("is-intro", "is-hint");
    S.root.classList.add("is-notice");
    S.live.textContent = t("assistant.unavailable_title", "") + ". " + t("assistant.unavailable_text", "");
    later("notice", function () { S.root.classList.remove("is-notice"); S.live.textContent = ""; }, CONFIG.noticeDuration);
  }

  /* ---------------- Appels de présence (une micro-animation à la fois) ---------------- */
  function cueState() {
    return { count: S.cues, reduced: reduced(), open: S.open || S.opening, engaged: S.engaged, hovered: S.hovered };
  }
  function scheduleCue() {
    clear("cue");
    if (!canCue(cueState())) return;
    later("cue", runCue, nextCueDelay());
  }
  function runCue() {
    if (!canCue(cueState())) return;
    if (document.hidden || inviteVisible() || isTyping(document.activeElement)) return scheduleCue();   // pas maintenant : on retente plus tard
    var kind = cueKind(S.cues);
    S.cues++;
    write(S.storage, KEYS.cues, String(S.cues));       // plafond par session : pas d'appels répétés d'une page à l'autre
    S.root.classList.add("is-cue-" + kind);
    later("cueEnd", function () { S.root.classList.remove("is-cue-" + kind); scheduleCue(); },
      kind === "lift" ? CONFIG.cueLiftDuration : CONFIG.cueHaloDuration);
  }
  function stopCues() {
    clear("cue"); clear("cueEnd");
    S.root.classList.remove("is-cue-lift", "is-cue-halo");
  }

  /* ---------------- Engagement du visiteur ---------------- */
  function engage() {
    S.engaged = true;
    write(S.storage, KEYS.engaged, "1");
    write(S.storage, KEYS.intro, "1");
    stopCues(); hideInvite();
  }

  /* ---------------- Chargement à la demande du moteur + panneau ---------------- */
  function engineHas(path) {
    var A = NS || {};
    switch (path) {
      case "js/faq-data.js": return !!(root.WisyFAQ && root.WisyFAQ.CATEGORIES);
      case "js/faq-search.js": return !!(root.WisyFAQ && root.WisyFAQ.search);
      case "js/assistant/knowledge.js": return !!A.Knowledge;
      case "js/assistant/retrieval.js": return !!A.Retrieval;
      case "js/assistant/validation.js": return !!A.Validation;
      case "js/assistant/responder.js": return !!A.Responder;
      case "js/assistant/assistant.js": return !!A.panel;
      default: return false;
    }
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = false;                    // exécution dans l'ordre d'insertion
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("script " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector("link[data-wa-css]")) return resolve();
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href; l.setAttribute("data-wa-css", "panel");
      l.onload = function () { resolve(); };
      l.onerror = function () { if (l.parentNode) l.parentNode.removeChild(l); reject(new Error("css")); };   // retrait : un nouvel essai est possible
      document.head.appendChild(l);
    });
  }
  function ensureEngine() {
    if (S.engine) return S.engine;
    var p = new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error("timeout")); }, CONFIG.loadTimeout);
      var scripts = ENGINE_FILES.filter(function (f) { return !engineHas(f); }).map(function (f) { return loadScript(url(f)); });
      Promise.all(scripts.concat([loadCss(url(PANEL_CSS))])).then(function () {
        clearTimeout(timer);
        if (NS && NS.panel) resolve(); else reject(new Error("panel"));
      }, function (e) { clearTimeout(timer); reject(e); });
    });
    S.engine = p;
    p["catch"](function () { if (S.engine === p) S.engine = null; });   // autorise un nouvel essai
    return p;
  }
  /** Chargement « par intention » (survol, focus, toucher) : silencieux, le clic réessaiera. */
  function preload() { ensureEngine()["catch"](function () {}); }

  /** Pré-téléchargement à basse priorité (sans exécuter), sauf économie de données / 2G. */
  function prefetch() {
    if (S.prefetched || S.engine) return;
    var c = root.navigator && root.navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    S.prefetched = true;
    var rl = document.createElement("link").relList;
    if (!(rl && rl.supports && rl.supports("prefetch"))) { preload(); return; }   // Safari : on charge (hors chemin critique)
    var add = function (href, as) {
      var l = document.createElement("link");
      l.rel = "prefetch"; l.href = href; if (as) l.as = as;
      document.head.appendChild(l);
    };
    ENGINE_FILES.forEach(function (f) { if (!engineHas(f)) add(url(f), "script"); });
    add(url(PANEL_CSS), "style");
  }

  /* ---------------- Ouverture / fermeture ---------------- */
  function open(opts) {
    mount();
    if (!S.mounted) return;
    if (S.open) { if (opts && opts.ask && NS.panel) NS.panel.ask(opts.ask); return; }
    S.pending = opts || S.pending;
    if (S.opening) return;
    S.opening = true;
    setLoading(true);
    ensureEngine().then(function () {
      S.opening = false; setLoading(false);
      var o = S.pending; S.pending = null;
      NS.panel.open(o || {});
    }, function () {
      S.opening = false; setLoading(false); S.pending = null;
      showNotice();
      track("assistant_error", { stage: "load" });
    });
  }
  function close() { if (S.open && NS.panel) NS.panel.close(); }
  function toggle() { if (S.open) close(); else open(); }
  function ask(text) { open({ ask: text }); }
  function isOpen() { return !!S.open; }

  function setLoading(flag) {
    S.root.classList.toggle("is-loading", !!flag);
    if (flag) S.fab.setAttribute("aria-busy", "true"); else S.fab.removeAttribute("aria-busy");
    S.live.textContent = flag ? t("assistant.loading", "Ouverture de l’assistant…") : "";
  }
  /** Appelé par le panneau : synchronise l'état visuel et sémantique du launcher. */
  function setOpen(flag) {
    S.open = !!flag;
    if (!S.root) return;
    S.root.classList.toggle("is-open", S.open);
    S.fab.setAttribute("aria-expanded", S.open ? "true" : "false");
    S.fab.setAttribute("aria-label", S.open ? t("assistant.launcher_close", "Fermer l’Assistant Wisy") : t("assistant.launcher_open", "Ouvrir l’Assistant Wisy"));
    if (S.open) { engage(); track("assistant_opened", { page: S.page }); }
    else { track("assistant_closed", { page: S.page }); }
  }
  function attachPanel(node) { if (S.fab && node && node.id) S.fab.setAttribute("aria-controls", node.id); }
  function focusFab() {
    S.quiet = true;                                   // focus « rendu » : pas de bulle qui réapparaît
    try { S.fab.focus(); } catch (e) { /* silencieux */ }
    S.quiet = false;
  }

  /* ---------------- Montage ---------------- */
  function mount() {
    if (S.mounted) return;
    if (document.getElementById("wisy-assistant")) return;   // déjà présent (double inclusion)
    NS = root.WisyAssistant;
    S.storage = safeStorage();
    S.page = pageName();
    S.reduceMq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (root.WISY_ASSISTANT_CONFIG && root.WISY_ASSISTANT_CONFIG.launcher) Object.assign(CONFIG, root.WISY_ASSISTANT_CONFIG.launcher);
    S.engaged = !!read(S.storage, KEYS.engaged);
    S.cues = parseInt(read(S.storage, KEYS.cues), 10) || 0;
    build();
    S.mounted = true;
    document.body.classList.add("has-wisy-assistant");    // réserve la place au bas du pied de page

    /* Interactions */
    on(S.fab, "click", function () { track("assistant_launcher_clicked", { page: S.page }); engage(); toggle(); });
    on(S.invite, "click", function (e) {
      if (e.target.closest(".wa-invite__close")) { e.stopPropagation(); engage(); focusFab(); return; }
      if (e.target.closest(".wa-invite__cta")) return;    // lien « Nous contacter » : navigation normale
      track("assistant_launcher_clicked", { page: S.page, via: "bubble" }); engage(); open();
    });
    on(S.wrap, "pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      S.hovered = true; stopCues(); preload();
      clear("hintHide"); later("hintShow", showHint, CONFIG.hintDelay);
    });
    on(S.wrap, "pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      clear("hintShow"); later("hintHide", hideHint, CONFIG.hintHold);
    });
    on(S.fab, "touchstart", preload, { passive: true });
    on(S.fab, "focus", function () {
      if (S.quiet) return;
      S.hovered = true; stopCues(); preload();
      var kb = true; try { kb = S.fab.matches(":focus-visible"); } catch (e) { /* ancien navigateur */ }
      if (kb) showHint();
    });
    on(S.fab, "blur", hideHint);
    on(document, "keydown", function (e) {                 // Échap : ferme la bulle (le panneau gère le sien)
      if (e.key === "Escape" && !S.open && inviteVisible()) hideInvite();
    });
    on(document, "i18n:changed", relabel);
    if (S.reduceMq && S.reduceMq.addEventListener) on(S.reduceMq, "change", function () { if (reduced()) stopCues(); });

    /* Cycle de vie : apparition douce, puis bulle d'accueil, appels, pré-téléchargement */
    requestAnimationFrame(function () { requestAnimationFrame(function () { S.wrap.classList.add("is-ready"); }); });
    track("assistant_launcher_viewed", { page: S.page });
    scheduleIntro();
    if (!shouldShowIntro({ storage: S.storage, page: S.page })) later("firstCue", scheduleCue, 6000);
    later("prefetch", function () { idle(prefetch, 4000); }, CONFIG.prefetchDelay);
  }

  /** Démontage complet (tests, intégration dans une appli monopage) : timers, écouteurs, DOM. */
  function destroy() {
    Object.keys(S.timers).forEach(clear);
    S.off.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* silencieux */ } });
    if (S.root && S.root.parentNode) S.root.parentNode.removeChild(S.root);
    document.body.classList.remove("has-wisy-assistant");
    S.mounted = false; S.open = false; S.opening = false; S.root = S.wrap = S.fab = S.invite = S.live = null;
    S.hovered = S.engaged = S.introShown = S.quiet = false; S.cues = 0; S.pending = null; S.inviteKind = "";   // remontage propre
  }

  function boot() {
    if (typeof document === "undefined") return;
    NS = root.WisyAssistant = root.WisyAssistant || {};
    NS.controller = { open: open, close: close, toggle: toggle, ask: ask, isOpen: isOpen };
    var run = function () { idle(mount, 1500); };            // page stable d'abord (LCP/CLS préservés)
    if (document.readyState === "complete") run();
    else root.addEventListener("load", run, { once: true });
  }

  return {
    CONFIG: CONFIG, KEYS: KEYS, ENGINE_FILES: ENGINE_FILES, PANEL_CSS: PANEL_CSS, ASSET_DIR: ASSET_DIR,
    safeStorage: safeStorage, shouldShowIntro: shouldShowIntro, nextCueDelay: nextCueDelay,
    cueKind: cueKind, canCue: canCue, isTyping: isTyping,
    el: el, avatarInto: avatarInto, track: track, reduced: reduced,
    setOpen: setOpen, attachPanel: attachPanel, focusFab: focusFab,
    boot: boot, destroy: destroy
  };
});
