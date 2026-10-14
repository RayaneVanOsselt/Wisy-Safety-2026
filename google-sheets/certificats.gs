/**
 * @OnlyCurrentDoc
 *
 * =========================================================================
 * WISY SAFETY — Registre des certificats dans Google Sheets (script Apps Script)
 * -------------------------------------------------------------------------
 * À COLLER dans la feuille Google Sheets : Extensions › Apps Script › (tout remplacer) › Enregistrer.
 * Guide pas à pas : docs/README-CERTIFICATS.md (dépôt du site).
 *
 * Ce que fait ce script :
 *   - il répond à la page « Vérification des certificats » du site (déploiement « Application Web ») :
 *     nom de famille + date de naissance → certificats correspondants, correspondance EXACTE ;
 *   - il ne renvoie QUE : titulaire, formation, numéro, dates, statut. Jamais la date de naissance, jamais les
 *     colonnes internes (entreprise, e-mail, téléphone, notes…), jamais une liste de personnes ;
 *   - il limite les essais (par nom recherché et au total) pour empêcher de deviner une date de naissance ;
 *   - il ajoute un menu « Wisy Safety » dans la feuille : préparer la feuille, vérifier les données, tester une recherche.
 *
 * @OnlyCurrentDoc : le script n'a accès qu'à CETTE feuille (aucun autre fichier de votre Google Drive).
 * La feuille elle-même doit rester PRIVÉE (partage « Accès limité ») : le site ne la lit jamais directement.
 * =========================================================================
 */

var CONFIG = {
  SHEET_NAME: "Certificats",          // nom de l'onglet qui contient le registre
  TIMEZONE: "Europe/Brussels",
  PER_NAME_PER_HOUR: 10,              // recherches par nom de famille et par heure (empêche d'essayer toutes les dates)
  GLOBAL_PER_HOUR: 500,               // recherches par heure, tous visiteurs confondus
  GLOBAL_PER_6_HOURS: 1500,           // recherches par tranche de 6 heures, tous visiteurs confondus
  MAX_RESULTS: 20
};

/* Colonnes du modèle (créées par « Préparer la feuille ») : [champ, en-tête, note affichée sur l'en-tête, largeur]. */
var TEMPLATE = [
  ["certificate_number", "Numéro de certificat", "Imprimé sur le certificat. Unique.", 170],
  ["last_name", "Nom", "Nom de famille, tel qu'écrit sur le certificat. Obligatoire.", 170],
  ["first_name", "Prénom", "", 150],
  ["other_last_names", "Autres noms", "Facultatif : nom d'usage, de naissance… séparés par « ; ». La personne est aussi trouvée avec ces noms. Jamais affiché sur le site.", 150],
  ["birth_date", "Date de naissance", "JJ/MM/AAAA. Jamais affichée sur le site. Sans elle, le certificat est introuvable en ligne.", 140],
  ["training", "Formation", "Intitulé de la formation. Obligatoire.", 260],
  ["training_date", "Date de formation", "JJ/MM/AAAA", 140],
  ["issue_date", "Date de délivrance", "JJ/MM/AAAA, seulement si elle diffère de la date de formation.", 140],
  ["expiry_date", "Valable jusqu'au", "Dernier jour de validité, JJ/MM/AAAA. Vide = « validité à confirmer » sur le site.", 140],
  ["revoked", "Statut", "Actif = certificat normal. Annulé = le site affiche « Annulé », quelle que soit la date.", 110]
];
/* Colonne calculée par la feuille (formule), jamais lue par le site. */
var VALIDITY_HEADER = "Validité (automatique)";
var STATUS_ACTIVE = "Actif", STATUS_CANCELLED = "Annulé";

/* En-têtes reconnus (après normalisation : minuscules, sans accents, sans parenthèses, « _ » comme séparateur).
   Les colonnes internes ne sont volontairement PAS reconnues : la vérification ne les lit jamais. */
