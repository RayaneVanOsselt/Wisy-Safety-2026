/* =========================================================================
   WISY SAFETY — Centre d'aide · Logique de la page (faq.html)
   -------------------------------------------------------------------------
   Rend TOUT depuis la source unique (js/faq-data.js) et interroge le moteur
   partagé (js/faq-search.js) — le même que celui de l'assistant.

   Ce que fait ce fichier
   • catégories, recherches populaires, amorces de l'assistant, accordéons
     groupés par catégorie (rendu sans innerHTML : tout texte est posé via
     textContent / nœuds, le surlignage via <mark>) ;
   • recherche en direct : suggestions (combobox ARIA), liste filtrée classée
     par pertinence, état « aucun résultat » avec repli vers l'assistant ;
   • filtres par catégorie, liens profonds (?q=, ?cat=, #id d'une question) ;
   • pont vers l'assistant (WisyAssistant.controller.ask) ;
   • données structurées FAQPage générées depuis les questions AFFICHÉES ;
   • hauteur de l'en-tête sticky exposée en CSS (--faqc-hh) pour les ancres.

   Accessibilité : accordéons = <button aria-expanded aria-controls> dans un
   titre ; contenu replié non focusable (visibility) ; annonces polies
   (aria-live) ; raccourcis « / » et ⌘K/Ctrl+K vers la recherche ; respect de
   prefers-reduced-motion (défilement instantané).
   ========================================================================= */
