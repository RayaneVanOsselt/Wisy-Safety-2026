/* =========================================================================
   WISY SAFETY — Lecture d'un article en fenêtre modale (composant unique, sans dépendance)
   -------------------------------------------------------------------------
   Contrat HTML (voir formation-vca-ligne-hierarchique.html, formation-diisocyanates.html, formation-fibre-optique.html) :

     <a href="#article-<slug>" data-article-open="<slug>">Lire l'article</a>        déclencheur (simple ancre sans JS)
     <div class="am-store" data-article-store>                                     articles COMPLETS dans le HTML
       <article id="article-<slug>" data-article="<slug>"> … <h2 data-article-title> … </article>
     </div>
     <dialog class="am-dialog" data-article-dialog> … [data-article-slot] … [data-article-close] … </dialog>

   Sans JavaScript, les articles restent des sections ordinaires de la page (lisibles, indexables) et les déclencheurs
   des ancres. Avec JavaScript, le magasin est masqué et l'article est déplacé dans le <dialog> à l'ouverture :
     • showModal() natif : focus piégé par le navigateur, fond inerte, Échap ;
     • focus sur le titre de l'article à l'ouverture, rendu au déclencheur à la fermeture ;
     • lien profond : #article-<slug> à l'ouverture (une entrée d'historique), adresse avec ce hash = ouverture directe,
       bouton « précédent » du navigateur = fermeture ;
     • défilement de la page bloqué sans saut de mise en page (largeur de la barre de défilement compensée) ;
     • fermeture : bouton, Échap, clic sur le fond.
   Les textes sont traduits par js/i18n.js comme le reste de la page (attributs data-i18n dans le HTML).
   Événement d'audience : `article_open` via window.WisyChrome.track (rien n'est relayé sans consentement).
   ========================================================================= */
(() => {
  "use strict";

  const dialog = document.querySelector("[data-article-dialog]");
  const store = document.querySelector("[data-article-store]");
  if (!dialog || !store || typeof dialog.showModal !== "function") return;   // très vieux navigateur : les ancres suffisent

  const slot = dialog.querySelector("[data-article-slot]");
  const barTitle = dialog.querySelector("[data-article-bar-title]");
  const root = document.documentElement;
  root.classList.add("am-js");

  const PREFIX = "article-";
  let current = null;        // <article> affiché
  let opener = null;         // élément qui a ouvert la modale (focus rendu à la fermeture)
  let pushed = false;        // une entrée d'historique a été ajoutée à l'ouverture
  let placeholder = null;    // marque l'emplacement d'origine de l'article dans le magasin

  const articleBySlug = (slug) => (slug ? store.querySelector('[data-article="' + CSS.escape(slug) + '"]') : null);
  const slugFromHash = () => (location.hash.indexOf("#" + PREFIX) === 0 ? decodeURIComponent(location.hash.slice(1 + PREFIX.length)) : null);
  const track = (name, detail) => { if (window.WisyChrome && window.WisyChrome.track) window.WisyChrome.track(name, detail); };

  function lockScroll(on) {
    if (on) {
      const gap = window.innerWidth - root.clientWidth;
      root.style.setProperty("--am-gap", gap + "px");
      root.classList.add("am-locked");
    } else {
      root.classList.remove("am-locked");
      root.style.removeProperty("--am-gap");
    }
  }

  function syncBarTitle() {
    const t = current && current.querySelector("[data-article-title]");
    if (barTitle) barTitle.textContent = t ? t.textContent : "";
  }

  /* Place l'article dans la modale (et remet le précédent à sa place). */
  function mount(article) {
    unmount();
    placeholder = document.createComment("article");
    article.parentNode.insertBefore(placeholder, article);
    slot.appendChild(article);
    current = article;
    const title = article.querySelector("[data-article-title]");
    if (title) {
      if (!title.id) title.id = article.id + "-titre";
      title.setAttribute("tabindex", "-1");
      dialog.setAttribute("aria-labelledby", title.id);
    }
    syncBarTitle();
    slot.scrollTop = 0;
  }
  function unmount() {
    if (current && placeholder && placeholder.parentNode) placeholder.parentNode.replaceChild(current, placeholder);
    current = null;
    placeholder = null;
  }

  function open(slug, options) {
    const opts = options || {};
    const article = articleBySlug(slug);
    if (!article) return false;
    const wasOpen = dialog.open;
    mount(article);
    if (!wasOpen) {
      opener = opts.opener || document.activeElement;
      lockScroll(true);
      dialog.showModal();
    }
    const hash = "#" + PREFIX + slug;
    if (!opts.fromHistory) {
      if (wasOpen) history.replaceState(history.state, "", hash);                 // d'un article à l'autre : même entrée
      else if (location.hash !== hash) { history.pushState({ wisyArticle: slug }, "", hash); pushed = true; }
    }
    const title = article.querySelector("[data-article-title]");
    (title || dialog).focus({ preventScroll: true });
    track("article_open", { article: slug, page: location.pathname.split("/").pop() || "index.html" });
    return true;
  }

  /* Ferme la modale. `fromHistory` : la fermeture vient du bouton « précédent » (ne pas retoucher l'historique). */
  function close(fromHistory) {
    if (!dialog.open) return;
    dialog.close();
    lockScroll(false);
    unmount();
    if (!fromHistory) {
      if (pushed) { pushed = false; history.back(); }
      else if (slugFromHash()) history.replaceState(history.state, "", location.pathname + location.search);
    }
    pushed = false;
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  /* Déclencheurs (dans la page ET dans un article ouvert : « Lire aussi ») */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-article-open]");
    if (!a) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // nouvel onglet : comportement natif
    if (open(a.getAttribute("data-article-open"), { opener: dialog.open ? opener : a })) e.preventDefault();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target.closest("[data-article-close]")) { close(false); return; }
    if (e.target === dialog) close(false);                     // clic sur le fond (hors du panneau)
  });
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(false); });   // Échap
  window.addEventListener("popstate", () => {
    const slug = slugFromHash();
    if (slug && articleBySlug(slug)) open(slug, { fromHistory: true });
    else if (dialog.open) { pushed = false; close(true); }
  });
  document.addEventListener("i18n:changed", syncBarTitle);

  /* Adresse avec #article-<slug> : ouverture directe (après le premier rendu, pour ne pas gêner le LCP). */
  const initial = slugFromHash();
  if (initial && articleBySlug(initial)) {
    const go = () => open(initial, { fromHistory: true, opener: document.querySelector('[data-article-open="' + CSS.escape(initial) + '"]') });
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
  }

  window.WisyArticleModal = { open: (slug) => open(slug), close: () => close(false) };
})();
