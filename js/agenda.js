/* =========================================================================
   WISY SAFETY — Page Agenda · comportements de page (agenda.html)
   -------------------------------------------------------------------------
   Petit script « colle » (le composant calendrier vit dans agenda-calendar.js ;
   en-tête, révélations au scroll et compteurs sont dans le script commun de la page).

     • --ag-hh : hauteur réelle de l'en-tête collant → scroll-margin-top des ancres,
       pour qu'un saut vers #agenda n'arrive jamais sous l'en-tête ;
     • [data-ag-jump] : défilement doux vers l'ancre PUIS focus sur son titre
       (les lecteurs d'écran et le clavier arrivent au bon endroit) ;
     • [data-ag-assistant] : ouvre l'Assistant Wisy (repli : page Contact si indisponible) ;
     • [data-ag-sessions] : liste des sessions PUBLIÉES (js/sessions.js, source unique des dates) — filtre par
       formation, inscription à UNE session (?formation=…&session=…), état vide honnête. Aucune date n'est écrite
       dans la page : sans session publiée, on le dit et on renvoie vers le contact et les formations.
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

  /* ------------------------------------------------------------------ sessions publiées */
  var Sessions = window.WisySessions, Site = window.WisySite;
  var box = document.querySelector("[data-ag-sessions]");
  if (box && Sessions) {
    var elFilters = box.querySelector("[data-ag-sess-filters]"), elLoading = box.querySelector("[data-ag-sess-loading]"),
      elList = box.querySelector("[data-ag-sess-list]"), elEmpty = box.querySelector("[data-ag-sess-empty]");
    var filter = "all", ready = false;

    var lang = function () { return (window.WisyI18N && WisyI18N.current && WisyI18N.current()) || document.documentElement.getAttribute("lang") || "fr"; };
    var t = function (key, fb) { var v = window.WisyI18N && WisyI18N.get ? WisyI18N.get(lang(), key) : null; return v == null || v === "" ? fb : v; };
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var formationOf = function (id) { return Site && Site.formation ? Site.formation(id) : null; };
    var titleOf = function (id) { var f = formationOf(id); return f ? t(f.fullTitleKey || f.titleKey, f.fullTitle || f.title) : id; };

    var render = function () {
      if (!ready) return;
      var all = Sessions.upcoming(Sessions.peek());
      elLoading.hidden = true;
      if (!all.length) { elList.hidden = true; elFilters.hidden = true; elEmpty.hidden = false; return; }
      elEmpty.hidden = true;

      /* Filtres : une puce par formation qui a au moins une session (affichés s'il y en a plusieurs) */
      var ids = []; all.forEach(function (s) { if (ids.indexOf(s.training) < 0) ids.push(s.training); });
      if (ids.indexOf(filter) < 0) filter = "all";
      if (ids.length > 1) {
        elFilters.innerHTML = ["all"].concat(ids).map(function (id) {
          return '<button type="button" class="ag-chipbtn" data-ag-filter="' + esc(id) + '" aria-pressed="' + (id === filter) + '">' +
            esc(id === "all" ? t("ag.sess_filter_all", "Toutes les formations") : titleOf(id)) + "</button>";
        }).join("");
        elFilters.hidden = false;
      } else elFilters.hidden = true;

      elList.innerHTML = all.filter(function (s) { return filter === "all" || s.training === filter; }).map(function (s) {
        var f = formationOf(s.training), fmt = Sessions.format(s, lang());
        var full = s.status === "full" || s.seatsLeft === 0;
        var place = s.location || (f && f.venue === "centre" ? t("ag.sess_place_default", "Wisy Safety, Anderlecht") : "");
        var meta = [fmt.time, fmt.language, place].filter(Boolean);
        var seats = full ? t("search.session_full", "Complet") : (s.seatsLeft != null ? t("search.session_seats", "Places disponibles : {n}").replace("{n}", s.seatsLeft) : "");
        var action = full
          ? '<a class="ag-link" href="contact.html">' + esc(t("ag.enda_a2", "Nous contacter")) + "</a>"
          : '<a class="btn btn--outline ag-sess__cta" href="' + esc(Sessions.signupUrl(s, s.training)) + '">' + esc(t("ag.sess_signup", "S'inscrire à cette session")) + "</a>";
        return '<li class="ag-sess-card' + (full ? " is-full" : "") + '">' +
          '<span class="ag-sess-card__date" aria-hidden="true"><b>' + esc(fmt.day) + "</b><span>" + esc(fmt.month) + "</span></span>" +
          '<div class="ag-sess-card__body">' +
            '<h3 class="ag-sess-card__title">' + esc(titleOf(s.training)) + "</h3>" +
            '<p class="ag-sess-card__when"><time datetime="' + esc(s.date) + '">' + esc(fmt.dateLong) + "</time></p>" +
            (meta.length ? '<p class="ag-sess-card__meta">' + meta.map(esc).join(" · ") + "</p>" : "") +
            (seats ? '<p class="ag-sess-card__seats' + (full ? " is-full" : "") + '">' + esc(seats) + "</p>" : "") +
          "</div>" +
          '<div class="ag-sess-card__actions">' + action +
            (f ? '<a class="ag-link ag-sess-card__more" href="' + esc(f.url) + '">' + esc(t("ag.sess_view", "Voir la formation")) + "</a>" : "") +
          "</div></li>";
      }).join("");
      elList.hidden = false;
    };

    box.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ag-filter]") : null;
      if (!b) return;
      filter = b.getAttribute("data-ag-filter");
      render();
      var again = elFilters.querySelector('[data-ag-filter="' + filter + '"]'); if (again) again.focus();
    });
    document.addEventListener("i18n:changed", render);
    Sessions.load().then(function () { ready = true; render(); });
  }

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
