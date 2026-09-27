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
   • Barre « suggestive », d'après « Placeholders And Vanish Input » (Aceternity UI, 21st.dev) : de vraies
     recherches du site défilent dans le champ vide, bouton d'envoi rond, et le texte saisi « se dissout » en
     particules à l'envoi (Entrée / bouton) avant d'ouvrir le premier résultat. Rien en mouvement réduit.
   • Mode « Spotlight » (d'après Apple Spotlight, 21st.dev) : à l'ouverture, la page s'estompe derrière un voile
     flouté ; filtres par type (Tout · Formations · Sessions…) et APERÇU du résultat actif (photo, faits, tarif
     confirmé, boutons « Voir le détail » / « S'inscrire »). Pastilles « Essayez » à côté de la barre (grand écran).
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
      /* Tarif du registre (jamais recopié) : affiché dans les résultats seulement s'il est « par personne » confirmé. */
      priceLabel: f.priceLabel, priceUnit: f.priceUnit,
      /* Fiche riche (page dédiée) : titre complet, résumé, miniature et faits clés ; sinon accroche courte. */
      titleKey: f.fullTitleKey || f.titleKey, descKey: f.summaryKey || f.taglineKey,
      kw: f.searchKeywords || f.keywords,
      thumb: f.thumb, factKeys: f.factKeys, image: f.image, signupUrl: f.signupUrl
    };
  });

  /* Services d'entreprise (« VCA Entreprise ») : leur propre groupe de résultats — jamais mélangés aux formations (la VCA Base est un
     diplôme individuel, VCA Entreprise un accompagnement à la certification d'une entreprise). Tout vient du registre (`Site.services()`). */
  var SERVICES = (Site.services ? Site.services() : []).map(function (s) {
    return { id: s.id, url: s.url, titleKey: s.titleKey, descKey: s.taglineKey, kw: s.searchKeywords, thumb: s.thumb,
      levels: s.levels, priceLabel: s.priceLabel, priceUnit: s.priceUnit, priceIndicative: s.priceIndicative, image: s.image, signupUrl: s.signupUrl };
  });

  /* Pages du site — les ARTICLES (`kind: "article"`) forment leur propre groupe de résultats. */
  var PAGES = [], ARTICLES = [];
  Site.pages().forEach(function (p) {
    (p.kind === "article" ? ARTICLES : PAGES).push({ id: p.id, url: p.url, titleKey: p.titleKey, descKey: p.descKey, kw: p.keywords, article: p.kind === "article" });
  });

  /* Accès rapides (état vide) : la fiche VCA Base (ancres de sa page) + l'adresse. */
  var VCA = Site.formation("vca-base");
  var QUICK = VCA ? [
    { id: "pop_vca",     labelKey: "search.pop_vca",     icon: "vca-base",     href: VCA.url },
    { id: "pop_vcae",    labelKey: SERVICES.length ? SERVICES[0].titleKey : "nav.vca_entreprise", icon: "service", href: SERVICES.length ? SERVICES[0].url : "vca-entreprise.html" },
    { id: "pop_price",   labelKey: "search.pop_price",   icon: "quick-price",  href: VCA.url + "#apercu" },
    { id: "pop_dates",   labelKey: "search.pop_dates",   icon: "page_agenda",  href: VCA.url + "#disponibilites" },
    { id: "pop_exam",    labelKey: "search.pop_exam",    icon: "quick-exam",   href: VCA.url + "#examen" },
    { id: "pop_address", labelKey: "search.pop_address", icon: "info-address", href: "contact.html" }
  ] : [];

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

  /* Traduction des questions : pack js/faq-i18n/faq-<langue>.js, chargé à la demande (repli : français). */
  function ensureFaqPack(done) {
    var l = lang(), F = window.WisyFAQ;
    if (l === "fr" || !F || !F.register || (F.hasPack && F.hasPack(l))) { done(); return; }
    var el = document.createElement("script");
    el.src = "js/faq-i18n/faq-" + l + ".js"; el.async = true;
    el.onload = function () { done(); };
    el.onerror = function () { done(); };
    document.head.appendChild(el);
  }
  function buildExtras() {
    var F = window.WisyFAQ;
    if (!F || !F.items) return;
    var L = lang();
    FAQS = F.items(L).map(function (it) {
      var fr = L !== "fr" && F.get ? F.get(it.id) : null;   // + mots-clés français : une saisie en français reste comprise
      var kw = (it.keywords || []).concat(it.synonyms || []);
      if (fr) kw = kw.concat(fr.keywords || [], fr.synonyms || []);
      return { id: it.id, title: it.question, answer: String(it.answer || "").replace(/\s+/g, " ").slice(0, 280), url: "faq.html#" + it.id, kw: kw };
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
  function purgeCaches() { FORMATIONS.concat(SERVICES, PAGES, ARTICLES, FAQS, INFOS, SESSIONS).forEach(function (e) { e._hay = null; }); }

  /* -----------------------------------------------------------------------
     Sessions PUBLIÉES (js/sessions.js, source unique des dates) : chargées À LA DEMANDE au premier usage de la
     barre — jamais sur le chemin critique. Aucune date n'est écrite ici : sans session, le groupe n'existe pas.
     ----------------------------------------------------------------------- */
  var SESSIONS = [];             // entrées { id, session, title, sub, url, kw } (langue courante)
  var sessionsState = "idle";    // idle | loading | ready | failed
  var MAX_SESSIONS = 3;
  function buildSessions() {
    var W = window.WisySessions;
    SESSIONS = [];
    if (!W) return;
    var lg = lang();
    W.upcoming(W.peek()).slice(0, 30).forEach(function (s) {
      var f = FORMATIONS.filter(function (x) { return x.id === s.training; })[0];
      var fmt = W.format(s, lg), full = s.status === "full" || s.seatsLeft === 0;
      var seats = full ? t("search.session_full") : (s.seatsLeft != null ? t("search.session_seats").replace("{n}", s.seatsLeft) : "");
      SESSIONS.push({
        id: "sess-" + s.id, session: s, full: full,
        title: (f ? t(f.titleKey) : s.training) + " — " + fmt.dateLong,
        sub: [fmt.time, fmt.language, seats].filter(Boolean).join(" · "),
        /* inscription directe (formation + session) ; session complète → agenda */
        url: full ? "agenda.html" : W.signupUrl(s, s.training),
        kw: [t("search.group_sessions"), "session", "sessions", "date", "dates", "agenda", "calendrier", "prochaine", "prochaines", "planning", "inscription", s.date, fmt.dateShort, fmt.weekday, fmt.time]
      });
    });
    purgeCaches();
  }
  function ensureSessions() {
    if (sessionsState !== "idle") return;
    sessionsState = "loading";
    var wanted = [];
    if (!window.WISY_CONFIG) wanted.push("js/supabase-config.js");
    if (!window.WISY_SESSIONS) wanted.push("js/sessions-data.js");
    if (!window.WisySessions) wanted.push("js/sessions.js");
    var left = wanted.length, failed = false;
    function done() {
      if (failed || !window.WisySessions) { sessionsState = "failed"; return; }
      window.WisySessions.load().then(function () {
        buildSessions(); sessionsState = "ready";
        if (root && root.classList.contains("is-open")) render(input.value.trim());
      });
    }
    if (!left) { done(); return; }
    wanted.forEach(function (src) {
      var el = document.createElement("script");
      el.src = src; el.async = false;
      el.onload = function () { if (!--left) done(); };
      el.onerror = function () { failed = true; if (!--left) done(); };
      document.head.appendChild(el);
    });
  }
  function ensureExtras() {
    if (extras !== "idle") return;
    if (window.WisyFAQ && window.WisyFAQ.items) { extras = "loading"; ensureFaqPack(function () { buildExtras(); extras = "ready"; purgeCaches(); if (root && root.classList.contains("is-open")) render(input.value.trim()); }); return; }
    extras = "loading";
    var el = document.createElement("script");
    el.src = FAQ_SCRIPT; el.async = true;
    el.onload = function () {
      ensureFaqPack(function () {
        buildExtras(); extras = "ready"; purgeCaches();
        if (root && root.classList.contains("is-open")) render(input.value.trim());   // affiche aussitôt les résultats enrichis
      });
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
    go:     '<path class="wsy-search__shaft" d="M5 12h14"/><path d="m13 18 6-6"/><path d="m13 6 6 6"/>',
    arrow:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
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
    service:          '<path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01"/>',
    // pages
    page_home:        '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    page_formations:  '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    page_avis:        '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3z"/>',
    page_contact:     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    page_inscription: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M19 8v6M22 11h-6"/>',
    page_faq:         '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    page_agenda:      '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
    page_peb:         '<path d="M4 16.5a8 8 0 1 1 16 0"/><path d="M12 16.5 16 11"/><path d="M2.5 16.5h19"/>',
    // infos pratiques
    "info-address":   '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "info-phone":     '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    "info-email":     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    "info-hours":     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    // articles, sessions, accès rapides
    page_article:     '<path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5M8 13h8M8 17h5"/>',
    session:          '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M9 15l2 2 4-4.5"/>',
    "quick-price":    '<path d="M18 7a6 6 0 0 0-5-3 6 6 0 0 0 0 16 6 6 0 0 0 5-3M4 10h9M4 14h9"/>',
    "quick-exam":     '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'
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
    function collectScored(list) {
      return list.map(function (e) { return { e: e, s: score(e, terms, lg) }; })
        .filter(function (r) { return r.s >= 0; })
        .sort(function (a, b) { return b.s - a.s || titleOf(a.e).localeCompare(titleOf(b.e)); });
    }
    function collect(list) { return collectScored(list).map(function (r) { return r.e; }); }
    var cats = CAT_ORDER.map(function (id) {
      return Object.assign({ id: id, isCat: true }, CATEGORIES[id], { titleKey: CATEGORIES[id].labelKey });
    });
    /* Formations ET services : le service passe DEVANT seulement s'il est nettement plus pertinent (« vca entreprise », « vca** », « certification
       entreprise »). Sur une requête ambiguë (« vca », « certification vca »), la formation VCA Base reste en tête : marge de 3 points. */
    var frm = collectScored(FORMATIONS), svc = collectScored(SERVICES);
    var servicesFirst = svc.length > 0 && (!frm.length || svc[0].s >= frm[0].s + 3);
    return { formations: frm.map(function (r) { return r.e; }), services: svc.map(function (r) { return r.e; }), servicesFirst: servicesFirst,
      categories: collect(cats), pages: collect(PAGES), articles: collect(ARTICLES),
      sessions: collect(SESSIONS).slice(0, MAX_SESSIONS),
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
  var root, box, input, clearBtn, goBtn, fx, kbd, panel, listbox, live, tries, scopes, preview, scrim, currentQuery = "", options = [], activeIdx = -1, optSeq = 0;

  /* Contenu de la bande. Il est AUSSI écrit tel quel dans l'en-tête de chaque page (rendu dès le premier
     affichage : ni saut de mise en page, ni barre qui « apparaît » après 2 à 3 s sur réseau lent). Ce script
     l'ANIME s'il existe ; à défaut (page sans bande statique), il l'injecte à l'identique. Les libellés
     (placeholder, aria-label…) sont posés/traduits par refreshStatic(). */
  function bandHTML() {
    return '<div class="wsy-search__wrap"><div class="wsy-search__inner">' +
      '<div class="wsy-search__tries"></div>' +
      '<div class="wsy-search__box" role="search">' +
        '<span class="wsy-search__icon">' + svg(IC.search) + "</span>" +
        '<input class="wsy-search__input" type="search" role="combobox" aria-autocomplete="list" ' +
          'aria-expanded="false" aria-haspopup="listbox" aria-controls="wsy-search-listbox" ' +
          'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />' +
        '<span class="wsy-search__fx" aria-hidden="true"></span>' +
        '<kbd class="wsy-search__kbd"></kbd>' +
        '<button class="wsy-search__clear" type="button" tabindex="-1">' + svg(IC.clear) + "</button>" +
        '<button class="wsy-search__go" type="button" disabled>' + svg(IC.go) + "</button>" +
      "</div>" +
      '<div class="wsy-search__panel">' +
        '<div class="wsy-search__scopes"></div>' +
        '<div class="wsy-search__main">' +
          '<div class="wsy-search__results" id="wsy-search-listbox" role="listbox"></div>' +
          '<div class="wsy-search__preview"></div>' +
        "</div>" +
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
    goBtn    = root.querySelector(".wsy-search__go");
    fx       = root.querySelector(".wsy-search__fx");
    kbd      = root.querySelector(".wsy-search__kbd");
    panel    = root.querySelector(".wsy-search__panel");
    listbox  = root.querySelector(".wsy-search__results");
    tries    = root.querySelector(".wsy-search__tries");
    scopes   = root.querySelector(".wsy-search__scopes");
    preview  = root.querySelector(".wsy-search__preview");
    /* Voile du mode Spotlight : au niveau du <body> (la bande a un backdrop-filter, qui piégerait un position:fixed) ;
       l'en-tête collant (z-index 1000) reste net au-dessus. */
    scrim = document.createElement("div");
    scrim.className = "wsy-search-scrim";
    scrim.setAttribute("aria-hidden", "true");
    document.body.appendChild(scrim);
    live     = root.querySelector(".wsy-search__live");

    refreshStatic();
    wire();
    syncText();                              // valeur restaurée par le navigateur (retour arrière) : état cohérent
    if (fx && !reduceMotion) { root.classList.add("is-fx"); fxStart(); }
    return true;
  }

  // Libellés statiques (placeholder, aria, raccourci, pied) — re-appelé au changement de langue
  function refreshStatic() {
    if (!input) return;
    input.setAttribute("placeholder", t("search.placeholder"));
    input.setAttribute("aria-label", t("search.aria_label"));
    box.setAttribute("aria-label", t("search.aria_label"));
    clearBtn.setAttribute("aria-label", t("search.clear"));
    if (goBtn) goBtn.setAttribute("aria-label", t("search.go"));
    fxList = t("search.fx_list").split("|").filter(function (x) { return x.trim(); });
    if (fx) fx.textContent = fxText();
    if (tries) {
      tries.setAttribute("role", "group");
      tries.setAttribute("aria-labelledby", "wsy-try-lbl");
      tries.innerHTML = '<span class="wsy-search__tries-lbl" id="wsy-try-lbl">' + esc(t("search.try")) + "</span>" +
        fxList.slice(0, 4).map(function (q) { return '<button type="button" class="wsy-search__try" data-q="' + esc(q) + '">' + esc(q) + "</button>"; }).join("");
    }
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
    var attrs = 'id="' + id + '" role="option" aria-selected="false" class="wsy-search__item' + (opts.facts ? " wsy-search__item--rich" : "") + (opts.faq ? " wsy-search__item--faq" : "") + '"' +
      (opts.pv ? ' data-pv="' + (pvList.push(opts.pv) - 1) + '"' : "");
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
  var grpSeq = 0;
  /* Groupe de résultats nommé pour les lecteurs d'écran (aria-labelledby → en-tête du groupe). */
  function groupHTML(titleText, itemsHTML, extraHeadHTML) {
    var gid = "wsy-grp-" + (++grpSeq);
    return '<div class="wsy-search__group" role="group" aria-labelledby="' + gid + '">' +
      '<div class="wsy-search__grouphd" id="' + gid + '">' + esc(titleText) + (extraHeadHTML || "") + "</div>" +
      itemsHTML + "</div>";
  }
  // Page dédiée si la formation en a une (registre central), sinon ancre du catalogue
  function fUrl(f) { return f.url || "formations.html#" + f.id; }

  /* -----------------------------------------------------------------------
     APERÇU (panneau de droite) : ce que l'option active contient — photo, faits, tarif CONFIRMÉ (mêmes règles que la
     liste : « par personne » seulement, « indicatif » signalé), boutons « Voir le détail » / « S'inscrire ».
     ----------------------------------------------------------------------- */
  var pvList = [], pvDefault = null, pvShown = -2;
  function perPerson(x) {
    return x.priceLabel && x.priceUnit === "participant" ? x.priceLabel + " " + t("search.per_person") + (x.priceIndicative ? " · " + t("search.indicative") : "") : "";
  }
  function pvFormation(f) {
    return { label: t(CATEGORIES[f.cat].labelKey), title: t(f.titleKey), desc: t(f.descKey), img: f.image, icon: IC[f.id] || IC.page_formations,
      facts: (f.factKeys || []).map(t), price: perPerson(f), href: fUrl(f), signup: f.signupUrl };
  }
  function pvService(x) {
    return { label: t("search.group_services"), title: t(x.titleKey), desc: t(x.descKey), img: x.image, icon: IC.service,
      facts: x.levels, price: perPerson(x), href: x.url, signup: x.signupUrl };
  }
  function pvHTML(p) {
    var btn = function (href, label, ghost) {
      return '<a class="wsy-search__pv-btn' + (ghost ? " wsy-search__pv-btn--ghost" : "") + '" href="' + esc(href) + '">' + esc(label) + (ghost ? "" : svg(IC.arrow)) + "</a>";
    };
    return '<div class="wsy-search__pv">' +
      (p.img ? '<span class="wsy-search__pv-media"><img src="' + esc(p.img) + '" alt="" width="640" height="400" decoding="async"></span>'
             : '<span class="wsy-search__pv-media wsy-search__pv-media--ic">' + svg(p.icon || IC.search) + "</span>") +
      (p.label ? '<span class="wsy-search__pv-kicker">' + esc(p.label) + "</span>" : "") +
      '<span class="wsy-search__pv-title">' + esc(p.title) + "</span>" +
      (p.desc ? '<span class="wsy-search__pv-desc">' + esc(p.desc) + "</span>" : "") +
      (p.facts && p.facts.length ? '<span class="wsy-search__pv-facts">' + p.facts.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</span>" : "") +
      (p.price ? '<span class="wsy-search__pv-price">' + esc(p.price) + "</span>" : "") +
      (p.href || p.signup ? '<span class="wsy-search__pv-cta">' + (p.href ? btn(p.href, p.cta || t("search.pv_open")) : "") + (p.signup ? btn(p.signup, t("header.register"), true) : "") + "</span>" : "") +
    "</div>";
  }
  function showPreview(i) {
    if (!preview) return;
    var el = options[i], k = el && el.hasAttribute("data-pv") ? +el.getAttribute("data-pv") : -1, p = k >= 0 ? pvList[k] : pvDefault;
    if (k === pvShown) return;
    pvShown = k;
    preview.innerHTML = p ? pvHTML(p) : "";
  }

  function renderFormationItems(list, terms) {
    return list.map(function (f) {
      return itemHTML({
        icon: IC[f.id] || IC.page_formations,
        title: highlight(t(f.titleKey), terms),
        sub: highlight(t(f.descKey), terms),
        meta: t(CATEGORIES[f.cat].labelKey),
        href: fUrl(f),
        thumb: f.thumb,
        pv: pvFormation(f),
        // faits clés (durée · format · langues) — uniquement pour les fiches qui en ont ; le tarif (registre) s'y ajoute
        // seulement s'il est confirmé « par personne » (aucune mention HT / TTC inventée)
        facts: f.factKeys ? f.factKeys.map(function (k) { return esc(t(k)); })
          .concat(f.priceLabel && f.priceUnit === "participant" ? [esc(f.priceLabel + " " + t("search.per_person"))] : []).join(" · ") : ""
      });
    }).join("");
  }

  /* Ligne d'un SERVICE : miniature, accroche, niveaux (VCA*, VCA**, VCA-P) et tarif du registre — « par personne · tarif indicatif »,
     jamais une mention HT / TTC inventée. */
  function renderServiceItems(list, terms) {
    return list.map(function (x) {
      return itemHTML({
        icon: IC.service,
        title: highlight(t(x.titleKey), terms),
        sub: highlight(t(x.descKey), terms),
        href: x.url,
        thumb: x.thumb,
        pv: pvService(x),
        facts: x.levels.map(esc)
          .concat(x.priceLabel && x.priceUnit === "participant" ? [esc(x.priceLabel + " " + t("search.per_person") + (x.priceIndicative ? " · " + t("search.indicative") : ""))] : []).join(" · ")
      });
    }).join("");
  }

  var scope = "all";                       // filtre actif : all | formations | services | sessions | pages | help
  function render(query) {
    optSeq = 0; grpSeq = 0; pvList = []; pvShown = -2; pvDefault = null;
    currentQuery = query;
    var terms = fold(query).split(/\s+/).filter(Boolean);
    var html = "";

    if (!terms.length) {
      // ---- État vide : récents + suggestions ----
      var rec = recents();
      if (rec.length) {
        var recItems = rec.map(function (q) {
          return itemHTML({ icon: IC.clock, title: esc(q), recent: q, pv: { label: t("search.recent"), title: q, icon: IC.clock } });
        }).join("");
        var clearBtnHTML = ' <button type="button" class="wsy-search__recent-clear" data-clear-recent style="margin-inline-start:auto;font:inherit;font-size:var(--fs-micro,.75rem);letter-spacing:normal;text-transform:none;color:var(--epinette,#1F6F64);cursor:pointer">' + esc(t("search.recent_clear")) + "</button>";
        html += groupHTML(t("search.recent"), recItems, clearBtnHTML);
      }
      // Accès rapides : chaque lien est une OPTION (navigable aux flèches), pas un bouton hors du clavier
      if (QUICK.length) {
        html += groupHTML(t("search.popular"), QUICK.map(function (q) {
          return itemHTML({ icon: IC[q.icon], title: esc(t(q.labelKey)), href: q.href, pv: { label: t("search.popular"), title: t(q.labelKey), href: q.href, icon: IC[q.icon] } });
        }).join(""));
      }
      var feat = FEATURED.map(function (id) {
        return FORMATIONS.filter(function (f) { return f.id === id; })[0];
      }).filter(Boolean);
      html += groupHTML(t("search.suggestions"), renderFormationItems(feat, []));
      if (SERVICES.length) html += groupHTML(t("search.group_services"), renderServiceItems(SERVICES, []));
      if (scopes) scopes.innerHTML = "";
      pvDefault = feat.length ? pvFormation(feat[0]) : null;       // aperçu d'accueil : la formation phare
      listbox.innerHTML = html;
      announce("");
      collectOptions();
      setActive(-1);
      return;
    }

    // ---- Résultats ----
    var res = runSearch(query);
    var total = res.formations.length + res.services.length + res.categories.length + res.pages.length + res.articles.length + res.sessions.length + res.infos.length + res.faqs.length;
    if (scopes) scopes.innerHTML = "";          // filtres reposés plus bas s'il y a des résultats

    if (!total && (extras === "loading" || sessionsState === "loading")) {
      // Les contenus à la demande (Centre d'aide, sessions) arrivent : on le dit plutôt que d'annoncer « aucun résultat ».
      listbox.innerHTML = '<div class="wsy-search__empty" role="status"><div class="wsy-search__empty-tt">' + esc(t("search.loading")) + "</div></div>";
      announce(t("search.loading"));
      collectOptions();
      setActive(-1);
      return;
    }
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

    /* Filtres par type (pastilles au-dessus des résultats) : seuls les types présents, avec leur nombre. */
    var counts = { all: total, formations: res.formations.length + res.categories.length, services: res.services.length,
      sessions: res.sessions.length, pages: res.pages.length + res.articles.length + res.infos.length, help: res.faqs.length };
    var SCOPE_LABEL = { all: "search.scope_all", formations: "search.group_formations", services: "search.group_services",
      sessions: "search.group_sessions", pages: "search.group_pages", help: "search.group_faq" };
    if (!counts[scope]) scope = "all";
    if (scopes) scopes.innerHTML = Object.keys(SCOPE_LABEL).filter(function (k) { return counts[k]; }).map(function (k) {
      return '<button type="button" class="wsy-search__scope" data-scope="' + k + '" aria-pressed="' + (k === scope) + '">' +
        esc(t(SCOPE_LABEL[k])) + '<span class="wsy-search__scope-n">' + counts[k] + "</span></button>";
    }).join("");
    var show = function (k) { return scope === "all" || scope === k; };

    /* Formations et services : deux groupes distincts, dans l'ordre de pertinence (voir runSearch). */
    var frmHTML = res.formations.length && show("formations") ? groupHTML(t("search.group_formations"), renderFormationItems(res.formations, res.terms)) : "";
    var svcHTML = res.services.length && show("services") ? groupHTML(t("search.group_services"), renderServiceItems(res.services, res.terms)) : "";
    html += res.servicesFirst ? svcHTML + frmHTML : frmHTML + svcHTML;
    if (res.sessions.length && show("sessions")) {
      // Sessions publiées (dates lues dans js/sessions.js) : titre = formation + date ; lien = inscription à CETTE session
      html += groupHTML(t("search.group_sessions"), res.sessions.map(function (e) {
        return itemHTML({ icon: IC.session, title: highlight(e.title, res.terms), sub: highlight(e.sub, res.terms), href: e.url,
          pv: { label: t("search.group_sessions"), title: e.title, desc: e.sub, href: e.url, icon: IC.session, cta: e.full ? "" : t("header.register") } });
      }).join("") + itemHTML({ icon: IC.page_agenda, title: esc(t("search.sessions_all")), href: "agenda.html",
        pv: { label: t("search.group_sessions"), title: t("search.sessions_all"), desc: t("search.page_agenda_d"), href: "agenda.html", icon: IC.page_agenda } }));
    }
    if (res.articles.length && show("pages")) {
      html += groupHTML(t("search.group_articles"), res.articles.map(function (p) {
        return itemHTML({ icon: IC.page_article, title: highlight(t(p.titleKey), res.terms), sub: highlight(t(p.descKey), res.terms), href: p.url,
          pv: { label: t("search.group_articles"), title: t(p.titleKey), desc: t(p.descKey), href: p.url, icon: IC.page_article } });
      }).join(""));
    }
    if (res.categories.length && show("formations")) {
      html += groupHTML(t("search.group_categories"), res.categories.map(function (c) {
        return itemHTML({
          icon: IC["cat_" + c.id],
          title: highlight(t(c.labelKey), res.terms),
          sub: c.count + " " + t(c.count === 1 ? "search.formation_word" : "search.formations_word"),
          href: "formations.html?cat=" + c.filter,
          pv: { label: t("search.group_categories"), title: t(c.labelKey), desc: c.count + " " + t(c.count === 1 ? "search.formation_word" : "search.formations_word"),
            href: "formations.html?cat=" + c.filter, icon: IC["cat_" + c.id] }
        });
      }).join(""));
    }
    if (res.pages.length && show("pages")) {
      html += groupHTML(t("search.group_pages"), res.pages.map(function (p) {
        return itemHTML({
          icon: IC["page_" + p.id],
          title: highlight(t(p.titleKey), res.terms),
          sub: highlight(t(p.descKey), res.terms),
          href: p.url,
          pv: { label: t("search.group_pages"), title: t(p.titleKey), desc: t(p.descKey), href: p.url, icon: IC["page_" + p.id] }
        });
      }).join(""));
    }
    if (res.infos.length && show("pages")) {
      html += groupHTML(t("search.group_info"), res.infos.map(function (e) {
        return itemHTML({ icon: IC[e.id], title: highlight(titleOf(e), res.terms), sub: highlight(subOf(e), res.terms), href: e.url,
          pv: { label: t("search.group_info"), title: titleOf(e), desc: subOf(e), href: e.url, icon: IC[e.id],
            cta: e.id === "info-phone" ? t("search.pv_call") : e.id === "info-email" ? t("search.pv_mail") : "" } });
      }).join(""));
    }
    if (res.faqs.length && show("help")) {
      html += groupHTML(t("search.group_faq"), res.faqs.map(function (e) {
        return itemHTML({ icon: IC.page_faq, title: highlight(e.title, res.terms), href: e.url, faq: true,
          pv: { label: t("search.group_faq"), title: e.title, desc: e.answer, href: e.url, icon: IC.page_faq } });
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
    options.slice(0, 10).forEach(function (o, i) { o.style.setProperty("--i", i); });
  }
  function setActive(i) {
    if (options[activeIdx]) {
      options[activeIdx].classList.remove("is-active");
      options[activeIdx].setAttribute("aria-selected", "false");
    }
    activeIdx = i;
    showPreview(i);
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
  var enterTimer = null;
  function open() {
    if (root.classList.contains("is-open")) return;
    root.classList.add("is-open", "is-entering");   // résultats en cascade, seulement à l'ouverture
    scrim.classList.add("is-on");
    clearTimeout(enterTimer);
    enterTimer = setTimeout(function () { root.classList.remove("is-entering"); }, 600);
    input.setAttribute("aria-expanded", "true");
  }
  function close() {
    if (!root.classList.contains("is-open")) return;
    root.classList.remove("is-open");
    scrim.classList.remove("is-on");
    scope = "all";
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
      syncText();
      render(recent); input.focus(); return;
    }
    var href = el.getAttribute("href");
    if (href) go(href);
  }
  /* Entrée ou bouton d'envoi : l'option active, sinon le premier résultat. Le texte saisi se dissout d'abord. */
  function submit() {
    var q = input.value.trim();
    if (q && q !== currentQuery) { clearTimeout(debounceTimer); render(q); }   // la liste suit la dernière frappe
    var el = options[activeIdx] || options[0];
    if (!el) { open(); input.focus(); return; }                                // aucun résultat : le panneau l'explique
    if (!q || el.getAttribute("data-recent") != null) { selectByEl(el); return; }
    vanish(function () { selectByEl(el); });
  }

  /* -----------------------------------------------------------------------
     Dissolution (d'après « Placeholders And Vanish Input », Aceternity UI) : le texte est dessiné sur un canvas,
     échantillonné en particules, puis balayé de la fin vers le début du texte — ~0,6 s, puis la suite.
     ----------------------------------------------------------------------- */
  var dust = null, vanishing = false;
  function vanish(done) {
    if (vanishing) return;
    var text = input.value, cs = getComputedStyle(input), S = 2, W = input.clientWidth, H = input.clientHeight;
    if (reduceMotion || !text.trim() || !W) { done(); return; }
    var pts = [], rtl = cs.direction === "rtl", ctx;
    try {
      if (!dust) { dust = document.createElement("canvas"); dust.className = "wsy-search__dust"; dust.setAttribute("aria-hidden", "true"); box.appendChild(dust); }
      dust.width = W * S; dust.height = H * S; dust.style.width = W + "px"; dust.style.height = H + "px";
      ctx = dust.getContext("2d");
      ctx.font = cs.fontWeight + " " + parseFloat(cs.fontSize) * S + "px " + cs.fontFamily;
      ctx.fillStyle = cs.color; ctx.textBaseline = "middle"; ctx.textAlign = rtl ? "right" : "left";
      ctx.fillText(text, (rtl ? dust.width : 0) - input.scrollLeft * S, dust.height / 2);   // champ défilé : même décalage
      var d = ctx.getImageData(0, 0, dust.width, dust.height).data;
      for (var y = 0; y < dust.height; y += S) for (var x = 0; x < dust.width; x += S) {
        var i = (y * dust.width + x) * 4;
        if (d[i + 3] > 80) pts.push({ x: x, y: y, r: S, c: "rgba(" + d[i] + "," + d[i + 1] + "," + d[i + 2] + "," + (d[i + 3] / 255).toFixed(2) + ")" });
      }
    } catch (e) { pts = []; }
    if (!pts.length) { done(); return; }
    vanishing = true;
    root.classList.add("is-vanishing");                        // le vrai texte s'efface, les particules prennent le relais
    var edge = pts.reduce(function (m, p) { return rtl ? Math.min(m, p.x) : Math.max(m, p.x); }, rtl ? Infinity : 0);
    var step = (rtl ? 1 : -1) * Math.max(16, dust.width / 28), t0 = performance.now(), ended = false;
    function finish() {                                       // une seule fois : fin d'animation OU filet de sécurité
      if (ended) return;
      ended = true; clearTimeout(safety);
      ctx.clearRect(0, 0, dust.width, dust.height);
      vanishing = false;
      input.value = ""; root.classList.remove("is-vanishing"); syncText();
      done();
    }
    var safety = setTimeout(finish, 1100);                    // onglet masqué : requestAnimationFrame suspendu, on n'attend pas
    (function frame(now) {
      if (ended) return;
      ctx.clearRect(0, 0, dust.width, dust.height);
      pts = pts.filter(function (p) {
        if (rtl ? p.x <= edge : p.x >= edge) { p.x += Math.random() > .5 ? S : -S; p.y += Math.random() > .5 ? S : -S; p.r -= .16 * Math.random() * S; }
        if (p.r <= 0) return false;
        ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r);
        return true;
      });
      edge += step;
      if (pts.length && now - t0 < 900) requestAnimationFrame(frame); else finish();
    })(t0);
  }

  /* -----------------------------------------------------------------------
     Suggestions animées : de vraies recherches du site (search.fx_list) défilent dans le champ vide toutes les 3 s —
     deux tours après le chargement, puis tant que le champ a le focus. Mouvement réduit : texte fixe (placeholder natif).
     ----------------------------------------------------------------------- */
  var fxList = [], fxI = -1, fxTimer = 0, fxTurns = 0;
  function fxText() { return fxI < 0 || !fxList.length ? t("search.placeholder") : t("search.fx_try").replace("{q}", fxList[fxI % fxList.length]); }
  function fxSwap() {
    fx.classList.add("is-out");
    setTimeout(function () {
      fx.textContent = fxText();
      fx.classList.remove("is-out"); fx.classList.add("is-in");
      void fx.offsetWidth;
      fx.classList.remove("is-in");
    }, 280);
  }
  function fxTick() {
    if (document.hidden || root.classList.contains("has-text")) return;
    if (document.activeElement !== input && fxTurns >= 2) { fxStop(); return; }
    fxI = (fxI + 1) % fxList.length;
    if (fxI === fxList.length - 1) fxTurns++;
    fxSwap();
  }
  function fxStart() { if (fx && !reduceMotion && fxList.length && !fxTimer) fxTimer = setInterval(fxTick, 3000); }
  function fxStop() { clearInterval(fxTimer); fxTimer = 0; if (fxI >= 0) { fxI = -1; fxSwap(); } }

  /* État « texte saisi » : croix d'effacement, bouton d'envoi, suggestions masquées */
  function syncText() {
    var has = input.value.trim().length > 0;
    root.classList.toggle("has-text", has);
    if (goBtn) goBtn.disabled = !has;
  }

  /* -----------------------------------------------------------------------
     Événements
     ----------------------------------------------------------------------- */
  var debounceTimer = null;
  function onInput() {
    var v = input.value;
    if (vanishing) return;
    syncText();
    open();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { render(v.trim()); }, 110);
  }

  var quietFocus = false;
  function wire() {
    input.addEventListener("input", onInput);
    input.addEventListener("focus", function () { ensureExtras(); ensureSessions(); if (quietFocus) { quietFocus = false; return; } open(); render(input.value.trim()); fxStart(); });

    input.addEventListener("keydown", function (e) {
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); open(); move(1); break;
        case "ArrowUp":   e.preventDefault(); open(); move(-1); break;
        case "Enter":
          if (root.classList.contains("is-open") && options.length) { e.preventDefault(); submit(); }
          break;
        case "Escape":
          if (root.classList.contains("is-open")) { e.preventDefault(); close(); }
          else if (input.value) { input.value = ""; syncText(); render(""); }
          else { input.blur(); }
          break;
        case "Tab": if (e.shiftKey || !scopes || !scopes.firstChild) close(); break;
      }
    });

    // Garde le focus dans l'input lors d'un clic sur un résultat (évite la fermeture prématurée)
    panel.addEventListener("mousedown", function (e) {
      if (e.target.closest("a, button, [role=option]")) e.preventDefault();
    });
    /* Échap depuis un filtre ou un bouton de l'aperçu : ferme et rend le focus au champ (sans le rouvrir) */
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && e.target !== input && root.classList.contains("is-open")) { close(); quietFocus = true; input.focus(); }
    });
    if (tries) tries.addEventListener("click", function (e) {
      var b = e.target.closest("[data-q]");
      if (!b) return;
      input.value = b.getAttribute("data-q"); syncText();
      quietFocus = document.activeElement !== input; input.focus(); quietFocus = false;
      ensureExtras(); ensureSessions(); open(); render(input.value.trim());
    });
    panel.addEventListener("click", function (e) {
      var sc = e.target.closest("[data-scope]");
      if (sc) { scope = sc.getAttribute("data-scope"); render(input.value.trim()); return; }
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
      input.value = ""; syncText(); render(""); input.focus();
    });
    if (goBtn) {
      goBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });   // le focus reste dans le champ
      goBtn.addEventListener("click", function () { open(); submit(); });
    }

    // Ferme si le focus quitte complètement le composant (Tab sortant)
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) close();
    });
    // Ferme au clic à l'extérieur. composedPath() : chemin figé au moment du clic — un bouton du panneau remplacé
    // pendant le clic (filtres, « Effacer » des récents) n'est plus dans le document mais bien DANS le composant.
    document.addEventListener("click", function (e) {
      var path = e.composedPath ? e.composedPath() : [e.target];
      if (path.indexOf(root) < 0 && !root.contains(e.target)) close();
    });

    // Raccourcis globaux : ⌘K / Ctrl+K, et « / » (hors saisie)
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); focusSearch(); return; }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) { e.preventDefault(); focusSearch(); }
    });

    // Re-rendu à chaud lors d'un changement de langue
    document.addEventListener("i18n:changed", function () {
      // purge le cache d'index (les libellés ont changé) ; les sessions sont recomposées dans la nouvelle langue
      if (sessionsState === "ready") buildSessions();
      purgeCaches();
      refreshStatic();
      if (root.classList.contains("is-open")) render(input.value.trim());
      // les questions du Centre d'aide suivent la langue (pack chargé à la demande)
      if (extras === "ready") ensureFaqPack(function () {
        buildExtras(); purgeCaches();
        if (root.classList.contains("is-open")) render(input.value.trim());
      });
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
