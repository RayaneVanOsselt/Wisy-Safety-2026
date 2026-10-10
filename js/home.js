/* =========================================================================
   WISY SAFETY — Page d'accueil : entrée de marque, entrée du hero, apparitions,
   compteurs, halo au pointeur, parallaxe légère, vidéo pilotée.
   -------------------------------------------------------------------------
   Chargé uniquement par index.html (après le socle en ligne : en-tête, pied de
   page). Aucune dépendance. Tout est progressif : sans ce fichier, la page reste
   entièrement lisible (les états « cachés » de css/home.css sont sous html.js).

   Entrée de marque (html.home-intro, décidée AVANT le premier affichage par le
   script du <head>) : 1re visite de la session, sans ancre, onglet visible, hors
   robots, mouvement réduit et économie de données. Rideau sombre : le « W » du
   logo se trace puis se remplit, « Wisy Safety » monte, trait laser et signature ;
   à 1,15 s le rideau se lève (bord courbe), le logo vole jusqu'à sa place dans
   l'en-tête et le hero — déjà peint dessous, LCP inchangé — monte en parallaxe.
   ≈ 2,4 s au total, entièrement en CSS (css/home.css, section 4 bis) : ce script
   ne fait que la synchroniser et la compléter. Aucun fichier chargé (logo
   vectoriel en ligne). Passer : clic ou toucher, touche, molette, défilement.
   Garde-fou : la scène est retirée au plus tard après 4 s.
   ========================================================================= */
(function () {
  "use strict";

  var doc = document, root = doc.documentElement, win = window;
  var reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = win.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in win;
  var ENTRANCE_LIFT = 1150;      // ms : lever du rideau de l'entrée de marque (= --e-lift, css/home.css)
  var ENTRANCE_MAX = 4000;       // ms : garde-fou — la scène est retirée quoi qu'il arrive
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
  var entrance = doc.querySelector("[data-entrance]");
  var video = doc.getElementById("homeLogoVideo");
  var still = root.classList.contains("home-still");
  var heroCtl = null;

  function revealHero() { if (hero) hero.classList.add("is-revealed"); }

  if (hero && video && !still) {
    heroCtl = videoToggle(video, hero.querySelector(".home-hero__toggle"));
  }

  if (hero && entrance && root.classList.contains("home-intro")) {
    runEntrance();
  } else {
    root.classList.remove("home-intro");
    if (entrance) entrance.remove();
    raf2(revealHero);                                            // l'état initial est peint, puis l'entrée se joue
    if (video && !still) playWhenVisible(video, heroCtl, 0.35);
  }

  /* Entrée de marque. La séquence est en CSS et a démarré au premier affichage (souvent avant ce script) : on se cale
     sur elle grâce à l'animation du rideau. Ce script ajoute le vol du logo jusqu'à sa place dans l'en-tête, rend la
     main au hero quand son entrée est finie, et permet de passer l'entrée au moindre geste. */
  function runEntrance() {
    var curtain = entrance.querySelector(".home-entrance__curtain");
    var logo = entrance.querySelector(".home-entrance__logo");
    var timers = [], listeners = [], dockTarget = null;
    function later(fn, ms) { timers.push(setTimeout(fn, Math.max(0, ms))); }
    function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); }
    function anims(el) { return el.getAnimations ? el.getAnimations({ subtree: true }) : []; }

    var startVideo = once(function () { if (video && !still) playWhenVisible(video, heroCtl, 0.35); });
    function showHeaderLogo() { if (dockTarget) dockTarget.style.visibility = ""; }
    var removeStage = once(function () {
      showHeaderLogo();
      timers.forEach(clearTimeout);
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      entrance.remove();
    });
    /* Le hero a fini de monter : on rend la main à ses états normaux (.is-revealed), sans aucun saut visible */
    var settleHero = once(function () {
      revealHero();
      raf2(function () { root.classList.remove("home-intro"); });
      startVideo();
    });
    setTimeout(function () { removeStage(); settleHero(); }, ENTRANCE_MAX);     // garde-fou : quoi qu'il arrive

    var lift = anims(curtain).filter(function (a) { return a.animationName === "home-entrance-lift"; })[0];
    if (!lift || lift.currentTime == null) {                    // navigateur sans Web Animations : le CSS finit seul
      setTimeout(function () { removeStage(); settleHero(); }, ENTRANCE_LIFT + 1500);
      return;
    }
    var toLift = ENTRANCE_LIFT - lift.currentTime;               // ms avant le lever du rideau (négatif : déjà levé)

    /* Vol du logo : de sa place dans la scène à celle du logo de l'en-tête (même dessin, même cadre). Le vrai logo est
       masqué pendant le vol (jamais deux logos décalés, quelle que soit la hauteur d'écran), puis fondu enchaîné. */
    function dock() {
      var target = doc.querySelector(".site-header .logo__img");
      var a = logo.getBoundingClientRect(), b = target ? target.getBoundingClientRect() : null;
      if (!b || !a.height || !b.height || b.bottom <= 0 || b.top >= win.innerHeight) return;   // repli : le logo s'efface (CSS)
      dockTarget = target;
      target.style.visibility = "hidden";
      entrance.classList.add("is-docking");                      // coupe la sortie de secours avant qu'elle ne commence
      logo.getBoundingClientRect();
      logo.style.transform = "translate(" + (b.left - a.left).toFixed(2) + "px," + (b.top - a.top).toFixed(2) + "px) scale(" + (b.height / a.height).toFixed(4) + ")";
      later(function () { showHeaderLogo(); entrance.classList.add("is-docked"); }, 990);   // le rideau a dégagé l'en-tête : relais au vrai logo
    }
    if (toLift > 60) later(dock, toLift - 30);
    later(startVideo, toLift + 300);
    later(removeStage, toLift + 1230);

    /* Fin de l'entrée du hero (ses animations CSS) */
    var heroAnims = anims(hero);
    if (heroAnims.length) Promise.all(heroAnims.map(function (a) { return a.finished; })).then(settleHero, settleHero);
    else later(settleHero, toLift + 1700);

    /* Passer l'entrée : la scène s'efface, le hero joue tout de suite sa montée (même chorégraphie, sans attendre) */
    function skip() {
      if (entrance.classList.contains("is-skipped")) return;
      entrance.classList.add("is-skipped");
      showHeaderLogo();
      var shift = Math.max(0, ENTRANCE_LIFT - (lift.currentTime || 0));
      if (shift) heroAnims.forEach(function (a) { if (a.currentTime != null) a.currentTime += shift; });
      timers.forEach(clearTimeout);
      timers = [];
      startVideo();
      later(removeStage, 280);
      if (!heroAnims.length) later(settleHero, 300);
    }
    on(curtain, "pointerdown", skip);
    on(doc, "keydown", skip);
    on(win, "wheel", skip, { passive: true });
    on(win, "touchmove", skip, { passive: true });
    on(win, "scroll", function () { if (win.scrollY > 4) skip(); }, { passive: true });
    on(doc, "visibilitychange", function () { if (doc.hidden) skip(); });
    if (toLift < -1230) removeStage();                           // script très en retard : tout est déjà joué
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
