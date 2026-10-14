/* =========================================================================
   WISY SAFETY — Page « Vérification des certificats » (certificats.html) : interface
   -------------------------------------------------------------------------
   Logique pure (validation, client du registre Google Sheets, normalisation) : js/certificats-core.js.
   Ce fichier : barre de recherche, section « Résultat » (document vérifié), états, accessibilité, lecteur des quatre
   statuts, effets (halo qui suit la souris, certificat holographique incliné, cartes lumineuses, compteurs, guilloché).

   Règles :
     - tout texte venant du registre est inséré avec textContent (jamais innerHTML) ;
     - rien n'est mémorisé dans le navigateur ; la dernière réponse vit en mémoire le temps de la page
       (pour la retraduire si la langue change) et est effacée par « Nouvelle vérification » ;
     - aucun faux succès : seul un « found » du registre produit un document « certificat retrouvé » ;
     - mouvement réduit / onglet masqué : tout s'affiche directement, sans animation.
   Configuration : js/certificats-config.js (adresse du script Google de la feuille), voir docs/README-CERTIFICATS.md.
   ========================================================================= */
(function () {
  "use strict";

  var C = window.WisyCertificatesCore;
  var form = document.querySelector("[data-cert-form]");
  var results = document.querySelector("[data-results]");
  var hero = document.querySelector("[data-hero]");
  if (!C || !form || !results) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var resultBox = $("[data-result]", results);
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
  function rosetteSvg() {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 120 120");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
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

  /* Défilement sous l'en-tête collant (sa hauteur change pendant le défilement : on recale une fois stabilisé). */
  function scrollToEl(target, always) {
    var header = document.querySelector(".site-header");
    var offset = function () { return (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 16; };
    var top = target.getBoundingClientRect().top;
    if (!always && top >= offset() && top <= window.innerHeight * 0.55) return;
    var behavior = calm() ? "instant" : "smooth";
    try { window.scrollTo({ top: Math.max(0, window.pageYOffset + top - offset()), behavior: behavior }); }
    catch (e) { window.scrollTo(0, Math.max(0, window.pageYOffset + top - offset())); }
    setTimeout(function () {
      var tt = target.getBoundingClientRect().top, o = offset();
      if (tt < o - 4) { try { window.scrollBy({ top: tt - o, behavior: behavior }); } catch (e) { window.scrollBy(0, tt - o); } }
    }, calm() ? 0 : 750);
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
  function revalidate() { if (state.attempted && validate(false).ok) toggleSummary(false); }

  birthInput.addEventListener("input", function (e) {
    var type = e.inputType || "";
    if (!type || type.indexOf("insert") === 0) {
      var before = birthInput.value;
      var masked = C.maskBirthInput(before);
      if (masked !== before) {
        var atEnd = birthInput.selectionStart === before.length;
        birthInput.value = masked;
        if (atEnd) birthInput.setSelectionRange(masked.length, masked.length);
      }
    }
    revalidate();
  });
  nameInput.addEventListener("input", revalidate);
  [nameInput, birthInput].forEach(function (inp) {
    inp.addEventListener("blur", function () { if (inp.value) validate(false); });
  });
  /* Cliquer n'importe où dans une case de la barre place le curseur dans son champ. */
  $$(".wc-field", form).forEach(function (f) {
    f.addEventListener("click", function (e) { var i = $("input", f); if (i && e.target !== i) i.focus(); });
  });

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
    var go = function () { $$(".wc-timeline", root).forEach(function (tl) { tl.classList.add("is-on"); }); };
    if (calm() || typeof requestAnimationFrame !== "function") go();
    else requestAnimationFrame(function () { requestAnimationFrame(go); });
  }
  var finePointer = function () { return !reduced() && !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches); };
  /* Suivi de la souris limité à une mise à jour par image. */
  function onPointer(target, fn, leave) {
    var raf = 0, last = null;
    target.addEventListener("pointermove", function (e) {
      last = e;
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; fn(last); });
    });
    target.addEventListener("pointerleave", function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } leave(); });
  }
  if (typeof requestAnimationFrame === "function" && finePointer()) {
    /* Spotlight (21st.dev) : halo et grille allumée sous la souris, lueurs du fond légèrement décalées. */
    if (hero) onPointer(hero, function (e) {
      var r = hero.getBoundingClientRect();
      hero.classList.add("is-lit");
      hero.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
      hero.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
      hero.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    }, function () { hero.classList.remove("is-lit"); });
    /* 3D Card + Holographic card : le certificat d'exemple s'incline, le reflet irisé et le sceau suivent la souris. */
    var visual = $("[data-tilt]"), holo = $("[data-holo]");
    if (visual && holo) onPointer(visual, function (e) {
      var r = visual.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      holo.classList.add("is-tracking");
      holo.style.setProperty("--ry", ((x - 0.5) * 24).toFixed(2) + "deg");
      holo.style.setProperty("--rx", (-(y - 0.5) * 18).toFixed(2) + "deg");
      holo.style.setProperty("--px", x.toFixed(3));
      holo.style.setProperty("--py", y.toFixed(3));
    }, function () {
      holo.classList.remove("is-tracking");
      ["--rx", "--ry", "--px", "--py"].forEach(function (p) { holo.style.removeProperty(p); });
    });
    /* Glowing cards (21st.dev) : chaque carte de la mosaïque s'éclaire autour de la souris. */
    $$("[data-spotlight]").forEach(function (grid) {
      var tiles = $$(".wc-tile", grid);
      onPointer(grid, function (e) {
        grid.classList.add("is-lit");
        tiles.forEach(function (tile) {
          var r = tile.getBoundingClientRect();
          tile.style.setProperty("--x", (e.clientX - r.left).toFixed(0) + "px");
          tile.style.setProperty("--y", (e.clientY - r.top).toFixed(0) + "px");
        });
      }, function () { grid.classList.remove("is-lit"); });
    });
  }

  /* Number Ticker : les chiffres montent une fois, quand la section apparaît. */
  function countUp(node) {
    var target = +node.getAttribute("data-count");
    if (!target || calm() || typeof requestAnimationFrame !== "function") { node.textContent = String(target || node.textContent); return; }
    var start = null, dur = 1400;
    node.textContent = "0";
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !calm()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ------------------------------------------------------------------ rendu : cartes d'état */
  function notice(kind, iconName, title, text, actions, extra) {
    var box = el("div", "wc-notice wc-notice--" + kind);
    var badge = el("span", "wc-notice__badge");
    badge.appendChild(icon(iconName));
    box.appendChild(badge);
    var body = el("div");
    var h = el("h3", "wc-notice__title", title);
    h.setAttribute("data-focus", "");
    body.appendChild(h);
    body.appendChild(el("p", "wc-notice__text", text));
    if (extra) body.appendChild(extra);
    if (actions && actions.length) {
      var row = el("div", "wc-actions");
      actions.forEach(function (a) { row.appendChild(a); });
      body.appendChild(row);
    }
    box.appendChild(body);
    return box;
  }
  function contactBtn() { return link("", "contact.html", "mail", t("cert.cta_contact")); }
  function editBtn() { return button("wc-btn--primary", "search", t("cert.cta_edit"), editSearch); }
  function retryBtn() { return button("wc-btn--primary", "refresh", t("cert.cta_retry"), function () { submit(); }); }

  /* ------------------------------------------------------------------ rendu : certificat retrouvé */
  var STATUS = {
    valid: { icon: "check", key: "cert.status_valid", banner: "cert.banner_valid", stamp: "cert.stamp_valid", explain: "cert.explain_valid" },
    expired: { icon: "clock", key: "cert.status_expired", banner: "cert.banner_expired", stamp: "cert.stamp_expired", explain: "cert.explain_expired" },
    revoked: { icon: "ban", key: "cert.status_revoked", banner: "cert.banner_revoked", stamp: "cert.stamp_revoked", explain: "cert.explain_revoked" },
    undetermined: { icon: "help", key: "cert.status_undetermined", banner: "cert.banner_undetermined", stamp: "cert.stamp_undetermined", explain: "cert.explain_undetermined" }
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

  function documentCard(cert, meta, index, total, instant) {
    var st = STATUS[cert.status];
    var card = el("article", "wc-doc wc-doc--" + cert.status);
    card.style.setProperty("--i", String(index));

    var banner = el("header", "wc-doc__banner");
    var strong = el("strong");
    strong.appendChild(icon(st.icon));
    strong.appendChild(el("span", null, t(st.banner)));
    banner.appendChild(strong);
    banner.appendChild(el("span", "wc-doc__kickerline", total > 1 ? t("cert.card_kicker_n", { i: String(index + 1), n: String(total) }) : t("cert.card_kicker")));
    card.appendChild(banner);

    var body = el("div", "wc-doc__body");
    var water = el("div", "wc-doc__water");
    water.appendChild(rosetteSvg());
    body.appendChild(water);
    var main = el("div", "wc-doc__main");
    main.appendChild(el("h4", "wc-doc__training", cert.training));
    var holder = el("p", "wc-doc__holder");
    holder.appendChild(el("span", null, t("cert.f_holder") + " : "));
    var b = el("b");
    b.appendChild(el("span", "wc-sr", cert.holder));
    var scr = el("span");
    scr.setAttribute("aria-hidden", "true");
    b.appendChild(scr);
    scramble(scr, cert.holder, instant);
    holder.appendChild(b);
    main.appendChild(holder);

    var dl = el("dl", "wc-dl");
    var num = el("div", "wc-dl__item");
    num.appendChild(el("dt", null, t("cert.f_number")));
    var ddn = el("dd", cert.certificateNumber ? "wc-number" : "wc-muted");
    if (cert.certificateNumber) {
      ddn.appendChild(el("span", "wc-mono", cert.certificateNumber));
      ddn.appendChild(copyButton(cert.certificateNumber));
    } else ddn.textContent = t("cert.not_specified");
    num.appendChild(ddn);
    dl.appendChild(num);
    dateItem(dl, "cert.f_training_date", cert.trainingDate, null, 1);
    dateItem(dl, "cert.f_issue_date", cert.issueDate || cert.trainingDate, null, 2);
    dateItem(dl, "cert.f_expiry", cert.expiryDate, "cert.no_expiry", 3);
    if (cert.language) {
      var lg = el("div", "wc-dl__item wc-dl__item--full");
      lg.style.setProperty("--j", "4");
      lg.appendChild(el("dt", null, t("cert.f_language")));
      var ddl = el("dd", "wc-lang");
      ddl.appendChild(icon("globe"));
      ddl.appendChild(el("span", null, C.languageLabel(cert.language, lang())));
      lg.appendChild(ddl);
      dl.appendChild(lg);
    }
    main.appendChild(dl);

    var tl = timeline(cert, meta.today || C.todayBrussels());
    if (tl) main.appendChild(tl);
    var explain = el("p", "wc-doc__explain");
    explain.appendChild(icon(st.icon));
    explain.appendChild(el("span", null, t(st.explain, { date: C.formatDate(cert.status === "valid" ? (meta.today || C.todayBrussels()) : cert.expiryDate, lang()) })));
    main.appendChild(explain);
    body.appendChild(main);

    var side = el("div", "wc-doc__side");
    var stamp = el("div", "wc-stamp");
    stamp.appendChild(seal(t(st.stamp)));
    var center = el("span", "wc-stamp__center");
    center.appendChild(icon(st.icon));
    stamp.appendChild(center);
    side.appendChild(stamp);
    body.appendChild(side);
    card.appendChild(body);
    return card;
  }

  function found(res, instant) {
    var certs = res.certificates;
    var box = el("div", "wc-res");
    var head = el("div", "wc-res__head");
    var h = el("h3", "wc-res__title", certs.length > 1 ? t("cert.found_title_n", { n: String(certs.length) }) : t("cert.found_title"));
    h.setAttribute("data-focus", "");
    head.appendChild(h);
    var stamp = C.formatStamp(res.meta.checkedAt, lang(), res.meta.timezone);
    head.appendChild(el("p", "wc-res__meta", t("cert.checked_at", { date: stamp.date, time: stamp.time })));
    box.appendChild(head);
    var list = el("div", "wc-res__list");
    certs.forEach(function (c, i) { list.appendChild(documentCard(c, res.meta, i, certs.length, instant)); });
    box.appendChild(list);
    var foot = el("div", "wc-res__foot");
    foot.appendChild(el("p", "wc-res__disclaimer", t("cert.disclaimer")));
    var row = el("div", "wc-actions");
    row.appendChild(button("", "printer", t("cert.cta_print"), function () { window.print(); }));
    row.appendChild(button("wc-btn--primary", "refresh", t("cert.cta_new"), resetAll));
    foot.appendChild(row);
    box.appendChild(foot);
    return box;
  }

  function skeleton() {
    var box = el("div", "wc-skel");
    for (var i = 0; i < 4; i++) box.appendChild(el("div", "wc-skel__line"));
    box.appendChild(el("p", "wc-skel__text", t("cert.loading")));
    return box;
  }

  /* ------------------------------------------------------------------ affichage du résultat */
  function show(node, focus, scroll) {
    results.hidden = false;
    resultBox.textContent = "";
    resultBox.appendChild(node);
    startTimelines(resultBox);
    if (focus) {
      var f = $("[data-focus]", resultBox);
      if (f) { f.setAttribute("tabindex", "-1"); try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
    }
    if (scroll) scrollToEl(results);
  }

  function render(res, instant) {
    state.last = res;
    var kind = res.kind;
    var focus = !instant, scroll = !instant;
    document.body.setAttribute("data-wc-result", kind);
    if (kind === "found") {
      show(found(res, instant), focus, scroll);
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
      show(notice("neutral", "search", t("cert.nf_title"), t("cert.nf_text"), [editBtn(), contactBtn()], tips), focus, scroll);
      if (!instant) announce(t("cert.nf_title"));
      return;
    }
    if (kind === "invalid") {
      var f = res.fields || {};
      hideResults();
      if (f.lastName) showFieldError(nameInput, NAME_ERR[f.lastName] || NAME_ERR.invalid);
      if (f.birthDate) showFieldError(birthInput, DATE_ERR[f.birthDate] || DATE_ERR.invalid);
      toggleSummary(true);
      if (!instant) (f.lastName ? nameInput : birthInput).focus();
      return;
    }
    if (kind === "rate_limited") {
      show(notice("warn", "gauge", t("cert.rl_title"), t("cert.rl_text", { n: String(Math.max(1, Math.ceil(res.retryAfter / 60))) }), [contactBtn()]), focus, scroll);
      if (!instant) announce(t("cert.rl_title"));
      return;
    }
    if (kind === "not_configured") {
      show(notice("info", "clock", t("cert.soon_title"), t("cert.soon_text"), [contactBtn()]), focus, scroll);
      if (!instant) announce(t("cert.soon_title"));
      return;
    }
    show(notice("error", "alert", t("cert.err_title"), t("cert.err_text"), [retryBtn(), contactBtn()]), focus, scroll);
    if (!instant) announce(t("cert.err_title"));
  }

  function hideResults() {
    results.hidden = true;
    resultBox.textContent = "";
    document.body.removeAttribute("data-wc-result");
  }

  function setBusy(busy) {
    state.busy = busy;
    form.classList.toggle("is-busy", busy);
    if (hero) hero.classList.toggle("is-busy", busy);
    submitBtn.disabled = busy;
    var bar = $(".wc-search__bar", form);
    if (bar) form.style.setProperty("--wc-bar-h", bar.offsetHeight + "px");
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
    show(skeleton(), false, true);
    results.setAttribute("aria-busy", "true");
    announce(t("cert.loading"));
    var minDelay = new Promise(function (r) { setTimeout(r, calm() ? 0 : 700); });
    var call = C.verify({ config: window.WISY_CERTIFICATS, lastName: v.name, birthDate: v.iso, fetch: window.fetch ? window.fetch.bind(window) : null });
    Promise.all([call, minDelay]).then(function (out) {
      if (epoch !== state.epoch) return; // une nouvelle recherche a été lancée entre-temps
      setBusy(false);
      results.removeAttribute("aria-busy");
      render(out[0]);
    });
    /* Mesure d'audience (si consentie) : aucune donnée saisie dans l'événement. */
    if (window.WisyChrome && window.WisyChrome.track) window.WisyChrome.track("certificate_verify", {});
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  /* Corriger la recherche : on remonte à la barre, saisie conservée. */
  function editSearch() {
    scrollToEl(form, true);
    setTimeout(function () { nameInput.focus(); nameInput.select(); }, calm() ? 0 : 450);
  }

  function resetAll() {
    state.epoch++;
    state.last = null;
    state.attempted = false;
    form.reset();
    [nameInput, birthInput].forEach(function (i) { showFieldError(i, ""); });
    toggleSummary(false);
    setBusy(false);
    hideResults();
    scrollToEl(form, true);
    setTimeout(function () { nameInput.focus(); }, calm() ? 0 : 450);
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
    paintExamples();
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

  /* ------------------------------------------------------------------ exemples (illustrations, aucune donnée réelle) */
  function stampNode(status) {
    var st = STATUS[status];
    var stamp = el("div", "wc-stamp");
    stamp.appendChild(seal(t(st.stamp)));
    var center = el("span", "wc-stamp__center");
    center.appendChild(icon(st.icon));
    stamp.appendChild(center);
    return stamp;
  }
  /* Lecteur « Lire un résultat » : chaque statut montre le document correspondant (dates d'exemple fixes). */
  var DEMO = {
    valid: { start: "2026-03-12", end: "2036-03-12" },
    expired: { start: "2014-03-12", end: "2024-03-12", bar: 1 },
    revoked: { start: "2026-03-12", end: "2036-03-12", bar: 1 },
    undetermined: { start: "2026-03-12", end: null, bar: 0 }
  };
  var statesBox = $("[data-states]"), preview = $("[data-states-preview]");
  var current = "valid";
  function paintState(status, animate) {
    if (!preview || !STATUS[status]) return;
    current = status;
    var st = STATUS[status], demo = DEMO[status];
    preview.className = "wc-mini wc-mini--" + status;
    var banner = $("[data-mini-banner]", preview);
    banner.setAttribute("data-i18n", st.banner);
    banner.textContent = t(st.banner);
    var use = $("[data-mini-icon]", preview);
    if (use) use.setAttribute("href", "#wc-i-" + st.icon);
    $("[data-mini-start]", preview).setAttribute("data-iso", demo.start);
    var end = $("[data-mini-end]", preview);
    if (demo.end) { end.setAttribute("data-iso", demo.end); end.className = "wc-mono"; }
    else { end.removeAttribute("data-iso"); end.className = "wc-muted"; end.textContent = t("cert.no_expiry"); }
    var ratio = demo.bar != null ? demo.bar : (C.validityProgress({ trainingDate: demo.start, expiryDate: demo.end }, C.todayBrussels()) || { ratio: 0 }).ratio;
    $("[data-mini-bar]", preview).style.setProperty("--w", Math.max(ratio ? 4 : 0, Math.round(ratio * 100)) + "%");
    var holder = $("[data-mini-stamp]", preview);
    holder.textContent = "";
    holder.appendChild(stampNode(status));
    formatDates(preview);
    if (animate && !calm()) {
      preview.classList.remove("is-swap");
      void preview.offsetWidth;
      preview.classList.add("is-swap");
    }
    if (statesBox) $$("[data-state]", statesBox).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-state") === status)); });
  }
  if (statesBox) statesBox.addEventListener("click", function (e) {
    var b = e.target.closest("[data-state]");
    if (b && b.getAttribute("data-state") !== current) paintState(b.getAttribute("data-state"), true);
  });
  /* Dates d'exemple au format de la langue choisie. */
  function formatDates(root) {
    $$("[data-iso]", root).forEach(function (n) { n.textContent = C.formatDate(n.getAttribute("data-iso"), lang()); });
  }
  function paintExamples() {
    var holoSeal = $("[data-holo-seal]");
    if (holoSeal) {
      holoSeal.textContent = "";
      holoSeal.appendChild(seal(t("cert.spec_verified")));
      var c = el("span", "wc-stamp__center");
      c.appendChild(icon("check"));
      holoSeal.appendChild(c);
    }
    formatDates(hero);
    paintState(current, false);
  }

  /* ------------------------------------------------------------------ démarrage */
  drawGuilloche();
  paintExamples();

  window.WisyCertificates = { reset: resetAll, submit: submit, render: render };
})();
