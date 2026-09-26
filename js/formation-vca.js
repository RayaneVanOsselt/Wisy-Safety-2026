/* =========================================================================
   WISY SAFETY — Page « Formation VCA Base » (formation-vca-base.html)
   -------------------------------------------------------------------------
   La coque (en-tête, menu mobile, pied de page, apparition au scroll) vient de js/site-chrome.js.
   Ici : ce qui est propre à la page.

     initAccordions()   programme + FAQ (aria-expanded / aria-controls, flèches, Début / Fin)
     initSessions()     « Disponibilités » : lit js/sessions.js — AUCUNE date n'est écrite dans la page
     initCopyAddress()  bouton « Copier l'adresse »
     initStickyBar()    barre d'action mobile (≤ 640 px), visible seulement après le hero
     initTracking()     vca_view (bus `wisy:analytics`, consentement respecté ailleurs)

   Sans JavaScript : contenu lisible, accordéons ouverts (voir le <noscript> du <head>), état « disponibilités à
   consulter » affiché. Aucun de ces comportements n'est nécessaire pour lire la page.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const chrome = window.WisyChrome || {};
  const tr = chrome.tr || ((k, fb) => fb);
  const track = chrome.track || (() => {});
  const currentLang = chrome.currentLang || (() => "fr");
  const SVG = "http://www.w3.org/2000/svg";

  /* ======================================================================
     ACCORDÉONS — bouton → panneau ; chaque élément s'ouvre indépendamment.
     Clavier : ↑ ↓ pour passer d'un titre à l'autre, Début / Fin ; Entrée / Espace natifs (<button>).
     ====================================================================== */
  function initAccordions() {
    $$("[data-acc]").forEach((acc) => {
      const buttons = $$(".vca-acc__btn", acc);
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".vca-acc__item");
          const open = btn.getAttribute("aria-expanded") !== "true";
          btn.setAttribute("aria-expanded", String(open));
          item.classList.toggle("is-open", open);
        });
        btn.addEventListener("keydown", (e) => {
          const i = buttons.indexOf(btn);
          let to = null;
          if (e.key === "ArrowDown") to = buttons[(i + 1) % buttons.length];
          else if (e.key === "ArrowUp") to = buttons[(i - 1 + buttons.length) % buttons.length];
          else if (e.key === "Home") to = buttons[0];
          else if (e.key === "End") to = buttons[buttons.length - 1];
          if (to) { e.preventDefault(); to.focus(); }
        });
      });
    });
    /* Lien profond : #prog-p-b ou #faq-p-3 ouvre l'élément ciblé. */
    const hash = decodeURIComponent((location.hash || "").slice(1));
    const target = hash && document.getElementById(hash);
    if (target && target.classList.contains("vca-acc__panel")) {
      const btn = document.getElementById(target.getAttribute("aria-labelledby"));
      if (btn) { btn.setAttribute("aria-expanded", "true"); btn.closest(".vca-acc__item").classList.add("is-open"); }
    }
  }

  /* ======================================================================
     DISPONIBILITÉS — sessions réelles (js/sessions.js). Trois états : chargement → liste | vide.
     Texte via textContent uniquement : les données ne sont jamais interprétées comme du HTML.
     ====================================================================== */
  function icon(id) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "vca-ic"); svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG, "use"); use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function metaLine(iconId, text) {
    const li = el("li");
    li.appendChild(icon(iconId));
    li.appendChild(el("span", null, text));
    return li;
  }

  function initSessions() {
    const root = $("[data-sessions]");
    if (!root) return;
    const training = root.getAttribute("data-training") || "vca-base";
    const list = $("[data-sessions-list]", root), empty = $("[data-sessions-empty]", root),
      loading = $("[data-sessions-loading]", root), all = $("[data-sessions-all]", root);
    const S = window.WisySessions;
    let sessions = null;   // null = pas encore chargé

    function show(state) {
      root.setAttribute("data-state", state);
      loading.hidden = state !== "loading";
      list.hidden = state !== "list";
      empty.hidden = state !== "empty";
      all.hidden = state !== "list";
    }

    function render() {
      if (!S || sessions === null) return;
      const now = new Date();
      const rows = S.forTraining(sessions, training, now).slice(0, 6);
      if (!rows.length) { show("empty"); return; }
      const lang = currentLang();
      list.textContent = "";
      rows.forEach((s) => {
        const f = S.format(s, lang), bookable = S.isBookable(s, now);
        const li = el("li", "vca-sess" + (bookable ? "" : " is-full"));
        const date = el("div", "vca-sess__date");
        date.setAttribute("aria-hidden", "true");
        date.appendChild(el("span", "vca-sess__day", f.day));
        date.appendChild(el("span", "vca-sess__mon", f.month));
        const body = el("div", "vca-sess__body");
        body.appendChild(el("p", "vca-sess__t", f.dateLong));
        const meta = el("ul", "vca-sess__meta");
        if (f.time) meta.appendChild(metaLine("i-clock", f.time));
        if (f.language) meta.appendChild(metaLine("i-globe", f.language));
        meta.appendChild(metaLine("i-pin", s.location || tr("vca.av_loc_default", "Wisy Safety, Anderlecht")));
        if (s.seatsLeft != null && bookable) meta.appendChild(metaLine("i-users", tr("vca.av_seats", "Places disponibles : {n}").replace("{n}", String(s.seatsLeft))));
        body.appendChild(meta);
        if (bookable) {
          const a = el("a", "btn btn--cta");
          a.href = S.signupUrl(s, training);
          a.setAttribute("data-vca-track", "signup");
          a.setAttribute("data-vca-from", "session");
          a.setAttribute("data-vca-session", s.id);
          a.appendChild(el("span", null, tr("vca.av_pick", "Choisir cette session")));
          const arrow = el("span", "btn__arrow", "→"); arrow.setAttribute("aria-hidden", "true");
          a.appendChild(document.createTextNode(" ")); a.appendChild(arrow);
          body.appendChild(a);
        } else {
          body.appendChild(el("span", "vca-sess__status", tr("vca.av_full", "Complet")));
        }
        li.appendChild(date); li.appendChild(body);
        list.appendChild(li);
      });
      show("list");
    }

    if (!S) { show("empty"); return; }
    show("loading");
    S.load().then((res) => { sessions = res.sessions; render(); }).catch(() => { sessions = []; render(); });
    document.addEventListener("i18n:changed", render);
  }

  /* ======================================================================
     COPIER L'ADRESSE — Clipboard API, repli execCommand ; retour vocal poli (role=status).
     ====================================================================== */
  function initCopyAddress() {
    const btn = $("[data-vca-copy]"), src = $("[data-vca-address]"), out = $("[data-vca-copy-ok]");
    if (!btn || !src) return;
    let timer = null;
    const say = (msg) => { if (!out) return; out.textContent = msg; clearTimeout(timer); timer = setTimeout(() => { out.textContent = ""; }, 3500); };
    const text = () => src.textContent.trim() + ", " + ($(".vca-place__lines span:last-child") ? $(".vca-place__lines span:last-child").textContent.trim() : "Belgique");
    btn.addEventListener("click", () => {
      const value = text();
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = value; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
        document.body.appendChild(ta); ta.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        say(ok ? tr("vca.ct_copied", "Adresse copiée") : tr("vca.ct_copy_fail", "Copie impossible : sélectionnez l'adresse."));
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(() => say(tr("vca.ct_copied", "Adresse copiée")), fallback);
      else fallback();
    });
  }

  /* ======================================================================
     BARRE D'ACTION MOBILE — « VCA Base — 225 € · S'inscrire », après le hero, jamais en même temps que le bloc
     d'inscription (déjà un gros bouton). Lève le launcher de l'assistant (body.vca-bar-active, voir le CSS).
     ====================================================================== */
  function initStickyBar() {
    const bar = $("[data-vca-bar]"), heroCta = $(".vca-hero .vca-cta-row"), block = $("#inscription");
    if (!bar || !heroCta || !("IntersectionObserver" in window)) return;
    const mq = window.matchMedia("(max-width: 640px)");
    let heroGone = false, blockVisible = false;
    const apply = () => {
      const on = mq.matches && heroGone && !blockVisible;
      if (on) bar.hidden = false; else if (!bar.hidden) bar.hidden = true;
      document.body.classList.toggle("vca-bar-active", on);
    };
    new IntersectionObserver((entries) => { heroGone = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0; apply(); }).observe(heroCta);
    if (block) new IntersectionObserver((entries) => { blockVisible = entries[0].isIntersecting; apply(); }, { rootMargin: "0px 0px -20% 0px" }).observe(block);
    (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(apply);
  }

  /* ======================================================================
     ÉVÉNEMENTS — vca_view à l'affichage ; les clics (vca_signup_click, vca_agenda_click, vca_phone_click,
     vca_email_click, vca_article_click) sont émis par js/site-chrome.js ; vca_registration_start / _complete par le
     parcours d'inscription. Uniquement `wisy:analytics` : rien n'est relayé sans consentement (js/cookie-consent.js).
     ====================================================================== */
  function initTracking() { track("vca_view", { page: "vca-base" }); }

  const boot = () => { initAccordions(); initSessions(); initCopyAddress(); initStickyBar(); initTracking(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