var ALIASES = {
  certificate_number: ["numero_de_certificat", "numero_certificat", "n_de_certificat", "n_certificat", "no_certificat", "num_certificat", "numero", "n", "no", "numero_de_diplome", "numero_diplome", "n_de_diplome", "n_diplome", "diploma_number", "certificate_number", "certificate_no", "certificaatnummer"],
  last_name: ["nom", "nom_de_famille", "nom_famille", "last_name", "lastname", "surname", "family_name", "achternaam", "nachname"],
  first_name: ["prenom", "first_name", "firstname", "given_name", "voornaam", "vorname"],
  other_last_names: ["autres_noms", "autres_noms_de_famille", "autre_nom", "nom_d_usage", "nom_de_naissance", "other_last_names", "other_names"],
  birth_date: ["date_de_naissance", "date_naissance", "naissance", "ne_le", "nee_le", "birth_date", "birthdate", "date_of_birth", "dob", "geboortedatum", "geburtsdatum"],
  training: ["formation", "formation_suivie", "intitule", "intitule_formation", "training", "course", "opleiding", "schulung"],
  training_date: ["date_de_formation", "date_formation", "date_examen", "date_d_examen", "training_date", "exam_date", "opleidingsdatum"],
  issue_date: ["date_de_delivrance", "date_delivrance", "delivre_le", "date_emission", "issue_date", "issued_on"],
  expiry_date: ["valable_jusqu_au", "valide_jusqu_au", "date_expiration", "date_d_expiration", "expiration", "date_de_validite", "date_validite", "fin_de_validite", "expiry_date", "expiration_date", "valid_until", "geldig_tot"],
  revoked: ["statut", "statut_du_certificat", "etat_du_certificat", "revoque", "revoquee", "revocation", "annule", "revoked", "status"]
};
var HEADER_MAP = {};
Object.keys(ALIASES).forEach(function (f) { ALIASES[f].forEach(function (a) { HEADER_MAP[a] = f; }); });
var REQUIRED_HEADERS = ["last_name", "birth_date", "training"];
var STATUS_LABEL = { valid: "Valide", expired: "Expiré", revoked: "Annulé", undetermined: "Validité à confirmer" };

/* ======================================================================= utilitaires */

function now_() { return new Date(); }

function pad_(n) { return (n < 10 ? "0" : "") + n; }

