/* =========================================================================
   WISY SAFETY — Page d'accueil : intro du logo, entrée du hero, apparitions,
   compteurs, halo au pointeur, parallaxe légère, vidéo pilotée.
   -------------------------------------------------------------------------
   Chargé uniquement par index.html (après le socle en ligne : en-tête, pied de
   page). Aucune dépendance. Tout est progressif : sans ce fichier, la page reste
   entièrement lisible (les états « cachés » de css/home.css sont sous html.js).

   Intro (html.home-intro, décidée AVANT le premier affichage par le script du
   <head>) : 1re visite de la session, sans ancre, hors mouvement réduit et
   économie de données. L'écran de la vidéo est centré sur une scène sombre : la
   vidéo est jouée EN ENTIER (8 s), puis le logo complet reste affiché avec la
   signature « La sécurité comme une référence » (tenue de 2,6 s) ; l'écran rejoint
   ensuite sa place dans le hero (technique FLIP : translation + échelle UNIFORME,
   jamais déformée) pendant que le titre apparaît — environ 11,5 s au total. Passer
   l'intro : bouton, Échap, défilement, molette, toucher ou tabulation dans le hero.
   Garde-fous : si la vidéo ne démarre pas en 1,8 s, ou au plus tard après 16 s,
   l'intro s'arrête d'elle-même.
   ========================================================================= */
