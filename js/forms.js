/* =========================================================================
   WISY SAFETY — Formulaires : envoi des demandes (contact / devis, WiSy Coordination, test d'éligibilité PEB)
   Testé par tests/forms.test.js. Guide : docs/README-FORMULAIRES.md.

   Chemin principal : le script de la feuille Google « Réservations - Wisy Safety » (même adresse …/exec que les
   réservations, js/supabase-config.js), action "contact". Il REVALIDE la demande, l'enregistre dans l'onglet
   « Demandes » et l'envoie à info@wisysafety.be avec « Répondre à » = le visiteur (+ accusé de réception).
   Secours : EmailJS (gabarit « contact ») si le script n'est pas encore à jour, indisponible ou injoignable.

   Règles :
   - « demande envoyée » n'est affiché qu'après une réponse POSITIVE (script : status "ok" ; EmailJS : promesse tenue) ;
   - une même clé de requête accompagne les nouveaux essais : la feuille reconnaît un envoi déjà enregistré ;
   - en cas d'échec, les champs sont conservés, et le visiteur peut réessayer, écrire ou appeler ;
   - aucune donnée n'est écrite dans le navigateur ni dans l'adresse de la page (corps POST uniquement).
   Module « dual-mode » (navigateur : window.WisyForms ; Node : require).
   ========================================================================= */
