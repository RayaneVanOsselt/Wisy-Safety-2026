"use strict";
/* =========================================================================
   Fausse Google Sheets + faux services Apps Script (SpreadsheetApp, LockService, CacheService, MailApp, UrlFetchApp,
   PropertiesService, ScriptApp, Utilities, ContentService) — pour exécuter un script de google-sheets/ dans Node.

   Utilisé par tests/reservations.test.js (et réutilisable par un petit serveur de démonstration local).
   Aucune dépendance. Le comportement imite Google Sheets là où le script en dépend :
     - une nouvelle feuille a 1 000 lignes et 26 colonnes : lire ou écrire au-delà lève l'erreur de Google
       (« hors des dimensions de la feuille ») — insertRowsAfter / insertColumnsAfter agrandissent la feuille ;
     - une apostrophe initiale force le texte et n'apparaît pas dans la cellule ;
     - getDataRange() = zone jusqu'à la dernière ligne / colonne non vide ;
     - les méthodes de mise en forme (couleurs, largeurs, validations…) ne font rien et se chaînent.
   ========================================================================= */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

/* Objet dont toutes les méthodes inconnues (mise en forme…) ne font rien et se chaînent. */
function chain(real) {
  const p = new Proxy(real || {}, { get: (t, k) => (k in t ? t[k] : typeof k === "symbol" || k === "then" ? undefined : () => p) });
  return p;
}

const store = (x) => (typeof x === "string" && x.charAt(0) === "'" ? x.slice(1) : x);

function fakeSheet(name, grid, env) {
  let cols = Math.max(26, ...(grid || [[]]).map((r) => r.length));
  let maxRows = (env && env.maxRows) || 1000, maxCols = cols;
  const g = (grid || []).map((r) => { const x = r.slice(); while (x.length < cols) x.push(""); return x; });
  const blank = (v) => v === "" || v == null;
  const lastRow = () => { for (let r = g.length; r >= 1; r--) if (g[r - 1].some((v) => !blank(v))) return r; return 0; };
  const lastCol = () => { for (let c = cols; c >= 1; c--) if (g.some((row) => !blank(row[c - 1]))) return c; return 0; };
  let sheet, sheetName = name, active = { row: 2, rows: 1 };
  const ensure = (r, c) => {
    while (g.length < r) g.push(Array(cols).fill(""));
    if (c > cols) { cols = c; g.forEach((row) => { while (row.length < cols) row.push(""); }); }
  };
  const range = (r, c, nr = 1, nc = 1) => {
    if (typeof r === "string") return chain();
    if (r < 1 || c < 1 || nr < 1 || nc < 1 || r - 1 + nr > maxRows || c - 1 + nc > maxCols) {
      throw new Error("Exception: Les coordonnées de la plage sont hors des dimensions de la feuille. (" + sheetName + " : lignes " + r + "–" + (r - 1 + nr) + " / " + maxRows + ", colonnes " + c + "–" + (c - 1 + nc) + " / " + maxCols + ")");
    }
    ensure(r - 1 + nr, c - 1 + nc);
    const self = chain({
      getValues: () => g.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
      getValue: () => g[r - 1][c - 1],
      setValues: (v) => {
        if (v.length !== nr) throw new Error("setValues : " + v.length + " lignes pour une zone de " + nr);
        v.forEach((row, i) => {
          if (row.length !== nc) throw new Error("setValues : " + row.length + " colonnes pour une zone de " + nc);
          row.forEach((x, j) => { g[r - 1 + i][c - 1 + j] = store(x); });
        });
        if (env.onWrite) env.onWrite(sheetName);
        return self;
      },
      setValue: (x) => { g[r - 1][c - 1] = store(x); if (env.onWrite) env.onWrite(sheetName); return self; },
      getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc,
      getSheet: () => sheet,
      activate: () => { active = { row: r, rows: nr }; env.ss._active = sheet; return self; }
    });
    return self;
  };
  sheet = chain({
    grid: g,
    getName: () => sheetName, setName: (n) => { sheetName = n; return sheet; },
    getRange: range,
    getDataRange: () => range(1, 1, Math.max(lastRow(), 1), Math.max(lastCol(), 1)),
    getLastRow: lastRow, getLastColumn: lastCol, getMaxColumns: () => maxCols, getMaxRows: () => maxRows,
    insertRowsAfter: (after, n) => { maxRows += n; return sheet; },
    insertColumnsAfter: (after, n) => { maxCols += n; return sheet; },
    getProtections: () => [], getBandings: () => [],
    getActiveRange: () => range(active.row, 1, active.rows, cols),
    getActiveRangeList: () => ({ getRanges: () => [range(active.row, 1, active.rows, cols)] }),
    select: (row, rows) => { active = { row, rows: rows || 1 }; env.ss._active = sheet; },
    /* lecture pratique pour les tests : objets { en-tête: valeur } */
    records: () => {
      const v = g.slice(0, lastRow()), head = v[0] || [];
      return v.slice(1).filter((row) => row.some((x) => !blank(x))).map((row) => { const o = {}; head.forEach((h, i) => { if (h !== "") o[h] = row[i]; }); return o; });
    }
  });
  return sheet;
}

