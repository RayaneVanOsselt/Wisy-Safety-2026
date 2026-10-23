/**
 * @OnlyCurrentDoc
 *
 * =========================================================================
 * WISY SAFETY — Réservations de formations dans Google Sheets (script Apps Script)
 * -------------------------------------------------------------------------
 * À COLLER dans une feuille Google Sheets vide : Extensions › Apps Script › (tout remplacer) › Enregistrer.
 * Guide pas à pas : docs/README-RESERVATIONS.md (dépôt du site).
 *
 * Ce que fait ce script :
 *   - « Installer » crée les onglets (Formations, Sessions, Réservations, Participants, Écarts Outlook, File d'envoi,
 *     Journal), y range TOUTES les formations du site et la première session demandée (Nacelles, 18/10/2026, 10 places) ;
 *   - il répond au site (déploiement « Application Web ») :
 *       GET  → les sessions publiées, avec les places restantes CALCULÉES à partir des réservations enregistrées ;
 *       POST → une réservation : vérifiée puis enregistrée SOUS VERROU (une réservation à la fois), jamais au-delà
 *              de la capacité ; un double envoi renvoie la même référence ;
 *   - il envoie les e-mails (confirmation au client, avis à Wisy Safety) et les réessaie en cas d'échec ;
 *   - il synchronise un calendrier Outlook DÉDIÉ (Microsoft Graph), si Microsoft 365 est configuré (menu) ;
 *   - il ajoute un menu « Wisy Safety » : nouvelle session, fermer / annuler, annuler une réservation, liste des
 *     participants, vérifications, Outlook.
 *
 * Règle d'or : les places restantes ne sont JAMAIS saisies à la main. Elles sont recalculées à chaque demande à partir
 * des lignes de l'onglet « Réservations » (statut Confirmée, ou En attente non expirée).
 *
 * @OnlyCurrentDoc : le script n'a accès qu'à CETTE feuille (aucun autre fichier de votre Google Drive).
 * La feuille doit rester PRIVÉE (partage « Accès limité ») : le site ne la lit jamais directement.
 * Les identifiants Microsoft sont rangés dans les « propriétés du script », jamais dans une cellule ni dans le site.
 * =========================================================================
 */

var VERSION = "1.1.0";

var CONFIG = {
  FILE_NAME: "Réservations - Wisy Safety",
  TIMEZONE: "Europe/Brussels",
  LOCALE: "fr_BE",
  NOTIFY_EMAIL: "info@wisysafety.be",       // reçoit chaque réservation et chaque demande du site ("" = aucune)
  SITE_URL: "https://wisysafety.be/",       // adresse officielle du site (liens des e-mails et de l'onglet Formations)
  PHONE: "+32 2 318 86 59",
  CONFIRMATION: "immediate",                // "immediate" : places confirmées tout de suite · "manual" : « En attente » jusqu'à votre validation
  PENDING_HOURS: 72,                        // mode "manual" : une réservation non validée libère ses places après ce délai
  CLOSE_HOURS_BEFORE: 48,                   // fin des inscriptions en ligne par défaut (colonne « Fin des inscriptions » pour une autre date)
  MAX_ITEMS: 10,                            // formations différentes dans une même demande
  MAX_SEATS_PER_ITEM: 50,                   // places demandées pour une même formation
  PER_EMAIL_PER_HOUR: 5,                    // demandes par adresse e-mail et par heure
  GLOBAL_PER_HOUR: 60,                      // demandes par heure, tous visiteurs confondus (protection contre les robots)
  GLOBAL_PER_6_HOURS: 200,
  CACHE_SECONDS: 20,                        // la liste publique est gardée 20 s ; toute réservation ou modification la renouvelle
  SYNC_EVERY_MINUTES: 10,                   // tâche automatique : e-mails en attente, expirations, Outlook
  MAX_SEND_TRIES: 6,
  OUTLOOK_TIMEZONE: "Romance Standard Time",// = Bruxelles pour Microsoft
  OUTLOOK_CATEGORY: "Formation Wisy",
  MAX_OUTLOOK_PER_RUN: 25,
  /* Demandes envoyées par les formulaires du site (contact, devis, coordination, test PEB) — onglet « Demandes ». */
  CONTACT_ACK: true,                        // accusé de réception envoyé au visiteur (avec sa référence)
  CONTACT_ACK_MIN_QUOTA: 30,                // sans Microsoft 365 : pas d'accusé si le quota Gmail du jour descend sous ce seuil
  CONTACT_PER_EMAIL_PER_HOUR: 5,            // demandes par adresse e-mail et par heure
  CONTACT_GLOBAL_PER_HOUR: 40,              // demandes par heure, tous visiteurs confondus
  CONTACT_GLOBAL_PER_6_HOURS: 150,
  CONTACT_MIN_FILL_MS: 2500,                // formulaire envoyé moins de 2,5 s après l'ouverture de la page = robot (ignoré)
  REQUEST_RETENTION_MONTHS: 0               // > 0 : les demandes plus anciennes sont anonymisées automatiquement (durée à
                                            // reporter dans la politique de confidentialité ; 0 = désactivé)
};

/* Onglets */
var TAB = {
  FORMATIONS: "Formations", SESSIONS: "Sessions", BOOKINGS: "Réservations", PEOPLE: "Participants",
  GAPS: "Écarts Outlook", OUTBOX: "File d'envoi", LOG: "Journal", REQUESTS: "Demandes"
};

/* Formations du site (registre js/site-content.js — tests/reservations.test.js vérifie que la liste est identique).
   [identifiant du site, nom, type, tarif affiché, durée, page du site]. Aucun tarif inventé : « Sur devis » = non publié. */
var FORMATIONS = [
  ["vca-base", "VCA Base", "Formation", "225 € par participant", "1 jour", "formation-vca-base.html"],
  ["vca-hierarchique", "VCA Ligne hiérarchique", "Formation", "Sur devis", "", "formation-vca-ligne-hierarchique.html"],
  ["diisocyanates", "Diisocyanates & substances dangereuses", "Formation", "Sur devis", "", "formation-diisocyanates.html"],
  ["nacelle", "Nacelles élévatrices", "Formation", "350 € HT", "1 jour", "formation-nacelles-elevatrices.html"],
  ["fibre-optique", "Fibre optique", "Formation", "Sur devis", "", "formation-fibre-optique.html"],
  ["beps", "BEPS — Premier secours", "Formation", "70 €", "15 heures", "formation-beps-premiers-secours.html"],
  ["vca-entreprise", "VCA Entreprise", "Accompagnement", "590 € par participant (indicatif)", "", "vca-entreprise.html"]
];

/* Première session, demandée par Wisy Safety le 15/10/2026. Ajoutée par « Installer » seulement si l'onglet Sessions est
   vide et si la date n'est pas passée. */
var SEED_SESSIONS = [
  { training: "nacelle", date: "2026-10-18", start: "10:00", end: "18:00", capacity: 10 }
];

/* Statuts */
var S_OPEN = "Ouverte", S_CLOSED = "Fermée", S_CANCELLED = "Annulée";
var SESSION_STATUSES = [S_OPEN, S_CLOSED, S_CANCELLED];
var B_CONFIRMED = "Confirmée", B_PENDING = "En attente", B_CANCELLED = "Annulée", B_REQUEST = "Demande (date à convenir)", B_EXPIRED = "Expirée";
var BOOKING_STATUSES = [B_CONFIRMED, B_PENDING, B_CANCELLED, B_REQUEST, B_EXPIRED];
var Q_TODO = "À envoyer", Q_SENT = "Envoyé", Q_FAILED = "Échec";
var R_NEW = "Nouvelle", R_DOING = "En cours", R_DONE = "Traitée", R_SPAM = "Indésirable", R_ERASED = "Effacée";
var REQUEST_STATUSES = [R_NEW, R_DOING, R_DONE, R_SPAM, R_ERASED];
var G_TODO = "À décider", G_APPLY = "Appliquer", G_IGNORE = "Ignorer", G_DONE = "Traité";

var LANGUAGES = [["fr", "Français"], ["nl", "Néerlandais"], ["en", "Anglais"], ["de", "Allemand"], ["it", "Italien"],
  ["ro", "Roumain"], ["bg", "Bulgare"], ["sl", "Slovène"], ["af", "Afrikaans"], ["ar", "Arabe"]];

/* Colonnes : [champ, en-tête, note affichée sur l'en-tête, largeur, technique (masquée)] */
var COLS = {};
COLS[TAB.FORMATIONS] = [
  ["id", "Identifiant", "Identifiant de la formation sur le site. Ne pas modifier.", 150, false],
  ["name", "Formation", "Nom affiché dans la liste des sessions et dans les e-mails.", 290, false],
  ["kind", "Type", "Formation ou accompagnement.", 130, false],
  ["price", "Tarif", "Tarif publié sur le site (information).", 230, false],
  ["duration", "Durée", "Information.", 100, false],
  ["page", "Page du site", "Adresse de la page de la formation.", 330, false],
  ["bookable", "Réservable en ligne", "Décochée = le site refuse les demandes pour cette formation.", 110, false]
];
COLS[TAB.SESSIONS] = [
  ["id", "Identifiant", "Rempli automatiquement (date + formation). Ne pas modifier : les réservations y sont rattachées.", 175, false],
  ["training", "Formation", "Choisissez dans la liste (onglet « Formations »).", 250, false],
  ["date", "Date", "JJ/MM/AAAA.", 105, false],
  ["start", "Début", "HH:MM (ex. 09:00). Vide = journée entière.", 70, false],
  ["end", "Fin", "HH:MM (ex. 17:00).", 70, false],
  ["capacity", "Places (total)", "Nombre maximal de participants.", 90, false],
  ["booked", "Réservées", "CALCULÉ automatiquement à partir de l'onglet « Réservations ». Ne pas modifier.", 90, false],
  ["remaining", "Restantes", "CALCULÉ automatiquement. 0 = complète.", 90, false],
  ["status", "Statut", "Ouverte = réservable · Fermée = visible mais plus réservable · Annulée = retirée du site.", 105, false],
  ["closes", "Fin des inscriptions", "Facultatif (JJ/MM/AAAA HH:MM). Vide = 48 h avant le début.", 150, false],
  ["language", "Langue", "Facultatif.", 110, false],
  ["location", "Lieu", "Facultatif. Vide = rien n'est affiché.", 190, false],
  ["published", "Publiée sur le site", "Cochée = visible sur le site.", 95, false],
  ["outlook", "Outlook", "État de la synchronisation avec le calendrier Outlook. Rempli automatiquement.", 210, false],
  ["outlook_id", "ID Outlook (technique)", "", 120, true],
  ["outlook_sent", "Dernier envoi Outlook (technique)", "", 140, true],
  ["sync_tries", "Essais Outlook (technique)", "", 80, true],
  ["sync_next", "Prochain essai Outlook (technique)", "", 140, true],
  ["generation", "Génération Outlook (technique)", "", 80, true]
];
COLS[TAB.BOOKINGS] = [
  ["received", "Reçue le", "Rempli automatiquement.", 135, false],
  ["ref", "Référence", "Donnée au client (WSR-AAAA-XXXXX). Une demande peut avoir plusieurs lignes (une par formation).", 135, false],
  ["session", "Session", "Identifiant de la session. Vide = date à convenir.", 175, false],
  ["training", "Formation", "", 210, false],
  ["when", "Date de la session", "", 165, false],
  ["seats", "Places", "Places prises par cette ligne.", 70, false],
  ["status", "Statut", "Confirmée et En attente (non expirée) comptent dans les places. Annulée / Expirée / Demande ne comptent pas. Pour annuler : menu Wisy Safety (jamais supprimer la ligne).", 165, false],
  ["name", "Demandeur", "", 170, false],
  ["email", "E-mail", "", 210, false],
  ["phone", "Téléphone", "", 130, false],
  ["company", "Entreprise", "", 180, false],
  ["vat", "N° de TVA", "", 130, false],
  ["address", "Adresse de facturation", "", 260, false],
  ["participants", "Participants", "Noms transmis (détail : onglet « Participants »).", 260, false],
  ["lang", "Langue du site", "", 80, false],
  ["expires", "Expire le", "Mode « validation manuelle » : sans validation, les places sont libérées à cette date.", 135, false],
  ["cancelled", "Annulée le", "", 135, false],
  ["notes", "Notes", "Libre.", 220, false],
  ["request", "Clé de requête (technique)", "", 120, true]
];
COLS[TAB.PEOPLE] = [
  ["ref", "Référence", "", 135, false], ["session", "Session", "", 175, false], ["training", "Formation", "", 210, false],
  ["first", "Prénom", "", 140, false], ["last", "Nom", "", 160, false], ["email", "E-mail", "", 220, false]
];
COLS[TAB.GAPS] = [
  ["detected", "Détecté le", "", 135, false],
  ["session", "Session", "", 175, false],
  ["training", "Formation", "", 200, false],
  ["kind", "Changement", "", 190, false],
  ["sheet", "Dans la feuille", "", 190, false],
  ["outlook", "Dans Outlook", "", 190, false],
  ["decision", "Décision", "Appliquer = la feuille prend la valeur d'Outlook (les réservations sont gardées). Ignorer = Outlook est remis comme la feuille. Puis menu Wisy Safety › Traiter les écarts.", 120, false],
  ["done", "Traité le", "", 135, false]
];
COLS[TAB.OUTBOX] = [
  ["created", "Créé le", "", 135, false], ["kind", "Type", "", 160, false], ["to", "Destinataire", "", 220, false],
  ["subject", "Objet", "", 320, false], ["status", "Statut", "", 100, false], ["tries", "Essais", "", 70, false],
  ["next", "Prochain essai", "", 135, false], ["error", "Dernière erreur", "", 320, false], ["ref", "Référence", "", 135, false],
  ["body", "Contenu (technique)", "", 120, true],
  ["reply", "Répondre à", "Adresse utilisée quand on clique sur « Répondre » (le visiteur pour les e-mails adressés à l'équipe).", 200, false]
];
COLS[TAB.REQUESTS] = [
  ["received", "Reçue le", "Rempli automatiquement.", 135, false],
  ["ref", "Référence", "Donnée au visiteur (WSC-AAAA-XXXXX).", 135, false],
  ["form", "Formulaire", "Contact, Coordination ou Test PEB.", 120, false],
  ["subject", "Sujet", "", 200, false],
  ["name", "Nom", "", 170, false],
  ["email", "E-mail", "Répondre directement depuis votre messagerie : l'e-mail reçu a cette adresse en « Répondre à ».", 210, false],
  ["phone", "Téléphone", "", 130, false],
  ["company", "Société", "", 170, false],
  ["message", "Message", "", 380, false],
  ["details", "Détails", "Champs propres au formulaire (services, phase du projet, Région…).", 300, false],
  ["page", "Page", "Page du site d'où la demande a été envoyée.", 190, false],
  ["lang", "Langue du site", "", 80, false],
  ["status", "Statut", "Nouvelle · En cours · Traitée · Indésirable · Effacée (anonymisée).", 110, false],
  ["notes", "Notes", "Libre.", 220, false],
  ["mailed", "E-mail à l'équipe", "Envoyé = parti vers " + CONFIG.NOTIFY_EMAIL + " ; sinon voir l'onglet « File d'envoi ».", 130, false],
  ["request", "Clé de requête (technique)", "", 120, true]
];
COLS[TAB.LOG] = [
  ["when", "Date", "", 135, false], ["kind", "Type", "", 110, false], ["target", "Session / référence", "", 190, false],
  ["level", "Niveau", "", 90, false], ["message", "Message", "", 560, false]
];

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