(function (root) {
  "use strict";

  var TIMEOUT_MS = 30000;          // le script attend parfois son verrou puis envoie l'e-mail avant de répondre
  var TEAM_EMAIL = "info@wisysafety.be";
  var TEAM_PHONE = "+32 2 318 86 59";
  var FORMS = { contact: true, coordination: true, peb: true };
  /* Sujets du formulaire de contact : code stable (valeur de l'option) → libellé français transmis à l'équipe. */
  var SUBJECTS = {
    devis: "Demande de devis", inscription: "Inscription à une formation", conseil: "Conseil & accompagnement sécurité",
    coordination: "Coordination sécurité-santé", peb: "Certification PEB", autre: "Autre question"
  };
  var FIXED_SUBJECT = { coordination: "Coordination sécurité-santé (WiSy Coordination)", peb: "Certification PEB — test d'éligibilité" };
  var FIELDS = ["requestId", "form", "name", "email", "phone", "company", "subject", "message", "consent", "details"];

  /** Adresse du script Google (« Application Web » …/exec) — FORMS_API_URL, sinon celle des réservations ; ou null. */
  function endpoint(cfg) {
    var url = String((cfg && (cfg.FORMS_API_URL || cfg.RESERVATIONS_API_URL)) || "").trim();
    if (/^https:\/\/script\.google\.com\/(?:a\/[^\s/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url)) return url;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s?#]*$/.test(url)) return url;
    return null;
  }

  function randomChars(n, chars) {
    var buf = null, out = "";
    try {
      var c = root.crypto || (typeof require === "function" ? require("node:crypto").webcrypto : null);
      if (c && c.getRandomValues) { buf = new Uint8Array(n); c.getRandomValues(buf); }
    } catch (e) { buf = null; }
    for (var i = 0; i < n; i++) out += chars.charAt((buf ? buf[i] : Math.floor(Math.random() * 256)) % chars.length);
    return out;
  }
  /** Clé de requête aléatoire — sert uniquement à reconnaître un nouvel essai du même envoi. */
  function newRequestId() { return "f-" + randomChars(22, "abcdefghijkmnopqrstuvwxyz23456789"); }

  /** Réponse du script → résultat sûr, ou null si elle est inattendue. */
  function normalize(json) {
    if (!json || typeof json !== "object") return null;
    if (json.status === "ok") {
      return { kind: "ok", channel: "sheet", reference: /^WSC-\d{4}-[A-Z0-9]{5,6}$/.test(json.reference) ? json.reference : null,
        duplicate: json.duplicate === true, notified: json.notified !== false };
    }
    if (json.status === "invalid") {
      var f = json.fields && typeof json.fields === "object" ? json.fields : {}, fields = {};
      FIELDS.forEach(function (k) { if (typeof f[k] === "string") fields[k] = f[k].slice(0, 30); });
      return { kind: "invalid", fields: fields };
    }
    if (json.status === "rate_limited") return { kind: "rate_limited", retryAfter: Math.max(60, Math.min(86400, Math.round(+json.retryAfter) || 3600)) };
    if (json.status === "busy") return { kind: "busy" };
    if (json.status === "error") return { kind: "unsupported" };   // ancienne version du script (action inconnue) ou panne
    return null;
  }

  /** Corps envoyé au script : uniquement les champs attendus, déjà bornés (le script revalide tout). */
  function body(p) {
    p = p || {};
    var details = (Array.isArray(p.details) ? p.details : []).filter(function (d) { return Array.isArray(d) && d.length === 2 && String(d[1] == null ? "" : d[1]).trim(); })
      .slice(0, 12).map(function (d) { return [String(d[0]).slice(0, 60), Array.isArray(d[1]) ? d[1].map(String).join(", ").slice(0, 400) : String(d[1]).slice(0, 400)]; });
    return {
      action: "contact", form: String(p.form || ""), requestId: String(p.requestId || ""), lang: String(p.lang || "fr"),
      page: String(p.page || ""), elapsed: Math.max(0, Math.round(+p.elapsed || 0)), website: String(p.website || ""), consent: p.consent === true,
      name: String(p.name || "").trim(), email: String(p.email || "").trim(), phone: String(p.phone || "").trim(), company: String(p.company || "").trim(),
      subject: String(p.subject || ""), message: String(p.message || "").trim(), details: details
    };
  }

  function sendSheet(url, opts) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || TIMEOUT_MS) : null;
    /* « text/plain » = requête simple : pas de pré-vérification CORS (que les scripts Google ne gèrent pas). Google
       répond par une redirection vers script.googleusercontent.com, qu'il faut suivre. */
    var init = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body(opts.payload)),
      credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", mode: "cors", redirect: "follow" };
    if (ctrl) init.signal = ctrl.signal;
    return Promise.resolve(opts.fetch(url, init))
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null;
          try { j = JSON.parse(t); } catch (e) { j = null; }
          if (r.status === 200) return normalize(j) || { kind: "unavailable" };
          if (r.status === 429) return { kind: "rate_limited", retryAfter: 3600 };
          return { kind: "unavailable" };
        });
      })
      .catch(function () { return { kind: "unavailable" }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }

  function subjectLabel(p) { return FIXED_SUBJECT[p.form] || SUBJECTS[p.subject] || "Demande depuis le site"; }

  /** Paramètres du gabarit EmailJS « contact » (user_name, user_email, user_phone, subject, message, time) — en français. */
  function emailjsParams(p, reference) {
    var lines = [];
    if (p.company) lines.push("Société : " + p.company);
    (Array.isArray(p.details) ? p.details : []).forEach(function (d) {
      if (Array.isArray(d) && d.length === 2 && String(d[1]).trim()) lines.push(d[0] + " : " + (Array.isArray(d[1]) ? d[1].join(", ") : d[1]));
    });
    if (lines.length) lines.push("");
    if (p.message) lines.push(p.message, "");
    lines.push("Référence : " + reference + " (envoi de secours EmailJS — non enregistré dans la feuille « Demandes »)");
    lines.push("Page : " + (p.page || "—") + " · Langue du site : " + (p.lang || "fr") + " · Consentement RGPD : " + (p.consent === true ? "oui" : "non"));
    return {
      user_name: p.name || "", user_email: p.email || "", user_phone: p.phone || "Non renseigné",
      subject: subjectLabel(p) + " — " + reference, message: lines.join("\n"),
      time: new Date().toLocaleString("fr-BE", { timeZone: "Europe/Brussels", dateStyle: "long", timeStyle: "short" })
    };
  }

  /** Référence locale d'un envoi de secours (le script n'a pas répondu) : WSW-AAAA-XXXXX. */
  function localReference() { return "WSW-" + new Date().getFullYear() + "-" + randomChars(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"); }

  function sendEmailJS(opts) {
    var cfg = opts.config || {}, ejs = opts.emailjs;
    if (!ejs || typeof ejs.send !== "function" || !cfg.EMAILJS_PUBLIC_KEY || !cfg.EMAILJS_SERVICE_ID || !cfg.EMAILJS_TEMPLATE_ID_CONTACT) {
      return Promise.resolve({ kind: "not_configured" });
    }
    var p = body(opts.payload);
    if (p.website) return Promise.resolve({ kind: "ok", channel: "email", reference: localReference(), notified: true });   // robot : rien n'est envoyé
    var ref = opts.localReference || localReference();
    try { if (typeof ejs.init === "function") ejs.init({ publicKey: cfg.EMAILJS_PUBLIC_KEY }); } catch (e) { /* déjà initialisé */ }
    return Promise.resolve()
      .then(function () { return ejs.send(cfg.EMAILJS_SERVICE_ID, cfg.EMAILJS_TEMPLATE_ID_CONTACT, emailjsParams(p, ref)); })
      .then(function (r) {
        /* EmailJS tient sa promesse quand son service a accepté l'envoi (statut 200). */
        if (r && typeof r.status === "number" && r.status !== 200) return { kind: "unavailable" };
        return { kind: "ok", channel: "email", reference: ref, notified: true };
      }, function () { return { kind: "unavailable" }; });
  }

  /**
   * Envoie une demande. Jamais d'exception :
   *   ok (channel "sheet" | "email", reference) | invalid (fields) | rate_limited | busy | unavailable | not_configured
   * @param {{config:object, fetch:Function, emailjs?:object, payload:object, timeout?:number}} opts
   */
  function send(opts) {
    opts = opts || {};
    if (!opts.payload || !FORMS[opts.payload.form]) return Promise.resolve({ kind: "invalid", fields: { form: "invalid" } });
    var url = endpoint(opts.config);
    if (!url || typeof opts.fetch !== "function") return sendEmailJS(opts);
    return sendSheet(url, opts).then(function (r) {
      /* Réponses définitives du script : jamais de second canal (doublon, ou contournement des limites). */
      if (r.kind === "ok" || r.kind === "invalid" || r.kind === "rate_limited" || r.kind === "busy") return r;
      /* Script pas encore à jour, en panne ou injoignable : la demande part par EmailJS pour ne pas être perdue. */
      return sendEmailJS(opts).then(function (e) { return e.kind === "ok" ? e : (r.kind === "unsupported" ? { kind: "unavailable" } : r); });
    });
  }

  /** Lien « écrire un e-mail » pré-rempli (secours quand tout a échoué). Le corps est borné (limites des messageries). */
  function mailtoHref(p) {
    p = p || {};
    var lines = [p.message || ""];
    (Array.isArray(p.details) ? p.details : []).forEach(function (d) { if (Array.isArray(d) && String(d[1]).trim()) lines.push(d[0] + " : " + d[1]); });
    lines.push("", [p.name, p.company].filter(Boolean).join(" — "), [p.phone, p.email].filter(Boolean).join(" · "));
    return "mailto:" + TEAM_EMAIL + "?subject=" + encodeURIComponent(subjectLabel(p)) + "&body=" + encodeURIComponent(lines.join("\n").trim().slice(0, 1600));
  }

  /* ----------------------------------------------------------------------------------------------------------------
     Interface (navigateur) : état du bouton, message de résultat, champs en erreur, « Réessayer », e-mail, téléphone.
     opts = { form, payload(), status, button, label, t(key, fallback), okKey, okFallback, errKey, errFallback,
              fields: { name: element, email: element, … }, onSuccess(result), onDone(result) }
     ---------------------------------------------------------------------------------------------------------------- */
  function controller(opts) {
    var requestId = null, sending = false;
    var t = opts.t || function (k, fb) { return fb; };
    function setBusy(on) {
      if (opts.button) { opts.button.disabled = on; if (on) opts.button.setAttribute("aria-busy", "true"); else opts.button.removeAttribute("aria-busy"); }
      if (opts.label) {
        if (on) { opts.label.__idle = opts.label.textContent; opts.label.textContent = t("ct.f_sending", "Envoi en cours…"); }
        else if (opts.label.__idle != null) { opts.label.textContent = opts.label.__idle; opts.label.__idle = null; }
      }
    }
    function clearInvalid() {
      Object.keys(opts.fields || {}).forEach(function (k) { var el = opts.fields[k]; if (el && el.removeAttribute) el.removeAttribute("aria-invalid"); });
    }
    function status(state, parts) {
      var box = opts.status;
      if (!box) return;
      box.hidden = false;
      box.textContent = "";
      box.setAttribute("data-state", state);
      if (box.classList) { box.classList.remove("is-ok", "is-err"); box.classList.add(state === "ok" ? "is-ok" : "is-err"); }
      parts.forEach(function (p, i) {
        if (typeof p === "string") { if (i) box.appendChild(document.createTextNode(" ")); box.appendChild(document.createTextNode(p)); }
        else if (p) { box.appendChild(document.createTextNode(" ")); box.appendChild(p); }
      });
    }
    function link(href, text) { var a = document.createElement("a"); a.href = href; a.textContent = text; a.className = "wf-alt"; return a; }
    function failure(payload, lead) {
      var retry = document.createElement("button");
      retry.type = "button"; retry.className = "wf-retry"; retry.textContent = t("form.retry", "Réessayer");
      retry.addEventListener("click", function () { submit(); });
      var alt = document.createElement("span");
      alt.className = "wf-alts";
      alt.appendChild(retry);
      alt.appendChild(document.createTextNode(" "));
      alt.appendChild(link(mailtoHref(payload), t("form.by_mail", "Envoyer par e-mail")));
      alt.appendChild(document.createTextNode(" "));
      alt.appendChild(link("tel:" + TEAM_PHONE.replace(/\s/g, ""), t("form.by_phone", "Appeler le +32 2 318 86 59")));
      status("error", [lead, t("form.kept", "Vos informations restent dans le formulaire."), alt]);
    }
    function submit() {
      if (sending) return Promise.resolve({ kind: "busy" });
      var payload = opts.payload();
      if (!payload) return Promise.resolve({ kind: "cancelled" });
      if (!requestId) requestId = newRequestId();
      payload.requestId = requestId;
      sending = true;
      setBusy(true);
      clearInvalid();
      if (opts.status) { opts.status.textContent = ""; opts.status.removeAttribute("data-state"); }
      var cfg = root.WISY_CONFIG || {};
      return send({ config: cfg, fetch: root.fetch ? root.fetch.bind(root) : null, emailjs: root.emailjs, payload: payload, timeout: opts.timeout })
        .then(function (res) {
          sending = false;
          setBusy(false);
          if (res.kind === "ok") {
            requestId = null;
            status("ok", [t(opts.okKey, opts.okFallback), res.reference ? t("form.ref", "Référence : {ref}").replace("{ref}", res.reference) : ""]);
            if (opts.onSuccess) opts.onSuccess(res);
          } else if (res.kind === "invalid") {
            requestId = null;   // rien n'a été enregistré : le prochain essai est un nouvel envoi
            var first = null;
            Object.keys(res.fields).forEach(function (k) { var el = (opts.fields || {})[k]; if (el && el.setAttribute) { el.setAttribute("aria-invalid", "true"); if (!first) first = el; } });
            status("error", [t("form.invalid", "Certains champs sont incomplets ou invalides : vérifiez-les puis réessayez.")]);
            if (first && first.focus) first.focus();
          } else if (res.kind === "rate_limited") {
            requestId = null;
            status("error", [t("form.rate", "Trop de demandes envoyées depuis cette adresse e-mail. Réessayez dans une heure ou appelez-nous au +32 2 318 86 59.")]);
          } else if (res.kind === "busy") {
            failure(payload, t("form.busy", "Beaucoup de demandes en même temps : réessayez dans quelques secondes."));
          } else {
            failure(payload, t(opts.errKey, opts.errFallback));
          }
          if (opts.onDone) opts.onDone(res);
          return res;
        });
    }
    return { submit: submit, isSending: function () { return sending; } };
  }

  var api = {
    endpoint: endpoint, newRequestId: newRequestId, normalize: normalize, body: body, send: send,
    emailjsParams: emailjsParams, mailtoHref: mailtoHref, controller: controller, SUBJECTS: SUBJECTS, TEAM_EMAIL: TEAM_EMAIL
  };
  root.WisyForms = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : this);