function normalizeHeader_(h) {
  return String(h == null ? "" : h)
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[°º]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Clé de recherche d'un nom : « Van-Össelt », « VAN OSSELT », « van osselt » → « vanosselt ». */
function nameKey_(s) {
  return String(s == null ? "" : s)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/þ/g, "th")
    .replace(/[øØ]/g, "o").replace(/[łŁ]/g, "l").replace(/[đĐðÐ]/g, "d").replace(/ı/g, "i").replace(/[ħĦ]/g, "h").replace(/[ŧŦ]/g, "t")
    .replace(/[\s'’‘ʼ`´.,_‐‑‒–—-]+/g, "");
}

function isRealDate_(y, m, d, noUpperBound) {
  if (y < 1900 || (!noUpperBound && y > 2200) || m < 1 || m > 12 || d < 1) return false;
  var dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Valeur d'une cellule → « AAAA-MM-JJ ». Cellule date de Google Sheets, texte JJ/MM/AAAA (« / », « - », « . »),
 * AAAA-MM-JJ, ou numéro de série. Jamais d'année sur deux chiffres (ambiguë).
 * @returns {string|null} "" = vide, null = date illisible ou impossible
 */
function cellDate_(v, tz) {
  if (v === "" || v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    if (isNaN(v.getTime())) return null;
    return Utilities.formatDate(v, tz || CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  var s = String(v).trim(), p, y, m, d;
  if (!s) return "";
  if ((p = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) { y = +p[1]; m = +p[2]; d = +p[3]; }
  else if ((p = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
  else if (typeof v === "number" || /^\d{4,5}$/.test(s)) {
    var n = Number(s);
    if (!(n >= 1 && n < 120000)) return null;
    var dt = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else return null;
  return isRealDate_(y, m, d) ? y + "-" + pad_(m) + "-" + pad_(d) : null;
}

/** Statut d'une cellule → annulé ? « Actif » / « Annulé » (ou l'ancien « non » / « oui »). @returns {boolean|null} null = incompréhensible */
function cellBool_(v) {
  if (v === true) return true;
  if (v === false || v === "" || v == null) return false;
  var s = normalizeHeader_(v);
  if (["actif", "active", "valide", "valid", "en_cours", "non", "no", "nee", "nein", "n", "false", "faux", "0"].indexOf(s) >= 0) return false;
  if (["annule", "annulee", "cancelled", "canceled", "revoque", "revoquee", "revoked", "retire", "oui", "yes", "ja", "y", "o", "true", "vrai", "1", "x"].indexOf(s) >= 0) return true;
  return null;
}

function clean_(v) { return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(); }

function todayIso_() { return Utilities.formatDate(now_(), CONFIG.TIMEZONE, "yyyy-MM-dd"); }

function statusOf_(rec, today) {
  if (rec.revoked) return "revoked";
  if (!rec.expiry_date) return "undetermined";
  return rec.expiry_date >= today ? "valid" : "expired";
}

function hex_(bytes) {
  return bytes.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? "0" + h : h; }).join("");
}

/* ======================================================================= lecture du registre */

/**
 * Lit l'onglet du registre. Les colonnes internes ne sont JAMAIS lues (seules les colonnes reconnues ci-dessus le sont).
 * @returns {{ok:boolean, code?:string, rows:Array, problems:Array}}
 */
function readRegistry_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return { ok: false, code: "sheet_missing", rows: [], problems: ["L'onglet « " + CONFIG.SHEET_NAME + " » est introuvable."] };
  var tz = ss.getSpreadsheetTimeZone ? ss.getSpreadsheetTimeZone() : CONFIG.TIMEZONE;
  var values = sheet.getDataRange().getValues();
  if (!values.length) return { ok: false, code: "headers_missing", rows: [], problems: ["La feuille est vide : utilisez le menu Wisy Safety › Préparer la feuille."] };
  var col = {};
  values[0].forEach(function (h, i) { var f = HEADER_MAP[normalizeHeader_(h)]; if (f && col[f] === undefined) col[f] = i; });
  var missing = REQUIRED_HEADERS.filter(function (f) { return col[f] === undefined; });
  if (missing.length) return { ok: false, code: "headers_missing", rows: [], problems: ["Colonnes introuvables : " + missing.join(", ") + " (en-têtes attendus : « Nom », « Date de naissance », « Formation »)."] };
  var get = function (row, f) { return col[f] === undefined ? "" : row[col[f]]; };
  var rows = [], problems = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r], line = r + 1;
    if (row.every(function (c) { return c === "" || c == null; })) continue;
    var rec = {
      line: line,
      certificate_number: clean_(get(row, "certificate_number")).toUpperCase(),
      last_name: clean_(get(row, "last_name")),
      first_name: clean_(get(row, "first_name")),
      other_last_names: clean_(get(row, "other_last_names")),
      training: clean_(get(row, "training")),
      birth_date: cellDate_(get(row, "birth_date"), tz),
      training_date: cellDate_(get(row, "training_date"), tz),
      issue_date: cellDate_(get(row, "issue_date"), tz),
      expiry_date: cellDate_(get(row, "expiry_date"), tz),
      revoked: cellBool_(get(row, "revoked"))
    };
    var bad = [];
    if (!rec.last_name) bad.push("nom manquant");
    if (!rec.training) bad.push("formation manquante");
    ["birth_date", "training_date", "issue_date", "expiry_date"].forEach(function (f) { if (rec[f] === null) bad.push("date illisible ou impossible (« " + clean_(get(row, f)).slice(0, 20) + " »)"); });
    if (rec.revoked === null) bad.push("le statut doit valoir « Actif » ou « Annulé »");
    if (bad.length) { problems.push("Ligne " + line + " : " + bad.join(", ") + " — ligne ignorée par la vérification."); continue; }
    if (!rec.birth_date) problems.push("Ligne " + line + " : sans date de naissance, ce certificat ne peut pas être trouvé en ligne.");
    if (rec.expiry_date && rec.training_date && rec.expiry_date < rec.training_date) problems.push("Ligne " + line + " : la fin de validité est antérieure à la date de formation.");
    var keys = [], add = function (k, minLen) { k = nameKey_(k); if (k && k.length >= (minLen || 1) && keys.indexOf(k) < 0) keys.push(k); };
    add(rec.last_name);
    add(rec.last_name + " " + rec.first_name);
    add(rec.first_name + " " + rec.last_name);
    rec.other_last_names.split(/\s*[;,]\s*/).forEach(function (n) { add(n); });
    /* Nom en plusieurs mots (nom composé, ou « Nom Prénom » saisi en entier dans la colonne Nom) : chaque suite de mots
       consécutifs suffit (« El Hammouchi », « Hammouchi »…), ainsi que le prénom placé devant (« Ibrahim El Hammouchi »).
       Jamais un fragment de moins de 3 lettres (« El », « C »…). La date de naissance reste toujours exigée. */
    var words = rec.last_name.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      for (var wi = 0; wi < words.length; wi++) for (var wj = wi + 1; wj <= words.length; wj++) add(words.slice(wi, wj).join(" "), 3);
      for (var wr = 1; wr < words.length; wr++) add(words.slice(wr).concat(words.slice(0, wr)).join(" "));
    }
    rec.keys = keys;
    rows.push(rec);
  }
  var seen = {};
  rows.forEach(function (rec) {
    if (!rec.certificate_number) return;
    if (seen[rec.certificate_number]) problems.push("Ligne " + rec.line + " : le numéro « " + rec.certificate_number + " » est déjà utilisé à la ligne " + seen[rec.certificate_number] + ".");
    else seen[rec.certificate_number] = rec.line;
  });
  return { ok: true, rows: rows, problems: problems };
}

/* ======================================================================= vérification publique */

var NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’‘ʼ\-‐‑.]*$/u;

function validateInput_(lastName, birthDate, today) {
  var fields = {};
  var name = clean_(lastName);
  if (!name) fields.lastName = "required";
  else if (Array.from(name).length > 80) fields.lastName = "too_long";
  else if (!NAME_RE.test(name) || !nameKey_(name)) fields.lastName = "invalid";
  var raw = clean_(birthDate);
  if (!raw) fields.birthDate = "required";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) fields.birthDate = "format";
  else {
    var p = raw.split("-");
    if (+p[0] < 1900) fields.birthDate = "too_old";
    else if (!isRealDate_(+p[0], +p[1], +p[2], true)) fields.birthDate = "invalid";
    else if (raw > today) fields.birthDate = "future";
  }
  return { fields: fields, name: name, birth: raw };
}

/** Limites d'essais. Renvoie le nombre de secondes à attendre (0 = autorisé). Compte la recherche si elle est autorisée. */
function rateLimit_(key) {
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  var locked = false;
  try { locked = lock.tryLock(5000); } catch (e) { locked = false; }
  try {
    /* Fenêtres fixes (le cache Google garde une valeur 6 heures au plus). */
    var t = now_().getTime(), hour = Math.floor(t / 3600000), quarter = Math.floor(t / 21600000);
    var untilHour = Math.ceil(((hour + 1) * 3600000 - t) / 1000), untilQuarter = Math.ceil(((quarter + 1) * 21600000 - t) / 1000);
    var counters = [
      { k: "g:h:" + hour, limit: CONFIG.GLOBAL_PER_HOUR, ttl: untilHour + 60, retry: untilHour },
      { k: "g:q:" + quarter, limit: CONFIG.GLOBAL_PER_6_HOURS, ttl: Math.min(21600, untilQuarter + 60), retry: untilQuarter }
    ];
    if (key) counters.push({ k: "n:" + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8)).slice(0, 40) + ":" + hour, limit: CONFIG.PER_NAME_PER_HOUR, ttl: untilHour + 60, retry: untilHour });
    var values = cache.getAll(counters.map(function (c) { return c.k; })) || {};
    for (var i = 0; i < counters.length; i++) {
      if (Number(values[counters[i].k] || 0) >= counters[i].limit) return Math.max(60, counters[i].retry);
    }
    counters.forEach(function (c) { cache.put(c.k, String(Number(values[c.k] || 0) + 1), Math.min(21600, Math.max(60, c.ttl))); });
    return 0;
  } finally {
    if (locked) lock.releaseLock();
  }
}

