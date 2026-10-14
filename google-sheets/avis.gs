/**
 * @OnlyCurrentDoc
 *
 * =========================================================================
 * WISY SAFETY — Avis clients dans Google Sheets (script Apps Script)
 * -------------------------------------------------------------------------
 * À COLLER dans la feuille Google Sheets « Avis - Wisy Safety » : Extensions › Apps Script › (tout remplacer) › Enregistrer.
 * Guide pas à pas : docs/README-AVIS.md (dépôt du site).
 *
 * Le principe (même système que la feuille d'avis Rufix Barber) :
 *   - un visiteur envoie un avis depuis la page « Avis » du site → une ligne s'ajoute dans l'onglet « Avis »,
 *     Statut « En attente » (rien n'est publié) et vous recevez un e-mail ;
 *   - vous passez le Statut à « Confirmé » → l'avis apparaît sur le site (« Publié le » se remplit tout seul) ;
 *   - « Refusé » (ou « En attente ») → l'avis n'apparaît jamais sur le site.
 *
 * Ce que le site reçoit : SEULEMENT les avis « Confirmé » — prénom, nom, société / fonction, note, titre, avis, date.
 * Jamais l'e-mail, jamais un avis en attente ou refusé, jamais une autre colonne.
 *
 * @OnlyCurrentDoc : le script n'a accès qu'à CETTE feuille (aucun autre fichier de votre Google Drive).
 * La feuille elle-même doit rester PRIVÉE (partage « Accès limité ») : le site ne la lit jamais directement.
 * =========================================================================
 */

var CONFIG = {
  SHEET_NAME: "Avis",                     // onglet des avis (une ligne par avis)
  DASHBOARD_NAME: "Tableau de bord",      // onglet de synthèse (formules, recalculé automatiquement)
  FILE_NAME: "Avis - Wisy Safety",
  TIMEZONE: "Europe/Brussels",
  NOTIFY_EMAIL: "info@wisysafety.be",     // e-mail prévenu à chaque nouvel avis ("" = aucun e-mail)
  SITE_URL: "https://rayanevanosselt.github.io/Wisy-Safety-2026/avis.html",
  PER_EMAIL_PER_HOUR: 3,                  // avis par adresse e-mail et par heure (annoncé dans la politique de confidentialité)
  GLOBAL_PER_HOUR: 30,                    // avis par heure, tous visiteurs confondus (protection contre les robots)
  GLOBAL_PER_6_HOURS: 100,                // avis par tranche de 6 heures, tous visiteurs confondus
  MAX_PUBLISHED: 60,                      // avis les plus récents envoyés au site
  CACHE_SECONDS: 300                      // la liste publiée est gardée 5 min ; toute modification de la feuille la renouvelle
};

var STATUS_PUBLISHED = "Confirmé", STATUS_PENDING = "En attente", STATUS_REFUSED = "Refusé";
var STATUSES = [STATUS_PUBLISHED, STATUS_PENDING, STATUS_REFUSED];
var STATUS_HELP = {};
STATUS_HELP[STATUS_PUBLISHED] = "publié sur le site";
STATUS_HELP[STATUS_PENDING] = "attendre validation (invisible sur le site)";
STATUS_HELP[STATUS_REFUSED] = "jamais publié (gardé pour l'historique)";

/* Colonnes du modèle (créées par « Préparer la feuille ») : [champ, en-tête, note affichée sur l'en-tête, largeur]. */
var TEMPLATE = [
  ["received_at", "Reçu le", "Date et heure d'envoi depuis le site. Rempli automatiquement.", 140],
  ["status", "Statut", "Confirmé = publié sur le site. En attente = attendre validation (invisible sur le site). Refusé = jamais publié.", 120],
  ["rating", "Note", "Note de 1 à 5 étoiles.", 80],
  ["first_name", "Prénom", "Publié sur le site.", 120],
  ["last_name", "Nom", "Nom ou initiale, publié sur le site s'il est rempli.", 120],
  ["company", "Société / fonction", "Publié sur le site s'il est rempli.", 190],
  ["title", "Titre", "Publié sur le site s'il est rempli.", 210],
  ["comment", "Avis", "Texte de l'avis, publié sur le site. Vous pouvez corriger une faute de frappe avant de confirmer.", 380],
  ["email", "E-mail (jamais publié)", "Adresse de la personne : jamais envoyée au site. Sert à lui répondre si besoin.", 220],
  ["published_on", "Publié le", "Date affichée sur le site. Remplie automatiquement au passage à « Confirmé » ; modifiable (JJ/MM/AAAA).", 110],
  ["reference", "Référence", "Référence donnée à la personne après l'envoi (WS-AAAA-XXXXX). Remplie automatiquement.", 130]
];