/** Texte nettoyé : caractères de contrôle retirés, espaces regroupés. */
function clean_(v, max) {
  var s = String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F​-‍﻿]/g, " ").replace(/\s+/g, " ").trim();
  return max ? s.slice(0, max) : s;
}

/** Texte saisi par un visiteur, écrit tel quel : l'apostrophe initiale empêche Google Sheets d'y voir une formule. */
function asText_(s) { return s === "" || s == null ? "" : "'" + s; }

function isDate_(v) { return Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime()); }

function pad_(n) { return (n < 10 ? "0" : "") + n; }

function fmt_(d, pattern) { return Utilities.formatDate(d, CONFIG.TIMEZONE, pattern); }

/** Cellule date → "AAAA-MM-JJ" ("" = vide, null = illisible). */
function cellDate_(v) {
  if (v === "" || v == null) return "";
  if (isDate_(v)) return fmt_(v, "yyyy-MM-dd");
  var s = String(v).trim().replace(/^'/, ""), p, y, m, d;   // apostrophe de texte éventuellement gardée par Google
  if ((p = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +p[1]; m = +p[2]; d = +p[3]; }
  else if ((p = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
  else return null;
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2200 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return y + "-" + pad_(m) + "-" + pad_(d);
}

/** Cellule heure → "HH:MM" ("" = vide, null = illisible). Accepte 9:00, 09h00, 9h, 9. */
function cellTime_(v) {
  if (v === "" || v == null) return "";
  if (isDate_(v)) return fmt_(v, "HH:mm");
  var p = String(v).trim().replace(/^'/, "").toLowerCase().match(/^(\d{1,2})(?:\s*[:h.]\s*(\d{2})?)?$/);
  if (!p) return null;
  var h = +p[1], m = p[2] ? +p[2] : 0;
  return h <= 23 && m <= 59 ? pad_(h) + ":" + pad_(m) : null;
}

/** Cellule date + heure → Date (null = vide, false = illisible). Accepte une cellule date, JJ/MM/AAAA HH:MM. */
function cellDateTime_(v) {
  if (v === "" || v == null) return null;
  if (isDate_(v)) return v;
  var p = String(v).trim().replace(/^'/, "").match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2})[:h](\d{2}))?$/);
  if (!p) return false;
  var day = cellDate_(p[1] + "/" + p[2] + "/" + p[3]);
  if (!day) return false;
  return at_(day, p[4] ? pad_(+p[4]) + ":" + p[5] : "00:00");
}

/** Instant (Date) d'un jour + heure, à l'heure de Bruxelles. */
function at_(day, time) { return Utilities.parseDate(day + " " + (time || "00:00"), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm"); }

function nextDay_(day) {
  var p = day.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1));
  return d.getUTCFullYear() + "-" + pad_(d.getUTCMonth() + 1) + "-" + pad_(d.getUTCDate());
}

function frDate_(day) { var p = day.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }

function frLongDate_(day) {
  var DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var p = day.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  return DAYS[d.getUTCDay()] + " " + (+p[2]) + " " + MONTHS[+p[1] - 1] + " " + p[0];
}

function boolCell_(v) {
  if (v === true) return true;
  return ["oui", "o", "x", "true", "vrai", "yes", "1"].indexOf(normalizeHeader_(v)) >= 0;
}

function int_(v) {
  if (v === "" || v == null) return null;
  var n = Number(String(v).replace(",", ".").trim());
  return isFinite(n) && Math.floor(n) === n ? n : NaN;
}

function hex_(bytes) {
  return bytes.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? "0" + h : h; }).join("");
}

function esc_(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function langCode_(v) {
  var s = normalizeHeader_(v);
  if (!s) return null;
  for (var i = 0; i < LANGUAGES.length; i++) {
    if (s === LANGUAGES[i][0] || s === normalizeHeader_(LANGUAGES[i][1])) return LANGUAGES[i][0];
  }
  return undefined;
}

function langName_(code) {
  for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i][0] === code) return LANGUAGES[i][1];
  return "";
}

/* ======================================================================= lecture des onglets */

/** Onglet → { sheet, values, col (champ → index), width } ou null s'il n'existe pas. */
function table_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  var header = values[0] || [];
  var col = {}, byHeader = {};
  COLS[name].forEach(function (c) { byHeader[normalizeHeader_(c[1])] = c[0]; });
  header.forEach(function (h, i) { var f = byHeader[normalizeHeader_(h)]; if (f && col[f] === undefined) col[f] = i; });
  return { name: name, sheet: sheet, values: values, col: col, width: Math.max(header.length, 1) };
}

function get_(t, row, f) { return t.col[f] === undefined ? "" : row[t.col[f]]; }

/* Une case à cocher décochée (false) ne rend pas une ligne « remplie » : sinon les 1 000 lignes préparées avec des cases
   apparaîtraient comme des sessions incomplètes. */
function emptyRow_(row) { return !row.some(function (v) { return v !== false && String(v).trim() !== ""; }); }

/** Ligne prête à écrire dans un onglet (un tableau de la largeur de l'en-tête). */
function rowFor_(t, data) {
  var row = [];
  for (var c = 0; c < t.width; c++) row.push("");
  Object.keys(data).forEach(function (f) { if (t.col[f] !== undefined) row[t.col[f]] = data[f]; });
  return row;
}

function appendRows_(t, rows) {
  if (!rows.length) return;
  var first = t.sheet.getLastRow() + 1;
  /* Une feuille Google a 1 000 lignes au départ : on en ajoute avant d'écrire au-delà (sinon « hors des dimensions »). */
  var missing = first + rows.length - 1 - t.sheet.getMaxRows();
  if (missing > 0) t.sheet.insertRowsAfter(t.sheet.getMaxRows(), missing + 200);
  t.sheet.getRange(first, 1, rows.length, t.width).setValues(rows);
  rows.forEach(function (r) { t.values.push(r); });
}

function setCell_(t, line, f, value) {
  if (t.col[f] === undefined) return;
  t.sheet.getRange(line, t.col[f] + 1).setValue(value);
  if (t.values[line - 1]) t.values[line - 1][t.col[f]] = value;
}

/** Formations : { list, byId, find(texte) } — `find` accepte l'identifiant ou le nom. */
function readFormations_() {
  var t = table_(TAB.FORMATIONS), list = [];
  if (t) {
    for (var r = 1; r < t.values.length; r++) {
      var row = t.values[r];
      if (emptyRow_(row)) continue;
      var id = clean_(get_(t, row, "id"), 64).toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) continue;
      list.push({ id: id, name: clean_(get_(t, row, "name"), 160) || id, bookable: t.col.bookable === undefined || get_(t, row, "bookable") === "" || boolCell_(get_(t, row, "bookable")) });
    }
  }
  if (!list.length) list = FORMATIONS.map(function (f) { return { id: f[0], name: f[1], bookable: true }; });
  var byId = {}, byName = {};
  list.forEach(function (f) { byId[f.id] = f; byName[normalizeHeader_(f.name)] = f; });
  return {
    list: list, byId: byId,
    find: function (v) { var s = clean_(v); return byId[s.toLowerCase()] || byName[normalizeHeader_(s)] || null; }
  };
}

/** Sessions de la feuille, avec leurs problèmes éventuels (une session invalide n'est jamais publiée). */
function readSessions_(formations) {
  var t = table_(TAB.SESSIONS), list = [], byId = {};
  if (!t) return { t: null, list: list, byId: byId };
  for (var r = 1; r < t.values.length; r++) {
    var row = t.values[r];
    if (emptyRow_(row)) continue;
    var f = formations.find(get_(t, row, "training"));
    var s = {
      line: r + 1,
      id: clean_(get_(t, row, "id"), 64),
      training: f ? f.id : null,
      trainingName: f ? f.name : clean_(get_(t, row, "training"), 160),
      date: cellDate_(get_(t, row, "date")),
      start: cellTime_(get_(t, row, "start")),
      end: cellTime_(get_(t, row, "end")),
      capacity: int_(get_(t, row, "capacity")),
      statusRaw: clean_(get_(t, row, "status")),
      closes: cellDateTime_(get_(t, row, "closes")),
      language: langCode_(get_(t, row, "language")),
      location: clean_(get_(t, row, "location"), 160),
      published: boolCell_(get_(t, row, "published")),
      outlookId: clean_(get_(t, row, "outlook_id"), 400),
      outlookSent: String(get_(t, row, "outlook_sent") || ""),
      syncTries: int_(get_(t, row, "sync_tries")) || 0,
      syncNext: isDate_(get_(t, row, "sync_next")) ? get_(t, row, "sync_next") : null,
      generation: int_(get_(t, row, "generation")) || 0,
      problems: []
    };
    var st = normalizeHeader_(s.statusRaw);
    s.status = !st || st === "ouverte" || st === "ouvert" || st === "open" ? "open"
      : st === "fermee" || st === "ferme" || st === "closed" ? "closed"
      : st === "annulee" || st === "annule" || st === "cancelled" ? "cancelled" : null;
    if (!s.id) s.problems.push("identifiant manquant");
    else if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(s.id)) s.problems.push("identifiant invalide (minuscules, chiffres, tirets)");
    else if (byId[s.id]) s.problems.push("identifiant déjà utilisé ligne " + byId[s.id].line);
    if (!f) s.problems.push("formation inconnue (choisissez-la dans la liste)");
    if (!s.date) s.problems.push(s.date === null ? "date illisible (JJ/MM/AAAA)" : "date manquante");
    if (s.start === null) s.problems.push("heure de début illisible (HH:MM)");
    if (s.end === null) s.problems.push("heure de fin illisible (HH:MM)");
    if (s.start && s.end && s.end <= s.start) s.problems.push("la fin doit être après le début");
    if (s.end && !s.start) s.problems.push("heure de fin sans heure de début");
    if (s.capacity === null || isNaN(s.capacity) || s.capacity < 1 || s.capacity > 500) s.problems.push("places (total) : nombre entier de 1 à 500");
    if (s.status === null) s.problems.push("statut incompris (Ouverte, Fermée ou Annulée)");
    if (s.closes === false) s.problems.push("fin des inscriptions illisible (JJ/MM/AAAA HH:MM)");
    if (s.language === undefined) s.problems.push("langue inconnue");
    s.valid = !s.problems.length;
    list.push(s);
    if (s.id && !byId[s.id]) byId[s.id] = s;
  }
  return { t: t, list: list, byId: byId };
}

function startOf_(s) { return at_(s.date, s.start || "00:00"); }
function endOf_(s) { return s.end ? at_(s.date, s.end) : at_(nextDay_(s.date), "00:00"); }
function closesOf_(s) { return s.closes ? s.closes : new Date(startOf_(s).getTime() - CONFIG.CLOSE_HOURS_BEFORE * 3600000); }
function whenText_(s) { return frDate_(s.date) + (s.start ? " · " + s.start + (s.end ? "–" + s.end : "") : ""); }

/** Statut d'une ligne de réservation → confirmed | pending | cancelled | request | expired | null. */
function bookingStatus_(v) {
  var s = normalizeHeader_(v);
  if (["confirmee", "confirme", "confirmed", "ok"].indexOf(s) >= 0) return "confirmed";
  if (["en_attente", "attente", "pending"].indexOf(s) >= 0) return "pending";
  if (["annulee", "annule", "cancelled"].indexOf(s) >= 0) return "cancelled";
  if (s.indexOf("demande") === 0 || s === "request") return "request";
  if (["expiree", "expire", "expired"].indexOf(s) >= 0) return "expired";
  return null;
}

function readBookings_() {
  var t = table_(TAB.BOOKINGS), rows = [];
  if (!t) return { t: null, rows: rows };
  for (var r = 1; r < t.values.length; r++) {
    var row = t.values[r];
    if (emptyRow_(row)) continue;
    var exp = get_(t, row, "expires");
    rows.push({
      line: r + 1,
      ref: clean_(get_(t, row, "ref"), 40),
      session: clean_(get_(t, row, "session"), 64),
      training: clean_(get_(t, row, "training"), 160),
      when: clean_(get_(t, row, "when"), 80),
      seats: int_(get_(t, row, "seats")),
      statusRaw: clean_(get_(t, row, "status")),
      status: bookingStatus_(get_(t, row, "status")),
      name: clean_(get_(t, row, "name"), 160),
      email: clean_(get_(t, row, "email"), 160),
      company: clean_(get_(t, row, "company"), 160),
      phone: clean_(get_(t, row, "phone"), 60),
      participants: clean_(get_(t, row, "participants"), 2000),
      expires: isDate_(exp) ? exp : cellDateTime_(exp) || null,
      request: clean_(get_(t, row, "request"), 80)
    });
  }
  return { t: t, rows: rows };
}

/** Une ligne de réservation occupe-t-elle des places ? (Confirmée, ou En attente non expirée.) */
function holdsSeats_(b, now) {
  if (b.status === "confirmed") return true;
  return b.status === "pending" && (!b.expires || b.expires.getTime() > now.getTime());
}

/** Places occupées par session, recalculées à partir des réservations ENREGISTRÉES. */
function taken_(bookings, now) {
  var out = {};
  bookings.forEach(function (b) {
    if (!b.session || !holdsSeats_(b, now)) return;
    var n = b.seats > 0 ? b.seats : 0;
    out[b.session] = (out[b.session] || 0) + n;
  });
  return out;
}

/** open | full | closed | cancelled — ce que le site affiche. */
function publicStatus_(s, remaining, now) {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "closed" || now.getTime() >= closesOf_(s).getTime()) return "closed";
  if (remaining <= 0) return "full";
  return "open";
}

