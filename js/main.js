/* =========================================================================
   WISY SAFETY — Interactions
   Header sticky · dropdown Formations · menu mobile · reveal au scroll
   compteurs · horaires + statut d'ouverture en temps réel
   ========================================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     1. Header — ombre au scroll
     ---------------------------------------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----------------------------------------------------------------------
     2. Logo — micro-pulsation au clic avant redirection
     ---------------------------------------------------------------------- */
  var logo = document.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", function () {
      logo.classList.add("is-clicked");
      setTimeout(function () { logo.classList.remove("is-clicked"); }, 400);
    });
  }

  /* ----------------------------------------------------------------------
     3. Sous-menu Formations (desktop) — hover via CSS + clavier/clic
     ---------------------------------------------------------------------- */
  var dropdownWrap = document.querySelector(".has-dropdown");
  if (dropdownWrap) {
    var trigger = dropdownWrap.querySelector(".nav-link");
    var panel = dropdownWrap.querySelector(".dropdown");

    var openDrop = function () {
      panel.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    };
    var closeDrop = function () {
      panel.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      panel.classList.contains("is-open") ? closeDrop() : openDrop();
    });
    dropdownWrap.addEventListener("mouseenter", openDrop);
    dropdownWrap.addEventListener("mouseleave", closeDrop);

    // Échap ferme, focus sortant ferme
    dropdownWrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeDrop(); trigger.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!dropdownWrap.contains(e.target)) closeDrop();
    });
    dropdownWrap.addEventListener("focusout", function (e) {
      if (!dropdownWrap.contains(e.relatedTarget)) closeDrop();
    });
  }

  /* ----------------------------------------------------------------------
     4. Menu mobile — panneau latéral + scrim
     ---------------------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var panelM = document.querySelector(".mobile-panel");
  var scrim = document.querySelector(".mobile-scrim");
  var closeBtn = document.querySelector(".mobile-close");

  function openMobile() {
    panelM.classList.add("is-open");
    scrim.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var first = panelM.querySelector("a, button");
    if (first) first.focus();
  }
  function closeMobile() {
    panelM.classList.remove("is-open");
    scrim.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    toggle.focus();
  }
  if (toggle && panelM && scrim) {
    toggle.addEventListener("click", openMobile);
    closeBtn.addEventListener("click", closeMobile);
    scrim.addEventListener("click", closeMobile);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panelM.classList.contains("is-open")) closeMobile();
    });
  }

  /* ----------------------------------------------------------------------
     5. Accordéon Formations (mobile)
     ---------------------------------------------------------------------- */
  document.querySelectorAll(".m-accordion__trigger").forEach(function (btn) {
    var pnl = btn.nextElementSibling;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      pnl.classList.toggle("is-open", !open);
    });
  });

  /* ----------------------------------------------------------------------
     6. Reveal au défilement (fondu + translation, cascade)
     ---------------------------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    // Effet de cascade : delay incrémental par groupe
    document.querySelectorAll("[data-stagger]").forEach(function (group) {
      group.querySelectorAll(".reveal").forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", (i * 0.08) + "s");
      });
    });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     7. Compteurs — incrémentation progressive à l'entrée dans le champ
     ---------------------------------------------------------------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-decimals") | 0);
    if (reduceMotion) {
      el.textContent = target.toLocaleString("fr-BE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      return;
    }
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      var val = target * eased;
      el.textContent = val.toLocaleString("fr-BE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ----------------------------------------------------------------------
     8. Horaires — jour courant + statut d'ouverture en temps réel
        Horaires : Lundi–Jeudi 10:00–16:00 · Ven/Sam/Dim fermé
     ---------------------------------------------------------------------- */
  // getDay(): 0=Dim, 1=Lun … 6=Sam. null = fermé.
  var SCHEDULE = {
    1: [600, 960], 2: [600, 960], 3: [600, 960], 4: [600, 960],
    5: null, 6: null, 0: null
  };

  var now = new Date();
  var todayIdx = now.getDay();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Mise en évidence du jour courant
  var todayRow = document.querySelector('.hours-list li[data-day="' + todayIdx + '"]');
  if (todayRow) todayRow.classList.add("is-today");

  // Statut ouvert/fermé
  var statusEl = document.querySelector(".status-badge");
  if (statusEl) {
    var range = SCHEDULE[todayIdx];
    var isOpen = !!range && nowMinutes >= range[0] && nowMinutes < range[1];
    statusEl.classList.toggle("is-open", isOpen);
    var label = statusEl.querySelector(".status-text");
    if (label) label.textContent = isOpen ? "ACTUELLEMENT OUVERT" : "ACTUELLEMENT FERMÉ";
  }

  /* ----------------------------------------------------------------------
     9. Année dynamique dans le copyright (garde 2026 comme minimum affiché)
     ---------------------------------------------------------------------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(Math.max(2026, now.getFullYear()));
})();
