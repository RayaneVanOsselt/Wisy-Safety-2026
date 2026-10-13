/* =========================================================================
   WISY SAFETY — Page « Vérification des certificats » (certificats.html) : interface
   -------------------------------------------------------------------------
   Logique pure (validation, client du registre Google Sheets, normalisation) : js/certificats-core.js.
   Ce fichier : console de vérification, résultat (« pass »), états, accessibilité, motif guilloché.

   Règles :
     - tout texte venant du registre est inséré avec textContent (jamais innerHTML) ;
     - rien n'est mémorisé dans le navigateur ; la dernière réponse vit en mémoire le temps de la page
       (pour la retraduire si la langue change) et est effacée par « Nouvelle vérification » ;
     - aucun faux succès : seul un « found » du registre produit une carte « certificat retrouvé » ;
     - mouvement réduit / onglet masqué : le résultat s'affiche directement, sans animation.
   Configuration : js/certificats-config.js (adresse du script Google de la feuille), voir docs/README-CERTIFICATS.md.
   ========================================================================= */
(function () {
  "use strict";

  var C = window.WisyCertificatesCore;
  var form = document.querySelector("[data-cert-form]");
  var consoleBox = document.querySelector("[data-console]");
  if (!C || !form || !consoleBox) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var formView = $("[data-view-form]", consoleBox);
  var resultBox = $("[data-result]", consoleBox);
  var announcer = $("[data-announce]");
  var nameInput = form.elements.lastName;
  var birthInput = form.elements.birthDate;
  var submitBtn = $("[data-submit]", form);
  var summary = $("[data-error-summary]", form);
  var NS = "http://www.w3.org/2000/svg";
  var reduced = function () { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); };
  var calm = function () { return reduced() || document.visibilityState === "hidden"; };

  var state = { last: null, busy: false, attempted: false, epoch: 0 };

  /* ------------------------------------------------------------------ i18n */
  function lang() { return (window.WisyI18N && window.WisyI18N.current()) || document.documentElement.lang || "fr"; }
  function t(key, vars) {
    var v = window.WisyI18N ? window.WisyI18N.get(lang(), key) : null;
    if (v == null && window.WisyI18N) v = window.WisyI18N.get("fr", key);
    if (v == null) v = (window.I18N && window.I18N.fr && window.I18N.fr[key]) || key;
    return String(v).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }

  /* ------------------------------------------------------------------ petits constructeurs DOM */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "wc-ic" + (cls ? " " + cls : ""));
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    var u = document.createElementNS(NS, "use");
    u.setAttribute("href", "#wc-i-" + name);
    s.appendChild(u);
    return s;
  }
  function rosetteSvg(cls) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 120 120");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    if (cls) s.setAttribute("class", cls);
    var u = document.createElementNS(NS, "use");
    u.setAttribute("href", "#wc-rosette");
    s.appendChild(u);
    return s;
  }
  function button(cls, iconName, label, onClick) {
    var b = el("button", "wc-btn" + (cls ? " " + cls : ""));
    b.type = "button";
    if (iconName) b.appendChild(icon(iconName));
    b.appendChild(el("span", null, label));
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  function link(cls, href, iconName, label) {
    var a = el("a", "wc-btn" + (cls ? " " + cls : ""));
    a.href = href;
    if (iconName) a.appendChild(icon(iconName));
    a.appendChild(el("span", null, label));
    return a;
  }
  function announce(text) {
    if (!announcer) return;
    announcer.textContent = "";
    setTimeout(function () { announcer.textContent = text; }, 60);
  }

  /* ------------------------------------------------------------------ validation des champs */
  var NAME_ERR = { required: "cert.err_name_required", invalid: "cert.err_name_invalid", too_long: "cert.err_name_long" };
  var DATE_ERR = { required: "cert.err_date_required", format: "cert.err_date_format", invalid: "cert.err_date_invalid", future: "cert.err_date_future", too_old: "cert.err_date_old" };

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
  function toggleSummary(show) { if (summary) summary.hidden = !show; }

  birthInput.addEventListener("input", function (e) {
    var type = e.inputType || "";
    if (type && type.indexOf("insert") !== 0) { if (state.attempted && validate(false).ok) toggleSummary(false); return; }
    var before = birthInput.value;
    var masked = C.maskBirthInput(before);
    if (masked !== before) {
      var atEnd = birthInput.selectionStart === before.length;
      birthInput.value = masked;
      if (atEnd) birthInput.setSelectionRange(masked.length, masked.length);
    }
    if (state.attempted && validate(false).ok) toggleSummary(false);
  });
  nameInput.addEventListener("input", function () { if (state.attempted && validate(false).ok) toggleSummary(false); });
  [nameInput, birthInput].forEach(function (inp) {
    inp.addEventListener("blur", function () { if (inp.value) validate(false); });
  });

  /* ------------------------------------------------------------------ bascule formulaire ⇄ résultat */
  function swap(showResult, node, focusResult) {
    var apply = function () {
      if (showResult) { resultBox.textContent = ""; resultBox.appendChild(node); }
      formView.hidden = !!showResult;
      resultBox.hidden = !showResult;
      consoleBox.setAttribute("data-view", showResult ? "result" : "form");
    };
    var after = function () {
      if (showResult) {
        startTimelines(resultBox);
        if (focusResult !== false) {
          var f = $("[data-focus]", resultBox);
          if (f) { f.setAttribute("tabindex", "-1"); try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
        }
      }
      if (focusResult === false) return;
      revealConsole();
    };
    if (!calm() && typeof document.startViewTransition === "function") {
      try {
        var vt = document.startViewTransition(apply);
        vt.updateCallbackDone.then(after, function () { apply(); after(); });
        if (vt.finished) vt.finished.catch(function () {});
        return;
      } catch (e) { /* repli ci-dessous */ }
    }
    apply();
    if (!calm()) {
      consoleBox.classList.remove("is-swapping");
      void consoleBox.offsetWidth;
      consoleBox.classList.add("is-swapping");
      setTimeout(function () { consoleBox.classList.remove("is-swapping"); }, 700);
    }
    after();
  }

  /* Défilement jusqu'à la console, sous l'en-tête collant. Sa hauteur change pendant le défilement (le bandeau du haut se
     replie) : on recale une fois l'en-tête stabilisé, pour que le titre du résultat ne passe jamais dessous. */
  function revealConsole() {
    var header = document.querySelector(".site-header");
    var offset = function () { return (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 16; };
    var top = consoleBox.getBoundingClientRect().top;
    if (top >= offset() && top <= window.innerHeight * 0.55) return;
    var behavior = calm() ? "instant" : "smooth";
    try { window.scrollTo({ top: Math.max(0, window.pageYOffset + top - offset()), behavior: behavior }); }
    catch (e) { window.scrollTo(0, Math.max(0, window.pageYOffset + top - offset())); }
    setTimeout(function () {
      var t = consoleBox.getBoundingClientRect().top, o = offset();
      if (t < o - 4) { try { window.scrollBy({ top: t - o, behavior: behavior }); } catch (e) { window.scrollBy(0, t - o); } }
    }, calm() ? 0 : 750);
  }

  /* ------------------------------------------------------------------ effets (21st.dev, portés en natif) */
  /* Text Scramble : le nom du titulaire se « déchiffre » ; le vrai texte est lu par les lecteurs d'écran. */
  var GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  function scramble(node, text, instant) {
    node.textContent = text;
    if (instant || calm() || typeof requestAnimationFrame !== "function") return;
    var chars = Array.from(text), start = null, dur = 700 + Math.min(600, chars.length * 28);
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), shown = Math.floor(p * chars.length), out = "";
      for (var i = 0; i < chars.length; i++) out += i < shown || /\s/.test(chars[i]) ? chars[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      node.textContent = out;
      if (p < 1 && node.isConnected) requestAnimationFrame(frame); else node.textContent = text;
    }
    requestAnimationFrame(frame);
  }
  function startTimelines(root) {
    var go = function () { Array.prototype.forEach.call(root.querySelectorAll(".wc-timeline"), function (tl) { tl.classList.add("is-on"); }); };
    if (calm() || typeof requestAnimationFrame !== "function") go();
    else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }
  /* Card Spotlight : halo qui suit la souris sur la console. */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    consoleBox.addEventListener("pointermove", function (e) {
      var r = consoleBox.getBoundingClientRect();
      consoleBox.style.setProperty("--wc-mx", (e.clientX - r.left) + "px");
      consoleBox.style.setProperty("--wc-my", (e.clientY - r.top) + "px");
    });
  }
  /* Border Beam : un tour de la bordure à l'arrivée. */
  function beamOnce() {
    if (calm()) return;
    consoleBox.classList.remove("is-beaming");
    void consoleBox.offsetWidth;
    consoleBox.classList.add("is-beaming");
    setTimeout(function () { consoleBox.classList.remove("is-beaming"); }, 2400);
  }

  /* ------------------------------------------------------------------ rendu : cartes d'état */
  function notice(kind, iconName, title, text, actions, extra) {
    var box = el("div", "wc-notice wc-notice--" + kind);
    var badge = el("span", "wc-notice__badge");
    badge.appendChild(icon(iconName));
    box.appendChild(badge);
    var h = el("h3", "wc-notice__title", title);
    h.setAttribute("data-focus", "");
    box.appendChild(h);
    box.appendChild(el("p", "wc-notice__text", text));
    if (extra) box.appendChild(extra);
    if (actions && actions.length) {
      var row = el("div", "wc-actions");
      actions.forEach(function (a) { row.appendChild(a); });
      box.appendChild(row);
    }
    return box;
  }
  function contactBtn() { return link("", "contact.html", "mail", t("cert.cta_contact")); }
  function editBtn() { return button("wc-btn--primary", "search", t("cert.cta_edit"), backToForm); }
  function retryBtn() { return button("wc-btn--primary", "refresh", t("cert.cta_retry"), function () { backToForm(); submit(); }); }

  /* ------------------------------------------------------------------ rendu : certificat retrouvé */
  var STATUS = {
    valid: { icon: "check", key: "cert.status_valid", stamp: "cert.stamp_valid", explain: "cert.explain_valid" },
    expired: { icon: "clock", key: "cert.status_expired", stamp: "cert.stamp_expired", explain: "cert.explain_expired" },
    revoked: { icon: "ban", key: "cert.status_revoked", stamp: "cert.stamp_revoked", explain: "cert.explain_revoked" },
    undetermined: { icon: "help", key: "cert.status_undetermined", stamp: "cert.stamp_undetermined", explain: "cert.explain_undetermined" }
  };

  function seal(word) {
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
    p.setAttribute("d", "M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0");
    defs.appendChild(p);
    s.appendChild(defs);
    var ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", "60"); ring.setAttribute("cy", "60"); ring.setAttribute("r", "55");
    ring.setAttribute("class", "wc-seal__ring");
    s.appendChild(ring);
    var txt = document.createElementNS(NS, "text");
    txt.setAttribute("class", "wc-seal__text");
    var tp = document.createElementNS(NS, "textPath");
    tp.setAttribute("href", "#" + id);
    var label = word.toUpperCase() + " · WISY SAFETY · ";
    tp.textContent = (label + label + label).slice(0, 58);
    txt.appendChild(tp);
    s.appendChild(txt);
    return s;
  }

  function dateItem(dl, labelKey, iso, emptyKey, j) {
    var wrap = el("div", "wc-dl__item");
    wrap.style.setProperty("--j", String(j));
    wrap.appendChild(el("dt", null, t(labelKey)));
    var dd = el("dd", iso ? "" : "wc-muted");
    if (iso) { var tm = document.createElement("time"); tm.dateTime = iso; tm.textContent = C.formatDate(iso, lang()); dd.appendChild(tm); }
    else dd.textContent = t(emptyKey || "cert.not_specified");
    wrap.appendChild(dd);
    dl.appendChild(wrap);
  }

  function timeline(cert, today) {
    var prog = C.validityProgress(cert, today);
    if (!prog || cert.status === "revoked") return null;
    var box = el("div", "wc-timeline");
    box.style.setProperty("--wc-progress", String(prog.ratio));
    box.setAttribute("aria-hidden", "true"); // l'information est déjà donnée par le statut et les dates
    var track = el("div", "wc-timeline__track");
    track.appendChild(el("span", "wc-timeline__fill"));
    track.appendChild(el("span", "wc-timeline__today"));
    box.appendChild(track);
    var legend = el("div", "wc-timeline__legend");
    legend.appendChild(el("span", null, C.formatDate(prog.start, lang())));
    legend.appendChild(el("span", "wc-timeline__remaining", prog.remainingDays >= 0
      ? t("cert.tl_remaining", { when: C.relative(prog.remainingDays, lang()) })
      : t("cert.tl_expired", { when: C.relative(prog.remainingDays, lang()) })));
    legend.appendChild(el("span", null, C.formatDate(cert.expiryDate, lang())));
    box.appendChild(legend);
    return box;
  }

  function copyButton(value) {
    var b = el("button", "wc-copy");
    b.type = "button";
    b.setAttribute("aria-label", t("cert.copy_number"));
    b.appendChild(icon("copy", "wc-copy__a"));
    b.appendChild(icon("check", "wc-copy__b"));
    b.addEventListener("click", function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(value).then(function () {
        b.classList.add("is-done");
        b.setAttribute("aria-label", t("cert.copied"));
        announce(t("cert.copied"));
        setTimeout(function () { b.classList.remove("is-done"); b.setAttribute("aria-label", t("cert.copy_number")); }, 1800);
      }, function () {});
    });
    return b;
  }

  function pass(cert, meta, index, total, instant) {
    var st = STATUS[cert.status];
    var card = el("article", "wc-pass wc-pass--" + cert.status);
    card.style.setProperty("--i", String(index));
    var water = el("div", "wc-pass__water");
    water.appendChild(rosetteSvg());
    card.appendChild(water);

    var head = el("header", "wc-pass__head");
    var titles = el("div", "wc-pass__titles");
    titles.appendChild(el("p", "wc-pass__kicker", total > 1 ? t("cert.card_kicker_n", { i: String(index + 1), n: String(total) }) : t("cert.card_kicker")));
    titles.appendChild(el("h4", "wc-pass__training", cert.training));
    var badge = el("p", "wc-status");
    badge.appendChild(icon(st.icon));
    badge.appendChild(el("span", null, t(st.key)));
    titles.appendChild(badge);
    head.appendChild(titles);
    var stamp = el("div", "wc-stamp");
    stamp.appendChild(seal(t(st.stamp)));
    var center = el("span", "wc-stamp__center");
    center.appendChild(icon(st.icon));
    stamp.appendChild(center);
    head.appendChild(stamp);
    card.appendChild(head);

    var dl = el("dl", "wc-dl");
    var holder = el("div", "wc-dl__item wc-dl__item--wide");
    holder.appendChild(el("dt", null, t("cert.f_holder")));
    var hd = el("dd", "wc-holder");
    hd.appendChild(el("span", "wc-sr", cert.holder));
    var scr = el("span");
    scr.setAttribute("aria-hidden", "true");
    hd.appendChild(scr);
    scramble(scr, cert.holder, instant);
    holder.appendChild(hd);
    dl.appendChild(holder);

    var num = el("div", "wc-dl__item wc-dl__item--wide");
    num.style.setProperty("--j", "1");
    num.appendChild(el("dt", null, t("cert.f_number")));
    var ddn = el("dd", cert.certificateNumber ? "wc-number" : "wc-muted");
    if (cert.certificateNumber) {
      ddn.appendChild(el("span", "wc-mono", cert.certificateNumber));
      ddn.appendChild(copyButton(cert.certificateNumber));
    } else ddn.textContent = t("cert.not_specified");
    num.appendChild(ddn);
    dl.appendChild(num);
    dateItem(dl, "cert.f_training_date", cert.trainingDate, null, 2);
    if (cert.issueDate && cert.issueDate !== cert.trainingDate) dateItem(dl, "cert.f_issue_date", cert.issueDate, null, 3);
    dateItem(dl, "cert.f_expiry", cert.expiryDate, "cert.no_expiry", 4);
    card.appendChild(dl);

    var tl = timeline(cert, meta.today || C.todayBrussels());
    if (tl) card.appendChild(tl);

    var explain = el("p", "wc-pass__explain");
    explain.appendChild(icon(st.icon));
    explain.appendChild(el("span", null, t(st.explain, { date: C.formatDate(cert.status === "valid" ? (meta.today || C.todayBrussels()) : cert.expiryDate, lang()) })));
    card.appendChild(explain);
    return card;
  }

  function found(res, instant) {
    var certs = res.certificates;
    var box = el("div", "wc-res");
    var head = el("div", "wc-res__head");
    var txt = el("div");
    var h = el("h3", "wc-res__title", certs.length > 1 ? t("cert.found_title_n", { n: String(certs.length) }) : t("cert.found_title"));
    h.setAttribute("data-focus", "");
    txt.appendChild(h);
    var stamp = C.formatStamp(res.meta.checkedAt, lang(), res.meta.timezone);
    txt.appendChild(el("p", "wc-res__meta", t("cert.checked_at", { date: stamp.date, time: stamp.time })));
    head.appendChild(txt);
    var b = el("span", "wc-res__badge");
    b.appendChild(icon("shield"));
    head.appendChild(b);
    box.appendChild(head);
    var list = el("div", "wc-res__list");
    certs.forEach(function (c, i) { list.appendChild(pass(c, res.meta, i, certs.length, instant)); });
    box.appendChild(list);
    box.appendChild(el("p", "wc-res__disclaimer", t("cert.disclaimer")));
    var row = el("div", "wc-actions");
    row.appendChild(button("", "printer", t("cert.cta_print"), function () { window.print(); }));
    row.appendChild(button("wc-btn--primary", "refresh", t("cert.cta_new"), resetAll));
    box.appendChild(row);
    return box;
  }

  /* ------------------------------------------------------------------ rendu selon le résultat */
  function render(res, instant) {
    state.last = res;
    var kind = res.kind;
    document.body.setAttribute("data-wc-result", kind);
    var focus = instant ? false : true;
    if (kind === "found") {
      swap(true, found(res, instant), focus);
      if (!instant) announce(res.certificates.length > 1 ? t("cert.found_title_n", { n: String(res.certificates.length) }) : t("cert.found_title"));
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
      swap(true, notice("neutral", "search", t("cert.nf_title"), t("cert.nf_text"), [editBtn(), contactBtn()], tips), focus);
      if (!instant) announce(t("cert.nf_title"));
      return;
    }
    if (kind === "invalid") {
      var f = res.fields || {};
      backToForm(true);
      if (f.lastName) showFieldError(nameInput, NAME_ERR[f.lastName] || NAME_ERR.invalid);
      if (f.birthDate) showFieldError(birthInput, DATE_ERR[f.birthDate] || DATE_ERR.invalid);
      toggleSummary(true);
      if (!instant) (f.lastName ? nameInput : birthInput).focus();
      return;
    }
    if (kind === "rate_limited") {
      swap(true, notice("warn", "gauge", t("cert.rl_title"), t("cert.rl_text", { n: String(Math.max(1, Math.ceil(res.retryAfter / 60))) }), [contactBtn()]), focus);
      if (!instant) announce(t("cert.rl_title"));
      return;
    }
    if (kind === "not_configured") {
      swap(true, notice("info", "clock", t("cert.soon_title"), t("cert.soon_text"), [button("wc-btn--primary", "search", t("cert.cta_edit"), backToForm), contactBtn()]), focus);
      if (!instant) announce(t("cert.soon_title"));
      return;
    }
    swap(true, notice("error", "alert", t("cert.err_title"), t("cert.err_text"), [retryBtn(), contactBtn()]), focus);
    if (!instant) announce(t("cert.err_title"));
  }

  function setBusy(busy) {
    state.busy = busy;
    consoleBox.classList.toggle("is-busy", busy);
    submitBtn.disabled = busy;
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
    if (!v.ok) { (v.nameError ? nameInput : birthInput).focus(); return; }
    var epoch = ++state.epoch;
    setBusy(true);
    announce(t("cert.loading"));
    var minDelay = new Promise(function (r) { setTimeout(r, calm() ? 0 : 900); });
    var call = C.verify({ config: window.WISY_CERTIFICATS, lastName: v.name, birthDate: v.iso, fetch: window.fetch ? window.fetch.bind(window) : null });
    Promise.all([call, minDelay]).then(function (out) {
      if (epoch !== state.epoch) return; // une nouvelle recherche a été lancée entre-temps
      setBusy(false);
      render(out[0]);
    });
    /* Mesure d'audience (si consentie) : aucune donnée saisie dans l'événement. */
    if (window.WisyChrome && window.WisyChrome.track) window.WisyChrome.track("certificate_verify", {});
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  /* Retour au formulaire en gardant la saisie (corriger une faute de frappe). */
  function backToForm(silent) {
    state.last = null;
    document.body.removeAttribute("data-wc-result");
    if (!resultBox.hidden) swap(false);
    if (silent !== true) { nameInput.focus(); nameInput.select(); }
  }

  function resetAll() {
    state.epoch++;
    state.last = null;
    state.attempted = false;
    form.reset();
    [nameInput, birthInput].forEach(function (i) { showFieldError(i, ""); });
    toggleSummary(false);
    setBusy(false);
    document.body.removeAttribute("data-wc-result");
    swap(false);
    resultBox.textContent = "";
    nameInput.focus();
  }

  /* Retour arrière depuis une autre page (cache « back/forward ») : on efface tout. */
  window.addEventListener("pageshow", function (e) { if (e.persisted) resetAll(); });

  /* Changement de langue : on retraduit le dernier résultat (gardé en mémoire uniquement), sans rejouer les animations. */
  document.addEventListener("i18n:changed", function () {
    if (state.last && state.last.kind !== "invalid") render(state.last, true);
    [nameInput, birthInput].forEach(function (i) {
      var box = document.getElementById(i.id + "-error");
      if (box && !box.hidden && box.getAttribute("data-key")) showFieldError(i, box.getAttribute("data-key"));
    });
    setBusy(state.busy);
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
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", rosette(48, 15, 21, 15, 900));
      p.setAttribute("transform", "translate(60 60) scale(.9)");
      /* Attributs posés sur le tracé lui-même : les règles CSS ne traversent pas <use> (sinon : disque noir). */
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", ".6");
      sym.appendChild(p);
    }
    var host = document.querySelector("[data-guilloche]");
    if (!host || host.childNodes.length) return;
    [[300, 95, 130, 19, 1600], [260, 65, 95, 13, 1300], [210, 47, 60, 47, 2200], [150, 29, 41, 29, 1500]].forEach(function (L, i) {
      var g = document.createElementNS(NS, "path");
      g.setAttribute("d", rosette(L[0], L[1], L[2], L[3], L[4]));
      g.setAttribute("class", "wc-guilloche__line wc-guilloche__line--" + i);
      g.setAttribute("pathLength", "1");
      host.appendChild(g);
    });
    var draw = function () { host.classList.add("is-drawn"); };
    if (calm() || typeof requestAnimationFrame !== "function") draw();
    else requestAnimationFrame(function () { requestAnimationFrame(draw); });
  }

  /* ------------------------------------------------------------------ démarrage */
  drawGuilloche();
  setTimeout(beamOnce, 450);

  window.WisyCertificates = { reset: resetAll, submit: submit, render: render };
})();