/** Recalcule « Réservées » et « Restantes » de toutes les sessions (jamais saisies à la main). */
function refreshCounts_(sessions, taken) {
  var t = sessions.t;
  if (!t || t.values.length < 2) return;
  var n = t.values.length - 1, byLine = {};
  sessions.list.forEach(function (s) { byLine[s.line] = s; });
  ["booked", "remaining"].forEach(function (f) {
    if (t.col[f] === undefined) return;
    var out = [];
    for (var r = 1; r <= n; r++) {
      var s = byLine[r + 1];
      if (!s || !s.id) { out.push([""]); continue; }
      var booked = taken[s.id] || 0;
      var cap = s.capacity > 0 ? s.capacity : 0;
      out.push([f === "booked" ? booked : Math.max(0, cap - booked)]);
    }
    t.sheet.getRange(2, t.col[f] + 1, n, 1).setValues(out);
  });
}

function refreshAll_() {
  var formations = readFormations_(), sessions = readSessions_(formations), bookings = readBookings_();
  refreshCounts_(sessions, taken_(bookings.rows, now_()));
}

/* ======================================================================= liste publique (GET) */

/** Ce que le site reçoit : les sessions PUBLIÉES, valides, à venir. Jamais une réservation ni une donnée personnelle. */
function publicSessions_() {
  var now = now_();
  var formations = readFormations_(), sessions = readSessions_(formations), bookings = readBookings_();
  var taken = taken_(bookings.rows, now);
  var out = sessions.list.filter(function (s) {
    return s.valid && s.published && s.status !== "cancelled" && endOf_(s).getTime() > now.getTime();
  }).map(function (s) {
    var remaining = Math.max(0, s.capacity - (taken[s.id] || 0));
    return {
      id: s.id, training: s.training, date: s.date,
      startTime: s.start || null, endTime: s.end || null,
      language: s.language || null, location: s.location || null,
      capacity: s.capacity, seatsLeft: remaining,
      status: publicStatus_(s, remaining, now),
      closesAt: fmt_(closesOf_(s), "yyyy-MM-dd'T'HH:mm")
    };
  }).sort(function (a, b) {
    var ka = a.date + (a.startTime || ""), kb = b.date + (b.startTime || "");
    return ka < kb ? -1 : ka > kb ? 1 : (a.id < b.id ? -1 : 1);
  });
  return { status: "ok", version: VERSION, generatedAt: fmt_(now, "yyyy-MM-dd'T'HH:mm"), sessions: out.slice(0, 200) };
}

/** État de la feuille, SANS aucune donnée personnelle ni session non publiée (nombres et raisons génériques) :
    permet de diagnostiquer une installation à distance. */
function health_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), tabs = {};
  Object.keys(TAB).forEach(function (k) { tabs[TAB[k]] = !!ss.getSheetByName(TAB[k]); });
  var formations = readFormations_(), sessions = readSessions_(formations), now = now_();
  var reasons = {};
  sessions.list.forEach(function (s) { s.problems.forEach(function (p) { var k = p.replace(/ligne \d+/, "ligne ?"); reasons[k] = (reasons[k] || 0) + 1; }); });
  var hasTrigger = false;
  try { hasTrigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "tick"; }); } catch (e) { hasTrigger = null; }
  /* File d'envoi et demandes : uniquement des COMPTES (aucune adresse, aucun nom). */
  var outbox = { pending: 0, sent: 0, failed: 0, lastSentAt: null }, ob = table_(TAB.OUTBOX);
  if (ob) for (var r = 1; r < ob.values.length; r++) {
    var st = clean_(get_(ob, ob.values[r], "status"));
    if (st === Q_TODO) outbox.pending++; else if (st === Q_FAILED) outbox.failed++;
    else if (st === Q_SENT) { outbox.sent++; var c = get_(ob, ob.values[r], "created"); if (isDate_(c) && (!outbox.lastSentAt || c > outbox.lastSentAt)) outbox.lastSentAt = c; }
  }
  if (outbox.lastSentAt) outbox.lastSentAt = fmt_(outbox.lastSentAt, "yyyy-MM-dd'T'HH:mm");
  var requests = { total: 0, open: 0 }, rq = table_(TAB.REQUESTS);
  if (rq) for (var q = 1; q < rq.values.length; q++) {
    if (emptyRow_(rq.values[q])) continue;
    requests.total++;
    if (clean_(get_(rq, rq.values[q], "status")) === R_NEW) requests.open++;
  }
  var quotaLow = false;
  try { quotaLow = !msConfig_() && MailApp.getRemainingDailyQuota() < CONFIG.CONTACT_ACK_MIN_QUOTA; } catch (e) { quotaLow = null; }
  return {
    status: "ok", version: VERSION, features: ["sessions", "book", "contact"], outlook: !!msConfig_(), timezone: CONFIG.TIMEZONE,
    tabs: tabs, automaticTask: hasTrigger,
    mail: { sender: msConfig_() ? "microsoft365" : "google", notify: !!CONFIG.NOTIFY_EMAIL, quotaLow: quotaLow, outbox: outbox },
    requests: requests,
    sessions: {
      rows: sessions.list.length,
      valid: sessions.list.filter(function (s) { return s.valid; }).length,
      published: sessions.list.filter(function (s) { return s.valid && s.published; }).length,
      upcoming: sessions.list.filter(function (s) { return s.valid && s.published && s.status !== "cancelled" && endOf_(s).getTime() > now.getTime(); }).length,
      problems: reasons
    }
  };
}

var CACHE_KEY = "reservations:sessions:v1";

function clearCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) { /* le cache expirera de lui-même */ }
}

/** Appel du site : GET ?action=sessions (défaut) | health. */
function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action ? String(e.parameter.action) : "sessions";
    if (action === "health") return json_(health_());
    if (action !== "sessions") return json_({ status: "error" });
    var cache = CacheService.getScriptCache(), hit = cache.get(CACHE_KEY);
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    var text = JSON.stringify(publicSessions_());
    if (text.length < 90000) { try { cache.put(CACHE_KEY, text, CONFIG.CACHE_SECONDS); } catch (err) { /* non gardé */ } }
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ status: "error" });
  }
}

/* ======================================================================= réservation (POST) */

var EMAIL_RE = /^[^@\s"<>]+@[^@\s"<>]+\.[^@\s"<>]{2,}$/;
var REQUEST_RE = /^[A-Za-z0-9_-]{8,64}$/;
var SESSION_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;

/** Revalide TOUT ce qu'envoie le site (le formulaire peut être contourné). */
function validateOrder_(body, formations) {
  var fields = {};
  var c = body.customer && typeof body.customer === "object" ? body.customer : {};
  var b = body.billing && typeof body.billing === "object" ? body.billing : {};
  var order = {
    requestId: String(body.requestId == null ? "" : body.requestId),
    lang: /^[a-z]{2}$/.test(String(body.lang || "")) ? String(body.lang) : "fr",
    customer: { firstName: clean_(c.firstName), lastName: clean_(c.lastName), email: clean_(c.email).toLowerCase(), phone: clean_(c.phone) },
    billing: { company: clean_(b.company), vat: clean_(b.vat), address: clean_(b.address), zip: clean_(b.zip), city: clean_(b.city), country: clean_(b.country) },
    items: []
  };
  if (!REQUEST_RE.test(order.requestId)) fields.requestId = "invalid";
  var LIM = { firstName: 80, lastName: 80, email: 160, phone: 40 };
  ["firstName", "lastName", "phone"].forEach(function (k) { if (!order.customer[k]) fields[k] = "required"; });
  if (!EMAIL_RE.test(order.customer.email)) fields.email = "invalid";
  Object.keys(LIM).forEach(function (k) { if (order.customer[k].length > LIM[k]) fields[k] = "too_long"; });
  var BLIM = { company: 120, vat: 40, address: 200, zip: 20, city: 80, country: 40 };
  ["address", "zip", "city", "country"].forEach(function (k) { if (!order.billing[k]) fields[k] = "required"; });
  Object.keys(BLIM).forEach(function (k) { if (order.billing[k].length > BLIM[k]) fields[k] = "too_long"; });

  var items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > CONFIG.MAX_ITEMS) fields.items = "invalid";
  var seen = {};
  items.slice(0, CONFIG.MAX_ITEMS).forEach(function (it) {
    if (!it || typeof it !== "object") { fields.items = "invalid"; return; }
    var f = formations.byId[String(it.training || "").toLowerCase()];
    var q = Number(it.quantity);
    var sid = it.sessionId == null || it.sessionId === "" ? null : String(it.sessionId);
    if (!f || !f.bookable) { fields.items = "unknown_training"; return; }
    if (!(q >= 1 && q <= CONFIG.MAX_SEATS_PER_ITEM) || Math.floor(q) !== q) { fields.items = "invalid_quantity"; return; }
    if (sid !== null && !SESSION_RE.test(sid)) { fields.items = "invalid_session"; return; }
    var key = f.id + "|" + (sid || "");
    if (seen[key]) { fields.items = "duplicate"; return; }
    seen[key] = true;
    var people = null;
    if (Array.isArray(it.participants)) {
      people = it.participants.slice(0, q).map(function (p) {
        p = p && typeof p === "object" ? p : {};
        var e = clean_(p.email, 160).toLowerCase();
        return { firstName: clean_(p.firstName, 80), lastName: clean_(p.lastName, 80), email: EMAIL_RE.test(e) ? e : "" };
      }).filter(function (p) { return p.firstName || p.lastName; });
    }
    order.items.push({ training: f.id, trainingName: f.name, sessionId: sid, quantity: q, participants: people });
  });
  return { order: order, fields: fields };
}

/** Limites d'envoi. Renvoie le nombre de secondes à attendre (0 = autorisé). Compte la demande si elle est autorisée.
    `kind` = "c" : compteurs séparés pour les demandes des formulaires (CONFIG.CONTACT_*). */
function rateLimit_(email, kind) {
  var cache = CacheService.getScriptCache(), k = kind === "c" ? "c" : "r";
  var L = k === "c" ? { hour: CONFIG.CONTACT_GLOBAL_PER_HOUR, six: CONFIG.CONTACT_GLOBAL_PER_6_HOURS, email: CONFIG.CONTACT_PER_EMAIL_PER_HOUR }
    : { hour: CONFIG.GLOBAL_PER_HOUR, six: CONFIG.GLOBAL_PER_6_HOURS, email: CONFIG.PER_EMAIL_PER_HOUR };
  var t = now_().getTime(), hour = Math.floor(t / 3600000), quarter = Math.floor(t / 21600000);
  var untilHour = Math.ceil(((hour + 1) * 3600000 - t) / 1000), untilQuarter = Math.ceil(((quarter + 1) * 21600000 - t) / 1000);
  var counters = [
    { k: k + ":h:" + hour, limit: L.hour, ttl: untilHour + 60, retry: untilHour },
    { k: k + ":q:" + quarter, limit: L.six, ttl: Math.min(21600, untilQuarter + 60), retry: untilQuarter },
    { k: k + ":e:" + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email, Utilities.Charset.UTF_8)).slice(0, 40) + ":" + hour,
      limit: L.email, ttl: untilHour + 60, retry: untilHour }
  ];
  var values = cache.getAll(counters.map(function (c) { return c.k; })) || {};
  for (var i = 0; i < counters.length; i++) {
    if (Number(values[counters[i].k] || 0) >= counters[i].limit) return Math.max(60, counters[i].retry);
  }
  counters.forEach(function (c) { cache.put(c.k, String(Number(values[c.k] || 0) + 1), Math.min(21600, Math.max(60, c.ttl))); });
  return 0;
}

var REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans 0/O ni 1/I (lisible au téléphone)

/** Référence lisible : WSR-AAAA-XXXXX (réservation) ou, avec `prefix` = "WSC", WSC-AAAA-XXXXX (demande). */
function newReference_(taken, prefix) {
  var year = fmt_(now_(), "yyyy"), pre = prefix || "WSR";
  for (var tries = 0; tries < 50; tries++) {
    var s = "";
    for (var i = 0; i < 5; i++) s += REF_CHARS.charAt(Math.floor(Math.random() * REF_CHARS.length));
    var ref = pre + "-" + year + "-" + s;
    if (!taken[ref]) return ref;
  }
  return pre + "-" + year + "-" + now_().getTime().toString(36).toUpperCase().slice(-6);
}

function itemStatus_(statusCode) { return statusCode === "confirmed" ? "confirmed" : statusCode === "pending" ? "pending" : "request"; }

/**
 * Enregistre une demande. Les places sont vérifiées puis écrites SOUS VERROU : deux demandes simultanées passent l'une
 * après l'autre, et la seconde voit les places prises par la première. Tout ou rien : si une session n'a plus assez de
 * places, AUCUNE ligne n'est écrite.
 * @returns {Object} ok (reference, items) | invalid (fields) | unavailable (problems) | rate_limited | busy | error
 */
