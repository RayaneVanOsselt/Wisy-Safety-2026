/* =========================================================================
   WISY SAFETY — Pages juridiques : comportements communs
   mentions-legales.html · politique-de-confidentialite.html · conditions-generales-utilisation.html
   (anciennement js/mentions-legales.js)
   -------------------------------------------------------------------------
   Amélioration progressive : TOUT le texte juridique est déjà dans le HTML et reste lisible,
   imprimable et navigable (ancres) sans JavaScript. Chaque fonction ne s'active que si ses
   éléments existent sur la page :
     • initSuite()          sélecteur « Documents juridiques » : pastille qui suit le survol
     • initToc()            sommaire actif au scroll + indicateur glissant ; ≤ 980 px : barre compacte
                            collante « Sommaire · section courante » qui se déplie
     • initAnchors()        bouton « copier le lien » sur chaque titre de section + surlignage d'arrivée
     • initCopy()           boutons « Copier » (fiche d'identité)
     • initPrint()          bouton « Imprimer / Enregistrer en PDF » (ouvre tout avant impression)
     • initScrollFx()       barre de progression de lecture + dérive des chiffres/glyphes (rAF)
     • initReadTime()       temps de lecture estimé (≈ n min), recalculé si la langue change
     • initCountUp()        chiffres de la carte « L'essentiel » (compteur au premier affichage)
     • initTabs()           explorateur de traitements : onglets ARIA (flèches, Début/Fin)
     • initAccordions()     <details> animés (hauteur), ouverts avant impression
     • initConsentStatus()  état courant des choix cookies (événement wisy:consent)
     • initStorage()        inventaire du stockage local : présent / absent, effacement
     • initRightsBuilder()  « Préparer ma demande » : e-mail RGPD pré-rempli (mailto + copie)
   L'apparition .reveal/[data-stagger], l'en-tête et le menu mobile viennent de js/site-chrome.js.
   Mouvement réduit : aucune animation ni dérive (compteurs affichés directement).
   ========================================================================= */
