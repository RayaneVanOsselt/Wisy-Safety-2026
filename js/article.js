/* =========================================================================
   WISY SAFETY — Articles « Conseils & ressources VCA » : sommaire dynamique
   -------------------------------------------------------------------------
   La coque (en-tête, menu mobile, pied de page, apparition, événements) vient de js/site-chrome.js.
   Ici : le lien du sommaire dont la section est à l'écran reçoit aria-current="true" (repère visuel + lecteur
   d'écran). Sans JavaScript, le sommaire reste un simple index d'ancres.
   ========================================================================= */
(() => {
  "use strict";
  const links = Array.from(document.querySelectorAll(".art-toc a[href^='#']"));
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = Array.from(byId.keys()).map((id) => document.getElementById(id)).filter(Boolean);
  const visible = new Set();
  const mark = () => {
    const first = sections.find((s) => visible.has(s.id));
    links.forEach((a) => a.removeAttribute("aria-current"));
    if (first) byId.get(first.id).setAttribute("aria-current", "true");
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); });
    mark();
  }, { rootMargin: "-25% 0px -55% 0px" });
  sections.forEach((s) => io.observe(s));
})();
