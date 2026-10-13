/* =========================================================================
   WISY SAFETY — Page « Vérification des certificats » (certificats.html) : interface
   -------------------------------------------------------------------------
   Logique pure (validation, client API, normalisation) : js/certificats-core.js.
   Ce fichier : formulaire, états (chargement, résultat, erreurs), accessibilité, impression, motif guilloché.

   Règles :
     - tout texte venant de l'API est inséré avec textContent (jamais innerHTML) ;
     - rien n'est mémorisé dans le navigateur ; la dernière réponse vit en mémoire le temps de la page
       (pour la retraduire si la langue change) et est effacée par « Nouvelle recherche » ;
     - aucun faux succès : seul un « found » de l'API produit une carte « certificat retrouvé ».
   L'adresse de l'API est l'attribut data-api-base du formulaire (voir docs/README-CERTIFICATS.md).
   ========================================================================= */
(function () {
  "use strict";

  var C = window.WisyCertificatesCore;
  var form = document.querySelector("[data-cert-form]");
  if (!C || !form) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var resultBox = $("[data-result]");
  var announcer = $("[data-announce]");
  var statusPill = $("[data-service-status]");
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  var nameInput = form.elements.lastName;
  var birthInput = form.elements.birthDate;
  var submitBtn = $("[data-submit]", form);
  var summary = $("[data-error-summary]", form);
  var reduced = function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; };

  var state = { last: null, busy: false, attempted: false, challenge: null, challengeToken: "", docTimers: [], epoch: 0 };

  /* ------------------------------------------------------------------ i18n */
  function lang() { return (window.WisyI18N && window.WisyI18N.current()) || document.documentElement.lang || "fr"; }
  function t(key, vars) {
    var v = window.WisyI18N ? window.WisyI18N.get(lang(), key) : null;
    if (v == null && window.WisyI18N) v = window.WisyI18N.get("fr", key);
    if (v == null) v = (window.I18N && window.I18N.fr && window.I18N.fr[key]) || key;
    return String(v).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }
  function apiBaseValue() { return form.getAttribute("data-api-base") || ""; }

  /* ------------------------------------------------------------------ petits constructeurs DOM */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "wc-ic" + (cls ? " " + cls : ""));
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#wc-i-" + name);
    s.appendChild(u);
    return s;
  }
  function button(cls, iconName, label) {
    var b = el("button", "btn " + cls);
    b.type = "button";
    if (iconName) b.appendChild(icon(iconName));
    b.appendChild(el("span", null, label));
    return b;
  }
  function link(cls, href, iconName, label) {
    var a = el("a", "btn " + cls);
    a.href = href;
    if (iconName) a.appendChild(icon(iconName));
    a.appendChild(el("span", null, label));
    return a;
  }

  /* ------------------------------------------------------------------ étapes & annonces */
  function setStep(n) {
    steps.forEach(function (s) {
      var i = +s.getAttribute("data-step");
      s.classList.toggle("is-done", i < n);
      s.classList.toggle("is-current", i === n);
      if (i === n) s.setAttribute("aria-current", "step"); else s.removeAttribute("aria-current");
    });
  }
  function announce(text) {
    if (!announcer) return;
    announcer.textContent = "";
    setTimeout(function () { announcer.textContent = text; }, 60);
  }

  /* ------------------------------------------------------------------ état du service */
  function setService(stateName) {
    if (!statusPill) return;
    statusPill.setAttribute("data-state", stateName);
    var txt = $("[data-service-text]", statusPill);
    var map = { checking: "cert.service_checking", ok: "cert.service_ok", unavailable: "cert.service_down", not_configured: "cert.service_soon" };
    if (txt) { txt.setAttribute("data-i18n", map[stateName]); txt.textContent = t(map[stateName]); }
  }
  function refreshHealth() {
    setService("checking");
    return C.health({ base: apiBaseValue(), fetch: window.fetch.bind(window) }).then(function (h) {
      setService(h.state);
      state.challenge = h.challenge;
      return h;
    });
  }

  /* ------------------------------------------------------------------ Turnstile (facultatif, si l'extension le demande) */
  var turnstileLoading = null;
  function ensureChallenge() {
    if (!state.challenge || state.challenge.provider !== "turnstile") return Promise.resolve();
    var box = $("[data-challenge]", form);
    if (!box) return Promise.resolve();
    box.hidden = false;
    if (!turnstileLoading) {
      turnstileLoading = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).then(function () {
        window.turnstile.render(box, { sitekey: state.challenge.siteKey, language: lang(), callback: function (tok) { state.challengeToken = tok; }, "expired-callback": function () { state.challengeToken = ""; } });
      }).catch(function () { turnstileLoading = null; });
    }
    return turnstileLoading;
  }

  /* ------------------------------------------------------------------ validation des champs */
  var NAME_ERR = { required: "cert.err_name_required", invalid: "cert.err_name_invalid", too_long: "cert.err_name_long" };
  var DATE_ERR = { required: "cert.err_date_required", format: "cert.err_date_format", invalid: "cert.err_date_invalid", future: "cert.err_date_future", too_old: "cert.err_date_old", out_of_range: "cert.err_date_old" };

  function showFieldError(input, key) {
    var box = document.getElementById(input.id + "-error");
    var field = input.closest(".wc-field");
    if (key) {
      input.setAttribute("aria-invalid", "true");
      if (box) { box.hidden = false; box.setAttribute("data-key", key); $("[data-error-text]", box).textContent = t(key); }
      if (field) field.classList.add("is-invalid");
    } else {
      input.removeAttribute("aria-invalid");
      if (box) { box.hidden = true; box.removeAttribute("data-key"); }
      if (field) field.classList.remove("is-invalid");
    }
  }
  function validate(showAll) {
    var n = C.validateName(nameInput.value);
    var d = C.parseBirthDate(birthInput.value, C.todayBrussels());
    if (showAll || nameInput.value) showFieldError(nameInput, n.error ? NAME_ERR[n.error] : "");
    if (showAll || birthInput.value) showFieldError(birthInput, d.error ? DATE_ERR[d.error] : "");
    return { ok: !n.error && !d.error, name: n.value, iso: d.iso, nameError: n.error, dateError: d.error };
  }
  function toggleSummary(show) {
    if (!summary) return;
    summary.hidden = !show;
  }

  birthInput.addEventListener("input", function (e) {
    var type = e.inputType || "";
    if (type && type.indexOf("insert") !== 0) { if (state.attempted) validate(false); return; }
    var before = birthInput.value;
    var masked = C.maskBirthInput(before);
    if (masked !== before) {
      var atEnd = birthInput.selectionStart === before.length;
      birthInput.value = masked;
      if (atEnd) birthInput.setSelectionRange(masked.length, masked.length);
    }
    if (state.attempted) validate(false);
  });
  nameInput.addEventListener("input", function () { if (state.attempted) validate(false); });
  [nameInput, birthInput].forEach(function (inp) {
    inp.addEventListener("blur", function () { if (inp.value) validate(false); });
    inp.addEventListener("focus", function () { if (state.challenge) ensureChallenge(); }, { once: true });
  });

  /* ------------------------------------------------------------------ rendu : commun */
  function clearDocTimers() { state.docTimers.forEach(clearTimeout); state.docTimers = []; }
  function mount(node, focusTarget) { /* focusTarget === false : pas de déplacement du focus */
    clearDocTimers();
    resultBox.textContent = "";
    resultBox.appendChild(node);
    resultBox.removeAttribute("aria-busy");
    resultBox.classList.remove("is-loading");
    if (focusTarget === false) return;
    /* Le titre du résultat reçoit le focus : les lecteurs d'écran le lisent, le clavier repart de là. */
    var f = $("[data-focus]", node);
    if (f) {
      f.setAttribute("tabindex", "-1");
      try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    }
    var rect = resultBox.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.6) resultBox.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  function idle() {
    var box = el("div", "wc-idle");
    var seal = el("div", "wc-idle__seal");
    seal.appendChild(svgSeal());
    box.appendChild(seal);
    box.appendChild(el("p", "wc-idle__title", t("cert.idle_title")));
    box.appendChild(el("p", "wc-idle__text", t("cert.idle_text")));
    return box;
  }

  function loading() {
    var box = el("div", "wc-loading");
    box.setAttribute("role", "presentation");
    var scan = el("div", "wc-scan");
    for (var i = 0; i < 4; i++) scan.appendChild(el("span", "wc-scan__line"));
    box.appendChild(scan);
    box.appendChild(el("p", "wc-loading__text", t("cert.loading")));
    return box;
  }

  /** Carte d'état neutre (aucun résultat, erreur, limite, service bientôt disponible). */
  function notice(kind, iconName, title, text, actions, extra) {
    var box = el("div", "wc-notice wc-notice--" + kind);
    var head = el("div", "wc-notice__head");
    var badge = el("span", "wc-notice__badge");
    badge.appendChild(icon(iconName));
    head.appendChild(badge);
    var h = el("h3", "wc-notice__title", title);
    h.setAttribute("data-focus", "");
    head.appendChild(h);
    box.appendChild(head);
    box.appendChild(el("p", "wc-notice__text", text));
    if (extra) box.appendChild(extra);
    if (actions && actions.length) {
      var row = el("div", "wc-actions");
      actions.forEach(function (a) { row.appendChild(a); });
      box.appendChild(row);
    }
    return box;
  }
  function contactBtn() { return link("btn--outline", "contact.html", "mail", t("cert.cta_contact")); }
  function editBtn() {
    var b = button("btn--cta", "search", t("cert.cta_edit"));
    b.addEventListener("click", function () { nameInput.focus(); nameInput.select(); });
    return b;
  }
  function retryBtn() {
    var b = button("btn--cta", "refresh", t("cert.cta_retry"));
    b.addEventListener("click", function () { if (typeof form.requestSubmit === "function") form.requestSubmit(); else submit(); });
    return b;
  }

  /* ------------------------------------------------------------------ rendu : certificat */
  var STATUS = {
    valid: { icon: "check", key: "cert.status_valid", stamp: "cert.stamp_valid", explain: "cert.explain_valid" },
    expired: { icon: "clock", key: "cert.status_expired", stamp: "cert.stamp_expired", explain: "cert.explain_expired" },
    revoked: { icon: "ban", key: "cert.status_revoked", stamp: "cert.stamp_revoked", explain: "cert.explain_revoked" },
    undetermined: { icon: "alert", key: "cert.status_undetermined", stamp: "cert.stamp_undetermined", explain: "cert.explain_undetermined" }
  };

  function svgSeal(word) {
    var NS = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 120 120");
    s.setAttribute("class", "wc-seal");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var use = document.createElementNS(NS, "use");
    use.setAttribute("href", "#wc-rosette");
    use.setAttribute("class", "wc-seal__rosette");
    s.appendChild(use);
    var id = "wc-arc-" + Math.random().toString(36).slice(2, 8);
    var defs = document.createElementNS(NS, "defs");
    var p = document.createElementNS(NS, "path");
    p.setAttribute("id", id);
    p.setAttribute("d", "M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0");
    defs.appendChild(p);
    s.appendChild(defs);
    var ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", "60"); ring.setAttribute("cy", "60"); ring.setAttribute("r", "53");
    ring.setAttribute("class", "wc-seal__ring");
    s.appendChild(ring);
    var txt = document.createElementNS(NS, "text");
    txt.setAttribute("class", "wc-seal__text");
    var tp = document.createElementNS(NS, "textPath");
    tp.setAttribute("href", "#" + id);
    tp.setAttribute("startOffset", "0");
    var label = (word ? word + " · " : "") + "WISY SAFETY · ";
    tp.textContent = (label + label + label).slice(0, 60);
    txt.appendChild(tp);
    s.appendChild(txt);
    return s;
  }

  function dateRow(dl, labelKey, iso, empty) {
    var wrap = el("div", "wc-dl__item");
    wrap.appendChild(el("dt", null, t(labelKey)));
    var dd = el("dd", iso ? "wc-mono" : "wc-muted", iso ? C.formatDate(iso, lang()) : t(empty || "cert.not_specified"));
    if (iso) { var tm = document.createElement("time"); tm.dateTime = iso; tm.textContent = dd.textContent; dd.textContent = ""; dd.appendChild(tm); }
    wrap.appendChild(dd);
    dl.appendChild(wrap);
  }

  function timeline(cert, today) {
    var prog = C.validityProgress(cert, today);
    if (!prog || cert.status === "revoked") return null;
    var box = el("div", "wc-timeline wc-timeline--" + cert.status);
    var track = el("div", "wc-timeline__track");
    var fill = el("span", "wc-timeline__fill");
    fill.style.setProperty("--wc-progress", String(prog.ratio));
    track.appendChild(fill);
    var mark = el("span", "wc-timeline__today");
    mark.style.setProperty("--wc-progress", String(prog.ratio));
    mark.appendChild(el("span", "wc-timeline__today-label", t("cert.tl_today")));
    track.appendChild(mark);
    box.appendChild(track);
    var legend = el("div", "wc-timeline__legend");
    legend.appendChild(el("span", null, C.formatDate(prog.start, lang())));
    legend.appendChild(el("span", "wc-timeline__remaining", prog.remainingDays >= 0
      ? t("cert.tl_remaining", { when: C.relative(prog.remainingDays, lang()) })
      : t("cert.tl_expired", { when: C.relative(prog.remainingDays, lang()) })));
    legend.appendChild(el("span", null, C.formatDate(cert.expiryDate, lang())));
    box.appendChild(legend);
    box.setAttribute("aria-hidden", "true"); // résumé textuel déjà donné par le statut et les dates
    return box;
  }

  function documentBlock(cert) {
    var wrap = el("div", "wc-doc");
    if (!cert.document.available) {
      var why = { missing: "cert.doc_missing", not_authorized: "cert.doc_not_authorized", revoked: "cert.doc_revoked" }[cert.document.reason] || "cert.doc_missing";
      var p = el("p", "wc-doc__none");
      p.appendChild(icon("file"));
      p.appendChild(el("span", null, t(why)));
      wrap.appendChild(p);
      return wrap;
    }
    /* Formulaire POST vers l'API (nouvel onglet) : le jeton ne passe jamais dans une URL. */
    var f = el("form", "wc-doc__form");
    f.method = "post";
    f.action = C.apiBase(apiBaseValue()) + "/document";
    f.target = "_blank";
    var hidden = document.createElement("input");
    hidden.type = "hidden"; hidden.name = "token"; hidden.value = cert.document.token;
    f.appendChild(hidden);
    var b = el("button", "btn btn--cta wc-doc__btn");
    b.type = "submit";
    b.appendChild(icon("file"));
    b.appendChild(el("span", null, t("cert.doc_open")));
    b.appendChild(el("span", "wc-sr", t("cert.new_tab")));
    f.appendChild(b);
    var note = el("p", "wc-doc__note", t("cert.doc_expires", { n: String(Math.round(cert.document.expiresIn / 60)) }));
    f.appendChild(note);
    wrap.appendChild(f);
    state.docTimers.push(setTimeout(function () {
      b.disabled = true;
      hidden.value = "";
      note.textContent = t("cert.doc_link_expired");
      note.classList.add("is-expired");
    }, cert.document.expiresIn * 1000));
    return wrap;
  }

  function copyButton(value) {
    var b = el("button", "wc-copy");
    b.type = "button";
    b.setAttribute("aria-label", t("cert.copy_number"));
    b.appendChild(icon("copy", "wc-copy__a"));
    b.appendChild(icon("check", "wc-copy__b"));
    b.addEventListener("click", function () {
      var done = function () {
        b.classList.add("is-done");
        b.setAttribute("aria-label", t("cert.copied"));
        announce(t("cert.copied"));
        setTimeout(function () { b.classList.remove("is-done"); b.setAttribute("aria-label", t("cert.copy_number")); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, function () {});
    });
    return b;
  }

  function certificateCard(cert, meta, index, total) {
    var st = STATUS[cert.status];
    var card = el("article", "wc-card wc-card--" + cert.status);
    card.style.setProperty("--i", String(index));
    var water = el("div", "wc-card__water");
    water.setAttribute("aria-hidden", "true");
    var ws = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ws.setAttribute("viewBox", "0 0 120 120");
    ws.setAttribute("focusable", "false");
    var wu = document.createElementNS("http://www.w3.org/2000/svg", "use");
    wu.setAttribute("href", "#wc-rosette");
    ws.appendChild(wu);
    water.appendChild(ws);
    card.appendChild(water);

    var head = el("header", "wc-card__head");
    var titles = el("div", "wc-card__titles");
    titles.appendChild(el("p", "wc-card__kicker", total > 1 ? t("cert.card_kicker_n", { i: String(index + 1), n: String(total) }) : t("cert.card_kicker")));
    var h = el("h4", "wc-card__training", cert.training);
    titles.appendChild(h);
    var badge = el("p", "wc-status wc-status--" + cert.status);
    badge.appendChild(icon(st.icon));
    badge.appendChild(el("span", null, t(st.key)));
    titles.appendChild(badge);
    head.appendChild(titles);
    var stamp = el("div", "wc-stamp wc-stamp--" + cert.status);
    stamp.appendChild(svgSeal(t(st.stamp)));
    var center = el("span", "wc-stamp__center");
    center.appendChild(icon(st.icon));
    stamp.appendChild(center);
    head.appendChild(stamp);
    card.appendChild(head);

    var explainVars = { date: C.formatDate(cert.status === "valid" ? (meta.today || C.todayBrussels()) : cert.expiryDate, lang()) };
    card.appendChild(el("p", "wc-card__explain", t(st.explain, explainVars)));

    var dl = el("dl", "wc-dl");
    var holder = el("div", "wc-dl__item wc-dl__item--wide");
    holder.appendChild(el("dt", null, t("cert.f_holder")));
    holder.appendChild(el("dd", "wc-holder", cert.holder));
    dl.appendChild(holder);
    var num = el("div", "wc-dl__item wc-dl__item--wide");
    num.appendChild(el("dt", null, t("cert.f_number")));
    var ddn = el("dd", cert.diplomaNumber ? "wc-number" : "wc-muted");
    if (cert.diplomaNumber) {
      ddn.appendChild(el("span", "wc-mono", cert.diplomaNumber));
      ddn.appendChild(copyButton(cert.diplomaNumber));
    } else ddn.textContent = t("cert.not_specified");
    num.appendChild(ddn);
    dl.appendChild(num);
    dateRow(dl, "cert.f_training_date", cert.trainingDate);
    if (cert.issueDate) dateRow(dl, "cert.f_issue_date", cert.issueDate);
    dateRow(dl, "cert.f_expiry", cert.expiryDate, "cert.no_expiry");
    card.appendChild(dl);

    var tl = timeline(cert, meta.today);
    if (tl) card.appendChild(tl);
    card.appendChild(documentBlock(cert));
    return card;
  }

  function found(res) {
    var certs = res.certificates;
    var box = el("div", "wc-found");
    var head = el("div", "wc-found__head");
    var h = el("h3", "wc-found__title", certs.length > 1 ? t("cert.found_title_n", { n: String(certs.length) }) : t("cert.found_title"));
    h.setAttribute("data-focus", "");
    head.appendChild(h);
    var stamp = C.formatStamp(res.meta.checkedAt, lang(), res.meta.timezone);
    head.appendChild(el("p", "wc-found__meta", t("cert.checked_at", { date: stamp.date, time: stamp.time })));
    box.appendChild(head);
    var list = el("div", "wc-found__list");
    certs.forEach(function (c, i) { list.appendChild(certificateCard(c, res.meta, i, certs.length)); });
    box.appendChild(list);
    box.appendChild(el("p", "wc-found__disclaimer", t("cert.disclaimer")));
    var row = el("div", "wc-actions wc-actions--end");
    var print = button("btn--outline", "printer", t("cert.cta_print"));
    print.addEventListener("click", function () { window.print(); });
    var again = button("btn--outline", "refresh", t("cert.cta_new"));
    again.addEventListener("click", resetAll);
    row.appendChild(print);
    row.appendChild(again);
    box.appendChild(row);
    return box;
  }

  /* ------------------------------------------------------------------ rendu selon le résultat */
  function render(res) {
    state.last = res;
    var kind = res.kind;
    document.body.setAttribute("data-wc-result", kind);
    if (kind === "found") {
      mount(found(res));
      setStep(3);
      announce(res.certificates.length > 1 ? t("cert.found_title_n", { n: String(res.certificates.length) }) : t("cert.found_title"));
      return;
    }
    if (kind === "not_found") {
      var tips = el("ul", "wc-tips");
      ["cert.tip_spelling", "cert.tip_date", "cert.tip_compound"].forEach(function (k) {
        var li = el("li");
        li.appendChild(icon("check"));
        li.appendChild(el("span", null, t(k)));
        tips.appendChild(li);
      });
      mount(notice("neutral", "search", t("cert.nf_title"), t("cert.nf_text"), [editBtn(), contactBtn()], tips));
      setStep(3);
      announce(t("cert.nf_title"));
      return;
    }
    if (kind === "invalid") {
      var f = res.fields || {};
      if (f.lastName) showFieldError(nameInput, NAME_ERR[f.lastName] || NAME_ERR.invalid);
      if (f.birthDate) showFieldError(birthInput, DATE_ERR[f.birthDate] || DATE_ERR.invalid);
      toggleSummary(true);
      mount(idle(), false);
      setStep(1);
      (f.lastName ? nameInput : birthInput).focus();
      return;
    }
    if (kind === "rate_limited") {
      mount(notice("warn", "gauge", t("cert.rl_title"), t("cert.rl_text", { n: String(Math.max(1, Math.ceil(res.retryAfter / 60))) }), [contactBtn()]));
      setStep(2);
      announce(t("cert.rl_title"));
      return;
    }
    if (kind === "challenge") {
      mount(notice("warn", "shield", t("cert.ch_title"), t("cert.ch_text"), [retryBtn()]));
      setStep(2);
      if (window.turnstile) try { window.turnstile.reset(); } catch (e) { /* ignoré */ }
      return;
    }
    if (kind === "not_configured") {
      mount(notice("info", "clock", t("cert.soon_title"), t("cert.soon_text"), [contactBtn()]));
      setStep(2);
      announce(t("cert.soon_title"));
      return;
    }
    mount(notice("error", "alert", t("cert.err_title"), t("cert.err_text"), [retryBtn(), contactBtn()]));
    setStep(2);
    announce(t("cert.err_title"));
  }

  function setBusy(busy) {
    state.busy = busy;
    form.classList.toggle("is-busy", busy);
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-disabled", busy ? "true" : "false");
    var label = $("[data-submit-label]", submitBtn);
    label.setAttribute("data-i18n", busy ? "cert.submit_busy" : "cert.submit");
    label.textContent = t(busy ? "cert.submit_busy" : "cert.submit");
  }

  /* ------------------------------------------------------------------ soumission */
  function submit() {
    if (state.busy) return;
    state.attempted = true;
    var v = validate(true);
    toggleSummary(!v.ok);
    if (!v.ok) {
      (v.nameError ? nameInput : birthInput).focus();
      setStep(1);
      return;
    }
    if (state.challenge && !state.challengeToken) {
      ensureChallenge();
      render({ kind: "challenge" });
      return;
    }
    var epoch = ++state.epoch;
    setBusy(true);
    setStep(2);
    resultBox.setAttribute("aria-busy", "true");
    resultBox.classList.add("is-loading");
    resultBox.textContent = "";
    resultBox.appendChild(loading());
    announce(t("cert.loading"));
    var minDelay = new Promise(function (r) { setTimeout(r, reduced() ? 0 : 650); });
    var call = C.verify({ base: apiBaseValue(), lastName: v.name, birthDate: v.iso, challenge: state.challengeToken, fetch: window.fetch.bind(window) });
    Promise.all([call, minDelay]).then(function (out) {
      if (epoch !== state.epoch) return; // une nouvelle recherche a été lancée entre-temps
      setBusy(false);
      state.challengeToken = "";
      render(out[0]);
    });
    if (window.WisyChrome && window.WisyChrome.track) window.WisyChrome.track("certificate_verify", {}); // aucune donnée saisie dans l'événement
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  function resetAll() {
    state.epoch++;
    state.last = null;
    state.attempted = false;
    clearDocTimers();
    form.reset();
    [nameInput, birthInput].forEach(function (i) { showFieldError(i, ""); });
    toggleSummary(false);
    setBusy(false);
    document.body.removeAttribute("data-wc-result");
    mount(idle(), false);
    setStep(1);
    nameInput.focus();
  }

  /* Retour arrière depuis l'onglet du PDF ou une autre page (cache « back/forward ») : on efface tout. */
  window.addEventListener("pageshow", function (e) { if (e.persisted) resetAll(); });

  /* Changement de langue : on retraduit le dernier résultat (gardé en mémoire uniquement). */
  document.addEventListener("i18n:changed", function () {
    if (state.last && state.last.kind !== "invalid") render(state.last);
    else if (!state.busy) mount(idle(), false);
    [nameInput, birthInput].forEach(function (i) {
      var box = document.getElementById(i.id + "-error");
      if (box && !box.hidden && box.getAttribute("data-key")) showFieldError(i, box.getAttribute("data-key"));
    });
    if (statusPill) setService(statusPill.getAttribute("data-state") || "checking");
  });

  /* ------------------------------------------------------------------ motif guilloché (papier de sécurité) */
  function rosette(R, r, d, turns, steps) {
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * Math.PI * 2 * turns;
      var x = (R - r) * Math.cos(th) + d * Math.cos(((R - r) / r) * th);
      var y = (R - r) * Math.sin(th) - d * Math.sin(((R - r) / r) * th);
      pts.push((i ? "L" : "M") + x.toFixed(2) + "," + y.toFixed(2));
    }
    return pts.join("");
  }
  function drawGuilloche() {
    var sym = document.getElementById("wc-rosette");
    if (sym && !sym.firstChild) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", rosette(48, 15, 21, 15, 900));
      p.setAttribute("transform", "translate(60 60) scale(.9)");
      sym.appendChild(p);
    }
    var host = document.querySelector("[data-guilloche]");
    if (!host || host.childNodes.length) return;
    var NS = "http://www.w3.org/2000/svg";
    var layers = [[300, 95, 130, 19, 1600], [260, 65, 95, 13, 1300], [210, 47, 60, 47, 2200], [150, 29, 41, 29, 1500]];
    layers.forEach(function (L, i) {
      var g = document.createElementNS(NS, "path");
      g.setAttribute("d", rosette(L[0], L[1], L[2], L[3], L[4]));
      g.setAttribute("class", "wc-guilloche__line wc-guilloche__line--" + i);
      g.setAttribute("pathLength", "1");
      host.appendChild(g);
    });
    requestAnimationFrame(function () { host.classList.add("is-drawn"); });
  }

  /* ------------------------------------------------------------------ démarrage */
  drawGuilloche();
  mount(idle(), false);
  setStep(1);
  refreshHealth();

  window.WisyCertificates = { refreshHealth: refreshHealth, reset: resetAll, submit: submit };
})();
