/* =========================================================================
   WISY SAFETY — Page « Formation Nacelles Élévatrices »
   -------------------------------------------------------------------------
   Fonctions séparées, sans dépendance :
     initHeader()          header sticky, sous-menu Formations, menu mobile
     initFooterStatus()    horaires du jour + statut d'ouverture (comme les autres pages)
     initScrollReveal()    entrées au scroll (IntersectionObserver), cascade 70 ms
     initAccordions()      programme + FAQ (aria-expanded / aria-controls, clavier)
     initFocusTrap(el)     piège à focus du modal → { activate, deactivate }
     initNacelleModal()    UN SEUL modal alimenté par l'objet `nacelles`
     initSmoothScroll()    ancres internes (respecte prefers-reduced-motion)
   Scènes automatiques (points forts) : js/scenes.js (module réutilisable).

   i18n : les textes du modal viennent de l'objet `nacelles` (français, source) ;
   les traductions sont lues dans js/i18n-data-nacelles.js (clés nac.t_<type>_*),
   avec repli sur le français.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- i18n : clé → texte traduit, sinon repli (français) --- */
  const currentLang = () => (window.WisyI18N && window.WisyI18N.current()) || "fr";
  const tr = (key, fallback) => {
    const v = window.WisyI18N ? window.WisyI18N.get(currentLang(), key) : null;
    return v != null ? v : fallback;
  };

  /* =======================================================================
     DONNÉES DU MODAL — français = source ; images = dérivés de
     assets/images/Nacelle élévatrice /  (voir assets/images/nacelles/)
     ======================================================================= */
  const IMG = "assets/images/nacelles/";
  const nacelles = {
    ciseaux: {
      title: "Nacelle ciseaux",
      image: `${IMG}nacelle-ciseaux-960.webp`,
      imageAlt: "Nacelle ciseaux bleue en position haute sur un chantier",
      description: "La nacelle ciseaux est idéale pour les travaux en hauteur nécessitant une plateforme stable, spacieuse et sécurisée. Son déplacement est exclusivement vertical, ce qui en fait un excellent choix pour les interventions en intérieur comme en extérieur sur des surfaces planes.",
      fonctionnement: "Son mécanisme en ciseaux permet une élévation verticale précise grâce à un système hydraulique offrant stabilité et sécurité.",
      usages: ["Maintenance de bâtiments", "Travaux électriques", "Peinture", "Installation de faux plafonds", "Maintenance industrielle"],
      avantages: ["Grande plateforme de travail", "Excellente stabilité", "Capacité de charge importante", "Utilisation simple", "Faibles coûts d’entretien"],
      limites: ["Aucun déport horizontal", "Nécessite un sol stable", "Peu adaptée aux terrains accidentés", "Hauteur limitée par rapport aux autres modèles"]
    },
    araignee: {
      title: "Nacelle araignée",
      image: `${IMG}nacelle-araignee-960.webp`,
      imageAlt: "Nacelle araignée sur chenilles, stabilisateurs déployés, opérateur harnaché dans la plateforme",
      description: "La nacelle araignée est conçue pour accéder aux zones difficiles grâce à ses chenilles et ses stabilisateurs déployables. Elle est particulièrement adaptée aux espaces étroits et aux terrains irréguliers.",
      fonctionnement: "Les stabilisateurs assurent une parfaite stabilité tandis que les chenilles permettent de circuler sur des terrains complexes.",
      usages: ["Élagage", "Entretien de façades", "Travaux sur terrains accidentés", "Chantiers difficiles d’accès"],
      avantages: ["Passe dans les endroits très étroits", "Grande stabilité", "Convient aux terrains irréguliers", "Faible pression au sol", "Très maniable"],
      limites: ["Déplacement lent", "Mise en place plus longue", "Formation spécifique recommandée", "Coût plus élevé"]
    },
    telescopique: {
      title: "Nacelle télescopique",
      image: `${IMG}nacelle-telescopique-960.webp`,
      imageAlt: "Nacelle télescopique à flèche droite déployée",
      description: "La nacelle télescopique permet d’atteindre des hauteurs importantes ainsi qu’une grande portée horizontale. Elle est idéale lorsque l’accès direct à la zone de travail est difficile.",
      fonctionnement: "Son bras télescopique se déploie en ligne droite afin d’offrir une portée maximale.",
      usages: ["Construction", "Maintenance industrielle", "Travaux sur toitures", "Nettoyage de façades", "Inspection d’ouvrages"],
      avantages: ["Très grande hauteur de travail", "Portée horizontale importante", "Déploiement rapide", "Excellente stabilité"],
      limites: ["Nécessite un espace dégagé", "Sensible au vent", "Peu adaptée pour contourner des obstacles"]
    },
    articulee: {
      title: "Nacelle articulée",
      image: `${IMG}nacelle-articulee-960.webp`,
      imageAlt: "Nacelle articulée à bras coudé",
      description: "La nacelle articulée offre une excellente flexibilité grâce à son bras articulé. Elle permet de contourner facilement les obstacles et d’accéder aux zones les plus complexes.",
      fonctionnement: "Son bras comporte plusieurs articulations permettant des mouvements dans différentes directions.",
      usages: ["Maintenance industrielle", "Travaux urbains", "Installations électriques", "Accès derrière des obstacles"],
      avantages: ["Très grande maniabilité", "Accès aux zones difficiles", "Positionnement précis", "Contournement des obstacles"],
      limites: ["Portée horizontale plus faible que la télescopique", "Utilisation plus technique", "Entretien plus complexe"]
    },
    camion: {
      title: "Nacelle sur camion",
      image: `${IMG}nacelle-camion-960.webp`,
      imageAlt: "Nacelle montée sur camion, stabilisateurs déployés",
      description: "Montée sur un véhicule, la nacelle sur camion est idéale pour les interventions rapides nécessitant de fréquents déplacements entre plusieurs sites.",
      fonctionnement: "Le système d’élévation est fixé sur un camion équipé de stabilisateurs garantissant la sécurité lors des opérations.",
      usages: ["Éclairage public", "Télécommunications", "Élagage", "Maintenance urbaine", "Interventions d’urgence"],
      avantages: ["Grande mobilité", "Déplacements rapides", "Pas de transport supplémentaire", "Hauteurs de travail importantes"],
      limites: ["Permis adapté requis", "Coût d’exploitation élevé", "Nécessite suffisamment d’espace pour déployer les stabilisateurs"]
    },
    verticale: {
      title: "Nacelle verticale",
      image: `${IMG}nacelle-verticale-960.webp`,
      imageAlt: "Nacelle verticale à mât télescopique",
      description: "Compacte et légère, la nacelle verticale est spécialement conçue pour les travaux en intérieur dans des espaces restreints.",
      fonctionnement: "Son mât se déploie uniquement à la verticale, sans déport horizontal.",
      usages: ["Centres commerciaux", "Entrepôts", "Bureaux", "Maintenance intérieure", "Installations électriques"],
      avantages: ["Très compacte", "Silencieuse", "Sans émission", "Facile à transporter", "Excellente maniabilité"],
      limites: ["Faible hauteur de travail", "Aucun déport horizontal", "Charge limitée", "Réservée principalement aux sols plats"]
    },
    automotrice: {
      title: "Nacelle automotrice",
      image: `${IMG}nacelle-automotrice-960.webp`,
      imageAlt: "Nacelles automotrices articulées, plateformes relevées",
      description: "La nacelle automotrice est équipée d’un système de propulsion lui permettant de se déplacer même lorsque la plateforme est en hauteur, offrant ainsi un important gain de productivité.",
      fonctionnement: "L’opérateur contrôle à la fois les déplacements et l’élévation directement depuis la plateforme.",
      usages: ["Entrepôts logistiques", "Industrie", "Maintenance", "Chantiers de grande envergure"],
      avantages: ["Déplacement en hauteur", "Productivité accrue", "Réduction des temps d’intervention", "Grande autonomie"],
      limites: ["Coût d’acquisition élevé", "Formation spécifique indispensable", "Maintenance plus importante", "Respect strict des consignes de sécurité"]
    }
  };

  /* =======================================================================
     HEADER — sticky (état « scrollé »), sous-menu Formations, menu mobile
     (comportements identiques à ceux des autres pages du site)
     ======================================================================= */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;

    // état scrollé (ombre, util-bar repliée)
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // décalage des ancres = hauteur du header sticky SANS sa barre utilitaire (qui se replie au défilement) + 16 px :
    // l'ancre atterrit au bon endroit que la page soit en haut ou déjà défilée
    const util = $(".util-bar", header);
    const setOffset = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight - (util ? util.offsetHeight : 0) + 16}px`);
    setOffset();
    window.addEventListener("resize", setOffset);
    if ("ResizeObserver" in window) new ResizeObserver(setOffset).observe(header);

    // sous-menu Formations (desktop)
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

    // menu mobile
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
    const targets = $$(".reveal, [data-timeline]");
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
      const items = $$(".nac-acc__item", acc);
      const setOpen = (item, open) => {
        item.classList.toggle("is-open", open);
        $(".nac-acc__btn", item).setAttribute("aria-expanded", String(open));
        $(".nac-acc__panel", item).inert = !open; // contenu fermé : ni focusable ni lu
      };
      items.forEach((item) => setOpen(item, item.classList.contains("is-open")));
      acc.classList.add("is-ready"); // fermé par défaut seulement une fois le JS actif

      acc.addEventListener("click", (e) => {
        const btn = e.target.closest(".nac-acc__btn");
        if (!btn || !acc.contains(btn)) return;
        const item = btn.closest(".nac-acc__item");
        setOpen(item, !item.classList.contains("is-open"));
      });

      acc.addEventListener("keydown", (e) => {
        const buttons = items.map((it) => $(".nac-acc__btn", it));
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
     FOCUS TRAP — le focus clavier reste dans le conteneur (Tab / Maj+Tab).
     ======================================================================= */
  function initFocusTrap(container) {
    const SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => $$(SELECTOR, container).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const onKeydown = (e) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); container.focus(); return; }
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (!container.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first || active === container)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    return {
      activate() { document.addEventListener("keydown", onKeydown, true); },
      deactivate() { document.removeEventListener("keydown", onKeydown, true); }
    };
  }

  /* =======================================================================
     MODAL UNIQUE — alimenté par `nacelles` (jamais 7 modals).
     role=dialog · aria-modal · aria-labelledby · Échap · piège à focus ·
     retour du focus au déclencheur · arrière-plan inert · scroll verrouillé.
     ======================================================================= */
  function initNacelleModal() {
    const modal = $("#nac-modal");
    if (!modal) return;
    const dialog = $(".nac-modal__dialog", modal);
    const els = {
      img: $("#nac-modal-img"), title: $("#nac-modal-title"), desc: $("#nac-modal-desc"), count: $("#nac-modal-count"),
      principle: $("#nac-m-principle"), uses: $("#nac-m-uses"), pros: $("#nac-m-pros"), cons: $("#nac-m-cons"),
      live: $("#nac-modal-live"), scroll: $(".nac-modal__scroll", modal)
    };
    const ids = Object.keys(nacelles);
    const trap = initFocusTrap(dialog);
    let currentId = null, lastTrigger = null, closeTimer = null;
    const backgroundState = [];

    const fillList = (ul, items) => ul.replaceChildren(...items.map((label) => {
      const li = document.createElement("li");
      li.textContent = label; // textContent : jamais d'HTML injecté
      return li;
    }));
    const textOf = (id, field, fallback) => tr(`nac.t_${id}_${field}`, fallback);
    const listOf = (id, field, fallback) => {
      const v = tr(`nac.t_${id}_${field}`, null);
      return v ? v.split("|") : fallback;
    };

    function render(id) {
      const d = nacelles[id];
      if (!d) return;
      currentId = id;
      const n = ids.indexOf(id) + 1;
      els.img.src = d.image;
      els.img.alt = tr(`nac.alt_${id}`, d.imageAlt);
      els.title.textContent = textOf(id, "name", d.title);
      els.desc.textContent = textOf(id, "desc", d.description);
      els.principle.textContent = textOf(id, "principle", d.fonctionnement);
      fillList(els.uses, listOf(id, "uses", d.usages));
      fillList(els.pros, listOf(id, "pros", d.avantages));
      fillList(els.cons, listOf(id, "cons", d.limites));
      els.count.textContent = `${String(n).padStart(2, "0")} / ${String(ids.length).padStart(2, "0")}`;
      els.live.textContent = `${els.title.textContent}, ${n} / ${ids.length}`;
    }

    // Arrière-plan inerte (focus + lecteurs d'écran) pendant que le modal est ouvert
    function setBackgroundInert(on) {
      if (on) {
        Array.from(document.body.children).forEach((el) => {
          if (el === modal || el.tagName === "SCRIPT") return;
          backgroundState.push({ el, hadAria: el.hasAttribute("aria-hidden") });
          el.inert = true;
          if (!el.hasAttribute("aria-hidden")) el.setAttribute("aria-hidden", "true");
        });
      } else {
        backgroundState.splice(0).forEach(({ el, hadAria }) => {
          el.inert = false;
          if (!hadAria) el.removeAttribute("aria-hidden");
        });
      }
    }

    function lockScroll(on) {
      const root = document.documentElement;
      if (on) {
        root.style.setProperty("--nac-sbw", `${window.innerWidth - root.clientWidth}px`); // évite le saut de mise en page
        root.classList.add("nac-lock");
      } else {
        root.classList.remove("nac-lock");
        root.style.removeProperty("--nac-sbw");
      }
    }

    function open(id, trigger) {
      clearTimeout(closeTimer);
      lastTrigger = trigger || document.activeElement;
      render(id);
      els.scroll.scrollTop = 0;
      modal.hidden = false;
      lockScroll(true);
      setBackgroundInert(true);
      void modal.offsetWidth; // déclenche la transition
      modal.classList.add("is-open");
      trap.activate();
      dialog.focus({ preventScroll: true });
    }

    function close() {
      if (modal.hidden || !modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      trap.deactivate();
      setBackgroundInert(false);
      lockScroll(false);
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true }); // retour du focus
      const finish = () => { modal.hidden = true; };
      if (prefersReducedMotion()) finish(); else closeTimer = setTimeout(finish, 360);
    }

    function step(delta) {
      // l'index est avancé immédiatement : des clics rapides successifs s'additionnent
      const next = ids[(ids.indexOf(currentId) + delta + ids.length) % ids.length];
      currentId = next;
      modal.classList.add("is-swapping");
      setTimeout(() => {
        render(currentId);
        els.scroll.scrollTop = 0;
        modal.classList.remove("is-swapping");
      }, prefersReducedMotion() ? 0 : 160);
    }

    // ouverture : bouton « En savoir plus » ou clic sur la carte
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-nacelle-open]");
      if (btn) { open(btn.dataset.nacelleOpen, btn); return; }
      const card = e.target.closest(".nac-card");
      if (card && !e.target.closest("a, button")) open(card.dataset.nacelle, $("[data-nacelle-open]", card));
    });

    // fermeture : croix, clic sur le fond (pressé ET relâché sur le fond), Échap
    let downOnOverlay = false;
    modal.addEventListener("mousedown", (e) => { downOnOverlay = e.target.hasAttribute("data-modal-close"); });
    modal.addEventListener("click", (e) => {
      const closer = e.target.closest("[data-modal-close]");
      if (closer && (closer.classList.contains("nac-modal__close") || downOnOverlay)) close();
      downOnOverlay = false;
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) { e.preventDefault(); close(); } });

    $("#nac-modal-prev").addEventListener("click", () => step(-1));
    $("#nac-modal-next").addEventListener("click", () => step(1));

    // changement de langue pendant que le modal est ouvert
    document.addEventListener("i18n:changed", () => { if (!modal.hidden && currentId) render(currentId); });
  }

  /* =======================================================================
     ANCRES INTERNES — défilement doux, focus déplacé sur la cible
     (le décalage sous le header sticky vient de scroll-margin-top / --header-offset)
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
    initSmoothScroll();
    initNacelleModal();
    if (window.WisyScenes) window.WisyScenes.init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