/**
 * Cœur de la vérification (aussi utilisé par « Tester une recherche » du menu, sans limite).
 * @returns {Object} { status: found | not_found | invalid | rate_limited | not_configured, … }
 */
function verify_(lastName, birthDate, opts) {
  opts = opts || {};
  var today = todayIso_();
  var meta = { checkedAt: now_().toISOString(), today: today, timezone: CONFIG.TIMEZONE };
  var input = validateInput_(lastName, birthDate, today);
  var key = input.fields.lastName ? "" : nameKey_(input.name);
  if (!opts.skipLimits) {
    var wait = rateLimit_(key);
    if (wait > 0) return { status: "rate_limited", retryAfter: wait };
  }
  if (Object.keys(input.fields).length) return { status: "invalid", fields: input.fields };
  var reg = readRegistry_();
  if (!reg.ok) return { status: "not_configured" };
  var found = reg.rows.filter(function (rec) { return rec.birth_date === input.birth && rec.keys.indexOf(key) >= 0; })
    .sort(function (a, b) { var x = a.issue_date || a.training_date || "", y = b.issue_date || b.training_date || ""; return x < y ? 1 : x > y ? -1 : 0; })
    .slice(0, CONFIG.MAX_RESULTS)
    .map(function (rec) {
      return {
        holder: (rec.first_name ? rec.first_name + " " : "") + rec.last_name,
        training: rec.training,
        certificateNumber: rec.certificate_number || null,
        trainingDate: rec.training_date || null,
        issueDate: rec.issue_date || null,
        expiryDate: rec.expiry_date || null,
        status: statusOf_(rec, today)
      };
    });
  if (!found.length) return { status: "not_found", checkedAt: meta.checkedAt, today: meta.today, timezone: meta.timezone };
  return { status: "found", checkedAt: meta.checkedAt, today: meta.today, timezone: meta.timezone, certificates: found };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Appel du site : POST { lastName, birthDate (AAAA-MM-JJ) }. */
function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}") || {}; } catch (err) { body = {}; }
    if (typeof body !== "object") body = {};
    return json_(verify_(String(body.lastName || "").slice(0, 200), String(body.birthDate || "").slice(0, 20)));
  } catch (err) {
    return json_({ status: "error" });
  }
}

