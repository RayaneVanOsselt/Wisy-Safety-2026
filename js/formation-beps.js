/* =========================================================================
   WISY SAFETY — Page « Formation BEPS — Premiers Secours »
   -------------------------------------------------------------------------
   Fonctions séparées, sans dépendance (même structure que js/formation-nacelles.js) :
     initHeader()          header sticky, sous-menu Formations, menu mobile
     initFooterStatus()    horaires du jour + statut d'ouverture
     initScrollReveal()    entrées au scroll (IntersectionObserver), cascade 70 ms
     initAccordions()      programme + FAQ (aria-expanded / aria-controls, clavier)
     initTabs()             onglets « Face à une urgence » (role=tablist, flèches)
     initChain()            chaîne des secours : ligne animée au scroll + révélation par étape
     initSmoothScroll()    ancres internes (respecte prefers-reduced-motion)
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

  /* =======================================================================
     HEADER — sticky (état « scrollé »), sous-menu Formations, menu mobile
     (comportements identiques à ceux des autres pages du site)
     ======================================================================= */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

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

  /* Pied de page : jour courant, statut d'ouverture traduit, année */
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

  /* =======================================================================
     SCROLL REVEAL — opacity 0→1, translateY(20px)→0, 560 ms, easing premium.
     Cascade : 70 ms entre éléments d'un même groupe [data-stagger] (max ~500 ms).
     ======================================================================= */
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

  /* =======================================================================
     ACCORDÉONS — programme & FAQ. Boutons dans des <h3>, aria-expanded +
     aria-controls, panneaux `inert` tant que fermés, flèches ↑ ↓ Début Fin.
     ======================================================================= */
  function initAccordions() {
    $$("[data-accordion]").forEach((acc) => {
      const items = $$(".beps-acc__item", acc);
      const setOpen = (item, open) => {
        item.classList.toggle("is-open", open);
        $(".beps-acc__btn", item).setAttribute("aria-expanded", String(open));
        $(".beps-acc__panel", item).inert = !open;
      };
      items.forEach((item) => setOpen(item, item.classList.contains("is-open")));
      acc.classList.add("is-ready");

      acc.addEventListener("click", (e) => {
        const btn = e.target.closest(".beps-acc__btn");
        if (!btn || !acc.contains(btn)) return;
        const item = btn.closest(".beps-acc__item");
        setOpen(item, !item.classList.contains("is-open"));
      });

      acc.addEventListener("keydown", (e) => {
        const buttons = items.map((it) => $(".beps-acc__btn", it));
        const i = buttons.indexOf(document.activeElement);
        if (i < 0) return;
        const to = { ArrowDown: (i + 1) % buttons.length, ArrowUp: (i - 1 + buttons.length) % buttons.length, Home: 0, End: buttons.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        buttons[to].focus();
      });
    });
  }

  /* =======================================================================
     ONGLETS — « Face à une urgence » (role=tablist/tab/tabpanel, WAI-ARIA
     Tabs Pattern : flèches ← → Début Fin déplacent le focus ET activent).
     ======================================================================= */
  function initTabs() {
    $$("[data-tabs]").forEach((root) => {
      const tabs = $$('[role="tab"]', root);
      const panels = tabs.map((t) => $("#" + t.getAttribute("aria-controls")));
      if (!tabs.length) return;

      function activate(index) {
        tabs.forEach((t, i) => {
          const on = i === index;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          if (panels[i]) panels[i].hidden = !on;
          if (panels[i]) panels[i].classList.toggle("is-active", on);
        });
      }

      tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => activate(i));
        tab.addEventListener("keydown", (e) => {
          const to = {
            ArrowRight: (i + 1) % tabs.length,
            ArrowLeft: (i - 1 + tabs.length) % tabs.length,
            Home: 0,
            End: tabs.length - 1
          }[e.key];
          if (to === undefined) return;
          e.preventDefault();
          tabs[to].focus();
          activate(to);
        });
      });
    });
  }

  /* =======================================================================
     CHAÎNE DES SECOURS — révélation de chaque étape (via .reveal habituel)
     + ligne qui se remplit progressivement pendant que la section défile
     (transform scaleX/scaleY piloté par une custom property, pas de layout
     shift, rAF-throttled ; statique si prefers-reduced-motion).
     ======================================================================= */
  function initChain() {
    const rail = $("[data-chain-rail]");
    if (!rail) return;
    if (prefersReducedMotion()) { rail.style.setProperty("--chain-progress", "1"); return; }

    let ticking = false;
    function update() {
      ticking = false;
      const rect = rail.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // 0 quand le haut du rail atteint 80% de la hauteur d'écran, 1 quand le bas atteint 35%
      const start = vh * 0.8, end = vh * 0.35;
      const total = rect.height + (start - end);
      const traveled = start - rect.top;
      const progress = total > 0 ? Math.min(1, Math.max(0, traveled / total)) : 0;
      rail.style.setProperty("--chain-progress", String(progress));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* =======================================================================
     FAQPage — données structurées injectées à l'exécution (comme faq.html /
     js/faq-page.js), à partir des questions/réponses réellement AFFICHÉES
     dans l'accordéon FAQ ci-dessus (jamais de contenu dupliqué à la main).
     ======================================================================= */
  function initFaqSchema() {
    const items = $$(".beps-acc--faq .beps-acc__item").map((item) => ({
      q: $(".beps-acc__t", item).textContent.trim(),
      a: $(".beps-acc__inner p", item).textContent.trim()
    })).filter((it) => it.q && it.a);
    if (!items.length) return;
    try {
      const ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((it) => ({
          "@type": "Question", name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a }
        }))
      });
      document.head.appendChild(ld);
    } catch (e) { /* silencieux */ }
  }

  /* =======================================================================
     ANCRES INTERNES — défilement doux, focus déplacé sur la cible.
     ======================================================================= */
  function initSmoothScroll() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = decodeURIComponent(link.getAttribute("href").slice(1));
      const target = id && document.getElementById(id);
      if (!target || target.hidden) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      try { history.pushState(null, "", `#${id}`); } catch (err) { /* file:// : on ignore */ }
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  }

  /* ======================================================================= */
  function init() {
    initHeader();
    initFooterStatus();
    initScrollReveal();
    initAccordions();
    initTabs();
    initChain();
    initFaqSchema();
    initSmoothScroll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
