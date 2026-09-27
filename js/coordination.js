/* =========================================================================
   WISY SAFETY — WiSy Coordination : comportements propres à la page
   -------------------------------------------------------------------------
   En-tête, menu mobile, pied de page et apparitions au scroll viennent de
   js/site-chrome.js (partagé). Ce fichier n'ajoute que ce qui est propre à
   cette page :

     initHero()              équerres du hero qui se dessinent au chargement + léger parallaxe.
     initPillars()            rail de piliers qui s'ouvre au clic (un seul à la fois).
     initTimelineProgress()   ligne de la timeline « mission » qui se remplit au scroll.
     initControlSequence()    allumage séquentiel de « Coordination Control » (une fois, à l'entrée).
     initModals()   système de fenêtres modales (piliers/services/domaines) :
                     ouverture/fermeture, piège de focus, arrière-plan inert,
                     verrouillage du scroll, retour du focus, Échap.
     initTeam()     affiche les fiches de js/coordination-data.js (TEAM) ou,
                     tant que ce tableau est vide, laisse l'état « équipe à
                     venir » déjà présent dans le HTML (aucune donnée inventée).
     initForm()     validation native + anti-spam (piège à robots) + envoi
                     EmailJS (même compte que contact.html / peb-wallonie-
                     bruxelles.html) ; jamais de pièce jointe (le compte
                     EmailJS ne le permet pas).
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const Chrome = window.WisyChrome || { track() {}, tr: (k, f) => f, currentLang: () => "fr" };
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------------------- */
  /* Hero : dessin des équerres au chargement + parallaxe léger au scroll   */
  /* (désactivé en mouvement réduit — jamais de scroll-jacking, juste une   */
  /* translation de quelques pixels de l'image derrière le texte).          */
  /* --------------------------------------------------------------------- */
  function initHero() {
    const hero = $(".co-hero");
    if (!hero) return;
    requestAnimationFrame(() => hero.classList.add("is-ready"));
    if (reducedMotion()) return;
    const img = $("[data-parallax] img", hero);
    if (!img) return;
    let ticking = false;
    function update() {
      ticking = false;
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      img.style.setProperty("--py", Math.round(r.top * -0.12) + "px");
    }
    update();
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  /* --------------------------------------------------------------------- */
  /* Piliers : rail qui s'ouvre au clic/Entrée (un seul ouvert à la fois),  */
  /* pattern accordéon accessible identique à celui du menu mobile du site  */
  /* (aria-expanded sur le déclencheur, panneau démasqué par la grille CSS).*/
  /* --------------------------------------------------------------------- */
  function initPillars() {
    const triggers = $$("[data-pillar-toggle]");
    if (!triggers.length) return;
    triggers.forEach((btn) => {
      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        triggers.forEach((b) => b.setAttribute("aria-expanded", "false"));
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
    // Le premier pilier démarre ouvert : la section n'a pas l'air vide au premier coup d'œil.
    triggers[0].setAttribute("aria-expanded", "true");
  }

  /* --------------------------------------------------------------------- */
  /* Mission : la ligne du rail se remplit progressivement pendant que la   */
  /* section défile (jamais de scroll-jacking : le scroll natif reste seul  */
  /* maître, on ne fait que lire sa position pour ajuster une hauteur CSS). */
  /* --------------------------------------------------------------------- */
  function initTimelineProgress() {
    const list = $("[data-timeline]"), fill = $("[data-timeline-fill]");
    if (!list || !fill) return;
    let ticking = false;
    function update() {
      ticking = false;
      const r = list.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height - vh * 0.45;
      const done = (vh * 0.75) - r.top;
      const pct = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
      fill.style.height = (pct * 100) + "%";
    }
    update();
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
  }

  /* --------------------------------------------------------------------- */
  /* Coordination Control : allumage séquentiel des étapes, une seule fois, */
  /* quand la section entre dans le viewport (composant éditorial — voir    */
  /* le texte affiché juste au-dessus : jamais un vrai statut de chantier). */
  /* --------------------------------------------------------------------- */
  function initControlSequence() {
    const rail = $("[data-control-rail]");
    if (!rail) return;
    const items = $$("li", rail);
    if (!("IntersectionObserver" in window) || reducedMotion()) {
      items.forEach((li) => li.classList.add("is-on"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        rail.classList.add("is-live");
        items.forEach((li) => li.classList.add("is-on"));
        io.unobserve(rail);
      });
    }, { threshold: 0.4 });
    io.observe(rail);
  }

  /* --------------------------------------------------------------------- */
  /* Modals (piliers, services, domaines)                                   */
  /* --------------------------------------------------------------------- */
  function initModals() {
    const scrim = $("[data-modal-scrim]");
    const openers = $$("[data-modal-open]");
    if (!scrim || !openers.length) return;

    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let current = null;      // modal DOM actuellement ouvert
    let lastTrigger = null;  // élément qui a ouvert le modal (retour du focus)

    function focusables(container) {
      return $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    function onKeydown(e) {
      if (!current) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = focusables(current);
      if (!items.length) { e.preventDefault(); current.focus(); return; }
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (!current.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }

    function setBackgroundInert(on) {
      $$("body > header, body > main, body > footer").forEach((el) => {
        if (on) { el.setAttribute("inert", ""); el.setAttribute("aria-hidden", "true"); }
        else { el.removeAttribute("inert"); el.removeAttribute("aria-hidden"); }
      });
    }

    function lockScroll(on) {
      if (on) {
        const sw = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty("--co-scrollbar", sw + "px");
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = sw ? sw + "px" : "";
      } else {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    }

    function open(id, trigger) {
      const modal = document.getElementById(id);
      if (!modal) return;
      if (current) close(true);
      current = modal;
      lastTrigger = trigger || null;
      modal.hidden = false;
      // reflow avant d'ajouter la classe : garantit la transition d'ouverture
      void modal.offsetWidth;
      modal.classList.add("is-open");
      scrim.hidden = false;
      void scrim.offsetWidth;
      scrim.classList.add("is-open");
      setBackgroundInert(true);
      lockScroll(true);
      document.addEventListener("keydown", onKeydown, true);
      const items = focusables(modal);
      (items[0] || modal).focus({ preventScroll: true });
      Chrome.track("coord_modal_open", { modal: id });
    }

    function close(skipFocusReturn) {
      if (!current) return;
      const modal = current;
      modal.classList.remove("is-open");
      scrim.classList.remove("is-open");
      setBackgroundInert(false);
      lockScroll(false);
      document.removeEventListener("keydown", onKeydown, true);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finish = () => { modal.hidden = true; scrim.hidden = true; };
      if (reduced) finish(); else setTimeout(finish, 320);
      if (!skipFocusReturn && lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
      current = null; lastTrigger = null;
    }

    openers.forEach((btn) => {
      btn.addEventListener("click", () => open(btn.getAttribute("data-modal-open"), btn));
    });
    $$("[data-modal-close]").forEach((btn) => btn.addEventListener("click", (e) => {
      if (btn.tagName === "A") { /* laisse le lien #co-cta naviguer après fermeture */ }
      close();
    }));
    scrim.addEventListener("click", () => close());
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

    empty.hidden = true;
    list.hidden = false;
    list.innerHTML = "";
    team.forEach((p) => {
      if (!p || !p.name || !p.role) return; // ignore une entrée incomplète plutôt que d'afficher un trou
      const card = document.createElement("article");
      card.className = "co-team__card";
      const photo = (p.photo && p.photo.webp)
        ? `<img src="${p.photo.webp}" alt="${p.photo.alt ? String(p.photo.alt).replace(/"/g, "&quot;") : ""}" width="240" height="240" loading="lazy">`
        : "";
      const quals = Array.isArray(p.qualifications) && p.qualifications.length
        ? `<ul class="co-team__quals">${p.qualifications.map((q) => `<li>${String(q)}</li>`).join("")}</ul>` : "";
      card.innerHTML = `${photo}<h3>${String(p.name)}</h3><p>${String(p.role)}</p>${quals}`;
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
    const configured = window.emailjs && EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID;
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
      const messageParts = [
        "Demande de coordination sécurité-santé — WiSy Coordination",
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

      if (!configured) {
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
          Chrome.track("coord_form_submit", {});
        })
        .catch(() => {
          setStatus(Chrome.tr("coord.form_error", "L'envoi a échoué. Vous pouvez nous écrire directement à info@wisysafety.be."), "error");
        })
        .finally(() => { submitBtn.disabled = false; });
    });
  }

  const boot = () => { initHero(); initPillars(); initTimelineProgress(); initControlSequence(); initModals(); initTeam(); initForm(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
