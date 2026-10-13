/* =========================================================================
   WISY SAFETY — Registre des certificats : import / export Excel (CSV), SANS interface
   -------------------------------------------------------------------------
   Utilisé par admin/certificats.html (js/certificats-admin.js) et testé par tests/certificats.test.js.

   Excel → « Fichier › Enregistrer sous › CSV UTF-8 (délimité par des virgules) » ou « CSV (séparateur :
   point-virgule) » : les deux sont acceptés (séparateur « ; », « , » ou tabulation détecté tout seul,
   UTF-8 ou Windows-1252). Les en-têtes du modèle de l'ancienne extension WordPress sont reconnus aussi.

   Règles (aucune donnée devinée) :
     - une date illisible ou impossible (« 31/02/1990 », « 03/04/90 ») REJETTE la ligne ;
     - nom, formation et numéro de certificat sont obligatoires (numéro : sauf option « générer ») ;
     - une ligne sans date de naissance est acceptée mais signalée : elle ne sera pas trouvable en ligne ;
     - à la mise à jour d'un certificat existant (même numéro), une cellule VIDE ne modifie rien.
   ========================================================================= */
(function (root) {
  "use strict";

  /* Colonnes du registre, dans l'ordre du modèle Excel (en-tête français → champ de la base). */
  var COLUMNS = [
    ["numero_certificat", "certificate_number"],
    ["nom", "last_name"],
    ["prenom", "first_name"],
    ["autres_noms", "other_last_names"],
    ["date_naissance", "birth_date"],
    ["formation", "training"],
    ["date_formation", "training_date"],
    ["date_delivrance", "issue_date"],
    ["date_expiration", "expiry_date"],
    ["revoque", "revoked"],
    ["motif_revocation", "revoked_reason"],
    ["entreprise", "company"],
    ["email", "email"],
    ["telephone", "phone"],
    ["notes", "notes"]
  ];
  var FIELDS = COLUMNS.map(function (c) { return c[1]; });
  var DATE_FIELDS = ["birth_date", "training_date", "issue_date", "expiry_date"];
  var LIMITS = { certificate_number: 60, last_name: 80, first_name: 80, other_last_names: 160, training: 160, company: 160, email: 160, phone: 40, revoked_reason: 500, notes: 2000 };

  /* En-têtes reconnus (après normalisation : minuscules, sans accents, « _ » comme séparateur). */
  var ALIASES = {
    certificate_number: ["numero_certificat", "numero_de_certificat", "n_certificat", "n_de_certificat", "no_certificat", "no_de_certificat", "num_certificat", "numero", "n", "no", "numero_diplome", "numero_de_diplome", "n_diplome", "n_de_diplome", "diploma_number", "certificate_number", "certificate_no", "certificaatnummer"],
    last_name: ["nom", "nom_de_famille", "nom_famille", "last_name", "lastname", "surname", "family_name", "achternaam", "familienname", "nachname"],
    first_name: ["prenom", "first_name", "firstname", "given_name", "voornaam", "vorname"],
    other_last_names: ["autres_noms", "autres_noms_de_famille", "autre_nom", "nom_d_usage", "nom_de_naissance", "other_last_names", "other_names"],
    birth_date: ["date_naissance", "date_de_naissance", "naissance", "ne_le", "nee_le", "birth_date", "birthdate", "date_of_birth", "dob", "geboortedatum", "geburtsdatum"],
    training: ["formation", "formation_suivie", "intitule", "intitule_formation", "cours", "training", "course", "opleiding", "schulung"],
    training_date: ["date_formation", "date_de_formation", "date_examen", "date_d_examen", "training_date", "exam_date", "opleidingsdatum"],
    issue_date: ["date_delivrance", "date_de_delivrance", "delivre_le", "date_emission", "issue_date", "issued_on"],
    expiry_date: ["date_expiration", "date_d_expiration", "expiration", "date_validite", "date_de_validite", "fin_de_validite", "valable_jusqu_au", "valide_jusqu_au", "expiry_date", "expiration_date", "valid_until", "geldig_tot"],
    revoked: ["revoque", "revoquee", "revocation", "revoked"],
    revoked_reason: ["motif_revocation", "motif_de_revocation", "revoked_reason", "revocation_reason"],
    company: ["entreprise", "employeur", "societe", "company", "employer", "bedrijf", "firma"],
    email: ["email", "e_mail", "mail", "courriel", "adresse_email", "email_entreprise"],
    phone: ["telephone", "tel", "gsm", "portable", "phone", "telephone_employeur", "telefoon"],
    notes: ["notes", "note", "note_interne", "remarque", "remarques", "commentaire", "commentaires", "comments"]
  };
  /* Colonnes de l'ancien modèle WordPress, connues mais sans équivalent : ignorées sans avertissement. */
  var IGNORED = ["id_wordpress", "id", "date_revocation", "masquer_pdf"];
  var HEADER_MAP = {};
  Object.keys(ALIASES).forEach(function (f) { ALIASES[f].forEach(function (a) { HEADER_MAP[a] = f; }); });

  function normalizeHeader(h) {
    return String(h == null ? "" : h)
      .replace(/^﻿/, "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[°º]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /* ------------------------------------------------------------------ lecture du fichier */

  /** Octets → texte : UTF-8 si le fichier en est (avec ou sans BOM), sinon Windows-1252 (« CSV » d'Excel sous Windows). */
  function decodeBytes(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    try { return new TextDecoder("utf-8", { fatal: true }).decode(u8).replace(/^﻿/, ""); }
    catch (e) {
      try { return new TextDecoder("windows-1252").decode(u8); }
      catch (e2) { return Array.prototype.map.call(u8, function (b) { return String.fromCharCode(b); }).join(""); }
    }
  }

  /** Séparateur le plus fréquent (hors guillemets) sur la ligne d'en-tête : « ; », « , » ou tabulation. */
  function detectDelimiter(text) {
    var line = String(text).replace(/^﻿/, "").split(/\r\n|\n|\r/)[0] || "";
    var counts = { ";": 0, ",": 0, "\t": 0 }, q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') q = !q;
      else if (!q && counts[c] !== undefined) counts[c]++;
    }
    var best = ";";
    [",", "\t"].forEach(function (d) { if (counts[d] > counts[best]) best = d; });
    return best;
  }

  /** CSV (RFC 4180) → tableau de lignes ; gère guillemets, guillemets doublés, retours à la ligne dans une cellule. */
  function parseCSV(text, delimiter) {
    var s = String(text == null ? "" : text).replace(/^﻿/, "");
    var d = delimiter || detectDelimiter(s);
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
        continue;
      }
      if (c === '"' && cell === "") { q = true; continue; }
      if (c === d) { row.push(cell); cell = ""; continue; }
      if (c === "\r" || c === "\n") {
        if (c === "\r" && s[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
        continue;
      }
      cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ""; }); });
  }

  /* ------------------------------------------------------------------ valeurs */

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isRealDate(y, m, d) {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  /**
   * Date d'une cellule Excel → AAAA-MM-JJ. Formats : JJ/MM/AAAA (« / », « - », « . »), AAAA-MM-JJ, AAAA/MM/JJ,
   * numéro de série Excel (ex. 45000). Jamais d'année sur deux chiffres (ambiguë).
   * @returns {{iso:string, error:string}} error : "" | "format" | "invalid"
   */
  function parseDate(value) {
    var v = String(value == null ? "" : value).trim();
    if (!v) return { iso: "", error: "" };
    var p, y, m, d;
    if ((p = v.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/))) { y = +p[1]; m = +p[2]; d = +p[3]; }
    else if ((p = v.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?: \d{1,2}:\d{2}(?::\d{2})?)?$/))) { d = +p[1]; m = +p[2]; y = +p[3]; }
    else if (/^\d{4,5}$/.test(v) && +v >= 1 && +v < 120000) {
      var ms = Date.UTC(1899, 11, 30) + (+v) * 86400000, dt = new Date(ms);
      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
    } else return { iso: "", error: "format" };
    if (!isRealDate(y, m, d)) return { iso: "", error: "invalid" };
    return { iso: y + "-" + pad(m) + "-" + pad(d), error: "" };
  }

  /** Oui / non d'une cellule. @returns {boolean|null} null = valeur incompréhensible. */
  function parseBool(value) {
    var v = normalizeHeader(value);
    if (!v || ["non", "no", "nee", "nein", "n", "false", "faux", "0"].indexOf(v) >= 0) return false;
    if (["oui", "yes", "ja", "y", "o", "true", "vrai", "1", "x"].indexOf(v) >= 0) return true;
    return null;
  }

  function clean(v) { return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(); }
  function cleanNumber(v) { return clean(v).toUpperCase(); }

  /** Date du jour à Bruxelles (AAAA-MM-JJ). */
  function todayBrussels(now) {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now || new Date());
      var get = function (t) { return (parts.filter(function (x) { return x.type === t; })[0] || {}).value; };
      return get("year") + "-" + get("month") + "-" + get("day");
    } catch (e) {
      var dt = now || new Date();
      return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
    }
  }

  /** Même règle que la fonction verify_certificate du serveur. */
  function statusOf(rec, today) {
    if (rec.revoked) return "revoked";
    if (!rec.expiry_date) return "undetermined";
    return rec.expiry_date >= (today || todayBrussels()) ? "valid" : "expired";
  }

  /** Numéro de certificat généré : WS-AAAA-XXXXX (alphabet sans caractères ambigus). */
  function generateNumber(existing, rand, year) {
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = rand || Math.random, y = year || new Date().getFullYear();
    for (var t = 0; t < 50; t++) {
      var s = "WS-" + y + "-";
      for (var i = 0; i < 5; i++) s += A[Math.floor(r() * A.length)];
      if (!existing || !existing[s]) return s;
    }
    return "WS-" + y + "-" + Date.now().toString(36).toUpperCase();
  }

  /* ------------------------------------------------------------------ fiche (formulaire ou ligne CSV) */

  /**
   * Contrôle d'une fiche (valeurs brutes). Renvoie la fiche nettoyée + erreurs / avertissements lisibles.
   * @param {Object} raw  champs de la base, valeurs texte (dates en JJ/MM/AAAA ou AAAA-MM-JJ)
   * @param {{allowMissingNumber?:boolean, partial?:boolean}} opts partial : les champs vides sont ignorés (mise à jour)
   */
  function validateRecord(raw, opts) {
    opts = opts || {};
    var rec = {}, errors = [], warnings = [];
    FIELDS.forEach(function (f) {
      var v = raw[f];
      if (f === "revoked") {
        if (v === true || v === false) { rec.revoked = v; return; }
        var b = parseBool(v);
        if (b === null) errors.push("« Révoqué » doit valoir oui ou non (valeur : « " + clean(v).slice(0, 20) + " »).");
        else if (!(opts.partial && clean(v) === "")) rec.revoked = b;
        return;
      }
      if (DATE_FIELDS.indexOf(f) >= 0) {
        var pd = parseDate(v);
        if (pd.error) errors.push(LABELS[f] + " : date " + (pd.error === "format" ? "illisible" : "impossible") + " (« " + clean(v).slice(0, 20) + " ») — format JJ/MM/AAAA.");
        else if (pd.iso || !opts.partial) rec[f] = pd.iso || null;
        return;
      }
      var s = f === "certificate_number" ? cleanNumber(v) : (f === "email" ? clean(v).toLowerCase() : clean(v));
      if (s && LIMITS[f] && Array.from(s).length > LIMITS[f]) errors.push(LABELS[f] + " : trop long (" + LIMITS[f] + " caractères au maximum).");
      if (s || !opts.partial) rec[f] = s || null;
    });
    if (!opts.partial) {
      if (!rec.last_name) errors.push("Le nom de famille est obligatoire.");
      if (!rec.training) errors.push("La formation est obligatoire.");
      if (!rec.certificate_number && !opts.allowMissingNumber) errors.push("Le numéro de certificat est obligatoire.");
      if (!rec.birth_date && !parseDate(raw.birth_date).error) warnings.push("Sans date de naissance, ce certificat ne pourra pas être trouvé en ligne.");
      if (rec.revoked === undefined) rec.revoked = false;
    }
    if (rec.last_name && /[0-9<>{}\[\]\\\/@#$%^*=+|~"]/.test(rec.last_name)) errors.push("Le nom de famille contient des caractères non autorisés (chiffres ou symboles).");
    if (rec.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rec.email)) errors.push("Adresse e-mail invalide.");
    if (rec.birth_date && rec.birth_date > todayBrussels()) errors.push("La date de naissance est dans le futur.");
    if (rec.expiry_date && rec.training_date && rec.expiry_date < rec.training_date) errors.push("La fin de validité est antérieure à la date de formation.");
    return { record: rec, errors: errors, warnings: warnings };
  }
  var LABELS = {
    certificate_number: "Numéro de certificat", last_name: "Nom de famille", first_name: "Prénom", other_last_names: "Autres noms",
    birth_date: "Date de naissance", training: "Formation", training_date: "Date de formation", issue_date: "Date de délivrance",
    expiry_date: "Valable jusqu'au", revoked: "Révoqué", revoked_reason: "Motif de révocation", company: "Entreprise",
    email: "E-mail", phone: "Téléphone", notes: "Notes"
  };

  /* ------------------------------------------------------------------ import complet */

  /**
   * Analyse un fichier CSV complet.
   * @param {string} text
   * @param {{existing?:Object<string,Object>, generateMissing?:boolean, rand?:Function}} opts
   *   existing : fiches déjà enregistrées, indexées par numéro de certificat (pour fusionner les mises à jour)
   * @returns {{ok:boolean, error:string, columns:Array, ignored:Array, rows:Array, summary:Object}}
   *   rows[i] = { line, action: "create"|"update"|"error", record (complet, prêt à enregistrer), errors, warnings, label }
   */
  function analyze(text, opts) {
    opts = opts || {};
    var existing = opts.existing || {};
    var table = parseCSV(text);
    var empty = { ok: false, columns: [], ignored: [], rows: [], summary: { create: 0, update: 0, error: 0, warning: 0, total: 0 } };
    if (!table.length) { empty.error = "Le fichier est vide."; return empty; }
    if (table.length > 5001) { empty.error = "Le fichier dépasse 5 000 lignes : découpez-le en plusieurs fichiers."; return empty; }
    var header = table[0], map = [], columns = [], ignored = [], seenField = {};
    header.forEach(function (h, i) {
      var n = normalizeHeader(h), f = HEADER_MAP[n];
      if (f && !seenField[f]) { map[i] = f; seenField[f] = true; columns.push({ header: clean(h), field: f }); }
      else { map[i] = null; if (n && IGNORED.indexOf(n) < 0) ignored.push(clean(h)); }
    });
    if (!seenField.last_name || !seenField.training) {
      empty.error = "En-têtes non reconnus : la première ligne doit contenir au moins les colonnes « nom » et « formation » (téléchargez le modèle Excel).";
      empty.ignored = ignored;
      return empty;
    }
    var taken = {}, inFile = {};
    Object.keys(existing).forEach(function (k) { taken[k] = true; });
    var rows = [], summary = { create: 0, update: 0, error: 0, warning: 0, total: 0 };
    for (var r = 1; r < table.length; r++) {
      var raw = {};
      table[r].forEach(function (cell, i) { if (map[i]) raw[map[i]] = cell; });
      var number = cleanNumber(raw.certificate_number);
      var prev = number ? existing[number] : null;
      var res = validateRecord(raw, { partial: !!prev, allowMissingNumber: !!opts.generateMissing });
      var row = { line: r + 1, errors: res.errors.slice(), warnings: res.warnings.slice(), action: prev ? "update" : "create", record: null, label: "" };
      if (number && inFile[number]) row.errors.push("Numéro « " + number + " » déjà présent à la ligne " + inFile[number] + " du fichier.");
      if (prev) {
        var merged = {};
        FIELDS.forEach(function (f) { merged[f] = Object.prototype.hasOwnProperty.call(res.record, f) ? res.record[f] : (prev[f] === undefined ? null : prev[f]); });
        merged.certificate_number = number;
        var check = validateRecord(merged, {});
        check.errors.forEach(function (e) { if (row.errors.indexOf(e) < 0) row.errors.push(e); });
        row.warnings = check.warnings;
        row.record = check.record;
        if (prev.id) row.record.id = prev.id;
      } else {
        row.record = res.record;
        if (!row.record.certificate_number && opts.generateMissing && !row.errors.length) {
          row.record.certificate_number = generateNumber(taken, opts.rand);
          row.warnings.push("Numéro généré : " + row.record.certificate_number + ".");
        }
      }
      if (row.record && row.record.certificate_number) { taken[row.record.certificate_number] = true; if (number) inFile[number] = r + 1; }
      row.label = [clean(raw.last_name), clean(raw.first_name)].filter(Boolean).join(" ") || "(sans nom)";
      if (row.errors.length) { row.action = "error"; summary.error++; }
      else { summary[row.action]++; if (row.warnings.length) summary.warning++; }
      summary.total++;
      rows.push(row);
    }
    return { ok: true, error: "", columns: columns, ignored: ignored, rows: rows, summary: summary };
  }

  /* ------------------------------------------------------------------ export */

  function isoToFr(iso) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : ""; }
  function csvCell(v, d) {
    var s = v == null ? "" : String(v);
    /* Protection contre l'injection de formules Excel (=, +, -, @ en début de cellule). */
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /["\r\n]/.test(s) || s.indexOf(d) >= 0 ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  /** Fiches → CSV pour Excel (BOM UTF-8, séparateur « ; », dates JJ/MM/AAAA). Sans fiche : le modèle vide. */
  function toCSV(records, delimiter) {
    var d = delimiter || ";";
    var lines = [COLUMNS.map(function (c) { return c[0]; }).join(d)];
    (records || []).forEach(function (r) {
      lines.push(COLUMNS.map(function (c) {
        var f = c[1], v = r[f];
        if (DATE_FIELDS.indexOf(f) >= 0) v = isoToFr(v);
        else if (f === "revoked") v = r.revoked ? "oui" : "non";
        return csvCell(v, d);
      }).join(d));
    });
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  var api = {
    COLUMNS: COLUMNS,
    FIELDS: FIELDS,
    LABELS: LABELS,
    normalizeHeader: normalizeHeader,
    decodeBytes: decodeBytes,
    detectDelimiter: detectDelimiter,
    parseCSV: parseCSV,
    parseDate: parseDate,
    parseBool: parseBool,
    todayBrussels: todayBrussels,
    statusOf: statusOf,
    generateNumber: generateNumber,
    validateRecord: validateRecord,
    analyze: analyze,
    toCSV: toCSV,
    isoToFr: isoToFr
  };
  root.WisyCertificatesImport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
