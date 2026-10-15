/* =========================================================================
   WISY SAFETY — Affichage des sessions : calendrier mensuel + blocs « Prochaines sessions »
   -------------------------------------------------------------------------
   Lit UNIQUEMENT window.WisySessions (js/sessions.js) : aucune date, aucune place n'est écrite dans le HTML.

     [data-sessions-calendar]          calendrier du mois (agenda.html) : une pastille par session, couleur selon les
                                       places ; un clic ouvre la fiche de la session (places, horaires, bouton Réserver).
     [data-sessions-for="<formation>"] bloc « Prochaines sessions » d'une page formation (masqué tant qu'il n'y a pas
                                       de session à venir).

   Places : « 9 places disponibles sur 10 » seulement quand la feuille de réservation les a CALCULÉES (session
   `live`). Sinon (fichier js/sessions-data.js) : la capacité seule. L'affichage reste indicatif : seule la réponse de
   la feuille, au moment de réserver, fait foi. Rafraîchi toutes les 45 s (WisySessions.startLive → « wisy:sessions »).

   Partie « pure » (dates du calendrier, libellés) testée dans tests/sessions-ui.test.js — module « dual-mode ».
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisySessionsUI = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var LOCALE_MAP = { fr: "fr-BE", nl: "nl-BE", en: "en-BE", de: "de-BE", af: "af-ZA", ar: "ar-MA", bg: "bg-BG", ro: "ro-RO", it: "it-IT", sl: "sl-SI" };
  var LOW_SEATS = 3;   // « dernières places » à partir de 3 places restantes (ou 20 % de la capacité)

  /* ------------------------------------------------------------------ partie pure (testée) */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function monthKey(y, m) { return y + "-" + pad(m); }               // m : 1–12
  function parseMonth(key) { var p = String(key).split("-"); return { y: +p[0], m: +p[1] }; }
  function addMonths(key, n) {
    var p = parseMonth(key), d = new Date(Date.UTC(p.y, p.m - 1 + n, 1));
    return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }
  /* Semaines du mois (lundi en premier) : tableau de 7 cases { day: "AAAA-MM-JJ", inMonth } — 4 à 6 semaines. */
  function monthGrid(key) {
    var p = parseMonth(key), first = new Date(Date.UTC(p.y, p.m - 1, 1));
    var offset = (first.getUTCDay() + 6) % 7;                       // 0 = lundi
    var start = Date.UTC(p.y, p.m - 1, 1 - offset), weeks = [];
    for (var w = 0; w < 6; w++) {
      var week = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(start + (w * 7 + i) * 86400000);
        week.push({ day: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()), inMonth: d.getUTCMonth() === p.m - 1 });
      }
      if (w >= 4 && !week.some(function (c) { return c.inMonth; })) break;
      weeks.push(week);
    }
    return weeks;
  }
  /* Niveau d'une session : open | low | full | closed (couleur de la pastille). */
  function level(S, s, now) {
    var st = S.stateOf ? S.stateOf(s, now) : (s.status === "full" ? "full" : "open");
    if (st === "full" || st === "closed" || st === "cancelled") return st === "cancelled" ? "closed" : st;
    if (s.live && s.seatsLeft != null && s.capacity && (s.seatsLeft <= LOW_SEATS || s.seatsLeft / s.capacity <= 0.2)) return "low";
    return "open";
  }
  /* Libellé des places. t(key, fallback) fournit les traductions. */
  function seatsText(S, s, t, now) {
    var st = S.stateOf ? S.stateOf(s, now) : "open";
    if (st === "full") return t("sess.full", "Complet");
    if (st === "closed") return t("sess.closed", "Inscriptions clôturées");
    if (s.live && s.seatsLeft != null && s.capacity) {
      return (s.seatsLeft === 1 ? t("sess.seats_one", "1 place disponible sur {total}") : t("sess.seats_of", "{n} places disponibles sur {total}"))
        .replace("{n}", String(s.seatsLeft)).replace("{total}", String(s.capacity));
    }
    if (s.capacity) return t("sess.capacity", "{total} places").replace("{total}", String(s.capacity));
    return "";
  }

  /* ------------------------------------------------------------------ navigateur */
  var doc = root.document;
  function lang() { return (root.WisyI18N && root.WisyI18N.current && root.WisyI18N.current()) || (doc && doc.documentElement.getAttribute("lang")) || "fr"; }
  function t(key, fb) { var v = root.WisyI18N && root.WisyI18N.get ? root.WisyI18N.get(lang(), key) : null; return v == null || v === "" ? fb : v; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function locale() { return LOCALE_MAP[lang()] || "fr-BE"; }
  function formation(id) { return root.WisySite && root.WisySite.formation ? root.WisySite.formation(id) : null; }
  function shortTitle(id) { var f = formation(id); return f ? t(f.titleKey, f.title) : id; }
  function fullTitle(id) { var f = formation(id); return f ? t(f.fullTitleKey || f.titleKey, f.fullTitle || f.title) : id; }
  function monthLabel(key) {
    var p = parseMonth(key);
    try { var s = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(p.y, p.m - 1, 15))); return s.charAt(0).toUpperCase() + s.slice(1); }
    catch (e) { return key; }
  }
  function weekdays() {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(Date.UTC(2024, 0, 1 + i));                      // 1er janvier 2024 = lundi
      try { out.push({ short: new Intl.DateTimeFormat(locale(), { weekday: "short", timeZone: "UTC" }).format(d), long: new Intl.DateTimeFormat(locale(), { weekday: "long", timeZone: "UTC" }).format(d) }); }
      catch (e) { out.push({ short: ["L", "M", "M", "J", "V", "S", "D"][i], long: "" }); }
    }
    return out;
  }
  /* Jauge : une case par place jusqu'à 20 places (sinon une barre continue). */
  function gaugeHtml(s) {
    if (!s.capacity) return "";
    var free = s.live && s.seatsLeft != null ? s.seatsLeft : null;
    if (free == null) return "";
    var taken = Math.max(0, s.capacity - free);
    if (s.capacity <= 20) {
      var cells = "";
      for (var i = 0; i < s.capacity; i++) cells += '<i class="' + (i < taken ? "is-taken" : "is-free") + '"></i>';
      return '<span class="wss-gauge" aria-hidden="true" style="--wss-n:' + s.capacity + '">' + cells + "</span>";
    }
    return '<span class="wss-gauge wss-gauge--bar" aria-hidden="true"><i style="width:' + Math.round(taken / s.capacity * 100) + '%"></i></span>';
  }
  function signupHref(S, s) { return S.signupUrl(s, s.training); }
  function placeOf(s) {
    var f = formation(s.training);
    return s.location || (f && f.venue === "centre" ? t("ag.sess_place_default", "Wisy Safety, Anderlecht") : "");
  }

  /* ---------- fiche détaillée d'une session (calendrier + blocs formation) */
  function detailHtml(S, s, now, opts) {
    var fmt = S.format(s, lang()), lv = level(S, s, now), bookable = S.isBookable(s, now);
    var meta = [
      ['<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', fmt.time || t("sess.all_day", "Journée entière")],
      [fmt.language ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>' : "", fmt.language],
      [placeOf(s) ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.8"/></svg>' : "", placeOf(s)]
    ].filter(function (m) { return m[1]; });
    var seats = seatsText(S, s, t, now);
    var big = s.live && s.seatsLeft != null && s.capacity
      ? '<p class="wss-count" aria-hidden="true"><b>' + esc(s.seatsLeft) + "</b><span>/ " + esc(s.capacity) + "</span></p>" : "";
    var f = formation(s.training);
    return '<article class="wss-card wss-card--' + lv + '" data-wss-id="' + esc(s.id) + '">' +
      '<p class="wss-card__eyebrow">' + esc(fmt.dateLong) + "</p>" +
      (opts && opts.noTitle ? "" : '<h4 class="wss-card__title">' + esc(fullTitle(s.training)) + "</h4>") +
      '<ul class="wss-card__meta">' + meta.map(function (m) { return "<li>" + m[0] + "<span>" + esc(m[1]) + "</span></li>"; }).join("") + "</ul>" +
      '<div class="wss-card__seats">' + big + '<p class="wss-card__seatstxt">' + esc(seats) + "</p>" + gaugeHtml(s) + "</div>" +
      (bookable
        ? '<a class="btn btn--cta wss-card__cta" href="' + esc(signupHref(S, s)) + '">' + esc(s.live ? t("sess.book_session", "Réserver cette session") : t("sess.signup", "S'inscrire à cette session")) + ' <span class="btn__arrow" aria-hidden="true">→</span></a>' +
          (s.live ? '<p class="wss-card__note">' + esc(t("sess.indicative", "Disponibilité indicative : votre place est réservée au moment où vous confirmez.")) + "</p>" : "")
        : '<a class="btn btn--outline wss-card__cta" href="contact.html">' + esc(t("sess.contact", "Nous contacter")) + "</a>") +
      (f && !(opts && opts.noTitle) ? '<a class="wss-card__more" href="' + esc(f.url) + '">' + esc(t("sess.view", "Voir la formation")) + ' <span aria-hidden="true">→</span></a>' : "") +
    "</article>";
  }

  /* ---------- calendrier mensuel */
  function mountCalendar(el, S) {
    var state = { month: null, selected: null };
    var grid = el.querySelector("[data-wsc-grid]"), monthEl = el.querySelector("[data-wsc-month]"), detail = el.querySelector("[data-wsc-detail]");
    var prev = el.querySelector("[data-wsc-prev]"), next = el.querySelector("[data-wsc-next]"), live = el.querySelector("[data-wsc-live]");
    var status = el.querySelector("[data-wsc-status]");

    function sessions(now) { return S.upcoming(S.peek(), now); }
    function render(focusSel) {
      /* Actualisation en direct : la pastille qui a le focus le garde (jamais de focus perdu toutes les 45 s). */
      var active = doc.activeElement && doc.activeElement.getAttribute ? doc.activeElement.getAttribute("data-wsc-session") : null;
      if (!focusSel && active && grid.contains(doc.activeElement)) focusSel = active;
      var now = new Date(), list = sessions(now), today = S.todayISO(now);
      var thisMonth = today.slice(0, 7);
      if (!state.month) state.month = list.length ? list.filter(function (s) { return S.isBookable(s, now); }).concat(list)[0].date.slice(0, 7) : thisMonth;
      if (state.month < thisMonth) state.month = thisMonth;
      var last = list.length ? list[list.length - 1].date.slice(0, 7) : thisMonth;
      var maxMonth = addMonths(last > thisMonth ? last : thisMonth, 2);
      if (state.month > maxMonth) state.month = maxMonth;
      if (state.selected && !list.some(function (s) { return s.id === state.selected; })) state.selected = null;
      if (!state.selected) {
        var first = list.filter(function (s) { return s.date.slice(0, 7) === state.month && S.isBookable(s, now); })[0] || list.filter(function (s) { return s.date.slice(0, 7) === state.month; })[0];
        state.selected = first ? first.id : null;
      }
      var label = monthLabel(state.month);
      if (monthEl.textContent !== label) monthEl.textContent = label;   // annoncé (aria-live) seulement s'il change
      prev.disabled = state.month <= thisMonth;
      next.disabled = state.month >= maxMonth;
      if (live) live.hidden = S.source() !== "sheets";

      var byDay = {};
      list.forEach(function (s) { (byDay[s.date] = byDay[s.date] || []).push(s); });
      var wd = weekdays();
      var html = '<div class="wsc-head" aria-hidden="true">' + wd.map(function (d) { return "<span>" + esc(d.short.replace(/\.$/, "")) + "</span>"; }).join("") + "</div>";
      var inMonth = 0;
      monthGrid(state.month).forEach(function (week) {
        html += '<div class="wsc-week">';
        week.forEach(function (c) {
          var day = byDay[c.day] || [], n = +c.day.slice(8);
          if (c.inMonth) inMonth += day.length;
          var cls = "wsc-day" + (c.inMonth ? "" : " is-out") + (c.day === today ? " is-today" : "") + (c.day < today ? " is-past" : "") + (day.length ? " has-sess" : "");
          html += '<div class="' + cls + '"><span class="wsc-day__n">' + n + "</span>";
          if (c.inMonth) day.forEach(function (s) {
            var lv = level(S, s, now), fmt = S.format(s, lang());
            var label = shortTitle(s.training) + ", " + fmt.dateLong + (fmt.time ? ", " + fmt.time : "") + " — " + seatsText(S, s, t, now);
            html += '<button type="button" class="wsc-chip wsc-chip--' + lv + '" data-wsc-session="' + esc(s.id) + '" aria-pressed="' + (state.selected === s.id) + '" aria-label="' + esc(label) + '">' +
              '<span class="wsc-chip__t">' + esc(shortTitle(s.training)) + "</span>" +
              (s.live && s.seatsLeft != null && s.capacity && lv !== "full" && lv !== "closed" ? '<span class="wsc-chip__n">' + esc(s.seatsLeft) + "/" + esc(s.capacity) + "</span>" : "") +
              "</button>";
          });
          html += "</div>";
        });
        html += "</div>";
      });
      grid.innerHTML = html;
      if (status) status.textContent = inMonth ? "" : t("sess.cal_empty_month", "Aucune session publiée ce mois-ci.");
      if (status) status.hidden = !!inMonth;

      var sel = list.filter(function (s) { return s.id === state.selected; })[0];
      detail.innerHTML = sel ? detailHtml(S, sel, now) : '<div class="wss-card wss-card--empty"><p>' + esc(t(list.length ? "sess.cal_pick" : "sess.cal_none", list.length ? "Choisissez une session dans le calendrier pour voir ses places et la réserver." : "Aucune session n'est publiée pour le moment. Contactez l'équipe pour connaître les prochaines dates.")) + "</p>" +
        (list.length ? "" : '<a class="btn btn--outline" href="contact.html">' + esc(t("sess.contact", "Nous contacter")) + "</a>") + "</div>";
      if (focusSel) { var b = grid.querySelector('[data-wsc-session="' + focusSel + '"]'); if (b) b.focus(); }
      el.setAttribute("data-state", "ready");
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-wsc-session]") : null;
      if (b) { state.selected = b.getAttribute("data-wsc-session"); render(state.selected); if (root.matchMedia && root.matchMedia("(max-width: 900px)").matches && detail.scrollIntoView) detail.scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
      if (e.target.closest && e.target.closest("[data-wsc-prev]")) { state.month = addMonths(state.month, -1); state.selected = null; render(); return; }
      if (e.target.closest && e.target.closest("[data-wsc-next]")) { state.month = addMonths(state.month, 1); state.selected = null; render(); }
    });
    return render;
  }

  /* ---------- bloc « Prochaines sessions » d'une page formation */
  function mountTrainingBlock(el, S) {
    var training = el.getAttribute("data-sessions-for"), list = el.querySelector("[data-wss-list]");
    var live = el.querySelector("[data-wss-live]");
    return function render() {
      var now = new Date(), rows = S.forTraining(S.peek(), training, now).slice(0, 6);
      el.hidden = !rows.length;
      if (live) live.hidden = S.source() !== "sheets";
      list.innerHTML = rows.map(function (s) { return "<li>" + detailHtml(S, s, now, { noTitle: true }) + "</li>"; }).join("");
    };
  }

  function init() {
    var S = root.WisySessions;
    if (!S || !doc) return;
    var renders = [];
    Array.prototype.forEach.call(doc.querySelectorAll("[data-sessions-calendar]"), function (el) { renders.push(mountCalendar(el, S)); });
    Array.prototype.forEach.call(doc.querySelectorAll("[data-sessions-for]"), function (el) { renders.push(mountTrainingBlock(el, S)); });
    if (!renders.length) return;
    var all = function () { renders.forEach(function (r) { r(); }); };
    S.load().then(function () { all(); S.startLive(); });
    doc.addEventListener("wisy:sessions", all);
    doc.addEventListener("i18n:changed", all);
  }
  if (doc) { if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init(); }

  return { monthKey: monthKey, addMonths: addMonths, monthGrid: monthGrid, level: level, seatsText: seatsText, LOW_SEATS: LOW_SEATS,
    detailHtml: detailHtml, gaugeHtml: gaugeHtml };
});
