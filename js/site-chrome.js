/* =========================================================================
   WISY SAFETY — Comportements communs de la coque du site (en-tête, menu mobile, pied de page, apparition)
   -------------------------------------------------------------------------
   Les pages historiques (index, formations, BEPS…) embarquent chacune leur copie de ces comportements. Les
   nouvelles pages (VCA Base et ses articles) partagent CE fichier au lieu d'en ajouter une quatrième copie.
   Le comportement est identique à celui des autres pages :

     initHeader()        en-tête collant (état « scrollé »), sous-menu Formations, menu mobile, --header-offset
     initFooterStatus()  jour courant, statut d'ouverture traduit, année
     initScrollReveal()  entrées au scroll (IntersectionObserver), cascade 70 ms — désactivée en mouvement réduit

   Expose aussi `window.WisyChrome.track(nom, détail)` : émet l'événement `wisy:analytics` (convention du site,
   voir js/cookie-consent.js : rien n'est relayé sans le consentement « mesure d'audience »). Aucune donnée
   personnelle n'est jamais placée dans un événement.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const currentLang = () => (window.WisyI18N && window.WisyI18N.current()) || "fr";
  const tr = (key, fallback) => {
    const v = window.WisyI18N ? window.WisyI18N.get(currentLang(), key) : null;
    return v != null ? v : fallback;
  };

  function track(name, detail) {
    try { document.dispatchEvent(new CustomEvent("wisy:analytics", { detail: Object.assign({ event: name, lang: currentLang() }, detail || {}) })); }
    catch (e) { /* silencieux */ }
  }

  function initHeader() {
    const header = $(".site-header");
    if (!header) return;

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* Hauteur utile de l'en-tête (sans la barre utilitaire, repliée au scroll) : sert aux ancres et aux titres collants. */
    const util = $(".util-bar", header);
    const setOffset = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight - (util ? util.offsetHeight : 0) + 16}px`);
    setOffset();
    window.addEventListener("resize", setOffset);
    if ("ResizeObserver" in window) new ResizeObserver(setOffset).observe(header);

    const wrap = $(".has-dropdown");
    if (wrap) {
      const trigger = $(".nav-link", wrap);
      let timer = null;
      const open = () => { clearTimeout(timer); wrap.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); };
      const close = () => { wrap.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
      wrap.addEventListener("mouseenter", open);
      wrap.addEventListener("mouseleave", () => { clearTimeout(timer); timer = setTimeout(close, 250); });
      wrap.addEventListener("mousemove", () => { if (wrap.classList.contains("is-open")) clearTimeout(timer); });
      trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); trigger.focus(); } });
      wrap.addEventListener("focusout", (e) => { if (!wrap.contains(e.relatedTarget)) close(); });
      document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
    }

    const toggle = $(".nav-toggle"), panel = $(".m-panel"), scrim = $(".m-scrim"), closeBtn = $(".m-close");
    if (toggle && panel && scrim) {
      const openMenu = () => { panel.classList.add("is-open"); scrim.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
      const closeMenu = () => { panel.classList.remove("is-open"); scrim.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; toggle.focus(); };
      toggle.addEventListener("click", openMenu);
      if (closeBtn) closeBtn.addEventListener("click", closeMenu);
      scrim.addEventListener("click", closeMenu);
      window.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) closeMenu(); });
      $$(".m-acc__trigger").forEach((btn) => {
        const list = btn.nextElementSibling;
        btn.addEventListener("click", () => {
          const isOpen = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", String(!isOpen));
          list.classList.toggle("is-open", !isOpen);
        });
      });
    }
  }

  /* Pied de page : jour courant, statut d'ouverture traduit (lundi → jeudi, 10 h → 16 h), année */
  function initFooterStatus() {
    const SCHEDULE = { 1: [600, 960], 2: [600, 960], 3: [600, 960], 4: [600, 960], 5: null, 6: null, 0: null };
    const today = $(`.f-hours li[data-day="${new Date().getDay()}"]`);
    if (today) today.classList.add("is-today");

    const refresh = () => {
      const badge = $(".status-badge");
      if (!badge) return;
      const now = new Date(), range = SCHEDULE[now.getDay()], minutes = now.getHours() * 60 + now.getMinutes();
      const open = !!range && minutes >= range[0] && minutes < range[1];
      badge.classList.toggle("is-open", open);
      $(".status-text", badge).textContent = open
        ? tr("footer.status_open", "ACTUELLEMENT OUVERT")
        : tr("footer.status_closed", "ACTUELLEMENT FERMÉ");
    };
    refresh();
    document.addEventListener("i18n:changed", refresh);

    const year = $("[data-year]");
    if (year) year.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* Apparition au scroll : opacity 0→1, translateY(20px)→0. Cascade de 70 ms entre éléments d'un groupe [data-stagger]. */
  function initScrollReveal() {
    $$("[data-stagger]").forEach((group) => {
      $$(".reveal", group).forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 7) * 0.07}s`));
    });
    const targets = $$(".reveal");
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => io.observe(el));
  }

  /* Événements de conversion de la formation VCA Base : tout lien portant data-vca-track (signup · agenda · phone ·
     email · article) émet vca_signup_click / vca_agenda_click / vca_phone_click / vca_email_click / vca_article_click.
     data-vca-from = emplacement du lien ; data-vca-session = identifiant d'une session choisie (jamais de donnée
     personnelle). vca_view : émis par la page ; vca_registration_start / _complete : par le parcours d'inscription. */
  const VCA_EVENTS = { signup: "vca_signup_click", agenda: "vca_agenda_click", phone: "vca_phone_click", email: "vca_email_click", article: "vca_article_click" };
  function initVcaTracking() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("[data-vca-track]");
      const name = a && VCA_EVENTS[a.getAttribute("data-vca-track")];
      if (!name) return;
      const d = { page: (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, ""), from: a.getAttribute("data-vca-from") || undefined };
      const sid = a.getAttribute("data-vca-session");
      if (sid) d.session = sid;
      track(name, d);
    });
  }

  window.WisyChrome = { track, tr, currentLang };

  const boot = () => { initHeader(); initFooterStatus(); initScrollReveal(); initVcaTracking(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
