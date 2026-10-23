/* =========================================================================
   WISY SAFETY — Assistant · Validation & garde-fous
   -------------------------------------------------------------------------
   Sert À LA FOIS le client (avant affichage) et la route serveur optionnelle
   (avant renvoi). Garantit que :
     • les messages sont bornés en taille et nettoyés ;
     • aucune URL inventée / externe non prévue n'est rendue (allow-list des
       routes réelles du site + tel:/mailto: officiels) ;
     • la structure ChatResponse est valide (sinon on rejette les éléments
       douteux plutôt que d'injecter n'importe quoi dans le DOM).

   Aucune génération de HTML : le client rend le texte via textContent et ne
   construit des liens qu'à partir d'URLs validées ici → pas de surface XSS.

   Module « dual-mode » : navigateur + Node (tests / Edge Function).
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var Knowledge = (typeof module === "object" && module.exports)
    ? require("./knowledge.js")
    : (root.WisyAssistant && root.WisyAssistant.Knowledge);
  var api = factory(Knowledge);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Validation = api;
})(typeof self !== "undefined" ? self : this, function (Knowledge) {
  "use strict";

  var MAX_MESSAGE = 800;   // limite d'entrée utilisateur
  var MAX_HISTORY = 12;    // fenêtre de contexte (messages) transmise

  /* Pages réelles autorisées : DÉRIVÉES de la base de connaissances (elle-même dérivée du registre
     js/site-content.js) — pages principales ET pages dédiées de formation ; aucune liste à maintenir
     en double. Repli statique uniquement si la base n'est pas chargée. */
  var ALLOWED_PATHS = { "": 1 };
  function allowUrl(url) {
    var p = String(url || "").split("#")[0].split("?")[0];
    if (/^[a-z0-9-]+\.html$/.test(p)) ALLOWED_PATHS[p] = 1;
  }
  if (Knowledge && Knowledge.pages && Knowledge.formations) {
    Knowledge.pages().forEach(function (p) { allowUrl(p.url); });
    Knowledge.formations().forEach(function (f) { allowUrl(f.url); });
    if (Knowledge.publicPaths) Knowledge.publicPaths().forEach(allowUrl);   // services (VCA Entreprise) compris
  } else {
    ["index.html", "formations.html", "contact.html", "avis.html", "inscription.html", "faq.html", "agenda.html"].forEach(allowUrl);
  }

  var CONTACT = (Knowledge && Knowledge.CONTACT) || { email: "info@wisysafety.be", phoneHref: "tel:+3223188659" };

  /* Nettoie / borne un message utilisateur (retire les caractères de contrôle). */
  function sanitizeMessage(input) {
    var s = String(input == null ? "" : input);
    s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    if (s.length > MAX_MESSAGE) s = s.slice(0, MAX_MESSAGE);
    return s;
  }

  /* URL sûre ? Uniquement routes internes connues + tel:/mailto: officiels. */
  function isSafeUrl(url) {
    if (typeof url !== "string" || !url) return false;
    var u = url.trim();

    // tel: / mailto: uniquement vers les coordonnées officielles
    if (/^tel:/i.test(u)) return u.replace(/\s/g, "") === CONTACT.phoneHref.replace(/\s/g, "");
    if (/^mailto:/i.test(u)) return u.toLowerCase() === ("mailto:" + CONTACT.email).toLowerCase();

    // Jamais de schéma, jamais de protocole-relatif, jamais d'absolu
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false; // http:, https:, javascript:, data:…
    if (u.indexOf("//") === 0) return false;
    if (u.indexOf("\\") !== -1) return false;

    // Chemin relatif : on isole le fichier (avant # et ?)
    var path = u.split("#")[0].split("?")[0];
    // pas de remontée d'arborescence
    if (path.indexOf("..") !== -1) return false;
    // ancre pure (#id) → autorisée (reste sur la page courante)
    if (path === "") return true;
    return Object.prototype.hasOwnProperty.call(ALLOWED_PATHS, path);
  }

  var CARD_TYPES = { training: 1, navigation: 1, contact: 1 };

  /* Valide et NETTOIE une carte. Renvoie null si irrécupérable. */
  function cleanCard(card) {
    if (!card || typeof card !== "object") return null;
    if (!CARD_TYPES[card.type]) return null;
    var out = { type: card.type };
    out.title = String(card.title || "").slice(0, 120);
    if (card.description != null) out.description = String(card.description).slice(0, 300);
    if (card.type === "training") {
      if (card.duration) out.duration = String(card.duration).slice(0, 40);
      if (card.level) out.level = String(card.level).slice(0, 40);
      if (card.category) out.category = String(card.category).slice(0, 40);
      if (card.priceLabel) out.priceLabel = String(card.priceLabel).slice(0, 40);
      if (isSafeUrl(card.url)) out.url = card.url;
      if (isSafeUrl(card.signupUrl)) out.signupUrl = card.signupUrl;
      if (card.titleKey) out.titleKey = String(card.titleKey);
      if (card.descKey) out.descKey = String(card.descKey);
      if (!out.url) return null; // une formation sans lien valide n'est pas rendue
    } else if (card.type === "navigation") {
      if (!isSafeUrl(card.url)) return null;
      out.url = card.url;
      if (card.titleKey) out.titleKey = String(card.titleKey);
    } else if (card.type === "contact") {
      out.phone = CONTACT.phone;
      out.phoneHref = CONTACT.phoneHref;
      out.email = CONTACT.email;
      if (card.hours) out.hours = String(card.hours).slice(0, 120);
      out.url = isSafeUrl(card.url) ? card.url : "contact.html";
    }
    return out;
  }

  /* Valide toute la ChatResponse. Toujours renvoie un objet affichable. */
  function validateResponse(resp) {
    var out = { message: "", cards: [], suggestions: [], sources: [] };
    if (!resp || typeof resp !== "object") {
      out.message = "";
      return out;
    }
    out.message = String(resp.message == null ? "" : resp.message).slice(0, 4000);

    if (Array.isArray(resp.cards)) {
      resp.cards.forEach(function (c) {
        var cc = cleanCard(c);
        if (cc) out.cards.push(cc);
      });
      out.cards = out.cards.slice(0, 4);
    }
    if (Array.isArray(resp.suggestions)) {
      out.suggestions = resp.suggestions
        .filter(function (s) { return typeof s === "string" && s.trim(); })
        .map(function (s) { return s.trim().slice(0, 80); })
        .slice(0, 4);
    }
    if (Array.isArray(resp.sources)) {
      resp.sources.forEach(function (s) {
        if (s && typeof s === "object" && isSafeUrl(s.url)) {
          out.sources.push({ title: String(s.title || "").slice(0, 120), url: s.url });
        }
      });
      out.sources = out.sources.slice(0, 4);
    }
    if (resp.meta && typeof resp.meta === "object") out.meta = resp.meta;
    return out;
  }

  return {
    MAX_MESSAGE: MAX_MESSAGE,
    MAX_HISTORY: MAX_HISTORY,
    sanitizeMessage: sanitizeMessage,
    isSafeUrl: isSafeUrl,
    cleanCard: cleanCard,
    validateResponse: validateResponse
  };
});