/** Ouvrir l'adresse du déploiement dans un navigateur affiche ceci : le service répond (aucune donnée). */
function doGet() {
  return json_({ service: "wisy-certificats", status: "ok" });
}

/* ======================================================================= menu de la feuille */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Wisy Safety")
    .addItem("Préparer / mettre en forme la feuille", "installer")
    .addItem("Vérifier les données", "verifierLesDonnees")
    .addItem("Tester une recherche", "testerUneRecherche")
    .addToUi();
}

/** Lettre de colonne (1 → A, 27 → AA). */
function colLetter_(n) { var s = ""; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/**
 * Crée l'onglet « Certificats » ou met à jour celui qui existe, SANS jamais effacer de données :
 *   - retire les anciennes colonnes « (interne) » si elles sont vides (sinon : les laisse et le signale) ;
 *   - remplace l'ancienne colonne « Révoqué » (oui / non) par « Statut » (Actif / Annulé) ;
 *   - ajoute la colonne « Validité (automatique) » (formule) et une mise en forme professionnelle.
 */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  try { ss.setSpreadsheetLocale("fr_BE"); } catch (e) { /* réglage facultatif */ }
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME, 0);
  var notes = [];

  var width = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, width).getValues()[0];
  if (header.every(function (h) { return String(h).trim() === ""; })) {
    sheet.getRange(1, 1, 1, TEMPLATE.length).setValues([TEMPLATE.map(function (c) { return c[1]; })]);
    width = TEMPLATE.length;
  }

  /* Anciennes colonnes internes et ancienne colonne calculée : retirées si vides (de droite à gauche). */
  var lastRow = Math.max(sheet.getLastRow(), 1);
  header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var c = header.length; c >= 1; c--) {
    var raw = String(header[c - 1]), key = normalizeHeader_(raw);
    var internal = /\(interne\)/i.test(raw) || ["entreprise", "e_mail", "email", "telephone", "notes"].indexOf(key) >= 0;
    var calculated = raw.trim() === VALIDITY_HEADER;
    if (!internal && !calculated) continue;
    var hasData = !calculated && lastRow > 1 && sheet.getRange(2, c, lastRow - 1, 1).getValues().some(function (r) { return String(r[0]).trim() !== ""; });
    if (hasData) notes.push("La colonne « " + raw + " » contient des données : elle a été conservée (le site ne la lit jamais).");
    else sheet.deleteColumn(c);
  }

  /* « Révoqué » (oui / non) → « Statut » (Actif / Annulé), valeurs converties. */
  header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = {};
  header.forEach(function (h, i) { var f = HEADER_MAP[normalizeHeader_(h)]; if (f && col[f] === undefined) col[f] = i + 1; });
  if (col.revoked === undefined) {
    sheet.insertColumnAfter(Math.max(sheet.getLastColumn(), 1));
    col.revoked = sheet.getLastColumn() + 1;
    sheet.getRange(1, col.revoked).setValue("Statut");
  } else if (String(header[col.revoked - 1]).trim() !== "Statut") {
    sheet.getRange(1, col.revoked).setValue("Statut");
  }
  sheet.getDataRange().clearDataValidations();
  if (lastRow > 1) {
    var names = sheet.getRange(2, col.last_name || 2, lastRow - 1, 1).getValues();
    var statusRange = sheet.getRange(2, col.revoked, lastRow - 1, 1);
    var status = statusRange.getValues().map(function (r, i) {
      if (!String(names[i][0]).trim()) return [r[0]];
      var b = cellBool_(r[0]);
      return [b === null ? r[0] : (b ? STATUS_CANCELLED : STATUS_ACTIVE)];
    });
    statusRange.setValues(status);
  }

  /* Colonne calculée « Validité (automatique) » : même règle que le site (+ « Expire bientôt » à 90 jours). */
  var n = sheet.getLastColumn() + 1;
  if (sheet.getMaxColumns() < n) sheet.insertColumnAfter(sheet.getMaxColumns());
  var L = function (f) { return colLetter_(col[f]); };
  var name = L("last_name") + "2:" + L("last_name"), st = L("revoked") + "2:" + L("revoked"), exp = col.expiry_date ? L("expiry_date") + "2:" + L("expiry_date") : null;
  var expiryPart = exp
    ? 'IF(' + exp + '="","À confirmer",IF(ISNUMBER(' + exp + '),IF(' + exp + '<TODAY(),"Expiré",IF(' + exp + '<TODAY()+90,"Expire bientôt","Valide")),"Date à vérifier"))'
    : '"À confirmer"';
  sheet.getRange(1, n).setFormula('={"' + VALIDITY_HEADER + '";ARRAYFORMULA(IF(' + name + '="","",IF(REGEXMATCH(LOWER(' + st + '&""),"annul|revoq|révoq|^oui$"),"Annulé",' + expiryPart + ')))}');
  sheet.getRange(1, n).setNote("Colonne calculée automatiquement à partir du statut et de « Valable jusqu'au » : ne rien saisir ici. Le site applique la même règle.");

  /* Mise en forme. */
  header = sheet.getRange(1, 1, 1, n).getValues()[0];
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Math.min(col.last_name || 2, 3));
  sheet.setTabColor("#1F6F64");
  sheet.setRowHeight(1, 44);
  var all = sheet.getRange(1, 1, rows + 1, n);
  all.setFontFamily("Inter").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(1, 1, 1, n).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#16302A").setWrap(true).setHorizontalAlignment("left");
  sheet.getRange(1, n).setBackground("#1F6F64");
  sheet.getBandings().forEach(function (b) { b.remove(); });
  all.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false).setHeaderRowColor("#16302A").setFirstRowColor("#FFFFFF").setSecondRowColor("#F4FAF9");
  header.forEach(function (h, i) {
    var f = HEADER_MAP[normalizeHeader_(h)], t = TEMPLATE.filter(function (x) { return x[0] === f; })[0];
    var range = sheet.getRange(2, i + 1, rows, 1);
    if (t && t[2]) sheet.getRange(1, i + 1).setNote(t[2]);
    if (t) sheet.setColumnWidth(i + 1, t[3]);
    if (["birth_date", "training_date", "issue_date", "expiry_date"].indexOf(f) >= 0) {
      range.setNumberFormat("dd/mm/yyyy").setHorizontalAlignment("center");
      range.setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText("Date au format JJ/MM/AAAA, par exemple 27/03/1985.").build());
    } else if (f === "revoked") {
      range.setHorizontalAlignment("center").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([STATUS_ACTIVE, STATUS_CANCELLED], true).setAllowInvalid(false).setHelpText("Actif ou Annulé.").build());
    } else if (f === "certificate_number") {
      range.setNumberFormat("@").setFontFamily("Roboto Mono");
    } else if (f === "last_name") {
      range.setFontWeight("bold");
    }
  });
  sheet.getRange(2, n, rows, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.setColumnWidth(n, 150);

  /* Couleurs de la colonne « Validité (automatique) ». */
  var vr = sheet.getRange(2, n, rows, 1);
  var rule = function (text, bg, fg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([vr]).build(); };
  var others = sheet.getConditionalFormatRules().filter(function (r) { return !r.getRanges().some(function (g) { return g.getColumn() === n; }); });
  sheet.setConditionalFormatRules(others.concat([
    rule("Valide", "#DCF5EE", "#1F6F64"),
    rule("Expire bientôt", "#FFF1D6", "#8A5A00"),
    rule("Expiré", "#FDE7D2", "#9A4A00"),
    rule("Annulé", "#FBE1E4", "#B4233A"),
    rule("À confirmer", "#E6ECFB", "#3552A8"),
    rule("Date à vérifier", "#FBE1E4", "#B4233A")
  ]));

  /* Filtre (tri et recherche par colonne) et en-tête protégé contre les modifications accidentelles. */
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), n).createFilter();
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === "En-têtes du registre") p.remove(); });
  sheet.getRange(1, 1, 1, n).protect().setDescription("En-têtes du registre").setWarningOnly(true);

  try {
    SpreadsheetApp.getUi().alert("Feuille prête",
      "L'onglet « " + CONFIG.SHEET_NAME + " » est prêt : une ligne par certificat.\n\n" +
      "• Statut : « Actif » ou « Annulé ».\n• Validité (automatique) : calculée par la feuille, en couleur (ne rien y saisir).\n• Filtres : cliquez sur l'icône des en-têtes pour trier ou chercher." +
      (notes.length ? "\n\n" + notes.join("\n") : "") +
      "\n\nSi vous venez de mettre le script à jour : dans Apps Script, Déployer › Gérer les déploiements › crayon › Nouvelle version.",
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    console.log("Feuille prête. " + notes.join(" "));
  }
}

