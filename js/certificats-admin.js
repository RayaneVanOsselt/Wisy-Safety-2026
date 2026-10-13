/* =========================================================================
   WISY SAFETY — Administration du registre des certificats (admin/certificats.html)
   -------------------------------------------------------------------------
   Connexion Supabase (compte portant le rôle « admin »), liste filtrable, fiche d'ajout / de
   modification, import Excel (CSV) avec aperçu avant écriture, export, PDF privé.
   Logique d'import / export sans interface : js/certificats-import.js.

   Sécurité : la page n'a AUCUN privilège propre. Tout passe par la session de l'administrateur et
   les règles Row Level Security de supabase/certificats.sql : un compte sans rôle « admin » ne voit
   rien et ne peut rien écrire, même en modifiant ce script. Données insérées avec textContent.
   ========================================================================= */
(function () {
  "use strict";

  var CFG = window.WISY_CONFIG || {};
  var X = window.WisyCertificatesImport;
  var $ = function (id) { return document.getElementById(id); };
  var configured = CFG.SUPABASE_URL && !/VOTRE[-_]/.test(CFG.SUPABASE_URL + CFG.SUPABASE_ANON_KEY) && CFG.SUPABASE_ANON_KEY && window.supabase && X;
  if (!configured) { $("cfg-warn").hidden = false; $("l-btn").disabled = true; return; }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  var BUCKET = "certificats";
  var PAGE = 50;
  var state = { all: [], byNumber: {}, filter: "all", query: "", page: 0, editing: null, analysis: null, user: null };

  /* ------------------------------------------------------------------ utilitaires */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fold(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function today() { return X.todayBrussels(); }
  function addDays(iso, n) { var p = iso.split("-"); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.toISOString().slice(0, 10); }
  function addYears(iso, n) {
    var p = iso.split("-"), y = +p[0] + n, m = +p[1], d = +p[2];
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return y + "-" + ("0" + m).slice(-2) + "-" + ("0" + Math.min(d, last)).slice(-2);
  }
  function statusOf(r) {
    var s = X.statusOf(r, today());
    if (s === "valid" && r.expiry_date <= addDays(today(), 90)) return "soon";
    return s;
  }
  var STATUS_LABEL = { valid: "Valide", soon: "Expire bientôt", expired: "Expiré", revoked: "Révoqué", undetermined: "À confirmer" };
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 3200);
  }
  function friendlyError(err) {
    var m = (err && (err.message || err.error_description || err.details)) || "";
    if (/certificates_number_unique|duplicate key/i.test(m)) return "Ce numéro de certificat existe déjà.";
    if (/row-level security|permission denied|42501/i.test(m)) return "Action refusée : ce compte n'a pas le rôle administrateur (voir le guide, étape 2).";
    if (/certificates_dates_order/.test(m)) return "La fin de validité est antérieure à la date de formation.";
    if (/certificates_email_format/.test(m)) return "Adresse e-mail invalide.";
    if (/relation .*certificates.* does not exist|PGRST205|schema cache/i.test(m)) return "La table n'existe pas encore : exécutez supabase/certificats.sql (guide, étape 1).";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Connexion impossible. Vérifiez votre accès à Internet.";
    return "Erreur : " + (m || "inconnue");
  }
  function download(name, text) {
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ------------------------------------------------------------------ session */
  function isAdmin(session) { return !!(session && session.user && session.user.app_metadata && session.user.app_metadata.role === "admin"); }
  sb.auth.getSession().then(function (r) { if (r.data.session) showDash(r.data.session); });
  sb.auth.onAuthStateChange(function (_e, session) { if (session) showDash(session); else showLogin(); });

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("l-msg"), btn = $("l-btn");
    msg.textContent = ""; msg.className = "msg"; btn.disabled = true;
    sb.auth.signInWithPassword({ email: $("l-email").value.trim(), password: $("l-pass").value })
      .then(function (r) { if (r.error) { msg.textContent = "Identifiants incorrects."; msg.className = "msg err"; } })
      .catch(function () { msg.textContent = "Connexion impossible."; msg.className = "msg err"; })
      .then(function () { btn.disabled = false; });
  });
  $("signout").addEventListener("click", function () { sb.auth.signOut(); });

  function showLogin() { $("dash").hidden = true; $("login").hidden = false; state.all = []; renderTable(); }
  function showDash(session) {
    if (state.user === session.user.id && !$("dash").hidden) return;
    state.user = session.user.id;
    $("login").hidden = true; $("dash").hidden = false;
    $("who").textContent = session.user.email || "";
    $("role-warn").hidden = isAdmin(session);
    loadAll();
    loadLookups();
  }

  /* ------------------------------------------------------------------ chargement */
  function loadAll() {
    $("state").hidden = false; $("state").textContent = "Chargement du registre…";
    var out = [];
    function page(from) {
      return sb.from("certificates").select("*").order("last_name", { ascending: true }).order("first_name", { ascending: true }).range(from, from + 999)
        .then(function (r) {
          if (r.error) throw r.error;
          out = out.concat(r.data || []);
          if ((r.data || []).length === 1000) return page(from + 1000);
          return out;
        });
    }
    return page(0).then(function (rows) {
      state.all = rows;
      state.byNumber = {};
      rows.forEach(function (r) { state.byNumber[r.certificate_number] = r; });
      fillTrainings();
      renderStats();
      renderTable();
    }).catch(function (err) { state.all = []; renderStats(); renderTable(friendlyError(err)); });
  }
  function loadLookups() {
    var since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    sb.from("certificate_lookups").select("id", { count: "exact", head: true }).gte("created_at", since)
      .then(function (r) { $("dash").querySelector('[data-stat="lookups"]').textContent = r.error ? "–" : String(r.count || 0); });
  }
  function fillTrainings() {
    var names = {};
    (window.WisySite && window.WisySite.formations ? window.WisySite.formations() : []).forEach(function (f) { if (f.title) names[f.title] = 1; });
    state.all.forEach(function (r) { if (r.training) names[r.training] = 1; });
    var dl = $("trainings");
    dl.textContent = "";
    Object.keys(names).sort(function (a, b) { return a.localeCompare(b, "fr"); }).forEach(function (n) { var o = document.createElement("option"); o.value = n; dl.appendChild(o); });
  }

  /* ------------------------------------------------------------------ statistiques, filtres, tableau */
  function renderStats() {
    var c = { all: state.all.length, valid: 0, soon: 0, expired: 0, revoked: 0, nobirth: 0 };
    state.all.forEach(function (r) {
      var s = statusOf(r);
      if (s === "valid" || s === "soon") c.valid++;
      if (s === "soon") c.soon++;
      if (s === "expired") c.expired++;
      if (s === "revoked") c.revoked++;
      if (!r.birth_date) c.nobirth++;
    });
    Object.keys(c).forEach(function (k) { var b = document.querySelector('[data-stat="' + k + '"]'); if (b) b.textContent = String(c[k]); });
  }
  function filtered() {
    var q = fold(state.query).trim();
    return state.all.filter(function (r) {
      var s = statusOf(r);
      if (state.filter === "valid" && s !== "valid" && s !== "soon") return false;
      if (state.filter === "soon" && s !== "soon") return false;
      if (state.filter === "expired" && s !== "expired") return false;
      if (state.filter === "revoked" && s !== "revoked") return false;
      if (state.filter === "nobirth" && r.birth_date) return false;
      if (!q) return true;
      return fold([r.last_name, r.first_name, r.other_last_names, r.certificate_number, r.training, r.company, r.email].join(" ")).indexOf(q) >= 0;
    });
  }
  function renderTable(errorText) {
    var tbody = $("rows"), st = $("state"), pager = $("pager");
    tbody.textContent = "";
    if (errorText) { st.hidden = false; st.textContent = errorText; pager.hidden = true; return; }
    var list = filtered();
    if (!list.length) {
      st.hidden = false;
      st.textContent = state.all.length ? "Aucun certificat ne correspond à ce filtre." : "Le registre est vide : ajoutez une personne ou importez votre fichier Excel.";
      pager.hidden = true;
      return;
    }
    st.hidden = true;
    var pages = Math.ceil(list.length / PAGE);
    if (state.page >= pages) state.page = pages - 1;
    list.slice(state.page * PAGE, state.page * PAGE + PAGE).forEach(function (r) {
      var tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.setAttribute("aria-label", "Modifier " + r.last_name + " " + (r.first_name || ""));
      var name = el("td", "name");
      name.appendChild(el("b", null, r.last_name + (r.first_name ? " " + r.first_name : "")));
      if (!r.birth_date) name.appendChild(el("span", "flag", "sans date de naissance"));
      if (r.company) name.appendChild(el("small", null, r.company));
      tr.appendChild(name);
      tr.appendChild(el("td", "wrap-cell", r.training));
      tr.appendChild(el("td", "num", r.certificate_number));
      tr.appendChild(el("td", "opt", X.isoToFr(r.training_date)));
      tr.appendChild(el("td", null, r.expiry_date ? X.isoToFr(r.expiry_date) : "—"));
      var s = statusOf(r), td = el("td");
      td.appendChild(el("span", "badge badge--" + (s === "soon" ? "soon" : s), STATUS_LABEL[s]));
      tr.appendChild(td);
      tr.addEventListener("click", function () { openEdit(r); });
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(r); } });
      tbody.appendChild(tr);
    });
    pager.hidden = pages <= 1;
    $("pager-info").textContent = list.length + " certificat" + (list.length > 1 ? "s" : "") + " · page " + (state.page + 1) + " sur " + pages;
    $("prev").disabled = state.page === 0;
    $("next").disabled = state.page >= pages - 1;
  }
  $("prev").addEventListener("click", function () { state.page = Math.max(0, state.page - 1); renderTable(); });
  $("next").addEventListener("click", function () { state.page++; renderTable(); });
  $("q").addEventListener("input", function () { state.query = this.value; state.page = 0; renderTable(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (b) {
    b.addEventListener("click", function () {
      state.filter = b.getAttribute("data-filter"); state.page = 0;
      Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (x) { x.classList.toggle("is-active", x === b); });
      renderTable();
    });
  });

  /* ------------------------------------------------------------------ fenêtres */
  function closeOn(dlg) {
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", function () { dlg.close(); }); });
  }
  closeOn($("dlg-edit"));
  closeOn($("dlg-import"));

  /* ------------------------------------------------------------------ fiche */
  var form = $("edit-form");
  var TEXT_FIELDS = ["last_name", "first_name", "other_last_names", "training", "certificate_number", "revoked_reason", "company", "email", "phone", "notes"];
  var DATE_FIELDS = ["birth_date", "training_date", "issue_date", "expiry_date"];

  function showList(box, title, items) {
    box.textContent = "";
    box.hidden = !items.length;
    if (!items.length) return;
    box.appendChild(el("b", null, title));
    var ul = el("ul");
    items.forEach(function (m) { ul.appendChild(el("li", null, m)); });
    box.appendChild(ul);
  }
  function openEdit(rec) {
    state.editing = rec || null;
    $("edit-title").textContent = rec ? "Modifier — " + rec.last_name + (rec.first_name ? " " + rec.first_name : "") : "Ajouter une personne";
    TEXT_FIELDS.forEach(function (f) { form.elements[f].value = rec && rec[f] ? rec[f] : ""; });
    DATE_FIELDS.forEach(function (f) { form.elements[f].value = rec && rec[f] ? rec[f] : ""; });
    form.elements.birth_date.max = today();
    form.elements.revoked.checked = !!(rec && rec.revoked);
    $("btn-delete").hidden = !rec;
    showList($("edit-errors"), "", []);
    showList($("edit-warnings"), "", []);
    renderPdf();
    $("dlg-edit").showModal();
    form.elements.last_name.focus();
  }
  $("btn-add").addEventListener("click", function () { openEdit(null); });
  $("gen-number").addEventListener("click", function () { form.elements.certificate_number.value = X.generateNumber(state.byNumber); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-years]"), function (b) {
    b.addEventListener("click", function () {
      var n = +b.getAttribute("data-years");
      if (!n) { form.elements.expiry_date.value = ""; return; }
      var start = form.elements.training_date.value || form.elements.issue_date.value;
      if (!start) { toast("Indiquez d'abord la date de formation."); form.elements.training_date.focus(); return; }
      form.elements.expiry_date.value = addYears(start, n);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = {};
    TEXT_FIELDS.forEach(function (f) { raw[f] = form.elements[f].value; });
    DATE_FIELDS.forEach(function (f) { raw[f] = form.elements[f].value; });
    raw.revoked = form.elements.revoked.checked;
    var res = X.validateRecord(raw, {});
    var number = res.record.certificate_number;
    if (number && state.byNumber[number] && (!state.editing || state.byNumber[number].id !== state.editing.id)) res.errors.push("Ce numéro de certificat est déjà utilisé par " + state.byNumber[number].last_name + " " + (state.byNumber[number].first_name || "") + ".");
    showList($("edit-errors"), "À corriger :", res.errors);
    showList($("edit-warnings"), "À savoir :", res.warnings);
    if (res.errors.length) { $("edit-errors").scrollIntoView({ block: "nearest" }); return; }
    var btn = $("btn-save");
    btn.disabled = true;
    var q = state.editing
      ? sb.from("certificates").update(res.record).eq("id", state.editing.id).select().single()
      : sb.from("certificates").insert(res.record).select().single();
    q.then(function (r) {
      if (r.error) throw r.error;
      toast(state.editing ? "Certificat mis à jour." : "Personne ajoutée au registre. Rouvrez sa fiche pour joindre un PDF.");
      state.editing = r.data;
      $("dlg-edit").close();
      return loadAll();
    }).catch(function (err) { showList($("edit-errors"), "Enregistrement impossible :", [friendlyError(err)]); })
      .then(function () { btn.disabled = false; });
  });

  $("btn-delete").addEventListener("click", function () {
    var rec = state.editing;
    if (!rec) return;
    if (!confirm("Supprimer définitivement le certificat " + rec.certificate_number + " de " + rec.last_name + " " + (rec.first_name || "") + " ?\n\nCette action est irréversible.")) return;
    var p = rec.document_path ? sb.storage.from(BUCKET).remove([rec.document_path]).then(function () {}, function () {}) : Promise.resolve();
    p.then(function () { return sb.from("certificates").delete().eq("id", rec.id); })
      .then(function (r) { if (r.error) throw r.error; $("dlg-edit").close(); toast("Certificat supprimé."); return loadAll(); })
      .catch(function (err) { showList($("edit-errors"), "Suppression impossible :", [friendlyError(err)]); });
  });

  /* ------------------------------------------------------------------ PDF privé */
  function renderPdf() {
    var rec = state.editing;
    $("pdf-box").hidden = false;
    $("pdf-pick").disabled = !rec;
    $("pdf-open").hidden = !(rec && rec.document_path);
    $("pdf-remove").hidden = !(rec && rec.document_path);
    $("pdf-state").textContent = !rec ? "Enregistrez d'abord la fiche pour joindre un PDF." : (rec.document_path ? "PDF joint." : "Aucun PDF.");
  }
  $("pdf-pick").addEventListener("click", function () { $("pdf-file").click(); });
  $("pdf-file").addEventListener("change", function () {
    var file = this.files && this.files[0], rec = state.editing;
    this.value = "";
    if (!file || !rec) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { toast("Choisissez un fichier PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { toast("Le PDF dépasse 5 Mo."); return; }
    var path = rec.id + "/certificat-" + Date.now() + ".pdf";
    $("pdf-state").textContent = "Envoi du PDF…";
    sb.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        var old = rec.document_path;
        return sb.from("certificates").update({ document_path: path }).eq("id", rec.id).select().single().then(function (u) {
          if (u.error) throw u.error;
          if (old) sb.storage.from(BUCKET).remove([old]);
          state.editing = u.data;
          toast("PDF joint.");
          return loadAll().then(renderPdf);
        });
      })
      .catch(function (err) { renderPdf(); toast(friendlyError(err)); });
  });
  $("pdf-open").addEventListener("click", function () {
    var rec = state.editing;
    if (!rec || !rec.document_path) return;
    var w = window.open("", "_blank");
    sb.storage.from(BUCKET).createSignedUrl(rec.document_path, 60)
      .then(function (r) { if (r.error) throw r.error; if (w) { w.opener = null; w.location.href = r.data.signedUrl; } })
      .catch(function (err) { if (w) w.close(); toast(friendlyError(err)); });
  });
  $("pdf-remove").addEventListener("click", function () {
    var rec = state.editing;
    if (!rec || !rec.document_path || !confirm("Retirer le PDF de ce certificat ?")) return;
    sb.storage.from(BUCKET).remove([rec.document_path])
      .then(function () { return sb.from("certificates").update({ document_path: null }).eq("id", rec.id).select().single(); })
      .then(function (u) { if (u.error) throw u.error; state.editing = u.data; toast("PDF retiré."); return loadAll().then(renderPdf); })
      .catch(function (err) { toast(friendlyError(err)); });
  });

  /* ------------------------------------------------------------------ export */
  $("btn-export").addEventListener("click", function () {
    var list = filtered();
    if (!list.length) { toast("Rien à exporter."); return; }
    download("certificats-wisy-" + today() + ".csv", X.toCSV(list));
    toast(list.length + " certificat" + (list.length > 1 ? "s" : "") + " exporté" + (list.length > 1 ? "s" : "") + ".");
  });
  $("dl-template").addEventListener("click", function () { download("modele-certificats-wisy.csv", X.toCSV([])); });

  /* ------------------------------------------------------------------ import */
  var drop = $("drop"), input = $("csv-file"), result = $("import-result"), runBtn = $("btn-run-import");
  $("btn-import").addEventListener("click", function () { state.analysis = null; result.textContent = ""; runBtn.disabled = true; $("dlg-import").showModal(); });
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  input.addEventListener("change", function () { if (this.files[0]) readFile(this.files[0]); this.value = ""; });
  $("gen-missing").addEventListener("change", function () { if (state.lastText) analyzeText(state.lastText); });

  function readFile(file) {
    if (/\.xlsx?$/i.test(file.name)) {
      result.textContent = "";
      result.appendChild(el("div", "errors", "Ce fichier est au format Excel (.xlsx). Dans Excel : Fichier › Enregistrer sous › « CSV UTF-8 », puis déposez le fichier .csv obtenu."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) { result.textContent = ""; result.appendChild(el("div", "errors", "Le fichier dépasse 2 Mo : découpez-le en plusieurs fichiers.")); return; }
    file.arrayBuffer().then(function (buf) { state.lastText = X.decodeBytes(new Uint8Array(buf)); state.lastName = file.name; analyzeText(state.lastText); });
  }
  function analyzeText(text) {
    var a = X.analyze(text, { existing: state.byNumber, generateMissing: $("gen-missing").checked });
    state.analysis = a;
    result.textContent = "";
    if (!a.ok) { result.appendChild(el("div", "errors", a.error)); runBtn.disabled = true; return; }
    var s = a.summary;
    var head = el("div", "summary-row");
    head.appendChild(el("span", "chip", (state.lastName || "Fichier") + " · " + s.total + " ligne" + (s.total > 1 ? "s" : "")));
    head.appendChild(el("span", "chip chip--create", s.create + " nouvelle" + (s.create > 1 ? "s" : "")));
    head.appendChild(el("span", "chip chip--update", s.update + " mise" + (s.update > 1 ? "s" : "") + " à jour"));
    if (s.warning) head.appendChild(el("span", "chip chip--warn", s.warning + " à vérifier"));
    if (s.error) head.appendChild(el("span", "chip chip--error", s.error + " en erreur (ignorée" + (s.error > 1 ? "s" : "") + ")"));
    result.appendChild(head);
    if (a.ignored.length) result.appendChild(el("div", "warnings", "Colonnes ignorées (non reconnues) : " + a.ignored.join(", ") + "."));
    var wrap = el("div", "table-wrap");
    wrap.style.maxHeight = "320px";
    var table = el("table", "preview"), thead = el("thead"), tr = el("tr");
    ["Ligne", "Titulaire", "Formation", "N°", "Action", "Remarques"].forEach(function (h) { tr.appendChild(el("th", null, h)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el("tbody");
    a.rows.slice().sort(function (x, y) { return (y.action === "error") - (x.action === "error") || (y.warnings.length > 0) - (x.warnings.length > 0) || x.line - y.line; }).slice(0, 300).forEach(function (row) {
      var r = el("tr", row.action === "error" ? "is-error" : "");
      r.appendChild(el("td", "line", String(row.line)));
      r.appendChild(el("td", null, row.label));
      r.appendChild(el("td", null, row.record && row.record.training || ""));
      r.appendChild(el("td", "num", row.record && row.record.certificate_number || "—"));
      var act = el("td");
      act.appendChild(el("span", "badge " + (row.action === "error" ? "badge--revoked" : row.action === "update" ? "badge--undetermined" : "badge--valid"), row.action === "error" ? "Erreur" : row.action === "update" ? "Mise à jour" : "Nouveau"));
      r.appendChild(act);
      var notes = el("td"), ul = el("ul");
      row.errors.concat(row.warnings).forEach(function (m) { ul.appendChild(el("li", null, m)); });
      if (ul.childNodes.length) notes.appendChild(ul);
      r.appendChild(notes);
      tb.appendChild(r);
    });
    table.appendChild(tb); wrap.appendChild(table); result.appendChild(wrap);
    var n = s.create + s.update;
    runBtn.disabled = !n;
    runBtn.textContent = n ? "Importer " + n + " ligne" + (n > 1 ? "s" : "") : "Importer";
  }

  runBtn.addEventListener("click", function () {
    var a = state.analysis;
    if (!a) return;
    var rows = a.rows.filter(function (r) { return r.action !== "error"; }).map(function (r) {
      var rec = {};
      X.FIELDS.forEach(function (f) { rec[f] = r.record[f] === undefined ? null : r.record[f]; });
      return rec;
    });
    if (!rows.length) return;
    if (!confirm("Enregistrer " + rows.length + " certificat" + (rows.length > 1 ? "s" : "") + " dans le registre ?")) return;
    runBtn.disabled = true;
    var bar = el("div", "progress"), fill = el("span");
    bar.appendChild(fill); result.appendChild(bar);
    var done = 0, BATCH = 200;
    function next(i) {
      if (i >= rows.length) return Promise.resolve();
      var chunk = rows.slice(i, i + BATCH);
      return sb.from("certificates").upsert(chunk, { onConflict: "certificate_number" }).then(function (r) {
        if (r.error) throw r.error;
        done += chunk.length;
        fill.style.width = Math.round(done / rows.length * 100) + "%";
        return next(i + BATCH);
      });
    }
    next(0).then(function () {
      toast(done + " certificat" + (done > 1 ? "s" : "") + " enregistré" + (done > 1 ? "s" : "") + ".");
      result.appendChild(el("div", "warnings", "Import terminé : " + done + " certificat" + (done > 1 ? "s" : "") + " enregistré" + (done > 1 ? "s" : "") + "."));
      state.analysis = null; state.lastText = null;
      return loadAll();
    }).catch(function (err) {
      result.appendChild(el("div", "errors", "Import interrompu après " + done + " ligne" + (done > 1 ? "s" : "") + " : " + friendlyError(err) + " Les lignes déjà enregistrées le restent ; corrigez puis relancez le même fichier (aucun doublon ne sera créé)."));
      return loadAll();
    }).then(function () { runBtn.disabled = true; });
  });
})();
