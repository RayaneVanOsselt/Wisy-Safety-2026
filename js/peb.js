/* =========================================================================
   WISY SAFETY — Page « Certificateur PEB — Wallonie & Bruxelles »
   -------------------------------------------------------------------------
   Fonctions séparées, sans dépendance (même structure que js/formation-beps.js) :
     initHeader() / initFooterStatus() / initScrollReveal() / initMaskReveal() /
     initSmoothScroll() / initTilt() / initMagnetic()   — identiques aux autres pages
     initAccordions()        programme + FAQ (aria-expanded / aria-controls, clavier)
     initFaqSchema()          FAQPage injecté depuis les Q/R réellement affichées
     initRegionSwitch()       bascule Wallonie ⇄ Bruxelles (tous les sélecteurs +
                              tous les blocs [data-region-panel]), sans rechargement
     initEligibilityQuiz()    « Vérifier mon éligibilité » (4 étapes + résultat
                              indicatif, jamais une décision administrative)
     initSessionFilter()      filtre [ Toutes / Bruxelles / Wallonie ] des sessions
     initStickyBar()          barre CTA discrète (desktop) + barre mobile compacte
     track()                  wisy:analytics (même convention que l'assistant :
                              CustomEvent non consommé ailleurs, aucune plateforme ajoutée)
   Motion : toujours transform/opacity, jamais de layout thrashing ; neutralisé par
   prefers-reduced-motion. Le contenu des deux Régions est TOUJOURS présent dans le
   HTML (SEO, lecteurs d'écran, pas de JS) : le changement de Région n'affiche/masque
   que des blocs déjà rendus (`hidden`), jamais de contenu injecté dynamiquement.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const currentLang = () => (window.WisyI18N && window.WisyI18N.current()) || "fr";
  /* Textes lus dans le dictionnaire de la page (js/i18n-data-peb.js) ; le français reste le repli. */
  const trIn = (lang, key, fallback) => {
    const v = window.WisyI18N ? window.WisyI18N.get(lang, key) : null;
    return v != null ? v : fallback;
  };
  const tr = (key, fallback) => trIn(currentLang(), key, fallback);
  /* Variables des phrases traduites : « {region} », « {years} », « {n} » */
  const fmt = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

  /* Même compte / gabarit EmailJS que contact.html (champs user_name/user_email/user_phone/
     subject/message/time ; « Certification PEB » = option déjà proposée par ce gabarit). Valeurs
     PUBLIQUES par conception (protégées côté EmailJS par la configuration du service) : reprises
     ici telles quelles, comme le fait déjà contact.html — pas de secret exposé. */
  const EMAILJS_PUBLIC_KEY = "k2JkXtD2RO8TkoO77";
  const EMAILJS_SERVICE_ID = "service_k348qw9";
  const EMAILJS_TEMPLATE_ID = "template_0p9dah6";

  /* Analytics : même convention que l'assistant (wisy:analytics, voir js/assistant/assistant.js) —
     aucune plateforme n'est ajoutée ici, l'évènement existe pour un futur consommateur. */
  function track(name, detail) {
    try { document.dispatchEvent(new CustomEvent("wisy:analytics", { detail: Object.assign({ event: name }, detail || {}) })); }
    catch (e) { /* silencieux */ }
  }

  /* =======================================================================
     HEADER / FOOTER / REVEAL / ANCRES — identiques aux autres pages du site
     ======================================================================= */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const util = $(".util-bar", header);
    const setOffset = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight - (util ? util.offsetHeight : 0) + 16}px`);
    setOffset();
    window.addEventListener("resize", setOffset);
    if ("ResizeObserver" in window) new ResizeObserver(setOffset).observe(header);

    const wrap = $(".has-dropdown");
    if (wrap) {
      const trigger = $(".nav-link", wrap);
      let timer = null;
      const open = () => { clearTimeout(timer); wrap.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); };
      const close = () => { wrap.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
      wrap.addEventListener("mouseenter", open);
      wrap.addEventListener("mouseleave", () => { clearTimeout(timer); timer = setTimeout(close, 250); });
      wrap.addEventListener("mousemove", () => { if (wrap.classList.contains("is-open")) clearTimeout(timer); });
      trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); trigger.focus(); } });
      wrap.addEventListener("focusout", (e) => { if (!wrap.contains(e.relatedTarget)) close(); });
      document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
    }

    const toggle = $(".nav-toggle"), panel = $(".m-panel"), scrim = $(".m-scrim"), closeBtn = $(".m-close");
    if (toggle && panel && scrim) {
      const openMenu = () => { panel.classList.add("is-open"); scrim.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
      const closeMenu = () => { panel.classList.remove("is-open"); scrim.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; toggle.focus(); };
      toggle.addEventListener("click", openMenu);
      if (closeBtn) closeBtn.addEventListener("click", closeMenu);
      scrim.addEventListener("click", closeMenu);
      window.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) closeMenu(); });
      $$(".m-acc__trigger").forEach((btn) => {
        const list = btn.nextElementSibling;
        btn.addEventListener("click", () => {
          const isOpen = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", String(!isOpen));
          list.classList.toggle("is-open", !isOpen);
        });
      });
    }
  }

  function initFooterStatus() {
    const SCHEDULE = { 1: [600, 960], 2: [600, 960], 3: [600, 960], 4: [600, 960], 5: null, 6: null, 0: null };
    const today = $(`.f-hours li[data-day="${new Date().getDay()}"]`);
    if (today) today.classList.add("is-today");

    const refresh = () => {
      const badge = $(".status-badge");
      if (!badge) return;
      const now = new Date(), range = SCHEDULE[now.getDay()], minutes = now.getHours() * 60 + now.getMinutes();
      const open = !!range && minutes >= range[0] && minutes < range[1];
      badge.classList.toggle("is-open", open);
      $(".status-text", badge).textContent = open
        ? tr("footer.status_open", "ACTUELLEMENT OUVERT")
        : tr("footer.status_closed", "ACTUELLEMENT FERMÉ");
    };
    refresh();
    document.addEventListener("i18n:changed", refresh);

    const year = $("[data-year]");
    if (year) year.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  function initScrollReveal() {
    $$("[data-stagger]").forEach((group) => {
      $$(".reveal", group).forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 7) * 0.07}s`));
    });
    const targets = $$(".reveal");
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => io.observe(el));
  }

  function initMaskReveal() {
    const targets = $$("[data-mask]");
    if (!targets.length) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    targets.forEach((el) => io.observe(el));
  }

  function initSmoothScroll() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = decodeURIComponent(link.getAttribute("href").slice(1));
      const target = id && document.getElementById(id);
      if (!target || target.hidden) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      try { history.pushState(null, "", `#${id}`); } catch (err) { /* file:// : on ignore */ }
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  }

  function initTilt() {
    if (!canHover() || prefersReducedMotion()) return;
    $$(".peb-tilt").forEach((card) => {
      const MAX = 5;
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tiltx", `${(px * MAX * 2).toFixed(2)}deg`);
        card.style.setProperty("--tilty", `${(-py * MAX * 2).toFixed(2)}deg`);
      };
      const reset = () => { card.style.removeProperty("--tiltx"); card.style.removeProperty("--tilty"); };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
    });
  }

  function initMagnetic() {
    if (!canHover() || prefersReducedMotion()) return;
    $$(".peb-magnetic").forEach((btn) => {
      const MAX = 7;
      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        btn.style.transform = `translate(${(px * MAX).toFixed(1)}px, ${(py * MAX).toFixed(1)}px)`;
      };
      const reset = () => { btn.style.transform = ""; };
      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", reset);
    });
  }

  /* =======================================================================
     ACCORDÉONS — programme & FAQ (aria-expanded / aria-controls, panneaux
     `inert` tant que fermés, flèches ↑ ↓ Début Fin).
     ======================================================================= */
  function initAccordions() {
    $$("[data-accordion]").forEach((acc) => {
      const items = $$(".peb-acc__item", acc);
      const setOpen = (item, open) => {
        item.classList.toggle("is-open", open);
        $(".peb-acc__btn", item).setAttribute("aria-expanded", String(open));
        $(".peb-acc__panel", item).inert = !open;
      };
      items.forEach((item) => setOpen(item, item.classList.contains("is-open")));
      acc.classList.add("is-ready");

      acc.addEventListener("click", (e) => {
        const btn = e.target.closest(".peb-acc__btn");
        if (!btn || !acc.contains(btn)) return;
        const item = btn.closest(".peb-acc__item");
        const opening = !item.classList.contains("is-open");
        setOpen(item, opening);
        if (opening && acc.classList.contains("peb-acc--faq")) {
          track("peb_faq_open", { question: ($(".peb-acc__t", item) || {}).textContent || "" });
        }
      });

      acc.addEventListener("keydown", (e) => {
        const buttons = items.map((it) => $(".peb-acc__btn", it));
        const i = buttons.indexOf(document.activeElement);
        if (i < 0) return;
        const to = { ArrowDown: (i + 1) % buttons.length, ArrowUp: (i - 1 + buttons.length) % buttons.length, Home: 0, End: buttons.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        buttons[to].focus();
      });
    });
  }

  /* FAQPage — données structurées injectées à l'exécution, depuis les Q/R réellement
     affichées dans l'accordéon (jamais dupliquées à la main dans le <head>). Quand une
     question a deux réponses régionales visibles, les deux sont concaténées (texte
     réellement lu par le visiteur, avec la Région en préfixe). Reconstruites à chaque
     changement de langue : le JSON-LD suit le texte affiché. */
  function initFaqSchema() {
    let node = null;
    const build = () => {
      const items = $$(".peb-acc--faq .peb-acc__item").map((item) => {
        const q = ($(".peb-acc__t", item) || {}).textContent || "";
        const paras = $$(".peb-acc__inner p", item).map((p) => {
          const text = p.textContent.trim();
          const tag = $(".peb-acc__region-tag", p);
          return tag ? tag.textContent.trim() + " : " + text.slice(tag.textContent.trim().length).trim() : text;
        }).filter(Boolean);
        return { q: q.trim(), a: paras.join(" ") };
      }).filter((it) => it.q && it.a);
      if (!items.length) return;
      try {
        if (!node) {
          node = document.createElement("script");
          node.type = "application/ld+json";
          document.head.appendChild(node);
        }
        node.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: currentLang(),
          mainEntity: items.map((it) => ({
            "@type": "Question", name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a }
          }))
        });
      } catch (e) { /* silencieux */ }
    };
    build();
    document.addEventListener("i18n:changed", build);
  }

  /* =======================================================================
     SÉLECTEUR DE RÉGION — bascule Wallonie ⇄ Bruxelles.
     Contrat HTML :
       - tout groupe de boutons : [data-region-switch] > [data-region-btn="wallonia|brussels"]
       - tout bloc dont le contenu dépend de la Région : [data-region-panel="wallonia|brussels"]
       - fil d'ariane / étiquette région à mettre à jour : [data-region-label]
     Les DEUX contenus régionaux sont déjà dans le HTML (SEO, no-JS) : on ne fait que
     masquer/révéler (`hidden`), jamais d'injection ni de fetch. Choix persistant
     (sessionStorage) ; aucun saut de mise en page (transition opacity courte).
     ======================================================================= */
  const REGION_KEY = "wisy-peb-region";
  function initRegionSwitch() {
    const switches = $$("[data-region-switch]");
    const panels = $$("[data-region-panel]");
    const labels = $$("[data-region-label]");
    const authorities = $$("[data-region-authority]");
    if (!switches.length && !panels.length) return;

    function readInitial() {
      const fromHash = (location.hash || "").replace("#", "");
      if (fromHash === "bruxelles" || fromHash === "brussels") return "brussels";
      if (fromHash === "wallonie" || fromHash === "wallonia") return "wallonia";
      try {
        const saved = sessionStorage.getItem(REGION_KEY);
        if (saved === "wallonia" || saved === "brussels") return saved;
      } catch (e) { /* stockage indisponible : repli */ }
      return "brussels"; /* Wisy Safety est basé à Anderlecht (Bruxelles) */
    }

    let current = readInitial();

    function apply(region, opts) {
      const silent = opts && opts.silent;
      current = region;
      panels.forEach((p) => { p.hidden = p.getAttribute("data-region-panel") !== region; });
      switches.forEach((group) => {
        $$("[data-region-btn]", group).forEach((btn) => {
          const active = btn.getAttribute("data-region-btn") === region;
          btn.setAttribute("aria-pressed", String(active));
        });
      });
      labels.forEach((el) => { el.textContent = region === "brussels" ? tr("peb.region_brussels", "Bruxelles") : tr("peb.region_wallonia", "Wallonie"); });
      /* Autorité compétente de la Région : noms propres, identiques dans toutes les langues */
      authorities.forEach((el) => { el.textContent = region === "brussels" ? "Bruxelles Environnement" : "SPW Énergie"; });
      document.documentElement.setAttribute("data-peb-region", region);
      try { sessionStorage.setItem(REGION_KEY, region); } catch (e) { /* silencieux */ }
      if (!silent) track("peb_region_selected", { region });
    }

    switches.forEach((group) => {
      $$("[data-region-btn]", group).forEach((btn) => {
        btn.addEventListener("click", () => {
          const region = btn.getAttribute("data-region-btn");
          if (region === current) return;
          apply(region);
        });
      });
    });

    apply(current, { silent: true });
    document.addEventListener("i18n:changed", () => apply(current, { silent: true }));
  }

  /* =======================================================================
     FILTRE DES SESSIONS — [ Toutes / Bruxelles / Wallonie ].
     Contrat HTML : conteneur [data-session-filter] > boutons [data-filter-btn],
     cartes [data-session-card][data-region], état vide [data-session-empty].
     ======================================================================= */
  function initSessionFilter() {
    const root = $("[data-session-filter]");
    if (!root) return;
    const buttons = $$("[data-filter-btn]", root);
    const cards = $$("[data-session-card]");
    const empty = $("[data-session-empty]");
    let viewed = false;

    function apply(filter) {
      let visible = 0;
      cards.forEach((card) => {
        const show = filter === "all" || card.getAttribute("data-region") === filter;
        card.hidden = !show;
        if (show) visible++;
      });
      if (empty) empty.hidden = visible > 0;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-filter-btn") === filter)));
    }
    buttons.forEach((b) => b.addEventListener("click", () => apply(b.getAttribute("data-filter-btn"))));
    apply("all");

    const section = $("#sessions");
    if (section && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewed) { viewed = true; track("peb_session_viewed", {}); io.disconnect(); }
        });
      }, { threshold: 0.3 });
      io.observe(section);
    }
  }

  /* =======================================================================
     BARRE CTA COLLANTE — compacte, mobile uniquement (bas d'écran, voir
     .peb-mobile-bar dans le HTML). Pas de version desktop (retirée à la
     demande). Lève le launcher assistant au-dessus d'elle sur mobile
     (body.peb-bar-active, voir css/peb.css).
     ======================================================================= */
  function initStickyBar() {
    const bar = $(".peb-mobile-bar");
    if (!bar) return;
    document.body.classList.add("peb-bar-active");
    $$("a", bar).forEach((a) => a.addEventListener("click", () => track("peb_session_signup_click", { from: "mobile-bar" })));
  }

  /* =======================================================================
     ÉLIGIBILITÉ — mini-parcours 4 étapes + résultat INDICATIF (jamais une
     décision administrative — le texte de mise en garde reste toujours visible
     à l'étape résultat). Contrat HTML : voir data-quiz-* dans la page.
     Envoi final : réutilise le compte EmailJS déjà configuré pour contact.html
     (mêmes champs user_name/user_email/user_phone/subject/message/time).
     ======================================================================= */
  function initEligibilityQuiz() {
    const root = $("[data-quiz]");
    if (!root) return;
    const steps = $$("[data-quiz-step]", root);
    const dots = $$("[data-quiz-dot]", root);
    const form = $("form", root);
    let started = false;
    const state = { region: null, profile: null, years: "" };

    function stepIndex(name) { return steps.findIndex((s) => s.getAttribute("data-quiz-step") === name); }
    function goTo(name) {
      const idx = stepIndex(name);
      if (idx < 0) return;
      steps.forEach((s, i) => { s.hidden = i !== idx; });
      dots.forEach((d, i) => d.classList.toggle("is-active", i <= idx && name !== "result"));
      const focusable = steps[idx].querySelector("input, button, select, textarea");
      if (focusable) focusable.focus({ preventScroll: true });
      steps[idx].scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      if (!started) { started = true; track("peb_eligibility_started", {}); }
    }

    root.addEventListener("click", (e) => {
      const next = e.target.closest("[data-quiz-next]");
      const back = e.target.closest("[data-quiz-back]");
      if (next) {
        const stepEl = next.closest("[data-quiz-step]");
        const name = stepEl.getAttribute("data-quiz-step");
        if (name === "1") {
          const picked = $('input[name="quiz-region"]:checked', stepEl);
          if (!picked) { stepEl.classList.add("peb-quiz__step--shake"); return; }
          state.region = picked.value;
          goTo("2");
        } else if (name === "2") {
          const picked = $('input[name="quiz-profile"]:checked', stepEl);
          if (!picked) { stepEl.classList.add("peb-quiz__step--shake"); return; }
          state.profile = picked.value;
          goTo(state.profile === "experience" ? "3" : "4");
        } else if (name === "3") {
          const years = $('input[name="quiz-years"]', stepEl);
          state.years = years ? years.value : "";
          goTo("4");
        }
      }
      if (back) {
        const stepEl = back.closest("[data-quiz-step]");
        const name = stepEl.getAttribute("data-quiz-step");
        if (name === "2") goTo("1");
        else if (name === "3") goTo("2");
        else if (name === "4") goTo(state.profile === "experience" ? "3" : "2");
      }
    });

    root.addEventListener("change", (e) => {
      if (e.target.closest(".peb-quiz__step--shake")) e.target.closest("[data-quiz-step]").classList.remove("peb-quiz__step--shake");
    });

    /* Résultat indicatif : affiché dans la langue choisie, mais TRANSMIS en français à l'équipe
       (indicativeResult("fr")). Le nombre d'années s'accorde selon la langue (Intl.PluralRules). */
    const NUMBER_LOCALES = { fr: "fr-BE", en: "en-GB", nl: "nl-BE", af: "af-ZA", ar: "ar-u-nu-latn", bg: "bg-BG", de: "de-DE", ro: "ro-RO", it: "it-IT", sl: "sl-SI" };
    function yearsText(n, lang) {
      let category = "other";
      try { category = new Intl.PluralRules(lang).select(n); } catch (e) { /* repli : forme « autres » */ }
      const tpl = (category !== "other" && trIn(lang, "peb.years_" + category, null)) || trIn(lang, "peb.years", "{n} ans");
      let shown = String(n);
      try { shown = new Intl.NumberFormat(NUMBER_LOCALES[lang] || lang).format(n); } catch (e) { /* repli : nombre brut */ }
      return fmt(tpl, { n: shown });
    }
    function regionIn(lang) {
      return state.region === "brussels"
        ? trIn(lang, "peb.region_in_brussels", "en Région bruxelloise")
        : trIn(lang, "peb.region_in_wallonia", "en Région wallonne");
    }
    function indicativeResult(lang) {
      const diplomaProfiles = ["architecte", "ingenieur-architecte", "ingenieur-civil", "bio-ingenieur", "ingenieur-industriel", "gradue-construction", "autre-diplome-energie"];
      if (diplomaProfiles.indexOf(state.profile) !== -1) {
        return fmt(trIn(lang, "peb.quiz_result_diploma", "Sur la base du diplôme indiqué, la condition de diplôme applicable {region} semble a priori remplie."), { region: regionIn(lang) });
      }
      if (state.profile === "experience") {
        const years = parseFloat(state.years);
        if (Number.isFinite(years) && years >= 2) {
          return fmt(trIn(lang, "peb.quiz_result_exp_ok", "Avec {years} d'expérience liée aux aspects énergétiques des bâtiments, la condition d'expérience semble a priori remplie {region}."), { years: yearsText(years, lang), region: regionIn(lang) });
        }
        return trIn(lang, "peb.quiz_result_exp_low", "L'expérience indiquée est inférieure au seuil habituellement demandé (2 ans concernant les aspects énergétiques des bâtiments). Contactez-nous pour un avis personnalisé.");
      }
      return trIn(lang, "peb.quiz_result_other", "Votre profil nécessite une vérification personnalisée : contactez-nous pour faire le point.");
    }
    /* Libellé de Région pour le courriel envoyé à l'équipe (toujours en français) */
    function regionLabelFr() { return state.region === "brussels" ? "Région bruxelloise" : "Région wallonne"; }

    /* Texte du résultat et message d'envoi : retraduits si la langue change alors qu'ils sont affichés */
    const resultBox = $("[data-quiz-result-text]", root);
    const statusEl = $("[data-quiz-status]", root);
    let resultShown = false;
    let statusMsg = null; // { key, fallback }
    const setStatus = (key, fallback) => { statusMsg = { key, fallback }; if (statusEl) statusEl.textContent = tr(key, fallback); };
    document.addEventListener("i18n:changed", () => {
      if (resultShown && resultBox) resultBox.textContent = indicativeResult(currentLang());
      if (statusMsg && statusEl) statusEl.textContent = tr(statusMsg.key, statusMsg.fallback);
    });

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }

        resultShown = true;
        if (resultBox) resultBox.textContent = indicativeResult(currentLang());
        goTo("result");
        track("peb_eligibility_completed", { region: state.region, profile: state.profile });

        const submitBtn = $('[type="submit"]', form);
        if (!window.emailjs) {
          setStatus("peb.quiz_sent_offline", "Merci ! Pour aller plus vite, écrivez-nous directement à info@wisysafety.be.");
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        const params = {
          user_name: (form.querySelector('[name="quiz-name"]') || {}).value || "",
          user_email: (form.querySelector('[name="quiz-email"]') || {}).value || "",
          user_phone: (form.querySelector('[name="quiz-phone"]') || {}).value || "Non renseigné",
          subject: "Certification PEB",
          message: "Vérification d'éligibilité PEB — Région : " + regionLabelFr() + " · Profil : " + (state.profile || "-") +
            (state.profile === "experience" ? " · Expérience : " + (state.years || "-") + " an(s)" : "") +
            " · Langue du visiteur : " + currentLang() +
            " · Résultat indicatif transmis : " + indicativeResult("fr"),
          time: new Date().toLocaleString("fr-BE", { dateStyle: "long", timeStyle: "short" })
        };
        try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch (e2) { /* déjà initialisé ailleurs : ignoré */ }
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
          .then(() => setStatus("peb.quiz_sent_ok", "Merci ! Notre équipe revient vers vous sous 24 h ouvrées."))
          .catch(() => setStatus("peb.quiz_sent_err", "L'envoi a échoué. Écrivez-nous directement à info@wisysafety.be."))
          .finally(() => { if (submitBtn) submitBtn.disabled = false; });
      });
    }

    /* Pré-remplit l'étape 1 depuis le sélecteur de Région principal, si déjà choisi. */
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-quiz-open]");
      if (!opener) return;
      const preset = document.documentElement.getAttribute("data-peb-region");
      if (preset) {
        const input = $(`input[name="quiz-region"][value="${preset}"]`, root);
        if (input) input.checked = true;
      }
    });
  }

  /* ======================================================================= */
  function init() {
    initHeader();
    initFooterStatus();
    initScrollReveal();
    initMaskReveal();
    initAccordions();
    initFaqSchema();
    initRegionSwitch();
    initSessionFilter();
    initStickyBar();
    initEligibilityQuiz();
    initTilt();
    initMagnetic();
    initSmoothScroll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