function submitBooking_(body) {
  /* Champ piège rempli = robot : réponse normale, rien n'est enregistré. */
  if (clean_(body.website)) return { status: "ok", reference: newReference_({}), items: [] };
  var formations = readFormations_();
  var v = validateOrder_(body, formations);
  if (Object.keys(v.fields).length) return { status: "invalid", fields: v.fields };
  var order = v.order;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { status: "busy" };
  var result = null, written = null;
  try {
    var now = now_();
    /* Lecture FRAÎCHE, sous verrou : jamais une valeur lue avant d'avoir le verrou. */
    var bookings = readBookings_();
    if (!bookings.t) { setupTabs_(); bookings = readBookings_(); }
    var already = bookings.rows.filter(function (b) { return b.request && b.request === order.requestId; });
    if (already.length) {
      return { status: "ok", reference: already[0].ref, duplicate: true, items: already.map(function (b) {
        return { training: (formations.find(b.training) || {}).id || null, sessionId: b.session || null, seats: b.seats, status: itemStatus_(b.status) };
      }) };
    }
    var wait = rateLimit_(order.customer.email);
    if (wait > 0) return { status: "rate_limited", retryAfter: wait };

    var sessions = readSessions_(formations);
    var taken = taken_(bookings.rows, now);
    var need = {}, problems = [];
    order.items.forEach(function (it) { if (it.sessionId) need[it.sessionId] = (need[it.sessionId] || 0) + it.quantity; });
    order.items.forEach(function (it) {
      if (!it.sessionId || need[it.sessionId] === -1) return;
      var s = sessions.byId[it.sessionId];
      if (!s || !s.valid || !s.published || s.training !== it.training) { problems.push({ sessionId: it.sessionId, reason: "unknown" }); need[it.sessionId] = -1; return; }
      var remaining = Math.max(0, s.capacity - (taken[s.id] || 0));
      var st = publicStatus_(s, remaining, now);
      if (st === "cancelled" || st === "closed") problems.push({ sessionId: s.id, reason: st, remaining: remaining });
      else if (remaining <= 0) problems.push({ sessionId: s.id, reason: "full", remaining: 0 });
      else if (need[s.id] > remaining) problems.push({ sessionId: s.id, reason: "insufficient", remaining: remaining });
      need[s.id] = -1;   // un seul contrôle par session
    });
    if (problems.length) return { status: "unavailable", problems: problems };

    var refs = {};
    bookings.rows.forEach(function (b) { if (b.ref) refs[b.ref] = true; });
    var ref = newReference_(refs);
    var people = table_(TAB.PEOPLE);
    var manual = CONFIG.CONFIRMATION === "manual";
    var c = order.customer, bi = order.billing;
    var address = [bi.address, [bi.zip, bi.city].join(" ").trim(), bi.country].filter(Boolean).join(", ");
    var bookingRows = [], peopleRows = [], items = [];
    order.items.forEach(function (it) {
      var s = it.sessionId ? sessions.byId[it.sessionId] : null;
      var status = s ? (manual ? B_PENDING : B_CONFIRMED) : B_REQUEST;
      var names = it.participants === null ? "À communiquer" :
        it.participants.map(function (p) { return [p.firstName, p.lastName].join(" ").trim(); }).join(" · ") || "À communiquer";
      bookingRows.push(rowFor_(bookings.t, {
        received: now, ref: ref, session: s ? s.id : "", training: it.trainingName, when: s ? whenText_(s) : "À convenir",
        seats: it.quantity, status: status,
        name: asText_([c.firstName, c.lastName].join(" ")), email: asText_(c.email), phone: asText_(c.phone),
        company: asText_(bi.company), vat: asText_(bi.vat), address: asText_(address), participants: asText_(names),
        lang: order.lang, expires: s && manual ? new Date(now.getTime() + CONFIG.PENDING_HOURS * 3600000) : "",
        request: order.requestId
      }));
      (it.participants || []).forEach(function (p) {
        if (people) peopleRows.push(rowFor_(people, { ref: ref, session: s ? s.id : "", training: it.trainingName, first: asText_(p.firstName), last: asText_(p.lastName), email: asText_(p.email) }));
      });
      items.push({ training: it.training, sessionId: s ? s.id : null, seats: it.quantity, status: s ? (manual ? "pending" : "confirmed") : "request" });
    });
    appendRows_(bookings.t, bookingRows);
    if (people) appendRows_(people, peopleRows);
    var after = readBookings_();
    var takenAfter = taken_(after.rows, now);
    refreshCounts_(sessions, takenAfter);
    SpreadsheetApp.flush();   // la demande suivante (après le verrou) voit ces lignes
    result = { status: "ok", reference: ref, items: items };
    written = { ref: ref, order: order, items: items, sessions: sessions, taken: takenAfter };
  } finally {
    lock.releaseLock();
  }
  clearCache_();
  try {
    queueBookingEmails_(written);
    processOutbox_(4);
  } catch (err) {
    log_("E-mail", written.ref, "Erreur", "Envoi différé : " + String(err && err.message || err).slice(0, 300));
  }
  return result;
}

/** Appel du site : POST { action: "book", … } (réservation) ou { action: "contact", … } (demande d'un formulaire). */
function doPost(e) {
  var action = "";
  try {
    var raw = (e && e.postData && e.postData.contents) || "{}";
    if (raw.length > 40000) return json_({ status: "invalid", fields: { items: "too_long" } });
    var body = {};
    try { body = JSON.parse(raw) || {}; } catch (err) { body = {}; }
    if (typeof body !== "object" || Array.isArray(body)) body = {};
    action = body.action;
    if (action === "book") return json_(submitBooking_(body));
    if (action === "contact") return json_(submitContact_(body));
    return json_({ status: "error" });
  } catch (err) {
    try { log_(action === "contact" ? "Demande" : "Réservation", "", "Erreur", String(err && err.message || err).slice(0, 300)); } catch (e2) { /* journal indisponible */ }
    return json_({ status: "error" });
  }
}

/* ======================================================================= demandes des formulaires (POST action "contact")

   Formulaires de contact / devis, WiSy Coordination et test d'éligibilité PEB. Chaque demande est :
   1. revalidée ici (le formulaire du navigateur peut être contourné) ;
   2. enregistrée dans l'onglet « Demandes » SOUS VERROU (une même clé de requête renvoie la même référence : un nouvel
      essai après une coupure réseau ne crée jamais de doublon) ;
   3. envoyée à l'équipe (CONFIG.NOTIFY_EMAIL) avec « Répondre à » = le visiteur, + accusé de réception au visiteur ;
      un e-mail qui échoue reste dans la « File d'envoi » et est réessayé (5 min, 15 min, 1 h…) — la demande, elle,
      est déjà en sécurité dans la feuille.
   Le site n'affiche « demande reçue » qu'après la réponse « ok » de ce script. */

var CONTACT_FORMS = {
  contact: { label: "Contact", messageRequired: true, subjects: {
    devis: "Demande de devis", inscription: "Inscription à une formation", conseil: "Conseil & accompagnement sécurité",
    coordination: "Coordination sécurité-santé", peb: "Certification PEB", autre: "Autre question" } },
  coordination: { label: "Coordination", messageRequired: false, subject: "Coordination sécurité-santé (WiSy Coordination)" },
  peb: { label: "Test PEB", messageRequired: false, subject: "Certification PEB — test d'éligibilité" }
};
var PHONE_RE = /^[0-9+().\/\s-]{6,40}$/;
var PAGE_RE = /^\/[A-Za-z0-9._\/-]{0,120}$/;

