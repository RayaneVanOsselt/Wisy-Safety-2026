/* =========================================================================
   WISY SAFETY — Scènes automatiques (module réutilisable, sans dépendance)
   -------------------------------------------------------------------------
   Enchaîne plusieurs « scènes » (contenus, visuels, cartes mises en avant)
   toutes les 5 secondes avec un fondu-glissé doux, et boucle sans à-coup.

   Balisage attendu (voir la section « Points forts » de la page nacelles) :

     <div class="wsy-scenes" data-wsy-scenes data-interval="5000"
          data-item-label="Point fort" aria-label="…">
       <div class="wsy-scenes__controls" hidden>
         <button class="wsy-scenes__arrow wsy-scenes__prev">…</button>
         <div class="wsy-scenes__dashes"></div>          ← généré par le module
         <button class="wsy-scenes__arrow wsy-scenes__next">…</button>
         <button class="wsy-scenes__toggle" aria-pressed="false">…</button>
       </div>
       <div class="wsy-scenes__stage">
         <article class="wsy-scene">…</article> × n
       </div>
     </div>

   Comportement
   • Chaque scène reste visible 5 s ; la transition dure ~560 ms (CSS).
   • Hauteur stable : les scènes sont superposées dans une même cellule de grille.
   • La micro-barre de progression est UNE animation CSS (5 s) sur la ligne active :
     elle pilote le passage à la scène suivante (`animationend`) — jamais de
     minuteur en parallèle, donc aucune dérive — et se fige quand on met en pause.
   • Pause automatique : survol (souris), focus clavier, toucher, onglet masqué,
     composant hors écran. Interaction manuelle (flèche, ligne, swipe, clavier) :
     pause temporaire, reprise automatique après 8 s sans action.
   • Bouton pause/lecture (WCAG 2.2.2) : pause persistante jusqu'à nouvelle action.
   • Accessibilité : region/carousel, scènes inactives inert + aria-hidden,
     aria-live « off » en lecture, « polite » à l'arrêt, flèches ← → Début/Fin.
   • prefers-reduced-motion : aucun autoplay ; toutes les scènes restent lisibles.
   • Sans JavaScript : toutes les scènes s'affichent empilées (aucun contenu masqué).
   ========================================================================= */