/* En-têtes reconnus (après normalisation : minuscules, sans accents, sans parenthèses, « _ » comme séparateur). */
var ALIASES = {
  received_at: ["recu_le", "horodatage", "date_de_reception", "date_reception", "envoye_le", "received_at", "timestamp", "created_at"],
  status: ["statut", "etat", "status", "moderation"],
  rating: ["note", "etoiles", "nombre_d_etoiles", "rating", "stars"],
  first_name: ["prenom", "first_name", "firstname", "voornaam", "vorname"],
  last_name: ["nom", "nom_ou_initiale", "nom_de_famille", "last_name", "lastname", "achternaam", "nachname"],
  company: ["societe_fonction", "societe", "entreprise", "fonction", "societe_ou_fonction", "company", "bedrijf"],
  title: ["titre", "titre_de_l_avis", "title"],
  comment: ["avis", "commentaire", "texte", "message", "votre_avis", "comment", "review"],
  email: ["e_mail", "email", "mail", "adresse_e_mail", "courriel"],
  published_on: ["publie_le", "date_de_publication", "date_publication", "date", "date_affichee", "published_on", "approved_at"],
  reference: ["reference", "ref", "numero", "n_de_reference", "reference_du_dossier"]
};
var HEADER_MAP = {};
Object.keys(ALIASES).forEach(function (f) { ALIASES[f].forEach(function (a) { HEADER_MAP[a] = f; }); });
var USER_TEXT = ["first_name", "last_name", "company", "title", "comment", "email"];
var LIMITS = { first_name: 80, last_name: 80, company: 120, title: 120, comment: 2000, email: 160 };

/* ======================================================================= utilitaires */

function now_() { return new Date(); }

function normalizeHeader_(h) {
  return String(h == null ? "" : h)
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Texte nettoyé : caractères de contrôle retirés, espaces regroupés (les retours à la ligne de l'avis sont gardés). */
function clean_(v, keepLines) {
  var s = String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‍﻿]/g, " ");
  if (!keepLines) return s.replace(/\s+/g, " ").trim();
  return s.split("\n").map(function (l) { return l.replace(/[ \t]+/g, " ").trim(); }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Statut d'une cellule → "published" | "pending" | "refused" | null (incompréhensible). Vide = en attente. */
function statusOf_(v) {
  var s = normalizeHeader_(v);
  if (!s) return "pending";
  if (["confirme", "confirmee", "publie", "publiee", "approuve", "approuvee", "valide", "validee", "en_ligne", "oui", "published", "approved"].indexOf(s) >= 0) return "published";
  if (["en_attente", "attente", "a_valider", "a_verifier", "nouveau", "pending"].indexOf(s) >= 0) return "pending";
  if (["refuse", "refusee", "rejete", "rejetee", "masque", "masquee", "non", "supprime", "refused", "rejected", "hidden"].indexOf(s) >= 0) return "refused";
  return null;
}

/** Note d'une cellule → entier de 1 à 5, ou null. Accepte 5, "5", "5/5", "★★★★★". */
function ratingOf_(v) {
  if (typeof v === "number") return v >= 1 && v <= 5 && Math.round(v) === v ? v : null;
  var s = String(v == null ? "" : v).trim();
  if (/^[★☆]{5}$/.test(s)) { var n = (s.match(/★/g) || []).length; return n >= 1 ? n : null; }
  var m = s.match(/^([1-5])(?:[.,]0+)?(?:\s*\/\s*5)?(?:\s*★)?$/);
  return m ? Number(m[1]) : null;
}

/** Valeur d'une cellule date → "AAAA-MM-JJ" ("" = vide, null = illisible). Cellule date, JJ/MM/AAAA ou AAAA-MM-JJ. */
function cellDate_(v) {
  if (v === "" || v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return isNaN(v.getTime()) ? null : Utilities.formatDate(v, CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  var s = String(v).trim(), p, y, m, d;
  if ((p = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) { y = +p[1]; m = +p[2]; d = +p[3]; }
  else if ((p = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s.*)?$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
  else return null;
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2200 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

function hex_(bytes) {
  return bytes.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? "0" + h : h; }).join("");
}

/** Lettre de colonne (1 → A, 27 → AA). */
function colLetter_(n) { var s = ""; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/** Texte saisi par un visiteur, écrit tel quel : l'apostrophe initiale empêche Google Sheets d'y voir une formule
    (« =… », « +… »), un nombre ou une date. Elle n'apparaît pas dans la cellule. */
function asText_(s) { return s === "" ? "" : "'" + s; }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ======================================================================= lecture de la feuille */

function headerMap_(header) {
  var col = {};
  header.forEach(function (h, i) { var f = HEADER_MAP[normalizeHeader_(h)]; if (f && col[f] === undefined) col[f] = i; });
  return col;
}

/**
 * Lit l'onglet « Avis ». Seules les colonnes reconnues sont lues.
 * @returns {{ok:boolean, rows:Array, problems:Array, col:Object}}
 */
function readReviews_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return { ok: false, rows: [], problems: ["Onglet « " + CONFIG.SHEET_NAME + " » introuvable : utilisez Wisy Safety › Préparer la feuille."], col: {} };
  var values = sheet.getDataRange().getValues();
  var col = headerMap_(values[0] || []);
  var missing = ["status", "rating", "first_name", "comment"].filter(function (f) { return col[f] === undefined; });
  if (missing.length) {
    return { ok: false, rows: [], col: col, problems: ["Colonne(s) manquante(s) : " + missing.map(function (f) { return "« " + TEMPLATE.filter(function (t) { return t[0] === f; })[0][1] + " »"; }).join(", ") + ". Utilisez Wisy Safety › Préparer la feuille."] };
  }
  var get = function (row, f) { return col[f] === undefined ? "" : row[col[f]]; };
  var rows = [], problems = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row.some(function (v) { return String(v).trim() !== ""; })) continue;
    var line = r + 1;
    var rec = {
      line: line,
      status: statusOf_(get(row, "status")),
      rating: ratingOf_(get(row, "rating")),
      first_name: clean_(get(row, "first_name")).slice(0, LIMITS.first_name),
      last_name: clean_(get(row, "last_name")).slice(0, LIMITS.last_name),
      company: clean_(get(row, "company")).slice(0, LIMITS.company),
      title: clean_(get(row, "title")).slice(0, LIMITS.title),
      comment: clean_(get(row, "comment"), true).slice(0, LIMITS.comment),
      email: clean_(get(row, "email")),
      received: cellDate_(get(row, "received_at")),
      published: cellDate_(get(row, "published_on")),
      reference: clean_(get(row, "reference")).slice(0, 40)
    };
    if (rec.status === null) problems.push("Ligne " + line + " : statut « " + clean_(get(row, "status")) + " » incompris (choisissez Confirmé, En attente ou Refusé) — avis non publié.");
    if (rec.status === "published") {
      if (rec.rating === null) problems.push("Ligne " + line + " : note manquante ou invalide (1 à 5) — avis non publié.");
      if (!rec.first_name) problems.push("Ligne " + line + " : prénom manquant — avis non publié.");
      if (!rec.comment) problems.push("Ligne " + line + " : texte de l'avis manquant — avis non publié.");
      if (rec.published === null) problems.push("Ligne " + line + " : « Publié le » illisible (JJ/MM/AAAA) — la date de réception est affichée.");
    }
    rows.push(rec);
  }
  return { ok: true, rows: rows, problems: problems, col: col };
}

/** Avis publiables : Confirmé + note + prénom + texte. Du plus récent au plus ancien. */
function publishable_(rows) {
  return rows.filter(function (r) { return r.status === "published" && r.rating !== null && r.first_name && r.comment; })
    .map(function (r) { r.date = r.published || r.received || ""; return r; })
    .sort(function (a, b) { return a.date === b.date ? b.line - a.line : a.date < b.date ? 1 : -1; });
}

/** Ce que le site reçoit. Jamais l'e-mail, jamais un avis non confirmé. */
function publicList_() {
  var reg = readReviews_();
  if (!reg.ok) return { status: "not_configured" };
  var list = publishable_(reg.rows);
  var sum = list.reduce(function (a, r) { return a + r.rating; }, 0);
  return {
    status: "ok",
    stats: { count: list.length, average: list.length ? Math.round(sum / list.length * 100) / 100 : null },
    reviews: list.slice(0, CONFIG.MAX_PUBLISHED).map(function (r) {
      return {
        reference: r.reference || null,
        first_name: r.first_name,
        last_name: r.last_name || null,
        company: r.company || null,
        rating: r.rating,
        title: r.title || null,
        comment: r.comment,
        date: r.date || null
      };
    })
  };
}

var CACHE_KEY = "avis:publies:v1";

function clearCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) { /* le cache expirera de lui-même */ }
}

/** Appel du site : liste des avis publiés (Statut « Confirmé »). */
function doGet() {
  try {
    var cache = CacheService.getScriptCache(), hit = cache.get(CACHE_KEY);
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    var out = publicList_(), text = JSON.stringify(out);
    if (out.status === "ok" && text.length < 90000) { try { cache.put(CACHE_KEY, text, CONFIG.CACHE_SECONDS); } catch (e) { /* trop gros : non gardé */ } }
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ status: "error" });
  }
}

