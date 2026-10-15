/* =========================================================================
   WISY SAFETY — Réservations : client de la feuille Google « Réservations - Wisy Safety »
   (google-sheets/reservations.gs, adresse RESERVATIONS_API_URL dans js/supabase-config.js). Testé par
   tests/reservations.test.js.

   - book() envoie UNE demande (une ou plusieurs formations) au script de la feuille, qui vérifie les places et
     enregistre la réservation SOUS VERROU : seule sa réponse fait foi (jamais l'affichage du navigateur) ;
   - un identifiant de requête (requestId) accompagne la demande : si la connexion coupe et que la personne
     réessaie, la feuille renvoie la MÊME référence au lieu de réserver deux fois ;
   - les réponses sont normalisées STRICTEMENT (seuls les champs attendus sont gardés).

   Aucune donnée n'est écrite dans le navigateur par ce module : la demande part uniquement dans le CORPS d'une
   requête POST chiffrée. Module « dual-mode » (navigateur : window.WisyReservations ; Node : require).
   ========================================================================= */
(function (root) {
  "use strict";

  var TIMEOUT_MS = 30000;          // la feuille peut attendre son verrou (20 s au plus) quand plusieurs personnes réservent
  var SESSION_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
  var TRAINING_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
  var REASONS = ["unknown", "cancelled", "closed", "full", "insufficient"];

  /** Adresse du script Google (déploiement « Application Web »), ou localhost en développement ; sinon null. */
  function endpoint(cfg) {
    var url = String((cfg && cfg.RESERVATIONS_API_URL) || "").trim();
    if (/^https:\/\/script\.google\.com\/(?:a\/[^\s/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url)) return url;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s?#]*$/.test(url)) return url;
    return null;
  }
  function isConfigured(cfg) { return !!endpoint(cfg); }

  /** Identifiant de requête aléatoire (24 caractères) — sert uniquement à reconnaître un nouvel essai. */
  function newRequestId() {
    var chars = "abcdefghijkmnopqrstuvwxyz23456789", out = "r-", buf = null;
    try {
      var c = root.crypto || (typeof require === "function" ? require("node:crypto").webcrypto : null);
      if (c && c.getRandomValues) { buf = new Uint8Array(22); c.getRandomValues(buf); }
    } catch (e) { buf = null; }
    for (var i = 0; i < 22; i++) out += chars.charAt((buf ? buf[i] : Math.floor(Math.random() * 256)) % chars.length);
    return out;
  }

  function int(v, min, max) { var n = Number(v); return isFinite(n) && Math.floor(n) === n && n >= min && n <= max ? n : null; }

  /** Réponse de la feuille → résultat sûr, ou null si elle est inattendue. */
  function normalizeBook(json) {
    if (!json || typeof json !== "object") return null;
    if (json.status === "ok") {
      var items = (Array.isArray(json.items) ? json.items : []).slice(0, 20).map(function (it) {
        it = it && typeof it === "object" ? it : {};
        return {
          training: TRAINING_RE.test(String(it.training || "")) ? String(it.training) : null,
          sessionId: SESSION_RE.test(String(it.sessionId || "")) ? String(it.sessionId) : null,
          seats: int(it.seats, 1, 500),
          status: ["confirmed", "pending", "request"].indexOf(it.status) >= 0 ? it.status : "request"
        };
      });
      return { kind: "ok", reference: /^WSR-\d{4}-[A-Z0-9]{5,6}$/.test(json.reference) ? json.reference : null, items: items, duplicate: json.duplicate === true };
    }
    if (json.status === "unavailable") {
      var problems = (Array.isArray(json.problems) ? json.problems : []).slice(0, 20).map(function (p) {
        p = p && typeof p === "object" ? p : {};
        return {
          sessionId: SESSION_RE.test(String(p.sessionId || "")) ? String(p.sessionId) : null,
          reason: REASONS.indexOf(p.reason) >= 0 ? p.reason : "unknown",
          remaining: int(p.remaining, 0, 500)
        };
      }).filter(function (p) { return p.sessionId; });
      return { kind: "seats", problems: problems };
    }
    if (json.status === "invalid") {
      var f = json.fields && typeof json.fields === "object" ? json.fields : {}, fields = {};
      ["requestId", "firstName", "lastName", "email", "phone", "company", "vat", "address", "zip", "city", "country", "items"].forEach(function (k) {
        if (typeof f[k] === "string") fields[k] = f[k].slice(0, 30);
      });
      return { kind: "invalid", fields: fields };
    }
    if (json.status === "rate_limited") return { kind: "rate_limited", retryAfter: Math.max(60, Math.min(86400, Math.round(+json.retryAfter) || 3600)) };
    if (json.status === "busy") return { kind: "busy" };
    return null;
  }

  /**
   * Envoie une demande de réservation. Jamais d'exception :
   *   ok (reference, items[], duplicate) | seats (problems[]) | invalid (fields) | rate_limited | busy | not_configured | unavailable
   * @param {{config:object, fetch:Function, order:object, timeout?:number}} opts
   *   order = { requestId, lang, customer{firstName,lastName,email,phone}, billing{…}, items[{training, sessionId, quantity, participants|null}], website }
   */
  function book(opts) {
    var url = endpoint(opts && opts.config);
    if (!url || typeof (opts && opts.fetch) !== "function") return Promise.resolve({ kind: "not_configured" });
    var o = opts.order || {};
    var body = {
      action: "book", requestId: String(o.requestId || ""), lang: String(o.lang || "fr"),
      customer: o.customer || {}, billing: o.billing || {},
      items: (Array.isArray(o.items) ? o.items : []).map(function (it) {
        return { training: it.training, sessionId: it.sessionId || null, quantity: it.quantity, participants: Array.isArray(it.participants) ? it.participants : null };
      }),
      website: o.website || ""
    };
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || TIMEOUT_MS) : null;
    /* « text/plain » = requête « simple » : pas de pré-vérification CORS (que les scripts Google ne gèrent pas).
       Google répond par une redirection vers script.googleusercontent.com, qu'il faut suivre. */
    var init = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body),
      credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", mode: "cors", redirect: "follow" };
    if (ctrl) init.signal = ctrl.signal;
    return Promise.resolve(opts.fetch(url, init))
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { j = null; }
          if (r.status === 200) return normalizeBook(j) || { kind: "unavailable" };
          if (r.status === 404) return { kind: "not_configured" };
          if (r.status === 429) return { kind: "rate_limited", retryAfter: 3600 };
          return { kind: "unavailable" };
        });
      })
      .catch(function () { return { kind: "unavailable" }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }

  var api = { endpoint: endpoint, isConfigured: isConfigured, newRequestId: newRequestId, normalizeBook: normalizeBook, book: book };
  root.WisyReservations = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : this);