(function () {
  "use strict";

  var doc = document, root = doc.documentElement, win = window;
  var reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = win.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in win;
  var INTRO_HOLD = 2600;         // ms : logo complet + signature, tenus après la vidéo (8 s) avant de rejoindre le hero
  var INTRO_START_TIMEOUT = 1800, INTRO_MAX = 16000;
  var FR = {                     // repli si le dictionnaire n'est pas chargé
    "home.video_pause": "Mettre l'animation en pause",
    "home.video_play": "Lire l'animation",
    "home.video_replay": "Rejouer l'animation"
  };

  function t(key) {
    var i18n = win.WisyI18N, v = i18n ? i18n.get(i18n.current(), key) : null;
    return v != null ? v : FR[key];
  }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function once(fn) { var done = false; return function () { if (!done) { done = true; fn.apply(this, arguments); } }; }

  /* ------------------------------------------------ mesures de l'en-tête (non modifié) */
  var header = doc.querySelector(".site-header");
  function measureHeader() {
    if (!header || win.scrollY > 8) return;
    var h = header.getBoundingClientRect().height, util = header.querySelector(".util-bar");
    root.style.setProperty("--home-hdr", Math.round(h) + "px");
    root.style.setProperty("--home-hdr-min", Math.round(h - (util ? util.getBoundingClientRect().height : 0) - 8) + "px");
  }
  measureHeader();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measureHeader);
  win.addEventListener("resize", measureHeader, { passive: true });

  /* ------------------------------------------------ bouton lecture / pause d'une vidéo */
  function videoToggle(video, button) {
    if (!video || !button) return null;
    var label = button.querySelector(".home-sr"), userPaused = false;
    function set(state) {
      var key = state === "pause" ? "home.video_pause" : state === "replay" ? "home.video_replay" : "home.video_play";
      button.setAttribute("data-state", state);
      if (label) { label.setAttribute("data-i18n", key); label.textContent = t(key); }
    }
    video.addEventListener("play", function () { set("pause"); });
    video.addEventListener("pause", function () { if (!video.ended) set("play"); });
    video.addEventListener("ended", function () { set("replay"); });
    button.addEventListener("click", function () {
      if (video.ended) { userPaused = false; video.currentTime = 0; play(video); }
      else if (video.paused) { userPaused = false; play(video); }
      else { userPaused = true; video.pause(); }
    });
    set(video.paused ? (video.ended ? "replay" : "play") : "pause");
    return { isUserPaused: function () { return userPaused; } };
  }
  function play(video) {
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* lecture refusée (réglage du navigateur) : l'affiche reste visible */ });
    return p;
  }
  /* Lecture seulement quand la vidéo est visible (économie de batterie et de processeur). La source peut arriver
     après coup (posée après l'événement load) : on retente dès que la vidéo est prête. */
  function playWhenVisible(video, ctl, threshold) {
    var visible = !hasIO;
    function attempt() {
      if (visible && video.paused && !video.ended && video.readyState >= 2 && (!ctl || !ctl.isUserPaused())) play(video);
    }
    video.addEventListener("canplay", attempt);
    if (!hasIO) { attempt(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        visible = e.isIntersecting;
        if (visible) attempt(); else if (!video.paused) video.pause();
      });
    }, { threshold: threshold || 0.25 }).observe(video);
  }

  /* ================================================ HERO */
  var hero = doc.querySelector("[data-home-hero]");
  var screen = hero && hero.querySelector("[data-hero-screen]");
  var video = doc.getElementById("homeLogoVideo");
  var still = root.classList.contains("home-still");
  var heroCtl = null;

  function revealHero() { if (hero) hero.classList.add("is-revealed"); }

  if (hero && video && !still) {
    heroCtl = videoToggle(video, hero.querySelector(".home-hero__toggle"));
  }

  if (hero && root.classList.contains("home-intro") && video && screen) {
    runIntro();
  } else {
    root.classList.remove("home-intro");
    raf2(revealHero);                                            // l'état initial est peint, puis l'entrée se joue
    if (video && !still) playWhenVisible(video, heroCtl, 0.35);
  }

  function runIntro() {
    var skip = hero.querySelector("[data-intro-skip]");
    var bar = skip && skip.querySelector(".home-intro-skip__bar");
    var startTimer, maxTimer, holdTimer, holdStart = 0, frameReq = 0, dur = 8, finished = false;
    var listeners = [];
    function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); }

    var end = once(function (fast) {
      finished = true;
      clearTimeout(startTimer); clearTimeout(maxTimer); clearTimeout(holdTimer); cancelAnimationFrame(frameReq);
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      var hadFocus = skip && doc.activeElement === skip;
      hero.classList.remove("is-intro-hold");                   // la signature s'efface pendant que l'écran rejoint le hero

      /* FLIP : position de l'intro (First) → place dans le hero (Last). is-revealed est posé AVANT la mesure :
         l'état « pas encore apparu » réduit l'écran (scale .97), ce qui fausserait le calcul. */
      var first = screen.getBoundingClientRect();
      revealHero();
      root.classList.remove("home-intro");
      var last = screen.getBoundingClientRect();
      var visible = last.width > 0 && last.top < win.innerHeight * 0.78 && last.bottom > 0;

      if (visible) {                                             // desktop / tablette : l'écran rejoint sa place
        var s = first.width / last.width;                        // même format 4:5 → échelle uniforme, aucune déformation
        screen.style.transform = "translate(" + (first.left - last.left) + "px," + (first.top - last.top) + "px) scale(" + s + ")";
        screen.getBoundingClientRect();                          // applique l'état inversé avant la transition
        screen.classList.add("is-flipping");
        screen.style.transform = "";
        var clean = function (e) {
          if (e && e.target !== screen) return;
          screen.classList.remove("is-flipping");
          screen.removeEventListener("transitionend", clean);
        };
        screen.addEventListener("transitionend", clean);
        setTimeout(clean, 1300);
      } else {                                                   // mobile : sa place est sous le texte → fondu sur la scène
        hero.classList.remove("is-revealed");
        root.classList.add("home-intro");
        screen.classList.add("is-leaving");
        setTimeout(function () {
          revealHero();
          root.classList.remove("home-intro");
          screen.classList.remove("is-leaving");
        }, fast ? 200 : 380);
      }
      if (hadFocus) { var h1 = hero.querySelector("h1"); if (h1) h1.focus({ preventScroll: true }); }
      if (video.paused && !video.ended) play(video);
      playWhenVisible(video, heroCtl, 0.35);
    });

    /* Tenue finale : la vidéo est terminée, le logo complet reste affiché et la signature apparaît. */
    function hold() {
      if (holdStart || finished) return;
      holdStart = win.performance ? performance.now() : Date.now();
      hero.classList.add("is-intro-hold");
      holdTimer = setTimeout(function () { end(false); }, INTRO_HOLD);
    }
    /* Barre de progression du bouton « Passer l'intro » : durée de la vidéo + tenue finale */
    function tick() {
      var total = dur * 1000 + INTRO_HOLD;
      var elapsed = holdStart ? dur * 1000 + ((win.performance ? performance.now() : Date.now()) - holdStart) : video.currentTime * 1000;
      if (bar) bar.style.setProperty("--p", Math.min(1, elapsed / total).toFixed(3));
      if (!holdStart && (video.ended || video.currentTime >= dur - 0.05)) hold();
      frameReq = requestAnimationFrame(tick);
    }

    function readDuration() { if (isFinite(video.duration) && video.duration > 0) dur = video.duration; }
    readDuration();
    video.addEventListener("loadedmetadata", readDuration);
    on(video, "ended", hold);
    video.addEventListener("playing", function onPlaying() {
      video.removeEventListener("playing", onPlaying);
      clearTimeout(startTimer);
      frameReq = requestAnimationFrame(tick);
    });
    startTimer = setTimeout(function () { if (video.paused || video.readyState < 3) end(true); }, INTRO_START_TIMEOUT);
    maxTimer = setTimeout(function () { end(true); }, INTRO_MAX);
    play(video);

    function skipNow() { end(true); }
    if (skip) on(skip, "click", skipNow);
    on(doc, "keydown", function (e) { if (e.key === "Escape" || e.key === "Esc") skipNow(); });
    on(win, "wheel", skipNow, { passive: true });
    on(win, "touchmove", skipNow, { passive: true });
    on(win, "scroll", function () { if (win.scrollY > 4) skipNow(); }, { passive: true });
    on(hero, "focusin", function (e) { if (e.target !== skip) skipNow(); });
    on(doc, "visibilitychange", function () { if (doc.hidden) skipNow(); });
  }

  /* ================================================ APPARITIONS AU DÉFILEMENT */
  doc.querySelectorAll("[data-stagger]").forEach(function (group) {
    group.querySelectorAll(".home-reveal").forEach(function (el, i) { el.style.setProperty("--i", Math.min(i, 6)); });
  });
  var reveals = doc.querySelectorAll(".home-reveal"), steps = doc.querySelectorAll("[data-steps], [data-draw]");   // tracés : fil des étapes, jauge de l'examen
  if (reduce || !hasIO) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
    steps.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    /* Apparition jouée une seule fois ; ensuite l'élément redevient « normal » (ses transitions de survol reprennent). */
    var settle = function (el) {
      var done = false;
      var fin = function (ev) {
        if (done || (ev && (ev.target !== el || ev.propertyName !== "opacity"))) return;
        done = true;
        el.removeEventListener("transitionend", fin);
        el.classList.remove("home-reveal", "is-in");
        el.style.removeProperty("--i");
      };
      el.addEventListener("transitionend", fin);
      setTimeout(fin, 650 + 70 * 6 + 250);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        if (e.target.classList.contains("home-reveal")) settle(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    steps.forEach(function (el) { io.observe(el); });
  }

  /* ================================================ COMPTEURS (chiffres déjà présents dans le HTML) */
  var counters = doc.querySelectorAll(".home [data-count]");
  if (!reduce && hasIO && counters.length) {
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count")), start = null, dur = 1400;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * e));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      if (el.getBoundingClientRect().top < win.innerHeight) return;              // déjà visible : aucun saut « 500 → 0 »
      el.textContent = "0";                                                      // hors écran : repart de 0 (le HTML garde le vrai chiffre, sans JS)
      cio.observe(el);
    });
  }

  /* ================================================ HALO AU POINTEUR + CARTES FLOTTANTES (pointeur fin uniquement) */
  if (finePointer && !reduce) {
    var spotReq = 0, spotEvt = null;
    doc.addEventListener("pointermove", function (e) {
      spotEvt = e;
      if (spotReq) return;
      spotReq = requestAnimationFrame(function () {
        spotReq = 0;
        var el = spotEvt.target && spotEvt.target.closest ? spotEvt.target.closest(".home-spot") : null;
        if (!el) return;
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (spotEvt.clientX - r.left) + "px");
        el.style.setProperty("--my", (spotEvt.clientY - r.top) + "px");
      });
    }, { passive: true });

    if (hero) {
      var floats = hero.querySelectorAll(".home-float"), floatReq = 0;
      hero.addEventListener("pointermove", function (e) {
        if (floatReq || root.classList.contains("home-intro")) return;
        floatReq = requestAnimationFrame(function () {
          floatReq = 0;
          var r = hero.getBoundingClientRect();
          var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
          floats.forEach(function (f, i) {
            var k = i ? -1 : 1;                                   // les deux cartes bougent en sens opposé (profondeur)
            f.style.setProperty("--px", (dx * 12 * k).toFixed(1) + "px");
            f.style.setProperty("--py", (dy * 10 * k).toFixed(1) + "px");
          });
        });
      }, { passive: true });
      hero.addEventListener("pointerleave", function () {
        floats.forEach(function (f) { f.style.setProperty("--px", "0px"); f.style.setProperty("--py", "0px"); });
      });
    }
  }

  /* ================================================ PARALLAXE LÉGÈRE DU NUAGE DE LOGOS (10 à 22 px) */
  var cloud = doc.querySelector("[data-logo-cloud]");
  if (cloud && !reduce && hasIO) {
    var cols = Array.prototype.slice.call(cloud.querySelectorAll("[data-depth]"));
    var pReq = 0;
    var update = function () {
      pReq = 0;
      var r = cloud.getBoundingClientRect(), vh = win.innerHeight;
      var p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
      cols.forEach(function (c) { c.style.setProperty("--py", (p * parseFloat(c.getAttribute("data-depth"))).toFixed(1) + "px"); });
    };
    var onScroll = function () { if (!pReq) pReq = requestAnimationFrame(update); };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { win.addEventListener("scroll", onScroll, { passive: true }); update(); }
        else win.removeEventListener("scroll", onScroll);
      });
    }).observe(cloud);
  }
})();