/* ======================================================================= dépôt d'un avis */

var EMAIL_RE = /^[^@\s"<>]+@[^@\s"<>]+\.[^@\s"<>]{2,}$/;

/** Revalide TOUT ce qu'envoie le site (le formulaire peut être contourné). */
function validateReview_(body) {
  var r = {
    first_name: clean_(body.first_name), last_name: clean_(body.last_name), company: clean_(body.company),
    title: clean_(body.title), comment: clean_(body.comment, true), email: clean_(body.email).toLowerCase(),
    rating: ratingOf_(body.rating)
  };
  var fields = {};
  if (!r.first_name) fields.first_name = "required";
  if (!EMAIL_RE.test(r.email)) fields.email = "invalid";
  if (r.rating === null) fields.rating = "required";
  if (r.comment.length < 3) fields.comment = "too_short";
  if (body.consent !== true) fields.consent = "required";
  Object.keys(LIMITS).forEach(function (f) { if (r[f].length > LIMITS[f] && !fields[f]) fields[f] = "too_long"; });
  return { review: r, fields: fields };
}

/** Limites d'envoi. Renvoie le nombre de secondes à attendre (0 = autorisé). Compte l'envoi s'il est autorisé. */
function rateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var t = now_().getTime(), hour = Math.floor(t / 3600000), quarter = Math.floor(t / 21600000);
  var untilHour = Math.ceil(((hour + 1) * 3600000 - t) / 1000), untilQuarter = Math.ceil(((quarter + 1) * 21600000 - t) / 1000);
  var counters = [
    { k: "a:h:" + hour, limit: CONFIG.GLOBAL_PER_HOUR, ttl: untilHour + 60, retry: untilHour },
    { k: "a:q:" + quarter, limit: CONFIG.GLOBAL_PER_6_HOURS, ttl: Math.min(21600, untilQuarter + 60), retry: untilQuarter },
    { k: "a:e:" + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email, Utilities.Charset.UTF_8)).slice(0, 40) + ":" + hour,
      limit: CONFIG.PER_EMAIL_PER_HOUR, ttl: untilHour + 60, retry: untilHour }
  ];
  var values = cache.getAll(counters.map(function (c) { return c.k; })) || {};
  for (var i = 0; i < counters.length; i++) {
    if (Number(values[counters[i].k] || 0) >= counters[i].limit) return Math.max(60, counters[i].retry);
  }
  counters.forEach(function (c) { cache.put(c.k, String(Number(values[c.k] || 0) + 1), Math.min(21600, Math.max(60, c.ttl))); });
  return 0;
}

var REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans 0/O ni 1/I (lisible au téléphone)

function newReference_(taken) {
  var year = Utilities.formatDate(now_(), CONFIG.TIMEZONE, "yyyy");
  for (var tries = 0; tries < 50; tries++) {
    var s = "";
    for (var i = 0; i < 5; i++) s += REF_CHARS.charAt(Math.floor(Math.random() * REF_CHARS.length));
    var ref = "WS-" + year + "-" + s;
    if (!taken[ref]) return ref;
  }
  return "WS-" + year + "-" + now_().getTime().toString(36).toUpperCase().slice(-6);
}

/**
 * Enregistre un avis (Statut « En attente »). Ne publie JAMAIS rien.
 * @returns {Object} { status: ok (reference) | invalid (fields) | rate_limited (retryAfter) | error }
 */
function submit_(body) {
  /* Champ piège rempli = robot : réponse normale, rien n'est enregistré. */
  if (clean_(body.website)) return { status: "ok", reference: newReference_({}) };
  var v = validateReview_(body);
  if (Object.keys(v.fields).length) return { status: "invalid", fields: v.fields };
  var r = v.review;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { status: "error" };
  var ref, line;
  try {
    var wait = rateLimit_(r.email);
    if (wait > 0) return { status: "rate_limited", retryAfter: wait };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) { prepare_(); sheet = ss.getSheetByName(CONFIG.SHEET_NAME); }
    var values = sheet.getDataRange().getValues();
    var col = headerMap_(values[0] || []);
    if (col.status === undefined || col.comment === undefined || col.rating === undefined || col.first_name === undefined) {
      prepare_(); values = sheet.getDataRange().getValues(); col = headerMap_(values[0] || []);
    }
    /* Double envoi (même e-mail, même texte) : la référence déjà donnée est renvoyée, aucune nouvelle ligne. */
    var taken = {};
    for (var i = 1; i < values.length; i++) {
      var existing = col.reference === undefined ? "" : clean_(values[i][col.reference]);
      if (existing) taken[existing] = true;
      if (col.email !== undefined && clean_(values[i][col.email]).toLowerCase() === r.email &&
          clean_(values[i][col.comment], true) === r.comment && existing) return { status: "ok", reference: existing };
    }
    ref = newReference_(taken);
    var width = Math.max(sheet.getLastColumn(), values[0].length);
    var row = [];
    for (var c = 0; c < width; c++) row.push("");
    var put = function (f, val) { if (col[f] !== undefined) row[col[f]] = val; };
    put("received_at", now_());
    put("status", STATUS_PENDING);
    put("rating", r.rating);
    USER_TEXT.forEach(function (f) { put(f, asText_(r[f])); });
    put("reference", ref);
    line = sheet.getLastRow() + 1;
    sheet.getRange(line, 1, 1, width).setValues([row]);
  } finally {
    lock.releaseLock();
  }
  notify_(r, ref, line);
  return { status: "ok", reference: ref };
}

/** Appel du site : POST { first_name, last_name, email, company, rating, title, comment, consent, website }. */
function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}") || {}; } catch (err) { body = {}; }
    if (typeof body !== "object" || Array.isArray(body)) body = {};
    return json_(submit_(body));
  } catch (err) {
    return json_({ status: "error" });
  }
}

/* ======================================================================= e-mail à l'équipe */

function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stars_(n) { var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆"; return s; }

/** Prévient l'équipe d'un nouvel avis à valider. Une panne d'e-mail n'empêche jamais l'enregistrement. */
function notify_(r, ref, line) {
  if (!CONFIG.NOTIFY_EMAIL) return;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    var who = r.first_name + (r.last_name ? " " + r.last_name : "");
    var url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    var lines = [
      ["Note", stars_(r.rating) + "  (" + r.rating + "/5)"],
      ["Nom", who],
      ["Société / fonction", r.company || "—"],
      ["Titre", r.title || "—"],
      ["Avis", r.comment],
      ["E-mail (jamais publié)", r.email],
      ["Référence", ref + (line ? " — ligne " + line : "")]
    ];
    var text = "Un nouvel avis attend votre validation (il n'est PAS encore publié).\n\n" +
      lines.map(function (l) { return l[0] + " : " + l[1]; }).join("\n") +
      "\n\nPour le publier : ouvrez la feuille et mettez son Statut sur « " + STATUS_PUBLISHED + " ».\n" + url;
    var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#16302A;max-width:560px">' +
      '<p style="margin:0 0 14px">Un nouvel avis attend votre validation <b>(il n\'est pas encore publié)</b>.</p>' +
      '<table cellpadding="6" style="border-collapse:collapse;width:100%">' +
      lines.map(function (l) {
        return '<tr><td style="border-bottom:1px solid #E3EFEC;color:#5B6B67;white-space:nowrap;vertical-align:top">' + esc_(l[0]) +
          '</td><td style="border-bottom:1px solid #E3EFEC;white-space:pre-wrap">' + esc_(l[1]) + "</td></tr>";
      }).join("") + "</table>" +
      '<p style="margin:18px 0 6px">Pour le publier : Statut → <b>' + STATUS_PUBLISHED + "</b>.</p>" +
      '<p style="margin:0"><a href="' + esc_(url) + '" style="display:inline-block;background:#1F6F64;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ouvrir la feuille des avis</a></p></div>';
    var options = { name: "Site Wisy Safety", htmlBody: html };
    if (EMAIL_RE.test(r.email)) options.replyTo = r.email;
    MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, "Nouvel avis à valider — " + r.rating + "/5 — " + who, text, options);
  } catch (e) {
    console.log("Notification non envoyée : " + e);
  }
}

