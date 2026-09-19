/* =========================================================================
   WISY SAFETY — Assistant Wisy · Contrôleur d'interface
   -------------------------------------------------------------------------
   Point d'entrée unique. S'auto-injecte sur n'importe quelle page (aucun
   markup à dupliquer) : launcher + micro-bulle + panneau conversationnel.

   • Cœur FIABLE 100 % client (js/assistant/responder.js) : l'assistant
     répond depuis les vraies données du site, sans clé ni réseau.
   • Enrichissement OPTIONNEL par une route serveur (/api/chat) si
     window.WISY_ASSISTANT_CONFIG.apiUrl (ou WISY_CONFIG.ASSISTANT_API_URL)
     est défini. En cas d'échec/timeout → repli automatique sur le cœur local.

   Accessibilité : launcher = vrai <button> nommé ; panneau role="dialog"
   NON modal (n'enferme pas la page) ; Escape ferme ; focus géré et restauré ;
   annonces polies via aria-live. Respect de prefers-reduced-motion (CSS).

   Aucun HTML arbitraire n'est injecté : tout texte issu du moteur ou de
   l'utilisateur est posé via textContent ; les liens ne sont créés qu'à
   partir d'URLs validées (js/assistant/validation.js).
   ========================================================================= */
(function () {
  "use strict";

  var NS = window.WisyAssistant;
  if (!NS || !NS.Responder || !NS.Validation || !NS.Mascot) return; // dépendances requises

  var Responder = NS.Responder;
  var Validation = NS.Validation;
  var Mascot = NS.Mascot;

  /* ------------------------------------------------------------------ */
  /* Config (LLM optionnel)                                             */
  /* ------------------------------------------------------------------ */
  function apiUrl() {
    var a = window.WISY_ASSISTANT_CONFIG && window.WISY_ASSISTANT_CONFIG.apiUrl;
    var b = window.WISY_CONFIG && window.WISY_CONFIG.ASSISTANT_API_URL;
    var u = (a || b || "").trim();
    return u || null;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NUDGE_KEY = "wisy_assistant_nudge_seen";

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
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }
  var IC = {
    close:    '<path d="M6 6l12 12M18 6L6 18"/>',
    minimize: '<path d="M6 12h12"/>',
    send:     '<path d="M6 12h12M13 6l6 6-6 6"/>',
    newchat:  '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"/>',
    arrow:    '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    level:    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    price:    '<path d="M18 7a6 6 0 0 0-5-3 6 6 0 0 0 0 16 6 6 0 0 0 5-3M4 10h9M4 14h9"/>',
    phone:    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/>',
    mail:     '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 6 9-6"/>',
    pin:      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/>',
    training: '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/>',
    page:     '<path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5"/>'
  };

  /* ------------------------------------------------------------------ */
  /* Helpers DOM (aucun innerHTML pour le contenu texte)                */
  /* ------------------------------------------------------------------ */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v; // uniquement pour nos SVG/icônes de confiance
        else if (k === "class") n.className = v;
        else n.setAttribute(k, v);
      }
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function iconSpan(name, w) { return el("span", { html: icon(IC[name], w), "aria-hidden": "true" }); }

  /* ------------------------------------------------------------------ */
  /* Analytics respectueux : événements anonymisés, SANS contenu.        */
  /* Aucune requête réseau ici — on émet un CustomEvent que le site peut  */
  /* relayer vers son outil analytics EN RESPECTANT son consentement.    */
  /* ------------------------------------------------------------------ */
  function track(event, data) {
    try {
      document.dispatchEvent(new CustomEvent("wisy:analytics", { detail: Object.assign({ event: event }, data || {}) }));
    } catch (e) { /* silencieux */ }
  }

  /* ================================================================== */
  /* Contrôleur                                                          */
  /* ================================================================== */
  var App = {
    root: null, launcher: null, panel: null, body: null, thread: null,
    input: null, sendBtn: null, live: null, nudge: null,
    isOpen: false, panelBuilt: false, busy: false,
    lastFocus: null, compactTimer: null,
    history: [], context: null
  };

  /* --- Contexte de page (contextual awareness, non intrusif) -------- */
  function detectContext() {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var page = "generic";
    if (path === "" || path === "index.html") page = "home";
    else if (path === "formations.html") page = "formations";
    else if (path === "contact.html") page = "contact";
    else if (path === "inscription.html") page = "inscription";
    else if (path === "avis.html") page = "avis";

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
  /* Construction : launcher + nudge                                     */
  /* ------------------------------------------------------------------ */
  function buildRoot() {
    App.root = el("div", { id: "wisy-assistant" });

    // Launcher (vrai bouton, nom accessible)
    App.launcher = el("button", {
      type: "button",
      class: "wa-launcher",
      "aria-label": t("assistant.aria_open", "Ouvrir l’assistant Wisy Safety"),
      "aria-haspopup": "dialog",
      "aria-expanded": "false"
    }, [
      el("span", { class: "wa-launcher__label", "aria-hidden": "true", text: t("assistant.launcher_label", "Besoin d’aide ?") }),
      el("span", { class: "wa-launcher__badge" }, [
        el("span", { html: Mascot.svg({ id: "launcher" }) }),
        el("span", { class: "wa-launcher__dot", "aria-hidden": "true" })
      ])
    ]);
    App.launcher.addEventListener("click", open);

    App.root.appendChild(App.launcher);
    document.body.appendChild(App.root);

    // Apparition élégante + passage compact après quelques secondes
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { App.launcher.classList.add("is-ready"); });
    });
    scheduleCompact();

    maybeShowNudge();
  }

  function scheduleCompact() {
    clearTimeout(App.compactTimer);
    App.compactTimer = setTimeout(function () {
      if (!App.isOpen) App.launcher.classList.add("is-compact");
    }, 5200);
  }

  /* --- Micro-bulle d'accueil (première visite uniquement) ----------- */
  function maybeShowNudge() {
    var seen;
    try { seen = localStorage.getItem(NUDGE_KEY); } catch (e) { seen = "1"; /* si bloqué, ne pas insister */ }
    if (seen) return;

    App.nudge = el("div", { class: "wa-nudge", role: "status" }, [
      el("button", {
        type: "button", class: "wa-nudge__close",
        "aria-label": t("assistant.nudge_close", "Fermer"), html: icon(IC.close, 15)
      }),
      el("span", { text: t("assistant.nudge", "Besoin d’aide pour trouver une formation ?") })
    ]);
    App.nudge.querySelector(".wa-nudge__close").addEventListener("click", function (e) {
      e.stopPropagation();
      dismissNudge();
    });
    App.nudge.addEventListener("click", function () { dismissNudge(); open(); });
    App.root.appendChild(App.nudge);

    setTimeout(function () { if (App.nudge) App.nudge.classList.add("is-visible"); }, 1400);
    // Disparaît d'elle-même — ne jamais réafficher pendant la navigation
    setTimeout(dismissNudge, 12000);
  }
  function dismissNudge() {
    try { localStorage.setItem(NUDGE_KEY, "1"); } catch (e) {}
    if (App.nudge) {
      App.nudge.classList.remove("is-visible");
      var n = App.nudge; App.nudge = null;
      setTimeout(function () { if (n && n.parentNode) n.parentNode.removeChild(n); }, 420);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Construction : panneau (paresseuse)                                 */
  /* ------------------------------------------------------------------ */
  function buildPanel() {
    if (App.panelBuilt) return;

    var titleId = "wa-title";

    // Header
    var header = el("div", { class: "wa-header" }, [
      el("span", { class: "wa-header__badge", "aria-hidden": "true" }, el("span", { html: Mascot.svg({ id: "header" }) })),
      el("div", { class: "wa-header__titles" }, [
        el("p", { class: "wa-header__title", id: titleId, text: t("assistant.header_title", "Assistant Wisy") }),
        el("p", { class: "wa-header__subtitle" }, [
          el("span", { class: "wa-status-dot", "aria-hidden": "true" }),
          el("span", { text: t("assistant.header_subtitle", "Votre guide formation") + " · " + t("assistant.status", "Assistant disponible") })
        ])
      ]),
      el("div", { class: "wa-header__actions" }, [
        el("button", { type: "button", class: "wa-iconbtn wa-min", "aria-label": t("assistant.minimize", "Réduire l’assistant"), html: icon(IC.minimize) }),
        el("button", { type: "button", class: "wa-iconbtn wa-close", "aria-label": t("assistant.close", "Fermer l’assistant"), html: icon(IC.close) })
      ])
    ]);

    // Corps + zone live
    App.thread = el("div", { class: "wa-thread" });
    App.live = el("div", { class: "wa-live", "aria-live": "polite", "aria-atomic": "false", style: "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);" });
    App.body = el("div", { class: "wa-body", tabindex: "-1" }, [App.thread, App.live]);

    // Composer
    App.input = el("textarea", {
      class: "wa-input", rows: "1",
      placeholder: t("assistant.placeholder", "Posez votre question…"),
      "aria-label": t("assistant.placeholder", "Posez votre question…"),
      maxlength: String(Validation.MAX_MESSAGE)
    });
    App.sendBtn = el("button", { type: "button", class: "wa-send", "aria-label": t("assistant.send", "Envoyer le message"), disabled: "", html: icon(IC.send, 18) });

    var composer = el("div", { class: "wa-composer" }, [
      el("div", { class: "wa-composer__row" }, [App.input, App.sendBtn]),
      el("div", { class: "wa-composer__meta" }, [
        el("span", { class: "wa-composer__hint", "aria-hidden": "true", text: t("assistant.hint_enter", "Entrée pour envoyer · Maj+Entrée = nouvelle ligne") }),
        el("button", { type: "button", class: "wa-newchat" }, [iconSpan("newchat", 13), el("span", { text: t("assistant.new_chat", "Nouvelle conversation") })])
      ])
    ]);

    App.panel = el("div", {
      class: "wa-panel", role: "dialog", "aria-labelledby": titleId, "aria-label": t("assistant.header_title", "Assistant Wisy"), tabindex: "-1"
    }, [header, App.body, composer]);

    App.root.appendChild(App.panel);

    // Événements
    header.querySelector(".wa-close").addEventListener("click", close);
    header.querySelector(".wa-min").addEventListener("click", close);
    composer.querySelector(".wa-newchat").addEventListener("click", newConversation);
    App.sendBtn.addEventListener("click", onSend);
    App.input.addEventListener("input", onInput);
    App.input.addEventListener("keydown", onKeydown);

    App.panelBuilt = true;
  }

  /* ------------------------------------------------------------------ */
  /* Ouverture / fermeture (focus & accessibilité)                       */
  /* ------------------------------------------------------------------ */
  function open() {
    if (App.isOpen) return;
    buildPanel();
    App.context = detectContext();

    if (!App.thread.childNodes.length) renderWelcome();

    App.isOpen = true;
    App.lastFocus = document.activeElement;
    App.root.classList.add("is-open");
    App.launcher.setAttribute("aria-expanded", "true");
    dismissNudge();
    clearTimeout(App.compactTimer);

    document.addEventListener("keydown", onDocKeydown, true);
    // Focus dans le panneau (non modal : on n'enferme pas la page)
    setTimeout(function () {
      if (window.matchMedia("(max-width: 560px)").matches) { App.body.focus(); }
      else if (App.input) { App.input.focus(); }
    }, reduceMotion ? 0 : 120);

    scrollToEnd();
    track("chat_opened", { page: App.context.page });
  }

  function close() {
    if (!App.isOpen) return;
    App.isOpen = false;
    App.root.classList.remove("is-open");
    App.launcher.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onDocKeydown, true);
    scheduleCompact();
    // Restaure le focus vers le launcher
    var target = App.launcher;
    setTimeout(function () { try { target.focus(); } catch (e) {} }, 0);
    track("chat_closed", {});
  }

  function onDocKeydown(e) {
    if (e.key === "Escape" && App.isOpen) {
      e.stopPropagation();
      close();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Rendu : écran d'accueil                                             */
  /* ------------------------------------------------------------------ */
  function renderWelcome() {
    var w = Responder.welcome(App.context || detectContext());
    var wrap = el("div", { class: "wa-welcome" }, [
      el("p", { class: "wa-welcome__hi", text: w.message })
    ]);
    if (w.suggestions && w.suggestions.length) {
      wrap.appendChild(el("div", { class: "wa-chips" }, w.suggestions.map(makeChip)));
    }
    App.thread.appendChild(wrap);
  }

  function makeChip(label) {
    var b = el("button", { type: "button", class: "wa-chip", text: label });
    b.addEventListener("click", function () { submit(label); });
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
    scrollToEnd();
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
    if (resp.suggestions && resp.suggestions.length) {
      var fu = el("div", { class: "wa-followups" }, [
        el("span", { class: "wa-followups__label", text: t("assistant.followups_label", "Vous pouvez aussi demander :") }),
        el("div", { class: "wa-chips" }, resp.suggestions.map(makeChip))
      ]);
      turn.appendChild(fu);
    }
    App.thread.appendChild(turn);
    scrollToEnd();

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
      a.addEventListener("click", function () { track("training_card_clicked", { id: card.category || "formation" }); });
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
      page.addEventListener("click", function () { track("contact_requested", { via: "page" }); });
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
  /* Indicateur « Wisy prépare votre réponse »                           */
  /* ------------------------------------------------------------------ */
  function showTyping() {
    var node = el("div", { class: "wa-turn wa-turn--assistant wa-typing-turn" }, [
      el("div", { class: "wa-typing", role: "status" }, [
        el("span", { class: "wa-typing__orb", "aria-hidden": "true", html: "<span></span><span></span><span></span>" }),
        el("span", { text: t("assistant.typing", "Wisy prépare votre réponse") })
      ])
    ]);
    App.thread.appendChild(node);
    scrollToEnd();
    return node;
  }

  function showError(retryText) {
    var box = el("div", { class: "wa-error", role: "alert" });
    box.appendChild(el("strong", { text: t("assistant.header_title", "Assistant Wisy") + " — " }));
    box.appendChild(document.createTextNode(t("assistant.error", "Une difficulté technique empêche momentanément l’assistant de répondre. Vous pouvez réessayer ou contacter directement Wisy Safety.")));
    var actions = el("div", { class: "wa-chips", style: "margin-top:8px" }, [
      (function () { var b = el("button", { type: "button", class: "wa-chip", text: t("assistant.retry", "Réessayer") }); b.addEventListener("click", function () { submit(retryText); }); return b; })()
    ]);
    box.appendChild(actions);
    var turn = el("div", { class: "wa-turn wa-turn--assistant" }, [box]);
    App.thread.appendChild(turn);
    scrollToEnd();
    track("chat_error", {});
  }

  /* ------------------------------------------------------------------ */
  /* Envoi / réponse                                                     */
  /* ------------------------------------------------------------------ */
  function onInput() {
    autosize();
    App.sendBtn.disabled = !App.input.value.trim();
  }
  function onKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
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
    if (App.busy) return;
    var message = Validation.sanitizeMessage(rawMessage);
    if (!message) return;

    addUserTurn(message);
    App.history.push({ role: "user", content: message });
    if (App.history.length > Validation.MAX_HISTORY) App.history = App.history.slice(-Validation.MAX_HISTORY);
    track("chat_question_sent", { len: message.length });

    App.busy = true;
    App.sendBtn.classList.add("is-loading");
    App.root.classList.add("is-busy"); // état « thinking » de la mascotte
    var typing = showTyping();

    getResponse(message).then(function (result) {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (result.hardError) {
        showError(message);
      } else {
        var clean = Validation.validateResponse(result.resp);
        if (result.degraded && (!clean.message || (clean.meta && clean.meta.intent === "not_found"))) {
          showError(message);
        } else {
          addAssistantResponse(clean);
          App.history.push({ role: "assistant", content: clean.message });
        }
      }
    })["catch"](function () {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      showError(message);
    })["finally"](function () {
      App.busy = false;
      App.sendBtn.classList.remove("is-loading");
      App.root.classList.remove("is-busy");
      App.sendBtn.disabled = !App.input.value.trim();
    });
  }

  /* Réponse : distante (si configurée) sinon locale, avec repli. */
  function getResponse(message) {
    var url = apiUrl();
    var localResp = function () { return Responder.respond(message, { context: App.context }); };
    var minDelay = new Promise(function (res) { setTimeout(res, reduceMotion ? 120 : 420); });

    if (!url) {
      return minDelay.then(function () { return { resp: localResp(), degraded: false }; });
    }

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
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
      return { resp: localResp(), degraded: true };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Nouvelle conversation                                               */
  /* ------------------------------------------------------------------ */
  function newConversation() {
    App.history = [];
    App.busy = false;
    App.sendBtn.classList.remove("is-loading");
    while (App.thread.firstChild) App.thread.removeChild(App.thread.firstChild);
    App.context = detectContext();
    renderWelcome();
    if (App.input) { App.input.value = ""; autosize(); App.sendBtn.disabled = true; App.input.focus(); }
    track("chat_new", {});
  }

  function scrollToEnd() {
    if (!App.body) return;
    var jump = function () { App.body.scrollTop = App.body.scrollHeight; };
    // Double rAF + court repli : la hauteur se stabilise après l'animation
    // d'entrée des bulles/cartes (translateY), sinon on scrolle trop tôt.
    requestAnimationFrame(function () { jump(); requestAnimationFrame(jump); });
    setTimeout(jump, 80);
  }

  /* Relabel de l'interface au changement de langue */
  function relabel() {
    if (!App.launcher) return;
    App.launcher.setAttribute("aria-label", t("assistant.aria_open", "Ouvrir l’assistant Wisy Safety"));
    var lbl = App.launcher.querySelector(".wa-launcher__label");
    if (lbl) lbl.textContent = t("assistant.launcher_label", "Besoin d’aide ?");
    // Le panneau se retraduit à la prochaine ouverture / nouvelle conversation.
    if (App.panelBuilt && App.isOpen) {
      // rafraîchit les libellés statiques visibles
      var title = App.panel.querySelector(".wa-header__title"); if (title) title.textContent = t("assistant.header_title", "Assistant Wisy");
      if (App.input) App.input.setAttribute("placeholder", t("assistant.placeholder", "Posez votre question…"));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  function init() {
    if (document.getElementById("wisy-assistant")) return;
    buildRoot();
    document.addEventListener("i18n:changed", relabel);
    // Préconstruit le panneau à l'inactivité (perf : n'impacte pas le 1er rendu)
    var pre = function () { try { buildPanel(); } catch (e) {} };
    if ("requestIdleCallback" in window) requestIdleCallback(pre, { timeout: 4000 });
    else setTimeout(pre, 2500);

    // API de test / intégration
    NS.controller = {
      open: open, close: close, submit: submit, newConversation: newConversation,
      isOpen: function () { return App.isOpen; }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