/** Texte long saisi par un visiteur : retours à la ligne gardés, autres caractères de contrôle retirés. */
function cleanText_(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F\u200B-\u200D\uFEFF]/g, " ")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Revalide une demande. Renvoie { req, fields } — `fields` non vide = demande refusée (champ → raison). */
function validateContact_(body) {
  var fields = {}, form = CONTACT_FORMS[String(body.form || "")];
  var req = {
    requestId: String(body.requestId == null ? "" : body.requestId),
    form: form ? String(body.form) : "",
    lang: /^[a-z]{2}$/.test(String(body.lang || "")) ? String(body.lang) : "fr",
    name: clean_(body.name), email: clean_(body.email).toLowerCase(), phone: clean_(body.phone), company: clean_(body.company),
    subjectCode: clean_(body.subject, 40).toLowerCase(), subject: "", message: cleanText_(body.message),
    page: PAGE_RE.test(String(body.page || "")) ? String(body.page) : "", details: []
  };
  if (!REQUEST_RE.test(req.requestId)) fields.requestId = "invalid";
  if (!form) { fields.form = "invalid"; return { req: req, fields: fields }; }
  /* Au moins un caractère qui n'est ni un chiffre, ni une ponctuation ASCII, ni un espace : une lettre, quelle que soit
     l'écriture (latine, cyrillique, arabe, chinoise…). */
  if (!req.name || !/[^\s0-9!-\/:-@\[-`{-~]/.test(req.name)) fields.name = "required";
  else if (req.name.length > 120) fields.name = "too_long";
  if (req.email.length > 160 || !EMAIL_RE.test(req.email)) fields.email = "invalid";
  if (req.phone && (req.phone.length > 40 || !PHONE_RE.test(req.phone))) fields.phone = "invalid";
  if (req.company.length > 120) fields.company = "too_long";
  if (form.subjects) {
    req.subject = form.subjects[req.subjectCode] || "";
    if (!req.subject) fields.subject = "invalid";
  } else req.subject = form.subject;
  if (req.message.length > 5000) fields.message = "too_long";
  else if (form.messageRequired && req.message.length < 3) fields.message = "required";
  if (body.consent !== true) fields.consent = "required";
  var details = Array.isArray(body.details) ? body.details : [];
  if (details.length > 12) fields.details = "invalid";
  details.slice(0, 12).forEach(function (d) {
    if (!Array.isArray(d) || d.length !== 2) { fields.details = "invalid"; return; }
    var label = clean_(d[0]), value = clean_(Array.isArray(d[1]) ? d[1].join(", ") : d[1]);
    if (!label || label.length > 60 || value.length > 400) { fields.details = "invalid"; return; }
    if (value) req.details.push([label, value]);
  });
  return { req: req, fields: fields };
}

/** Message manifestement publicitaire : beaucoup de liens (gardé dans la feuille en « Indésirable », sans e-mail). */
function looksLikeSpam_(req) {
  var text = [req.name, req.company, req.message].concat(req.details.map(function (d) { return d[1]; })).join(" ");
  return (text.match(/https?:\/\/|www\./gi) || []).length >= 4;
}

/**
 * Enregistre une demande d'un formulaire du site.
 * @returns {Object} ok (reference, duplicate?, notified) | invalid (fields) | rate_limited (retryAfter) | busy
 */
function submitContact_(body) {
  /* Champ piège rempli, ou formulaire envoyé en moins de CONTACT_MIN_FILL_MS : robot → réponse normale, rien d'enregistré. */
  var elapsed = Number(body.elapsed);
  if (clean_(body.website) || (isFinite(elapsed) && elapsed >= 0 && elapsed < CONFIG.CONTACT_MIN_FILL_MS)) {
    return { status: "ok", reference: newReference_({}, "WSC"), notified: true };
  }
  var v = validateContact_(body);
  if (Object.keys(v.fields).length) return { status: "invalid", fields: v.fields };
  var req = v.req, form = CONTACT_FORMS[req.form];

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "busy" };
  var ref, line, spam = looksLikeSpam_(req);
  try {
    ensureTab_(TAB.REQUESTS); ensureOutboxReply_();
    var t = table_(TAB.REQUESTS), refs = {};
    for (var r = 1; r < t.values.length; r++) {
      var row = t.values[r], key = String(get_(t, row, "request") || "");
      refs[clean_(get_(t, row, "ref"))] = true;
      if (key && key === req.requestId) return { status: "ok", reference: clean_(get_(t, row, "ref")), duplicate: true, notified: true };
    }
    var wait = rateLimit_(req.email, "c");
    if (wait > 0) return { status: "rate_limited", retryAfter: wait };
    ref = newReference_(refs, "WSC");
    appendRows_(t, [rowFor_(t, {
      received: now_(), ref: ref, form: form.label, subject: req.subject, name: asText_(req.name), email: asText_(req.email),
      phone: asText_(req.phone), company: asText_(req.company), message: asText_(req.message),
      details: asText_(req.details.map(function (d) { return d[0] + " : " + d[1]; }).join("\n")),
      page: asText_(req.page), lang: req.lang, status: spam ? R_SPAM : R_NEW, mailed: spam ? "Non (indésirable)" : "En file",
      request: req.requestId
    })]);
    line = t.values.length;
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (spam) return { status: "ok", reference: ref, notified: true };

  var notified = false;
  try {
    var teamLine = queueContactEmails_(ref, req, form);
    processOutbox_(4);
    var ob = table_(TAB.OUTBOX);
    notified = !!(teamLine && ob && clean_(get_(ob, ob.values[teamLine - 1] || [], "status")) === Q_SENT);
    var t2 = table_(TAB.REQUESTS);
    if (t2) setCell_(t2, line, "mailed", notified ? "Envoyé" : "En file (réessai automatique)");
  } catch (err) {
    log_("Demande", ref, "Erreur", "Envoi différé : " + String(err && err.message || err).slice(0, 300));
  }
  return { status: "ok", reference: ref, notified: notified };
}

/** Prépare l'e-mail à l'équipe (Répondre à = visiteur) et l'accusé de réception. Renvoie la ligne de l'e-mail équipe. */
function queueContactEmails_(ref, req, form) {
  var rows = [
    ["Formulaire", form.label], ["Sujet", req.subject], ["Nom", req.name],
    ["E-mail", '<a href="mailto:' + esc_(req.email) + '">' + esc_(req.email) + "</a>", true],
    ["Téléphone", req.phone ? '<a href="tel:' + esc_(req.phone.replace(/[^0-9+]/g, "")) + '">' + esc_(req.phone) + "</a>" : "—", !!req.phone],
    ["Société", req.company || "—"]
  ].concat(req.details).concat([
    ["Page", req.page ? '<a href="' + esc_(CONFIG.SITE_URL.replace(/\/$/, "") + req.page) + '">' + esc_(req.page) + "</a>" : "—", !!req.page],
    ["Langue du site", langName_(req.lang) || req.lang], ["Reçue le", fmt_(now_(), "dd/MM/yyyy HH:mm") + " (heure de Bruxelles)"], ["Référence", ref]
  ]);
  var table = '<table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">' + rows.map(function (r) {
    return '<tr><td style="color:#5E6D6A;white-space:nowrap;vertical-align:top;border-bottom:1px solid #eef3f2">' + esc_(r[0]) +
      '</td><td style="border-bottom:1px solid #eef3f2">' + (r[2] ? r[1] : esc_(r[1])) + "</td></tr>";
  }).join("") + "</table>";
  var message = req.message ? '<p style="margin:18px 0 6px;color:#5E6D6A">Message</p><div style="white-space:pre-wrap;background:#F4FAF9;border-radius:8px;padding:12px 14px">' + esc_(req.message) + "</div>" : "";
  var team = emailFrame_("Nouvelle demande depuis le site — " + req.subject,
    "<p>Pour répondre à <b>" + esc_(req.name) + "</b>, utilisez simplement « Répondre » : la réponse part vers " + esc_(req.email) + ".</p>" +
    table + message + '<p style="color:#5E6D6A;font-size:13px">Suivi : onglet « ' + esc_(TAB.REQUESTS) + " » de la feuille « " + esc_(CONFIG.FILE_NAME) + " » (colonne Statut).</p>");
  var who = clean_(req.name, 60);
  var teamLine = queue_("Demande (équipe)", CONFIG.NOTIFY_EMAIL, "[Site] " + req.subject + " — " + who + " (" + ref + ")", team, ref, req.email);

  if (CONFIG.CONTACT_ACK && (msConfig_() || MailApp.getRemainingDailyQuota() >= CONFIG.CONTACT_ACK_MIN_QUOTA)) {
    var A = ACK_TEXT[req.lang] || ACK_TEXT.fr;
    /* Jamais le message du visiteur dans l'accusé (le formulaire ne doit pas servir à envoyer du texte libre à un tiers) ;
       le nom n'est repris que s'il ressemble à un nom. */
    var greet = /^[^@:\/<>{}\[\]]{1,60}$/.test(who) && !/https?|www\./i.test(who) ? A.hello.replace("{name}", esc_(who)) : A.helloAnon;
    var ack = emailFrame_(A.title,
      "<p>" + greet + "</p><p>" + A.body.replace("{ref}", "<b>" + esc_(ref) + "</b>") + "</p>" +
      "<p>" + A.subject + " <b>" + esc_(req.subject) + "</b></p><p>" + A.reply.replace("{phone}", esc_(CONFIG.PHONE)) + "</p>" +
      '<p style="color:#5E6D6A;font-size:13px">' + A.auto + "</p>");
    queue_("Accusé de réception", req.email, A.mailSubject.replace("{ref}", ref), ack, ref, CONFIG.NOTIFY_EMAIL);
  }
  return teamLine;
}

/* Accusé de réception (le contenu de la demande n'y est PAS repris). Langues : fr, nl, en (les autres reçoivent fr). */
var ACK_TEXT = {
  fr: { title: "Nous avons bien reçu votre demande", mailSubject: "Wisy Safety — demande bien reçue ({ref})", hello: "Bonjour {name},", helloAnon: "Bonjour,",
    body: "Merci pour votre message. Votre demande est enregistrée sous la référence {ref}.", subject: "Sujet :",
    reply: "L'équipe Wisy Safety vous répond dans les meilleurs délais. Pour compléter votre demande, répondez simplement à cet e-mail ou appelez-nous au {phone}.",
    auto: "E-mail automatique envoyé à la suite d'une demande faite sur wisysafety.be. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message." },
  nl: { title: "Wij hebben uw aanvraag goed ontvangen", mailSubject: "Wisy Safety — aanvraag ontvangen ({ref})", hello: "Beste {name},", helloAnon: "Beste,",
    body: "Bedankt voor uw bericht. Uw aanvraag is geregistreerd onder referentie {ref}.", subject: "Onderwerp:",
    reply: "Het team van Wisy Safety antwoordt u zo snel mogelijk. Wilt u iets toevoegen? Beantwoord dan gewoon deze e-mail of bel ons op {phone}.",
    auto: "Automatische e-mail na een aanvraag op wisysafety.be. Heeft u deze aanvraag niet gedaan, dan mag u dit bericht negeren." },
  en: { title: "We have received your request", mailSubject: "Wisy Safety — request received ({ref})", hello: "Hello {name},", helloAnon: "Hello,",
    body: "Thank you for your message. Your request has been recorded under reference {ref}.", subject: "Subject:",
    reply: "The Wisy Safety team will get back to you as soon as possible. To add information, simply reply to this e-mail or call us on {phone}.",
    auto: "Automatic e-mail sent after a request made on wisysafety.be. If you did not make this request, please ignore this message." }
};

/** Crée l'onglet s'il manque (feuille installée avec une version précédente du script). */
function ensureTab_(name) {
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)) {
    setupTab_(SpreadsheetApp.getActiveSpreadsheet(), name);
    if (name === TAB.REQUESTS) formatRequestsTab_();
  }
}
/** Ajoute la colonne « Répondre à » de la file d'envoi si elle manque (sinon la réponse de l'équipe partirait vers elle-même). */
function ensureOutboxReply_() {
  var t = table_(TAB.OUTBOX);
  if (!t) { setupTab_(SpreadsheetApp.getActiveSpreadsheet(), TAB.OUTBOX); return; }
  if (t.col.reply === undefined) setupTab_(SpreadsheetApp.getActiveSpreadsheet(), TAB.OUTBOX);
}
/** Mise en forme de l'onglet « Demandes » : liste des statuts, couleurs, dates. */
function formatRequestsTab_() {
  var t = table_(TAB.REQUESTS);
  if (!t) return;
  var rows = Math.max(1, t.sheet.getMaxRows() - 1), status = t.sheet.getRange(2, t.col.status + 1, rows, 1);
  status.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(REQUEST_STATUSES, true).setAllowInvalid(true).build());
  t.sheet.getRange(2, t.col.received + 1, rows, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  t.sheet.getRange(2, t.col.message + 1, rows, 1).setWrap(true);
  t.sheet.getRange(2, t.col.details + 1, rows, 1).setWrap(true);
  var byText = function (text, bg, fg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([status]).build(); };
  t.sheet.setConditionalFormatRules([byText(R_NEW, "#FFF1D6", "#8A5A00"), byText(R_DOING, "#E3EEFF", "#1D4E89"), byText(R_DONE, "#DDF4EE", "#1F6F64"),
    byText(R_SPAM, "#ECEFEE", "#5E6D6A"), byText(R_ERASED, "#ECEFEE", "#5E6D6A")]);
}

/** Anonymise les demandes plus anciennes que CONFIG.REQUEST_RETENTION_MONTHS (0 = jamais). Renvoie le nombre traité. */
function purgeOldRequests_() {
  var months = Number(CONFIG.REQUEST_RETENTION_MONTHS) || 0, t = table_(TAB.REQUESTS);
  if (months <= 0 || !t) return 0;
  var limit = new Date(now_().getTime()), n = 0;
  limit.setMonth(limit.getMonth() - months);
  for (var r = 1; r < t.values.length; r++) {
    var row = t.values[r], when = get_(t, row, "received");
    if (!isDate_(when) || when.getTime() >= limit.getTime() || clean_(get_(t, row, "status")) === R_ERASED) continue;
    ["name", "email", "phone", "company", "message", "details", "page", "notes"].forEach(function (f) { setCell_(t, r + 1, f, ""); });
    setCell_(t, r + 1, "status", R_ERASED);
    n++;
  }
  if (n) log_("Demande", "", "Info", n + " demande(s) de plus de " + months + " mois anonymisée(s) (durée de conservation).");
  return n;
}

/* ======================================================================= e-mails (file d'envoi + réessais) */

function log_(kind, target, level, message) {
  var t = table_(TAB.LOG);
  if (!t) return;
  appendRows_(t, [rowFor_(t, { when: now_(), kind: kind, target: asText_(target || ""), level: level, message: asText_(message) })]);
}

/** Met un e-mail dans la file d'envoi. `replyTo` : adresse du bouton « Répondre » (défaut : CONFIG.NOTIFY_EMAIL).
    Renvoie le numéro de ligne dans l'onglet « File d'envoi » (0 si rien n'a été mis en file). */
function queue_(kind, to, subject, html, ref, replyTo) {
  var t = table_(TAB.OUTBOX);
  if (!t || !EMAIL_RE.test(String(to || ""))) return 0;
  var reply = EMAIL_RE.test(String(replyTo || "")) ? String(replyTo) : "";
  appendRows_(t, [rowFor_(t, { created: now_(), kind: kind, to: asText_(to), subject: asText_(subject), status: Q_TODO, tries: 0, next: now_(), ref: asText_(ref || ""), body: asText_(html.slice(0, 45000)), reply: asText_(reply) })]);
  return t.values.length;
}

function emailFrame_(title, inner) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#1B2D28;max-width:620px;line-height:1.5">' +
    '<div style="background:#1F6F64;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0"><b style="font-size:18px">Wisy Safety</b><br>' + esc_(title) + "</div>" +
    '<div style="border:1px solid #d6e3e0;border-top:0;padding:18px 22px;border-radius:0 0 12px 12px">' + inner +
    '<p style="color:#5E6D6A;font-size:13px;margin-top:22px">Wisy Safety · Avenue d\'Itterbeek 378, 1070 Anderlecht · ' + esc_(CONFIG.PHONE) + " · " + esc_(CONFIG.NOTIFY_EMAIL) + "</p></div></div>";
}

function itemsHtml_(w) {
  return "<ul>" + w.order.items.map(function (it, i) {
    var s = it.sessionId ? w.sessions.byId[it.sessionId] : null;
    var status = w.items[i].status === "confirmed" ? "places réservées" : w.items[i].status === "pending" ? "en attente de confirmation" : "date à convenir avec l'équipe";
    return "<li><b>" + esc_(it.trainingName) + "</b> — " + it.quantity + (it.quantity > 1 ? " participants" : " participant") +
      (s ? " — " + esc_(frLongDate_(s.date)) + (s.start ? ", " + esc_(s.start) + (s.end ? "–" + esc_(s.end) : "") : "") + (s.location ? ", " + esc_(s.location) : "") : "") +
      " <i>(" + status + ")</i></li>";
  }).join("") + "</ul>";
}

function queueBookingEmails_(w) {
  if (!w) return;
  var c = w.order.customer, b = w.order.billing;
  var anyConfirmed = w.items.some(function (i) { return i.status === "confirmed"; });
  var title = anyConfirmed ? "Votre réservation est confirmée" : "Votre demande est bien reçue";
  var client = emailFrame_(title,
    "<p>Bonjour " + esc_(c.firstName) + ",</p>" +
    "<p>" + (anyConfirmed ? "Vos places sont réservées." : "Nous avons bien reçu votre demande.") + " Votre référence : <b>" + esc_(w.ref) + "</b>.</p>" +
    itemsHtml_(w) +
    "<p>Aucun paiement n'a été demandé en ligne : l'équipe Wisy Safety vous envoie la facture et les informations pratiques.</p>" +
    "<p>Pour modifier ou annuler, répondez à cet e-mail en indiquant votre référence.</p>");
  queue_("Confirmation client", c.email, "Wisy Safety — " + (anyConfirmed ? "réservation confirmée " : "demande reçue ") + w.ref, client, w.ref);
  if (CONFIG.NOTIFY_EMAIL) {
    var lines = w.order.items.map(function (it) {
      var s = it.sessionId ? w.sessions.byId[it.sessionId] : null;
      if (!s) return "";
      var left = Math.max(0, s.capacity - (w.taken[s.id] || 0));
      return "<li>" + esc_(it.trainingName) + " " + esc_(whenText_(s)) + " : " + left + " place(s) restante(s) sur " + s.capacity + "</li>";
    }).join("");
    var team = emailFrame_("Nouvelle réservation " + w.ref,
      "<p><b>" + esc_([c.firstName, c.lastName].join(" ")) + "</b> — " + esc_(c.email) + " — " + esc_(c.phone) + "</p>" +
      "<p>" + esc_([b.company, b.vat ? "TVA " + b.vat : ""].filter(Boolean).join(" — ") || "Particulier") + "<br>" + esc_([b.address, b.zip + " " + b.city, b.country].join(", ")) + "</p>" +
      itemsHtml_(w) + (lines ? "<p>Places après cette réservation :</p><ul>" + lines + "</ul>" : "") +
      "<p>Détail dans la feuille « " + esc_(CONFIG.FILE_NAME) + " », onglet Réservations.</p>");
    var subjectSessions = w.order.items.map(function (it) { return it.trainingName + " ×" + it.quantity; }).join(", ");
    /* « Répondre » depuis la messagerie de l'équipe écrit directement au client. */
    queue_("Avis Wisy Safety", CONFIG.NOTIFY_EMAIL, "Nouvelle réservation " + w.ref + " — " + subjectSessions, team, w.ref, c.email);
  }
}

/** Envoie un e-mail : Microsoft 365 (boîte dédiée) si configuré, sinon Gmail (MailApp). Lève une erreur en cas d'échec.
    `replyTo` : adresse du bouton « Répondre » (défaut : CONFIG.NOTIFY_EMAIL). */
function sendEmail_(to, subject, html, replyTo) {
  var reply = EMAIL_RE.test(String(replyTo || "")) ? String(replyTo) : CONFIG.NOTIFY_EMAIL;
  var ms = msConfig_();
  if (ms) {
    var res = graph_(ms, "post", "/users/" + encodeURIComponent(ms.mailbox) + "/sendMail", {
      message: {
        subject: subject, body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        replyTo: reply ? [{ emailAddress: { address: reply } }] : []
      },
      saveToSentItems: true
    });
    if (res.code !== 202 && res.code !== 200) throw new Error("Microsoft 365 a refusé l'envoi (" + res.code + ") " + graphError_(res));
    return;
  }
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error("quota d'e-mails Google du jour épuisé");
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: "Wisy Safety", replyTo: reply || undefined });
}

/** Délai avant le prochain essai : 5 min, 15 min, 1 h, 3 h, 12 h, puis 24 h. */
function backoffMinutes_(tries) { return [5, 15, 60, 180, 720, 1440][Math.min(Math.max(tries - 1, 0), 5)]; }

/** Envoie les e-mails « À envoyer » dont l'heure est venue (au plus `limit`). */
function processOutbox_(limit) {
  var t = table_(TAB.OUTBOX);
  if (!t) return 0;
  var now = now_(), sent = 0;
  for (var r = 1; r < t.values.length && sent < (limit || 20); r++) {
    var row = t.values[r];
    if (clean_(get_(t, row, "status")) !== Q_TODO) continue;
    var next = get_(t, row, "next");
    if (isDate_(next) && next.getTime() > now.getTime()) continue;
    var line = r + 1, tries = (int_(get_(t, row, "tries")) || 0) + 1;
    try {
      sendEmail_(clean_(get_(t, row, "to")), String(get_(t, row, "subject")), String(get_(t, row, "body")), clean_(get_(t, row, "reply")));
      setCell_(t, line, "status", Q_SENT);
      setCell_(t, line, "tries", tries);
      setCell_(t, line, "error", "");
      sent++;
    } catch (err) {
      var msg = String(err && err.message || err).slice(0, 300);
      setCell_(t, line, "tries", tries);
      setCell_(t, line, "error", asText_(msg));
      if (tries >= CONFIG.MAX_SEND_TRIES) {
        setCell_(t, line, "status", Q_FAILED);
        log_("E-mail", clean_(get_(t, row, "ref")), "Erreur", "Abandon après " + tries + " essais vers " + clean_(get_(t, row, "to")) + " : " + msg);
      } else {
        setCell_(t, line, "next", new Date(now.getTime() + backoffMinutes_(tries) * 60000));
      }
    }
  }
  return sent;
}

/* ======================================================================= Microsoft 365 / Outlook (Microsoft Graph) */

var GRAPH = "https://graph.microsoft.com/v1.0";
/* Propriété invisible posée sur chaque événement créé : retrouve l'événement d'une session même si son ID est perdu
   (aucun doublon). */
var PROP_ID = "String {6f0f2e8c-3b7a-4d2e-9c51-8a4f1d2b7e90} Name WisySessionId";

/** Identifiants Microsoft (propriétés du script) ou null si Outlook n'est pas configuré. */
function msConfig_() {
  var p = PropertiesService.getScriptProperties();
  var c = { tenant: p.getProperty("MS_TENANT_ID"), client: p.getProperty("MS_CLIENT_ID"), secret: p.getProperty("MS_CLIENT_SECRET"), mailbox: p.getProperty("MS_MAILBOX") };
  return c.tenant && c.client && c.secret && c.mailbox ? c : null;
}

function graphError_(res) {
  var e = res && res.json && res.json.error;
  return e ? clean_((e.code || "") + " " + (e.message || e.error_description || ""), 240) : "";
}

function graphToken_(ms) {
  var cache = CacheService.getScriptCache(), key = "ms:token:" + ms.client;
  var hit = cache.get(key);
  if (hit) return hit;
  var res = UrlFetchApp.fetch("https://login.microsoftonline.com/" + encodeURIComponent(ms.tenant) + "/oauth2/v2.0/token", {
    method: "post", muteHttpExceptions: true,
    payload: { client_id: ms.client, client_secret: ms.secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }
  });
  var json = null;
  try { json = JSON.parse(res.getContentText()); } catch (e) { json = null; }
  if (res.getResponseCode() !== 200 || !json || !json.access_token) {
    throw new Error("connexion Microsoft refusée (" + res.getResponseCode() + ") " + clean_(json && (json.error_description || json.error) || "", 240));
  }
  cache.put(key, json.access_token, Math.max(60, Math.min(3300, (Number(json.expires_in) || 3600) - 300)));
  return json.access_token;
}

/** Appel Microsoft Graph → { code, json }. Les heures sont lues et écrites à l'heure de Bruxelles. */
function graph_(ms, method, path, body) {
  var opts = {
    method: method, muteHttpExceptions: true, contentType: "application/json",
    headers: { Authorization: "Bearer " + graphToken_(ms), Prefer: 'outlook.timezone="' + CONFIG.OUTLOOK_TIMEZONE + '"' }
  };
  if (body) opts.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(GRAPH + path, opts);
  var text = res.getContentText(), json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return { code: res.getResponseCode(), json: json };
}

function addHour_(time) { var h = +time.slice(0, 2) + 1; return h > 23 ? "23:59" : pad_(h) + time.slice(2); }

/** Dates de l'événement Outlook d'une session : "AAAA-MM-JJTHH:MM|AAAA-MM-JJTHH:MM". */
function eventDates_(s) {
  if (!s.start) return s.date + "T00:00|" + nextDay_(s.date) + "T00:00";
  return s.date + "T" + s.start + "|" + s.date + "T" + (s.end || addHour_(s.start));
}

function eventPayload_(s, taken, withDates) {
  var booked = taken[s.id] || 0;
  var cancelled = s.status === "cancelled";
  var d = eventDates_(s).split("|");
  var body = "<p><b>" + esc_(s.trainingName) + "</b></p><p>Places réservées : " + booked + " / " + s.capacity +
    "<br>Statut sur le site : " + (cancelled ? "annulée" : s.published ? (s.status === "closed" ? "inscriptions fermées" : "publiée") : "non publiée") +
    "<br>Session : " + esc_(s.id) + "</p><p>Créé et mis à jour automatiquement par la feuille « " + esc_(CONFIG.FILE_NAME) + " ». " +
    "Les inscriptions et les places se gèrent dans la feuille, pas dans Outlook.</p>";
  var ev = {
    subject: (cancelled ? "ANNULÉE — " : "") + s.trainingName + " — " + booked + "/" + s.capacity + " inscrits",
    body: { contentType: "HTML", content: body },
    categories: [CONFIG.OUTLOOK_CATEGORY],
    showAs: cancelled ? "free" : "busy",
    isReminderOn: false,
    location: { displayName: s.location || "" }
  };
  if (withDates) {
    ev.isAllDay = !s.start;
    ev.start = { dateTime: d[0] + ":00", timeZone: CONFIG.OUTLOOK_TIMEZONE };
    ev.end = { dateTime: d[1] + ":00", timeZone: CONFIG.OUTLOOK_TIMEZONE };
  }
  return ev;
}

/** Empreinte de ce qui doit figurer dans Outlook (un changement ⇒ mise à jour). */
function eventKey_(s, taken) {
  return [eventDates_(s), s.trainingName, s.capacity, taken[s.id] || 0, s.status, s.published ? 1 : 0, s.location].join("~");
}

function sentOf_(s) { try { var o = JSON.parse(s.outlookSent || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }

function openGap_(gaps, sessionId, kind) {
  if (!gaps) return null;
  for (var r = 1; r < gaps.values.length; r++) {
    var row = gaps.values[r];
    if (clean_(get_(gaps, row, "session")) === sessionId && clean_(get_(gaps, row, "kind")) === kind && !get_(gaps, row, "done")) return r + 1;
  }
  return null;
}

/**
 * Synchronise le calendrier Outlook dédié avec l'onglet Sessions (la feuille fait référence).
 *  - crée / met à jour l'événement de chaque session publiée (ou annulée après publication) ;
 *  - un événement DÉPLACÉ ou SUPPRIMÉ directement dans Outlook n'écrase jamais la feuille : il est signalé dans
 *    « Écarts Outlook » (Appliquer / Ignorer) — les réservations ne sont jamais touchées ;
 *  - un échec est réessayé plus tard (5 min, 15 min, 1 h…) et noté dans le Journal.
 */
function syncOutlook_() {
  var ms = msConfig_();
  if (!ms) return { configured: false, done: 0, errors: 0 };
  var now = now_();
  var formations = readFormations_(), sessions = readSessions_(formations), bookings = readBookings_();
  var taken = taken_(bookings.rows, now), t = sessions.t, gaps = table_(TAB.GAPS);
  if (!gaps) { setupTabs_(); gaps = table_(TAB.GAPS); }
  var done = 0, errors = 0, mb = "/users/" + encodeURIComponent(ms.mailbox);
  var candidates = sessions.list.filter(function (s) {
    return s.valid && (s.published || s.outlookId) && endOf_(s).getTime() > now.getTime() - 86400000;
  }).slice(0, CONFIG.MAX_OUTLOOK_PER_RUN);
  candidates.forEach(function (s) {
    if (s.syncNext && s.syncNext.getTime() > now.getTime()) return;
    var sent = sentOf_(s), key = eventKey_(s, taken);
    try {
      var datesLocked = false;
      if (s.outlookId) {
        var cur = graph_(ms, "get", mb + "/events/" + encodeURIComponent(s.outlookId) + "?$select=start,end,isAllDay,subject");
        if (cur.code === 404) {
          if (!openGap_(gaps, s.id, "Supprimé dans Outlook")) {
            appendRows_(gaps, [rowFor_(gaps, { detected: now, session: s.id, training: s.trainingName, kind: "Supprimé dans Outlook", sheet: whenText_(s), outlook: "(supprimé)", decision: G_TODO })]);
            log_("Outlook", s.id, "Écart", "Événement supprimé dans Outlook : à décider (onglet Écarts Outlook).");
          }
          setCell_(t, s.line, "outlook", "⚠ Supprimé dans Outlook — voir Écarts");
          return;
        }
        if (cur.code !== 200) throw new Error("lecture refusée (" + cur.code + ") " + graphError_(cur));
        var remote = String(cur.json.start.dateTime).slice(0, 16) + "|" + String(cur.json.end.dateTime).slice(0, 16);
        if (sent.dates && remote !== sent.dates) {
          datesLocked = true;
          var p = remote.split("|");
          var outlookText = frDate_(p[0].slice(0, 10)) + (cur.json.isAllDay ? " (journée)" : " · " + p[0].slice(11) + "–" + p[1].slice(11));
          if (!openGap_(gaps, s.id, "Déplacé dans Outlook")) {
            appendRows_(gaps, [rowFor_(gaps, { detected: now, session: s.id, training: s.trainingName, kind: "Déplacé dans Outlook", sheet: whenText_(s), outlook: asText_(outlookText), decision: G_TODO })]);
            log_("Outlook", s.id, "Écart", "Horaire modifié dans Outlook (" + outlookText + ") : à décider (onglet Écarts Outlook).");
          }
        }
      }
      if (key === sent.key && !datesLocked) return;
      if (datesLocked && key === sent.keyNoDates) { setCell_(t, s.line, "outlook", "⚠ Modifié dans Outlook — voir Écarts"); return; }
      var id = s.outlookId;
      if (!id) {
        /* Avant de créer : un événement portant déjà l'identifiant de cette session ? (reprise après un échec) */
        var filter = "singleValueExtendedProperties/Any(ep: ep/id eq '" + PROP_ID + "' and ep/value eq '" + s.id + "')";
        var found = graph_(ms, "get", mb + "/events?$select=id&$filter=" + encodeURIComponent(filter));
        if (found.code === 200 && found.json && found.json.value && found.json.value.length) id = found.json.value[0].id;
      }
      if (!id) {
        var ev = eventPayload_(s, taken, true);
        ev.transactionId = "wisy-" + s.id + "-" + s.generation;   // un nouvel essai ne crée pas un second événement
        ev.singleValueExtendedProperties = [{ id: PROP_ID, value: s.id }];
        var created = graph_(ms, "post", mb + "/events", ev);
        if (created.code !== 201 && created.code !== 200) throw new Error("création refusée (" + created.code + ") " + graphError_(created));
        id = created.json.id;
      } else {
        var upd = graph_(ms, "patch", mb + "/events/" + encodeURIComponent(id), eventPayload_(s, taken, !datesLocked));
        if (upd.code !== 200) throw new Error("mise à jour refusée (" + upd.code + ") " + graphError_(upd));
      }
      var record = { key: datesLocked ? sent.key : key, keyNoDates: key, dates: datesLocked ? sent.dates : eventDates_(s) };
      setCell_(t, s.line, "outlook_id", id);
      setCell_(t, s.line, "outlook_sent", JSON.stringify(record));
      setCell_(t, s.line, "sync_tries", 0);
      setCell_(t, s.line, "sync_next", "");
      setCell_(t, s.line, "outlook", datesLocked ? "⚠ Modifié dans Outlook — voir Écarts" : "✓ Synchronisée le " + fmt_(now, "dd/MM HH:mm"));
      done++;
    } catch (err) {
      errors++;
      var tries = s.syncTries + 1, msg = String(err && err.message || err).slice(0, 300);
      setCell_(t, s.line, "sync_tries", tries);
      setCell_(t, s.line, "sync_next", new Date(now.getTime() + backoffMinutes_(tries) * 60000));
      setCell_(t, s.line, "outlook", "⚠ Erreur (essai " + tries + ") — voir Journal");
      log_("Outlook", s.id, "Erreur", msg);
    }
  });
  return { configured: true, done: done, errors: errors };
}

/* ======================================================================= tâche automatique */

/** Toutes les 10 minutes : e-mails en attente, réservations expirées, compteurs, Outlook. */
function tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var now = now_(), b = readBookings_();
    if (b.t) {
      b.rows.forEach(function (r) {
        if (r.status === "pending" && r.expires && r.expires.getTime() <= now.getTime()) {
          setCell_(b.t, r.line, "status", B_EXPIRED);
          log_("Réservation", r.ref, "Info", "Réservation en attente expirée : places libérées.");
        }
      });
    }
    refreshAll_();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  clearCache_();
  processOutbox_(20);
  syncOutlook_();
  try { purgeOldRequests_(); } catch (err) { log_("Demande", "", "Erreur", "Anonymisation : " + String(err && err.message || err).slice(0, 200)); }
}

/* ======================================================================= menu « Wisy Safety » */

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Wisy Safety")
    .addItem("➕ Nouvelle session", "nouvelleSession")
    .addItem("🔒 Fermer les inscriptions (session sélectionnée)", "fermerLesInscriptions")
    .addItem("🔓 Rouvrir les inscriptions (session sélectionnée)", "rouvrirLesInscriptions")
    .addItem("⛔ Annuler la session sélectionnée…", "annulerLaSession")
    .addItem("📣 Prévenir les inscrits d'un changement d'horaire…", "prevenirLesInscrits")
    .addItem("📋 Liste des participants (session sélectionnée)", "listeDesParticipants")
    .addSeparator()
    .addItem("✔ Confirmer la réservation sélectionnée", "confirmerLaReservation")
    .addItem("✖ Annuler la réservation sélectionnée…", "annulerLaReservation")
    .addSeparator()
    .addItem("🔄 Synchroniser maintenant (e-mails + Outlook)", "synchroniserMaintenant")
    .addItem("↔ Traiter les écarts Outlook décidés", "traiterLesEcarts")
    .addItem("🔎 Vérifier la cohérence", "verifierLaCoherence")
    .addItem("🌐 Voir ce que le site affiche", "voirLeSite")
    .addSeparator()
    .addItem("⚙ Configurer Microsoft 365 (Outlook)…", "configurerMicrosoft")
    .addItem("🧪 Tester la connexion Outlook", "testerOutlook")
    .addItem("✉ Envoyer un e-mail de test à l'équipe", "envoyerUnEmailDeTest")
    .addItem("🛠 Installer / réparer la feuille", "installer")
    .addToUi();
}

/** Modification à la main : identifiants complétés, compteurs recalculés, liste publique renouvelée. */
function onEdit(e) {
  try {
    var sheet = e && e.range ? e.range.getSheet() : null;
    if (!sheet) return;
    var name = sheet.getName();
    if (name !== TAB.SESSIONS && name !== TAB.BOOKINGS && name !== TAB.FORMATIONS) return;
    if (name === TAB.SESSIONS) completeSessionIds_();
    refreshAll_();
    clearCache_();
  } catch (err) { /* une modification ne doit jamais être bloquée */ }
}

/** Donne un identifiant (date-formation) aux sessions qui n'en ont pas encore. */
function completeSessionIds_() {
  var formations = readFormations_(), sessions = readSessions_(formations), t = sessions.t;
  if (!t) return;
  var used = {};
  sessions.list.forEach(function (s) { if (s.id) used[s.id] = true; });
  sessions.list.forEach(function (s) {
    if (s.id || !s.training || !s.date) return;
    var base = s.date + "-" + s.training, id = base, n = 2;
    while (used[id]) id = base + "-" + n++;
    used[id] = true;
    setCell_(t, s.line, "id", id);
    if (!s.statusRaw) setCell_(t, s.line, "status", S_OPEN);
  });
}

function ui_() { return SpreadsheetApp.getUi(); }

/** Session de la ligne sélectionnée dans l'onglet Sessions (ou null, avec un message). */
function selectedSession_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getActiveSheet();
  if (sheet.getName() !== TAB.SESSIONS) { ui_().alert("Cliquez d'abord sur la ligne de la session, dans l'onglet « " + TAB.SESSIONS + " »."); return null; }
  var line = sheet.getActiveRange().getRow();
  var formations = readFormations_(), sessions = readSessions_(formations);
  var s = sessions.list.filter(function (x) { return x.line === line; })[0];
  if (!s || !s.id) { ui_().alert("Cette ligne n'est pas une session complète (formation, date et places)."); return null; }
  return { s: s, sessions: sessions, formations: formations };
}

function nouvelleSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), t = table_(TAB.SESSIONS);
  if (!t) { installer(); t = table_(TAB.SESSIONS); }
  var line = t.sheet.getLastRow() + 1;
  if (line > t.sheet.getMaxRows()) t.sheet.insertRowsAfter(t.sheet.getMaxRows(), 50);
  setCell_(t, line, "status", S_OPEN);
  setCell_(t, line, "published", false);
  ss.setActiveSheet(t.sheet);
  t.sheet.getRange(line, (t.col.training || 0) + 1).activate();
  ss.toast("Choisissez la formation, puis la date, les heures et le nombre de places. Cochez « Publiée sur le site » quand tout est prêt.", "Nouvelle session", 12);
}

function setSessionStatus_(status, message) {
  var sel = selectedSession_();
  if (!sel) return;
  setCell_(sel.sessions.t, sel.s.line, "status", status);
  refreshAll_();
  clearCache_();
  SpreadsheetApp.getActiveSpreadsheet().toast(message, sel.s.trainingName + " · " + whenText_(sel.s), 8);
}

function fermerLesInscriptions() { setSessionStatus_(S_CLOSED, "Inscriptions fermées : la session reste visible, sans bouton de réservation."); }
function rouvrirLesInscriptions() { setSessionStatus_(S_OPEN, "Inscriptions rouvertes (dans la limite des places restantes)."); }

/** Réservations actives (Confirmée / En attente) d'une session, une par référence. */
function activeBookingsOf_(sessionId, rows, now) {
  var byRef = {};
  rows.forEach(function (b) { if (b.session === sessionId && holdsSeats_(b, now) && !byRef[b.ref]) byRef[b.ref] = b; });
  return Object.keys(byRef).map(function (k) { return byRef[k]; });
}

function annulerLaSession() {
  var sel = selectedSession_();
  if (!sel) return;
  var ui = ui_(), s = sel.s, now = now_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert("Une réservation est en cours d'enregistrement : réessayez dans quelques secondes."); return; }
  var notified = 0;
  try {
    var b = readBookings_(), active = activeBookingsOf_(s.id, b.rows, now);
    var answer = ui.alert("Annuler la session " + s.trainingName + " du " + whenText_(s) + " ?",
      active.length + " réservation(s) active(s). Elles passeront au statut « Annulée » et chaque client recevra un e-mail. Continuer ?", ui.ButtonSet.YES_NO);
    if (answer !== ui.Button.YES) return;
    setCell_(sel.sessions.t, s.line, "status", S_CANCELLED);
    b.rows.forEach(function (r) {
      if (r.session !== s.id || !holdsSeats_(r, now)) return;
      setCell_(b.t, r.line, "status", B_CANCELLED);
      setCell_(b.t, r.line, "cancelled", now);
      setCell_(b.t, r.line, "notes", "Session annulée par Wisy Safety");
    });
    active.forEach(function (r) {
      queue_("Session annulée", r.email, "Wisy Safety — session annulée (" + r.ref + ")", emailFrame_("Session annulée",
        "<p>Bonjour,</p><p>Nous sommes désolés : la session <b>" + esc_(s.trainingName) + "</b> du <b>" + esc_(frLongDate_(s.date)) + "</b> est annulée.</p>" +
        "<p>Votre réservation " + esc_(r.ref) + " est annulée. L'équipe Wisy Safety vous contacte pour vous proposer une autre date.</p>"), r.ref);
      notified++;
    });
    log_("Session", s.id, "Info", "Session annulée (" + active.length + " réservation(s) annulée(s)).");
    refreshAll_();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  clearCache_();
  processOutbox_(20);
  ui.alert("Session annulée. " + notified + " e-mail(s) d'annulation préparé(s) (voir l'onglet « " + TAB.OUTBOX + " »). Outlook sera mis à jour à la prochaine synchronisation.");
}

function prevenirLesInscrits() {
  var sel = selectedSession_();
  if (!sel) return;
  var ui = ui_(), s = sel.s, active = activeBookingsOf_(s.id, readBookings_().rows, now_());
  if (!active.length) { ui.alert("Aucune réservation active pour cette session."); return; }
  var answer = ui.alert("Prévenir " + active.length + " client(s) ?", "Un e-mail annonce l'horaire actuel de la feuille : " + frLongDate_(s.date) + (s.start ? ", " + s.start + (s.end ? "–" + s.end : "") : "") + ". Continuer ?", ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  active.forEach(function (r) {
    queue_("Changement d'horaire", r.email, "Wisy Safety — changement d'horaire (" + r.ref + ")", emailFrame_("Changement d'horaire",
      "<p>Bonjour,</p><p>L'horaire de votre session <b>" + esc_(s.trainingName) + "</b> a changé. Nouvel horaire : <b>" + esc_(frLongDate_(s.date)) +
      (s.start ? ", " + esc_(s.start) + (s.end ? "–" + esc_(s.end) : "") : "") + "</b>" + (s.location ? ", " + esc_(s.location) : "") + ".</p>" +
      "<p>Votre réservation " + esc_(r.ref) + " est conservée. Si ce nouvel horaire ne vous convient pas, répondez à cet e-mail.</p>"), r.ref);
  });
  processOutbox_(20);
  ui.alert(active.length + " e-mail(s) préparé(s) (voir l'onglet « " + TAB.OUTBOX + " »).");
}

function listeDesParticipants() {
  var sel = selectedSession_();
  if (!sel) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = sel.s, now = now_();
  var b = readBookings_(), people = table_(TAB.PEOPLE);
  var name = ("Liste " + s.id).slice(0, 90);
  var old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet(name);
  var rows = [[s.trainingName + " — " + frLongDate_(s.date) + (s.start ? ", " + s.start + (s.end ? "–" + s.end : "") : ""), "", "", "", "", "", ""],
    ["Places réservées : " + (taken_(b.rows, now)[s.id] || 0) + " / " + s.capacity + " · liste créée le " + fmt_(now, "dd/MM/yyyy HH:mm"), "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["Référence", "Statut", "Demandeur", "Entreprise", "E-mail", "Téléphone", "Places / participants"]];
  b.rows.forEach(function (r) {
    if (r.session !== s.id || !holdsSeats_(r, now)) return;
    rows.push([r.ref, r.statusRaw, r.name, r.company, r.email, r.phone, r.seats + " — " + r.participants]);
  });
  rows.push(["", "", "", "", "", "", ""]);
  rows.push(["Participants nommés", "", "", "", "", "", ""]);
  rows.push(["Référence", "Prénom", "Nom", "E-mail", "", "", ""]);
  if (people) {
    var active = {};
    b.rows.forEach(function (r) { if (r.session === s.id && holdsSeats_(r, now)) active[r.ref] = true; });
    for (var i = 1; i < people.values.length; i++) {
      var p = people.values[i];
      if (clean_(get_(people, p, "session")) !== s.id || !active[clean_(get_(people, p, "ref"))]) continue;
      rows.push([clean_(get_(people, p, "ref")), clean_(get_(people, p, "first")), clean_(get_(people, p, "last")), clean_(get_(people, p, "email")), "", "", ""]);
    }
  }
  sh.getRange(1, 1, rows.length, 7).setValues(rows.map(function (r) { return r.map(function (v) { return typeof v === "string" ? asText_(v) : v; }); }));
  sh.getRange(1, 1).setFontSize(14).setFontWeight("bold");
  sh.getRange(4, 1, 1, 7).setFontWeight("bold").setBackground("#16302A").setFontColor("#FFFFFF");
  [130, 110, 180, 180, 220, 130, 320].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  ss.setActiveSheet(sh);
  ss.toast("Pour l'enregistrer : Fichier › Télécharger › CSV, Excel ou PDF. Vous pouvez supprimer cet onglet ensuite.", "Liste des participants", 12);
}

/** Lignes sélectionnées dans l'onglet Réservations → lignes de réservation. */
function selectedBookings_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== TAB.BOOKINGS) { ui_().alert("Cliquez d'abord sur la ligne de la réservation, dans l'onglet « " + TAB.BOOKINGS + " »."); return null; }
  var lines = {};
  sheet.getActiveRangeList().getRanges().forEach(function (rg) {
    for (var l = rg.getRow(); l < rg.getRow() + rg.getNumRows(); l++) if (l > 1) lines[l] = true;
  });
  var b = readBookings_();
  var rows = b.rows.filter(function (r) { return lines[r.line]; });
  if (!rows.length) { ui_().alert("Aucune réservation sélectionnée."); return null; }
  return { b: b, rows: rows };
}

function annulerLaReservation() {
  var ui = ui_(), sel = selectedBookings_();
  if (!sel) return;
  var now = now_(), targets = sel.rows.filter(function (r) { return r.status !== "cancelled"; });
  if (!targets.length) { ui.alert("Ces lignes sont déjà annulées."); return; }
  var answer = ui.alert("Annuler " + targets.length + " ligne(s) de réservation ?", targets.map(function (r) { return r.ref + " — " + r.training + " (" + r.seats + " place(s))"; }).join("\n") +
    "\n\nLes places seront libérées immédiatement.", ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;
  var mail = ui.alert("Prévenir le client par e-mail ?", "", ui.ButtonSet.YES_NO) === ui.Button.YES;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert("Une réservation est en cours d'enregistrement : réessayez dans quelques secondes."); return; }
  try {
    targets.forEach(function (r) {
      setCell_(sel.b.t, r.line, "status", B_CANCELLED);
      setCell_(sel.b.t, r.line, "cancelled", now);
      log_("Réservation", r.ref, "Info", "Ligne annulée (" + r.training + ", " + r.seats + " place(s)).");
    });
    refreshAll_();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  clearCache_();
  if (mail) {
    var done = {};
    targets.forEach(function (r) {
      if (done[r.ref + r.email]) return;
      done[r.ref + r.email] = true;
      queue_("Réservation annulée", r.email, "Wisy Safety — réservation annulée (" + r.ref + ")", emailFrame_("Réservation annulée",
        "<p>Bonjour,</p><p>Votre réservation <b>" + esc_(r.ref) + "</b> (" + esc_(r.training) + (r.when ? ", " + esc_(r.when) : "") + ") est annulée.</p>" +
        "<p>Pour toute question, répondez à cet e-mail.</p>"), r.ref);
    });
    processOutbox_(20);
  }
  ui.alert("Réservation annulée : places libérées." + (mail ? " E-mail préparé." : ""));
}

function confirmerLaReservation() {
  var ui = ui_(), sel = selectedBookings_();
  if (!sel) return;
  var targets = sel.rows.filter(function (r) { return r.status === "pending"; });
  if (!targets.length) { ui.alert("Sélectionnez une ligne « " + B_PENDING + " »."); return; }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert("Une réservation est en cours d'enregistrement : réessayez dans quelques secondes."); return; }
  try {
    targets.forEach(function (r) {
      setCell_(sel.b.t, r.line, "status", B_CONFIRMED);
      setCell_(sel.b.t, r.line, "expires", "");
      queue_("Confirmation client", r.email, "Wisy Safety — réservation confirmée " + r.ref, emailFrame_("Votre réservation est confirmée",
        "<p>Bonjour,</p><p>Votre réservation <b>" + esc_(r.ref) + "</b> est confirmée : " + esc_(r.training) + ", " + esc_(r.when) + ", " + r.seats + " place(s).</p>"), r.ref);
    });
    refreshAll_();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  clearCache_();
  processOutbox_(20);
  ui.alert(targets.length + " ligne(s) confirmée(s), e-mail préparé.");
}

function synchroniserMaintenant() {
  tick();
  var ms = msConfig_();
  SpreadsheetApp.getActiveSpreadsheet().toast(ms ? "E-mails et Outlook synchronisés (détail : colonne Outlook et onglet Journal)." : "E-mails envoyés. Outlook n'est pas encore configuré (menu › Configurer Microsoft 365).", "Synchronisation", 8);
}

function traiterLesEcarts() {
  var ui = ui_(), gaps = table_(TAB.GAPS);
  if (!gaps) { ui.alert("Aucun écart."); return; }
  var formations = readFormations_(), sessions = readSessions_(formations), t = sessions.t, now = now_(), n = 0;
  for (var r = 1; r < gaps.values.length; r++) {
    var row = gaps.values[r], line = r + 1;
    var decision = clean_(get_(gaps, row, "decision"));
    if (get_(gaps, row, "done") || (decision !== G_APPLY && decision !== G_IGNORE)) continue;
    var s = sessions.byId[clean_(get_(gaps, row, "session"))];
    var kind = clean_(get_(gaps, row, "kind"));
    if (!s) { setCell_(gaps, line, "done", now); continue; }
    var sent = sentOf_(s);
    if (kind === "Supprimé dans Outlook") {
      if (decision === G_APPLY) {
        setCell_(t, s.line, "status", S_CANCELLED);
        setCell_(t, s.line, "outlook_id", "");
        setCell_(t, s.line, "outlook_sent", "");
        setCell_(t, s.line, "outlook", "Annulée (supprimée dans Outlook) — prévenez les inscrits");
      } else {
        setCell_(t, s.line, "outlook_id", "");
        setCell_(t, s.line, "outlook_sent", "");
        setCell_(t, s.line, "generation", s.generation + 1);
        setCell_(t, s.line, "outlook", "À recréer dans Outlook");
      }
    } else if (kind === "Déplacé dans Outlook") {
      if (decision === G_APPLY) {
        var txt = String(get_(gaps, row, "outlook"));
        var m = txt.match(/^(\d{2}\/\d{2}\/\d{4})(?: · (\d{2}:\d{2})–(\d{2}:\d{2}))?/);
        if (m) {
          var day = cellDate_(m[1]);
          setCell_(t, s.line, "date", at_(day, "12:00"));
          setCell_(t, s.line, "start", m[2] || "");
          setCell_(t, s.line, "end", m[3] || "");
          var moved = { date: day, start: m[2] || "", end: m[3] || "" };
          sent.dates = eventDates_(moved);
          sent.key = "";
          setCell_(t, s.line, "outlook_sent", JSON.stringify(sent));
          setCell_(t, s.line, "outlook", "Horaire repris d'Outlook — prévenez les inscrits");
        }
      } else {
        sent.dates = "";   // la feuille fait foi : l'horaire d'Outlook sera remplacé
        sent.key = "";
        setCell_(t, s.line, "outlook_sent", JSON.stringify(sent));
        setCell_(t, s.line, "outlook", "À resynchroniser");
      }
    }
    setCell_(gaps, line, "done", now);
    setCell_(gaps, line, "decision", G_DONE + " (" + decision + ")");
    log_("Outlook", s.id, "Info", kind + " : " + decision);
    n++;
  }
  refreshAll_();
  clearCache_();
  ui.alert(n ? n + " écart(s) traité(s). Pensez à prévenir les inscrits si l'horaire a changé (menu › Prévenir les inscrits)." : "Aucun écart avec la décision « Appliquer » ou « Ignorer ».");
}

/** Contrôle de cohérence (rien n'est modifié). */
function verifierLaCoherence() {
  var problems = [], now = now_();
  var formations = readFormations_(), sessions = readSessions_(formations), bookings = readBookings_();
  var taken = taken_(bookings.rows, now);
  sessions.list.forEach(function (s) {
    if (!s.valid) problems.push("Sessions ligne " + s.line + " : " + s.problems.join(" ; ") + (s.published ? " — NON affichée sur le site." : "."));
    if (s.valid && taken[s.id] > s.capacity) problems.push("Sessions ligne " + s.line + " (" + s.id + ") : " + taken[s.id] + " places réservées pour " + s.capacity + " places au total (capacité réduite après coup ?).");
  });
  bookings.rows.forEach(function (b) {
    if (b.status === null) problems.push("Réservations ligne " + b.line + " : statut « " + b.statusRaw + " » incompris.");
    if (b.session && !sessions.byId[b.session]) problems.push("Réservations ligne " + b.line + " : session « " + b.session + " » introuvable dans l'onglet Sessions.");
    if (!(b.seats >= 1)) problems.push("Réservations ligne " + b.line + " : nombre de places invalide.");
  });
  var outbox = table_(TAB.OUTBOX);
  if (outbox) for (var r = 1; r < outbox.values.length; r++) if (clean_(get_(outbox, outbox.values[r], "status")) === Q_FAILED) problems.push("File d'envoi ligne " + (r + 1) + " : e-mail non envoyé (" + clean_(get_(outbox, outbox.values[r], "error"), 120) + ").");
  ui_().alert(problems.length ? "À corriger :\n\n" + problems.slice(0, 40).join("\n") : "Tout est cohérent : " + sessions.list.length + " session(s), " + bookings.rows.length + " ligne(s) de réservation.");
}

function voirLeSite() {
  var out = publicSessions_();
  var LABEL = { open: "réservable", full: "COMPLÈTE", closed: "inscriptions fermées" };
  ui_().alert("Ce que le site affiche", out.sessions.length ? out.sessions.map(function (s) {
    return frDate_(s.date) + (s.startTime ? " " + s.startTime : "") + " — " + ((readFormations_().byId[s.training] || {}).name || s.training) + " — " + s.seatsLeft + " place(s) disponible(s) sur " + s.capacity + " — " + LABEL[s.status];
  }).join("\n") : "Aucune session publiée à venir.", ui_().ButtonSet.OK);
}

function configurerMicrosoft() {
  var ui = ui_(), p = PropertiesService.getScriptProperties();
  var ask = function (title, help) {
    var r = ui.prompt(title, help, ui.ButtonSet.OK_CANCEL);
    return r.getSelectedButton() === ui.Button.OK ? clean_(r.getResponseText(), 400) : null;
  };
  var tenant = ask("1/4 — ID de l'annuaire (tenant)", "Microsoft Entra › Inscriptions d'applications › votre application › « ID de l'annuaire (locataire) ».");
  if (!tenant) return;
  var client = ask("2/4 — ID de l'application (client)", "Même page : « ID d'application (client) ».");
  if (!client) return;
  var secret = ask("3/4 — Secret client (valeur)", "Certificats et secrets › la VALEUR du secret (pas son ID). Elle est rangée dans les propriétés du script, jamais dans la feuille.");
  if (!secret) return;
  var mailbox = ask("4/4 — Boîte du calendrier des formations", "Adresse de la boîte partagée dédiée, par ex. formations@wisysafety.be.");
  if (!mailbox || !EMAIL_RE.test(mailbox)) { ui.alert("Adresse invalide : rien n'a été enregistré."); return; }
  p.setProperties({ MS_TENANT_ID: tenant, MS_CLIENT_ID: client, MS_CLIENT_SECRET: secret, MS_MAILBOX: mailbox });
  CacheService.getScriptCache().remove("ms:token:" + client);
  testerOutlook();
}

/** Vérifie la chaîne d'envoi réelle (Microsoft 365 si configuré, sinon Gmail) vers CONFIG.NOTIFY_EMAIL. */
function envoyerUnEmailDeTest() {
  var ui = ui_();
  if (!CONFIG.NOTIFY_EMAIL) { ui.alert("Aucune adresse d'équipe : renseignez CONFIG.NOTIFY_EMAIL en haut du script."); return; }
  try {
    sendEmail_(CONFIG.NOTIFY_EMAIL, "Wisy Safety — e-mail de test (" + fmt_(now_(), "dd/MM/yyyy HH:mm") + ")",
      emailFrame_("E-mail de test", "<p>Si vous lisez ce message dans la boîte " + esc_(CONFIG.NOTIFY_EMAIL) + ", les demandes du site vous parviennent.</p>" +
        "<p>Expéditeur utilisé : " + (msConfig_() ? "Microsoft 365 (" + esc_(msConfig_().mailbox) + ")" : "compte Google du script (Gmail)") + ".</p>"));
    ui.alert("E-mail de test envoyé à " + CONFIG.NOTIFY_EMAIL + ". S'il n'arrive pas dans les 5 minutes, regardez dans les indésirables puis dans l'onglet « " + TAB.LOG + " ».");
  } catch (err) {
    ui.alert("L'envoi a échoué : " + String(err && err.message || err).slice(0, 400));
  }
}

function testerOutlook() {
  var ui = ui_(), ms = msConfig_();
  if (!ms) { ui.alert("Outlook n'est pas configuré : menu Wisy Safety › Configurer Microsoft 365."); return; }
  try {
    var res = graph_(ms, "get", "/users/" + encodeURIComponent(ms.mailbox) + "/calendar?$select=name");
    if (res.code !== 200) throw new Error("accès au calendrier refusé (" + res.code + ") " + graphError_(res));
    ui.alert("Connexion Outlook réussie : calendrier « " + (res.json.name || "Calendrier") + " » de " + ms.mailbox + ".");
  } catch (err) {
    ui.alert("La connexion Outlook a échoué : " + String(err && err.message || err).slice(0, 400) + "\n\nVérifiez les 4 valeurs (menu › Configurer Microsoft 365) et les autorisations décrites dans docs/README-RESERVATIONS.md.");
  }
}

/* ======================================================================= installation / mise en forme */

function setupTab_(ss, name) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var cols = COLS[name];
  var header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  if (header.every(function (h) { return String(h).trim() === ""; })) {
    sheet.getRange(1, 1, 1, cols.length).setValues([cols.map(function (c) { return c[1]; })]);
  } else {
    /* Colonnes manquantes ajoutées à droite (une feuille déjà utilisée n'est jamais réorganisée). */
    var have = {};
    header.forEach(function (h) { have[normalizeHeader_(h)] = true; });
    var next = sheet.getLastColumn() + 1;
    cols.forEach(function (c) { if (!have[normalizeHeader_(c[1])]) sheet.getRange(1, next++).setValue(c[1]); });
  }
  var t = table_(name);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, t.width).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#16302A").setVerticalAlignment("middle").setWrap(true);
  cols.forEach(function (c) {
    var i = t.col[c[0]];
    if (i === undefined) return;
    sheet.setColumnWidth(i + 1, c[3]);
    if (c[2]) sheet.getRange(1, i + 1).setNote(c[2]);
    if (c[4]) sheet.hideColumns(i + 1);
  });
  return t;
}

function setupTabs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [TAB.FORMATIONS, TAB.SESSIONS, TAB.BOOKINGS, TAB.PEOPLE, TAB.GAPS, TAB.OUTBOX, TAB.LOG, TAB.REQUESTS].forEach(function (n) { setupTab_(ss, n); });
}

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try { ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE); } catch (e) { /* déjà réglé */ }
  try { ss.setSpreadsheetLocale(CONFIG.LOCALE); } catch (e) { /* déjà réglé */ }
  if (/^(Feuille de calcul sans titre|Untitled spreadsheet)$/.test(ss.getName())) ss.rename(CONFIG.FILE_NAME);
  setupTabs_();

  /* Formations : toutes celles du site (les lignes existantes sont gardées, les manquantes ajoutées). */
  var ft = table_(TAB.FORMATIONS), known = {};
  for (var r = 1; r < ft.values.length; r++) known[clean_(get_(ft, ft.values[r], "id")).toLowerCase()] = true;
  appendRows_(ft, FORMATIONS.filter(function (f) { return !known[f[0]]; }).map(function (f) {
    return rowFor_(ft, { id: f[0], name: f[1], kind: f[2], price: f[3], duration: f[4], page: CONFIG.SITE_URL + f[5], bookable: true });
  }));
  var fRows = Math.max(ft.sheet.getLastRow() - 1, 1);
  if (ft.col.bookable !== undefined) ft.sheet.getRange(2, ft.col.bookable + 1, fRows, 1).insertCheckboxes();
  if (ft.col.id !== undefined) ft.sheet.getRange(2, ft.col.id + 1, fRows, 1).setFontColor("#5E6D6A");

  /* Sessions : mise en forme, puis première session (seulement si l'onglet est vide et la date à venir). */
  var st = table_(TAB.SESSIONS), sh = st.sheet, rows = Math.max(1, sh.getMaxRows() - 1);
  var c = st.col, range = function (f) { return sh.getRange(2, c[f] + 1, rows, 1); };
  range("start").setNumberFormat("@");   // « 10:00 » reste un texte (jamais converti en heure par Google Sheets)
  range("end").setNumberFormat("@");
  if (st.values.length < 2 || st.values.slice(1).every(emptyRow_)) {
    var today = fmt_(now_(), "yyyy-MM-dd");
    appendRows_(st, SEED_SESSIONS.filter(function (s) { return s.date >= today; }).map(function (s) {
      return rowFor_(st, { id: s.date + "-" + s.training, training: (FORMATIONS.filter(function (f) { return f[0] === s.training; })[0] || [])[1] || s.training,
        date: at_(s.date, "12:00"), start: s.start, end: s.end, capacity: s.capacity, status: S_OPEN, published: true });   // colonnes déjà en texte
    }));
  }
  var names = readFormations_().list.map(function (f) { return f.name; });
  range("training").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(names, true).setAllowInvalid(false).setHelpText("Choisissez une formation de l'onglet « Formations ».").build());
  range("date").setNumberFormat("dd/mm/yyyy").setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText("Date de la session, JJ/MM/AAAA.").build());
  range("start").setNumberFormat("@").setHorizontalAlignment("center");
  range("end").setNumberFormat("@").setHorizontalAlignment("center");
  range("capacity").setHorizontalAlignment("center").setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(1, 500).setAllowInvalid(false).setHelpText("Nombre de places, de 1 à 500.").build());
  range("booked").setHorizontalAlignment("center").setFontColor("#5E6D6A").setBackground("#F4FAF9");
  range("remaining").setHorizontalAlignment("center").setFontWeight("bold").setBackground("#F4FAF9");
  range("status").setHorizontalAlignment("center").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SESSION_STATUSES, true).setAllowInvalid(false).setHelpText("Ouverte · Fermée · Annulée").build());
  range("closes").setNumberFormat("dd/mm/yyyy hh:mm");
  range("language").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LANGUAGES.map(function (l) { return l[1]; }), true).setAllowInvalid(true).build());
  range("published").insertCheckboxes();
  range("outlook").setFontColor("#5E6D6A");
  range("id").setFontColor("#5E6D6A");
  var byText = function (text, bg, fg, rg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([rg]).build(); };
  sh.setConditionalFormatRules([
    byText(S_OPEN, "#DDF4EE", "#1F6F64", range("status")),
    byText(S_CLOSED, "#FFF1D6", "#8A5A00", range("status")),
    byText(S_CANCELLED, "#ECEFEE", "#5E6D6A", range("status")),
    SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(0).setBackground("#FDE2E1").setFontColor("#A3221B").setRanges([range("remaining")]).build()
  ]);
  ["id", "booked", "remaining", "outlook"].forEach(function (f) {
    if (c[f] === undefined) return;
    sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === "Calculé : " + f) p.remove(); });
    sh.getRange(2, c[f] + 1, rows, 1).protect().setDescription("Calculé : " + f).setWarningOnly(true);
  });

  /* Réservations / Participants : écrits par le script — avertissement en cas de modification à la main. */
  [TAB.BOOKINGS, TAB.PEOPLE, TAB.OUTBOX, TAB.LOG].forEach(function (n) {
    var sheet = ss.getSheetByName(n);
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    sheet.protect().setDescription("Écrit par le script Wisy Safety : utilisez le menu pour annuler une réservation").setWarningOnly(true);
  });
  var bt = table_(TAB.BOOKINGS), bRows = Math.max(1, bt.sheet.getMaxRows() - 1);
  bt.sheet.getRange(2, bt.col.status + 1, bRows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(BOOKING_STATUSES, true).setAllowInvalid(false).build());
  bt.sheet.getRange(2, bt.col.received + 1, bRows, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  bt.sheet.getRange(2, bt.col.expires + 1, bRows, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  bt.sheet.getRange(2, bt.col.cancelled + 1, bRows, 1).setNumberFormat("dd/mm/yyyy hh:mm");
  bt.sheet.setConditionalFormatRules([
    byText(B_CONFIRMED, "#DDF4EE", "#1F6F64", bt.sheet.getRange(2, bt.col.status + 1, bRows, 1)),
    byText(B_PENDING, "#FFF1D6", "#8A5A00", bt.sheet.getRange(2, bt.col.status + 1, bRows, 1)),
    byText(B_CANCELLED, "#ECEFEE", "#5E6D6A", bt.sheet.getRange(2, bt.col.status + 1, bRows, 1))
  ]);
  formatRequestsTab_();
  var gt = table_(TAB.GAPS);
  gt.sheet.getRange(2, gt.col.decision + 1, Math.max(1, gt.sheet.getMaxRows() - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([G_TODO, G_APPLY, G_IGNORE], true).setAllowInvalid(true).build());
  ss.setActiveSheet(sh);

  /* Tâche automatique toutes les 10 minutes (une seule). */
  ScriptApp.getProjectTriggers().forEach(function (tr) { if (tr.getHandlerFunction() === "tick") ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger("tick").timeBased().everyMinutes(CONFIG.SYNC_EVERY_MINUTES).create();

  completeSessionIds_();
  refreshAll_();
  clearCache_();
  var done = "Feuille prête ✔\n\n• Formations : " + readFormations_().list.length + " formations du site.\n• Sessions : la liste des sessions (une ligne = une date).\n" +
    "• Les places restantes sont calculées automatiquement.\n\nÉtape suivante : Déployer › Nouveau déploiement › Application Web (voir docs/README-RESERVATIONS.md).";
  try { ui_().alert(done); } catch (e) { try { ss.toast("Feuille prête ✔ — voir docs/README-RESERVATIONS.md", "Wisy Safety", 10); } catch (e2) { /* lancé depuis l'éditeur */ } }
}