/* ======================================================================= modifications dans la feuille */

/** Déclencheur simple : au passage à « Confirmé », « Publié le » se remplit ; le site voit le changement aussitôt. */
function onEdit(e) {
  try {
    var range = e && e.range;
    if (!range || range.getSheet().getName() !== CONFIG.SHEET_NAME) return;
    clearCache_();
    var sheet = range.getSheet();
    var col = headerMap_(sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]);
    if (col.status === undefined || col.published_on === undefined) return;
    var sc = col.status + 1;
    if (range.getColumn() > sc || range.getColumn() + range.getNumColumns() - 1 < sc) return;
    var top = Math.max(range.getRow(), 2), n = range.getRow() + range.getNumRows() - top;
    if (n > 0) stampPublished_(sheet, col, top, n);
  } catch (err) { /* jamais bloquant pour la saisie */ }
}

/** « Publié le » = aujourd'hui pour les lignes « Confirmé » qui n'ont pas encore de date. */
function stampPublished_(sheet, col, top, n) {
  var statuses = sheet.getRange(top, col.status + 1, n, 1).getValues();
  var dates = sheet.getRange(top, col.published_on + 1, n, 1);
  var current = dates.getValues(), changed = false;
  /* Midi : la date reste la bonne quel que soit le fuseau horaire du projet Apps Script. */
  var today = Utilities.formatDate(now_(), CONFIG.TIMEZONE, "yyyy-MM-dd").split("-");
  var todayCell = new Date(+today[0], +today[1] - 1, +today[2], 12);
  for (var i = 0; i < n; i++) {
    if (statusOf_(statuses[i][0]) === "published" && String(current[i][0]).trim() === "") { current[i][0] = todayCell; changed = true; }
  }
  if (changed) dates.setValues(current);
}

/** Statut donné aux lignes sélectionnées (menu). */
function setSelected_(status) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getActiveSheet(), ui = SpreadsheetApp.getUi();
  if (sheet.getName() !== CONFIG.SHEET_NAME) { ui.alert("Sélectionnez d'abord une ou plusieurs lignes dans l'onglet « " + CONFIG.SHEET_NAME + " »."); return; }
  var col = headerMap_(sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]);
  if (col.status === undefined) { ui.alert("Colonne « Statut » introuvable : utilisez Wisy Safety › Préparer la feuille."); return; }
  var count = 0;
  sheet.getActiveRangeList().getRanges().forEach(function (range) {
    var top = Math.max(range.getRow(), 2), last = Math.min(range.getLastRow(), sheet.getLastRow()), n = last - top + 1;
    if (n < 1) return;
    var cells = sheet.getRange(top, col.status + 1, n, 1);
    cells.setValues(cells.getValues().map(function () { return [status]; }));
    if (status === STATUS_PUBLISHED && col.published_on !== undefined) stampPublished_(sheet, col, top, n);
    count += n;
  });
  clearCache_();
  ss.toast(count ? count + " avis : « " + status + " » (" + STATUS_HELP[status] + ")." : "Aucune ligne d'avis sélectionnée.", "Wisy Safety", 6);
}

function publierLaSelection() { setSelected_(STATUS_PUBLISHED); }
function mettreEnAttenteLaSelection() { setSelected_(STATUS_PENDING); }
function refuserLaSelection() { setSelected_(STATUS_REFUSED); }

/* ======================================================================= menu de la feuille */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Wisy Safety")
    .addItem("✅ Publier les avis sélectionnés (Confirmé)", "publierLaSelection")
    .addItem("⏳ Remettre en attente les avis sélectionnés", "mettreEnAttenteLaSelection")
    .addItem("⛔ Refuser les avis sélectionnés", "refuserLaSelection")
    .addSeparator()
    .addItem("Voir ce qui est publié sur le site", "voirLeSite")
    .addItem("Vérifier les données", "verifierLesDonnees")
    .addItem("Envoyer un e-mail de test", "testerLaNotification")
    .addSeparator()
    .addItem("Préparer / mettre en forme la feuille", "installer")
    .addToUi();
}

/* ======================================================================= mise en place de la feuille */

/**
 * Crée ou met à jour l'onglet « Avis » et l'onglet « Tableau de bord ». Peut être relancé autant de fois que nécessaire :
 * les colonnes manquantes sont ajoutées, les données ne sont jamais effacées, la mise en forme est refaite.
 */
