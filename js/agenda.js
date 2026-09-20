/* =========================================================================
   WISY SAFETY — Page Agenda · comportements de page (agenda.html)
   -------------------------------------------------------------------------
   Petit script « colle » (le composant calendrier vit dans agenda-calendar.js ;
   en-tête, révélations au scroll et compteurs sont dans le script commun de la page).

     • --ag-hh : hauteur réelle de l'en-tête collant → scroll-margin-top des ancres,
       pour qu'un saut vers #agenda n'arrive jamais sous l'en-tête ;
     • [data-ag-jump] : défilement doux vers l'ancre PUIS focus sur son titre
       (les lecteurs d'écran et le clavier arrivent au bon endroit) ;
     • [data-ag-assistant] : ouvre l'Assistant Wisy (repli : page Contact si indisponible).
   ========================================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Hauteur de l'en-tête collant EN COURS DE DÉFILEMENT (barre utilitaire repliée, recherche incluse),
     pour que l'ancre atterrisse juste sous lui — pas 50 px trop bas une fois la barre repliée. */
  var header = document.querySelector(".site-header");
  function setHeaderHeight() {
    if (!header) return;
    var util = header.querySelector(".util-bar");
    var h = header.getBoundingClientRect().height - (util && !header.classList.contains("is-scrolled") ? util.getBoundingClientRect().height : 0);
    document.documentElement.style.setProperty("--ag-hh", Math.round(h + 12) + "px");
  }
  setHeaderHeight();
  if (header && "ResizeObserver" in window) new ResizeObserver(setHeaderHeight).observe(header);
  else window.addEventListener("resize", setHeaderHeight, { passive: true });

  /* Sauts d'ancre accessibles */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-ag-jump]") : null;
    if (!a) return;
    var id = (a.getAttribute("href") || "").replace(/^#/, "");
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    var focusable = target.querySelector("[data-ag-focus]") || target;
    if (!focusable.hasAttribute("tabindex")) focusable.setAttribute("tabindex", "-1");
    try { focusable.focus({ preventScroll: true }); } catch (err) { /* silencieux */ }
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });

  /* Assistant Wisy */
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-ag-assistant]") : null;
    if (!b) return;
    e.preventDefault();
    var c = window.WisyAssistant && window.WisyAssistant.controller;
    if (c && c.open) c.open();
    else window.location.href = "contact.html";                 // assistant indisponible : jamais d'impasse
  });
})();