(function () {
  "use strict";
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => (window.WisyI18N && window.WisyI18N.current && window.WisyI18N.current()) || "fr";
  const tr = (key, fallback) => {
    const v = window.WisyI18N && window.WisyI18N.get ? window.WisyI18N.get(lang(), key) : null;
    return v != null ? v : fallback;
  };
  const onLang = (fn) => document.addEventListener("i18n:changed", fn);

  /* Copie dans le presse-papiers (API moderne, repli execCommand). */
  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(value); return true; }
    } catch (e) { /* repli ci-dessous */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------------- sélecteur de documents */
  function initSuite() {
    const nav = $(".lg-suite");
    const pill = nav && $(".lg-suite__pill", nav);
    if (!nav || !pill) return;
    const links = $$("a", nav);
    const current = links.find((a) => a.getAttribute("aria-current") === "page") || links[0];
    function place(link) {
      const lr = link.getBoundingClientRect(), nr = nav.getBoundingClientRect();
      pill.style.width = lr.width + "px";
      pill.style.transform = "translateX(" + (lr.left - nr.left + nav.scrollLeft) + "px)";
      links.forEach((a) => a.classList.toggle("is-lit", a === link));
    }
    nav.classList.add("is-live");
    place(current);
    links.forEach((a) => {
      a.addEventListener("mouseenter", () => place(a));
      a.addEventListener("focus", () => place(a));
    });
    nav.addEventListener("mouseleave", () => place(current));
    nav.addEventListener("focusout", (e) => { if (!nav.contains(e.relatedTarget)) place(current); });
    window.addEventListener("resize", () => place(current));
    onLang(() => requestAnimationFrame(() => place(current)));
    /* Sur mobile, le document courant est visible dans la barre défilante. */
    if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, current.offsetLeft - 16);
  }

  /* ---------------------------------------------------------------- sommaire */
  function initToc() {
    const nav = $("[data-toc]");
    const links = $$("[data-toc-link]");
    const targets = $$("[data-toc-target]");
    const indicator = $("[data-toc-indicator]");
    const toggle = $("[data-toc-toggle]");
    const current = $("[data-toc-current]");
    if (!nav || !links.length || !targets.length) return;

    const compactMq = window.matchMedia("(max-width: 980px)");
    const linkFor = (id) => links.find((a) => a.getAttribute("href") === "#" + id);
    let activeId = targets[0].id;

    function moveIndicator(link) {
      if (!indicator || compactMq.matches) return;
      const lr = link.getBoundingClientRect(), pr = nav.getBoundingClientRect();
      indicator.style.cssText = "transform:translateY(" + (lr.top - pr.top + nav.scrollTop) + "px);height:" + lr.height + "px;width:" + lr.width + "px";
    }
    function setActive(id) {
      activeId = id;
      links.forEach((a) => { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
      const link = linkFor(id);
      if (!link) return;
      link.classList.add("is-active");
      link.setAttribute("aria-current", "location");
      moveIndicator(link);
      if (current) current.textContent = link.textContent.trim();
      /* Le lien actif reste visible dans un sommaire qui défile (desktop) */
      if (!compactMq.matches && nav.scrollHeight > nav.clientHeight) {
        const top = link.offsetTop, bottom = top + link.offsetHeight;
        if (top < nav.scrollTop || bottom > nav.scrollTop + nav.clientHeight) nav.scrollTop = top - nav.clientHeight / 3;
      }
    }

    /* Barre compacte (≤ 980 px) : bouton accessible, liste repliée par défaut */
    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
    }
    function applyMode() {
      const compact = compactMq.matches && !!toggle;
      nav.classList.toggle("is-compact", compact);
      if (toggle) toggle.hidden = !compact;
      if (!compact) setOpen(false);
      const link = linkFor(activeId);
      if (link) moveIndicator(link);
    }
    if (toggle) {
      toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
      nav.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
      });
      document.addEventListener("click", (e) => { if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false); });
      links.forEach((a) => a.addEventListener("click", () => { if (nav.classList.contains("is-compact")) setOpen(false); }));
    }
    if (compactMq.addEventListener) compactMq.addEventListener("change", applyMode);
    applyMode();
    setActive(activeId);
    window.addEventListener("resize", () => { const l = linkFor(activeId); if (l) moveIndicator(l); });
    onLang(() => { const l = linkFor(activeId); if (l && current) current.textContent = l.textContent.trim(); });

    /* Section active = la dernière dont le haut a franchi la « ligne de lecture » (sous l'en-tête collant,
       à un quart de la hauteur utile) ; tout en bas de page, la dernière section. Plus fiable qu'un
       IntersectionObserver quand deux sections courtes se partagent l'écran. */
    let ticking = false;
    function spy() {
      ticking = false;
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 120;
      const line = offset + (window.innerHeight - offset) * 0.25;
      const doc = document.documentElement;
      let id = targets[0].id;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) id = targets[targets.length - 1].id;
      else targets.forEach((t) => { if (t.getBoundingClientRect().top <= line) id = t.id; });
      if (id !== activeId || !links.some((a) => a.classList.contains("is-active"))) setActive(id);
    }
    const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    spy();
  }

  /* ---------------------------------------------------------------- liens d'ancre des sections */
  function initAnchors() {
    const sections = $$(".lg-sec[id]");
    if (!sections.length) return;
    sections.forEach((sec) => {
      const h2 = $("h2", sec);
      if (!h2 || $(".lg-anchor", h2)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lg-anchor no-print";
      btn.innerHTML = '<svg aria-hidden="true"><use href="#li-link"/></svg><span class="lg-copy__tip"></span>';
      const label = () => btn.setAttribute("aria-label", tr("lgl.anchor_copy", "Copier le lien vers cette section") + " — " + h2.textContent.trim());
      label();
      onLang(label);
      btn.addEventListener("click", async () => {
        const url = location.href.split("#")[0] + "#" + sec.id;
        if (!(await copyText(url))) return;
        $(".lg-copy__tip", btn).textContent = tr("lgl.anchor_done", "Lien copié");
        btn.classList.add("is-done");
        clearTimeout(btn._t);
        btn._t = setTimeout(() => btn.classList.remove("is-done"), 1800);
      });
      /* Le bouton est posé À CÔTÉ du titre, dans un conteneur : js/i18n.js réécrit le texte des nœuds
         [data-i18n] (textContent), un bouton placé DANS le h2 serait effacé au changement de langue. */
      const wrap = document.createElement("div");
      wrap.className = "lg-h2wrap";
      h2.parentNode.insertBefore(wrap, h2);
      wrap.appendChild(h2);
      wrap.appendChild(btn);
    });

    /* Arrivée sur une section (sommaire, lien partagé) : soulignement bref du titre */
    function land(id) {
      const sec = id && document.getElementById(id);
      if (!sec || !sec.classList.contains("lg-sec")) return;
      sec.classList.remove("is-landed");
      void sec.offsetWidth;
      sec.classList.add("is-landed");
      clearTimeout(sec._landT);
      sec._landT = setTimeout(() => sec.classList.remove("is-landed"), 2400);
    }
    window.addEventListener("hashchange", () => land(location.hash.slice(1)));
    if (location.hash) land(location.hash.slice(1));
  }

  /* ---------------------------------------------------------------- copier (fiche d'identité) */
  function initCopy() {
    const buttons = $$("[data-copy-btn]");
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      const field = btn.previousElementSibling;
      const value = field && (field.getAttribute("data-copy") || field.textContent.trim());
      if (!value) return;
      const tip = document.createElement("span");
      tip.className = "lg-copy__tip";
      const setTip = () => { tip.textContent = tr("lgl.copy_done", tr("legal.copy_done", "Copié !")); };
      setTip();
      onLang(setTip);
      btn.appendChild(tip);
      btn.addEventListener("click", async () => {
        if (!(await copyText(value))) return;
        btn.classList.add("is-done");
        clearTimeout(btn._doneTimer);
        btn._doneTimer = setTimeout(() => btn.classList.remove("is-done"), 1800);
      });
    });
  }

  /* ---------------------------------------------------------------- impression */
  function openAllForPrint() {
    $$("details.lg-acc").forEach((d) => { if (!d.open) { d.open = true; d.setAttribute("data-print-opened", ""); } });
  }
  function restoreAfterPrint() {
    $$("details[data-print-opened]").forEach((d) => { d.open = false; d.removeAttribute("data-print-opened"); });
  }
  function initPrint() {
    window.addEventListener("beforeprint", openAllForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);
    const btn = $("[data-print-btn]");
    if (btn) btn.addEventListener("click", () => window.print());
  }

  /* ---------------------------------------------------------------- progression + dérive */
  function initScrollFx() {
    const bar = $("[data-progress-bar]");
    const ghosts = $$(".lg-sec__ghost");
    const heroGhost = $(".lg-hero__ghost") || $(".lg-hero__glyph");
    if (!bar && !ghosts.length && !heroGhost) return;
    const motion = !reducedMotion();
    let ticking = false;

    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.max(0, Math.min(1, doc.scrollTop / max)) : 0;
      if (bar) bar.style.transform = "scaleX(" + pct + ")";
      if (!motion) return;
      if (heroGhost) {
        const r = heroGhost.parentElement.getBoundingClientRect();
        heroGhost.style.transform = "translateY(" + Math.round(r.top * -0.08) + "px)";
      }
      const vh = window.innerHeight;
      ghosts.forEach((g) => {
        const r = g.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        g.style.transform = "translateY(" + Math.round((r.top + r.height / 2 - vh / 2) * -0.06) + "px)";
      });
    }
    update();
    const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }

  /* ---------------------------------------------------------------- temps de lecture */
  function initReadTime() {
    const item = $("[data-readtime]");
    const out = $("[data-readtime-value]");
    const body = $(".lg-sections");
    if (!item || !out || !body) return;
    function render() {
      const words = (body.textContent.match(/[\p{L}\p{N}]+/gu) || []).length;
      const n = Math.max(1, Math.round(words / 220));
      out.textContent = tr("lgl.read_time", "≈ {n} min").replace("{n}", String(n));
      item.hidden = false;
    }
    render();
    onLang(() => requestAnimationFrame(render));
  }

  /* ---------------------------------------------------------------- compteurs */
  function initCountUp() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const animate = (el) => {
      const target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (!target || reducedMotion()) { el.textContent = String(target); return; }
      const t0 = performance.now(), dur = 1100;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---------------------------------------------------------------- onglets (explorateur) */
  function initTabs() {
    $$("[data-tabs]").forEach((root, r) => {
      const list = $("[data-tablist]", root);
      const tabs = list ? $$("[data-tab]", list) : [];
      if (!tabs.length) return;
      const panels = tabs.map((t) => document.getElementById(t.getAttribute("data-tab")));
      if (panels.some((p) => !p)) return;

      list.setAttribute("role", "tablist");
      list.setAttribute("aria-orientation", "vertical");
      list.hidden = false;
      root.classList.add("is-tabs");
      tabs.forEach((tab, i) => {
        tab.id = tab.id || "lg-tab-" + r + "-" + i;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panels[i].id);
        panels[i].setAttribute("role", "tabpanel");
        panels[i].setAttribute("aria-labelledby", tab.id);
        panels[i].setAttribute("tabindex", "0");
      });
      const orient = () => list.setAttribute("aria-orientation", window.matchMedia("(max-width: 1180px)").matches ? "horizontal" : "vertical");
      orient();
      window.addEventListener("resize", orient);

      function select(i, focus) {
        tabs.forEach((t, j) => {
          const on = j === i;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          panels[j].hidden = !on;
        });
        if (focus) tabs[i].focus();
        /* L'onglet choisi reste visible dans la barre défilante (tablette / mobile) */
        if (list.scrollWidth > list.clientWidth) {
          const t = tabs[i];
          if (t.offsetLeft < list.scrollLeft || t.offsetLeft + t.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = t.offsetLeft - 16;
        }
      }
      tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => select(i, false));
        tab.addEventListener("keydown", (e) => {
          const n = tabs.length;
          let k = null;
          if (e.key === "ArrowDown" || e.key === "ArrowRight") k = (i + 1) % n;
          else if (e.key === "ArrowUp" || e.key === "ArrowLeft") k = (i - 1 + n) % n;
          else if (e.key === "Home") k = 0;
          else if (e.key === "End") k = n - 1;
          if (document.documentElement.dir === "rtl" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) k = e.key === "ArrowRight" ? (i - 1 + n) % n : (i + 1) % n;
          if (k === null) return;
          e.preventDefault();
          select(k, true);
        });
      });
      /* Lien profond vers une fiche (#pp-p-avis) : ouvre directement le bon onglet */
      const fromHash = () => {
        const idx = panels.findIndex((p) => "#" + p.id === location.hash);
        if (idx >= 0) select(idx, false);
      };
      select(0, false);
      fromHash();
      window.addEventListener("hashchange", fromHash);
    });
  }

  /* ---------------------------------------------------------------- accordéons animés */
  function initAccordions() {
    $$("details.lg-acc").forEach((d) => {
      const summary = $("summary", d);
      const body = $(".lg-acc__body", d);
      if (!summary || !body) return;
      let anim = null;
      summary.addEventListener("click", (e) => {
        if (reducedMotion() || !body.animate) return; // comportement natif
        e.preventDefault();
        if (anim) anim.cancel();
        if (!d.open) {
          d.open = true;
          const h = body.scrollHeight;
          anim = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" });
          anim.onfinish = () => { anim = null; };
        } else {
          const h = body.offsetHeight;
          anim = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.4,0,.2,1)" });
          anim.onfinish = () => { d.open = false; anim = null; };
        }
      });
    });
  }

  /* ---------------------------------------------------------------- choix cookies en direct */
  function initConsentStatus() {
    const badges = $$("[data-consent-cat]");
    if (!badges.length) return;
    function render(choices) {
      const c = choices || (window.WisyConsent && window.WisyConsent.getConsent && window.WisyConsent.getConsent());
      /* « Non choisi » tant qu'aucun choix valide (version de consentement courante) n'est enregistré */
      let decided = !!choices;
      if (!decided) {
        try {
          const rec = JSON.parse(localStorage.getItem("wisy-consent") || "null");
          decided = !!(rec && window.WisyConsent && rec.v === window.WisyConsent.CONSENT_VERSION);
        } catch (e) { decided = false; }
      }
      badges.forEach((b) => {
        const cat = b.getAttribute("data-consent-cat");
        let key = "pp.consent_unknown", fb = "Non choisi", cls = "";
        if (c && decided) {
          if (c[cat]) { key = "pp.consent_on"; fb = "Accepté"; cls = "is-on"; }
          else { key = "pp.consent_off"; fb = "Refusé"; cls = "is-off"; }
        }
        b.setAttribute("data-i18n", key);
        b.textContent = tr(key, fb);
        b.classList.remove("is-on", "is-off");
        if (cls) b.classList.add(cls);
      });
    }
    render();
    document.addEventListener("wisy:consent", (e) => render(e.detail));
    document.addEventListener("wisy:storage-cleared", () => render());
    onLang(() => render());
  }

  /* ---------------------------------------------------------------- stockage local en direct */
  function initStorage() {
    const table = $("[data-storage-table]");
    if (!table) return;
    const rows = $$("tr[data-storage-key]", table);
    const actions = $("[data-storage-actions]");
    const live = $("[data-storage-live]");
    const clearAll = $("[data-storage-clear-all]");
    const clearLabel = $("[data-storage-clear-label]");
    const area = (name) => { try { return name === "session" ? window.sessionStorage : window.localStorage; } catch (e) { return null; } };
    const has = (row) => { const s = area(row.getAttribute("data-storage-area")); try { return !!(s && s.getItem(row.getAttribute("data-storage-key")) !== null); } catch (e) { return false; } };
    const icon = '<svg aria-hidden="true"><use href="#li-trash"/></svg>';

    function renderRow(row, flash) {
      const cell = $("[data-storage-cell]", row);
      if (!cell) return;
      const present = has(row);
      const name = row.getAttribute("data-storage-key");
      cell.innerHTML = "";
      const wrap = document.createElement("span");
      wrap.className = "lg-dev" + (flash ? " is-flash" : "");
      const badge = document.createElement("span");
      badge.className = "lg-badge " + (present ? "is-on" : "is-off");
      badge.setAttribute("data-i18n", present ? "pp.dev_present" : "pp.dev_absent");
      badge.textContent = present ? tr("pp.dev_present", "Présent") : tr("pp.dev_absent", "Absent");
      wrap.appendChild(badge);
      if (present) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "lg-dev__del";
        del.innerHTML = icon + '<span data-i18n="pp.dev_delete"></span>';
        $("span", del).textContent = tr("pp.dev_delete", "Effacer");
        del.setAttribute("aria-label", tr("pp.dev_delete_aria", "Effacer de cet appareil :") + " " + name);
        del.addEventListener("click", () => {
          const s = area(row.getAttribute("data-storage-area"));
          try { if (s) s.removeItem(name); } catch (e) { /* silencieux */ }
          renderRow(row, true);
          announce(tr("pp.dev_deleted", "Effacé de cet appareil :") + " " + name);
          const next = $("button, a", row.nextElementSibling || table) || clearAll;
          if (next && next.focus) next.focus();
        });
        wrap.appendChild(del);
      }
      cell.appendChild(wrap);
    }
    function renderAll(flash) { rows.forEach((r) => renderRow(r, flash)); }
    function announce(msg) { if (live) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); } }

    renderAll(false);
    if (actions) actions.hidden = false;
    /* Effacer tout : deux clics (le brouillon d'inscription peut contenir des données saisies) */
    let armed = false, armT = null;
    function disarm() {
      armed = false;
      if (clearAll) clearAll.classList.remove("is-armed");
      if (clearLabel) { clearLabel.setAttribute("data-i18n", "pp.clear_all"); clearLabel.textContent = tr("pp.clear_all", "Effacer toutes les données de ce site sur cet appareil"); }
    }
    if (clearAll) clearAll.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        clearAll.classList.add("is-armed");
        if (clearLabel) { clearLabel.setAttribute("data-i18n", "pp.clear_confirm"); clearLabel.textContent = tr("pp.clear_confirm", "Confirmer l'effacement"); }
        clearTimeout(armT);
        armT = setTimeout(disarm, 5000);
        return;
      }
      clearTimeout(armT);
      rows.forEach((row) => {
        const s = area(row.getAttribute("data-storage-area"));
        try { if (s) s.removeItem(row.getAttribute("data-storage-key")); } catch (e) { /* silencieux */ }
      });
      disarm();
      renderAll(true);
      document.dispatchEvent(new CustomEvent("wisy:storage-cleared"));
      announce(tr("pp.clear_done", "Données du site effacées de cet appareil. Votre choix de cookies vous sera redemandé au prochain chargement."));
    });
    /* Un choix cookies fait sur cette page crée « wisy-consent » : la ligne se met à jour */
    document.addEventListener("wisy:consent", () => renderAll(false));
    window.addEventListener("storage", () => renderAll(false));
    onLang(() => { renderAll(false); if (!armed) disarm(); });
  }

  /* ---------------------------------------------------------------- préparer ma demande (RGPD) */
  function initRightsBuilder() {
    const root = $("[data-rights-builder]");
    if (!root) return;
    const boxes = $$('input[type="checkbox"]', root);
    const out = $("[data-builder-out]", root);
    const empty = $("[data-builder-empty]", root);
    const preview = $("[data-builder-preview]", root);
    const send = $("[data-builder-send]", root);
    const copyBtn = $("[data-builder-copy]", root);
    const copyLabel = $("[data-builder-copy-label]", root);
    const status = $("[data-builder-status]", root);
    const TO = "info@wisysafety.be";

    function compose() {
      const chosen = boxes.filter((b) => b.checked).map((b) => b.closest("label").textContent.trim());
      const subject = tr("pp.mail_subject", "Exercice de mes droits RGPD") + (chosen.length ? " — " + chosen.join(", ") : "");
      const body = tr("pp.mail_body", "Bonjour,|Conformément au RGPD, je souhaite exercer le(s) droit(s) suivant(s) : {rights}.|Nom et prénom :|Adresse e-mail utilisée sur le site :|Précisions utiles :|Cordialement,")
        .replace("{rights}", chosen.join(", ")).split("|");
      const text = [body[0], "", body[1], "", body[2], body[3], body[4], "", body[5]].filter((l) => l !== undefined).join("\n");
      return { chosen, subject, text };
    }
    function render() {
      const m = compose();
      const any = m.chosen.length > 0;
      out.hidden = !any;
      if (empty) empty.hidden = any;
      if (!any) return;
      preview.textContent = (tr("pp.mail_to", "À :") + " " + TO + "\n" + tr("pp.mail_subject_label", "Objet :") + " " + m.subject + "\n\n" + m.text);
      send.setAttribute("href", "mailto:" + TO + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.text));
      if (status) status.textContent = "";
    }
    boxes.forEach((b) => b.addEventListener("change", render));
    if (copyBtn) copyBtn.addEventListener("click", async () => {
      const m = compose();
      const ok = await copyText(tr("pp.mail_subject_label", "Objet :") + " " + m.subject + "\n\n" + m.text);
      if (status) status.textContent = ok ? tr("pp.b_copied", "Message copié : collez-le dans un e-mail adressé à info@wisysafety.be.") : "";
      if (ok && copyLabel) {
        copyLabel.textContent = tr("lgl.copy_done", "Copié !");
        clearTimeout(copyBtn._t);
        copyBtn._t = setTimeout(() => { copyLabel.textContent = tr("pp.b_copy", "Copier le message"); }, 1800);
      }
    });
    render();
    onLang(render);
  }

  function boot() {
    initSuite(); initToc(); initAnchors(); initCopy(); initPrint(); initScrollFx();
    initReadTime(); initCountUp(); initTabs(); initAccordions(); initConsentStatus(); initStorage(); initRightsBuilder();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
