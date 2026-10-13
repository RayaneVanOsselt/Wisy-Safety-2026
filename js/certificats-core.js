/* =========================================================================
   WISY SAFETY — Vérification des certificats : logique SANS interface (testée par tests/certificats.test.js)
   -------------------------------------------------------------------------
   - validation des saisies (mêmes règles que le serveur, qui revalide TOUT de son côté) ;
   - client de l'API « wisy-certificats/v1 » de l'extension WordPress (voir docs/README-CERTIFICATS.md) ;
   - normalisation STRICTE de la réponse : seuls les champs attendus sont conservés.

   Confidentialité : aucune donnée n'est écrite dans le navigateur (ni localStorage, ni sessionStorage,
   ni cookie, ni URL). Le nom et la date partent uniquement dans le CORPS d'une requête POST chiffrée.
   Aucune clé ni aucun secret ici : l'API est publique par nature et protégée côté serveur.
   ========================================================================= */
(function (root) {
  "use strict";

  var NAME_MAX = 80;
  var NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’‘ʼ\-‐‑.]*$/u;
  var STATUSES = ["valid", "expired", "revoked", "undetermined"];
  var REASONS = ["missing", "not_authorized", "revoked"];
  var TIMEOUT_MS = 15000;

  /* ------------------------------------------------------------------ saisies */

  function cleanName(value) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F​-‍﻿]/g, "")
      .replace(/[\s  ]+/g, " ")
      .trim();
  }

  /** @returns {{value:string, error:string}} error : "" | "required" | "too_long" | "invalid" */
  function validateName(value) {
    var v = cleanName(value);
    if (!v) return { value: v, error: "required" };
    if (Array.from(v).length > NAME_MAX) return { value: v, error: "too_long" };
    if (!NAME_RE.test(v)) return { value: v, error: "invalid" };
    return { value: v, error: "" };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isRealDate(y, m, d) {
    if (m < 1 || m > 12 || d < 1) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  /**
   * Date de naissance saisie en JJ/MM/AAAA (séparateurs « / », « . », « - » ou espace acceptés, ainsi
   * qu'une date collée au format AAAA-MM-JJ). Aucune date à deux chiffres pour l'année : ambiguë.
   * @param {string} value
   * @param {string} today  AAAA-MM-JJ
   * @returns {{iso:string, error:string}} error : "" | "required" | "format" | "invalid" | "future" | "too_old"
   */
  function parseBirthDate(value, today) {
    var v = String(value == null ? "" : value).trim();
    if (!v) return { iso: "", error: "required" };
    var y, m, d, p;
    if ((p = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +p[1]; m = +p[2]; d = +p[3]; }
    else if ((p = v.match(/^(\d{1,2})[\/.\-\s](\d{1,2})[\/.\-\s](\d{4})$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
    else if ((p = v.match(/^(\d{2})(\d{2})(\d{4})$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
    else return { iso: "", error: "format" };
    if (!isRealDate(y, m, d)) return { iso: "", error: "invalid" };
    var iso = y + "-" + pad(m) + "-" + pad(d);
    if (y < 1900) return { iso: "", error: "too_old" };
    if (today && iso > today) return { iso: "", error: "future" };
    return { iso: iso, error: "" };
  }

  /** Mise en forme pendant la frappe : « 27031985 » → « 27/03/1985 » (n'altère pas une saisie déjà séparée). */
  function maskBirthInput(value) {
    var v = String(value == null ? "" : value);
    var iso = v.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return pad(+iso[3]) + "/" + pad(+iso[2]) + "/" + iso[1];
    if (/[^\d\/.\-\s]/.test(v)) return v; // caractère inattendu : la validation l'expliquera
    /* Jour (2) / mois (2) / année (4) ; un séparateur tapé clôt le champ en cours (« 1/3/1985 » reste tel quel). */
    var caps = [2, 2, 4], fields = ["", "", ""], idx = 0, groups = v.split(/[\/.\-\s]/);
    for (var g = 0; g < groups.length; g++) {
      for (var k = 0; k < groups[g].length; k++) {
        if (fields[idx].length >= caps[idx]) { if (idx === 2) break; idx++; }
        fields[idx] += groups[g][k];
      }
      if (g < groups.length - 1 && fields[idx] && idx < 2) idx++;
    }
    return fields.slice(0, idx + 1).join("/");
  }

  /** Date du jour à Bruxelles (AAAA-MM-JJ), utilisée seulement pour refuser une date future côté navigateur. */
  function todayBrussels(now) {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now || new Date());
      var get = function (t) { return (parts.filter(function (x) { return x.type === t; })[0] || {}).value; };
      return get("year") + "-" + get("month") + "-" + get("day");
    } catch (e) {
      var d = now || new Date();
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
  }

  /* ------------------------------------------------------------------ réponse de l'API */

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : null; }
  function isoDate(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }

  /** Ne garde QUE les champs attendus ; tout statut inconnu rend la réponse invalide (jamais de « faux valide »). */
  function normalizeCertificate(c) {
    if (!c || typeof c !== "object" || STATUSES.indexOf(c.status) < 0) return null;
    var doc = c.document && typeof c.document === "object" ? c.document : {};
    var available = doc.available === true && typeof doc.token === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(doc.token) && c.status !== "revoked";
    return {
      holder: str(c.holder, 200) || "",
      training: str(c.training, 200) || "",
      diplomaNumber: str(c.diplomaNumber, 80),
      trainingDate: isoDate(c.trainingDate),
      issueDate: isoDate(c.issueDate),
      expiryDate: isoDate(c.expiryDate),
      status: c.status,
      document: available
        ? { available: true, token: doc.token, expiresIn: Math.max(30, Math.min(3600, +doc.expiresIn || 600)) }
        : { available: false, reason: REASONS.indexOf(doc.reason) >= 0 ? doc.reason : "missing" }
    };
  }

  function normalizeResult(json) {
    if (!json || typeof json !== "object") return null;
    var meta = { checkedAt: str(json.checkedAt, 40), today: isoDate(json.today), timezone: str(json.timezone, 60) || "Europe/Brussels" };
    if (json.status === "not_found") return { kind: "not_found", meta: meta };
    if (json.status !== "found" || !Array.isArray(json.certificates) || !json.certificates.length) return null;
    var certs = json.certificates.slice(0, 20).map(normalizeCertificate);
    if (certs.some(function (c) { return !c; })) return null;
    return { kind: "found", meta: meta, certificates: certs };
  }

  /* ------------------------------------------------------------------ client HTTP */

  function apiBase(base) {
    var b = String(base || "").trim().replace(/\/+$/, "");
    return /^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(b) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s]*)?$/.test(b) ? b : "";
  }

  function withTimeout(fetchImpl, url, init, ms) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || TIMEOUT_MS) : null;
    if (ctrl) init.signal = ctrl.signal;
    return Promise.resolve(fetchImpl(url, init)).finally(function () { if (timer) clearTimeout(timer); });
  }

  /** État du service : { state: "ok" | "not_configured" | "unavailable", challenge } */
  function health(opts) {
    var base = apiBase(opts.base);
    if (!base) return Promise.resolve({ state: "not_configured", challenge: null });
    return withTimeout(opts.fetch, base + "/health", { method: "GET", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", mode: "cors" }, opts.timeout || 8000)
      .then(function (r) {
        if (r.status === 404) return { state: "not_configured", challenge: null };
        if (!r.ok) return { state: "unavailable", challenge: null };
        return r.json().then(function (j) {
          var ch = j && j.challenge && j.challenge.provider === "turnstile" && typeof j.challenge.siteKey === "string" ? { provider: "turnstile", siteKey: j.challenge.siteKey.slice(0, 100) } : null;
          return { state: j && j.status === "ok" ? "ok" : "unavailable", challenge: ch };
        });
      })
      .catch(function () { return { state: "unavailable", challenge: null }; });
  }

  /**
   * Vérification. Renvoie toujours un objet { kind, … } — jamais d'exception :
   *   found | not_found | invalid (fields) | rate_limited (retryAfter s) | challenge | not_configured | unavailable
   */
  function verify(opts) {
    var base = apiBase(opts.base);
    if (!base) return Promise.resolve({ kind: "not_configured" });
    var body = new URLSearchParams();
    body.set("lastName", opts.lastName);
    body.set("birthDate", opts.birthDate);
    if (opts.challenge) body.set("challenge", opts.challenge);
    return withTimeout(opts.fetch, base + "/verify", {
      method: "POST",
      /* Requête « simple » (formulaire encodé) : pas de pré-vérification CORS, pas de cookie, rien en cache. */
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString(),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      mode: "cors",
      redirect: "error"
    }, opts.timeout || TIMEOUT_MS)
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { j = null; }
          if (r.status === 200) {
            var res = normalizeResult(j);
            return res || { kind: "unavailable" };
          }
          if (r.status === 400 && j && j.code === "invalid_input") return { kind: "invalid", fields: j.fields && typeof j.fields === "object" ? j.fields : {} };
          if (r.status === 429) return { kind: "rate_limited", retryAfter: Math.max(60, Math.min(86400, +(j && j.retryAfter) || +r.headers.get("Retry-After") || 600)) };
          if (r.status === 403 && j && /^challenge_/.test(j.code || "")) return { kind: "challenge" };
          if (r.status === 404) return { kind: "not_configured" };
          return { kind: "unavailable" };
        });
      })
      .catch(function () { return { kind: "unavailable" }; });
  }

  /* ------------------------------------------------------------------ dates affichées */

  function daysBetween(a, b) {
    var pa = a.split("-"), pb = b.split("-");
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }

  /** Position (0–1) d'aujourd'hui entre le début et la fin de validité, ou null si non calculable. */
  function validityProgress(cert, today) {
    var start = cert.issueDate || cert.trainingDate;
    if (!start || !cert.expiryDate || !today) return null;
    var total = daysBetween(start, cert.expiryDate);
    if (total <= 0) return null;
    var done = daysBetween(start, today);
    return { ratio: Math.max(0, Math.min(1, done / total)), remainingDays: daysBetween(today, cert.expiryDate), start: start };
  }

  /** Durée relative lisible (« dans 9 ans », « il y a 3 mois ») selon la langue, via Intl. */
  function relative(days, lang) {
    var unit = "day", n = days, abs = Math.abs(days);
    if (abs >= 730) { unit = "year"; n = Math.trunc(days / 365.25); }
    else if (abs >= 60) { unit = "month"; n = Math.trunc(days / 30.44); }
    try { return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(n, unit); }
    catch (e) { return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(n, unit); }
  }

  function formatDate(iso, lang) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    try { return new Intl.DateTimeFormat(lang + "-u-nu-latn", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d); }
    catch (e) { return p[2] + "/" + p[1] + "/" + p[0]; }
  }

  function formatStamp(isoDateTime, lang, tz) {
    var d = isoDateTime ? new Date(isoDateTime) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    try {
      return {
        date: new Intl.DateTimeFormat(lang + "-u-nu-latn", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz || "Europe/Brussels" }).format(d),
        time: new Intl.DateTimeFormat(lang + "-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: tz || "Europe/Brussels" }).format(d)
      };
    } catch (e) { return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }; }
  }

  var api = {
    NAME_MAX: NAME_MAX,
    cleanName: cleanName,
    validateName: validateName,
    parseBirthDate: parseBirthDate,
    maskBirthInput: maskBirthInput,
    todayBrussels: todayBrussels,
    normalizeResult: normalizeResult,
    apiBase: apiBase,
    health: health,
    verify: verify,
    validityProgress: validityProgress,
    relative: relative,
    formatDate: formatDate,
    formatStamp: formatStamp
  };
  root.WisyCertificatesCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
