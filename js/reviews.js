/* =========================================================================
   WISY SAFETY — Avis clients (avis.html)
   Vanilla JS, sans framework ni build — cohérent avec le reste du site.
   -------------------------------------------------------------------------
   Contenu :
     • Client Supabase (si configuré) — enregistrement + lecture publique
     • StarRating : notation 5 étoiles accessible (clavier + lecteur d'écran)
     • Formulaire : validation, états loading/success/error, anti-spam,
       anti double-soumission, notification EmailJS facultative
     • Stats réelles (note moyenne + nombre) — jamais de chiffre inventé
     • Cartes d'avis (avatar initiales, étoiles, date localisée)
     • Carrousel continu, fluide, 3D léger, drag/clavier, prefers-reduced-motion
   ========================================================================= */
(function () {
  "use strict";

  /* --------------------------------------------------------------------- */
  /* Utilitaires                                                            */
  /* --------------------------------------------------------------------- */
  var CFG = window.WISY_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  function T(key, fallback) {
    var lang = (window.WisyI18N && WisyI18N.current()) || "fr";
    var v = window.WisyI18N && WisyI18N.get(lang, key);
    return v != null ? v : fallback;
  }
  function currentLang() { return (window.WisyI18N && WisyI18N.current()) || "fr"; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // Placeholder Supabase non renseigné ?
  function isConfigured() {
    return !!(CFG.SUPABASE_URL &&
      CFG.SUPABASE_URL.indexOf("VOTRE-PROJET") === -1 &&
      CFG.SUPABASE_ANON_KEY &&
      CFG.SUPABASE_ANON_KEY.indexOf("VOTRE_CLE") === -1 &&
      window.supabase && typeof window.supabase.createClient === "function");
  }

  var sb = null;
  if (isConfigured()) {
    try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
    catch (e) { sb = null; }
  }

  /* --------------------------------------------------------------------- */
  /* Données de DÉMONSTRATION (clairement identifiées, dev uniquement)      */
  /* Utilisées seulement si Supabase n'est PAS configuré, pour visualiser   */
  /* le rendu. Un badge « Démo » est affiché sur chaque carte.              */
  /* --------------------------------------------------------------------- */
  var DEMO_REVIEWS = [
    { id: "demo-1", first_name: "Marie", last_name: "D.", company: "Responsable QHSE", rating: 5,
      title: "Formation VCA au top", comment: "Organisation impeccable et formateur très clair. Nos équipes ont obtenu la certification du premier coup.", approved_at: "2026-08-20T10:00:00Z", _demo: true },
    { id: "demo-2", first_name: "Karim", last_name: "B.", company: "Chef de chantier", rating: 5,
      title: "Très concret", comment: "Beaucoup de mises en situation réelles, rien de théorique inutile. Exactement ce qu'il nous fallait.", approved_at: "2026-08-12T10:00:00Z", _demo: true },
    { id: "demo-3", first_name: "Sophie", last_name: "L.", company: "Constructel", rating: 4,
      title: "Sérieux et à l'écoute", comment: "Accueil professionnel et planning respecté. Un petit délai administratif, mais rien de bloquant.", approved_at: "2026-07-30T10:00:00Z", _demo: true },
    { id: "demo-4", first_name: "Thomas", last_name: "V.", company: "Proximus", rating: 5,
      title: "Je recommande", comment: "Contenu à jour et pédagogie efficace. On ressort avec des réflexes directement applicables sur le terrain.", approved_at: "2026-07-18T10:00:00Z", _demo: true },
    { id: "demo-5", first_name: "Amélie", last_name: "R.", company: "PEB", rating: 5,
      title: "Accompagnement premium", comment: "Un vrai suivi personnalisé du début à la fin. L'équipe connaît parfaitement la réglementation belge.", approved_at: "2026-07-02T10:00:00Z", _demo: true }
  ];

  /* --------------------------------------------------------------------- */
  /* Rendu : étoiles, avatar, date                                         */
  /* --------------------------------------------------------------------- */
  function starRow(rating) {
    var wrap = el("span", "rc-stars");
    wrap.setAttribute("aria-label", T("av.rating_aria", "Note : {n} sur 5").replace("{n}", rating));
    wrap.setAttribute("role", "img");
    for (var i = 1; i <= 5; i++) {
      var s = el("span", "rc-star" + (i <= rating ? " is-on" : ""));
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = STAR_SVG;
      wrap.appendChild(s);
    }
    return wrap;
  }

  // Dégradé stable dérivé du nom (avatar initiales)
  function avatarFor(name) {
    var a = el("span", "rc-avatar");
    var initials = (name || "?").trim().split(/\s+/).map(function (w) { return w.charAt(0); })
      .join("").slice(0, 2).toUpperCase();
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    a.style.background = "linear-gradient(145deg,hsl(" + h + ",42%,42%),hsl(" + ((h + 40) % 360) + ",46%,32%))";
    a.appendChild(el("span", null, initials));
    a.setAttribute("aria-hidden", "true");
    return a;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(currentLang(), { year: "numeric", month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  function displayName(r) {
    return r.last_name ? (r.first_name + " " + r.last_name) : r.first_name;
  }

  // Construit une carte d'avis (DOM sûr : textContent pour le contenu utilisateur)
  function buildCard(r) {
    var card = el("article", "rc-card");
    card.setAttribute("role", "listitem");

    var head = el("div", "rc-card__head");
    head.appendChild(avatarFor(displayName(r)));
    var who = el("div", "rc-card__who");
    who.appendChild(el("span", "rc-card__name", displayName(r)));
    if (r.company) who.appendChild(el("span", "rc-card__role", r.company));
    head.appendChild(who);
    card.appendChild(head);

    card.appendChild(starRow(r.rating));

    if (r.title) card.appendChild(el("h3", "rc-card__title", r.title));
    card.appendChild(el("p", "rc-card__text", r.comment));

    var foot = el("div", "rc-card__foot");
    var verified = el("span", "rc-card__badge");
    verified.innerHTML = CHECK_SVG;
    verified.appendChild(el("span", null, r._demo ? T("av.demo_badge", "Démo") : T("av.verified", "Avis vérifié")));
    if (r._demo) verified.classList.add("is-demo");
    foot.appendChild(verified);
    foot.appendChild(el("time", "rc-card__date", fmtDate(r.approved_at || r.created_at)));
    card.appendChild(foot);
    return card;
  }

  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.98 6.19 21.0l1.11-6.47-4.7-4.58 6.5-.95z"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  /* ===================================================================== */
  /* 1) STAR RATING — widget de notation accessible (formulaire)            */
  /* ===================================================================== */
  function StarRating(root) {
    var input = $("#rc-rating");
    var labelEl = root.parentNode.querySelector("[data-rating-label]");
    var value = 0, hovered = 0;
    var stars = [];

    for (var i = 1; i <= 5; i++) {
      (function (n) {
        var b = el("button", "rc-rate__star");
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", "false");
        b.setAttribute("aria-label", T("av.rating_" + n, String(n)) + " — " + n + "/5");
        b.tabIndex = n === 1 ? 0 : -1;
        b.innerHTML = STAR_SVG;
        b.addEventListener("click", function () { setValue(n); });
        b.addEventListener("mouseenter", function () { hovered = n; paint(); });
        b.addEventListener("focus", function () { hovered = n; paint(); });
        b.addEventListener("blur", function () { hovered = 0; paint(); });
        b.addEventListener("keydown", onKey);
        root.appendChild(b);
        stars.push(b);
      })(i);
    }
    root.addEventListener("mouseleave", function () { hovered = 0; paint(); });

    function onKey(e) {
      var k = e.key, next = value;
      if (k === "ArrowRight" || k === "ArrowUp") next = clamp(value + 1, 1, 5);
      else if (k === "ArrowLeft" || k === "ArrowDown") next = clamp(value - 1, 1, 5);
      else if (k === "Home") next = 1;
      else if (k === "End") next = 5;
      else return;
      e.preventDefault();
      setValue(next);
      stars[next - 1].focus();
    }

    function setValue(n) {
      value = n;
      input.value = String(n);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      for (var i = 0; i < 5; i++) {
        stars[i].setAttribute("aria-checked", i === n - 1 ? "true" : "false");
        stars[i].tabIndex = i === n - 1 ? 0 : -1;
      }
      paint();
      root.classList.remove("rc-rate--pulse");   // relance l'animation
      void root.offsetWidth;
      if (!reduceMotion) root.classList.add("rc-rate--pulse");
    }

    function paint() {
      var active = hovered || value;
      for (var i = 0; i < 5; i++) stars[i].classList.toggle("is-on", i < active);
      if (labelEl) {
        labelEl.textContent = active ? T("av.rating_" + active, "") : T("av.rating_none", "Aucune note");
        labelEl.classList.toggle("is-set", !!active);
      }
    }

    // Ré-étiquetage au changement de langue
    document.addEventListener("i18n:changed", function () {
      for (var i = 0; i < 5; i++)
        stars[i].setAttribute("aria-label", T("av.rating_" + (i + 1), String(i + 1)) + " — " + (i + 1) + "/5");
      paint();
    });

    paint();
    return { get: function () { return value; }, reset: function () { value = 0; hovered = 0; input.value = ""; for (var i = 0; i < 5; i++) { stars[i].setAttribute("aria-checked", "false"); stars[i].tabIndex = i === 0 ? 0 : -1; } paint(); } };
  }

  /* ===================================================================== */
  /* 2) FORMULAIRE — validation, envoi, états                              */
  /* ===================================================================== */
  function initForm(onSubmitted) {
    var form = $("#rc-form");
    if (!form) return;

    var rating = StarRating($("#rc-rate"));
    var statusEl = $("#rc-status");
    var btn = $("#rc-submit");
    var btnLabel = $("#rc-submit-label");
    var successPanel = $("#rc-success");
    var formPanel = $("#rc-form-panel");
    var submitting = false;
    var mountedAt = Date.now();   // anti-spam : temps minimal sur le formulaire

    function setStatus(msg, type) {
      statusEl.textContent = msg || "";
      statusEl.className = "rc-form__status" + (type ? " is-" + type : "");
    }
    function fieldError(name, msg) {
      var f = form.elements[name];
      var box = form.querySelector('[data-error-for="' + name + '"]');
      if (box) box.textContent = msg || "";
      if (f && f.setAttribute) f.setAttribute("aria-invalid", msg ? "true" : "false");
    }
    function clearErrors() {
      ["first_name", "email", "rating", "comment", "consent"].forEach(function (n) { fieldError(n, ""); });
      setStatus("", "");
    }

    function validate() {
      clearErrors();
      var ok = true, firstBad = null;
      var fn = form.first_name.value.trim();
      var email = form.email.value.trim();
      var comment = form.comment.value.trim();
      var consent = form.consent.checked;
      var rate = rating.get();
      var reEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

      if (!fn) { fieldError("first_name", T("av.err_firstname", "Merci d'indiquer votre prénom.")); ok = false; firstBad = firstBad || form.first_name; }
      if (!reEmail.test(email)) { fieldError("email", T("av.err_email", "Merci d'indiquer une adresse e-mail valide.")); ok = false; firstBad = firstBad || form.email; }
      if (!rate) { fieldError("rating", T("av.err_rating", "Merci de sélectionner une note.")); ok = false; firstBad = firstBad || $("#rc-rate").querySelector("button"); }
      if (comment.length < 3) { fieldError("comment", T("av.err_comment", "Votre avis doit contenir au moins quelques mots.")); ok = false; firstBad = firstBad || form.comment; }
      if (!consent) { fieldError("consent", T("av.err_consent", "Merci d'autoriser la publication pour continuer.")); ok = false; firstBad = firstBad || form.consent; }

      if (!ok && firstBad && firstBad.focus) firstBad.focus();
      return ok ? { first_name: fn, email: email, comment: comment, rating: rate,
        last_name: form.last_name.value.trim() || null,
        company: form.company.value.trim() || null,
        title: form.title.value.trim() || null,
        consent_publication: true } : null;
    }

    function setLoading(on) {
      submitting = on;
      btn.disabled = on;
      btn.setAttribute("aria-busy", on ? "true" : "false");
      btnLabel.textContent = on ? T("av.f_sending", "Envoi en cours…") : T("av.f_submit", "Publier mon avis");
      btn.classList.toggle("is-loading", on);
    }

    function reference() {
      var d = new Date();
      var r = Math.random().toString(36).slice(2, 7).toUpperCase();
      return "WS-" + d.getFullYear() + "-" + r;
    }

    function showSuccess(ref) {
      var refEl = $("#rc-success-ref");
      if (refEl) refEl.textContent = ref;
      formPanel.hidden = true;
      successPanel.hidden = false;
      if (!reduceMotion) { successPanel.classList.remove("is-in"); void successPanel.offsetWidth; successPanel.classList.add("is-in"); }
      successPanel.setAttribute("tabindex", "-1");
      successPanel.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return;

      // Honeypot : champ invisible rempli => robot. Succès factice, aucun envoi.
      if (form.website && form.website.value.trim() !== "") { showSuccess(reference()); return; }
      // Temps minimal (2 s) : soumission trop rapide => suspect.
      if (Date.now() - mountedAt < 2000 && form.website) { /* on laisse passer mais sans bloquer l'UX réelle */ }

      var payload = validate();
      if (!payload) return;

      if (!sb) {
        setStatus(T("av.err_notconfigured", "Le dépôt d'avis n'est pas encore activé. Écrivez-nous à info@wisysafety.be."), "err");
        return;
      }

      setLoading(true);
      setStatus("", "");

      sb.from("reviews").insert([payload]).then(function (res) {
        if (res.error) throw res.error;
        var ref = reference();
        notifyAdmin(payload, ref);
        form.reset();
        rating.reset();
        showSuccess(ref);
        if (typeof onSubmitted === "function") onSubmitted();
      }).catch(function (err) {
        var msg = (err && (err.message || err.hint || "")) + "";
        if (/rate_limited/i.test(msg))
          setStatus(T("av.err_ratelimit", "Vous avez déjà envoyé plusieurs avis récemment. Merci de réessayer plus tard."), "err");
        else
          setStatus(T("av.err_generic", "Oups, l'envoi a échoué. Réessayez ou écrivez-nous à info@wisysafety.be."), "err");
        if (window.console) console.warn("[avis] insert:", msg);
      }).then(function () { setLoading(false); });
    });

    // Bouton « déposer un autre avis »
    var again = $("#rc-success-again");
    if (again) again.addEventListener("click", function () {
      successPanel.hidden = true;
      formPanel.hidden = false;
      var first = form.first_name; if (first) first.focus();
    });

    // Ré-étiquetage des états au changement de langue (si visibles)
    document.addEventListener("i18n:changed", function () {
      if (!submitting) btnLabel.textContent = T("av.f_submit", "Publier mon avis");
    });
  }

  // Notification admin EmailJS (facultative — Supabase reste la source)
  function notifyAdmin(p, ref) {
    try {
      if (!window.emailjs || !CFG.EMAILJS_TEMPLATE_ID_REVIEW) return;
      emailjs.send(CFG.EMAILJS_SERVICE_ID, CFG.EMAILJS_TEMPLATE_ID_REVIEW, {
        reference: ref,
        first_name: p.first_name,
        rating: p.rating + "/5",
        title: p.title || "—",
        company: p.company || "—",
        message: p.comment,
        email: p.email,
        status: "En attente de validation",
        time: new Date().toLocaleString("fr-BE", { dateStyle: "long", timeStyle: "short" }),
        to_email: CFG.ADMIN_NOTIFY_EMAIL || "info@wisysafety.be"
      }).catch(function () {});
    } catch (e) {}
  }

  /* ===================================================================== */
  /* 3) STATS + LISTE + CARROUSEL                                          */
  /* ===================================================================== */
  var reviewsCache = [];
  var carousel = null;

  function renderStats(list) {
    var box = $("#rc-stats");
    if (!box) return;
    var real = list.filter(function (r) { return !r._demo; });
    // On n'affiche des chiffres QUE s'il existe de vrais avis approuvés.
    if (!real.length) {
      box.setAttribute("data-empty", "true");
      box.querySelector("[data-stat-avg]").textContent = "—";
      box.querySelector("[data-stat-stars]").innerHTML = "";
      box.querySelector("[data-stat-count]").textContent = T("av.stats_empty", "En attente des premiers avis publiés");
      return;
    }
    box.setAttribute("data-empty", "false");
    var sum = real.reduce(function (a, r) { return a + r.rating; }, 0);
    var avg = sum / real.length;
    var avgStr = avg.toLocaleString(currentLang(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    box.querySelector("[data-stat-avg]").textContent = avgStr;
    box.querySelector("[data-stat-stars]").replaceChildren(starRow(Math.round(avg)));
    box.querySelector("[data-stat-count]").textContent =
      T("av.stats_based", "basé sur") + " " + real.length + " " + T("av.stats_suffix", "avis vérifiés");
  }

  function renderList(list) {
    var mount = $("#rc-carousel");
    var empty = $("#rc-empty");
    if (!mount) return;

    if (!list.length) {
      mount.hidden = true;
      if (empty) { empty.hidden = false; empty.textContent = T("av.reviews_empty", ""); }
      return;
    }
    if (empty) empty.hidden = true;
    mount.hidden = false;
    if (carousel) carousel.destroy();
    carousel = buildCarousel(mount, list);
  }

  function loadReviews() {
    var loading = $("#rc-loading");
    if (loading) { loading.hidden = false; loading.textContent = T("av.reviews_loading", "Chargement des avis…"); }

    function done(list) {
      if (loading) loading.hidden = true;
      reviewsCache = list;
      renderStats(list);
      renderList(list);
    }

    if (!sb) { done(DEMO_REVIEWS.slice()); return; }

    sb.from("approved_reviews")
      .select("id,first_name,last_name,company,rating,title,comment,created_at,approved_at")
      .order("approved_at", { ascending: false })
      .limit(60)
      .then(function (res) {
        if (res.error) throw res.error;
        done((res.data || []).map(function (r) { r._demo = false; return r; }));
      })
      .catch(function (err) {
        if (loading) loading.hidden = true;
        var empty = $("#rc-empty");
        if (empty) { empty.hidden = false; empty.textContent = T("av.reviews_error", "Impossible de charger les avis pour le moment."); }
        if (window.console) console.warn("[avis] load:", err && err.message);
      });
  }

  /* --------------------------------------------------------------------- */
  /* Carrousel continu, fluide, 3D léger                                   */
  /* --------------------------------------------------------------------- */
  function columnsForWidth(w) { return w >= 1024 ? 3 : w >= 640 ? 2 : 1; }

  function buildCarousel(mount, data) {
    mount.innerHTML = "";
    var viewport = el("div", "rc__viewport");
    var track = el("ul", "rc__track");
    track.setAttribute("role", "list");
    viewport.appendChild(track);
    mount.appendChild(viewport);

    // Contrôles
    var controls = el("div", "rc__controls");
    var prev = ctrlBtn("rc__nav rc__nav--prev", PREV_SVG, T("av.prev", "Précédent"));
    var play = ctrlBtn("rc__nav rc__play", PAUSE_SVG, T("av.pause", "Pause"));
    var next = ctrlBtn("rc__nav rc__nav--next", NEXT_SVG, T("av.next", "Suivant"));
    controls.appendChild(prev); controls.appendChild(play); controls.appendChild(next);
    mount.appendChild(controls);

    var cols = columnsForWidth(viewport.clientWidth || window.innerWidth);
    mount.style.setProperty("--rc-cols", cols);

    // Peu d'avis (<= colonnes) → affichage statique centré, pas de défilement.
    var isStatic = data.length <= cols || reduceMotion;

    // Construit la liste de base ; duplique pour un défilement sans couture.
    var base = data.slice();
    if (!isStatic) {
      while (base.length < cols * 2) base = base.concat(data); // remplit la vue
    }
    var loopItems = isStatic ? base : base.concat(base);        // 2 jeux = boucle
    var cards = [];
    loopItems.forEach(function (r) {
      var li = el("li", "rc__cell");
      var c = buildCard(r);
      li.appendChild(c);
      track.appendChild(li);
      cards.push(li);
    });

    if (isStatic) {
      mount.setAttribute("data-static", "true");
      track.style.transform = "none";
      viewport.classList.add("rc__viewport--scroll");
      if (data.length < cols) mount.style.setProperty("--rc-cols", data.length);

      if (data.length <= cols) {
        // Tout est visible : pas de défilement, cartes centrées.
        controls.hidden = true;
        mount.setAttribute("data-fit", "true");
        if (!reduceMotion && !isTouch) cards.forEach(enableTilt);
      } else {
        // Beaucoup d'avis mais mouvement réduit : scroll natif + boutons.
        play.hidden = true;
        var beh = reduceMotion ? "auto" : "smooth";
        prev.addEventListener("click", function () { viewport.scrollBy({ left: -viewport.clientWidth * 0.85, behavior: beh }); });
        next.addEventListener("click", function () { viewport.scrollBy({ left: viewport.clientWidth * 0.85, behavior: beh }); });
      }
      return { destroy: function () { mount.innerHTML = ""; } };
    }

    /* --- moteur de défilement continu (une seule boucle rAF) ------------ */
    var stride = 0, setWidth = 0, vpWidth = 0, cardW = 0;
    var offset = 0, playing = true, dragging = false, tween = null;
    var raf = null, last = 0;
    var SPEED = 42;         // px / seconde — lent et premium
    var K_SCALE = 0.12;     // amplitude de réduction d'échelle sur les bords
    var K_FADE = 0.42;      // amplitude d'atténuation d'opacité

    function measure() {
      cols = columnsForWidth(viewport.clientWidth);
      mount.style.setProperty("--rc-cols", cols);
      vpWidth = viewport.clientWidth;
      var first = cards[0];
      cardW = first.getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
      stride = cardW + gap;
      setWidth = stride * (loopItems.length / 2);
    }

    function apply() {
      // Normalise l'offset dans (-setWidth, 0] pour une boucle infinie
      if (!tween) {
        if (offset <= -setWidth) offset += setWidth;
        else if (offset > 0) offset -= setWidth;
      }
      track.style.transform = "translate3d(" + offset + "px,0,0)";

      // 3D léger : chaque carte se met à l'échelle selon sa distance au centre
      var center = vpWidth / 2;
      var maxD = (vpWidth + cardW) / 2;
      for (var i = 0; i < cards.length; i++) {
        var cx = offset + i * stride + cardW / 2;
        // distance au centre en tenant compte de la répétition
        var d = cx - center;
        if (d > setWidth / 2) d -= setWidth; else if (d < -setWidth / 2) d += setWidth;
        var t = clamp(Math.abs(d) / maxD, 0, 1);
        var scale = 1 - K_SCALE * t;
        var op = 1 - K_FADE * t;
        cards[i].style.setProperty("--rc-s", scale.toFixed(3));
        cards[i].style.setProperty("--rc-o", op.toFixed(3));
      }
    }

    function frame(ts) {
      var dt = last ? (ts - last) / 1000 : 0; last = ts;
      dt = Math.min(dt, 0.05); // évite les sauts après un onglet inactif
      if (tween) {
        var p = clamp((ts - tween.start) / tween.dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        offset = tween.from + (tween.to - tween.from) * e;
        if (p >= 1) tween = null;
      } else if (playing && !dragging) {
        offset -= SPEED * dt;
      }
      apply();
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    function setPlaying(on) {
      playing = on;
      play.innerHTML = (on ? PAUSE_SVG : PLAY_SVG);
      play.setAttribute("aria-label", on ? T("av.pause", "Pause") : T("av.play", "Lecture"));
      play.setAttribute("aria-pressed", on ? "false" : "true");
    }
    function nudge(dir) {
      if (tween) return;
      tween = { from: offset, to: offset - dir * stride, start: performance.now(), dur: 520 };
    }

    // Contrôles
    play.addEventListener("click", function () { setPlaying(!playing); });
    next.addEventListener("click", function () { nudge(1); });
    prev.addEventListener("click", function () { nudge(-1); });

    // Pause au survol / focus (améliore la lisibilité)
    mount.addEventListener("mouseenter", function () { if (!isTouch) playing && (mount._wasPlaying = true, setPlaying(false)); });
    mount.addEventListener("mouseleave", function () { if (!isTouch && mount._wasPlaying) { mount._wasPlaying = false; setPlaying(true); } });
    mount.addEventListener("focusin", function () { mount._wasPlaying = playing; setPlaying(false); });
    mount.addEventListener("focusout", function (e) { if (!mount.contains(e.relatedTarget)) setPlaying(mount._wasPlaying !== false); });

    // Navigation clavier (flèches) quand le carrousel a le focus
    mount.setAttribute("tabindex", "0");
    mount.setAttribute("role", "group");
    mount.setAttribute("aria-roledescription", "carousel");
    mount.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
      else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setPlaying(!playing); }
    });

    // Drag / swipe (pointer events)
    var dragStartX = 0, dragStartOffset = 0, moved = false;
    viewport.addEventListener("pointerdown", function (e) {
      dragging = true; moved = false;
      dragStartX = e.clientX; dragStartOffset = offset;
      viewport.setPointerCapture && viewport.setPointerCapture(e.pointerId);
      viewport.classList.add("is-grabbing");
    });
    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 3) moved = true;
      offset = dragStartOffset + dx;
      if (offset <= -setWidth) offset += setWidth; else if (offset > 0) offset -= setWidth;
    });
    function endDrag() { if (dragging) { dragging = false; viewport.classList.remove("is-grabbing"); } }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    // Empêche le clic fantôme après un drag
    viewport.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    // Pause quand l'onglet est caché (économie)
    function onVis() { if (document.hidden) stop(); else start(); }
    document.addEventListener("visibilitychange", onVis);

    // Recalage à chaque changement de langue (ré-étiquetage contrôles)
    function onLang() {
      prev.setAttribute("aria-label", T("av.prev", "Précédent"));
      next.setAttribute("aria-label", T("av.next", "Suivant"));
      setPlaying(playing);
    }
    document.addEventListener("i18n:changed", onLang);

    // Redimensionnement (debounce)
    var rz = null;
    function onResize() { clearTimeout(rz); rz = setTimeout(measure, 150); }
    window.addEventListener("resize", onResize);

    // IntersectionObserver : n'anime que si visible
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { threshold: 0.05 });
      io.observe(mount);
    } else { start(); }

    measure();
    // seconde mesure après application des polices/mises en page
    requestAnimationFrame(measure);
    setPlaying(true);
    start();

    return {
      destroy: function () {
        stop();
        document.removeEventListener("visibilitychange", onVis);
        document.removeEventListener("i18n:changed", onLang);
        window.removeEventListener("resize", onResize);
        if (io) io.disconnect();
        mount.innerHTML = "";
      }
    };
  }

  // Effet 3D « tilt » léger au survol (cartes statiques desktop)
  function enableTilt(li) {
    var card = li.firstChild;
    li.addEventListener("pointermove", function (e) {
      var r = li.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(800px) rotateX(" + (-py * 5).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg) translateY(-4px)";
    });
    li.addEventListener("pointerleave", function () { card.style.transform = ""; });
  }

  function ctrlBtn(cls, svg, label) {
    var b = el("button", cls);
    b.type = "button";
    b.innerHTML = svg;
    b.setAttribute("aria-label", label);
    return b;
  }
  var PREV_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  var NEXT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  /* ===================================================================== */
  /* 4) INITIALISATION                                                     */
  /* ===================================================================== */
  function init() {
    // EmailJS (réutilise le compte déjà en place)
    if (window.emailjs && CFG.EMAILJS_PUBLIC_KEY && CFG.EMAILJS_TEMPLATE_ID_REVIEW) {
      try { emailjs.init({ publicKey: CFG.EMAILJS_PUBLIC_KEY }); } catch (e) {}
    }

    // Bandeau discret si non configuré (aide au déploiement, non bloquant)
    if (!sb) {
      var note = $("#rc-config-note");
      if (note) note.hidden = false;
    }

    initForm(function () { /* après soumission : rien à recharger (avis en attente) */ });
    loadReviews();

    // Re-render des cartes/stats au changement de langue (dates, libellés)
    document.addEventListener("i18n:changed", function () {
      renderStats(reviewsCache);
      renderList(reviewsCache);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
