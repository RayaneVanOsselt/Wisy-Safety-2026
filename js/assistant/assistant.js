/* =========================================================================
   WISY SAFETY — Assistant Wisy · Panneau conversationnel
   -------------------------------------------------------------------------
   Chargé À LA DEMANDE par js/assistant/launcher.js (avec le moteur de
   réponses et css/assistant-panel.css). Le launcher — bouton flottant, bulle
   d'invitation, état ouvert/fermé — vit dans launcher.js ; ce fichier ne
   fabrique que le panneau et sa logique.

   • Cœur FIABLE 100 % client (js/assistant/responder.js) : l'assistant
     répond depuis les vraies données du site, sans clé ni réseau.
   • Enrichissement OPTIONNEL par une route serveur (/api/chat) si
     window.WISY_ASSISTANT_CONFIG.apiUrl (ou WISY_CONFIG.ASSISTANT_API_URL)
     est défini. En cas d'échec/timeout/hors-ligne → repli automatique sur le
     cœur local ; jamais de détail technique montré au visiteur.

   API (window.WisyAssistant.panel) : open({ask}), close, ask(texte),
   newConversation, submit, isOpen. Le point d'entrée public pour les pages
   reste window.WisyAssistant.controller (défini par launcher.js).

   Accessibilité
     • panneau role="dialog" nommé ; NON modal sur desktop (n'enferme pas la
       page) ; MODAL sur mobile (feuille quasi plein écran) : aria-modal,
       arrière-plan inerte, Tab/Maj+Tab bouclés, défilement de la page bloqué
       puis restauré ;
     • focus : dans le panneau à l'ouverture (champ de saisie sur desktop, le
       panneau sur mobile pour ne pas ouvrir le clavier), restauré sur le
       launcher à la fermeture ; Échap ferme ;
     • annonces polies (aria-live) pour les réponses ; indicateur « écrit » ;
     • défilement : le fil suit les nouveaux messages seulement si le lecteur
       est déjà en bas, sinon bouton « Nouveaux messages ↓ ».

   Sécurité : aucun HTML arbitraire n'est injecté — tout texte issu du moteur
   ou de l'utilisateur est posé via textContent ; les liens ne sont créés qu'à
   partir d'URLs validées (js/assistant/validation.js).
   ========================================================================= */