/** Contrôle la feuille : colonnes, dates, doublons, lignes introuvables en ligne. */
function verifierLesDonnees() {
  var reg = readRegistry_();
  var ui = SpreadsheetApp.getUi();
  if (!reg.ok) { ui.alert("Vérification des données", reg.problems.join("\n"), ui.ButtonSet.OK); return; }
  var today = todayIso_(), count = { valid: 0, expired: 0, revoked: 0, undetermined: 0 };
  reg.rows.forEach(function (r) { count[statusOf_(r, today)]++; });
  var msg = reg.rows.length + " certificat(s) utilisable(s) par la vérification en ligne : " + count.valid + " valide(s), " + count.expired +
    " expiré(s), " + count.revoked + " annulé(s), " + count.undetermined + " à confirmer.";
  if (!reg.problems.length) msg += "\n\nAucun problème détecté.";
  else msg += "\n\n" + reg.problems.length + " point(s) à corriger :\n" + reg.problems.slice(0, 40).join("\n") + (reg.problems.length > 40 ? "\n…" : "");
  ui.alert("Vérification des données", msg, ui.ButtonSet.OK);
}

/** Fait une recherche comme le site (sans compter dans les limites) et montre ce que le public verrait. */
function testerUneRecherche() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt("Tester une recherche", "Nom de famille :", ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt("Tester une recherche", "Date de naissance (JJ/MM/AAAA) :", ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  var iso = cellDate_(b.getResponseText(), CONFIG.TIMEZONE);
  var res = verify_(a.getResponseText(), iso || "x", { skipLimits: true });
  var text;
  if (res.status === "found") {
    text = res.certificates.map(function (c) {
      return c.holder + " — " + c.training + "\nN° " + (c.certificateNumber || "non précisé") + " · " + STATUS_LABEL[c.status] +
        (c.expiryDate ? " · valable jusqu'au " + c.expiryDate.split("-").reverse().join("/") : "");
    }).join("\n\n");
  } else if (res.status === "not_found") text = "Aucun certificat trouvé pour ce nom et cette date de naissance.";
  else if (res.status === "invalid") text = "Saisie invalide : " + JSON.stringify(res.fields);
  else text = "Le registre n'est pas prêt : utilisez « Préparer la feuille » puis « Vérifier les données ».";
  ui.alert("Ce que verrait le public", text, ui.ButtonSet.OK);
}