function prepare_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var done = [], kept = [];
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  try { ss.setSpreadsheetLocale("fr_BE"); } catch (e) { /* réglage facultatif */ }
  if (/^(Feuille de calcul sans titre|Untitled spreadsheet|Naamloze spreadsheet)$/i.test(ss.getName())) { ss.rename(CONFIG.FILE_NAME); done.push("fichier renommé « " + CONFIG.FILE_NAME + " »"); }

  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    /* Nouveau fichier : l'onglet vide « Feuille 1 » devient « Avis » plutôt que d'en ajouter un. */
    var sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) { sheet = sheets[0]; sheet.setName(CONFIG.SHEET_NAME); }
    else sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
    done.push("onglet « " + CONFIG.SHEET_NAME + " » créé");
  }
  var headerOf = function () { return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]; };
  if (headerOf().every(function (h) { return String(h).trim() === ""; })) {
    sheet.getRange(1, 1, 1, TEMPLATE.length).setValues([TEMPLATE.map(function (t) { return t[1]; })]);
  }

  /* Colonnes du modèle manquantes ajoutées à leur place (après la précédente colonne du modèle). */
  var col = headerMap_(headerOf());
  TEMPLATE.forEach(function (t, i) {
    if (col[t[0]] !== undefined) return;
    var prev = -1;
    for (var k = i - 1; k >= 0 && prev < 0; k--) if (col[TEMPLATE[k][0]] !== undefined) prev = col[TEMPLATE[k][0]];
    if (prev >= 0) sheet.insertColumnAfter(prev + 1); else sheet.insertColumnBefore(1);
    sheet.getRange(1, prev + 2).setValue(t[1]);
    done.push("colonne « " + t[1] + " » ajoutée");
    col = headerMap_(headerOf());
  });
  headerOf().forEach(function (h, i) {
    if (String(h).trim() !== "" && HEADER_MAP[normalizeHeader_(h)] === undefined) kept.push("« " + h + " » (colonne " + colLetter_(i + 1) + ") : colonne conservée, jamais lue par le site.");
  });

  /* Statuts écrits proprement (« confirmé », « publie »… → « Confirmé ») ; dates de publication manquantes remplies. */
  var n = Math.max(sheet.getLastRow() - 1, 0);
  if (n > 0) {
    var st = sheet.getRange(2, col.status + 1, n, 1), vals = st.getValues(), fixed = 0;
    var labels = { published: STATUS_PUBLISHED, pending: STATUS_PENDING, refused: STATUS_REFUSED };
    var filled = sheet.getRange(2, 1, n, Math.max(sheet.getLastColumn(), 1)).getValues();
    vals = vals.map(function (v, i) {
      if (!filled[i].some(function (x) { return String(x).trim() !== ""; })) return v;
      var s = statusOf_(v[0]);
      if (s && v[0] !== labels[s]) { fixed++; return [labels[s]]; }
      return v;
    });
    if (fixed) { st.setValues(vals); done.push(fixed + " statut(s) écrit(s) « " + STATUSES.join(" », « ") + " »"); }
    stampPublished_(sheet, col, 2, n);
  }

  /* Mise en forme. */
  var header = headerOf(), w = header.length;
  if (sheet.getMaxColumns() > w) sheet.deleteColumns(w + 1, sheet.getMaxColumns() - w);
  var rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.setFrozenRows(1);
  /* « Reçu le » et « Statut » restent visibles pendant le défilement horizontal (s'ils sont en tête de tableau). */
  var frozen = Math.max(col.received_at, col.status) + 1;
  sheet.setFrozenColumns(frozen <= 3 ? frozen : 0);
  sheet.setTabColor("#1F6F64");
  sheet.setRowHeight(1, 40);
  var all = sheet.getRange(1, 1, rows + 1, w);
  all.setFontFamily("Inter").setFontSize(10).setVerticalAlignment("top");
  sheet.getRange(1, 1, 1, w).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#16302A").setVerticalAlignment("middle").setWrap(true);
  sheet.getBandings().forEach(function (b) { b.remove(); });
  all.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false).setHeaderRowColor("#16302A").setFirstRowColor("#FFFFFF").setSecondRowColor("#F4FAF9");
  sheet.getRange(2, 1, rows, w).clearDataValidations();
  header.forEach(function (h, i) {
    var f = HEADER_MAP[normalizeHeader_(h)], t = TEMPLATE.filter(function (x) { return x[0] === f; })[0];
    var range = sheet.getRange(2, i + 1, rows, 1);
    if (t) { sheet.getRange(1, i + 1).setNote(t[2]); sheet.setColumnWidth(i + 1, t[3]); }
    if (f === "received_at") range.setNumberFormat("dd/mm/yyyy hh:mm").setHorizontalAlignment("left");
    else if (f === "published_on") {
      range.setNumberFormat("dd/mm/yyyy").setHorizontalAlignment("center")
        .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText("Date affichée sur le site, au format JJ/MM/AAAA.").build());
    } else if (f === "status") {
      range.setHorizontalAlignment("center").setFontWeight("bold")
        .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false)
          .setHelpText(STATUSES.map(function (s) { return s + " = " + STATUS_HELP[s]; }).join(" · ")).build());
    } else if (f === "rating") {
      range.setNumberFormat('0" / 5"').setHorizontalAlignment("center")
        .setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).setAllowInvalid(false).setHelpText("Note de 1 à 5.").build());
    } else if (f === "comment" || f === "title") range.setWrap(true);
    else if (f === "reference") range.setFontFamily("Roboto Mono").setFontColor("#5B6B67");
    else if (f === "email") range.setFontColor("#5B6B67");
    else if (f === "first_name") range.setFontWeight("bold");
  });

  /* Couleurs : la cellule Statut (vert / orange / rouge) et toute la ligne d'un avis en attente (à traiter) ou refusé. */
  var S = "$" + colLetter_(col.status + 1) + "2";
  var statusRange = sheet.getRange(2, col.status + 1, rows, 1), rowRange = sheet.getRange(2, 1, rows, w);
  var byText = function (text, bg, fg, range) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([range]).build(); };
  var byFormula = function (formula, bg, fg, range) {
    var b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges([range]);
    if (bg) b.setBackground(bg);
    if (fg) b.setFontColor(fg);
    return b.build();
  };
  sheet.setConditionalFormatRules([
    byText(STATUS_PUBLISHED, "#C9F2E3", "#11624F", statusRange),
    byText(STATUS_PENDING, "#FFE1B3", "#8A4B00", statusRange),
    byText(STATUS_REFUSED, "#FBE1E4", "#B4233A", statusRange),
    byFormula("=" + S + '="' + STATUS_PENDING + '"', "#FFF7EA", null, rowRange),
    byFormula("=" + S + '="' + STATUS_REFUSED + '"', null, "#9AA5A2", rowRange)
  ]);

  /* Filtre (tri et recherche par colonne) et en-tête protégé contre les modifications accidentelles. */
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), w).createFilter();
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === "En-têtes des avis") p.remove(); });
  sheet.getRange(1, 1, 1, w).protect().setDescription("En-têtes des avis").setWarningOnly(true);

  buildDashboard_(ss, col);
  done.push("onglet « " + CONFIG.DASHBOARD_NAME + " » mis à jour");
  clearCache_();
  return { done: done, kept: kept };
}

