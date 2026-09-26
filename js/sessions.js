/* =========================================================================
   WISY SAFETY — Sessions de formation (SOURCE UNIQUE des dates)
   -------------------------------------------------------------------------
   Une session = une date où une formation est réellement organisée. Ce module lit LA liste des sessions
   (jamais écrite dans le HTML), la valide, la trie et la met à disposition de :

     • la page VCA Base          (section « Disponibilités »)        js/formation-vca.js
     • la page Agenda            (liste des sessions ouvertes)        js/agenda.js
     • le parcours d'inscription (?formation=…&session=…)             js/registration.js
     • l'assistant Wisy          (« Quelles sont les prochaines disponibilités ? »)
     • la recherche du site      (résultat « Prochaines sessions »)

   D'OÙ VIENNENT LES SESSIONS (une seule source active à la fois, choisie dans js/supabase-config.js) :
     "data"      (défaut)  js/sessions-data.js — un fichier que le propriétaire édite ; vide = aucune session.
     "supabase"  (option)  table `training_sessions` (voir supabase/sessions.sql) : une ligne ajoutée dans
                           Supabase apparaît sur le site SANS modifier le code. Si la table est injoignable,
                           le site retombe sur js/sessions-data.js (jamais de page cassée).

   VÉRACITÉ — règle absolue : aucune date n'est inventée. Liste vide = « consultez les disponibilités ».
   Une session mal formée est REJETÉE (et signalée par `rejected`), jamais « corrigée » en silence.

   Module « dual-mode » (navigateur : window.WisySessions ; Node : require) — aucune dépendance, aucun build.
   Le module ne touche JAMAIS au DOM : l'affichage est fait par les pages.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisySessions = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var TZ = "Europe/Brussels";
  var STATUSES = ["open", "full", "cancelled"];
  var ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
  var TRAINING_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
  var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  /* Adresse d'inscription : uniquement une page interne du site (jamais une URL fournie par les données). */
  var SIGNUP_RE = /^inscription\.html\?[A-Za-z0-9_=&.%-]{1,200}$/;
  var LOCALE_MAP = { fr: "fr-BE", nl: "nl-BE", en: "en-BE", de: "de-BE", af: "af-ZA", ar: "ar-MA", bg: "bg-BG", ro: "ro-RO", it: "it-IT", sl: "sl-SI" };

  /* ------------------------------------------------------------------ validation */
  function isRealDate(y, m, d) {
    var t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }
  function isInt(n, min, max) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n && n >= min && (max == null || n <= max); }
  function cleanTime(v) {
    if (v == null || v === "") return null;
    var s = String(v).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) s = s.slice(0, 5);        // « 09:00:00 » (colonne `time` de Postgres)
    return s;
  }

  /* Raisons pour lesquelles une session brute est refusée ([] = valide). */
  function validate(raw) {
    var why = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["session absente ou illisible"];
    if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) why.push("id : minuscules, chiffres et tirets (3 à 64 caractères)");
    if (typeof raw.training !== "string" || !TRAINING_RE.test(raw.training)) why.push("training : identifiant de formation du site (ex. vca-base)");
    var m = typeof raw.date === "string" ? DATE_RE.exec(raw.date) : null;
    if (!m || !isRealDate(+m[1], +m[2], +m[3])) why.push("date : format AAAA-MM-JJ, jour réel du calendrier");
    var st = cleanTime(raw.startTime), et = cleanTime(raw.endTime);
    if (st != null && !TIME_RE.test(st)) why.push("startTime : format HH:MM");
    if (et != null && !TIME_RE.test(et)) why.push("endTime : format HH:MM");
    if (st != null && et != null && TIME_RE.test(st) && TIME_RE.test(et) && et <= st) why.push("endTime doit être après startTime");
    if (et != null && st == null) why.push("endTime sans startTime");
    if (raw.language != null && raw.language !== "" && !/^[a-z]{2}$/.test(String(raw.language))) why.push("language : code à 2 lettres (fr, nl, en…)");
    if (raw.location != null && (typeof raw.location !== "string" || raw.location.length > 160)) why.push("location : texte de 160 caractères maximum");
    if (raw.capacity != null && !isInt(raw.capacity, 1, 500)) why.push("capacity : entier de 1 à 500");
    if (raw.seatsLeft != null && !isInt(raw.seatsLeft, 0, raw.capacity != null && isInt(raw.capacity, 1, 500) ? raw.capacity : 500)) why.push("seatsLeft : entier de 0 à capacity");
    if (raw.status != null && STATUSES.indexOf(raw.status) < 0) why.push("status : open, full ou cancelled");
    if (raw.priceCents != null && !isInt(raw.priceCents, 0, 10000000)) why.push("priceCents : entier en centimes");
    if (raw.signupUrl != null && raw.signupUrl !== "" && !SIGNUP_RE.test(String(raw.signupUrl))) why.push("signupUrl : uniquement une adresse « inscription.html?… » du site");
    return why;
  }

  /* Session propre (champs connus uniquement) ou null si invalide. */
  function normalize(raw) {
    if (validate(raw).length) return null;
    var st = cleanTime(raw.startTime), et = cleanTime(raw.endTime);
    var seatsLeft = raw.seatsLeft != null ? raw.seatsLeft : null;
    var status = raw.status || "open";
    if (status === "open" && seatsLeft === 0) status = "full";      // plus de place : la session est complète
    return {
      id: raw.id, training: raw.training, date: raw.date,
      startTime: st, endTime: et,
      language: raw.language ? String(raw.language) : null,
      location: raw.location ? String(raw.location).trim() : null,
      capacity: raw.capacity != null ? raw.capacity : null,
      seatsLeft: seatsLeft,
      status: status,
      priceCents: raw.priceCents != null ? raw.priceCents : null,
      signupUrl: raw.signupUrl ? String(raw.signupUrl) : null,
      startsAt: raw.date + "T" + (st || "00:00")
    };
  }

  /* Liste brute → { sessions (valides, sans doublon d'id, triées), rejected: [{ index, id, reasons }] } */
  function normalizeAll(list) {
    var sessions = [], rejected = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (raw, index) {
      var reasons = validate(raw);
      if (!reasons.length && seen[raw.id]) reasons = ["id déjà utilisé par une autre session"];
      if (reasons.length) { rejected.push({ index: index, id: raw && raw.id ? String(raw.id) : null, reasons: reasons }); return; }
      seen[raw.id] = true;
      sessions.push(normalize(raw));
    });
    sessions.sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : (a.id < b.id ? -1 : 1); });
    return { sessions: sessions, rejected: rejected };
  }

  /* ------------------------------------------------------------------ temps (toujours à l'heure de Bruxelles) */
  function partsIn(now) {
    var f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    var o = {};
    f.formatToParts(now || new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { date: o.year + "-" + o.month + "-" + o.day, time: o.hour + ":" + o.minute };
  }
  function todayISO(now) { return partsIn(now).date; }

  /* À venir = aujourd'hui (tant que la session n'est pas finie) ou plus tard. Une session annulée n'est jamais « à venir ». */
  function isUpcoming(s, now) {
    var n = partsIn(now);
    if (s.date > n.date) return true;
    if (s.date < n.date) return false;
    return s.endTime ? n.time < s.endTime : true;
  }
  /* Inscription possible : à venir, ouverte, avec des places. */
  function isBookable(s, now) {
    return s.status === "open" && (s.seatsLeft == null || s.seatsLeft > 0) && isUpcoming(s, now);
  }
  function upcoming(list, now) {
    return list.filter(function (s) { return s.status !== "cancelled" && isUpcoming(s, now); });
  }
  function forTraining(list, trainingId, now) {
    return upcoming(list, now).filter(function (s) { return s.training === trainingId; });
  }
  function nextFor(list, trainingId, now) {
    var l = forTraining(list, trainingId, now).filter(function (s) { return isBookable(s, now); });
    return l.length ? l[0] : null;
  }

  /* Lien d'inscription : `session` transmis TEL QUEL au parcours (formation + session, jamais de date recopiée). */
  function signupUrl(s, siteTrainingId) {
    if (s.signupUrl) return s.signupUrl;
    return "inscription.html?formation=" + encodeURIComponent(siteTrainingId || s.training) + "&session=" + encodeURIComponent(s.id);
  }

  /* ------------------------------------------------------------------ affichage (Intl, langue du site) */
  function localeOf(lang) { return LOCALE_MAP[lang] || "fr-BE"; }
  function cap(s, lang) { return lang === "fr" || lang === "en" ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function langName(code, lang) {
    try {
      var n = new Intl.DisplayNames([localeOf(lang)], { type: "language" }).of(code);
      if (n) return cap(n, lang);
    } catch (e) { /* Intl.DisplayNames indisponible */ }
    return String(code).toUpperCase();
  }
  /* { weekday, day, month, year, dateLong, dateShort, time, language } — dates formatées en UTC à midi :
     aucun décalage de fuseau possible sur un jour civil. */
  function format(s, lang) {
    var m = DATE_RE.exec(s.date), d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    var loc = localeOf(lang);
    function f(opts) { opts.timeZone = "UTC"; return new Intl.DateTimeFormat(loc, opts).format(d); }
    return {
      weekday: cap(f({ weekday: "long" }), lang),
      day: f({ day: "numeric" }),
      month: f({ month: "short" }),
      year: f({ year: "numeric" }),
      dateLong: cap(f({ weekday: "long", day: "numeric", month: "long", year: "numeric" }), lang),
      dateShort: f({ day: "numeric", month: "short", year: "numeric" }),
      time: s.startTime ? (s.endTime ? s.startTime + " – " + s.endTime : s.startTime) : "",
      language: s.language ? langName(s.language, lang) : ""
    };
  }

  /* ------------------------------------------------------------------ chargement */
  /* Ligne de la table Supabase `training_sessions` (snake_case) → session brute. */
  function fromRow(r) {
    return {
      id: r.id, training: r.training, date: r.session_date,
      startTime: r.start_time, endTime: r.end_time, language: r.language, location: r.location,
      capacity: r.capacity, seatsLeft: r.seats_left, status: r.status, priceCents: r.price_cents, signupUrl: r.signup_url
    };
  }

  var cache = null, pending = null;
  var TIMEOUT_MS = 5000;

  /* Une session refusée est signalée (console.warn) pour que le propriétaire corrige sa saisie — jamais d'erreur bloquante. */
  function report(result, source) {
    if (result.rejected.length && typeof console !== "undefined" && console.warn) {
      result.rejected.forEach(function (r) { console.warn("[Wisy sessions · " + source + "] session ignorée" + (r.id ? " (" + r.id + ")" : " n°" + (r.index + 1)) + " : " + r.reasons.join(" ; ")); });
    }
    return result;
  }
  function fromDataFile(env) {
    var d = env.data;
    return report(normalizeAll(d && d.sessions), "sessions-data.js");
  }
  function fromSupabase(cfg, env) {
    var url = String(cfg.SUPABASE_URL).replace(/\/+$/, "") + "/rest/v1/training_sessions?select=*&published=eq.true&order=session_date.asc&limit=200";
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return env.fetch(url, { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY }, signal: ctl ? ctl.signal : undefined })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) throw new Error("réponse inattendue");
        return report(normalizeAll(rows.map(fromRow)), "supabase");
      });
  }

  /* load() → Promise<{ sessions, rejected, source }> — mis en cache pour la durée de la page ; jamais rejetée.
     `opts.env` ({ config, data, fetch }) sert aux tests ; `opts.force` ignore le cache. */
  function load(opts) {
    opts = opts || {};
    if (cache && !opts.force) return Promise.resolve(cache);
    if (pending && !opts.force) return pending;
    var e = opts.env || {};
    var env = { config: e.config || root.WISY_CONFIG || {}, data: e.data || root.WISY_SESSIONS, fetch: e.fetch || root.fetch };
    var cfg = env.config;
    var wantsSupabase = cfg.SESSIONS_SOURCE === "supabase" && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && typeof env.fetch === "function";
    var p = (wantsSupabase ? fromSupabase(cfg, env).then(function (r) { r.source = "supabase"; return r; }) : Promise.reject(new Error("data")))
      .catch(function () { var r = fromDataFile(env); r.source = "data"; return r; })
      .then(function (r) { cache = r; pending = null; return r; });
    pending = p;
    return p;
  }
  function peek() { return cache ? cache.sessions.slice() : []; }
  function reset() { cache = null; pending = null; }

  return {
    TZ: TZ, STATUSES: STATUSES,
    validate: validate, normalize: normalize, normalizeAll: normalizeAll,
    todayISO: todayISO, isUpcoming: isUpcoming, isBookable: isBookable,
    upcoming: upcoming, forTraining: forTraining, nextFor: nextFor,
    signupUrl: signupUrl, format: format, langName: langName,
    load: load, peek: peek, reset: reset
  };
});
