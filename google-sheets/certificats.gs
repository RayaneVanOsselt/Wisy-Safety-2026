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
 *   - il ne renvoie QUE : titulaire, formation, langue, numéro, dates, statut. Jamais la date de naissance, jamais
 *     une autre colonne de la feuille, jamais une liste de personnes ;
 *   - il limite les essais (par nom recherché et au total) pour empêcher de deviner une date de naissance ;
 *   - il ajoute un menu « Wisy Safety » dans la feuille : préparer la feuille (mise en page + corrections : accents
 *     abîmés, numéros au format NA-EL-001, date de délivrance, langue), vérifier les données, tester une recherche.
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
  ["certificate_number", "Numéro de certificat", "Imprimé sur le certificat. Unique. Format : NA-EL-001 (groupes séparés par des tirets, 3 chiffres à la fin) — « Préparer la feuille » corrige les numéros mal écrits.", 160],
  ["last_name", "Nom", "Nom et prénom, tels qu'écrits sur le certificat (ex. « Dupont Marie »). La personne est retrouvée par son nom de famille, son nom complet ou prénom + nom. Obligatoire.", 230],
  ["birth_date", "Date de naissance", "JJ/MM/AAAA. Jamais affichée sur le site. Sans elle, le certificat est introuvable en ligne.", 130],
  ["training", "Formation", "Intitulé de la formation. Obligatoire.", 210],
  ["language", "Langue", "Langue dans laquelle la formation a été donnée. Vide = Français.", 110],
  ["training_date", "Date de formation", "JJ/MM/AAAA", 130],
  ["issue_date", "Date de délivrance", "JJ/MM/AAAA. Vide = même date que la formation (« Préparer la feuille » la recopie).", 130],
  ["expiry_date", "Valable jusqu'au", "Dernier jour de validité, JJ/MM/AAAA. Couleur : vert = valide, orange = expire dans les 90 jours, rouge = expiré. Vide = « validité à confirmer » sur le site.", 130],
  ["revoked", "Statut", "Actif = certificat normal. Annulé = le site affiche « Annulé », quelle que soit la date.", 100]
];
/* Ancienne colonne calculée (formule), retirée par « Préparer la feuille » : la couleur de « Valable jusqu'au » la remplace. */
var VALIDITY_HEADER = "Validité (automatique)";
var STATUS_ACTIVE = "Actif", STATUS_CANCELLED = "Annulé";
var DEFAULT_LANGUAGE = "Français";
var LANGUAGES = ["Français", "Néerlandais", "Anglais", "Allemand"];

/* En-têtes reconnus (après normalisation : minuscules, sans accents, sans parenthèses, « _ » comme séparateur).
   Les colonnes internes ne sont volontairement PAS reconnues : la vérification ne les lit jamais. */
