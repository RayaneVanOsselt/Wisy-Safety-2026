/* Menu mobile accessible (audit du 02/10/2026, M15) : tant que le panneau est ouvert, le reste de la page est inerte,
   le focus clavier ne peut donc plus partir derrière le menu (WCAG 2.4.3), et il entre dans le panneau. À la fermeture,
   il revient sur le bouton du menu.
   Chaque gabarit ouvre le menu avec son propre script (site-chrome.js, home.js, scripts en ligne…) : on ne touche à
   aucun d'eux, on observe la classe « is-open » du panneau. */
(function () {
  var panel = document.querySelector(".m-panel");
  if (!panel || !("MutationObserver" in window)) return;
  var toggle = document.querySelector(".nav-toggle");
  var inerted = [];

  /* tout ce qui n'est pas le panneau ni l'un de ses parents, à chaque niveau jusqu'au <body> */
  function outside() {
    var list = [];
    for (var node = panel; node && node !== document.body; node = node.parentElement) {
      [].forEach.call(node.parentElement.children, function (el) {
        if (el !== node && !el.inert && el.tagName !== "SCRIPT" && el.tagName !== "STYLE" && !el.classList.contains("m-scrim")) list.push(el);
      });
    }
    return list;
  }

  function sync() {
    var open = panel.classList.contains("is-open");
    if (open && !inerted.length) {
      inerted = outside();
      inerted.forEach(function (el) { el.inert = true; });
      if (!panel.contains(document.activeElement)) {
        var first = panel.querySelector("a[href], button:not([disabled])");
        if (first) first.focus();
      }
    } else if (!open && inerted.length) {
      inerted.forEach(function (el) { el.inert = false; });
      inerted = [];
      /* le script du gabarit a tenté de rendre le focus au bouton alors qu'il était encore inerte : on le fait ici */
      var lost = document.activeElement === document.body || panel.contains(document.activeElement);
      if (toggle && lost) toggle.focus();
    }
  }

  new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ["class"] });
  sync();
})();
