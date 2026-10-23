/* =========================================================================
   WISY SAFETY — Avis clients : client de la feuille Google Sheets (testé par tests/avis.test.js)
   -------------------------------------------------------------------------
   - envoi d'un avis au script Google de la feuille (google-sheets/avis.gs, adresse dans js/avis-config.js) :
     l'avis arrive dans la feuille avec le Statut « En attente », rien n'est publié ;
   - lecture des avis publiés (Statut « Confirmé ») ;
   - normalisation STRICTE des réponses : seuls les champs attendus sont conservés.

   Aucune donnée n'est écrite dans le navigateur (ni localStorage, ni cookie, ni URL) : l'avis part uniquement
   dans le CORPS d'une requête POST chiffrée.
   ========================================================================= */
(function (root) {
  "use strict";

  var TIMEOUT_MS = 15000;
  var FIELDS = { first_name: 80, last_name: 80, company: 120, title: 120, comment: 2000 };

  function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

  function isoDate(v) {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    var p = v.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.getUTCMonth() === +p[1] - 1 && d.getUTCDate() === +p[2] ? v : null;
  }

  /** Un avis publié tel que reçu de la feuille → objet sûr, ou null s'il est incomplet. */
  function normalizeReview(r) {
    if (!r || typeof r !== "object") return null;
    var rating = Number(r.rating);
    if (!(rating >= 1 && rating <= 5) || Math.round(rating) !== rating) return null;
    var out = { rating: rating, date: isoDate(r.date), reference: str(r.reference, 40) || null };
    Object.keys(FIELDS).forEach(function (f) { out[f] = str(r[f], FIELDS[f]) || null; });
    if (!out.first_name || !out.comment) return null;
    return out;
  }

  /** Réponse de la liste → { kind: "ok", reviews, stats } | { kind: "not_configured" } | null (réponse inattendue).
      `exclude` : références à ne JAMAIS afficher (avis de test publiés par erreur — filet de sécurité de js/avis-config.js ;
      la vraie correction reste de passer l'avis en « Refusé » dans la feuille). Si un avis est écarté, les statistiques de
      la feuille (qui le comptent) sont ignorées : la page les recalcule sur les avis affichés. */
  function normalizeList(json, exclude) {
    if (!json || typeof json !== "object") return null;
    if (json.status === "not_configured") return { kind: "not_configured" };
    if (json.status !== "ok" || !Array.isArray(json.reviews)) return null;
    var banned = Array.isArray(exclude) ? exclude.map(String) : [];
    var all = json.reviews.slice(0, 200).map(normalizeReview).filter(Boolean);
    var reviews = all.filter(function (r) { return !r.reference || banned.indexOf(r.reference) < 0; });
    var s = json.stats && typeof json.stats === "object" ? json.stats : {};
    var count = Math.round(Number(s.count));
    var average = Number(s.average);
    var stats = reviews.length === all.length && count >= reviews.length && count > 0 && average >= 1 && average <= 5 ? { count: count, average: average } : null;
    return { kind: "ok", reviews: reviews, stats: stats };
  }

  /** Réponse à l'envoi → { kind: "ok", reference } | invalid (fields) | rate_limited (retryAfter s) | null. */
  function normalizeSubmit(json) {
    if (!json || typeof json !== "object") return null;
    if (json.status === "ok") return { kind: "ok", reference: /^WS-\d{4}-[A-Z0-9]{5,6}$/.test(json.reference) ? json.reference : null };
    if (json.status === "invalid") {
      var f = json.fields && typeof json.fields === "object" ? json.fields : {}, fields = {};
      ["first_name", "email", "rating", "comment", "consent", "last_name", "company", "title"].forEach(function (k) {
        if (typeof f[k] === "string") fields[k] = f[k].slice(0, 20);
      });
      return { kind: "invalid", fields: fields };
    }
    if (json.status === "rate_limited") return { kind: "rate_limited", retryAfter: Math.max(60, Math.min(86400, Math.round(+json.retryAfter) || 3600)) };
    if (json.status === "not_configured") return { kind: "not_configured" };
    return null;
  }

  /* ------------------------------------------------------------------ client HTTP (script Google de la feuille) */

  /** Adresse du script Google, seulement si c'est bien un déploiement « Application Web » (ou localhost en développement). */
  function endpoint(cfg) {
    var url = String((cfg && cfg.API_URL) || "").trim();
    if (/^https:\/\/script\.google\.com\/(?:a\/[^\s/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url)) return url;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s]*$/.test(url)) return url;
    return null;
  }

  function call(fetchImpl, url, init, ms, normalize) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || TIMEOUT_MS) : null;
    if (ctrl) init.signal = ctrl.signal;
    init.credentials = "omit";
    init.cache = "no-store";
    init.referrerPolicy = "no-referrer";
    init.mode = "cors";
    /* Google répond par une redirection vers script.googleusercontent.com, qu'il faut suivre. */
    init.redirect = "follow";
    return Promise.resolve(fetchImpl(url, init))
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { j = null; }
          if (r.status === 200) return normalize(j) || { kind: "unavailable" };
          /* Déploiement supprimé ou adresse erronée : Google répond 404. */
          if (r.status === 404) return { kind: "not_configured" };
          if (r.status === 429) return { kind: "rate_limited", retryAfter: 3600 };
          return { kind: "unavailable" };
        });
      })
      .catch(function () { return { kind: "unavailable" }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }

  /**
   * Avis publiés (Statut « Confirmé »). Jamais d'exception :
   *   ok (reviews, stats) | not_configured | unavailable
   * @param {{config:object, fetch:Function, timeout?:number}} opts
   */
  function list(opts) {
    var url = endpoint(opts.config);
    if (!url || typeof opts.fetch !== "function") return Promise.resolve({ kind: "not_configured" });
    var exclude = opts.config && opts.config.EXCLUDED_REFERENCES;
    return call(opts.fetch, url, { method: "GET" }, opts.timeout, function (j) { return normalizeList(j, exclude); });
  }

  /**
   * Envoi d'un avis (il arrive dans la feuille avec le Statut « En attente »). Jamais d'exception :
   *   ok (reference) | invalid (fields) | rate_limited (retryAfter) | not_configured | unavailable
   * @param {{config:object, review:object, website?:string, fetch:Function, timeout?:number}} opts
   */
  function submit(opts) {
    var url = endpoint(opts.config);
    if (!url || typeof opts.fetch !== "function") return Promise.resolve({ kind: "not_configured" });
    var r = opts.review || {};
    var body = {
      first_name: r.first_name || "", last_name: r.last_name || "", email: r.email || "", company: r.company || "",
      rating: r.rating, title: r.title || "", comment: r.comment || "", consent: r.consent === true,
      website: opts.website || ""
    };
    /* « text/plain » = requête « simple » : pas de pré-vérification CORS (que les scripts Google ne gèrent pas). */
    return call(opts.fetch, url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) },
      opts.timeout, normalizeSubmit);
  }

  var api = {
    endpoint: endpoint,
    normalizeReview: normalizeReview,
    normalizeList: normalizeList,
    normalizeSubmit: normalizeSubmit,
    list: list,
    submit: submit
  };
  root.WisyAvisCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
