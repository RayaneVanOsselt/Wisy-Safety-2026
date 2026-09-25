/* =========================================================================
   WISY SAFETY — AgendaCalendarSection
   -------------------------------------------------------------------------
   Composant ISOLÉ de la page Agenda (agenda.html). Aujourd'hui : un état vide
   soigné. Demain : le calendrier Outlook de Wisy Safety, SANS reconstruire la
   section — il suffit de renseigner UNE valeur :

       <div class="agc" data-agenda-calendar data-calendar-url="https://…">

   (ou, pour tout le site : window.WISY_CONFIG.AGENDA_CALENDAR_URL dans
   js/supabase-config.js). Aucune URL n'est codée en dur ici, aucune n'est fictive.

   Comportement
     • Pas d'URL, ou URL refusée  → état « planned » : l'état vide reste affiché,
       la barre indique « Intégration Outlook prévue » (jamais « synchronisé »).
     • URL valide → un <iframe> ISOLÉ est créé quand la section approche de
       l'écran (chargement paresseux) :
         - sandbox (scripts + origine propre + pop-ups sortants, JAMAIS de
           navigation du site parent), referrerpolicy, titre accessible ;
         - état « loading » (aria-busy) puis « ready » au chargement ;
         - au-delà de 12 s : état « slow » + lien de secours (nouvel onglet) ;
         - hauteur responsive gérée en CSS (css/agenda.css).
     • Sécurité de l'URL : https uniquement, hôte dans une liste blanche
       (Outlook / Microsoft 365 par défaut ; d'autres hôtes exacts peuvent être
       ajoutés avec data-allowed-hosts="hote1 hote2"), pas d'identifiants, pas
       de port exotique, pas de caractères de contrôle. Une URL invalide n'est
       jamais rendue et n'affiche aucune erreur technique au visiteur.

   États exposés sur la racine : data-state="planned|loading|ready|slow".
   Module « dual-mode » : navigateur (auto-initialisation sur [data-agenda-calendar])
   et Node (fonctions pures testées dans tests/agenda.test.js). Aucune dépendance.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    root.WisyAgenda = root.WisyAgenda || {};
    root.WisyAgenda.AgendaCalendarSection = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.autoInit);
    else api.autoInit();
  }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /* Hôtes autorisés par défaut : agenda publié Outlook / Microsoft 365 / Outlook.com / Bookings. */
  var DEFAULT_HOSTS = ["outlook.office365.com", "outlook.office.com", "outlook.live.com"];
  var OUTLOOK_HOST = /^outlook\.(office365|office|live)\.com$/;
  var LOAD_TIMEOUT = 12000;                 // ms avant l'état « slow »
  var LAZY_MARGIN = "400px";                // on charge un peu avant d'arriver à l'écran
  /* Isolation : scripts + origine PROPRE du calendrier (cross-origin : aucun accès au site),
     pop-ups pour ouvrir un événement ; pas de allow-top-navigation → il ne peut pas rediriger la page. */
  var SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms";

  /* Libellés français = repli du code (et de tests/agenda.test.js). Traduits à l'affichage via le
     dictionnaire de la page (js/i18n-data-agenda.js, clés « ag.st_* » / « ag.cal_title »). */
  var LABELS = {
    planned: "Intégration Outlook prévue",
    loading: "Chargement de l’agenda…",
    ready: "Agenda en ligne",
    readyOutlook: "Synchronisé avec Outlook",
    slow: "L’agenda met du temps à répondre"
  };
  var LABEL_KEYS = { planned: "ag.st_planned", loading: "ag.st_loading", ready: "ag.st_ready", readyOutlook: "ag.st_ready_outlook", slow: "ag.st_slow" };

  /* ------------------------------------------------------------------ */
  /* Logique pure (testée sous Node)                                     */
  /* ------------------------------------------------------------------ */

  /** Liste d'hôtes « exacts » saisie dans data-allowed-hosts (séparés par espaces / virgules). */
  function parseHosts(text) {
    return String(text == null ? "" : text).toLowerCase().split(/[\s,]+/)
      .filter(function (h) { return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(h) && h.indexOf("..") === -1; });
  }

  /**
   * URL d'agenda sûre ? Renvoie l'URL normalisée, ou null.
   * https uniquement · hôte exact autorisé · sans identifiants · sans port exotique ·
   * sans espace ni caractère de contrôle · jamais relative ni « protocole-relative ».
   */
  function safeCalendarUrl(raw, extraHosts) {
    if (typeof raw !== "string") return null;
    var s = raw.trim();
    if (!s || s.length > 2048 || /[\x00-\x1f\x7f\s]/.test(s)) return null;
    var u;
    try { u = new URL(s); } catch (e) { return null; }          // sans base : une URL relative échoue
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (u.port && u.port !== "443") return null;
    var allowed = DEFAULT_HOSTS.concat(extraHosts || []);
    if (allowed.indexOf(u.hostname.toLowerCase()) === -1) return null;
    return u.href;
  }

  /** Lit la configuration : attributs data-* de la section, sinon window.WISY_CONFIG. */
  function resolveConfig(el, win) {
    var get = function (n) { return el && el.getAttribute ? el.getAttribute(n) : null; };
    var cfg = (win && win.WISY_CONFIG) || {};
    var hosts = parseHosts(get("data-allowed-hosts"));
    var raw = get("data-calendar-url");
    if (!raw || !String(raw).trim()) raw = cfg.AGENDA_CALENDAR_URL;
    return {
      url: safeCalendarUrl(raw, hosts),
      title: get("data-calendar-title") || "Agenda des formations Wisy Safety"
    };
  }

  /**
   * Libellé de la barre d'état ; « Synchronisé avec Outlook » seulement pour un vrai agenda Outlook chargé.
   * `tr(clé, repli)` (facultatif) fournit la traduction ; sans lui, le texte est en français.
   */
  function statusText(state, url, tr) {
    var pick = function (name) { return tr ? tr(LABEL_KEYS[name], LABELS[name]) : LABELS[name]; };
    if (state === "ready") {
      var host = ""; try { host = new URL(url).hostname; } catch (e) { /* url absente */ }
      return pick(OUTLOOK_HOST.test(host) ? "readyOutlook" : "ready");
    }
    return pick(LABELS[state] ? state : "planned");
  }

  /* ------------------------------------------------------------------ */
  /* Partie navigateur                                                   */
  /* ------------------------------------------------------------------ */
  function q(el, sel) { return el.querySelector(sel); }

  /* Traduction : dictionnaire de la page (WisyI18N) si présent, sinon repli français. */
  function tr(key, fallback) {
    var i = root.WisyI18N, v = i && i.get ? i.get(i.current(), key) : null;
    return v != null ? v : fallback;
  }

  function setState(el, state, url) {
    el.setAttribute("data-state", state);
    el.__agcUrl = url;
    var label = q(el, "[data-agc-status]");
    if (label) label.textContent = statusText(state, url, tr);
  }

  function createFrame(cfg) {
    var f = document.createElement("iframe");
    f.className = "agc__iframe";
    f.title = tr("ag.cal_title", cfg.title);                    // nom accessible (traduit)
    f.loading = "lazy";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.setAttribute("sandbox", SANDBOX);
    f.src = cfg.url;
    return f;
  }

  /**
   * Monte le composant sur `el` ([data-agenda-calendar]). Retourne { state(), destroy() }.
   * Sans URL valide : ne touche à rien (l'état vide reste affiché).
   */
  function mount(el, win) {
    win = win || root;
    var cfg = resolveConfig(el, win);
    var timer = null, io = null, frame = null, done = false;
    var ctrl = { state: function () { return el.getAttribute("data-state"); }, destroy: destroy };

    setState(el, "planned");
    if (!cfg.url) return ctrl;

    var empty = q(el, "[data-agc-empty]"), box = q(el, "[data-agc-frame]"), host = q(el, "[data-agc-slot]");
    var fallback = q(el, "[data-agc-open]");
    if (!box || !host) return ctrl;                             // gabarit incomplet : on reste en état vide
    if (fallback) { fallback.setAttribute("href", cfg.url); fallback.removeAttribute("hidden"); }

    function load() {
      if (done) return;
      done = true;
      if (io) { io.disconnect(); io = null; }
      if (empty) empty.setAttribute("hidden", "");
      box.removeAttribute("hidden");
      box.setAttribute("aria-busy", "true");
      setState(el, "loading", cfg.url);
      frame = createFrame(cfg);
      frame.addEventListener("load", function () {
        clearTimeout(timer);
        box.setAttribute("aria-busy", "false");
        setState(el, "ready", cfg.url);
      });
      host.appendChild(frame);
      timer = setTimeout(function () { if (el.getAttribute("data-state") === "loading") setState(el, "slow", cfg.url); }, LOAD_TIMEOUT);
    }

    /* Chargement paresseux : seulement quand la section approche de l'écran. */
    if ("IntersectionObserver" in win) {
      io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) load();
      }, { rootMargin: LAZY_MARGIN });
      io.observe(el);
    } else {
      load();
    }

    function destroy() {
      clearTimeout(timer);
      if (io) io.disconnect();
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
    }
    return ctrl;
  }

  /* Changement de langue : le libellé d'état et le titre de l'iframe suivent (l'état, lui, ne change pas). */
  function refreshLabels() {
    var nodes = document.querySelectorAll("[data-agenda-calendar]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], label = q(el, "[data-agc-status]"), fr = q(el, "iframe");
      if (label) label.textContent = statusText(el.getAttribute("data-state"), el.__agcUrl, tr);
      if (fr) fr.title = tr("ag.cal_title", fr.title);
    }
  }

  function autoInit() {
    var nodes = document.querySelectorAll("[data-agenda-calendar]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i], root);
    if (nodes.length) document.addEventListener("i18n:changed", refreshLabels);
  }

  return {
    DEFAULT_HOSTS: DEFAULT_HOSTS, SANDBOX: SANDBOX, LOAD_TIMEOUT: LOAD_TIMEOUT, LABELS: LABELS,
    parseHosts: parseHosts, safeCalendarUrl: safeCalendarUrl, resolveConfig: resolveConfig, statusText: statusText,
    mount: mount, autoInit: autoInit
  };
});