/** Onglet « Tableau de bord » : légende des statuts, chiffres et répartition des notes (formules, toujours à jour). */
function buildDashboard_(ss, col) {
  var d = ss.getSheetByName(CONFIG.DASHBOARD_NAME) || ss.insertSheet(CONFIG.DASHBOARD_NAME, 1);
  d.getRange(1, 1, d.getMaxRows(), d.getMaxColumns()).breakApart();
  d.clear();
  d.getBandings().forEach(function (b) { b.remove(); });
  d.setConditionalFormatRules([]);
  d.setTabColor("#25B79F");
  d.setHiddenGridlines(true);
  if (d.getMaxColumns() < 6) d.insertColumnsAfter(d.getMaxColumns(), 6 - d.getMaxColumns());
  [24, 210, 210, 210, 210, 24].forEach(function (px, i) { d.setColumnWidth(i + 1, px); });
  var q = "'" + CONFIG.SHEET_NAME + "'!";
  var S = q + "$" + colLetter_(col.status + 1) + "$2:$" + colLetter_(col.status + 1);
  var N = q + "$" + colLetter_(col.rating + 1) + "$2:$" + colLetter_(col.rating + 1);
  d.getRange("A1:F40").setFontFamily("Inter").setFontColor("#16302A").setVerticalAlignment("middle");

  d.getRange("B2").setValue("Avis clients — Wisy Safety").setFontSize(18).setFontWeight("bold");
  d.getRange("B3").setValue("Chiffres recalculés automatiquement à chaque modification de l'onglet « " + CONFIG.SHEET_NAME + " ».").setFontColor("#5B6B67");

  var kpi = [
    ["Publiés sur le site", "=COUNTIF(" + S + ',"' + STATUS_PUBLISHED + '")', "0", "#C9F2E3", "#11624F"],
    ["En attente de validation", "=COUNTIF(" + S + ',"' + STATUS_PENDING + '")', "0", "#FFE1B3", "#8A4B00"],
    ["Refusés", "=COUNTIF(" + S + ',"' + STATUS_REFUSED + '")', "0", "#FBE1E4", "#B4233A"],
    ["Note moyenne publiée", "=IFERROR(AVERAGEIF(" + S + ',"' + STATUS_PUBLISHED + '",' + N + '),"—")', '0.0" / 5"', "#16302A", "#FFFFFF"]
  ];
  kpi.forEach(function (k, i) {
    var label = d.getRange(5, i + 2), value = d.getRange(6, i + 2);
    label.setValue(k[0]).setFontSize(9).setFontWeight("bold").setBackground(k[3]).setFontColor(k[4]);
    value.setFormula(k[1]).setNumberFormat(k[2]).setFontSize(26).setFontWeight("bold").setBackground(k[3]).setFontColor(k[4]).setHorizontalAlignment("left");
  });
  d.setRowHeight(5, 30); d.setRowHeight(6, 52);

  d.getRange("B9").setValue("Statuts").setFontSize(12).setFontWeight("bold");
  var legend = [
    [STATUS_PUBLISHED, "Publié sur le site. « Publié le » se remplit automatiquement.", "#C9F2E3", "#11624F"],
    [STATUS_PENDING, "Attendre validation : l'avis n'apparaît pas sur le site.", "#FFE1B3", "#8A4B00"],
    [STATUS_REFUSED, "Jamais publié. La ligne est gardée pour l'historique.", "#FBE1E4", "#B4233A"]
  ];
  legend.forEach(function (l, i) {
    d.getRange(10 + i, 2).setValue(l[0]).setFontWeight("bold").setBackground(l[2]).setFontColor(l[3]).setHorizontalAlignment("center");
    d.getRange(10 + i, 3, 1, 3).merge().setValue(l[1]);
  });

  d.getRange("B15").setValue("Répartition des notes (avis publiés)").setFontSize(12).setFontWeight("bold");
  for (var star = 5; star >= 1; star--) {
    var r = 16 + (5 - star);
    d.getRange(r, 2).setValue(stars_(star)).setFontColor("#E3A008").setFontSize(12);
    d.getRange(r, 3).setFormula("=COUNTIFS(" + S + ',"' + STATUS_PUBLISHED + '",' + N + "," + star + ")").setHorizontalAlignment("left");
    d.getRange(r, 4, 1, 2).merge().setFormula('=IF($C$21=0,"",SPARKLINE(C' + r + ',{"charttype","bar";"max",$C$21;"color1","#1F6F64"}))');
  }
  d.getRange(21, 2).setValue("Total").setFontWeight("bold");
  d.getRange(21, 3).setFormula("=SUM(C16:C20)").setFontWeight("bold").setHorizontalAlignment("left");

  d.getRange("B23").setValue("Page publique").setFontSize(12).setFontWeight("bold");
  d.getRange("B24").setFormula('=HYPERLINK("' + CONFIG.SITE_URL + '","Voir la page Avis du site ↗")');
  d.getRange("B26:E26").merge().setValue("Pour publier un avis : onglet « " + CONFIG.SHEET_NAME + " », colonne Statut → « " + STATUS_PUBLISHED +
    " » (ou menu Wisy Safety › Publier les avis sélectionnés). Le site se met à jour tout seul.").setWrap(true).setFontColor("#5B6B67");
  d.setRowHeight(26, 44);
  d.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
  d.protect().setDescription("Tableau de bord (formules)").setWarningOnly(true);
}

