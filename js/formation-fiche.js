/* =========================================================================
   WISY SAFETY — Comportements des pages formation « fiche technique »
   (VCA Ligne hiérarchique, Diisocyanates, Fibre optique) — sans dépendance, chargé en fin de page.
   La coque (en-tête, menu mobile, pied de page) vient de js/site-chrome.js ; la lecture des articles de
   js/article-modal.js. Ici, trois petits composants activés seulement s'ils sont présents dans la page :

     [data-fx-tabs]     onglets ARIA (flèches, Origine/Fin) — formats de la formation fibre optique
     [data-fx-check]    outil « Suis-je concerné ? » (diisocyanates) : 3 questions → une orientation.
                        Tous les textes sont DANS le HTML (traduits par js/i18n.js) : le script ne fait qu'afficher
                        le bloc de résultat correspondant. Aucune donnée n'est envoyée ni conservée.
     [data-fx-bar]      barre d'action mobile, visible une fois l'en-tête de la fiche dépassé

   Événements d'audience (bus `wisy:analytics`, relayé seulement avec consentement) : fx_view, fx_signup_click,
   fx_quote_click, fx_check_result — jamais de donnée personnelle.
   ========================================================================= */
(() => {
  "use strict";

  const main = document.querySelector("[data-fx-page]");
  if (!main) return;
  const page = main.getAttribute("data-fx-page");
  const track = (name, detail) => { if (window.WisyChrome && window.WisyChrome.track) window.WisyChrome.track(name, Object.assign({ formation: page }, detail || {})); };

  /* ---------- Onglets ---------- */
  document.querySelectorAll("[data-fx-tabs]").forEach((wrap) => {
    const tabs = Array.from(wrap.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = j === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i, false));
      t.addEventListener("keydown", (e) => {
        const rtl = document.documentElement.dir === "rtl";
        const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
        if (next) { e.preventDefault(); select((i + next + tabs.length) % tabs.length, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true); }
        else if (e.key === "End") { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    /* Sans JavaScript, tous les panneaux sont visibles (attribut hidden posé ici seulement). */
    select(Math.max(0, tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")), false);
    wrap.classList.add("is-ready");
  });

  /* ---------- « Suis-je concerné ? » ---------- */
  document.querySelectorAll("[data-fx-check]").forEach((form) => {
    const results = Array.from(form.querySelectorAll("[data-fx-result]"));
    const live = form.querySelector("[data-fx-live]");
    const value = (name) => { const c = form.querySelector('input[name="' + name + '"]:checked'); return c ? c.value : null; };
    /* Ordre des règles = ordre de lecture du règlement (UE) 2020/1149, annexe XVII, entrée 74 (points 1 et 3) :
       pas de diisocyanates → pas visé ; usage privé → pas visé ; < 0,1 % → pas visé ; inconnu → vérifier ; sinon concerné. */
    const outcome = () => {
      const q1 = value("fx-q1"), q2 = value("fx-q2"), q3 = value("fx-q3");
      if (q1 === "no") return "no-diiso";
      if (q3 === "no") return "private";
      if (q2 === "no") return "below";
      if (!q1 || !q2 || !q3) return null;
      if (q1 === "unknown" || q2 === "unknown") return "unknown";
      return "yes";
    };
    const render = () => {
      const id = outcome();
      results.forEach((r) => { r.hidden = r.getAttribute("data-fx-result") !== id; });
      const shown = results.find((r) => !r.hidden);
      if (live) live.textContent = shown ? shown.textContent.replace(/\s+/g, " ").trim() : "";
      if (id) track("fx_check_result", { result: id });
    };
    form.addEventListener("change", render);
    form.addEventListener("reset", () => setTimeout(render, 0));
    form.addEventListener("submit", (e) => e.preventDefault());
    render();
  });

  /* ---------- Barre d'action mobile ---------- */
  const bar = document.querySelector("[data-fx-bar]");
  const hero = document.querySelector("[data-fx-hero]");
  if (bar && hero && "IntersectionObserver" in window) {
    bar.hidden = false;
    new IntersectionObserver((entries) => {
      const past = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0;
      bar.classList.toggle("is-on", past);
      document.body.classList.toggle("fx-bar-active", past);
      bar.setAttribute("aria-hidden", past ? "false" : "true");
      bar.querySelectorAll("a").forEach((a) => { a.tabIndex = past ? 0 : -1; });
    }).observe(hero);
  }

  /* ---------- Mesure d'audience ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-fx-track]");
    if (a) track(a.getAttribute("data-fx-track"), { from: a.getAttribute("data-fx-from") || "" });
  });
  track("fx_view");
})();