var ALIASES = {
  certificate_number: ["numero_de_certificat", "numero_certificat", "n_de_certificat", "n_certificat", "no_certificat", "num_certificat", "numero", "n", "no", "numero_de_diplome", "numero_diplome", "n_de_diplome", "n_diplome", "diploma_number", "certificate_number", "certificate_no", "certificaatnummer"],
  last_name: ["nom", "nom_de_famille", "nom_famille", "last_name", "lastname", "surname", "family_name", "achternaam", "nachname"],
  first_name: ["prenom", "first_name", "firstname", "given_name", "voornaam", "vorname"],
  other_last_names: ["autres_noms", "autres_noms_de_famille", "autre_nom", "nom_d_usage", "nom_de_naissance", "other_last_names", "other_names"],
  birth_date: ["date_de_naissance", "date_naissance", "naissance", "ne_le", "nee_le", "birth_date", "birthdate", "date_of_birth", "dob", "geboortedatum", "geburtsdatum"],
  training: ["formation", "formation_suivie", "intitule", "intitule_formation", "training", "course", "opleiding", "schulung"],
  language: ["langue", "langue_de_la_formation", "langue_formation", "language", "taal", "sprache"],
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

/* Accents abîmés par un copier-coller ou un import dans le mauvais encodage : « √© » (Mac) ou « Ã© » (Windows) au lieu
   de « é ». Caractères des octets 0x80 à 0xFF dans ces deux encodages. */
var MOJIBAKE_TABLES = [
  "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"
];

/** Octets UTF-8 → texte ; null si la suite n'est pas de l'UTF-8 valide. */
function utf8Decode_(bytes) {
  var out = "", i = 0;
  while (i < bytes.length) {
    var b = bytes[i], n, cp;
    if (b < 0x80) { n = 0; cp = b; }
    else if (b >= 0xC2 && b <= 0xDF) { n = 1; cp = b & 0x1F; }
    else if (b >= 0xE0 && b <= 0xEF) { n = 2; cp = b & 0x0F; }
    else if (b >= 0xF0 && b <= 0xF4) { n = 3; cp = b & 0x07; }
    else return null;
    for (var k = 1; k <= n; k++) {
      var c = bytes[i + k];
      if (c === undefined || (c & 0xC0) !== 0x80) return null;
      cp = cp * 64 + (c & 0x3F);
    }
    if ((n === 2 && cp < 0x800) || (n === 3 && (cp < 0x10000 || cp > 0x10FFFF)) || (cp >= 0xD800 && cp <= 0xDFFF)) return null;
    out += String.fromCodePoint(cp);
    i += n + 1;
  }
  return out;
}

/**
 * « Nacelle √©l√©vatrice » → « Nacelle élévatrice ». Un texte correct n'est jamais modifié (il n'est pas de l'UTF-8 relu
 * de travers). Plusieurs lectures possibles : on garde celle qui donne le texte le plus naturel (accents recomposés,
 * aucun accent isolé, aucun caractère de contrôle). Les accents « décomposés » (lettre + accent séparé, fréquents sur
 * Mac) sont recomposés (NFC).
 */
function fixMojibake_(v) {
  var s = String(v == null ? "" : v);
  if (!/[^\u0000-\u007F]/.test(s)) return s;
  var best = null, bestMarks = Infinity;
  for (var t = 0; t < MOJIBAKE_TABLES.length; t++) {
    var bytes = [], ok = true;
    for (var i = 0; i < s.length && ok; i++) {
      var code = s.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else { var k = MOJIBAKE_TABLES[t].indexOf(s.charAt(i)); if (k < 0) ok = false; else bytes.push(0x80 + k); }
    }
    var out = ok ? utf8Decode_(bytes) : null;
    if (!out || out === s || /\p{C}/u.test(out) || /(^|[^\p{L}\p{M}])\p{M}/u.test(out)) continue;
    out = out.normalize("NFC");
    var marks = (out.match(/\p{M}/gu) || []).length;
    if (marks < bestMarks) { best = out; bestMarks = marks; }
  }
  return best || s;
}

/* Numéro de certificat au format du modèle : « NA-EL-002 » (groupes de lettres, tirets, 3 chiffres au moins à la fin). */
var CERT_NUMBER_RE = /^[A-Z]{2,}(?:-[A-Z]{2,})*-\d{3,}$/;

/** « na-el012 », « NA-EL_015 », « NA-ELE-001 », « VCA_001 » → « NA-EL-012 », « NA-EL-015 », « NA-EL-001 », « VCA-001 ». */
function normalizeCertNumber_(v) {
  var s = clean_(v).toUpperCase();
  if (!s) return "";
  s = s.replace(/[\s_.\/\\‐‑‒–—]+/g, "-")
    .replace(/([A-Z])(?=\d)/g, "$1-").replace(/(\d)(?=[A-Z])/g, "$1-")
    .replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "")
    .replace(/^NA-?ELE?(?=-|$)/, "NA-EL");
  return s.replace(/-(\d{1,2})$/, function (m, d) { return "-" + ("00" + d).slice(-3); });
}

