/* =========================================================================
   WISY SAFETY — Page « VCA Entreprise » (vca-entreprise.html)
   -------------------------------------------------------------------------
   La coque (en-tête, menu mobile, pied de page, apparition au scroll) vient de js/site-chrome.js.
   Ici : ce qui est propre à la page.

     initVideo()         lecteur du film — AVEC LE SON, chargé seulement au clic (voir ci-dessous)
     initGuide()         « Quel niveau ? » : 2 questions → niveau du référentiel (critères officiels)
     initRegistration()  participants + total ; lien d'inscription `?formation=vca-entreprise[&qty=n]`
     initSteps()         frise « chemin vers le certificat » : se trace quand elle entre à l'écran
     initStickyBar()     barre d'action mobile (≤ 640 px), visible seulement après le héro
     initAssistant()     boutons « Demander à l'assistant Wisy » (question posée dans la langue de la page)
     initTracking()      vcae_view + clics (bus `wisy:analytics` — rien n'est relayé sans consentement)

   SOURCES UNIQUES : le prix et les critères des niveaux viennent du registre js/trainings-data.js
   (`WisyTrainings.vcaEntreprise`, `vcaLevelFor`) — jamais écrits ici. Sans registre, le HTML statique reste lisible.

   FILM — décisions de performance :
     • la page ne charge que l'AFFICHE (AVIF/WebP, dimensions fixes : aucun décalage de mise en page) ;
     • la vidéo (6,5 Mo en 720p · 9,8 Mo en 1080p) n'est téléchargée QU'AU CLIC sur « lecture » : `preload="none"`, pas de `src` ;
     • 1080p seulement sur grand écran ET bonne connexion (jamais avec « économiser les données » ni en 2G/3G) ;
     • le clic est un geste de l'utilisateur : le film démarre AVEC le son (jamais d'autoplay sonore) ; si un navigateur
       le refusait malgré tout, il démarre sans son et un message propose de l'activer ;
     • pause automatique quand le film sort de l'écran ; un seul film sur la page.

   Sans JavaScript : contenu lisible, lien direct vers le film, guide et lecteur masqués (voir le <noscript> du <head>).
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const chrome = window.WisyChrome || {};
  const tr = chrome.tr || ((k, fb) => fb);
  const track = chrome.track || (() => {});
  const currentLang = chrome.currentLang || (() => "fr");
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const service = () => (window.WisyTrainings && window.WisyTrainings.vcaEntreprise) || null;

  /* ======================================================================
     PRIX — lus dans le registre (centimes) ; même carte de langues que le parcours d'inscription
     ====================================================================== */
  const LOCALES = { fr: "fr-BE", nl: "nl-BE", en: "en-BE", de: "de-BE", af: "af-ZA", ar: "ar-MA", bg: "bg-BG", ro: "ro-RO", it: "it-IT", sl: "sl-SI" };
  const MAX_QTY = 99;                                    // = CONFIG.maxQuantity de js/registration-data.js
  const unitCents = () => { const s = service(); return s && s.price ? s.price.amountCents : null; };
  const squash = (s) => String(s).replace(/[\s  ]+/g, " ").trim();
  function money(cents) {
    const v = cents / 100;
    try {
      return new Intl.NumberFormat(LOCALES[currentLang()] || "fr-BE", { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol", minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(v);
    } catch (e) { return v + " €"; }
  }
  let qty = 1;
  function renderPrices() {
    const unit = unitCents();
    if (unit == null) return;                              // registre absent : le HTML statique reste tel quel
    $$("[data-vcae-price]").forEach((el) => { const t = money(unit); if (squash(el.textContent) !== squash(t)) el.textContent = t; });
    $$("[data-vcae-total]").forEach((el) => { const t = money(unit * qty); if (squash(el.textContent) !== squash(t)) el.textContent = t; });
  }

  /* ======================================================================
     FILM
     ====================================================================== */
  function initVideo() {
    const stage = $("[data-vcae-stage]");
    if (!stage) return;
    const video = $("[data-vcae-video]", stage), playBtn = $("[data-vcae-play]", stage), loading = $("[data-vcae-loading]", stage),
      ctl = $("[data-vcae-ctl]", stage), toggle = $("[data-vcae-toggle]", stage), seek = $("[data-vcae-seek]", stage), vol = $("[data-vcae-vol]", stage),
      muteBtn = $("[data-vcae-mute]", stage), fsBtn = $("[data-vcae-fs]", stage), cur = $("[data-vcae-cur]", stage), dur = $("[data-vcae-dur]", stage),
      end = $("[data-vcae-end]", stage), err = $("[data-vcae-err]", stage), retry = $("[data-vcae-retry]", stage), replay = $("[data-vcae-replay]", stage),
      note = $("[data-vcae-soundnote]", stage), live = $("[data-vcae-live]", stage);
    if (!video || !playBtn) return;

    let started = false, fell1080 = false, played = false, half = false, idleTimer = null, usedSrc = "";
    const coarse = () => window.matchMedia("(pointer: coarse)").matches;
    const conn = () => navigator.connection || {};

    /* 720p par défaut ; 1080p seulement sur grand écran ET bonne connexion (jamais économie de données / 2G / 3G). */
    function pickSource() {
      const c = conn(), slow = c.saveData === true || /^(slow-2g|2g|3g)$/.test(c.effectiveType || "");
      const px = stage.clientWidth * (window.devicePixelRatio || 1);
      const use1080 = !fell1080 && !slow && px >= 1500;
      return stage.getAttribute(use1080 ? "data-src-1080" : "data-src-720");
    }
    const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
    const setUse = (btn, id) => { const u = $("use", btn); if (u) u.setAttribute("href", "#" + id); };
    const say = (msg) => { if (live) live.textContent = msg; };

    /* ---- étiquettes (traduites, recalculées à chaque changement de langue) ---- */
    function labels() {
      const playing = !video.paused && !video.ended;
      const t = playing ? tr("vcae.v_pause", "Pause") : tr("vcae.v_resume", "Lecture");
      toggle.setAttribute("aria-label", t);
      const m = video.muted || video.volume === 0;
      muteBtn.setAttribute("aria-label", m ? tr("vcae.v_unmute", "Activer le son") : tr("vcae.v_mute", "Couper le son"));
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fsBtn.setAttribute("aria-label", fs ? tr("vcae.v_fs_exit", "Quitter le plein écran") : tr("vcae.v_fs", "Plein écran"));
      seekText();
    }
    function seekText() {
      seek.setAttribute("aria-valuetext", fmt(video.currentTime) + " " + tr("vcae.v_time_of", "sur") + " " + fmt(video.duration || 19));
    }
    function paint(range) { range.style.setProperty("--p", ((range.value - range.min) / (range.max - range.min)) * 100 + "%"); }

    /* ---- états ---- */
    function state(name) {
      stage.classList.toggle("is-loading", name === "loading");
      stage.classList.toggle("is-live", name === "live");
      loading.hidden = name !== "loading" && !stage.classList.contains("is-buffering");
      ctl.hidden = name !== "live";
      end.hidden = name !== "ended";
      err.hidden = name !== "error";
      if (name === "live") { setUse(toggle, video.paused ? "vi-play" : "vi-pause"); wake(); }
      if (name !== "live") { window.clearTimeout(idleTimer); stage.classList.remove("is-idle"); }
      labels();
    }
    function wake() {
      stage.classList.remove("is-idle");
      window.clearTimeout(idleTimer);
      if (!video.paused && !ctl.contains(document.activeElement)) idleTimer = window.setTimeout(() => stage.classList.add("is-idle"), 2600);
    }

    /* ---- démarrage (geste de l'utilisateur : le son est autorisé) ---- */
    function load() {
      const src = pickSource();
      if (!src) return false;
      if (usedSrc !== src) { video.src = src; usedSrc = src; }
      return true;
    }
    function start() {
      state("loading");
      if (!started) { if (!load()) { state("error"); return; } started = true; }
      video.muted = false;
      video.volume = Number(vol.value) / 100;
      /* AbortError (lecture interrompue : onglet masqué, nouveau chargement…) n'est pas une panne : on revient à l'affiche + bouton
         « lecture » ; toute autre erreur affiche le message avec « Réessayer ». */
      const fail = (e) => state(e && e.name === "AbortError" ? "idle" : "error");
      const p = video.play();
      if (p && p.catch) {
        p.catch((e) => {
          if (e && e.name === "NotAllowedError") {           // le navigateur refuse le son : on démarre sans son et on le dit
            video.muted = true;
            video.play().then(() => { note.hidden = false; window.setTimeout(() => { note.hidden = true; }, 7000); }).catch(fail);
          } else fail(e);
        });
      }
    }
    function resetAndRetry() {
      err.hidden = true; started = false; usedSrc = "";
      video.removeAttribute("src"); video.load();
      start();
    }

    playBtn.addEventListener("click", () => { if (!played) track("vcae_video_click", { page: "vca-entreprise" }); start(); });
    retry.addEventListener("click", resetAndRetry);
    replay.addEventListener("click", () => { video.currentTime = 0; end.hidden = true; start(); });

    /* ---- pré-chargement des SEULES métadonnées quand l'intention est claire (souris / clavier, jamais économie de données) ---- */
    let warmed = false;
    function warm() {
      const c = conn();
      if (warmed || started || coarse() || c.saveData === true || /^(slow-2g|2g|3g)$/.test(c.effectiveType || "")) return;
      warmed = true;
      if (load()) { video.preload = "metadata"; started = true; }
    }
    playBtn.addEventListener("pointerenter", warm);
    playBtn.addEventListener("focus", warm);

    /* ---- événements du média ---- */
    video.addEventListener("loadedmetadata", () => { dur.textContent = fmt(video.duration); seekText(); });
    video.addEventListener("waiting", () => { if (stage.classList.contains("is-live")) { stage.classList.add("is-buffering"); loading.hidden = false; } });
    video.addEventListener("playing", () => {
      stage.classList.remove("is-buffering");
      const first = !played; played = true;
      state("live");
      if (first) { track("vcae_video_play", { page: "vca-entreprise", quality: usedSrc.indexOf("1080") > -1 ? 1080 : 720, sound: !video.muted }); if (!coarse()) toggle.focus({ preventScroll: true }); }
    });
    video.addEventListener("pause", () => { if (!video.ended && stage.classList.contains("is-live")) { setUse(toggle, "vi-play"); labels(); wake(); } });
    video.addEventListener("play", () => { if (stage.classList.contains("is-live")) { setUse(toggle, "vi-pause"); labels(); wake(); } });
    video.addEventListener("timeupdate", () => {
      const d = video.duration || 0;
      if (d) { seek.value = String(Math.round((video.currentTime / d) * 1000)); paint(seek); }
      cur.textContent = fmt(video.currentTime); seekText();
      if (d && !half && video.currentTime / d >= 0.5) { half = true; track("vcae_video_progress", { page: "vca-entreprise", pct: 50 }); }
    });
    video.addEventListener("ended", () => { track("vcae_video_complete", { page: "vca-entreprise" }); state("ended"); });
    video.addEventListener("volumechange", () => {
      setUse(muteBtn, video.muted || video.volume === 0 ? "vi-mute" : "vi-vol");
      vol.value = String(video.muted ? 0 : Math.round(video.volume * 100)); paint(vol); labels();
    });
    video.addEventListener("error", () => {
      if (!fell1080 && usedSrc.indexOf("1080") > -1) { fell1080 = true; started = false; usedSrc = ""; video.removeAttribute("src"); video.load(); start(); return; }
      state("error"); say(tr("vcae.v_err", ""));
    });

    /* ---- contrôles ---- */
    const playPause = () => { if (video.paused) { const p = video.play(); if (p && p.catch) p.catch(() => {}); } else video.pause(); };
    toggle.addEventListener("click", playPause);
    video.addEventListener("click", () => { if (coarse()) { stage.classList.toggle("is-idle"); wake(); } else playPause(); });
    seek.addEventListener("input", () => { if (video.duration) video.currentTime = (Number(seek.value) / 1000) * video.duration; paint(seek); });
    muteBtn.addEventListener("click", () => { if (video.muted || video.volume === 0) { video.muted = false; if (video.volume === 0) video.volume = 0.6; } else video.muted = true; });
    vol.addEventListener("input", () => { video.volume = Number(vol.value) / 100; video.muted = Number(vol.value) === 0; paint(vol); });
    const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
    if (!(stage.requestFullscreen || stage.webkitRequestFullscreen || video.webkitEnterFullscreen)) fsBtn.hidden = true;
    fsBtn.addEventListener("click", () => {
      if (fsOn()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();       // iPhone : plein écran natif de la vidéo
    });
    ["fullscreenchange", "webkitfullscreenchange"].forEach((n) => document.addEventListener(n, () => { setUse(fsBtn, fsOn() ? "vi-fs-exit" : "vi-fs"); labels(); }));

    /* ---- clavier : K / Espace (hors boutons) lecture, M son, F plein écran, ← → ±5 s, ↑ ↓ volume ---- */
    stage.addEventListener("keydown", (e) => {
      if (!stage.classList.contains("is-live") || e.altKey || e.ctrlKey || e.metaKey) return;
      const onRange = e.target.matches && e.target.matches("input[type=range]"), onBtn = e.target.matches && e.target.matches("button");
      const k = e.key;
      if (k === "k" || k === "K" || (k === " " && !onBtn && !onRange)) { e.preventDefault(); playPause(); }
      else if (k === "m" || k === "M") { e.preventDefault(); muteBtn.click(); }
      else if (k === "f" || k === "F") { e.preventDefault(); if (!fsBtn.hidden) fsBtn.click(); }
      else if (!onRange && (k === "ArrowLeft" || k === "ArrowRight")) { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, Math.max(0, video.currentTime + (k === "ArrowRight" ? 5 : -5))); }
      else if (!onRange && (k === "ArrowUp" || k === "ArrowDown")) { e.preventDefault(); video.muted = false; video.volume = Math.min(1, Math.max(0, video.volume + (k === "ArrowUp" ? 0.1 : -0.1))); }
      wake();
    });
    ["pointermove", "touchstart", "focusin"].forEach((n) => stage.addEventListener(n, wake, { passive: true }));

    /* ---- pause quand le film sort de l'écran (pas de son « orphelin ») ---- */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { if (!entries[0].isIntersecting && !video.paused && !fsOn()) video.pause(); }, { threshold: 0 }).observe(stage);
    }

    paint(seek); paint(vol); labels();
    document.addEventListener("i18n:changed", labels);
  }

  /* ======================================================================
     GUIDE « QUEL NIVEAU ? » — critères officiels : sous-traitants, pétrochimie
     ====================================================================== */
  const LEVEL = { star1: { label: "VCA*", sr: "vcae.l1_sr", why: "vcae.g_star1" }, star2: { label: "VCA**", sr: "vcae.l2_sr", why: "vcae.g_star2" }, petro: { label: "VCA-P", sr: "vcae.l3_sr", why: "vcae.g_petro" } };
  function levelFor(sub, petro) {
    const T = window.WisyTrainings;
    if (T && T.vcaLevelFor) return T.vcaLevelFor({ subcontractors: sub, petrochemical: petro });
    return petro ? "petro" : sub ? "star2" : "star1";
  }
  function initGuide() {
    const root = $("[data-vcae-guide]");
    if (!root) return;
    const res = $("[data-vcae-result]", root), idle = $("[data-vcae-idle]", root), out = $("[data-vcae-out]", root),
      lvl = $("[data-vcae-lvl]", root), lvlSr = $("[data-vcae-lvl-sr]", root), why = $("[data-vcae-why]", root);
    const q1 = $$('input[name="vcae-q1"]', root), q2 = $$('input[name="vcae-q2"]', root);
    const cards = $$(".vcae-lvl");
    const val = (list) => { const c = list.filter((i) => i.checked)[0]; return c ? c.value : null; };
    let last = null;

    function update() {
      const a = val(q1), b = val(q2);
      const done = a !== null && b !== null;
      const id = done ? levelFor(a === "yes", b === "yes") : null;
      idle.hidden = done; out.hidden = !done;
      res.setAttribute("data-state", done ? "done" : "idle");
      cards.forEach((c) => {
        const on = done && c.getAttribute("data-level") === id;
        c.classList.toggle("is-match", on);
        const badge = $(".vcae-lvl__badge", c); if (badge) badge.hidden = !on;
      });
      if (!done) return;
      lvl.textContent = LEVEL[id].label;
      lvlSr.textContent = tr(LEVEL[id].sr, "");
      why.textContent = tr(LEVEL[id].why, "");
      if (id !== last) { last = id; track("vcae_level_quiz", { page: "vca-entreprise", level: id }); }
    }
    root.addEventListener("change", update);
    document.addEventListener("i18n:changed", update);
    update();
  }

  /* ======================================================================
     INSCRIPTION — participants, total, lien profond
     ====================================================================== */
  function initRegistration() {
    const box = $("[data-vcae-order]");
    if (!box) return;
    const dec = $("[data-vcae-dec]", box), inc = $("[data-vcae-inc]", box), out = $("[data-vcae-qty]", box), cta = $("[data-vcae-signup]", box);
    const base = cta ? cta.getAttribute("href") : "";
    function paint() {
      out.textContent = String(qty);
      dec.disabled = qty <= 1; inc.disabled = qty >= MAX_QTY;
      if (cta) cta.setAttribute("href", qty > 1 ? base + "&qty=" + qty : base);       // jamais de valeur hors 1–99 : le parcours la borne aussi
      renderPrices();
    }
    dec.addEventListener("click", () => { qty = Math.max(1, qty - 1); paint(); });
    inc.addEventListener("click", () => { qty = Math.min(MAX_QTY, qty + 1); paint(); });
    paint();
  }

  /* ======================================================================
     FRISE — se trace (transform seulement) quand elle entre à l'écran
     ====================================================================== */
  function initSteps() {
    const steps = $("[data-vcae-steps]");
    if (!steps) return;
    if (reduced() || !("IntersectionObserver" in window)) { steps.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { steps.classList.add("is-in"); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(steps);
  }

  /* ======================================================================
     BARRE D'ACTION MOBILE — après le héro, jamais en même temps que le bloc d'inscription
     ====================================================================== */
  function initStickyBar() {
    const bar = $("[data-vcae-bar]"), heroCta = $(".vcae-hero .vcae-cta-row"), block = $("#inscription");
    if (!bar || !heroCta || !("IntersectionObserver" in window)) return;
    const mq = window.matchMedia("(max-width: 640px)");
    let heroGone = false, blockVisible = false;
    const apply = () => {
      const on = mq.matches && heroGone && !blockVisible;
      if (on) bar.hidden = false; else if (!bar.hidden) bar.hidden = true;
      document.body.classList.toggle("vcae-bar-active", on);
    };
    new IntersectionObserver((e) => { heroGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; apply(); }).observe(heroCta);
    if (block) new IntersectionObserver((e) => { blockVisible = e[0].isIntersecting; apply(); }, { rootMargin: "0px 0px -20% 0px" }).observe(block);
    (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(apply);
  }

  /* ======================================================================
     ASSISTANT WISY — la question est posée dans la langue de la page ; sans assistant, on renvoie vers le contact
     ====================================================================== */
  function initAssistant() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-vcae-ask]");
      if (!b) return;
      const key = b.getAttribute("data-vcae-ask"), msg = tr(key, "");
      track("vcae_assistant_ask", { page: "vca-entreprise", topic: key });
      const c = window.WisyAssistant && window.WisyAssistant.controller;
      if (c && c.ask) c.ask(msg); else window.location.href = "contact.html?subject=vca-entreprise";
    });
  }

  /* ======================================================================
     ÉVÉNEMENTS — vcae_view à l'affichage ; clics : vcae_signup_click · vcae_contact_click · vcae_phone_click ·
     vcae_email_click · vcae_base_click (lien vers la formation VCA Base). Uniquement `wisy:analytics` (voir js/cookie-consent.js).
     ====================================================================== */
  const EVENTS = { signup: "vcae_signup_click", contact: "vcae_contact_click", phone: "vcae_phone_click", email: "vcae_email_click", base: "vcae_base_click" };
  function initTracking() {
    track("vcae_view", { page: "vca-entreprise" });
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("[data-vcae-track]");
      const name = a && EVENTS[a.getAttribute("data-vcae-track")];
      if (name) track(name, { page: "vca-entreprise", from: a.getAttribute("data-vcae-from") || undefined });
    });
  }

  const boot = () => {
    renderPrices();
    initVideo(); initGuide(); initRegistration(); initSteps(); initStickyBar(); initAssistant(); initTracking();
    document.addEventListener("i18n:changed", renderPrices);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