/** Menu : « Préparer / mettre en forme la feuille ». */
function installer() {
  var res = prepare_();
  var message = "L'onglet « " + CONFIG.SHEET_NAME + " » est prêt : une ligne par avis.\n\n" +
    (res.done.length ? "Modifications :\n• " + res.done.join("\n• ") + "\n\n" : "") +
    (res.kept.length ? res.kept.join("\n") + "\n\n" : "") +
    "Statut : " + STATUSES.map(function (s) { return s + " = " + STATUS_HELP[s]; }).join(" ; ") + ".\n\n" +
    "Si vous venez de mettre le script à jour : dans Apps Script, Déployer › Gérer les déploiements › crayon › Nouvelle version.";
  try { SpreadsheetApp.getUi().alert("Feuille prête", message, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { console.log(message); }
  return res;
}

/** Menu : ce que le site affiche en ce moment. */
function voirLeSite() {
  var out = publicList_(), ui = SpreadsheetApp.getUi();
  if (out.status !== "ok") { ui.alert("Ce qui est publié", "La feuille n'est pas prête : utilisez « Préparer / mettre en forme la feuille ».", ui.ButtonSet.OK); return; }
  if (!out.reviews.length) { ui.alert("Ce qui est publié", "Aucun avis publié pour l'instant : passez un avis sur « " + STATUS_PUBLISHED + " » pour qu'il apparaisse sur le site.", ui.ButtonSet.OK); return; }
  var text = out.stats.count + " avis publié(s) — note moyenne " + String(out.stats.average).replace(".", ",") + " / 5.\n\n" +
    out.reviews.slice(0, 12).map(function (r) {
      return stars_(r.rating) + "  " + r.first_name + (r.last_name ? " " + r.last_name : "") + (r.date ? " — " + r.date.split("-").reverse().join("/") : "") +
        "\n" + (r.title ? r.title + " : " : "") + (r.comment.length > 140 ? r.comment.slice(0, 140) + "…" : r.comment);
    }).join("\n\n") + (out.reviews.length > 12 ? "\n\n…" : "");
  ui.alert("Ce qui est publié sur le site", text, ui.ButtonSet.OK);
}

/** Menu : contrôle de la feuille (statuts incompris, notes manquantes, avis confirmés incomplets). */
function verifierLesDonnees() {
  var reg = readReviews_(), ui = SpreadsheetApp.getUi();
  if (!reg.ok) { ui.alert("Vérification des données", reg.problems.join("\n"), ui.ButtonSet.OK); return; }
  var count = { published: 0, pending: 0, refused: 0 };
  reg.rows.forEach(function (r) { if (r.status) count[r.status]++; });
  var msg = reg.rows.length + " avis dans la feuille : " + count.published + " confirmé(s), " + count.pending + " en attente, " + count.refused + " refusé(s).\n" +
    publishable_(reg.rows).length + " avis visible(s) sur le site.";
  msg += reg.problems.length ? "\n\n" + reg.problems.length + " point(s) à corriger :\n" + reg.problems.slice(0, 40).join("\n") + (reg.problems.length > 40 ? "\n…" : "") : "\n\nAucun problème détecté.";
  ui.alert("Vérification des données", msg, ui.ButtonSet.OK);
}

/** Menu : envoie un exemple de notification (sert aussi à autoriser l'envoi d'e-mails la première fois). */
function testerLaNotification() {
  var ui = SpreadsheetApp.getUi();
  if (!CONFIG.NOTIFY_EMAIL) { ui.alert("Aucune adresse de notification : renseignez CONFIG.NOTIFY_EMAIL en haut du script."); return; }
  notify_({ first_name: "Exemple", last_name: "T.", company: "Test", title: "E-mail de test", comment: "Ceci est un e-mail de test : aucun avis n'a été ajouté.", email: CONFIG.NOTIFY_EMAIL, rating: 5 }, "WS-TEST", 0);
  ui.alert("E-mail de test envoyé à " + CONFIG.NOTIFY_EMAIL + ". (S'il n'arrive pas, regardez dans les indésirables.)");
}
