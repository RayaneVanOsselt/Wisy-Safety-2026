/* =========================================================================
   WISY SAFETY — Recherche globale (autocomplétion premium, sans dépendance)
   -------------------------------------------------------------------------
   • S'insère dans le header sticky (barre sous la navigation) sur toutes les
     pages qui incluent ce script — aucun markup à dupliquer manuellement.
   • Indexe les VRAIES données du site — formations, catégories, pages — lues dans
     le registre commun js/site-content.js (même source que l'assistant et le
     sitemap), via les clés i18n (source de vérité multilingue).
   • Retrouve aussi les questions du Centre d'aide (FAQ) et les infos pratiques (adresse,
     téléphone, e-mail, horaires) : chargés À LA DEMANDE (js/faq-data.js) au premier usage de
     la barre — jamais sur le chemin critique de la page.
   • Combobox accessible (WAI-ARIA), navigation clavier, ⌘K / Ctrl+K, i18n live.
   ========================================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------------------
     Données recherchables — lues dans le registre commun (js/site-content.js,
     chargé AVANT ce script) : aucune formation ni page n'est redéfinie ici.
     Titres/descriptions = clés i18n déjà traduites (i18n-data-common.js…).
     ----------------------------------------------------------------------- */
  var Site = window.WisySite;
  if (!Site) return;                       // registre absent : pas de barre plutôt qu'une erreur

  var CAT_ORDER = [];
  var CATEGORIES = {};                     // { id: { filter, labelKey, count } } — count = formations de la catégorie
  Site.categories().forEach(function (c) {
    CAT_ORDER.push(c.id);
    CATEGORIES[c.id] = { filter: c.id, labelKey: c.labelKey, count: 0 };
  });

  var FORMATIONS = Site.formations().map(function (f) {
    CATEGORIES[f.category].count++;
    return {
      id: f.id, cat: f.category, url: f.url,
      /* Fiche riche (page dédiée) : titre complet, résumé, miniature et faits clés ; sinon accroche courte. */
      titleKey: f.fullTitleKey || f.titleKey, descKey: f.summaryKey || f.taglineKey,
      kw: f.searchKeywords || f.keywords,
      thumb: f.thumb, factKeys: f.factKeys
    };
  });

  var PAGES = Site.pages().map(function (p) {
    return { id: p.id, url: p.url, titleKey: p.titleKey, descKey: p.descKey, kw: p.keywords };
  });

  var FEATURED = ["vca-base", "beps", "nacelle", "fibre-optique"]; // suggestions (état vide)

  /* -----------------------------------------------------------------------
     Contenus chargés À LA DEMANDE : questions du Centre d'aide + infos pratiques.
     Source unique : js/faq-data.js (FAQ + coordonnées) — la même que la page faq.html et l'assistant.
     Absent / en échec : la recherche reste pleinement fonctionnelle (formations, catégories, pages).
     ----------------------------------------------------------------------- */
  var FAQ_SCRIPT = "js/faq-data.js";
  var FAQS = [];                 // { id, title (question), url, kw }
  var INFOS = [];                // { id, titleKey, sub(), url, kw }
  var extras = "idle";           // idle | loading | ready | failed
  var MAX_FAQ = 3;               // évite une liste énorme : les 3 questions les plus pertinentes

  function buildExtras() {
    var F = window.WisyFAQ;
    if (!F || !F.items) return;
    FAQS = F.items().map(function (it) {
      return { id: it.id, title: it.question, url: "faq.html#" + it.id, kw: (it.keywords || []).concat(it.synonyms || []) };
    });
    var C = F.CONTACT;
    if (!C) return;
    var dayKeys = { Monday: "footer.mon", Tuesday: "footer.tue", Wednesday: "footer.wed", Thursday: "footer.thu", Friday: "footer.fri" };
    var oh = (C.openingHours || [])[0];
    INFOS = [
      { id: "info-address", titleKey: "footer.label_address", url: C.contactUrl,
        sub: function () { return C.street + ", " + C.postalCode + " " + C.city; },
        kw: ["adresse", "address", "adres", "anschrift", "indirizzo", "adresa", "acces", "plan", "carte", "map", "localisation", "situation", "venir", "itterbeek", "anderlecht", "bruxelles", "brussels", "brussel"] },
      { id: "info-phone", titleKey: "footer.label_phone", url: C.phoneHref,
        sub: function () { return C.phone; },
        kw: ["telephone", "phone", "tel", "appeler", "call", "numero", "gsm", "bellen", "anrufen", "chiamare", "apel"] },
      { id: "info-email", titleKey: "footer.label_email", url: "mailto:" + C.email,
        sub: function () { return C.email; },
        kw: ["email", "mail", "e-mail", "courriel", "ecrire", "write", "schrijven", "schreiben"] }
    ];
    if (oh && oh.days && oh.days.length) {
      INFOS.push({ id: "info-hours", titleKey: "footer.col_hours", url: C.contactUrl,
        // jours traduits (clés du pied de page) + horaires — aucune phrase française figée
        sub: function () { return t(dayKeys[oh.days[0]]) + " – " + t(dayKeys[oh.days[oh.days.length - 1]]) + ", " + oh.opens + " – " + oh.closes; },
        kw: ["horaires", "heures", "ouverture", "ouvert", "open", "opening", "hours", "openingstijden", "oeffnungszeiten", "orari", "program", "lundi", "jeudi"] });
    }
  }
  function purgeCaches() { FORMATIONS.concat(PAGES, FAQS, INFOS).forEach(function (e) { e._hay = null; }); }
  function ensureExtras() {
    if (extras !== "idle") return;
    if (window.WisyFAQ && window.WisyFAQ.items) { buildExtras(); extras = "ready"; return; }
    extras = "loading";
    var el = document.createElement("script");
    el.src = FAQ_SCRIPT; el.async = true;
    el.onload = function () {
      buildExtras(); extras = "ready"; purgeCaches();
      if (root && root.classList.contains("is-open")) render(input.value.trim());   // affiche aussitôt les résultats enrichis
    };
    el.onerror = function () { extras = "failed"; };
    document.head.appendChild(el);
  }

  /* -----------------------------------------------------------------------
     Icônes (cohérentes avec le système d'icônes du site — trait 1.8)
     ----------------------------------------------------------------------- */
  var IC = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    clear:  '<path d="M6 6l12 12M18 6L6 18"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    // formations (reprises du méga-menu du header)
    "vca-base":         '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z"/>',
    "vca-hierarchique": '<path d="M12 3v6M6 21v-6M18 21v-6M6 15a6 6 0 0 1 12 0"/><circle cx="12" cy="9" r="1.4"/>',
    nacelle:            '<path d="M4 21h6v-4H4zM7 17V4l12 3v6"/><path d="M14 13h5"/>',
    "fibre-optique":    '<path d="M4 12c4-6 12-6 16 0M7 12c2.5-3.5 7.5-3.5 10 0"/><circle cx="12" cy="12" r="2"/>',
    beps:               '<path d="M12 21c-4-2.5-7-6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4-3 7.5-7 10z"/><path d="M12 9v4M10 11h4"/>',
    diisocyanates:      '<path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 17l-5-9V3"/><path d="M7.5 14h9"/>',
    // catégories
    cat_securite:   '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3z"/>',
    cat_secours:    '<path d="M12 21c-4-2.5-7-6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4-3 7.5-7 10z"/><path d="M12 9v4M10 11h4"/>',
    cat_technique:  '<path d="M14.5 6a3.5 3.5 0 0 0-4.8 4.8L3 17.5V21h3.5l6.7-6.7A3.5 3.5 0 0 0 18 9.5"/><path d="m14.5 6 1.8-1.8a3.5 3.5 0 0 1 3.5 3.5L18 9.5"/>',
    cat_management: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
    // pages
    page_home:        '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    page_formations:  '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    page_avis:        '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3z"/>',
    page_contact:     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    page_inscription: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M19 8v6M22 11h-6"/>',
    page_faq:         '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    page_agenda:      '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
    // infos pratiques
    "info-address":   '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "info-phone":     '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    "info-email":     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    "info-hours":     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }

  /* -----------------------------------------------------------------------
     Utilitaires : i18n, normalisation (accents), échappement, surlignage
     ----------------------------------------------------------------------- */
  function lang() {
    return (window.WisyI18N && WisyI18N.current()) || document.documentElement.getAttribute("lang") || "fr";
  }
  function t(key) {
    var v = window.WisyI18N ? WisyI18N.get(lang(), key) : null;
    if (v == null && window.I18N) v = (I18N[lang()] && I18N[lang()][key]) || (I18N.fr && I18N.fr[key]);
    return v == null ? key : String(v);
  }
  function fold(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // Surligne les termes trouvés (insensible aux accents), en sécurisant le HTML
  function highlight(text, terms) {
    text = String(text);
    if (!terms || !terms.length) return esc(text);
    var folded = fold(text);
    if (folded.length !== text.length) return esc(text); // repli sûr si l'indexation diverge
    var marks = new Array(text.length);
    terms.forEach(function (term) {
      if (!term) return;
      var from = 0, idx;
      while ((idx = folded.indexOf(term, from)) !== -1) {
        for (var i = idx; i < idx + term.length; i++) marks[i] = true;
        from = idx + term.length;
      }
    });
    var out = "", open = false;
    for (var i = 0; i < text.length; i++) {
      if (marks[i] && !open) { out += "<mark>"; open = true; }
      else if (!marks[i] && open) { out += "</mark>"; open = false; }
      out += esc(text[i]);
    }
    return out + (open ? "</mark>" : "");
  }

  /* -----------------------------------------------------------------------
     Index de recherche (haystack mis en cache par langue)
     ----------------------------------------------------------------------- */
  /* Mots génériques : toute entrée « formation » en est une (« formation nacelle »,
     « formation vca »…). Ils servent à ne pas exclure l'entrée, mais ne donnent
     AUCUN bonus de pertinence (sinon un titre commençant par « Formation »
     passerait devant les autres pour la requête « formation »). */
  var GENERIC_TERMS = { formation: 1, formations: 1, training: 1, trainings: 1, opleiding: 1, opleidingen: 1, schulung: 1, schulungen: 1, course: 1, courses: 1 };
  var GENERIC_HAY = Object.keys(GENERIC_TERMS).join(" ");

  function titleOf(e) { return e.titleKey ? t(e.titleKey) : String(e.title || ""); }
  function subOf(e) { return typeof e.sub === "function" ? e.sub() : (e.sub || ""); }

  function hayOf(e, lg) {
    e._hay = e._hay || {};
    if (!e._hay[lg]) {
      var parts = [titleOf(e)];
      if (e.descKey) parts.push(t(e.descKey));
      if (e.sub) parts.push(subOf(e));
      if (e.cat) { parts.push(t(CATEGORIES[e.cat].labelKey)); parts.push(GENERIC_HAY); }
      if (e.kw) parts.push(e.kw.join(" "));
      e._hay[lg] = fold(parts.join(" "));
    }
    return e._hay[lg];
  }
  function score(e, terms, lg) {
    var hay = hayOf(e, lg);
    for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return -1;
    var title = fold(titleOf(e)), s = 0;
    terms.forEach(function (term) {
      if (GENERIC_TERMS[term]) return;
      if (title.indexOf(term) === 0) s += 6;
      else if (title.indexOf(term) !== -1) s += 3;
      var kw = e.kw || [];
      for (var j = 0; j < kw.length; j++) {
        var k = fold(kw[j]);
        if (k === term) { s += 5; break; }
        if (k.indexOf(term) === 0) { s += 2; break; }
      }
    });
    /* Requête multi-mots : la PHRASE exacte dans le titre ou dans les mots-clés
       (« formation nacelle », « nacelles élévatrices ») remonte le résultat le plus précis. */
    if (terms.length > 1) {
      var phrase = terms.join(" ");
      if (title.indexOf(phrase) !== -1) s += 10;
      if ((e.kw || []).some(function (k) { return fold(k) === phrase; })) s += 8;
    }
    return s;
  }
  function runSearch(query) {
    var lg = lang();
    var terms = fold(query).split(/\s+/).filter(Boolean);
    function collect(list) {
      return list.map(function (e) { return { e: e, s: score(e, terms, lg) }; })
        .filter(function (r) { return r.s >= 0; })
        .sort(function (a, b) { return b.s - a.s || titleOf(a.e).localeCompare(titleOf(b.e)); })
        .map(function (r) { return r.e; });
    }
    var cats = CAT_ORDER.map(function (id) {
      return Object.assign({ id: id, isCat: true }, CATEGORIES[id], { titleKey: CATEGORIES[id].labelKey });
    });
    return { formations: collect(FORMATIONS), categories: collect(cats), pages: collect(PAGES),
      infos: collect(INFOS), faqs: collect(FAQS).slice(0, MAX_FAQ), terms: terms };
  }

  /* -----------------------------------------------------------------------
     Recherches récentes (localStorage, tolérant aux erreurs)
     ----------------------------------------------------------------------- */
  var RKEY = "wisy-recent-search";
  function recents() {
    try { return JSON.parse(localStorage.getItem(RKEY) || "[]").filter(function (x) { return typeof x === "string"; }); }
    catch (e) { return []; }
  }
  function pushRecent(q) {
    q = (q || "").trim();
    if (q.length < 2) return;
    try {
      var list = recents().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
      list.unshift(q);
      localStorage.setItem(RKEY, JSON.stringify(list.slice(0, 5)));
    } catch (e) {}
  }
  function clearRecents() { try { localStorage.removeItem(RKEY); } catch (e) {} }

  /* -----------------------------------------------------------------------
     Construction du composant + injection dans le header sticky
     ----------------------------------------------------------------------- */
  var root, box, input, clearBtn, kbd, panel, listbox, live, currentQuery = "", options = [], activeIdx = -1, optSeq = 0;

  /* Contenu de la bande. Il est AUSSI écrit tel quel dans l'en-tête de chaque page (rendu dès le premier
     affichage : ni saut de mise en page, ni barre qui « apparaît » après 2 à 3 s sur réseau lent). Ce script
     l'ANIME s'il existe ; à défaut (page sans bande statique), il l'injecte à l'identique. Les libellés
     (placeholder, aria-label…) sont posés/traduits par refreshStatic(). */
  function bandHTML() {
    return '<div class="wsy-search__wrap"><div class="wsy-search__inner">' +
      '<div class="wsy-search__box" role="search">' +
        '<span class="wsy-search__icon">' + svg(IC.search) + "</span>" +
        '<input class="wsy-search__input" type="search" role="combobox" aria-autocomplete="list" ' +
          'aria-expanded="false" aria-haspopup="listbox" aria-controls="wsy-search-listbox" ' +
          'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />' +
        '<kbd class="wsy-search__kbd"></kbd>' +
        '<button class="wsy-search__clear" type="button" tabindex="-1">' + svg(IC.clear) + "</button>" +
      "</div>" +
      '<div class="wsy-search__panel">' +
        '<div class="wsy-search__results" id="wsy-search-listbox" role="listbox"></div>' +
        '<div class="wsy-search__foot"></div>' +
      "</div>" +
      '<span class="wsy-search__live" aria-live="polite"></span>' +
    "</div></div>";
  }

  function build() {
    var header = document.querySelector(".site-header");
    if (!header) return false;
    root = header.querySelector(".wsy-search");
    if (!root) {
      root = document.createElement("div");
      root.className = "wsy-search";
      root.innerHTML = bandHTML();
      header.appendChild(root);
    }

    box      = root.querySelector(".wsy-search__box");
    input    = root.querySelector(".wsy-search__input");
    clearBtn = root.querySelector(".wsy-search__clear");
    kbd      = root.querySelector(".wsy-search__kbd");
    panel    = root.querySelector(".wsy-search__panel");
    listbox  = root.querySelector(".wsy-search__results");
    live     = root.querySelector(".wsy-search__live");

    refreshStatic();
    wire();
    return true;
  }

  // Libellés statiques (placeholder, aria, raccourci, pied) — re-appelé au changement de langue
  function refreshStatic() {
    if (!input) return;
    input.setAttribute("placeholder", t("search.placeholder"));
    input.setAttribute("aria-label", t("search.aria_label"));
    box.setAttribute("aria-label", t("search.aria_label"));
    clearBtn.setAttribute("aria-label", t("search.clear"));
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    kbd.textContent = isMac ? "⌘K" : "Ctrl K";
    root.querySelector(".wsy-search__foot").innerHTML =
      '<span class="wsy-search__foot-item"><span class="wsy-search__key">↑</span><span class="wsy-search__key">↓</span>' + esc(t("search.hint_navigate")) + "</span>" +
      '<span class="wsy-search__foot-item"><span class="wsy-search__key">↵</span>' + esc(t("search.hint_select")) + "</span>" +
      '<span class="wsy-search__foot-item"><span class="wsy-search__key">esc</span>' + esc(t("search.hint_close")) + "</span>";
  }

  /* -----------------------------------------------------------------------
     Rendu
     ----------------------------------------------------------------------- */
  function itemHTML(opts) {
    // opts: {id, icon, title, sub, meta, href, recent, thumb, facts}
    optSeq++;
    var id = "wsy-opt-" + optSeq;
    var meta = opts.meta ? '<span class="wsy-search__meta">' + esc(opts.meta) + "</span>" : "";
    var attrs = 'id="' + id + '" role="option" aria-selected="false" class="wsy-search__item' + (opts.facts ? " wsy-search__item--rich" : "") + (opts.faq ? " wsy-search__item--faq" : "") + '"';
    var data = opts.recent ? ' data-recent="' + esc(opts.recent) + '"' : ' href="' + esc(opts.href) + '"';
    var tag = opts.recent ? "div" : "a";
    // Résultat riche : miniature (décorative : le titre porte le sens) à la place du pictogramme
    var lead = opts.thumb
      ? '<span class="wsy-search__ic wsy-search__ic--thumb"><img src="' + esc(opts.thumb) + '" alt="" width="48" height="48" loading="lazy" decoding="async"></span>'
      : '<span class="wsy-search__ic">' + svg(opts.icon) + "</span>";
    return "<" + tag + " " + attrs + data + ' tabindex="-1">' +
      lead +
      '<span class="wsy-search__body">' +
        '<span class="wsy-search__tt">' + opts.title + "</span>" +
        (opts.sub ? '<span class="wsy-search__ds' + (opts.facts ? " wsy-search__ds--wrap" : "") + '">' + opts.sub + "</span>" : "") +
        (opts.facts ? '<span class="wsy-search__facts">' + opts.facts + "</span>" : "") +
      "</span>" + meta +
    "</" + tag + ">";
  }
  function groupHTML(titleText, itemsHTML, extraHeadHTML) {
    return '<div class="wsy-search__group" role="group">' +
      '<div class="wsy-search__grouphd">' + esc(titleText) + (extraHeadHTML || "") + "</div>" +
      itemsHTML + "</div>";
  }
  // Page dédiée si la formation en a une (registre central), sinon ancre du catalogue
  function fUrl(f) { return f.url || "formations.html#" + f.id; }

  function renderFormationItems(list, terms) {
    return list.map(function (f) {
      return itemHTML({
        icon: IC[f.id] || IC.page_formations,
        title: highlight(t(f.titleKey), terms),
        sub: highlight(t(f.descKey), terms),
        meta: t(CATEGORIES[f.cat].labelKey),
        href: fUrl(f),
        thumb: f.thumb,
        // faits clés (durée · format · langues) — uniquement pour les fiches qui en ont
        facts: f.factKeys ? f.factKeys.map(function (k) { return esc(t(k)); }).join(" · ") : ""
      });
    }).join("");
  }

  function render(query) {
    optSeq = 0;
    currentQuery = query;
    var terms = fold(query).split(/\s+/).filter(Boolean);
    var html = "";

    if (!terms.length) {
      // ---- État vide : récents + suggestions ----
      var rec = recents();
      if (rec.length) {
        var recItems = rec.map(function (q) {
          return itemHTML({ icon: IC.clock, title: esc(q), recent: q });
        }).join("");
        var clearBtnHTML = ' <button type="button" class="wsy-search__recent-clear" data-clear-recent style="margin-inline-start:auto;font:inherit;font-size:var(--fs-micro,.75rem);letter-spacing:normal;text-transform:none;color:var(--epinette,#1F6F64);cursor:pointer">' + esc(t("search.recent_clear")) + "</button>";
        html += groupHTML(t("search.recent"), recItems, clearBtnHTML);
      }
      var feat = FEATURED.map(function (id) {
        return FORMATIONS.filter(function (f) { return f.id === id; })[0];
      }).filter(Boolean);
      html += groupHTML(t("search.suggestions"), renderFormationItems(feat, []));
      listbox.innerHTML = html;
      announce("");
      collectOptions();
      setActive(-1);
      return;
    }

    // ---- Résultats ----
    var res = runSearch(query);
    var total = res.formations.length + res.categories.length + res.pages.length + res.infos.length + res.faqs.length;

    if (!total) {
      html = '<div class="wsy-search__empty">' +
        '<div class="wsy-search__empty-ic">' + svg(IC.search) + "</div>" +
        '<div class="wsy-search__empty-tt">' + esc(t("search.empty_title")) + "</div>" +
        '<p class="wsy-search__empty-tx">' + esc(t("search.empty_text")) + "</p>" +
        '<p class="wsy-search__empty-tx" style="margin-bottom:.7rem">' + esc(t("search.empty_suggest")) + "</p>" +
        '<div class="wsy-search__chips">' +
          CAT_ORDER.map(function (id) {
            return '<button type="button" class="wsy-search__chip" data-cat="' + id + '">' +
              svg(IC["cat_" + id]) + esc(t(CATEGORIES[id].labelKey)) + "</button>";
          }).join("") +
        "</div></div>";
      listbox.innerHTML = html;
      announce(t("search.empty_title"));
      collectOptions();
      setActive(-1);
      return;
    }

    if (res.formations.length) {
      html += groupHTML(t("search.group_formations"), renderFormationItems(res.formations, res.terms));
    }
    if (res.categories.length) {
      html += groupHTML(t("search.group_categories"), res.categories.map(function (c) {
        return itemHTML({
          icon: IC["cat_" + c.id],
          title: highlight(t(c.labelKey), res.terms),
          sub: c.count + " " + t(c.count === 1 ? "search.formation_word" : "search.formations_word"),
          href: "formations.html?cat=" + c.filter
        });
      }).join(""));
    }
    if (res.pages.length) {
      html += groupHTML(t("search.group_pages"), res.pages.map(function (p) {
        return itemHTML({
          icon: IC["page_" + p.id],
          title: highlight(t(p.titleKey), res.terms),
          sub: highlight(t(p.descKey), res.terms),
          href: p.url
        });
      }).join(""));
    }
    if (res.infos.length) {
      html += groupHTML(t("search.group_info"), res.infos.map(function (e) {
        return itemHTML({ icon: IC[e.id], title: highlight(titleOf(e), res.terms), sub: highlight(subOf(e), res.terms), href: e.url });
      }).join(""));
    }
    if (res.faqs.length) {
      html += groupHTML(t("search.group_faq"), res.faqs.map(function (e) {
        return itemHTML({ icon: IC.page_faq, title: highlight(e.title, res.terms), href: e.url, faq: true });
      }).join(""));
    }

    listbox.innerHTML = html;
    announce(total + " " + t("search.results_word"));
    collectOptions();
    setActive(0); // pré-sélectionne le meilleur résultat (Entrée immédiate)
  }

  function announce(msg) { if (live) live.textContent = msg; }

  /* -----------------------------------------------------------------------
     Navigation clavier (aria-activedescendant)
     ----------------------------------------------------------------------- */
  function collectOptions() {
    options = Array.prototype.slice.call(listbox.querySelectorAll('[role="option"]'));
  }
  function setActive(i) {
    if (options[activeIdx]) {
      options[activeIdx].classList.remove("is-active");
      options[activeIdx].setAttribute("aria-selected", "false");
    }
    activeIdx = i;
    if (i < 0 || !options[i]) { input.removeAttribute("aria-activedescendant"); return; }
    var el = options[i];
    el.classList.add("is-active");
    el.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  }
  function move(delta) {
    if (!options.length) return;
    var i = activeIdx < 0 ? (delta > 0 ? 0 : options.length - 1) : (activeIdx + delta + options.length) % options.length;
    setActive(i);
  }

  /* -----------------------------------------------------------------------
     Ouverture / fermeture
     ----------------------------------------------------------------------- */
  function open() {
    if (root.classList.contains("is-open")) return;
    root.classList.add("is-open");
    input.setAttribute("aria-expanded", "true");
  }
  function close() {
    if (!root.classList.contains("is-open")) return;
    root.classList.remove("is-open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIdx = -1;
  }
  function focusSearch() {
    // Le header est sticky : la barre est déjà visible en haut.
    if (window.scrollY > 0 && !reduceMotion) { /* laisse la barre là où elle est */ }
    input.focus();
    input.select();
    open();
    render(input.value.trim());
  }

  /* -----------------------------------------------------------------------
     Sélection / navigation vers un résultat
     ----------------------------------------------------------------------- */
  // Défilement vers un élément avec décalage LIVE sous le header sticky (dont la
  // hauteur varie selon l'état). Le CSS (scroll-margin-top) couvre le scroll natif.
  function scrollToEl(el, instant) {
    var header = document.querySelector(".site-header");
    var offset = (header ? header.offsetHeight : 0) + 24;
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: (instant || reduceMotion) ? "auto" : "smooth" });
  }
  // Atterrissage en deux temps : 1er scroll → la util-bar se replie (~450ms) →
  // 2e scroll une fois le header stabilisé, pour un décalage exact et déterministe.
  function landOn(el) {
    scrollToEl(el, true);
    setTimeout(function () { scrollToEl(el, true); }, 560);
  }
  function applyCategory(filter, scroll) {
    var btn = document.querySelector('.fo-filter[data-filter="' + filter + '"]');
    if (btn) {
      btn.click();
      if (scroll) {
        var sec = document.getElementById("formations") || btn.closest(".section");
        if (sec) scrollToEl(sec);
      }
      return true;
    }
    return false;
  }
  function samePath(a) { return a.pathname === location.pathname; }
  function go(href) {
    pushRecent(currentQuery);
    var a = document.createElement("a"); a.href = href;
    var cat = null;
    try { cat = new URLSearchParams(a.search).get("cat"); } catch (e) {}

    if (samePath(a) && cat) {                 // même page : filtrer sans recharger
      close(); input.blur();
      if (applyCategory(cat, true)) return;
    }
    if (samePath(a) && a.hash) {              // même page : ancre → scroll doux
      var target = document.getElementById(a.hash.slice(1));
      if (target) {
        // si un filtre masque la cible, revenir à « toutes »
        if (target.classList && target.classList.contains("is-hidden")) applyCategory("all", false);
        close(); input.blur();
        try { history.replaceState(null, "", a.hash); } catch (e) {}
        scrollToEl(target);
        setTimeout(function () { scrollToEl(target, true); }, 560); // recale après repli util-bar
        return;
      }
    }
    if (samePath(a) && !a.hash && !a.search) { // même page (accueil) : remonter
      close(); input.blur();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    window.location.href = href;             // navigation inter-pages classique
  }
  function selectByEl(el) {
    if (!el) return;
    var recent = el.getAttribute("data-recent");
    if (recent != null) {
      input.value = recent;
      root.classList.toggle("has-text", recent.trim().length > 0);
      render(recent); input.focus(); return;
    }
    var href = el.getAttribute("href");
    if (href) go(href);
  }
  function selectActive() {
    var el = options[activeIdx] || options[0];
    selectByEl(el);
  }

  /* -----------------------------------------------------------------------
     Événements
     ----------------------------------------------------------------------- */
  var debounceTimer = null;
  function onInput() {
    var v = input.value;
    root.classList.toggle("has-text", v.trim().length > 0);
    open();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { render(v.trim()); }, 110);
  }

  function wire() {
    input.addEventListener("input", onInput);
    input.addEventListener("focus", function () { ensureExtras(); open(); render(input.value.trim()); });

    input.addEventListener("keydown", function (e) {
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); open(); move(1); break;
        case "ArrowUp":   e.preventDefault(); open(); move(-1); break;
        case "Enter":
          if (root.classList.contains("is-open") && options.length) { e.preventDefault(); selectActive(); }
          break;
        case "Escape":
          if (root.classList.contains("is-open")) { e.preventDefault(); close(); }
          else if (input.value) { input.value = ""; root.classList.remove("has-text"); render(""); }
          else { input.blur(); }
          break;
        case "Tab": close(); break;
      }
    });

    // Garde le focus dans l'input lors d'un clic sur un résultat (évite la fermeture prématurée)
    panel.addEventListener("mousedown", function (e) {
      if (e.target.closest("a, button, [role=option]")) e.preventDefault();
    });
    panel.addEventListener("click", function (e) {
      var clearR = e.target.closest("[data-clear-recent]");
      if (clearR) { clearRecents(); render(""); input.focus(); return; }
      var chip = e.target.closest(".wsy-search__chip");
      if (chip) { go("formations.html?cat=" + chip.getAttribute("data-cat")); return; }
      var opt = e.target.closest("[role=option]");
      if (!opt) return;
      // Préserve ouvrir-dans-un-nouvel-onglet (clic milieu / cmd / ctrl)
      if (e.metaKey || e.ctrlKey || e.button === 1) return;
      e.preventDefault();
      selectByEl(opt);
    });
    // Suit la souris pour synchroniser l'élément actif
    listbox.addEventListener("mousemove", function (e) {
      var opt = e.target.closest("[role=option]");
      if (opt) { var i = options.indexOf(opt); if (i > -1 && i !== activeIdx) setActive(i); }
    });

    clearBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    clearBtn.addEventListener("click", function () {
      input.value = ""; root.classList.remove("has-text"); render(""); input.focus();
    });

    // Ferme si le focus quitte complètement le composant (Tab sortant)
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) close();
    });
    // Ferme au clic à l'extérieur
    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) close();
    });

    // Raccourcis globaux : ⌘K / Ctrl+K, et « / » (hors saisie)
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); focusSearch(); return; }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) { e.preventDefault(); focusSearch(); }
    });

    // Re-rendu à chaud lors d'un changement de langue
    document.addEventListener("i18n:changed", function () {
      // purge le cache d'index (les libellés ont changé)
      purgeCaches();
      refreshStatic();
      if (root.classList.contains("is-open")) render(input.value.trim());
    });
  }
  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  /* -----------------------------------------------------------------------
     Lien profond : /formations.html?cat=xxx applique le filtre à l'arrivée
     ----------------------------------------------------------------------- */
  function initDeepLink() {
    var isFormations = /(^|\/)formations\.html$/.test(location.pathname);
    if (!isFormations) return;
    var cat;
    try { cat = new URLSearchParams(location.search).get("cat"); } catch (e) { return; }
    if (!cat) return;
    // Les écouteurs de filtre sont posés à l'analyse du script inline (fin de body),
    // donc déjà prêts au DOMContentLoaded : on agit vite, avec un filet au load.
    var run = function () { applyCategory(cat, true); };
    requestAnimationFrame(run);
    if (document.readyState !== "complete") window.addEventListener("load", run, { once: true });
  }

  // Atterrissage précis sur une ancre de formation (corrige le scroll natif
  // faussé par les images lazy + décale sous le header sticky). Uniquement
  // pour les ancres de formations — n'affecte aucun autre lien du site.
  function initHashScroll() {
    var landing = function () {
      var id = (location.hash || "").slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      var isFormation = (el.classList && el.classList.contains("fo-card")) ||
        id === "formations" || FORMATIONS.some(function (f) { return f.id === id; });
      if (!isFormation) return;
      if (el.classList && el.classList.contains("is-hidden")) applyCategory("all", false);
      landOn(el); // atterrissage en deux temps (gère le repli de la util-bar)
    };
    // Rapide (DOM prêt, cartes à hauteur fixe) + filet après chargement complet.
    requestAnimationFrame(landing);
    if (document.readyState !== "complete") window.addEventListener("load", landing, { once: true });
  }

  /* ----------------------------------------------------------------------- */
  function init() {
    if (!build()) return;
    initDeepLink();
    initHashScroll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