(function (global) {
  "use strict";

  const DEFAULT_INTERVAL = 5000;   // 5 secondes entre deux scènes
  const RESUME_DELAY = 8000;       // reprise après une interaction manuelle
  const SWIPE_MIN = 48;            // px

  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false, addEventListener() {} };

  const text = (key, fallback) => {
    const i18n = global.WisyI18N;
    const v = i18n ? i18n.get(i18n.current(), key) : null;
    return v != null ? v : fallback;
  };

  class Scenes {
    constructor(root) {
      this.root = root;
      this.stage = root.querySelector(".wsy-scenes__stage");
      this.scenes = Array.from(root.querySelectorAll(".wsy-scene"));
      this.controls = root.querySelector(".wsy-scenes__controls");
      this.prevBtn = root.querySelector(".wsy-scenes__prev");
      this.nextBtn = root.querySelector(".wsy-scenes__next");
      this.toggleBtn = root.querySelector(".wsy-scenes__toggle");
      this.dashHost = root.querySelector(".wsy-scenes__dashes");
      this.index = 0;
      this.enhanced = false;
      this.dashes = [];
      this.resumeTimer = null;
      this.leaveTimers = new Map();
      this.pause = { user: false, hover: false, focus: false, touch: false, temp: false };
      this.visible = false;
      this.tabVisible = !document.hidden;
      this.swipe = null;
      if (this.scenes.length < 2 || !this.stage) return;

      const ms = Number(root.dataset.interval) || DEFAULT_INTERVAL;
      if (ms !== DEFAULT_INTERVAL) root.style.setProperty("--wsy-interval", ms + "ms");

      this.bind();
      this.applyMotionPreference();
    }

    /* ---------- activation / désactivation (préférence de mouvement) ---------- */
    applyMotionPreference() {
      if (motionQuery.matches) this.disable();
      else this.enable();
    }

    enable() {
      if (this.enhanced) return;
      this.enhanced = true;
      const r = this.root;
      r.classList.add("is-enhanced");
      r.classList.remove("is-idle");
      if (this.controls) this.controls.hidden = false;
      this.buildDashes();
      this.scenes.forEach((s, i) => {
        s.setAttribute("role", "group");
        s.setAttribute("aria-roledescription", "slide");
        s.setAttribute("aria-label", (i + 1) + " / " + this.scenes.length);
        s.classList.toggle("is-active", i === this.index);
        s.classList.remove("is-leaving");
        this.setInactive(s, i !== this.index);
      });
      this.mark(this.index);
      this.sync();
    }

    disable() {
      const r = this.root;
      this.enhanced = false;
      r.classList.remove("is-enhanced", "is-paused");
      r.classList.add("is-idle");
      if (this.controls) this.controls.hidden = true;
      this.scenes.forEach((s) => {
        s.classList.remove("is-active", "is-leaving");
        s.removeAttribute("role");
        s.removeAttribute("aria-roledescription");
        s.removeAttribute("aria-label");
        this.setInactive(s, false);
      });
      this.stage.removeAttribute("aria-live");
    }

    setInactive(scene, inactive) {
      if (inactive) scene.setAttribute("aria-hidden", "true");
      else scene.removeAttribute("aria-hidden");
      scene.inert = inactive;
    }

    /* ---------- pagination : petites lignes 18 px → 38 px + progression ---------- */
    buildDashes() {
      if (!this.dashHost || this.dashes.length) return;
      this.scenes.forEach((_, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "wsy-scenes__dash";
        b.innerHTML = '<span class="wsy-scenes__line"><span class="wsy-scenes__fill"></span></span>';
        b.addEventListener("click", () => this.userGo(i));
        this.dashHost.appendChild(b);
        this.dashes.push(b);
      });
      this.relabel();
    }

    relabel() {
      const base = this.root.dataset.itemLabel || text("nac.sc_item", "Point fort");
      this.dashes.forEach((b, i) => b.setAttribute("aria-label", base + " " + (i + 1) + " / " + this.scenes.length));
    }

    mark(i) {
      this.dashes.forEach((d, k) => {
        if (k === i) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }

    /* ---------- navigation ---------- */
    goTo(target, restart) {
      const n = this.scenes.length;
      const to = ((target % n) + n) % n;
      if (to === this.index && !restart) return;
      const from = this.scenes[this.index];
      const next = this.scenes[to];

      if (to !== this.index) {
        // la scène sortante glisse légèrement à gauche en s'effaçant, l'entrante arrive de la droite
        from.classList.remove("is-active");
        from.classList.add("is-leaving");
        this.setInactive(from, true);
        clearTimeout(this.leaveTimers.get(from));
        this.leaveTimers.set(from, setTimeout(() => from.classList.remove("is-leaving"), 620));
        clearTimeout(this.leaveTimers.get(next));
        next.classList.remove("is-leaving");
        next.classList.add("is-active");
        this.setInactive(next, false);
        this.index = to;
      }
      // relancer la barre de progression depuis 0
      this.dashes.forEach((d) => d.removeAttribute("aria-current"));
      void this.root.offsetWidth;
      this.mark(this.index);
    }

    next(auto) { this.goTo(this.index + 1); if (!auto) this.hold(); }
    prev() { this.goTo(this.index - 1); this.hold(); }
    userGo(i) { this.goTo(i, true); this.hold(); }

    /* pause temporaire après une interaction manuelle, puis reprise automatique */
    hold() {
      this.pause.temp = true;
      clearTimeout(this.resumeTimer);
      this.resumeTimer = setTimeout(() => { this.pause.temp = false; this.sync(); }, RESUME_DELAY);
      this.sync();
    }

    /* ---------- état de lecture ---------- */
    sync() {
      if (!this.enhanced) return;
      const p = this.pause;
      const running = !p.user && !p.hover && !p.focus && !p.touch && !p.temp && this.visible && this.tabVisible;
      this.root.classList.toggle("is-paused", !running);
      // en lecture automatique : aria-live off (pas d'annonce parasite) ; à l'arrêt : polite
      this.stage.setAttribute("aria-live", running ? "off" : "polite");
      if (this.toggleBtn) this.toggleBtn.setAttribute("aria-pressed", String(p.user));
    }

    /* ---------- événements ---------- */
    bind() {
      const r = this.root;

      // la fin de la barre de progression (5 s) déclenche la scène suivante
      r.addEventListener("animationend", (e) => {
        if (e.animationName === "wsy-progress" && this.enhanced) this.next(true);
      });

      if (this.prevBtn) this.prevBtn.addEventListener("click", () => this.prev());
      if (this.nextBtn) this.nextBtn.addEventListener("click", () => this.next(false));
      if (this.toggleBtn) this.toggleBtn.addEventListener("click", () => { this.pause.user = !this.pause.user; this.sync(); });

      // souris : pause au survol (pas sur écran tactile)
      r.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { this.pause.hover = true; this.sync(); } });
      r.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { this.pause.hover = false; this.sync(); } });

      // focus CLAVIER uniquement (un clic souris ne doit pas figer la lecture indéfiniment)
      r.addEventListener("focusin", (e) => {
        let kb = false;
        try { kb = e.target.matches(":focus-visible"); } catch (err) { kb = true; }
        if (kb) { this.pause.focus = true; this.sync(); }
      });
      r.addEventListener("focusout", () => {
        setTimeout(() => { if (!r.contains(document.activeElement)) { this.pause.focus = false; this.sync(); } }, 0);
      });

      // clavier : ← → Début Fin
      r.addEventListener("keydown", (e) => {
        if (!this.enhanced || e.altKey || e.ctrlKey || e.metaKey) return;
        const map = { ArrowLeft: () => this.prev(), ArrowRight: () => this.next(false), Home: () => this.userGo(0), End: () => this.userGo(this.scenes.length - 1) };
        if (map[e.key]) { e.preventDefault(); map[e.key](); }
      });

      // swipe tactile naturel (le défilement vertical de la page reste libre : touch-action: pan-y)
      this.stage.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") return;
        this.swipe = { x: e.clientX, y: e.clientY };
        this.pause.touch = true; this.sync();
      });
      const endSwipe = (e) => {
        if (!this.swipe) return;
        const dx = e.clientX - this.swipe.x, dy = e.clientY - this.swipe.y;
        this.swipe = null;
        this.pause.touch = false;
        if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2) (dx < 0 ? this.next(false) : this.prev());
        else this.sync();
      };
      this.stage.addEventListener("pointerup", endSwipe);
      this.stage.addEventListener("pointercancel", () => { this.swipe = null; this.pause.touch = false; this.sync(); });

      // hors écran / onglet masqué : on fige la progression
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
          this.sync();
        }, { threshold: 0.35 }).observe(r);
      } else { this.visible = true; }
      document.addEventListener("visibilitychange", () => { this.tabVisible = !document.hidden; this.sync(); });

      // préférence de mouvement modifiée en cours de visite
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", () => this.applyMotionPreference());

      // libellés traduits
      document.addEventListener("i18n:changed", () => this.relabel());
    }
  }

  global.WisyScenes = {
    init(scope) {
      return Array.from((scope || document).querySelectorAll("[data-wsy-scenes]")).map((el) => el.__wsyScenes || (el.__wsyScenes = new Scenes(el)));
    }
  };
})(window);
