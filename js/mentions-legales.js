/* =========================================================================
   WISY SAFETY — Logique de la page Mentions légales (mentions-legales.html)
   -------------------------------------------------------------------------
   3 comportements, aucun n'est requis pour que le contenu reste lisible
   sans JS (tout le texte légal est déjà dans le HTML) :
     • initToc()   — surlignage du sommaire actif pendant le scroll (scrollspy)
     • initCopy()  — boutons « Copier » sur les champs de la fiche d'identité
     • initPrint() — bouton « Imprimer / Enregistrer en PDF »
   L'apparition .reveal et le header/menu mobile sont gérés par
   js/site-chrome.js (commun à toutes les pages) — rien à refaire ici.
   ========================================================================= */
(function () {
  "use strict";
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initToc() {
    const links = $$("[data-toc-link]");
    const targets = $$("[data-toc-target]");
    if (!links.length || !targets.length) return;

    const linkFor = (id) => links.find((a) => a.getAttribute("href") === "#" + id);
    function setActive(id) {
      links.forEach((a) => a.classList.remove("is-active"));
      const link = linkFor(id);
      if (link) link.classList.add("is-active");
    }
    setActive(targets[0].id);

    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    targets.forEach((t) => io.observe(t));
  }

  function initCopy() {
    const buttons = $$("[data-copy-btn]");
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      const field = btn.previousElementSibling;
      const value = field && (field.getAttribute("data-copy") || field.textContent.trim());
      if (!value) return;
      const tip = document.createElement("span");
      tip.className = "lg-copy__tip";
      tip.textContent = (window.WisyI18N && window.WisyI18N.get(window.WisyI18N.current(), "legal.copy_done")) || "Copié !";
      btn.appendChild(tip);

      btn.addEventListener("click", async () => {
        let ok = false;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            ok = true;
          }
        } catch (e) { /* repli ci-dessous */ }
        if (!ok) {
          try {
            const ta = document.createElement("textarea");
            ta.value = value;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            ok = document.execCommand("copy");
            document.body.removeChild(ta);
          } catch (e) { ok = false; }
        }
        if (!ok) return;
        btn.classList.add("is-done");
        clearTimeout(btn._doneTimer);
        btn._doneTimer = setTimeout(() => btn.classList.remove("is-done"), 1800);
      });
    });
  }

  function initPrint() {
    const btn = $("[data-print-btn]");
    if (!btn) return;
    btn.addEventListener("click", () => window.print());
  }

  function boot() { initToc(); initCopy(); initPrint(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
