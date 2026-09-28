/* =========================================================================
   WISY SAFETY — WiSy Coordination : comportements propres à la page
   -------------------------------------------------------------------------
   En-tête, menu mobile, pied de page et apparitions au scroll viennent de
   js/site-chrome.js (partagé). Ce fichier n'ajoute que ce qui est propre à
   cette page — une interaction différente par chapitre :

     initHero()          équerres dessinées au chargement, léger parallaxe, loupe
                         « inspection » (souris uniquement : la photo en couleurs
                         apparaît dans un cercle qui suit le pointeur).
     initRail()          rail de chapitres (grand écran) : chapitre courant,
                         progression, libellé qui s'affiche au changement.
     initGhosts()        numéros fantômes qui glissent légèrement au scroll.
     initSpotlight()     halo qui suit la souris sur les cartes [data-spot].
     initExplore()       01 · piliers en onglets (clic, survol, flèches, « Suivant »).
     initSimulator()     02 · « le déclencheur » : nombre d'entreprises × mode
                         (simultané / successif) → illustration du principe légal
                         général, jamais un avis juridique (texte affiché).
     initServices()      03 · panneaux qui s'élargissent (survol / clic / clavier)
                         sur grand écran, accordéon sur mobile.
     initSteps()         04 · méthode pas à pas (frise, précédent / suivant).
     initServicePicks()  « Demander ce service » coche le service dans le formulaire.
     initTeam()          fiches de js/coordination-data.js (TEAM) ou, tant que ce
                         tableau est vide, l'état « équipe à venir » du HTML.
     initForm()          validation native + anti-spam + envoi EmailJS (même compte
                         que contact.html / peb-wallonie-bruxelles.html), sans pièce jointe.
     initTracking()      clics [data-co-track] → bus `wisy:analytics` (aucune donnée perso).

   Amélioration progressive : sans JavaScript, tout est lisible (fiches empilées,
   accordéons ouverts). Chaque composant pose `.is-ready` quand il prend la main.
   Mouvement réduit : pas de loupe, pas de parallaxe (les changements d'état restent).
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const Chrome = window.WisyChrome || { track() {}, tr: (k, f) => f, currentLang: () => "fr" };
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isRtl = () => document.documentElement.getAttribute("dir") === "rtl";
  const pad = (n) => String(n).padStart(2, "0");

  /* Un seul écouteur scroll/resize pour toute la page, cadencé par requestAnimationFrame. */
  const onFrame = (() => {
    const jobs = [];
    let ticking = false;
    const run = () => { ticking = false; jobs.forEach((fn) => fn()); };
    const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return (fn) => { jobs.push(fn); fn(); };
  })();

  /* Texte traduit posé par le script : l'attribut data-i18n suit la clé, pour qu'un
     changement de langue ultérieur (js/i18n.js) retraduise le bon texte. */
  function setText(el, key) {
    if (!el) return;
    el.setAttribute("data-i18n", key);
    const v = Chrome.tr(key, null);
    if (v != null) el.textContent = v;
  }

  /* --------------------------------------------------------------------- */
  /* Hero                                                                  */
  /* --------------------------------------------------------------------- */
  function initHero() {
    const hero = $(".co-hero");
    if (!hero) return;
    requestAnimationFrame(() => hero.classList.add("is-ready"));
    if (reducedMotion()) return;
    const visual = $("[data-parallax]", hero);
    if (!visual) return;
    onFrame(() => {
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      visual.style.setProperty("--py", Math.round(r.top * -0.12) + "px");
    });
    if (finePointer()) initLens(hero, visual);
  }

  /* Loupe : la même image (currentSrc : AVIF ou WebP déjà téléchargé, aucune requête en plus),
     sans filtre, masquée par un disque qui suit la souris avec un léger amorti. */
  function initLens(hero, visual) {
    const img = $("img", visual);
    if (!img) return;
    const lens = document.createElement("div");
    lens.className = "co-hero__lens";
    lens.setAttribute("aria-hidden", "true");
    const ring = document.createElement("div");
    ring.className = "co-hero__ring";
    ring.setAttribute("aria-hidden", "true");
    const setSrc = () => {
      const src = img.currentSrc || img.src;
      if (src) lens.style.backgroundImage = 'url("' + src.replace(/["\\]/g, "") + '")';
    };
    if (img.complete) setSrc(); else img.addEventListener("load", setSrc, { once: true });
    visual.insertBefore(lens, $(".co-hero__brackets", visual));
    visual.appendChild(ring);

    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, inside = false;
    function paint() {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      const vr = visual.getBoundingClientRect(), lr = lens.getBoundingClientRect();
      /* disque du masque : coordonnées locales de la couche (elle est translatée et agrandie comme la photo) */
      const sx = lens.offsetWidth / (lr.width || 1), sy = lens.offsetHeight / (lr.height || 1);
      visual.style.setProperty("--lx", ((x + vr.left - lr.left) * sx).toFixed(1) + "px");
      visual.style.setProperty("--ly", ((y + vr.top - lr.top) * sy).toFixed(1) + "px");
      visual.style.setProperty("--rx", x.toFixed(1) + "px");
      visual.style.setProperty("--ry", y.toFixed(1) + "px");
      raf = (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) ? requestAnimationFrame(paint) : 0;
    }
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const vr = visual.getBoundingClientRect();
      tx = e.clientX - vr.left; ty = e.clientY - vr.top;
      if (!inside) { inside = true; x = tx; y = ty; hero.classList.add("is-lens"); }
      if (!raf) raf = requestAnimationFrame(paint);
    });
    hero.addEventListener("pointerleave", () => { inside = false; hero.classList.remove("is-lens"); });
  }

  /* --------------------------------------------------------------------- */
  /* Rail de chapitres (grand écran)                                       */
  /* --------------------------------------------------------------------- */
  function initRail() {
    const rail = $("[data-rail]");
    if (!rail) return;
    const links = $$("[data-rail-link]", rail);
    const sections = links.map((a) => document.getElementById(a.getAttribute("href").slice(1)));
    if (!sections.length || sections.some((s) => !s)) return;
    const hero = $(".co-hero");
    const wide = window.matchMedia("(min-width: 1200px)");      // = css/coordination.css : rail masqué en dessous
    let current = -1, flashTimer = 0;
    onFrame(() => {
      if (!wide.matches) return;
      const vh = window.innerHeight, mid = vh * 0.5;          // = hauteur du rail : sa teinte suit la section qu'il survole
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      const last = sections[sections.length - 1].getBoundingClientRect();
      rail.classList.toggle("is-visible", heroBottom < vh * 0.4 && last.bottom > vh * 0.35);
      let idx = -1;
      sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) idx = i; });
      if (idx !== current) {
        current = idx;
        links.forEach((a, i) => { a.classList.toggle("is-current", i === idx); a.classList.toggle("is-past", i < idx); a.classList.remove("is-flash"); });
        rail.classList.toggle("is-dark", idx >= 0 && sections[idx].getAttribute("data-tone") === "dark");
        clearTimeout(flashTimer);
        if (idx >= 0 && rail.classList.contains("is-visible")) {
          links[idx].classList.add("is-flash");
          flashTimer = setTimeout(() => links[idx] && links[idx].classList.remove("is-flash"), 1600);
        }
      }
      const top = sections[0].getBoundingClientRect().top;
      const span = last.bottom - top - vh;
      const p = span > 0 ? Math.max(0, Math.min(1, (mid - top) / (span + mid))) : 1;
      rail.style.setProperty("--progress", p.toFixed(3));
    });
  }

  /* --------------------------------------------------------------------- */
  /* Numéros fantômes : glissement vertical de quelques dizaines de pixels  */
  /* --------------------------------------------------------------------- */
  function initGhosts() {
    if (reducedMotion()) return;
    const ghosts = $$(".co-ghost");
    if (!ghosts.length) return;
    onFrame(() => {
      const vh = window.innerHeight;
      ghosts.forEach((g) => {
        const r = g.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (vh - r.top) / (vh + r.height);           // 0 → 1 pendant la traversée de l'écran
        g.style.setProperty("--gy", ((0.5 - p) * 70).toFixed(1) + "px");
      });
    });
  }

  /* --------------------------------------------------------------------- */
  /* Halo qui suit la souris                                               */
  /* --------------------------------------------------------------------- */
  function initSpotlight() {
    if (!finePointer()) return;
    $$("[data-spot]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
        el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
      });
    });
  }

  /* --------------------------------------------------------------------- */
  /* Onglets accessibles (motif WAI-ARIA « tabs », activation automatique)  */
  /* partagés par l'explorateur de piliers et la méthode pas à pas.         */
  /* --------------------------------------------------------------------- */
  function wireTabs(list, tabs, panels, labelledBy, onSelect, vertical) {
    list.setAttribute("role", "tablist");
    if (labelledBy) list.setAttribute("aria-labelledby", labelledBy);
    tabs.forEach((t, i) => {
      const p = panels[i];
      t.id = t.id || p.id + "-tab";
      t.setAttribute("role", "tab");
      t.setAttribute("aria-controls", p.id);
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", t.id);
      t.addEventListener("click", () => onSelect(i, { track: true }));
      t.addEventListener("keydown", (e) => {
        const next = isRtl() ? "ArrowLeft" : "ArrowRight", prev = isRtl() ? "ArrowRight" : "ArrowLeft";
        let n = null;
        if (e.key === next || (vertical && e.key === "ArrowDown")) n = (i + 1) % tabs.length;
        else if (e.key === prev || (vertical && e.key === "ArrowUp")) n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault();
        onSelect(n, { focus: true, track: true });
      });
    });
  }
  function showTab(tabs, panels, i) {
    tabs.forEach((t, k) => { const on = k === i; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    panels.forEach((p, k) => { const on = k === i; p.classList.toggle("is-active", on); p.inert = !on; });
  }

  /* --------------------------------------------------------------------- */
  /* 01 · Explorateur des piliers                                          */
  /* --------------------------------------------------------------------- */
  function initExplore() {
    $$("[data-explore]").forEach((root) => {
      const list = $("[data-explore-tabs]", root);
      const tabs = $$("[data-explore-tab]", root), panels = $$("[data-explore-panel]", root);
      if (!list || !tabs.length || tabs.length !== panels.length) return;
      const stage = $(".co-explore__stage", root);
      const behavior = () => (reducedMotion() ? "auto" : "smooth");
      let current = -1, hover = 0;
      function select(i, opts = {}) {
        i = (i + tabs.length) % tabs.length;
        if (i === current) return;
        current = i;
        showTab(tabs, panels, i);
        if (opts.focus) tabs[i].focus();
        if (opts.reveal) reveal(tabs[i]);
        if (opts.track) Chrome.track("coord_pillar_view", { pillar: i + 1 });
      }
      /* « Suivant » (mobile surtout) : pastille active centrée dans le ruban (défilement horizontal seul),
         et haut de la nouvelle fiche ramené sous l'en-tête si on l'avait dépassé en lisant. */
      function reveal(tab) {
        if (list.scrollWidth > list.clientWidth) {
          const delta = tab.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth - tab.offsetWidth) / 2;
          list.scrollBy({ left: delta, behavior: behavior() });
        }
        const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 120;
        const top = stage ? stage.getBoundingClientRect().top : 0;
        if (top < offset) window.scrollBy({ top: top - offset - 12, behavior: behavior() });
      }
      wireTabs(list, tabs, panels, "co-why-title", select, true);
      tabs.forEach((t, i) => {
        t.addEventListener("mouseenter", () => {
          if (!finePointer()) return;
          clearTimeout(hover);
          hover = setTimeout(() => select(i), 140);        // survol : pas d'événement de mesure (seulement clic / clavier)
        });
        t.addEventListener("mouseleave", () => clearTimeout(hover));
      });
      $$("[data-explore-next]", root).forEach((b) => {
        b.hidden = false;
        b.addEventListener("click", () => {
          select(current + 1, { track: true, reveal: true });
          const nb = $("[data-explore-next]", panels[current]);
          if (nb) nb.focus({ preventScroll: true });            // le panneau quitté devient inerte
        });
      });
      root.classList.add("is-ready");
      select(0);
    });
  }

  /* --------------------------------------------------------------------- */
  /* 02 · Simulateur « le déclencheur »                                    */
  /* Illustration du texte légal affiché juste au-dessus (plusieurs         */
  /* entrepreneurs, simultanément OU successivement) — rien de plus.        */
  /* --------------------------------------------------------------------- */
  function initSimulator() {
    const sim = $("[data-sim]");
    if (!sim) return;
    const MIN = 1, MAX = 6;
    const rowsBox = $("[data-sim-rows]", sim), count = $("[data-sim-count]", sim);
    const badge = $("[data-sim-badge]", sim), text = $("[data-sim-text]", sim);
    const minus = $('[data-sim-step="-1"]', sim), plus = $('[data-sim-step="1"]', sim);
    const modes = $$("[data-sim-mode]", sim);
    if (!rowsBox || !count || !minus || !plus || modes.length !== 2) return;
    /* Interventions simultanées : périodes qui se chevauchent (fractions de la durée du chantier) */
    const OVERLAP = [[0.04, 0.7], [0.14, 0.9], [0.08, 0.6], [0.26, 0.97], [0.18, 0.78], [0.34, 0.88]];
    const bars = [];
    for (let i = 0; i < MAX; i++) {
      const row = document.createElement("div");
      row.className = "co-sim__row";
      row.innerHTML = '<span class="co-sim__who">' + (i + 1) + '</span><span class="co-sim__track"><span class="co-sim__bar"></span></span>';
      rowsBox.appendChild(row);
      bars.push(row);
    }
    let n = 2, mode = "sim";
    function render() {
      count.textContent = String(n);
      minus.disabled = n <= MIN;
      plus.disabled = n >= MAX;
      modes.forEach((b) => {
        const on = b.getAttribute("data-sim-mode") === mode;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      bars.forEach((row, i) => {
        const on = i < n;
        row.classList.toggle("is-off", !on);
        let s, w;
        if (n === 1) { s = 0.05; w = 0.9; }
        else if (mode === "succ") { const seg = 1 / n; s = i * seg; w = Math.max(seg - 0.012, 0.02); }
        else { s = OVERLAP[i][0]; w = OVERLAP[i][1] - OVERLAP[i][0]; }
        if (!on) { s = 0; w = 0; }
        const bar = row.lastElementChild.firstElementChild;
        bar.style.setProperty("--s", (s * 100).toFixed(2) + "%");
        bar.style.setProperty("--w", (w * 100).toFixed(2) + "%");
      });
      const many = n >= 2;
      sim.setAttribute("data-state", many ? "many" : "one");
      setText(badge, many ? "coord.sim_yes" : "coord.sim_no");
      setText(text, !many ? "coord.sim_one" : mode === "succ" ? "coord.sim_many_succ" : "coord.sim_many_sim");
    }
    function bump() { count.classList.remove("is-bump"); void count.offsetWidth; count.classList.add("is-bump"); }
    [minus, plus].forEach((b) => b.addEventListener("click", () => {
      const next = Math.max(MIN, Math.min(MAX, n + Number(b.getAttribute("data-sim-step"))));
      if (next === n) return;
      n = next;
      render(); bump();
      if (b.disabled) (b === minus ? plus : minus).focus();   // ne jamais laisser le focus sur un bouton désactivé
      Chrome.track("coord_sim_change", { companies: n, mode });
    }));
    modes.forEach((b, i) => {
      b.addEventListener("click", () => {
        if (mode === b.getAttribute("data-sim-mode")) return;
        mode = b.getAttribute("data-sim-mode");
        render();
        Chrome.track("coord_sim_change", { companies: n, mode });
      });
      b.addEventListener("keydown", (e) => {           // groupe radio : les flèches changent la sélection
        if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
        e.preventDefault();
        const other = modes[1 - i];
        other.focus();
        other.click();
      });
    });
    sim.hidden = false;
    render();
  }

  /* --------------------------------------------------------------------- */
  /* 03 · Services : panneaux (grand écran) / accordéon (mobile)            */
  /* --------------------------------------------------------------------- */
  function initServices() {
    const root = $("[data-svc]");
    if (!root) return;
    const items = $$("[data-svc-item]", root);
    const heads = items.map((it) => $("[data-svc-head]", it));
    const bodies = items.map((it) => $(".co-svc__body", it));
    if (!items.length || heads.some((h) => !h)) return;
    const wide = window.matchMedia("(min-width: 1100px)");
    let open = -1, hover = 0;
    function set(i, opts = {}) {
      if (i === open) return;
      open = i;
      items.forEach((it, k) => {
        const on = k === i;
        it.classList.toggle("is-open", on);
        heads[k].setAttribute("aria-expanded", String(on));
        bodies[k].inert = !on;                             // contenu replié : hors de la tabulation
      });
      if (opts.track && i >= 0) Chrome.track("coord_service_view", { service: i + 1 });
    }
    heads.forEach((h, i) => h.addEventListener("click", () => {
      if (!wide.matches && open === i) set(-1);           // mobile : un clic referme
      else set(i, { track: true });
    }));
    items.forEach((it, i) => {
      it.addEventListener("click", (e) => {              // grand écran : tout le panneau replié est cliquable
        if (wide.matches && open !== i && !e.target.closest("[data-svc-head]")) set(i, { track: true });
      });
      it.addEventListener("mouseenter", () => {
        if (!wide.matches || !finePointer()) return;
        clearTimeout(hover);
        hover = setTimeout(() => set(i), 120);
      });
      it.addEventListener("mouseleave", () => clearTimeout(hover));
    });
    const onChange = () => { if (wide.matches && open < 0) set(0); };
    if (wide.addEventListener) wide.addEventListener("change", onChange); else if (wide.addListener) wide.addListener(onChange);
    root.classList.add("is-ready");
    set(0);
  }

  /* --------------------------------------------------------------------- */
  /* 04 · Méthode pas à pas                                                */
  /* --------------------------------------------------------------------- */
  function initSteps() {
    const root = $("[data-steps]");
    if (!root) return;
    const track = $("[data-steps-track]", root), nav = $("[data-steps-nav]", root);
    const tabs = $$("[data-steps-tab]", root), panels = $$("[data-steps-panel]", root);
    const fill = $("[data-steps-fill]", root), cur = $("[data-steps-current]", root);
    const prev = $("[data-steps-prev]", root), next = $("[data-steps-next]", root), done = $("[data-steps-done]", root);
    if (!track || !nav || !tabs.length || tabs.length !== panels.length || !prev || !next || !done) return;
    let current = -1;
    function select(i, opts = {}) {
      i = Math.max(0, Math.min(tabs.length - 1, i));
      if (i === current) return;
      const old = panels[current];
      root.style.setProperty("--dir", i > current ? "1" : "-1");
      if (old) {
        old.classList.add("is-leaving");
        setTimeout(() => old.classList.remove("is-leaving"), 560);
      }
      current = i;
      showTab(tabs, panels, i);
      tabs.forEach((t, k) => t.classList.toggle("is-done", k < i));
      if (fill) fill.style.setProperty("--p", String(tabs.length > 1 ? i / (tabs.length - 1) : 1));
      if (cur) cur.textContent = pad(i + 1);
      prev.disabled = i === 0;
      const last = i === tabs.length - 1;
      const hadFocus = document.activeElement === next || document.activeElement === prev;
      next.hidden = last;
      done.hidden = !last;
      if (hadFocus && last) done.focus();
      else if (hadFocus && prev.disabled) next.focus();
      if (opts.focus) tabs[i].focus();
      if (opts.track) Chrome.track("coord_step_view", { step: i + 1 });
    }
    wireTabs(track, tabs, panels, "co-process-title", select, false);
    prev.addEventListener("click", () => select(current - 1, { track: true }));
    next.addEventListener("click", () => select(current + 1, { track: true }));
    nav.hidden = false;
    root.classList.add("is-ready");
    select(0);
  }

  /* --------------------------------------------------------------------- */
  /* « Demander ce service » → coche le service dans le formulaire          */
  /* (le lien #co-cta fait ensuite défiler jusqu'au formulaire)             */
  /* --------------------------------------------------------------------- */
  function initServicePicks() {
    const form = $("#co-form");
    if (!form) return;
    $$("[data-svc-pick]").forEach((a) => a.addEventListener("click", () => {
      const value = a.getAttribute("data-svc-pick");
      const box = $$('input[name="services"]', form).find((b) => b.value === value);
      if (!box) return;
      box.checked = true;
      const pick = box.closest(".co-pick");
      if (pick) { pick.classList.remove("is-flash"); void pick.offsetWidth; pick.classList.add("is-flash"); }
      Chrome.track("coord_service_pick", { service: value });
    }));
  }

  /* --------------------------------------------------------------------- */
  /* Équipe — TEAM vide tant que Wisy Safety ne fournit pas de personnes    */
  /* réelles (voir js/coordination-data.js). Rien n'est inventé : l'état    */
  /* « équipe à venir » déjà présent dans le HTML reste affiché.            */
  /* --------------------------------------------------------------------- */
  function initTeam() {
    const empty = $("[data-team-empty]"), list = $("[data-team-list]");
    if (!empty || !list) return;
    const team = (window.WISY_COORDINATION && Array.isArray(window.WISY_COORDINATION.TEAM)) ? window.WISY_COORDINATION.TEAM : [];
    if (!team.length) return; // l'état vide déjà présent dans le HTML suffit

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    empty.hidden = true;
    list.hidden = false;
    list.innerHTML = "";
    team.forEach((p) => {
      if (!p || !p.name || !p.role) return; // ignore une entrée incomplète plutôt que d'afficher un trou
      const card = document.createElement("article");
      card.className = "co-team__card";
      const photo = (p.photo && p.photo.webp)
        ? `<img src="${esc(p.photo.webp)}" alt="${p.photo.alt ? esc(p.photo.alt) : ""}" width="240" height="240" loading="lazy">`
        : "";
      const quals = Array.isArray(p.qualifications) && p.qualifications.length
        ? `<ul class="co-team__quals">${p.qualifications.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "";
      card.innerHTML = `${photo}<h3>${esc(p.name)}</h3><p>${esc(p.role)}</p>${quals}`;
      list.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------- */
  /* Formulaire « Demander une coordination »                               */
  /* --------------------------------------------------------------------- */
  function initForm() {
    const form = $("#co-form");
    if (!form) return;
    const status = $("[data-co-form-status]", form);
    const submitBtn = $(".co-form__submit", form);

    const EMAILJS_PUBLIC_KEY = "k2JkXtD2RO8TkoO77";
    const EMAILJS_SERVICE_ID = "service_k348qw9";
    const EMAILJS_TEMPLATE_ID = "template_0p9dah6"; // même gabarit que contact.html / peb.js (champs user_name/user_email/user_phone/subject/message)
    let initialized = false;

    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text;
      status.hidden = false;
      status.setAttribute("data-state", state || "ok");
    }

    function fieldLabel(select, value) {
      if (!value) return "";
      const opt = Array.from(select.options).find((o) => o.value === value);
      return opt ? opt.textContent.trim() : value;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Piège à robots : rempli par un robot, jamais visible/atteignable par un humain → faux succès silencieux.
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) { form.reset(); setStatus(Chrome.tr("coord.form_sent", "Votre demande a bien été envoyée."), "ok"); return; }

      if (!form.checkValidity()) { form.reportValidity(); return; }

      const v = (name) => (form.querySelector(`[name="${name}"]`) || {}).value || "";
      const typeSelect = form.querySelector('[name="type_projet"]');
      const phaseSelect = form.querySelector('[name="phase_projet"]');
      const services = $$('input[name="services"]:checked', form).map((b) => (b.closest("label") || b).textContent.trim()).filter(Boolean);
      const messageParts = [
        "Demande de coordination sécurité-santé — WiSy Coordination",
        "Services souhaités : " + (services.join(", ") || "—"),
        "Société : " + (v("societe") || "—"),
        "Type de projet : " + (fieldLabel(typeSelect, v("type_projet")) || "—"),
        "Phase du projet : " + (fieldLabel(phaseSelect, v("phase_projet")) || "—"),
        "Localisation : " + (v("localisation") || "—"),
        "Date de démarrage souhaitée : " + (v("date_demarrage") || "—"),
        "",
        "Message :",
        v("message") || "—"
      ].join("\n");

      const params = {
        user_name: (v("prenom") + " " + v("nom")).trim(),
        user_email: v("email"),
        user_phone: v("telephone") || "Non renseigné",
        subject: "Coordination sécurité-santé",
        message: messageParts,
        time: new Date().toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })
      };

      // EmailJS est chargé en `defer` : on le lit au moment de l'envoi, jamais au démarrage.
      if (!window.emailjs) {
        setStatus(Chrome.tr("coord.form_fallback", "L'envoi automatique n'est pas disponible pour le moment : écrivez-nous directement à info@wisysafety.be."), "error");
        return;
      }

      submitBtn.disabled = true;
      try { if (!initialized) { window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); initialized = true; } }
      catch (e2) { /* déjà initialisé ailleurs sur la page : ignoré */ }

      window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
        .then(() => {
          form.reset();
          setStatus(Chrome.tr("coord.form_sent", "Votre demande a bien été envoyée. Notre équipe revient vers vous rapidement."), "ok");
          Chrome.track("coord_form_submit", { services: services.length });
        })
        .catch(() => {
          setStatus(Chrome.tr("coord.form_error", "L'envoi a échoué. Vous pouvez nous écrire directement à info@wisysafety.be."), "error");
        })
        .finally(() => { submitBtn.disabled = false; });
    });
  }

  /* --------------------------------------------------------------------- */
  /* Mesure d'audience : clics des appels à l'action marqués data-co-track  */
  /* --------------------------------------------------------------------- */
  function initTracking() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("[data-co-track]");
      if (a) Chrome.track("coord_cta_click", { from: a.getAttribute("data-co-track") });
    });
  }

  const boot = () => {
    initHero(); initRail(); initGhosts(); initSpotlight();
    initExplore(); initSimulator(); initServices(); initSteps();
    initServicePicks(); initTeam(); initForm(); initTracking();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