/** Ordre chronologique : date la plus ancienne d'abord, sans date à la fin ; à date égale, par numéro. */
function compareByDate_(da, db, na, nb) {
  if (da !== db) { if (!da) return 1; if (!db) return -1; return da < db ? -1 : 1; }
  na = String(na || ""); nb = String(nb || "");
  return na < nb ? -1 : na > nb ? 1 : 0;
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
    var text = function (f) { return clean_(fixMojibake_(get(row, f))); };
    var rawNumber = clean_(get(row, "certificate_number")).toUpperCase();
    var rec = {
      line: line,
      certificate_number: normalizeCertNumber_(fixMojibake_(rawNumber)),
      last_name: text("last_name"),
      first_name: text("first_name"),
      other_last_names: text("other_last_names"),
      training: text("training"),
      language: col.language === undefined ? "" : (text("language") || DEFAULT_LANGUAGE),
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
    if (rec.certificate_number && !CERT_NUMBER_RE.test(rec.certificate_number)) problems.push("Ligne " + line + " : numéro « " + rec.certificate_number + " » au format inhabituel (modèle : NA-EL-001).");
    else if (rec.certificate_number && rec.certificate_number !== rawNumber) problems.push("Ligne " + line + " : numéro écrit « " + rawNumber + " », affiché « " + rec.certificate_number + " » sur le site — « Préparer la feuille » corrige la cellule.");
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
    .sort(function (a, b) { return compareByDate_(a.training_date || a.issue_date, b.training_date || b.issue_date, a.certificate_number, b.certificate_number); })
    .slice(0, CONFIG.MAX_RESULTS)
    .map(function (rec) {
      return {
        holder: (rec.first_name ? rec.first_name + " " : "") + rec.last_name,
        training: rec.training,
        language: rec.language || null,
        certificateNumber: rec.certificate_number || null,
        trainingDate: rec.training_date || null,
        issueDate: rec.issue_date || rec.training_date || null,
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
 * Crée l'onglet « Certificats » ou met à jour celui qui existe. Peut être relancé autant de fois que nécessaire.
 *   1. Mise en page : Numéro · Nom · Date de naissance · Formation · Langue · Date de formation · Date de délivrance ·
 *      Valable jusqu'au · Statut. Le « Prénom » éventuel est ajouté au « Nom » (« Nom Prénom »), puis retiré ; les
 *      colonnes inutiles (« Autres noms » vide, anciennes colonnes « (interne) », ancienne « Validité (automatique) »,
 *      colonnes vides) sont retirées. Une colonne inconnue qui contient des données est conservée et signalée.
 *   2. Corrections : accents abîmés (« √© » → « é »), numéros au format NA-EL-001, date de délivrance vide = date de
 *      formation, langue vide = Français, statut vide = Actif ; lignes triées par date de formation (plus anciennes
 *      en haut).
 *   3. Mise en forme : en-tête, bandes, filtres, formats de date, listes, couleurs de validité.
 */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  try { ss.setSpreadsheetLocale("fr_BE"); } catch (e) { /* réglage facultatif */ }
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME, 0);
  var done = [], kept = [];

  var headerOf = function () { return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]; };
  var mapOf = function (h) { var m = {}; h.forEach(function (x, i) { var f = HEADER_MAP[normalizeHeader_(x)]; if (f && m[f] === undefined) m[f] = i + 1; }); return m; };
  var dataRows = function () { return Math.max(sheet.getLastRow(), 1) - 1; };
  var hasData = function (c) { var n = dataRows(); return n > 0 && sheet.getRange(2, c, n, 1).getValues().some(function (r) { return String(r[0]).trim() !== ""; }); };

  if (headerOf().every(function (h) { return String(h).trim() === ""; })) {
    sheet.getRange(1, 1, 1, TEMPLATE.length).setValues([TEMPLATE.map(function (t) { return t[1]; })]);
  }

  /* 1a. « Prénom » ajouté au « Nom » (même écriture que les certificats repris de WordPress : « Nom Prénom »). */
  var col = mapOf(headerOf());
  if (col.first_name !== undefined && col.last_name !== undefined && dataRows() > 0) {
    var lastRange = sheet.getRange(2, col.last_name, dataRows(), 1), firsts = sheet.getRange(2, col.first_name, dataRows(), 1).getValues();
    var merged = 0;
    var lasts = lastRange.getValues().map(function (r, i) {
      var last = clean_(r[0]), first = clean_(firsts[i][0]);
      if (!first) return [r[0]];
      var words = last.split(" ").map(nameKey_);
      if (first.split(" ").every(function (w) { return words.indexOf(nameKey_(w)) >= 0; })) return [r[0]];
      merged++;
      return [last ? last + " " + first : first];
    });
    if (merged) { lastRange.setValues(lasts); done.push(merged + " prénom(s) ajouté(s) au nom (colonne « Nom » = « Nom Prénom »)"); }
  }

  /* 1b. Colonnes inutiles retirées, de droite à gauche. */
  var header = headerOf(), removed = [];
  for (var c = header.length; c >= 1; c--) {
    var raw = clean_(header[c - 1]), f = HEADER_MAP[normalizeHeader_(raw)], remove;
    if (raw === VALIDITY_HEADER || normalizeHeader_(raw) === "validite" || /\(interne\)/i.test(raw) || f === "first_name") remove = true;
    else if (f === "other_last_names") remove = !hasData(c);
    else if (f) remove = false;
    else remove = !hasData(c);
    if (remove) { sheet.deleteColumn(c); if (raw) removed.unshift("« " + raw + " »"); }
    else if (f === "other_last_names") kept.push("« " + raw + " » contient des noms utilisés pour la recherche : colonne conservée.");
    else if (!f) kept.push("« " + (raw || "colonne " + colLetter_(c)) + " » contient des données : colonne conservée (le site ne la lit jamais). Supprimez-la vous-même si elle ne sert plus.");
  }
  if (removed.length) done.push("colonnes retirées : " + removed.join(", "));

  /* 1c. Colonnes du modèle manquantes ajoutées à leur place ; l'ancienne « Révoqué » devient « Statut ». */
  col = mapOf(headerOf());
  TEMPLATE.forEach(function (t, i) {
    if (col[t[0]] !== undefined) return;
    var prev = 0;
    for (var k = i - 1; k >= 0 && !prev; k--) if (col[TEMPLATE[k][0]] !== undefined) prev = col[TEMPLATE[k][0]];
    if (prev) sheet.insertColumnAfter(prev); else sheet.insertColumnBefore(1);
    sheet.getRange(1, prev + 1).setValue(t[1]);
    done.push("colonne « " + t[1] + " » ajoutée");
    col = mapOf(headerOf());
  });
  if (clean_(sheet.getRange(1, col.revoked).getValue()) !== "Statut") sheet.getRange(1, col.revoked).setValue("Statut");

  /* 2. Corrections des données (seules les lignes avec un nom ; seules les colonnes du modèle sont réécrites). */
  sheet.getDataRange().clearDataValidations();
  var n = dataRows();
  if (n > 0) {
    var width = sheet.getLastColumn(), data = sheet.getRange(2, 1, n, width).getValues();
    var at = function (f) { return col[f] === undefined ? -1 : col[f] - 1; };
    var count = { text: 0, number: 0, issue: 0, language: 0, status: 0 };
    data.forEach(function (row) {
      if (!clean_(row[at("last_name")])) return;
      ["certificate_number", "last_name", "other_last_names", "training", "language", "revoked"].forEach(function (f) {
        var i = at(f);
        if (i < 0 || typeof row[i] !== "string") return;
        var v = fixMojibake_(row[i]);
        if (v !== row[i]) { row[i] = v; count.text++; }
      });
      var i = at("certificate_number");
      if (i >= 0 && clean_(row[i])) { var num = normalizeCertNumber_(row[i]); if (num !== String(row[i])) { row[i] = num; count.number++; } }
      var iss = at("issue_date"), tr = at("training_date");
      if (iss >= 0 && tr >= 0 && String(row[iss]).trim() === "" && String(row[tr]).trim() !== "") { row[iss] = row[tr]; count.issue++; }
      var lg = at("language");
      if (lg >= 0 && String(row[lg]).trim() === "") { row[lg] = DEFAULT_LANGUAGE; count.language++; }
      var st = at("revoked"), b = cellBool_(row[st]);
      if (b !== null && row[st] !== (b ? STATUS_CANCELLED : STATUS_ACTIVE)) { row[st] = b ? STATUS_CANCELLED : STATUS_ACTIVE; count.status++; }
    });
    ["certificate_number", "last_name", "other_last_names", "training", "language", "issue_date", "revoked"].forEach(function (f) {
      var i = at(f);
      if (i >= 0) sheet.getRange(2, i + 1, n, 1).setValues(data.map(function (r) { return [r[i]]; }));
    });
    if (count.text) done.push(count.text + " cellule(s) aux accents réparés (« √© » → « é »)");
    if (count.number) done.push(count.number + " numéro(s) de certificat remis au format NA-EL-001");
    if (count.issue) done.push(count.issue + " date(s) de délivrance remplie(s) avec la date de formation");
    if (count.language) done.push(count.language + " langue(s) indiquée(s) : " + DEFAULT_LANGUAGE);
    if (count.status) done.push(count.status + " statut(s) écrit(s) « " + STATUS_ACTIVE + " » ou « " + STATUS_CANCELLED + " »");

    /* Lignes dans l'ordre chronologique : date de formation la plus ancienne en haut, la plus récente en bas. */
    var td = at("training_date"), cn = at("certificate_number");
    var keyOf = function (row) { return [td >= 0 ? cellDate_(row[td], CONFIG.TIMEZONE) || "" : "", cn >= 0 ? clean_(row[cn]) : ""]; };
    var keys = data.filter(function (row) { return row.some(function (c) { return String(c).trim() !== ""; }); }).map(keyOf);
    var sorted = keys.every(function (k, i) { return i === 0 || compareByDate_(keys[i - 1][0], k[0], keys[i - 1][1], k[1]) <= 0; });
    if (td >= 0 && !sorted) {
      var specs = [{ column: td + 1, ascending: true }];
      if (cn >= 0) specs.push({ column: cn + 1, ascending: true });
      sheet.getRange(2, 1, n, width).sort(specs);
      done.push("lignes triées par date de formation : les plus anciennes en haut, les plus récentes en bas");
    }
  }

  /* 3. Mise en forme. Colonnes vides à droite retirées : la feuille s'arrête à la dernière colonne utile. */
  header = headerOf();
  var w = header.length;
  if (sheet.getMaxColumns() > w) sheet.deleteColumns(w + 1, sheet.getMaxColumns() - w);
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Math.min(col.last_name || 2, 2));
  sheet.setTabColor("#1F6F64");
  sheet.setRowHeight(1, 44);
  var all = sheet.getRange(1, 1, rows + 1, w);
  all.setFontFamily("Inter").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(1, 1, 1, w).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#16302A").setWrap(true).setHorizontalAlignment("left");
  sheet.getBandings().forEach(function (b) { b.remove(); });
  all.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false).setHeaderRowColor("#16302A").setFirstRowColor("#FFFFFF").setSecondRowColor("#F4FAF9");
  header.forEach(function (h, i) {
    var f = HEADER_MAP[normalizeHeader_(h)], t = TEMPLATE.filter(function (x) { return x[0] === f; })[0];
    var range = sheet.getRange(2, i + 1, rows, 1);
    if (t) sheet.getRange(1, i + 1).setNote(t[2]);
    if (t) sheet.setColumnWidth(i + 1, t[3]);
    if (["birth_date", "training_date", "issue_date", "expiry_date"].indexOf(f) >= 0) {
      range.setNumberFormat("dd/mm/yyyy").setHorizontalAlignment("center");
      range.setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText("Date au format JJ/MM/AAAA, par exemple 27/03/1985.").build());
    } else if (f === "revoked") {
      range.setHorizontalAlignment("center").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([STATUS_ACTIVE, STATUS_CANCELLED], true).setAllowInvalid(false).setHelpText("Actif ou Annulé.").build());
    } else if (f === "language") {
      range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LANGUAGES, true).setAllowInvalid(true).setHelpText("Langue de la formation (une autre langue peut être tapée).").build());
    } else if (f === "certificate_number") {
      range.setNumberFormat("@").setFontFamily("Roboto Mono");
    } else if (f === "last_name") {
      range.setFontWeight("bold");
    }
  });

  /* Couleurs : « Valable jusqu'au » (vert / orange à 90 jours / rouge) et « Statut » (Annulé en rouge). */
  var exp = sheet.getRange(2, col.expiry_date, rows, 1), stat = sheet.getRange(2, col.revoked, rows, 1), E = "$" + colLetter_(col.expiry_date) + "2";
  var byFormula = function (formula, bg, fg, range) { return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(bg).setFontColor(fg).setRanges([range]).build(); };
  var byText = function (text, bg, fg, range) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([range]).build(); };
  sheet.setConditionalFormatRules([
    byFormula("=AND(ISNUMBER(" + E + ")," + E + "<TODAY())", "#FBE1E4", "#B4233A", exp),
    byFormula("=AND(ISNUMBER(" + E + ")," + E + ">=TODAY()," + E + "<TODAY()+90)", "#FFF1D6", "#8A5A00", exp),
    byFormula("=AND(ISNUMBER(" + E + ")," + E + ">=TODAY()+90)", "#DCF5EE", "#1F6F64", exp),
    byText(STATUS_CANCELLED, "#FBE1E4", "#B4233A", stat),
    byText(STATUS_ACTIVE, "#DCF5EE", "#1F6F64", stat)
  ]);

  /* Filtre (tri et recherche par colonne) et en-tête protégé contre les modifications accidentelles. */
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), w).createFilter();
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === "En-têtes du registre") p.remove(); });
  sheet.getRange(1, 1, 1, w).protect().setDescription("En-têtes du registre").setWarningOnly(true);

  var message = "L'onglet « " + CONFIG.SHEET_NAME + " » est prêt : une ligne par certificat.\n\n" +
    (done.length ? "Modifications :\n• " + done.join("\n• ") + "\n\n" : "Aucune correction nécessaire.\n\n") +
    (kept.length ? kept.join("\n") + "\n\n" : "") +
    "« Valable jusqu'au » en couleur : vert = valide, orange = expire dans les 90 jours, rouge = expiré.\n\n" +
    "Si vous venez de mettre le script à jour : dans Apps Script, Déployer › Gérer les déploiements › crayon › Nouvelle version.";
  try {
    SpreadsheetApp.getUi().alert("Feuille prête", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    console.log(message);
  }
  return { done: done, kept: kept };
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
      return c.holder + " — " + c.training + (c.language ? " (" + c.language + ")" : "") + "\nN° " + (c.certificateNumber || "non précisé") + " · " + STATUS_LABEL[c.status] +
        (c.expiryDate ? " · valable jusqu'au " + c.expiryDate.split("-").reverse().join("/") : "");
    }).join("\n\n");
  } else if (res.status === "not_found") text = "Aucun certificat trouvé pour ce nom et cette date de naissance.";
  else if (res.status === "invalid") text = "Saisie invalide : " + JSON.stringify(res.fields);
  else text = "Le registre n'est pas prêt : utilisez « Préparer la feuille » puis « Vérifier les données ».";
  ui.alert("Ce que verrait le public", text, ui.ButtonSet.OK);
}