(function () {
  "use strict";

  var F = window.WisyFAQ;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var groupsEl = $("faqc-groups");
  var input = $("faqc-q");
  if (!F || !F.search || !groupsEl || !input) {
    var fb = $("faqc-fallback");
    if (fb) fb.hidden = false;
    return;
  }

  /* ---------------------------------------------------------------------
     Petits outils DOM (aucun innerHTML sur du texte)
     --------------------------------------------------------------------- */
  function h(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "hidden") n.hidden = !!v;
        else n.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  /* Icônes linéaires maison (24×24, décoratives) */
  var ICONS = {
    all: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9.5 4V3h5v1"/><path d="M9 10h6M9 13.5h6M9 17h4"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.6" cy="8.6" r="1.3"/>',
    steps: '<path d="M5.5 6h5a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h10.5"/><circle cx="5.5" cy="6" r="1.7"/><circle cx="18.5" cy="18" r="1.7"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 7L12 18l5 2.5-1.5-7"/>',
    team: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 3.6a3 3 0 0 1 0 5.8M21.5 20c0-2.6-1.6-4.9-4-5.7"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8.5 10h7M8.5 13h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  function svg(key, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", key === "check" ? "3" : "1.8");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = ICONS[key] || "";   // constantes internes uniquement, jamais du contenu utilisateur
    return s;
  }
  /* Texte + surlignage → fragment de nœuds (sans HTML) */
  function marked(text, terms) {
    var frag = document.createDocumentFragment();
    F.highlight(text, terms).forEach(function (seg) {
      if (seg.mark) frag.appendChild(h("mark", { class: "faqc-hl", text: seg.text }));
      else frag.appendChild(document.createTextNode(seg.text));
    });
    return frag;
  }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }
  /* Une recherche démarre à 3 caractères (ou un chiffre) : pas d'« aucun résultat » qui clignote pendant la frappe. */
  function searchable(q) { q = String(q || "").trim(); return q.length >= 3 || /\d/.test(q); }
  function emit(event, detail) {
    try { document.dispatchEvent(new CustomEvent("wisy:analytics", { detail: Object.assign({ event: event }, detail || {}) })); } catch (e) { /* silencieux */ }
  }

  /* ---------------------------------------------------------------------
     Données
     --------------------------------------------------------------------- */
  var cats = F.categories(), items = F.items(), counts = F.counts();
  var catMap = {};
  cats.forEach(function (c) { catMap[c.id] = c; });

  var live = $("faqc-live"), countEl = $("faqc-count"), filtersEl = $("faqc-filters");
  var resultsEl = $("faqc-results"), resultsTitle = $("faqc-results-t"), emptyEl = $("faqc-empty");
  var clearBtn = $("faqc-clear"), kbd = $("faqc-kbd"), sugEl = $("faqc-suggest");
  var state = { q: "", cat: "all", mode: "browse" };

  /* Placeholder complet sur grand écran, version courte sur mobile (jamais tronqué) */
  (function () {
    var full = input.getAttribute("placeholder") || "";
    var mq = window.matchMedia ? matchMedia("(max-width: 860px)") : null;
    if (!mq) return;
    function sync() { input.setAttribute("placeholder", mq.matches ? "Rechercher une question…" : full); }
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync); else if (mq.addListener) mq.addListener(sync);
  })();

  /* ---------------------------------------------------------------------
     Assistant : la « 3e façon » d'obtenir une réponse
     --------------------------------------------------------------------- */
  function askAssistant(text) {
    var c = window.WisyAssistant && window.WisyAssistant.controller;
    if (c && c.ask) { c.ask(text || ""); return; }
    window.location.href = "contact.html"; // assistant indisponible : on ne laisse pas l'utilisateur dans une impasse
  }

  /* ---------------------------------------------------------------------
     Défilement (sous l'en-tête sticky)
     --------------------------------------------------------------------- */
  var header = document.querySelector(".site-header");
  function headerH() { return header ? header.getBoundingClientRect().height : 0; }
  function setHH() { document.documentElement.style.setProperty("--faqc-hh", Math.round(headerH()) + "px"); }
  setHH();
  if (header && "ResizeObserver" in window) new ResizeObserver(setHH).observe(header);
  else window.addEventListener("resize", setHH);

  function scrollToEl(el, focus) {
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - headerH() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    if (focus) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }

  /* ---------------------------------------------------------------------
     Catégories, recherches populaires, questions essentielles
     --------------------------------------------------------------------- */
  var catsEl = $("faqc-cats");
  function catButton(id, name, meta, icon) {
    return h("button", { type: "button", class: "faqc-cat", "data-cat": id, "aria-pressed": id === "all" ? "true" : "false" }, [
      h("span", { class: "faqc-cat__ic" }, [svg(icon)]),
      h("span", { class: "faqc-cat__body" }, [h("span", { class: "faqc-cat__name", text: name }), h("span", { class: "faqc-cat__meta", text: meta })]),
      h("span", { class: "faqc-cat__check", "aria-hidden": "true" }, [svg("check")])
    ]);
  }
  if (catsEl) {
    catsEl.appendChild(catButton("all", "Toutes les questions", plural(items.length, "question", "questions"), "all"));
    cats.forEach(function (c) { catsEl.appendChild(catButton(c.id, c.label, plural(counts[c.id] || 0, "question", "questions"), c.icon)); });
  }

  function chip(label, query, light) {
    return h("button", { type: "button", class: "faqc-chip" + (light ? " faqc-chip--light" : ""), "data-q": query, "aria-pressed": "false", text: label });
  }
  var popEl = $("faqc-pop"), emptyTopics = $("faqc-empty-topics");
  F.popular().forEach(function (p) {
    if (popEl) popEl.appendChild(chip(p.label, p.query, false));
    if (emptyTopics) emptyTopics.appendChild(chip(p.label, p.query, true));
  });

  /* Questions essentielles : amorces de la carte assistant (l'assistant répond avec les mêmes réponses) */
  var tryEl = $("faqc-try"), tryList = $("faqc-try-list");
  var featured = F.featured();
  if (tryEl && tryList) {
    featured.slice(0, 3).forEach(function (it) {
      tryList.appendChild(h("li", null, [h("button", { type: "button", class: "faqc-ask__ex", "data-ask-text": it.question }, [svg("chevron"), h("span", { text: it.question })])]));
    });
    tryEl.hidden = !tryList.childNodes.length;
  }

  /* ---------------------------------------------------------------------
     Accordéons (groupés par catégorie)
     --------------------------------------------------------------------- */
  var recs = {};      // id → { root, btn, qEl, tagEl, copyEl, it }
  var groups = {};    // catégorie → { root, body }
  var ACTIONS = F.ACTIONS || {};

  function buildAnswerParts(rec) {
    var it = rec.it;
    var parts = [h("div", { class: "faqc-copy" })];

    var act = it.action && ACTIONS[it.action];
    if (act) {
      var node = act.href
        ? h("a", { class: "faqc-btn faqc-btn--outline", href: act.href }, [act.label, svg("arrow")])
        : h("button", { type: "button", class: "faqc-btn faqc-btn--outline", "data-ask-text": it.question }, [act.label, svg("arrow")]);
      parts.push(h("div", { class: "faqc-actions" }, [node]));
    }

    var rel = F.related(it.id, 3);
    if (rel.length) {
      var list = h("div", { class: "faqc-related" }, [h("p", { class: "faqc-related__t", text: "Questions associées" })]);
      rel.forEach(function (r) { list.appendChild(h("button", { type: "button", class: "faqc-rel", "data-goto": r.id }, [svg("chevron"), h("span", { text: r.question })])); });
      parts.push(list);
    }

    var fbox = h("div", { class: "faqc-fb", role: "group", "aria-label": "Cette réponse vous a-t-elle aidé ?" }, [
      h("span", { class: "faqc-fb__q", text: "Cette réponse vous a-t-elle aidé ?" }),
      h("button", { type: "button", class: "faqc-fb__btn", "data-fb": "yes", text: "Oui" }),
      h("button", { type: "button", class: "faqc-fb__btn", "data-fb": "no", text: "Pas tout à fait" })
    ]);
    parts.push(fbox);
    return parts;
  }

  function buildItem(it) {
    var cat = catMap[it.category];
    var qEl = h("span", { class: "faqc-qtext" });
    var tagEl = h("span", { class: "faqc-tag", text: cat ? cat.label : "", hidden: true });
    var btn = h("button", { type: "button", class: "faqc-trigger", id: "faqc-btn-" + it.id, "aria-expanded": "false", "aria-controls": "faqc-panel-" + it.id }, [
      h("span", { class: "faqc-qmain" }, [qEl, tagEl]),
      h("span", { class: "faqc-chev", "aria-hidden": "true" })
    ]);
    var rec = { it: it, btn: btn, qEl: qEl, tagEl: tagEl, copyEl: null, root: null };
    var ans = h("div", { class: "faqc-answer" }, buildAnswerParts(rec));
    rec.copyEl = ans.querySelector(".faqc-copy");
    rec.root = h("article", { class: "faqc-item", id: it.id, "data-cat": it.category }, [
      h("h4", { class: "faqc-q" }, [btn]),
      h("div", { class: "faqc-panel", id: "faqc-panel-" + it.id }, [h("div", { class: "faqc-panel__in" }, [ans])])
    ]);
    recs[it.id] = rec;
    return rec;
  }

  cats.forEach(function (c) {
    var list = items.filter(function (it) { return it.category === c.id; });
    if (!list.length) return;                       // jamais de catégorie vide
    var body = h("div", { class: "faqc-group__body" });
    var titleId = "faqc-g-" + c.id;
    var root = h("section", { class: "faqc-group", "data-cat": c.id, "aria-labelledby": titleId }, [
      h("header", { class: "faqc-group__head" }, [
        h("span", { class: "faqc-group__ic", "aria-hidden": "true" }, [svg(c.icon)]),
        h("div", null, [h("h3", { class: "faqc-group__title", id: titleId, text: c.label }), h("p", { class: "faqc-group__sub", text: c.tagline })]),
        h("span", { class: "faqc-group__count", text: plural(list.length, "question", "questions") })
      ]),
      body
    ]);
    list.forEach(function (it) { body.appendChild(buildItem(it).root); });
    groups[c.id] = { root: root, body: body };
    groupsEl.appendChild(root);
  });

  /* ---------------------------------------------------------------------
     Rendu des libellés / réponses (avec surlignage éventuel)
     --------------------------------------------------------------------- */
  function renderQuestion(rec, terms) {
    rec.qEl.textContent = "";
    rec.qEl.appendChild(marked(rec.it.question, terms));
  }
  function renderCopy(rec, terms) {
    rec.copyEl.textContent = "";
    F.blocks(rec.it.answer).forEach(function (b) {
      if (b.type === "p") {
        rec.copyEl.appendChild(h("p", null, [marked(b.text, terms)]));
      } else {
        var ul = h("ul");
        b.items.forEach(function (t) { ul.appendChild(h("li", null, [marked(t, terms)])); });
        rec.copyEl.appendChild(ul);
      }
    });
  }

  /* Ouverture / fermeture d'une question */
  function setOpen(rec, open, o) {
    o = o || {};
    var was = rec.root.classList.contains("is-open");
    rec.root.classList.toggle("is-open", open);
    rec.btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (o.hash && open && !was) {
      try { history.replaceState(null, "", "#" + rec.it.id); } catch (e) { /* file:// etc. */ }
    } else if (o.hash && !open && location.hash === "#" + rec.it.id) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    }
    if (open && !was && o.track) emit("faq_open", { id: rec.it.id });
  }
  function closeAll(exceptId) {
    Object.keys(recs).forEach(function (id) { if (id !== exceptId) setOpen(recs[id], false); });
  }

  /* ---------------------------------------------------------------------
     Application de l'état (recherche / catégorie) à la page
     --------------------------------------------------------------------- */
  var announceTimer = null;
  function announce(msg) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { if (live) live.textContent = msg; }, 350);
  }

  function pill(label, onRemove, removeLabel) {
    return h("span", { class: "faqc-pill" }, [
      label,
      h("button", { type: "button", "aria-label": removeLabel, "data-remove": onRemove }, [svg("x")])
    ]);
  }

  function apply() {
    var q = state.q.trim();
    var searching = searchable(q);
    var prev = state.mode;
    state.mode = searching ? "search" : "browse";
    var res = searching ? F.search(q, { partial: true, limit: 50 }) : null;
    var hits = res ? res.hits : [];

    /* catégories : état pressé */
    if (catsEl) {
      Array.prototype.forEach.call(catsEl.querySelectorAll(".faqc-cat"), function (b) {
        b.setAttribute("aria-pressed", (!searching && b.getAttribute("data-cat") === state.cat) ? "true" : "false");
      });
    }
    /* recherches populaires : état pressé */
    Array.prototype.forEach.call(document.querySelectorAll(".faqc-chip[data-q]"), function (b) {
      b.setAttribute("aria-pressed", (searching && F.normalize(b.getAttribute("data-q")) === F.normalize(q)) ? "true" : "false");
    });

    if (searching) {
      groupsEl.hidden = true;
      var hitSet = {};
      var frag = document.createDocumentFragment();
      hits.forEach(function (hit) { hitSet[hit.item.id] = true; frag.appendChild(recs[hit.item.id].root); });
      resultsEl.appendChild(frag);
      items.forEach(function (it) { if (!hitSet[it.id]) groups[it.category].body.appendChild(recs[it.id].root); });
      hits.forEach(function (hit, i) {
        var rec = recs[hit.item.id];
        rec.tagEl.hidden = false;
        renderQuestion(rec, res.terms);
        renderCopy(rec, res.terms);
        setOpen(rec, i === 0);                       // la meilleure réponse s'ouvre d'elle-même
      });
      resultsEl.hidden = !hits.length;
      resultsTitle.textContent = "Résultats pour « " + q + " »";
      emptyEl.hidden = hits.length > 0;
      if (!hits.length) $("faqc-empty-q").textContent = "« " + q + " »";
    } else {
      resultsEl.hidden = true;
      emptyEl.hidden = true;
      groupsEl.hidden = false;
      items.forEach(function (it) {
        var rec = recs[it.id];
        groups[it.category].body.appendChild(rec.root);
        rec.tagEl.hidden = true;
        renderQuestion(rec, null);
        renderCopy(rec, null);
      });
      if (prev === "search") closeAll();             // retour à une liste propre
      Object.keys(groups).forEach(function (id) { groups[id].root.hidden = !(state.cat === "all" || state.cat === id); });
    }

    /* barre d'outils : compteur + filtres actifs */
    var n = searching ? hits.length : (state.cat === "all" ? items.length : (counts[state.cat] || 0));
    state.count = n;
    countEl.textContent = "";
    countEl.appendChild(h("b", { text: String(n) }));
    countEl.appendChild(document.createTextNode(" " + (searching ? (n > 1 ? "résultats" : "résultat") : (n > 1 ? "questions" : "question"))));
    filtersEl.textContent = "";
    if (searching) {
      filtersEl.appendChild(pill("Recherche : « " + q + " »", "query", "Effacer la recherche"));
    } else if (state.cat !== "all") {
      filtersEl.appendChild(pill("Catégorie : " + (catMap[state.cat] ? catMap[state.cat].label : state.cat), "cat", "Retirer le filtre de catégorie"));
      filtersEl.appendChild(h("button", { type: "button", class: "faqc-link", "data-remove": "cat", text: "Tout afficher" }));
    }
    filtersEl.hidden = !filtersEl.childNodes.length;

    if (state.ready) {   // pas d'annonce au chargement de la page
      announce(searching
        ? (n ? plural(n, "résultat", "résultats") + " pour « " + q + " »." : "Aucun résultat pour « " + q + " ».")
        : (state.cat === "all" ? plural(n, "question affichée", "questions affichées") + "." : catMap[state.cat].label + " : " + plural(n, "question", "questions") + "."));
    }
  }

  function setQuery(q, o) {
    o = o || {};
    state.q = q;
    if (searchable(q)) state.cat = "all";
    input.value = q;
    clearBtn.hidden = !q;
    if (kbd) kbd.hidden = !!q;
    apply();
    if (searchable(q) && state.ready) emit("faq_search", { results: state.count });
    closeSuggest();
    if (o.scroll) scrollToEl($("faqc-answers"), false);
  }
  function setCategory(id, o) {
    o = o || {};
    state.cat = id;
    state.q = "";
    input.value = "";
    clearBtn.hidden = true;
    if (kbd) kbd.hidden = false;
    apply();
    closeSuggest();
    emit("faq_category", { cat: id });
    if (o.scroll) scrollToEl($("faqc-answers"), false);
  }

  /* Va à une question précise : la rend visible (retire le filtre qui la masque), l'ouvre, y amène */
  function gotoItem(id, o) {
    var rec = recs[id];
    if (!rec) return;
    o = o || {};
    var visible = false;
    if (state.mode === "search") {
      var res = F.search(state.q, { partial: true, limit: 50 });
      visible = res.hits.some(function (x) { return x.item.id === id; });
      if (!visible) { state.q = ""; input.value = ""; clearBtn.hidden = true; if (kbd) kbd.hidden = false; state.cat = "all"; apply(); }
    } else if (state.cat !== "all" && state.cat !== rec.it.category) {
      state.cat = "all"; apply();
    }
    closeAll(id);
    setOpen(rec, true, { hash: true, track: true });
    closeSuggest();
    rec.root.classList.remove("is-flash");
    void rec.root.offsetWidth; // relance l'animation
    if (!reduce) rec.root.classList.add("is-flash");
    scrollToEl(rec.root, false);
    try { rec.btn.focus({ preventScroll: true }); } catch (e) { rec.btn.focus(); }
  }

  /* ---------------------------------------------------------------------
     Suggestions en direct (combobox ARIA)
     --------------------------------------------------------------------- */
  var sug = { open: false, opts: [], idx: -1 };
  function closeSuggest() {
    sug.open = false; sug.idx = -1; sug.opts = [];
    sugEl.hidden = true;
    sugEl.textContent = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function setActive(i) {
    sug.idx = i;
    sug.opts.forEach(function (o, k) { o.el.setAttribute("aria-selected", k === i ? "true" : "false"); });
    if (i >= 0 && sug.opts[i]) {
      input.setAttribute("aria-activedescendant", sug.opts[i].el.id);
      sug.opts[i].el.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }
  function addOpt(el, act) {
    el.id = "faqc-opt-" + sug.opts.length;
    el.setAttribute("role", "option");
    el.setAttribute("aria-selected", "false");
    sug.opts.push({ el: el, act: act });
    sugEl.appendChild(el);
  }
  function renderSuggest() {
    var q = input.value.trim();
    if (!searchable(q)) { closeSuggest(); return; }
    var res = F.search(q, { partial: true, limit: 5 });
    sugEl.textContent = "";
    sug.opts = []; sug.idx = -1;
    input.removeAttribute("aria-activedescendant");

    if (!res.hits.length) {
      sugEl.appendChild(h("div", { class: "faqc-suggest__none", role: "option", "aria-disabled": "true", "aria-selected": "false" }, [h("b", { text: "Aucun résultat" }), " pour « " + q + " »."]));
    } else {
      res.hits.forEach(function (hit) {
        var it = hit.item, cat = catMap[it.category];
        var firstLine = F.blocks(it.answer)[0];
        var meta = (cat ? cat.label + " · " : "") + (firstLine ? (firstLine.text || firstLine.items[0]) : "");
        var el = h("div", { class: "faqc-opt" }, [
          h("span", { class: "faqc-opt__ic", "aria-hidden": "true" }, [svg(cat ? cat.icon : "question")]),
          h("span", { class: "faqc-opt__body" }, [h("span", { class: "faqc-opt__q" }, [marked(it.question, res.terms)]), h("span", { class: "faqc-opt__meta", text: meta })]),
          svg("chevron", "faqc-opt__go")
        ]);
        addOpt(el, function () { setQuery(input.value, {}); gotoItem(it.id); });
      });
      if (res.total > res.hits.length) {
        addOpt(h("div", { class: "faqc-opt faqc-opt--act" }, [
          h("span", { class: "faqc-opt__ic", "aria-hidden": "true" }, [svg("all")]),
          h("span", { class: "faqc-opt__body", text: "Voir les " + res.total + " résultats" })
        ]), function () { setQuery(input.value, { scroll: true }); });
      }
    }
    addOpt(h("div", { class: "faqc-opt faqc-opt--act" }, [
      h("span", { class: "faqc-opt__ic", "aria-hidden": "true" }, [svg("chat")]),
      h("span", { class: "faqc-opt__body", text: "Poser cette question à l'assistant Wisy Safety" })
    ]), function () { closeSuggest(); askAssistant(input.value.trim()); });

    sug.open = true;
    sugEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  /* ---------------------------------------------------------------------
     Événements
     --------------------------------------------------------------------- */
  var applyTimer = null;
  input.addEventListener("input", function () {
    var v = input.value;
    clearBtn.hidden = !v;
    if (kbd) kbd.hidden = !!v;
    renderSuggest();
    clearTimeout(applyTimer);
    applyTimer = setTimeout(function () {
      state.q = v;
      if (searchable(v)) state.cat = "all";
      apply();
    }, 120);
  });
  input.addEventListener("focus", function () { if (searchable(input.value) && !sug.open) renderSuggest(); });
  input.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== input) closeSuggest(); }, 140); });
  input.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp") {
      if (!sug.open) { renderSuggest(); if (!sug.open) return; }
      e.preventDefault();
      var n = sug.opts.length;
      setActive(k === "ArrowDown" ? (sug.idx + 1) % n : (sug.idx <= 0 ? n - 1 : sug.idx - 1));
    } else if (k === "Enter") {
      if (sug.open && sug.idx >= 0) { e.preventDefault(); sug.opts[sug.idx].act(); }
    } else if (k === "Escape") {
      if (sug.open) { e.preventDefault(); closeSuggest(); }
      else if (input.value) { e.preventDefault(); setQuery("", {}); }
    } else if (k === "Home" && sug.open && e.ctrlKey) {
      e.preventDefault(); setActive(0);
    }
  });
  sugEl.addEventListener("mousedown", function (e) { e.preventDefault(); });   // la saisie garde le focus
  sugEl.addEventListener("click", function (e) {
    var el = e.target.closest("[role=option]");
    if (!el) return;
    for (var i = 0; i < sug.opts.length; i++) { if (sug.opts[i].el === el) { sug.opts[i].act(); return; } }
  });

  $("faqc-form").addEventListener("submit", function (e) {
    e.preventDefault();
    clearTimeout(applyTimer);
    setQuery(input.value, { scroll: true });
    if (searchable(input.value)) { try { $("faqc-faq-t").focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
  });
  clearBtn.addEventListener("click", function () { setQuery("", {}); input.focus(); });

  /* recherches populaires (hero + état vide) */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;

    var chipEl = t.closest(".faqc-chip[data-q]");
    if (chipEl) { setQuery(chipEl.getAttribute("data-q"), { scroll: true }); return; }

    var catEl = t.closest(".faqc-cat");
    if (catEl) { setCategory(catEl.getAttribute("data-cat"), { scroll: true }); return; }

    var go = t.closest("[data-goto]");
    if (go) { gotoItem(go.getAttribute("data-goto")); return; }

    var askText = t.closest("[data-ask-text]");
    if (askText) { askAssistant(askText.getAttribute("data-ask-text")); return; }

    if (t.closest("[data-ask]")) { askAssistant(""); return; }
    if (t.closest("#faqc-empty-ask")) { askAssistant(state.q.trim()); return; }

    var rm = t.closest("[data-remove]");
    if (rm) {
      if (rm.getAttribute("data-remove") === "query") setQuery("", {});
      else setCategory("all", {});
      return;
    }

    var way = t.closest("[data-way]");
    if (way) {
      var w = way.getAttribute("data-way");
      if (w === "search") { input.focus(); input.select(); }
      else if (w === "browse") scrollToEl($("faqc-browse"), false);
      else askAssistant("");
      return;
    }

    var trig = t.closest(".faqc-trigger");
    if (trig) {
      var id = trig.id.replace("faqc-btn-", "");
      var rec = recs[id];
      if (rec) setOpen(rec, !rec.root.classList.contains("is-open"), { hash: true, track: true });
      return;
    }

    var fbBtn = t.closest("[data-fb]");
    if (fbBtn) {
      var box = fbBtn.closest(".faqc-fb"), article = fbBtn.closest(".faqc-item");
      var helpful = fbBtn.getAttribute("data-fb") === "yes";
      emit("faq_feedback", { id: article ? article.id : "", helpful: helpful });
      box.textContent = "";
      if (helpful) {
        box.appendChild(h("span", { class: "faqc-fb__done", text: "Merci pour votre retour." }));
      } else {
        var qText = article && recs[article.id] ? recs[article.id].it.question : "";
        box.appendChild(h("span", { class: "faqc-fb__q", text: "Nous pouvons vous aider davantage :" }));
        box.appendChild(h("button", { type: "button", class: "faqc-fb__btn", "data-ask-text": qText, text: "Demander à l'assistant" }));
        box.appendChild(h("a", { class: "faqc-fb__btn", href: "contact.html", text: "Contacter l'équipe" }));
      }
    }
  });

  /* formulaire « Posez votre question » de la colonne assistant */
  var askForm = $("faqc-ask-form");
  if (askForm) {
    askForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ta = $("faqc-ask-q");
      var v = ta.value.trim();
      askAssistant(v);
      if (v) ta.value = "";
    });
    $("faqc-ask-q").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); askForm.requestSubmit ? askForm.requestSubmit() : askForm.dispatchEvent(new Event("submit", { cancelable: true })); }
    });
  }

  /* raccourcis « / » et ⌘K / Ctrl+K : cette page a sa propre recherche (la barre globale est masquée) */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select" || (e.target && e.target.isContentEditable);
    var slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing;
    var cmdK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
    if (!slash && !cmdK) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    input.focus();
    input.select();
  }, true);

  /* liens profonds : ?q=…, ?cat=…, #id-d'une-question (y compris via l'assistant) */
  function fromUrl(initial) {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { p = null; }
    if (initial && p) {
      var q = (p.get("q") || "").slice(0, 120), c = p.get("cat");
      if (q) setQuery(q, {});
      else if (c && catMap[c]) setCategory(c, {});
    }
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (id && recs[id]) {
      if (initial) { setTimeout(function () { gotoItem(id); }, 60); }
      else gotoItem(id);
    }
  }
  window.addEventListener("hashchange", function () { fromUrl(false); });

  /* ---------------------------------------------------------------------
     Données structurées FAQPage — uniquement les questions AFFICHÉES ci-dessus
     --------------------------------------------------------------------- */
  try {
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify(F.toStructuredData());
    document.head.appendChild(ld);
  } catch (e) { /* silencieux */ }

  /* Démarrage */
  apply();
  state.ready = true;
  fromUrl(true);
})();
