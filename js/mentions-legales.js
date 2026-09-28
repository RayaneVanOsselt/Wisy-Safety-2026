/* =========================================================================
   WISY SAFETY — Logique de la page Mentions légales (mentions-legales.html)
   -------------------------------------------------------------------------
   Rien ici n'est requis pour que le contenu reste lisible sans JS (tout le
   texte légal est déjà dans le HTML) :
     • initToc()      — sommaire actif au scroll (scrollspy) + indicateur glissant
     • initCopy()      — boutons « Copier » sur les champs de la fiche d'identité
     • initPrint()     — bouton « Imprimer / Enregistrer en PDF »
     • initScrollFx()  — barre de progression de lecture + dérive des chiffres
       fantômes de section (un seul écouteur de scroll, throttlé par rAF)
   L'apparition .reveal/[data-stagger] et le header/menu mobile sont gérés
   par js/site-chrome.js (commun à toutes les pages) — rien à refaire ici.
   ========================================================================= */
(function () {
  "use strict";
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initToc() {
    const nav = $("[data-toc]");
    const links = $$("[data-toc-link]");
    const targets = $$("[data-toc-target]");
    const indicator = $("[data-toc-indicator]");
    if (!links.length || !targets.length) return;

    const linkFor = (id) => links.find((a) => a.getAttribute("href") === "#" + id);
    function moveIndicator(link) {
      if (!indicator || !nav) return;
      const list = link.closest("ol");
      const horizontal = getComputedStyle(list).flexDirection === "row";
      const lr = link.getBoundingClientRect(), pr = nav.getBoundingClientRect();
      if (horizontal) indicator.style.cssText = "transform:translate(" + (lr.left - pr.left) + "px," + (lr.top - pr.top) + "px);width:" + lr.width + "px;height:" + lr.height + "px";
      else indicator.style.cssText = "transform:translateY(" + (lr.top - pr.top) + "px);height:" + lr.height + "px;width:" + lr.width + "px";
    }
    function setActive(id) {
      links.forEach((a) => a.classList.remove("is-active"));
      const link = linkFor(id);
      if (!link) return;
      link.classList.add("is-active");
      moveIndicator(link);
    }
    setActive(targets[0].id);
    window.addEventListener("resize", () => {
      const active = links.find((a) => a.classList.contains("is-active"));
      if (active) moveIndicator(active);
    });

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

  function initScrollFx() {
    const bar = $("[data-progress-bar]");
    const ghosts = $$(".lg-sec__ghost");
    const heroGhost = $(".lg-hero__ghost");
    if (!bar && !ghosts.length && !heroGhost) return;
    const motion = !reducedMotion();
    let ticking = false;

    function update() {
      ticking = false;
      const doc = document.documentElement;
      const scrolled = doc.scrollTop;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.max(0, Math.min(1, scrolled / max)) : 0;
      if (bar) bar.style.transform = "scaleX(" + pct + ")";

      if (motion) {
        if (heroGhost) {
          const r = heroGhost.parentElement.getBoundingClientRect();
          heroGhost.style.transform = "translateY(" + Math.round(r.top * -0.08) + "px)";
        }
        ghosts.forEach((g) => {
          const r = g.getBoundingClientRect();
          const vh = window.innerHeight;
          if (r.bottom < -200 || r.top > vh + 200) return;
          const center = r.top + r.height / 2 - vh / 2;
          g.style.transform = "translateY(" + Math.round(center * -0.06) + "px)";
        });
      }
    }
    update();
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } });
  }

  function boot() { initToc(); initCopy(); initPrint(); initScrollFx(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