(function () {
  "use strict";

  var NS = window.WisyAssistant;
  if (!NS || !NS.Responder || !NS.Validation || !NS.Launcher) return; // dépendances requises

  var Responder = NS.Responder;
  var Validation = NS.Validation;
  var Launcher = NS.Launcher;
  var el = Launcher.el;
  var track = Launcher.track;

  /* ------------------------------------------------------------------ */
  /* Config (LLM optionnel)                                             */
  /* ------------------------------------------------------------------ */
  function apiUrl() {
    var a = window.WISY_ASSISTANT_CONFIG && window.WISY_ASSISTANT_CONFIG.apiUrl;
    var b = window.WISY_CONFIG && window.WISY_CONFIG.ASSISTANT_API_URL;
    var u = (a || b || "").trim();
    return u || null;
  }

  var mqMobile = window.matchMedia("(max-width: 560px)");   // feuille modale plein écran
  var REQUEST_TIMEOUT = 15000;
  var STICK_THRESHOLD = 80;                                  // px : « proche du bas » pour l'auto-scroll

  /* ------------------------------------------------------------------ */
  /* i18n : libellés d'interface (fallback FR)                          */
  /* ------------------------------------------------------------------ */
  function lang() {
    return (window.WisyI18N && WisyI18N.current()) || document.documentElement.getAttribute("lang") || "fr";
  }
  function t(key, fallback) {
    var v = window.WisyI18N ? WisyI18N.get(lang(), key) : null;
    return (v == null || v === "") ? fallback : v;
  }

  /* ------------------------------------------------------------------ */
  /* Icônes (24×24, trait 1.8, currentColor — cohérence avec le site)   */
  /* ------------------------------------------------------------------ */
  function icon(inner, w) {
    return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  var IC = {
    close:    '<path d="M6 6l12 12M18 6L6 18"/>',
    send:     '<path d="M6 12h12M13 6l6 6-6 6"/>',
    newchat:  '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/>',
    arrow:    '<path d="M5 12h14M13 6l6 6-6 6"/>',
    down:     '<path d="M12 5v14M6 13l6 6 6-6"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    level:    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    price:    '<path d="M18 7a6 6 0 0 0-5-3 6 6 0 0 0 0 16 6 6 0 0 0 5-3M4 10h9M4 14h9"/>',
    phone:    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/>',
    mail:     '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 6 9-6"/>',
    pin:      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/>',
    training: '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/>',
    page:     '<path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/>',
    book:     '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8.5 8h7"/>'
  };
  function iconSpan(name, w) { return el("span", { html: icon(IC[name], w), "aria-hidden": "true" }); }

  /* ================================================================== */
  /* Contrôleur                                                          */
  /* ================================================================== */
  var App = {
    root: null, panel: null, main: null, body: null, thread: null,
    input: null, sendBtn: null, live: null, newMsg: null, scrim: null, closeBtn: null,
    isOpen: false, built: false, busy: false,
    history: [], context: null, epoch: 0,   // epoch : change à chaque « nouvelle conversation »
    stick: true,          // le lecteur est en bas du fil : l'auto-scroll est permis
    modal: false,         // mode feuille mobile (aria-modal, arrière-plan inerte, défilement bloqué)
    inerted: [], prevOverflow: null,
    labels: []            // libellés statiques à retraduire au changement de langue
  };

  /** Pose un libellé traduisible (texte ou attribut) et l'enregistre pour le relabel. */
  function label(node, key, fallback, attr) {
    App.labels.push({ node: node, key: key, fb: fallback, attr: attr || null });
    var v = t(key, fallback);
    if (attr) node.setAttribute(attr, v); else node.textContent = v;
    return node;
  }
  function relabel() {
    App.labels.forEach(function (l) {
      var v = t(l.key, l.fb);
      if (l.attr) l.node.setAttribute(l.attr, v); else l.node.textContent = v;
    });
  }

  /* --- Contexte de page (contextual awareness, non intrusif) -------- */
  function detectContext() {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var page = "generic";
    if (path === "" || path === "index.html") page = "home";
    else if (path === "formations.html") page = "formations";
    else if (path === "contact.html") page = "contact";
    else if (path === "inscription.html") page = "inscription";
    else if (path === "avis.html") page = "avis";
    else if (path === "faq.html") page = "faq";

    var fid = null;
    var hash = (location.hash || "").replace(/^#/, "");
    var qp = new URLSearchParams(location.search).get("formation");
    var cand = hash || qp;
    if (cand && NS.Knowledge && NS.Knowledge.byId(cand) && NS.Knowledge.byId(cand).type === "formation") {
      fid = cand;
      if (page === "formations" || page === "inscription") page = "formation";
    }
    /* Page dédiée d'une formation (ex. formation-nacelles-elevatrices.html) :
       déduite de la base de connaissances, sans liste de pages à maintenir ici. */
    if (NS.Knowledge && page === "generic") {
      var own = NS.Knowledge.formations().filter(function (f) {
        return String(f.url).split("#")[0].split("?")[0].toLowerCase() === path;
      })[0];
      if (own) { page = "formation"; fid = own.id; }
    }
    return { page: page, formationId: fid, path: path };
  }

  /* ------------------------------------------------------------------ */
  /* Construction : panneau (à la 1re ouverture)                         */
  /* ------------------------------------------------------------------ */
  function buildPanel() {
    if (App.built) return;
    App.root = document.getElementById("wisy-assistant");

    var titleId = "wa-title";

    // En-tête : mini-mascotte · « Assistant Wisy » + pastille IA · sous-titre · fermer (44 × 44)
    var title = label(el("span", { id: titleId }), "assistant.header_title", "Assistant Wisy");
    var tag = label(el("span", { class: "wa-header__tag", "aria-hidden": "true" }), "assistant.badge_ai", "IA");
    var subtitle = label(el("p", { class: "wa-header__subtitle" }), "assistant.header_subtitle", "Assistance Wisy Safety");
    App.closeBtn = label(el("button", { type: "button", class: "wa-iconbtn wa-close", html: icon(IC.close) }),
      "assistant.close", "Fermer l’Assistant Wisy", "aria-label");

    var header = el("div", { class: "wa-header" }, [
      el("span", { class: "wa-header__avatar", "aria-hidden": "true" }, [
        Launcher.avatarInto(el("span", { class: "wa-disc" }), { sizes: "44px", size: 44 }),
        el("span", { class: "wa-header__dot" })
      ]),
      el("div", { class: "wa-header__titles" }, [
        el("p", { class: "wa-header__title" }, [title, tag]),
        subtitle
      ]),
      el("div", { class: "wa-header__actions" }, [App.closeBtn])
    ]);

    // Corps défilant (région nommée, focusable au clavier) + zone live + « Nouveaux messages »
    App.thread = el("div", { class: "wa-thread" });
    App.live = el("div", { class: "wa-sr", "aria-live": "polite", "aria-atomic": "false" });
    App.body = label(el("div", { class: "wa-body", role: "region", tabindex: "0" }, [App.thread, App.live]),
      "assistant.conversation", "Conversation", "aria-label");
    App.newMsg = el("button", { type: "button", class: "wa-newmsg", tabindex: "-1" }, [
      iconSpan("down", 14), label(el("span"), "assistant.new_messages", "Nouveaux messages")
    ]);
    App.main = el("div", { class: "wa-main" }, [App.body, App.newMsg]);

    // Composer
    App.input = el("textarea", {
      class: "wa-input", rows: "1", enterkeyhint: "send", autocomplete: "off",
      maxlength: String(Validation.MAX_MESSAGE)
    });
    label(App.input, "assistant.placeholder", "Posez votre question…", "placeholder");
    label(App.input, "assistant.placeholder", "Posez votre question…", "aria-label");
    App.sendBtn = label(el("button", { type: "button", class: "wa-send", disabled: "", html: icon(IC.send, 18) }),
      "assistant.send", "Envoyer le message", "aria-label");

    var hint = label(el("span", { class: "wa-composer__hint", "aria-hidden": "true" }),
      "assistant.hint_enter", "Entrée pour envoyer · Maj+Entrée = nouvelle ligne");
    var newChat = el("button", { type: "button", class: "wa-newchat" }, [
      iconSpan("newchat", 13), label(el("span"), "assistant.new_chat", "Nouvelle conversation")
    ]);
    var composer = el("div", { class: "wa-composer" }, [
      el("div", { class: "wa-composer__row" }, [App.input, App.sendBtn]),
      el("div", { class: "wa-composer__meta" }, [hint, newChat])
    ]);

    App.panel = el("div", {
      class: "wa-panel", id: "wa-panel", role: "dialog",
      "aria-labelledby": titleId, "aria-modal": "false", tabindex: "-1"
    }, [header, App.main, composer]);
    App.scrim = el("div", { class: "wa-scrim", "aria-hidden": "true" });

    App.root.appendChild(App.scrim);
    App.root.appendChild(App.panel);
    Launcher.attachPanel(App.panel);

    // Événements
    App.closeBtn.addEventListener("click", close);
    App.scrim.addEventListener("click", close);
    newChat.addEventListener("click", newConversation);
    App.sendBtn.addEventListener("click", onSend);
    App.input.addEventListener("input", onInput);
    App.input.addEventListener("keydown", onKeydown);
    App.body.addEventListener("scroll", onBodyScroll, { passive: true });
    App.newMsg.addEventListener("click", function () { scrollToEnd(true); App.input.focus(); });
    document.addEventListener("i18n:changed", relabel);

    App.built = true;
  }

  /* ------------------------------------------------------------------ */
  /* Mode feuille mobile : modal, arrière-plan inerte, défilement bloqué  */
  /* ------------------------------------------------------------------ */
  function setModal(on) {
    if (on === App.modal) return;
    App.modal = on;
    App.panel.setAttribute("aria-modal", on ? "true" : "false");
    var html = document.documentElement;
    if (on) {
      App.prevOverflow = html.style.overflow;
      html.style.overflow = "hidden";
      Array.prototype.forEach.call(document.body.children, function (n) {   // le reste de la page devient inerte
        if (n === App.root || n.tagName === "SCRIPT" || n.hasAttribute("inert")) return;
        n.setAttribute("inert", "");
        App.inerted.push(n);
      });
    } else {
      html.style.overflow = App.prevOverflow || "";
      App.inerted.forEach(function (n) { n.removeAttribute("inert"); });
      App.inerted = [];
    }
  }
  function syncMode() { if (App.isOpen) setModal(mqMobile.matches); }

  /** Tab / Maj+Tab restent dans la feuille (mode modal). */
  function trapTab(e) {
    var sel = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex="0"]';
    var nodes = Array.prototype.filter.call(App.panel.querySelectorAll(sel), function (n) {
      return n.offsetParent !== null && getComputedStyle(n).visibility !== "hidden";
    });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || active === App.panel || !App.panel.contains(active))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (active === last || !App.panel.contains(active))) {
      e.preventDefault(); first.focus();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Ouverture / fermeture (focus & accessibilité)                       */
  /* ------------------------------------------------------------------ */
  function open(opts) {
    opts = opts || {};
    if (App.isOpen) { if (opts.ask) ask(opts.ask); return; }
    buildPanel();
    App.context = detectContext();
    if (!App.thread.childNodes.length) renderWelcome();

    App.isOpen = true;
    void App.panel.offsetWidth;          // force le style initial : la transition d'ouverture se joue dès le 1er affichage
    Launcher.setOpen(true);              // classe is-open, aria-expanded et nom du launcher

    setModal(mqMobile.matches);
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", syncMode);
    document.addEventListener("keydown", onDocKeydown, true);
    watchViewport(true);
    scrollToEnd(true);

    setTimeout(function () {
      if (!App.isOpen) return;
      // Mobile : focus sur le panneau (nommé) — pas sur le champ, pour ne pas ouvrir le clavier d'emblée.
      try { (App.modal ? App.panel : App.input).focus({ preventScroll: true }); } catch (e) { /* silencieux */ }
    }, Launcher.reduced() ? 0 : 120);

    if (opts.ask) setTimeout(function () { submit(opts.ask); }, Launcher.reduced() ? 0 : 160);
  }

  function close() {
    if (!App.isOpen) return;
    App.isOpen = false;
    setModal(false);
    Launcher.setOpen(false);
    document.removeEventListener("keydown", onDocKeydown, true);
    if (mqMobile.removeEventListener) mqMobile.removeEventListener("change", syncMode);
    watchViewport(false);
    setTimeout(Launcher.focusFab, 0);    // le focus revient au launcher
  }

  function onDocKeydown(e) {
    if (!App.isOpen) return;
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    else if (e.key === "Tab" && App.modal) trapTab(e);
  }

  /* ------------------------------------------------------------------ */
  /* Rendu : écran d'accueil                                             */
  /* ------------------------------------------------------------------ */
  function renderWelcome() {
    var w = Responder.welcome(App.context || detectContext());
    var wrap = el("div", { class: "wa-welcome" }, [
      el("p", { class: "wa-welcome__hi", text: w.message }),
      el("p", { class: "wa-note" }, [iconSpan("info", 15), el("span", { text: t("assistant.role_note", "Je réponds à partir des informations publiées sur ce site. Pour une situation particulière, notre équipe vous répond directement.") })])
    ]);
    if (w.suggestions && w.suggestions.length) {
      wrap.appendChild(el("div", { class: "wa-chips" }, w.suggestions.map(makeChip)));
    }
    App.thread.appendChild(wrap);
  }

  function makeChip(text) {
    var b = el("button", { type: "button", class: "wa-chip", text: text });
    b.addEventListener("click", function () { track("assistant_suggestion_clicked", {}); submit(text); });
    return b;
  }

  /* ------------------------------------------------------------------ */
  /* Rendu : messages                                                    */
  /* ------------------------------------------------------------------ */
  function addUserTurn(text) {
    var turn = el("div", { class: "wa-turn wa-turn--user" }, [
      el("div", { class: "wa-bubble wa-bubble--user", text: text })
    ]);
    App.thread.appendChild(turn);
    scrollToEnd(true);                    // l'utilisateur vient d'écrire : toujours montrer sa question
  }

  function addAssistantResponse(resp) {
    var turn = el("div", { class: "wa-turn wa-turn--assistant" });

    if (resp.message) {
      turn.appendChild(el("div", { class: "wa-bubble wa-bubble--assistant", text: resp.message }));
    }
    if (resp.cards && resp.cards.length) {
      var cards = el("div", { class: "wa-cards" });
      resp.cards.forEach(function (c) { var node = renderCard(c); if (node) cards.appendChild(node); });
      if (cards.childNodes.length) turn.appendChild(cards);
    }
    /* Réponse issue du Centre d'aide : lien vers la même réponse sur la page (source unique). */
    var faqSrc = resp.meta && resp.meta.faqId && resp.sources && resp.sources[0];
    if (faqSrc && /^faq\.html#/.test(faqSrc.url)) {
      turn.appendChild(el("a", { class: "wa-source", href: faqSrc.url }, [iconSpan("book", 14), el("span", { text: t("assistant.see_help_center", "Voir dans le Centre d’aide") })]));
    }
    if (resp.suggestions && resp.suggestions.length) {
      var related = !!(resp.meta && resp.meta.faqId);
      var fu = el("div", { class: "wa-followups" }, [
        el("span", { class: "wa-followups__label", text: related ? t("assistant.related_label", "Questions associées :") : t("assistant.followups_label", "Vous pouvez aussi demander :") }),
        el("div", { class: "wa-chips" }, resp.suggestions.map(makeChip))
      ]);
      turn.appendChild(fu);
    }
    App.thread.appendChild(turn);
    scrollToEnd(false);                   // suit seulement si le lecteur est déjà en bas

    // Annonce polie (sans interrompre) : le texte de la réponse
    if (App.live) App.live.textContent = resp.message || "";
  }

  function translatedTitle(card) {
    if (card.titleKey) { var v = t(card.titleKey, null); if (v) return v; }
    return card.title;
  }
  function translatedDesc(card) {
    if (card.descKey) { var v = t(card.descKey, null); if (v) return v; }
    return card.description;
  }

  function renderCard(card) {
    if (card.type === "training") {
      var meta = el("div", { class: "wa-card__meta" });
      if (card.duration) meta.appendChild(el("span", { class: "wa-tag" }, [iconSpan("clock", 12), el("span", { text: card.duration })]));
      if (card.level) meta.appendChild(el("span", { class: "wa-tag" }, [iconSpan("level", 12), el("span", { text: card.level })]));
      if (card.priceLabel) meta.appendChild(el("span", { class: "wa-tag" }, [iconSpan("price", 12), el("span", { text: card.priceLabel })]));

      var a = el("a", {
        class: "wa-card wa-card--training", href: card.url,
        "aria-label": t("assistant.card_view_training", "Voir la formation") + " : " + translatedTitle(card)
      }, [
        el("span", { class: "wa-card__eyebrow" }, [iconSpan("training", 14), el("span", { text: t("assistant.card_training", "Formation") })]),
        el("p", { class: "wa-card__title", text: translatedTitle(card) }),
        translatedDesc(card) ? el("p", { class: "wa-card__desc", text: translatedDesc(card) }) : null,
        meta,
        el("span", { class: "wa-card__cta" }, [el("span", { text: t("assistant.card_view_training", "Voir la formation") }), iconSpan("arrow", 16)])
      ]);
      a.addEventListener("click", function () { track("assistant_training_card_clicked", { id: card.category || "formation" }); });
      return a;
    }

    if (card.type === "navigation") {
      return el("a", {
        class: "wa-card wa-card--navigation", href: card.url,
        "aria-label": t("assistant.card_view_page", "Voir la page") + " : " + translatedTitle(card)
      }, [
        el("span", { class: "wa-card__eyebrow" }, [iconSpan("page", 14), el("span", { text: t("assistant.card_page", "Page") })]),
        el("p", { class: "wa-card__title", text: translatedTitle(card) }),
        card.description ? el("p", { class: "wa-card__desc", text: card.description }) : null,
        el("span", { class: "wa-card__cta" }, [el("span", { text: t("assistant.card_view_page", "Voir la page") }), iconSpan("arrow", 16)])
      ]);
    }

    if (card.type === "contact") {
      var links = el("div", { class: "wa-contact-links" });
      var page = el("a", { class: "wa-contact-link wa-contact-link--primary", href: card.url || "contact.html" }, [iconSpan("pin", 17), el("span", { text: t("assistant.contact_page", "Ouvrir la page contact") })]);
      page.addEventListener("click", function () { track("assistant_contact_requested", { via: "page" }); });
      links.appendChild(page);
      if (card.phoneHref) links.appendChild(el("a", { class: "wa-contact-link", href: card.phoneHref }, [iconSpan("phone", 17), el("span", { text: t("assistant.contact_call", "Appeler") + " · " + card.phone })]));
      if (card.email) links.appendChild(el("a", { class: "wa-contact-link", href: "mailto:" + card.email }, [iconSpan("mail", 17), el("span", { text: card.email })]));

      var box = el("div", { class: "wa-card wa-card--contact" }, [
        el("span", { class: "wa-card__eyebrow" }, [iconSpan("phone", 14), el("span", { text: t("assistant.contact_title", "Contacter Wisy Safety") })]),
        links
      ]);
      if (card.hours) box.appendChild(el("p", { class: "wa-contact__hours", text: card.hours }));
      return box;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Indicateur « Wisy prépare votre réponse » (3 points, aria-live)     */
  /* ------------------------------------------------------------------ */
  function showTyping() {
    var node = el("div", { class: "wa-turn wa-turn--assistant wa-typing-turn" }, [
      el("div", { class: "wa-typing", role: "status" }, [
        el("span", { class: "wa-typing__dots", "aria-hidden": "true", html: "<span></span><span></span><span></span>" }),
        el("span", { text: t("assistant.typing", "Wisy prépare votre réponse") })
      ])
    ]);
    App.thread.appendChild(node);
    scrollToEnd(false);
    return node;
  }

  /** Erreur : dit ce qui s'est passé et quoi faire — jamais de détail technique. */
  function showError(retryText, offline) {
    var retry = el("button", { type: "button", class: "wa-chip", text: t("assistant.retry", "Réessayer") });
    retry.addEventListener("click", function () { submit(retryText); });
    var contact = el("a", { class: "wa-chip", href: "contact.html", text: t("assistant.error_contact", "Contacter l’équipe") });
    var box = el("div", { class: "wa-error", role: "alert" }, [
      el("p", { text: offline ? t("assistant.error_offline", "Vous semblez hors connexion. Vérifiez votre connexion, puis réessayez.") : t("assistant.error", "Une erreur est survenue. Réessayez dans quelques instants.") }),
      el("div", { class: "wa-chips" }, [retry, contact])
    ]);
    App.thread.appendChild(el("div", { class: "wa-turn wa-turn--assistant" }, [box]));
    scrollToEnd(false);
    track("assistant_error", { stage: "answer", offline: !!offline });
  }

  /* ------------------------------------------------------------------ */
  /* Envoi / réponse                                                     */
  /* ------------------------------------------------------------------ */
  function onInput() {
    autosize();
    App.sendBtn.disabled = !App.input.value.trim() || App.busy;
  }
  function onKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {   // isComposing : ne pas envoyer pendant une saisie IME
      e.preventDefault();
      onSend();
    }
  }
  function autosize() {
    App.input.style.height = "auto";
    App.input.style.height = Math.min(App.input.scrollHeight, 96) + "px";
  }
  function onSend() {
    var raw = App.input.value;
    if (!raw.trim() || App.busy) return;
    App.input.value = "";
    autosize();
    App.sendBtn.disabled = true;
    submit(raw);
  }

  function submit(rawMessage) {
    if (App.busy) return;                                       // pas de double envoi
    var message = Validation.sanitizeMessage(rawMessage);
    if (!message) return;

    addUserTurn(message);
    App.history.push({ role: "user", content: message });
    if (App.history.length > Validation.MAX_HISTORY) App.history = App.history.slice(-Validation.MAX_HISTORY);
    track("assistant_question_sent", { len: message.length });   // longueur seulement : jamais le texte

    App.busy = true;
    App.sendBtn.disabled = true;
    App.sendBtn.classList.add("is-loading");
    App.root.classList.add("is-busy");                          // état « écrit » de la mascotte
    var typing = showTyping();
    var epoch = App.epoch;

    getResponse(message).then(function (result) {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (epoch !== App.epoch) return;                          // conversation réinitialisée entre-temps : réponse abandonnée
      if (result.hardError) {
        showError(message, result.offline);
      } else {
        var clean = Validation.validateResponse(result.resp);
        if (result.degraded && (!clean.message || (clean.meta && clean.meta.intent === "not_found"))) {
          showError(message, result.offline);
        } else {
          addAssistantResponse(clean);
          App.history.push({ role: "assistant", content: clean.message });
        }
      }
    })["catch"](function () {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (epoch === App.epoch) showError(message, navigator.onLine === false);
    })["finally"](function () {
      if (epoch !== App.epoch) return;                          // l'état d'occupation a déjà été remis à zéro
      App.busy = false;
      App.sendBtn.classList.remove("is-loading");
      App.root.classList.remove("is-busy");
      App.sendBtn.disabled = !App.input.value.trim();
    });
  }

  /* Sessions PUBLIÉES (js/sessions.js — source unique des dates) : le moteur les cite telles quelles, jamais une
     date écrite dans l'assistant. WisySessions.load() ne rejette jamais ; sans le module, aucune session. */
  function loadSessions() {
    var S = window.WisySessions;
    if (!S || !S.load) return Promise.resolve([]);
    return S.load().then(function () { return S.upcoming(S.peek()); }, function () { return []; });
  }

  /* Réponse : distante (si configurée) sinon locale, avec repli. Hors-ligne, on ne tente pas le réseau. */
  function getResponse(message) {
    var url = apiUrl();
    var localResp = function (sessions) { return Responder.respond(message, { context: App.context, sessions: sessions || [] }); };
    var minDelay = new Promise(function (res) { setTimeout(res, Launcher.reduced() ? 120 : 420); });
    var localWith = function (extra) {
      return Promise.all([minDelay, loadSessions()]).then(function (r) { return Object.assign({ resp: localResp(r[1]) }, extra); });
    };

    if (!url) return localWith({ degraded: false });
    if (navigator.onLine === false) return localWith({ degraded: true, offline: true });

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);
    var payload = { message: message, history: App.history.slice(-Validation.MAX_HISTORY), context: App.context };

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      return { resp: data, degraded: false };
    })["catch"](function () {
      clearTimeout(timer);
      // Repli automatique sur le cœur local (résilience)
      return loadSessions().then(function (ss) { return { resp: localResp(ss), degraded: true, offline: navigator.onLine === false }; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* ask(texte) : ouvre l'assistant ET envoie la question (Centre d'aide) */
  /* ------------------------------------------------------------------ */
  function ask(text) {
    var msg = String(text == null ? "" : text).trim();
    if (!App.isOpen) { open(msg ? { ask: msg } : {}); return; }
    if (!msg || App.busy) return;                               // une réponse est déjà en cours : on n'empile pas
    submit(msg);
  }

  /* ------------------------------------------------------------------ */
  /* Mobile : suit le clavier virtuel (visualViewport) pour que la zone   */
  /* de saisie ne soit jamais masquée ni hors de l'écran.                */
  /* ------------------------------------------------------------------ */
  var vvHandler = null;
  function watchViewport(on) {
    var vv = window.visualViewport;
    if (!vv || !App.panel) return;
    if (!on) {
      if (vvHandler) { vv.removeEventListener("resize", vvHandler); vv.removeEventListener("scroll", vvHandler); vvHandler = null; }
      App.panel.style.removeProperty("--wa-kb");
      App.panel.style.removeProperty("--wa-vvh");
      return;
    }
    if (vvHandler) return;
    vvHandler = function () {
      if (!App.isOpen) return;
      if (!mqMobile.matches) {
        App.panel.style.removeProperty("--wa-kb"); App.panel.style.removeProperty("--wa-vvh"); return;
      }
      var kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      App.panel.style.setProperty("--wa-kb", kb + "px");
      App.panel.style.setProperty("--wa-vvh", Math.round(vv.height) + "px");
    };
    vv.addEventListener("resize", vvHandler);
    vv.addEventListener("scroll", vvHandler);
    vvHandler();
  }

  /* ------------------------------------------------------------------ */
  /* Nouvelle conversation                                               */
  /* ------------------------------------------------------------------ */
  function newConversation() {
    App.epoch++;
    App.history = [];
    App.busy = false;
    App.sendBtn.classList.remove("is-loading");
    App.root.classList.remove("is-busy");
    while (App.thread.firstChild) App.thread.removeChild(App.thread.firstChild);
    App.context = detectContext();
    renderWelcome();
    App.input.value = ""; autosize(); App.sendBtn.disabled = true;
    scrollToEnd(true);
    if (!App.modal) App.input.focus();                          // mobile : on n'ouvre pas le clavier d'office
    track("assistant_new_conversation", {});
  }

  /* ------------------------------------------------------------------ */
  /* Défilement : suit les nouveaux messages SEULEMENT si le lecteur est  */
  /* déjà en bas ; sinon bouton « Nouveaux messages ↓ » (jamais de saut). */
  /* ------------------------------------------------------------------ */
  function nearBottom() {
    var b = App.body;
    return b.scrollHeight - b.scrollTop - b.clientHeight < STICK_THRESHOLD;
  }
  function onBodyScroll() {
    App.stick = nearBottom();
    if (App.stick) App.newMsg.classList.remove("is-visible");
    App.newMsg.tabIndex = App.newMsg.classList.contains("is-visible") ? 0 : -1;
  }
  function scrollToEnd(force) {
    if (!App.body) return;
    if (!force && !App.stick) {                                 // le lecteur relit plus haut : ne pas le déplacer
      App.newMsg.classList.add("is-visible");
      App.newMsg.tabIndex = 0;
      return;
    }
    App.stick = true;
    App.newMsg.classList.remove("is-visible");
    App.newMsg.tabIndex = -1;
    // Double rAF + court repli : la hauteur se stabilise après l'animation d'entrée des
    // bulles/cartes (translateY), sinon on scrolle trop tôt. Si le lecteur remonte entre-temps
    // (onBodyScroll remet `stick` à false), les sauts encore en attente sont abandonnés.
    var jump = function () { if (App.stick) App.body.scrollTop = App.body.scrollHeight; };
    requestAnimationFrame(function () { jump(); requestAnimationFrame(jump); });
    setTimeout(jump, 80);
  }

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  NS.panel = {
    open: open, close: close, ask: ask, submit: submit, newConversation: newConversation,
    isOpen: function () { return App.isOpen; }
  };
})();
