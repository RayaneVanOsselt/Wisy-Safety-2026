/* =========================================================================
   WISY SAFETY — Moteur du parcours d'inscription
   -------------------------------------------------------------------------
   • État central (registration) + persistance localStorage VERSIONNÉE
   • Calculs en CENTIMES (entiers) ; affichage via Intl.NumberFormat
   • Rendu des « composants » : catalogue, modules, sélecteur de quantité,
     récapitulatif, barre mobile, participants, facturation, paiement
   • Abstraction PaymentProvider + initializePayment(order) SANS service réel
   • Accessibilité : aria-live, focus, aria-current, reduced-motion
   Dépend de : window.WisyRegistrationData (registration-data.js) et,
   pour les libellés, de window.WisyI18N (i18n.js). Fonctionne en repli si
   l'i18n n'est pas prêt (textes français par défaut).
   ========================================================================= */
(function () {
  "use strict";

  var DATA = window.WisyRegistrationData;
  if (!DATA) return; /* garde-fou : données absentes */
  var CONFIG = DATA.CONFIG;

  var prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================================================================
     0. i18n — helper de traduction avec repli français
     ====================================================================== */
  function lang() {
    return (window.WisyI18N && window.WisyI18N.current && window.WisyI18N.current()) || "fr";
  }
  function t(key, fallback) {
    if (window.WisyI18N && window.WisyI18N.get) {
      var v = window.WisyI18N.get(lang(), key);
      if (v != null) return v;
    }
    return fallback != null ? fallback : key;
  }
  /* Champ localisé {fr,en,nl} avec repli fr */
  function loc(field) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    return field[lang()] || field.fr || Object.values(field)[0] || "";
  }

  /* Formatage monétaire — centimes -> devise, selon la langue */
  var LOCALE_MAP = { fr: "fr-BE", nl: "nl-BE", en: "en-BE", de: "de-BE" };
  function money(cents) {
    var locale = LOCALE_MAP[lang()] || CONFIG.locale;
    var value = (cents || 0) / 100;
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency: CONFIG.currency }).format(value);
    } catch (e) {
      return value.toFixed(2) + " €";
    }
  }

  /* ======================================================================
     1. Registre d'icônes (SVG linéaire personnalisé)
     ====================================================================== */
  var P = { fill: "none", sw: "1.8" };
  var ICONS = {
    /* formations */
    shield: '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z"/>',
    hierarchy: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M12 11H6.5A1.5 1.5 0 0 0 5 12.5V17M12 11h5.5A1.5 1.5 0 0 1 19 12.5V17"/>',
    hazard: '<path d="M10.3 3.6 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 16.5h.01"/>',
    lift: '<path d="M4 21h6v-3H4zM7 18V5l11 3v5"/><path d="M13 13h6"/>',
    fiber: '<path d="M3 12c4-6 14-6 18 0M6.5 12c2.4-3.6 8.6-3.6 11 0"/><circle cx="12" cy="12" r="2.2"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    "shield-check": '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z"/><path d="M9 11.5l2 2 4-4"/>',
    trainer: '<circle cx="9" cy="8" r="3"/><path d="M4 20a5 5 0 0 1 10 0"/><path d="M17 4l3 1.5L17 7M17 4v6"/>',
    draft: '<path d="M12 3v18M3 12h18" opacity=".35"/><path d="M6 6l4 4-4 4M18 6l-4 4 4 4"/>',
    signal: '<path d="M4 16a10 10 0 0 1 16 0M7 16a6 6 0 0 1 10 0"/><circle cx="12" cy="16" r="2"/>',
    /* interface */
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M20.5 20a5.5 5.5 0 0 0-4-5.3"/>',
    receipt: '<path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3z"/><path d="M9 8h6M9 12h6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    clip2: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 3h6v4H9zM8 12h8M8 16h5"/>'
  };
  function icon(name, cls) {
    var inner = ICONS[name] || ICONS.info;
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + P.sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }
  function catLabel(catId) {
    var found = null;
    DATA.CATEGORIES.forEach(function (c) { if (c.id === catId) found = c; });
    return found ? t(found.i18n, catId) : catId;
  }

  /* ======================================================================
     2. ÉTAT CENTRAL + persistance
     ====================================================================== */
  function emptyState() {
    return {
      version: CONFIG.schemaVersion,
      step: 1,
      trainings: {},          /* { id: quantity } */
      participants: {},       /* { id: [ {firstName,lastName,email}, … ] } */
      participantsLater: {},  /* { id: bool } */
      customer: { firstName: "", lastName: "", email: "", phone: "" },
      billing: { company: "", vat: "", address: "", zip: "", city: "", country: "BE" },
      consent: false
    };
  }
  var state = emptyState();
  var restored = false;
  var bannerDismissed = false;

  function updateRestoredBanner() {
    var banner = document.getElementById("reg-restored");
    if (banner) banner.hidden = !(restored && !bannerDismissed && state.step === 1);
  }

  function save() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    var raw;
    try { raw = localStorage.getItem(CONFIG.storageKey); } catch (e) { return; }
    if (!raw) return;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { clearStorage(); return; }
    /* Vérification de version : schéma incompatible => on repart proprement */
    if (!parsed || parsed.version !== CONFIG.schemaVersion) { clearStorage(); return; }

    var fresh = emptyState();
    /* Ne conserver que des formations encore existantes (migration-safe) */
    var trainings = {};
    if (parsed.trainings && typeof parsed.trainings === "object") {
      Object.keys(parsed.trainings).forEach(function (id) {
        if (DATA.getTraining(id)) {
          var q = parseInt(parsed.trainings[id], 10);
          if (isFinite(q) && q > 0) trainings[id] = clampQty(q);
        }
      });
    }
    fresh.trainings = trainings;
    if (parsed.participants && typeof parsed.participants === "object") fresh.participants = parsed.participants;
    if (parsed.participantsLater && typeof parsed.participantsLater === "object") fresh.participantsLater = parsed.participantsLater;
    if (parsed.customer) fresh.customer = Object.assign(fresh.customer, parsed.customer);
    if (parsed.billing) fresh.billing = Object.assign(fresh.billing, parsed.billing);
    fresh.consent = !!parsed.consent;
    /* On revient toujours à l'étape 1 au chargement (parcours guidé). */
    fresh.step = 1;
    state = fresh;
    restored = Object.keys(trainings).length > 0;
  }
  function clearStorage() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
  }
  function clampQty(q) {
    q = parseInt(q, 10);
    if (!isFinite(q)) q = CONFIG.minQuantity;
    return Math.max(CONFIG.minQuantity, Math.min(CONFIG.maxQuantity, q));
  }

  /* ======================================================================
     3. MÉTHODES MÉTIER (API demandée)
     ====================================================================== */
  function addTraining(id, quantity) {
    if (!DATA.getTraining(id)) return;
    if (!state.trainings[id]) state.trainings[id] = clampQty(quantity || 1);
    syncParticipants(id);
    save();
  }
  function removeTraining(id) {
    delete state.trainings[id];
    delete state.participants[id];
    delete state.participantsLater[id];
    save();
  }
  function updateQuantity(id, quantity) {
    if (!state.trainings[id]) return;
    var q = clampQty(quantity);
    state.trainings[id] = q;
    syncParticipants(id);
    save();
  }
  function syncParticipants(id) {
    var q = state.trainings[id] || 0;
    var list = state.participants[id] || [];
    while (list.length < q) list.push({ firstName: "", lastName: "", email: "" });
    if (list.length > q) list = list.slice(0, q);
    state.participants[id] = list;
  }
  function selectedIds() {
    return DATA.getCatalogue()
      .map(function (x) { return x.id; })
      .filter(function (id) { return !!state.trainings[id]; });
  }
  function lineTotalCents(id) {
    var tr = DATA.getTraining(id);
    return tr ? tr.priceCents * (state.trainings[id] || 0) : 0;
  }
  function calculateSubtotal() {
    return selectedIds().reduce(function (sum, id) { return sum + lineTotalCents(id); }, 0);
  }
  function participantsCount() {
    return selectedIds().reduce(function (s, id) { return s + (state.trainings[id] || 0); }, 0);
  }
  function computeTotals() {
    var subtotal = calculateSubtotal();
    var vat = null;
    var total = subtotal;
    if (typeof CONFIG.vatRate === "number") {
      vat = Math.round(subtotal * CONFIG.vatRate);
      total = subtotal + vat;
    }
    return { subtotalCents: subtotal, vatCents: vat, totalCents: total };
  }
  function clearRegistration() {
    state = emptyState();
    restored = false;
    clearStorage();
    renderAll();
    goToStep(1);
    announce(t("reg.a11y_cleared", "Inscription réinitialisée."));
  }

  /* ======================================================================
     4. VALIDATION
     ====================================================================== */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function isEmail(v) { return EMAIL_RE.test(String(v || "").trim()); }

  /* validateStep(n[, focus]) -> bool. focus=true affiche/pointe les erreurs. */
  function validateStep(n, focus) {
    if (n === 1) return selectedIds().length > 0;
    if (n === 2) return true; /* participants : facultatifs (voir bascule) */
    if (n === 3) return validateBilling(focus);
    if (n === 4) return validateBilling(false) && selectedIds().length > 0;
    return true;
  }

  /* Champs requis de l'étape Coordonnées */
  var REQUIRED_FIELDS = [
    { id: "reg-cust-firstname", path: ["customer", "firstName"], type: "text" },
    { id: "reg-cust-lastname", path: ["customer", "lastName"], type: "text" },
    { id: "reg-cust-email", path: ["customer", "email"], type: "email" },
    { id: "reg-cust-phone", path: ["customer", "phone"], type: "text" },
    { id: "reg-bill-address", path: ["billing", "address"], type: "text" },
    { id: "reg-bill-zip", path: ["billing", "zip"], type: "text" },
    { id: "reg-bill-city", path: ["billing", "city"], type: "text" },
    { id: "reg-bill-country", path: ["billing", "country"], type: "text" }
  ];
  function fieldValue(path) { return (state[path[0]] || {})[path[1]] || ""; }
  function validateBilling(focus) {
    var firstInvalid = null;
    REQUIRED_FIELDS.forEach(function (f) {
      var el = document.getElementById(f.id);
      if (!el) return;
      var val = String(fieldValue(f.path)).trim();
      var invalid = !val || (f.type === "email" && !isEmail(val));
      setFieldError(f.id, invalid, focus);
      if (invalid && !firstInvalid) firstInvalid = el;
    });
    if (focus && firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }
  function setFieldError(inputId, invalid, show) {
    var el = document.getElementById(inputId);
    if (!el) return;
    var err = document.getElementById(inputId + "-err");
    if (invalid && show) {
      el.setAttribute("aria-invalid", "true");
      if (err) err.classList.add("is-shown");
    } else {
      el.removeAttribute("aria-invalid");
      if (err) err.classList.remove("is-shown");
    }
  }

  /* ======================================================================
     5. NAVIGATION entre étapes
     ====================================================================== */
  var TOTAL_STEPS = 4;
  function canEnter(n) {
    if (n <= 1) return true;
    if (selectedIds().length === 0) return false;         /* il faut au moins 1 formation */
    if (n >= 4 && !validateStep(3, false)) return false;  /* coordonnées requises avant paiement */
    return true;
  }
  function goToStep(n, opts) {
    opts = opts || {};
    n = Math.max(1, Math.min(TOTAL_STEPS, n));
    if (!canEnter(n)) {
      /* rediriger vers la première étape bloquante */
      if (selectedIds().length === 0) n = 1;
      else if (n >= 4) { goToStep(3, { focusInvalid: true }); return; }
    }
    state.step = n;
    save();
    /* Panneaux */
    document.querySelectorAll(".reg-step").forEach(function (panel) {
      var s = parseInt(panel.getAttribute("data-step"), 10);
      var active = s === n;
      panel.hidden = !active;
      if (active && !prefersReduce) { panel.classList.remove("reg-anim"); void panel.offsetWidth; panel.classList.add("reg-anim"); }
    });
    /* Layout : étape 4 en pleine largeur (finalisation) */
    var layout = document.getElementById("reg-layout");
    if (layout) layout.classList.toggle("is-full", n === 4);

    if (n === 2) renderParticipants();
    if (n === 3) fillBillingInputs();
    if (n === 4) renderFinalSummary();

    renderSummary();   /* met à jour le libellé du CTA selon l'étape */
    renderStepper();
    updateBarAndCtas();
    updateRestoredBanner();

    /* Focus sur le titre de l'étape (accessibilité) */
    var head = document.querySelector('.reg-step[data-step="' + n + '"] .reg-step__title');
    if (head) { head.setAttribute("tabindex", "-1"); if (!opts.noFocus) head.focus({ preventScroll: false }); }
    if (opts.focusInvalid) validateBilling(true);

    /* Remonter en haut de la scène en douceur */
    var stage = document.getElementById("reg-stage");
    if (stage && !opts.noScroll) {
      var y = stage.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 76) - 60;
      window.scrollTo({ top: Math.max(0, y), behavior: prefersReduce ? "auto" : "smooth" });
    }
  }

  /* ======================================================================
     6. RENDU — Stepper
     ====================================================================== */
  function renderStepper() {
    document.querySelectorAll(".reg-step-btn").forEach(function (btn) {
      var s = parseInt(btn.getAttribute("data-goto"), 10);
      var isActive = s === state.step;
      var isDone = s < state.step && canEnter(s);
      btn.classList.toggle("is-active", isActive);
      btn.classList.toggle("is-done", isDone);
      btn.setAttribute("aria-current", isActive ? "step" : "false");
      btn.disabled = !canEnter(s) && s !== state.step;
      var item = btn.closest(".reg-step-item");
      if (item) item.classList.toggle("is-done-line", s < state.step);
    });
  }

  /* ======================================================================
     7. RENDU — Catalogue (filtres + recherche + modules)
     ====================================================================== */
  var activeFilter = "all";
  var searchQuery = "";

  function renderFilters() {
    var wrap = document.getElementById("reg-filters");
    if (!wrap) return;
    var cats = DATA.getCatalogue();
    var counts = {};
    cats.forEach(function (x) { counts[x.category] = (counts[x.category] || 0) + 1; });
    var html = '<button type="button" class="reg-chip' + (activeFilter === "all" ? " is-active" : "") + '" data-filter="all" aria-pressed="' + (activeFilter === "all") + '">' +
      t("reg.filter_all", "Toutes") + ' <span class="reg-chip__count">' + cats.length + "</span></button>";
    DATA.CATEGORIES.forEach(function (c) {
      if (!counts[c.id]) return;
      html += '<button type="button" class="reg-chip' + (activeFilter === c.id ? " is-active" : "") + '" data-filter="' + c.id + '" aria-pressed="' + (activeFilter === c.id) + '">' +
        catLabel(c.id) + ' <span class="reg-chip__count">' + counts[c.id] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  function moduleHtml(item) {
    var selected = !!state.trainings[item.id];
    var qty = state.trainings[item.id] || 1;
    return '' +
      '<article class="reg-module reg-tech' + (selected ? " is-selected" : "") + '" data-module="' + item.id + '">' +
      '<span class="reg-module__badge">' + icon("check") + t("reg.added_badge", "Ajoutée") + "</span>" +
      '<div class="reg-module__top">' +
        '<span class="reg-module__ref">' + t("reg.ref", "RÉF") + ' <span class="sep">·</span>' + escapeHtml(item.code || "") + "</span>" +
        '<span class="reg-module__cat">' + escapeHtml(catLabel(item.category)) + "</span>" +
      "</div>" +
      '<div class="reg-module__head">' +
        '<span class="reg-module__ic">' + icon(item.icon) + "</span>" +
        '<h3 class="reg-module__name">' + escapeHtml(loc(item.name)) + "</h3>" +
      "</div>" +
      '<p class="reg-module__desc">' + escapeHtml(loc(item.description)) + "</p>" +
      '<div class="reg-module__spec"><span class="reg-module__amount">' + money(item.priceCents) + "</span>" +
        '<span class="reg-module__unit">/ ' + t("reg.unit_participant", "participant") + "</span></div>" +
      '<div class="reg-module__foot">' +
        '<button type="button" class="reg-add" data-add="' + item.id + '">' + icon("plus") + t("reg.add", "Ajouter à mon inscription") + "</button>" +
        '<div class="reg-module__selected">' + qtyHtml(item.id, qty, "module") +
          '<button type="button" class="reg-remove" data-remove="' + item.id + '" aria-label="' + t("reg.remove", "Retirer") + " — " + escapeHtml(loc(item.name)) + '">' + icon("trash") + "</button>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function qtyHtml(id, qty, ctx) {
    var minus = qty <= CONFIG.minQuantity;
    var plus = qty >= CONFIG.maxQuantity;
    return '<div class="reg-qty" data-qty-for="' + id + '">' +
      '<button type="button" class="reg-qty__btn" data-qty="dec" data-id="' + id + '"' + (minus ? " disabled" : "") + ' aria-label="' + t("reg.decrease", "Diminuer le nombre de participants") + '">' + icon("minus") + "</button>" +
      '<span class="reg-qty__val" role="status" aria-live="off"><span aria-hidden="true">' + qty + "</span>" +
        '<small>' + participantsWord(qty) + "</small>" +
        '<span class="visually-hidden">' + qty + " " + participantsWord(qty) + "</span></span>" +
      '<button type="button" class="reg-qty__btn" data-qty="inc" data-id="' + id + '"' + (plus ? " disabled" : "") + ' aria-label="' + t("reg.increase", "Augmenter le nombre de participants") + '">' + icon("plus") + "</button>" +
    "</div>";
  }
  function participantsWord(q) {
    return q > 1 ? t("reg.participants", "participants") : t("reg.participant", "participant");
  }

  function renderCatalogue() {
    var grid = document.getElementById("reg-catalogue");
    if (!grid) return;
    var q = searchQuery.trim().toLowerCase();
    var items = DATA.getCatalogue().filter(function (x) {
      if (activeFilter !== "all" && x.category !== activeFilter) return false;
      if (!q) return true;
      return (loc(x.name) + " " + loc(x.description) + " " + catLabel(x.category)).toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) {
      grid.innerHTML = '<div class="reg-empty" style="grid-column:1/-1">' +
        '<div class="reg-empty__ic">' + icon("search") + "</div>" +
        '<p class="reg-empty__title">' + t("reg.no_result_title", "Aucune formation trouvée") + "</p>" +
        '<p class="reg-empty__text">' + t("reg.no_result_text", "Essayez un autre mot-clé ou une autre catégorie.") + "</p></div>";
      return;
    }
    grid.innerHTML = items.map(moduleHtml).join("");
  }

  /* ======================================================================
     8. RENDU — Récapitulatif « Votre inscription » (aside + bottom sheet)
     ====================================================================== */
  function summaryInnerHtml(compact) {
    var ids = selectedIds();
    var count = ids.length;
    var head = '<div class="reg-summary__head">' +
      '<h2 class="reg-summary__title">' + icon("clip2") + t("reg.summary_title", "Votre inscription") + "</h2>" +
      '<span class="reg-summary__count">' + count + " " + (count > 1 ? t("reg.formations", "formations") : t("reg.formation", "formation")) + "</span></div>";

    if (!count) {
      return head + '<div class="reg-summary__inner"><div class="reg-empty">' +
        '<div class="reg-empty__ic">' + icon("clip2") + "</div>" +
        '<p class="reg-empty__title">' + t("reg.empty_title", "Votre parcours est vide") + "</p>" +
        '<p class="reg-empty__text">' + t("reg.empty_text", "Sélectionnez une formation dans le catalogue pour construire votre inscription.") + "</p></div></div>";
    }

    var lines = ids.map(function (id) {
      var tr = DATA.getTraining(id);
      var qty = state.trainings[id];
      return '<div class="reg-line" data-line="' + id + '">' +
        '<span class="reg-line__node">' + icon(tr.icon) + "</span>" +
        '<span class="reg-line__ref">' + escapeHtml(tr.code || "") + "</span>" +
        '<span class="reg-line__name">' + escapeHtml(loc(tr.name)) + "</span>" +
        '<span class="reg-line__meta">' +
          '<span class="reg-line__calc">' + money(tr.priceCents) + " × " + qty + "</span>" +
          '<span class="reg-line__total">' + money(lineTotalCents(id)) + "</span>" +
        "</span>" +
        '<span class="reg-line__actions">' +
          '<span class="reg-line__qty">' +
            '<button type="button" class="reg-line__qtybtn" data-qty="dec" data-id="' + id + '"' + (qty <= CONFIG.minQuantity ? " disabled" : "") + ' aria-label="' + t("reg.decrease", "Diminuer") + '">' + icon("minus") + "</button>" +
            '<span class="reg-line__qtyval" aria-hidden="true">' + qty + "</span>" +
            '<button type="button" class="reg-line__qtybtn" data-qty="inc" data-id="' + id + '"' + (qty >= CONFIG.maxQuantity ? " disabled" : "") + ' aria-label="' + t("reg.increase", "Augmenter") + '">' + icon("plus") + "</button>" +
          "</span>" +
          '<button type="button" class="reg-line__mini reg-line__mini--danger" data-remove="' + id + '">' + icon("trash") + t("reg.remove", "Retirer") + "</button>" +
        "</span>" +
      "</div>";
    }).join("");

    var totals = computeTotals();
    var cartouche = '<dl class="reg-cartouche">' +
      '<div class="reg-cartouche__row"><dt>' + t("reg.subtotal", "Sous-total formations") + '</dt><dd>' + money(totals.subtotalCents) + "</dd></div>" +
      '<div class="reg-cartouche__row reg-cartouche__row--vat"><dt>' + t("reg.vat", "TVA") + "</dt><dd>" +
        (totals.vatCents == null ? t("reg.vat_tbd", "À déterminer") : money(totals.vatCents)) + "</dd></div>" +
      '<div class="reg-cartouche__row reg-cartouche__row--total"><dt>' + t("reg.total", "Total") + '</dt><dd data-grandtotal>' + money(totals.totalCents) + "</dd></div>" +
    "</dl>";

    var cta = compact ? "" : (
      '<div class="reg-summary__cta">' +
        '<button type="button" class="reg-cta" data-advance>' + ctaLabel() + icon("arrow-right") + "</button>" +
        '<p class="reg-secure">' + icon("lock") + t("reg.secure_note", "Paiement sécurisé à l'étape finale") + "</p>" +
      "</div>"
    );

    return head + '<div class="reg-summary__inner">' +
      '<div class="reg-summary__list">' + lines + "</div>" + cartouche + cta +
    "</div>";
  }

  function ctaLabel() {
    if (state.step === 1) return t("reg.cta_continue", "Continuer l'inscription");
    if (state.step === 2) return t("reg.cta_next", "Continuer");
    if (state.step === 3) return t("reg.cta_pay", "Aller au paiement");
    return t("reg.cta_finalize", "Finaliser");
  }

  function renderSummary() {
    var el = document.getElementById("reg-summary");
    if (el) el.innerHTML = summaryInnerHtml(false);
    var sheetBody = document.getElementById("reg-sheet-body");
    if (sheetBody) sheetBody.innerHTML = summaryInnerHtml(true);
  }

  /* ======================================================================
     9. RENDU — Barre mobile + CTAs + état
     ====================================================================== */
  function updateBarAndCtas() {
    var totals = computeTotals();
    var count = selectedIds().length;
    var pcount = participantsCount();

    /* Barre mobile */
    var bar = document.getElementById("reg-mobilebar");
    var showBar = count > 0 && state.step < 4;
    if (bar) {
      bar.querySelector("[data-bar-count]").textContent = count + " " + (count > 1 ? t("reg.formations", "formations") : t("reg.formation", "formation")) +
        " · " + pcount + " " + participantsWord(pcount);
      bar.querySelector("[data-bar-total]").textContent = money(totals.totalCents);
      bar.querySelector("[data-bar-cta-label]").textContent = state.step === 3 ? t("reg.cta_pay", "Aller au paiement") : t("reg.cta_next_short", "Continuer");
      bar.classList.toggle("is-shown", showBar);
    }
    document.body.classList.toggle("reg-bar-active", showBar);

    /* CTA du résumé + barre (désactivés si panier vide) */
    document.querySelectorAll("[data-advance]").forEach(function (b) {
      b.disabled = count === 0;
    });
  }

  /* ======================================================================
     10. RENDU — Participants (étape 2)
     ====================================================================== */
  function renderParticipants() {
    var wrap = document.getElementById("reg-participants");
    if (!wrap) return;
    var ids = selectedIds();
    if (!ids.length) {
      wrap.innerHTML = emptyStepHtml(t("reg.part_empty", "Aucune formation sélectionnée. Revenez à l'étape précédente pour en choisir une."));
      return;
    }
    wrap.innerHTML = ids.map(function (id) {
      var tr = DATA.getTraining(id);
      var qty = state.trainings[id];
      var later = !!state.participantsLater[id];
      syncParticipants(id);
      var list = state.participants[id];

      var fields = "";
      for (var i = 0; i < qty; i++) {
        var p = list[i] || { firstName: "", lastName: "", email: "" };
        fields += participantFieldsHtml(id, i, p);
      }
      return '<div class="reg-block" data-part-block="' + id + '">' +
        '<div class="reg-block__head">' +
          '<span class="reg-block__ic">' + icon(tr.icon) + "</span>" +
          "<div><h3 class=\"reg-block__title\">" + escapeHtml(loc(tr.name)) + "</h3>" +
          '<p class="reg-block__sub">' + qty + " " + participantsWord(qty) + "</p></div>" +
          '<span class="reg-block__ref">' + escapeHtml(tr.code || "") + "</span>" +
        "</div>" +
        '<label class="reg-toggle"><input type="checkbox" data-later="' + id + '"' + (later ? " checked" : "") + '>' +
          '<span class="reg-toggle__txt"><b>' + t("reg.later_title", "Communiquer les participants plus tard") + "</b><br>" +
          '<span>' + t("reg.later_text", "Vous pourrez transmettre les noms après confirmation de l'inscription.") + "</span></span></label>" +
        '<div class="reg-participants-fields"' + (later ? " hidden" : "") + ">" + fields + "</div>" +
      "</div>";
    }).join("");
  }
  function participantFieldsHtml(id, i, p) {
    var n = i + 1;
    var base = "p-" + id + "-" + i;
    return '<div class="reg-participant">' +
      '<span class="reg-participant__k"><span class="reg-participant__num">' + n + "</span>" + t("reg.participant_n", "Participant") + " " + (n < 10 ? "0" + n : n) + "</span>" +
      '<div class="reg-fields"><div class="reg-row">' +
        field(base + "-fn", t("reg.f_firstname", "Prénom"), "text", p.firstName, id, i, "firstName") +
        field(base + "-ln", t("reg.f_lastname", "Nom"), "text", p.lastName, id, i, "lastName") +
      "</div>" +
        field(base + "-em", t("reg.f_email", "E-mail"), "email", p.email, id, i, "email", true) +
      "</div></div>";
  }
  function field(fid, label, type, val, pid, pidx, pfield, wide) {
    return '<div class="reg-field' + (wide ? " reg-field--wide" : "") + '">' +
      '<label class="reg-label" for="' + fid + '">' + label + " <span class=\"reg-optlabel\">" + t("reg.optional", "facultatif") + "</span></label>" +
      '<input class="reg-input" id="' + fid + '" type="' + type + '" value="' + escapeAttr(val || "") + '" ' +
        'data-p-training="' + pid + '" data-p-index="' + pidx + '" data-p-field="' + pfield + '" autocomplete="off">' +
    "</div>";
  }
  function emptyStepHtml(msg) {
    return '<div class="reg-block"><div class="reg-empty">' +
      '<div class="reg-empty__ic">' + icon("info") + "</div>" +
      '<p class="reg-empty__text">' + msg + "</p></div></div>";
  }

  /* ======================================================================
     11. Facturation (étape 3) — liaison des valeurs
     ====================================================================== */
  function fillBillingInputs() {
    setVal("reg-cust-firstname", state.customer.firstName);
    setVal("reg-cust-lastname", state.customer.lastName);
    setVal("reg-cust-email", state.customer.email);
    setVal("reg-cust-phone", state.customer.phone);
    setVal("reg-bill-company", state.billing.company);
    setVal("reg-bill-vat", state.billing.vat);
    setVal("reg-bill-address", state.billing.address);
    setVal("reg-bill-zip", state.billing.zip);
    setVal("reg-bill-city", state.billing.city);
    setVal("reg-bill-country", state.billing.country);
  }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ""; }

  /* ======================================================================
     12. Récap final (étape 4) + emplacement paiement
     ====================================================================== */
  function renderFinalSummary() {
    var host = document.getElementById("reg-final-summary");
    if (host) host.innerHTML = summaryInnerHtml(true);
    var totals = computeTotals();
    var tv = document.getElementById("reg-final-total");
    if (tv) tv.innerHTML = money(totals.totalCents) + (totals.vatCents == null ? ' <small>' + t("reg.vat_excluded", "hors TVA à déterminer") + "</small>" : "");
    /* État du prestataire de paiement */
    var st = document.getElementById("reg-pay-status");
    if (st) {
      var ready = PaymentProvider.isReady();
      st.innerHTML = icon(ready ? "check" : "info") + (ready
        ? t("reg.pay_ready", "Paiement en ligne disponible")
        : t("reg.pay_unavailable", "Paiement en ligne bientôt disponible"));
    }
    var btn = document.getElementById("reg-pay-btn");
    if (btn) btn.disabled = selectedIds().length === 0;
  }

  /* ======================================================================
     13. ABSTRACTION PAIEMENT (aucun service réel connecté)
     ====================================================================== */
  var PaymentProvider = {
    get id() { return CONFIG.payment.provider; },
    isReady: function () { return !!(CONFIG.payment.provider && CONFIG.payment.ready); },
    /* À implémenter par prestataire (Stripe/Mollie/PayPal) LORS du branchement.
       Ne DOIT PAS être appelé tant qu'aucun prestataire n'est configuré. */
    createSession: function () {
      throw new Error("Wisy: aucun prestataire de paiement configuré.");
    }
  };

  /* Construit un ordre normalisé. N'appelle AUCUN service externe.
     Le total transmis est indicatif : le SERVEUR devra recalculer à partir
     des identifiants (items[].id) et ne jamais faire confiance au navigateur. */
  function initializePayment(order) {
    var src = order || state;
    var items = selectedIds().map(function (id) {
      var tr = DATA.getTraining(id);
      return { id: id, quantity: state.trainings[id], unitPriceCents: tr.priceCents };
    });
    var totals = computeTotals();
    var payload = {
      reference: "WISY-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      currency: CONFIG.currency,
      locale: CONFIG.locale,
      items: items,                 /* le serveur RECALCULE à partir de items[].id */
      amounts: {                    /* indicatif — jamais source de vérité */
        subtotalCents: totals.subtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents
      },
      customer: src.customer,
      billing: src.billing,
      _note: "Client-side amounts are indicative. Server MUST recompute from item ids."
    };
    return {
      status: PaymentProvider.isReady() ? "ready" : "unavailable",
      provider: PaymentProvider.id,
      endpoint: CONFIG.payment.checkoutEndpoint,
      order: payload
    };
  }
  /* Exposé pour un futur module de checkout / tests. */
  window.WisyRegistration = {
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    addTraining: function (id, q) { addTraining(id, q); renderAll(); },
    removeTraining: function (id) { removeTraining(id); renderAll(); },
    updateQuantity: function (id, q) { updateQuantity(id, q); renderAll(); },
    calculateSubtotal: calculateSubtotal,
    computeTotals: computeTotals,
    clearRegistration: clearRegistration,
    goToStep: goToStep,
    validateStep: validateStep,
    initializePayment: initializePayment,
    PaymentProvider: PaymentProvider,
    setCatalogue: function (list) { DATA.setCatalogue(list); renderAll(); }
  };

  function handlePayClick() {
    var res = initializePayment();
    if (res.status !== "ready") {
      /* Environnement sans prestataire : on N'AUCUNE simulation de paiement. */
      var box = document.getElementById("reg-pay-message");
      if (box) {
        box.hidden = false;
        box.textContent = t("reg.payment_soon", "Le paiement en ligne sera prochainement disponible.");
      }
      announce(t("reg.payment_soon", "Le paiement en ligne sera prochainement disponible."));
      return;
    }
    /* (Futur) : PaymentProvider.createSession(res.order) puis redirection. */
  }

  /* ======================================================================
     14. Rendu global + annonces
     ====================================================================== */
  function announce(msg) {
    var live = document.getElementById("reg-live");
    if (live) { live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 30); }
  }
  function renderAll() {
    renderFilters();
    renderCatalogue();
    renderSummary();
    renderStepper();
    updateBarAndCtas();
    if (state.step === 2) renderParticipants();
    if (state.step === 4) renderFinalSummary();
  }

  /* Après une modification du panier : re-rendu ciblé + annonce */
  function afterCartChange(msg) {
    /* Met à jour les modules concernés sans reconstruire toute la grille
       si possible ; sinon re-render complet du catalogue. */
    renderCatalogue();
    renderSummary();
    updateBarAndCtas();
    renderStepper();
    if (state.step === 2) renderParticipants();
    if (state.step === 4) renderFinalSummary();
    if (msg) announce(msg);
  }

  /* ======================================================================
     15. ÉVÉNEMENTS (délégation)
     ====================================================================== */
  function onClick(e) {
    var el;

    if ((el = e.target.closest("[data-add]"))) {
      var id = el.getAttribute("data-add");
      addTraining(id, 1);
      var tr = DATA.getTraining(id);
      afterCartChange(t("reg.a11y_added", "Formation ajoutée :") + " " + loc(tr.name) + ". " + t("reg.a11y_total", "Total") + " : " + money(computeTotals().totalCents));
      return;
    }
    if ((el = e.target.closest("[data-remove]"))) {
      var rid = el.getAttribute("data-remove");
      var rtr = DATA.getTraining(rid);
      /* petite animation de sortie sur la ligne du récap si présente */
      var line = document.querySelector('.reg-line[data-line="' + rid + '"]');
      removeTraining(rid);
      afterCartChange(t("reg.a11y_removed", "Formation retirée :") + " " + (rtr ? loc(rtr.name) : ""));
      return;
    }
    if ((el = e.target.closest("[data-qty]"))) {
      var qid = el.getAttribute("data-id");
      var dir = el.getAttribute("data-qty");
      var cur = state.trainings[qid] || 1;
      updateQuantity(qid, dir === "inc" ? cur + 1 : cur - 1);
      afterCartChange(t("reg.a11y_qty", "Quantité mise à jour :") + " " + (state.trainings[qid] || 0) + " " + participantsWord(state.trainings[qid] || 0));
      flashTotals();
      return;
    }
    if ((el = e.target.closest("[data-filter]"))) {
      activeFilter = el.getAttribute("data-filter");
      renderFilters();
      renderCatalogue();
      return;
    }
    if ((el = e.target.closest("[data-goto]"))) {
      var g = parseInt(el.getAttribute("data-goto"), 10);
      if (g > state.step && !validateStep(state.step, true)) return;
      goToStep(g);
      return;
    }
    if (e.target.closest("[data-advance]")) {
      if (!validateStep(state.step, true)) { if (state.step === 3) closeSheet(); return; }
      goToStep(state.step + 1);
      closeSheet();
      return;
    }
    if (e.target.closest("[data-back]")) { goToStep(state.step - 1); return; }
    if (e.target.closest("[data-open-sheet]")) { openSheet(); return; }
    if (e.target.closest("[data-close-sheet]") || e.target.classList.contains("reg-sheet-scrim")) { closeSheet(); return; }
    if (e.target.closest("[data-pay]")) { handlePayClick(); return; }
    if (e.target.closest("[data-restart]")) { clearRegistration(); return; }
    if ((el = e.target.closest("[data-dismiss-restore]"))) {
      bannerDismissed = true;
      updateRestoredBanner();
      return;
    }
  }

  function flashTotals() {
    if (prefersReduce) return;
    document.querySelectorAll("[data-grandtotal],[data-bar-total]").forEach(function (n) {
      n.classList.remove("reg-total-flash"); void n.offsetWidth; n.classList.add("reg-total-flash");
    });
  }

  /* Saisie dans les formulaires (participants + facturation) */
  function onInput(e) {
    var el = e.target;
    if (el.hasAttribute("data-p-training")) {
      var pid = el.getAttribute("data-p-training");
      var idx = parseInt(el.getAttribute("data-p-index"), 10);
      var f = el.getAttribute("data-p-field");
      syncParticipants(pid);
      if (!state.participants[pid][idx]) state.participants[pid][idx] = { firstName: "", lastName: "", email: "" };
      state.participants[pid][idx][f] = el.value;
      save();
      return;
    }
    if (el.id === "reg-search") { searchQuery = el.value; renderCatalogue(); return; }
    /* Facturation / responsable */
    var map = {
      "reg-cust-firstname": ["customer", "firstName"], "reg-cust-lastname": ["customer", "lastName"],
      "reg-cust-email": ["customer", "email"], "reg-cust-phone": ["customer", "phone"],
      "reg-bill-company": ["billing", "company"], "reg-bill-vat": ["billing", "vat"],
      "reg-bill-address": ["billing", "address"], "reg-bill-zip": ["billing", "zip"],
      "reg-bill-city": ["billing", "city"], "reg-bill-country": ["billing", "country"]
    };
    if (map[el.id]) {
      var pth = map[el.id];
      state[pth[0]][pth[1]] = el.value;
      save();
      /* Retire l'erreur dès que le champ redevient valide */
      var val = String(el.value).trim();
      var ok = val && (el.type !== "email" || isEmail(val));
      if (ok) setFieldError(el.id, false, true);
    }
  }
  function onChange(e) {
    var el = e.target;
    if (el.hasAttribute("data-later")) {
      var id = el.getAttribute("data-later");
      state.participantsLater[id] = el.checked;
      save();
      var block = document.querySelector('[data-part-block="' + id + '"] .reg-participants-fields');
      if (block) block.hidden = el.checked;
      return;
    }
    if (el.id === "reg-consent") { state.consent = el.checked; save(); return; }
  }

  /* Bottom sheet */
  function openSheet() {
    var sheet = document.getElementById("reg-sheet");
    var scrim = document.getElementById("reg-sheet-scrim");
    var trigger = document.getElementById("reg-mobilebar");
    if (!sheet) return;
    renderSummary();
    sheet.classList.add("is-open");
    if (scrim) scrim.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var close = sheet.querySelector("[data-close-sheet]");
    if (close) close.focus();
  }
  function closeSheet() {
    var sheet = document.getElementById("reg-sheet");
    var scrim = document.getElementById("reg-sheet-scrim");
    var trigger = document.getElementById("reg-mobilebar");
    if (!sheet || !sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    if (scrim) scrim.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  /* Effet 2.5D — activé uniquement pointeur fin + hover, hors reduced-motion */
  function setupTilt() {
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || prefersReduce) return;
    document.body.classList.add("reg-tilt-ok");
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest(".reg-module");
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      var MAX = 1.5; /* degrés — limite volontairement très faible */
      card.style.setProperty("--reg-ry", (px * MAX).toFixed(2) + "deg");
      card.style.setProperty("--reg-rx", (-py * MAX).toFixed(2) + "deg");
    });
    document.addEventListener("pointerleave", function (e) {
      var card = e.target && e.target.closest && e.target.closest(".reg-module");
      if (card) { card.style.removeProperty("--reg-rx"); card.style.removeProperty("--reg-ry"); }
    }, true);
  }

  /* ======================================================================
     16. Utilitaires HTML sûrs
     ====================================================================== */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  /* ======================================================================
     17. INITIALISATION
     ====================================================================== */
  function init() {
    load();
    /* Bannière « inscription restaurée » (affichée seulement à l'étape 1) */
    if (restored) {
      updateRestoredBanner();
      announce(t("reg.a11y_restored", "Votre inscription précédente a été restaurée."));
    }
    renderAll();
    goToStep(state.step, { noFocus: true, noScroll: true });
    setupTilt();

    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheet();
    });
    var payBtn = document.getElementById("reg-pay-btn");
    if (payBtn) payBtn.setAttribute("data-pay", "1");

    /* Re-rendu complet au changement de langue (libellés + montants) */
    document.addEventListener("i18n:changed", function () {
      renderAll();
      if (state.step === 3) fillBillingInputs();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