/* Utilities.formatDate / parseDate (fuseau horaire IANA, motifs simples + texte entre apostrophes). */
function partsIn(d, tz) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const v = (t) => p.find((x) => x.type === t).value;
  return { yyyy: v("year"), MM: v("month"), dd: v("day"), HH: v("hour"), mm: v("minute"), ss: v("second") };
}
function formatDate(d, tz, fmt) {
  const P = partsIn(d, tz);
  let out = "";
  for (let i = 0; i < fmt.length;) {
    if (fmt[i] === "'") { const j = fmt.indexOf("'", i + 1); out += fmt.slice(i + 1, j); i = j + 1; continue; }
    const m = fmt.slice(i).match(/^(yyyy|MM|dd|HH|mm|ss)/);
    if (m) { out += P[m[1]]; i += m[1].length; } else { out += fmt[i]; i++; }
  }
  return out;
}
function offsetAt(t, tz) {
  const P = partsIn(new Date(t), tz);
  return Date.UTC(+P.yyyy, +P.MM - 1, +P.dd, +P.HH, +P.mm, +P.ss) - t;
}
function parseDate(s, tz, fmt) {
  if (fmt !== "yyyy-MM-dd HH:mm") throw new Error("parseDate : motif non géré " + fmt);
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = guess - offsetAt(guess, tz);
  t = guess - offsetAt(t, tz);
  return new Date(t);
}

/**
 * Charge un script Apps Script dans un contexte isolé.
 * @param {string} file  chemin relatif au dépôt (ex. "google-sheets/reservations.gs")
 * @param {object} opts  { now: ISO | () => Date, onLock(), lockFails, http(url, opts) → {code, body}, props:{}, noQuota }
 */
function loadGas(file, opts) {
  opts = opts || {};
  const env = { onWrite: null, maxRows: opts.maxRows };
  const sheets = [];
  const cache = new Map(), props = new Map(Object.entries(opts.props || {}));
  const mails = [], alerts = [], toasts = [], http = [], triggers = [];
  let fileName = "Feuille de calcul sans titre", flushes = 0, locks = 0;
  const ss = chain({
    _active: null,
    getSheetByName: (n) => sheets.find((s) => s.getName() === n) || null,
    getSheets: () => sheets,
    insertSheet: (n) => { const s = fakeSheet(n, [[]], env); sheets.push(s); return s; },
    deleteSheet: (s) => { const i = sheets.indexOf(s); if (i >= 0) sheets.splice(i, 1); },
    getName: () => fileName, rename: (n) => { fileName = n; },
    getActiveSheet: () => ss._active || sheets[0],
    setActiveSheet: (s) => { ss._active = s; return s; },
    toast: (m) => { toasts.push(m); }
  });
  env.ss = ss;
  const answers = opts.answers || [];
  const ui = chain({
    alert: (...a) => { alerts.push(a.filter((x) => typeof x === "string").join(" | ")); return answers.length ? answers.shift() : "OK"; },
    prompt: () => { const v = answers.length ? answers.shift() : ""; return { getSelectedButton: () => "OK", getResponseText: () => v }; },
    ButtonSet: { OK: "OK", YES_NO: "YES_NO", OK_CANCEL: "OK_CANCEL" }, Button: { YES: "YES", NO: "NO", OK: "OK", CANCEL: "CANCEL" }
  });
  const nowFn = () => (typeof opts.now === "function" ? opts.now() : new Date(opts.now || "2026-10-15T08:00:00Z"));
  const ctx = {
    SpreadsheetApp: chain({ getActiveSpreadsheet: () => ss, getUi: () => ui, flush: () => { flushes++; }, ProtectionType: { RANGE: "RANGE", SHEET: "SHEET" } }),
    CacheService: { getScriptCache: () => ({
      get: (k) => (cache.has(k) ? cache.get(k) : null),
      getAll: (keys) => { const o = {}; keys.forEach((k) => { if (cache.has(k)) o[k] = cache.get(k); }); return o; },
      put: (k, v, ttl) => { if (!(ttl >= 1 && ttl <= 21600)) throw new Error("durée de cache Google : de 1 s à 6 h (" + ttl + ")"); cache.set(k, v); },
      remove: (k) => { cache.delete(k); } }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { if (opts.lockFails) return false; locks++; if (opts.onLock) opts.onLock(api); return true; },
      releaseLock: () => {} }) },
    MailApp: { getRemainingDailyQuota: () => (opts.noQuota ? 0 : 100), sendEmail: (o) => { if (opts.mailFails) throw new Error("service e-mail indisponible"); mails.push(o); } },
    UrlFetchApp: { fetch: (url, o) => {
      http.push({ url, o });
      const r = opts.http ? opts.http(url, o) : { code: 404, body: "" };
      return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === "string" ? r.body : JSON.stringify(r.body)) };
    } },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props.has(k) ? props.get(k) : null),
      setProperties: (o) => { Object.keys(o).forEach((k) => props.set(k, o[k])); },
      setProperty: (k, v) => props.set(k, v) }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (fn) => { const tr = { fn, getHandlerFunction: () => fn }; const b = chain({ create: () => { triggers.push(tr); return tr; } }); return b; }
    },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: {
      formatDate, parseDate,
      computeDigest: (alg, v) => Array.from(crypto.createHash("sha256").update(String(v)).digest()).map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" }
    },
    console: { log: () => {} },
    Date, JSON, Math
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8"), ctx, { filename: file });
  ctx.__now = nowFn;
  vm.runInContext("now_ = function () { return __now(); };", ctx);
  const api = {
    ctx, ss, sheets, cache, props, mails, alerts, toasts, http, triggers, env,
    sheet: (n) => ss.getSheetByName(n),
    get: (params) => JSON.parse(ctx.doGet({ parameter: params || {} }).text),
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }).text),
    stats: () => ({ flushes, locks })
  };
  return api;
}

module.exports = { loadGas, fakeSheet, chain, formatDate, parseDate };
