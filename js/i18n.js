/* =========================================================================
   WISY SAFETY — Moteur multilingue (i18n) · sans framework, sans build
   Langues : fr (défaut), en, nl, af, ar (RTL), bg, de, ro, it, sl
   -------------------------------------------------------------------------
   Détection de la langue (par ordre de priorité) :
     1. paramètre d'URL ?lang=xx        (lien partageable)
     2. choix mémorisé (localStorage)
     3. langue du navigateur
     4. langue par défaut (fr)

   Balisage dans le HTML :
     data-i18n="cle"                 → remplace le texte (textContent)
     data-i18n-html="cle"            → remplace le HTML (textes avec balises)
     data-i18n-attr="attr:cle,attr2:cle2"  → remplace des attributs
                                        (ex. placeholder, aria-label, content, alt)

   API publique : window.WisyI18N.set(lang) / .get(lang,cle) / .current()
   Événement émis à chaque changement : document → "i18n:changed"
   ========================================================================= */
(function () {
  "use strict";

  var LANGS   = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];
  var RTL     = ["ar"];
  var DEFAULT = "fr";
  var STORE   = "wisy-lang";
  var DIC     = window.I18N || (window.I18N = {});

  function norm(l) {
    if (!l) return null;
    l = String(l).toLowerCase().slice(0, 2);
    return LANGS.indexOf(l) >= 0 ? l : null;
  }

  function detect() {
    try {
      var u = new URLSearchParams(location.search).get("lang");
      if (norm(u)) return norm(u);
    } catch (e) {}
    try {
      var s = localStorage.getItem(STORE);
      if (norm(s)) return norm(s);
    } catch (e) {}
    var navs = navigator.languages || [navigator.language || navigator.userLanguage || ""];
    for (var i = 0; i < navs.length; i++) {
      var n = norm(navs[i]);
      if (n) return n;
    }
    return DEFAULT;
  }

  function get(lang, key) {
    var v = DIC[lang] && DIC[lang][key];
    if (v == null) v = DIC[DEFAULT] && DIC[DEFAULT][key]; // repli sur le français
    return v;
  }

  function langName(lang) {
    return (DIC.__names__ && DIC.__names__[lang]) || lang.toUpperCase();
  }

  function apply(lang) {
    var root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", RTL.indexOf(lang) >= 0 ? "rtl" : "ltr");

    // Texte
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = get(lang, el.getAttribute("data-i18n"));
      if (v != null) el.textContent = v;
    });
    // HTML (textes contenant des balises, ex. mot souligné)
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = get(lang, el.getAttribute("data-i18n-html"));
      if (v != null) el.innerHTML = v;
    });
    // Attributs : "placeholder:cle,aria-label:cle2"
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length < 2) return;
        var v = get(lang, p.slice(1).join(":").trim());
        if (v != null) el.setAttribute(p[0].trim(), v);
      });
    });
    // Titre de l'onglet
    var t = get(lang, "meta.title");
    if (t != null) document.title = t;

    try { localStorage.setItem(STORE, lang); } catch (e) {}
    reflect(lang);
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: lang } }));
  }

  // Met à jour l'affichage du sélecteur de langue
  function reflect(lang) {
    document.querySelectorAll("[data-lang-current]").forEach(function (el) {
      el.textContent = langName(lang);
    });
    document.querySelectorAll("[data-lang-option]").forEach(function (el) {
      var on = el.getAttribute("data-lang-option") === lang;
      el.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function closeAll() {
    document.querySelectorAll(".lang-switch.is-open").forEach(function (b) {
      b.classList.remove("is-open");
      var t = b.querySelector("[data-lang-toggle]");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  function set(lang) {
    lang = norm(lang) || DEFAULT;
    // garde l'URL en phase (lien partageable) sans recharger
    try {
      var url = new URL(location.href);
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    } catch (e) {}
    apply(lang);
  }

  window.WisyI18N = {
    set: set,
    get: get,
    current: function () { return document.documentElement.getAttribute("lang") || DEFAULT; },
    langs: LANGS,
    name: langName
  };

  function init() {
    document.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-lang-option]");
      if (opt) { e.preventDefault(); set(opt.getAttribute("data-lang-option")); closeAll(); return; }

      var tog = e.target.closest("[data-lang-toggle]");
      if (tog) {
        e.preventDefault();
        var box = tog.closest(".lang-switch");
        var open = box.classList.toggle("is-open");
        tog.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      // clic à l'extérieur → ferme
      if (!e.target.closest(".lang-switch")) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });

    apply(detect());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
