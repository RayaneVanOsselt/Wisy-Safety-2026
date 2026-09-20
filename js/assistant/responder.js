/* =========================================================================
   WISY SAFETY — Assistant · Moteur de réponse local (déterministe)
   -------------------------------------------------------------------------
   Cœur FIABLE de l'assistant. Transforme un message en réponse STRUCTURÉE
   (ChatResponse) à partir de la SEULE base de connaissances. Aucune
   invention : prix, dates et modalités absents du site déclenchent une
   redirection vers le contact humain.

   FAQ : les réponses aux questions générales (inscription, tarifs, durée,
   attestations, contact…) proviennent de la SOURCE UNIQUE du Centre d'aide
   (js/faq-data.js) via son moteur de recherche partagé (js/faq-search.js) :
   l'assistant ne peut pas contredire la page FAQ. Quand aucune réponse fiable
   n'existe, il le dit et oriente vers l'équipe — il n'invente jamais.

   Ce moteur fonctionne 100 % côté client, sans réseau ni clé API : le site
   dispose donc d'un assistant réellement utile même sans service externe.
   La route serveur optionnelle (/api/chat) ne fait que l'enrichir en
   langage naturel (voir js/assistant/assistant.js pour l'orchestration).

   ChatResponse = {
     message: string,
     cards?:      Array<{ type:"training"|"navigation"|"contact", ... }>,
     suggestions?: string[],
     sources?:    Array<{ title:string, url:string }>,
     meta?:       { intent, state?, faqId?, confidence? }
   }

   Module « dual-mode » : navigateur + Node (tests).
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var isNode = (typeof module === "object" && module.exports);
  var Knowledge = isNode ? require("./knowledge.js") : (root.WisyAssistant && root.WisyAssistant.Knowledge);
  var Retrieval = isNode ? require("./retrieval.js") : (root.WisyAssistant && root.WisyAssistant.Retrieval);
  var api = factory(Knowledge, Retrieval);
  if (isNode) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Responder = api;
})(typeof self !== "undefined" ? self : this, function (Knowledge, Retrieval) {
  "use strict";

  var C = Knowledge.CONTACT;
  /* Moteur FAQ partagé (absent si js/faq-*.js ne sont pas chargés : on dégrade proprement). */
  var Faq = (Knowledge.Faq && Knowledge.Faq.search) ? Knowledge.Faq : null;

  /* --------------------------------------------------------------------- */
  /* Fabriques de cartes                                                    */
  /* --------------------------------------------------------------------- */
  function trainingCard(f) {
    return {
      type: "training",
      id: f.id,
      title: f.title,
      titleKey: f.titleKey,
      description: f.description,
      descKey: f.descKey,
      duration: f.duration,
      level: f.level,
      category: f.category,
      priceLabel: f.priceLabel,   /* uniquement si le tarif est confirmé */
      url: f.url,
      signupUrl: f.signupUrl
    };
  }
  function navigationCard(p) {
    return { type: "navigation", title: p.title, titleKey: p.titleKey, description: p.content || p.description || "", url: p.url };
  }
  /* Page Agenda (réelle) : jamais une date — l'agenda en ligne n'est pas encore connecté. */
  function agendaCard() {
    var p = Knowledge.byId("page-agenda");
    return p ? navigationCard(p) : null;
  }
  function cardsOf() { return Array.prototype.slice.call(arguments).filter(Boolean); }
  function contactCard() {
    return {
      type: "contact",
      title: "Contacter Wisy Safety",
      description: "Notre équipe vous répond directement.",
      phone: C.phone,
      phoneHref: C.phoneHref,
      email: C.email,
      hours: C.hours,
      url: C.contactUrl
    };
  }

  /* --------------------------------------------------------------------- */
  /* FAQ : réponse, actions et questions liées (source unique)              */
  /* --------------------------------------------------------------------- */
  /* Réponses FAQ pour lesquelles l'assistant a une réponse plus riche (cartes) — voir respond(). */
  var RICH_INTENT_FAQ = { "faq-choisir-catalogue": true };

  /* Texte d'une réponse FAQ (puces « • »), ou `fallback` si la FAQ est absente. */
  function faqText(id, fallback) {
    var it = Faq && Faq.get(id);
    return it ? Faq.plainAnswer(it) : fallback;
  }
  /* Questions liées → suggestions cliquables (chacune est comprise telle quelle). */
  function relatedQuestions(id, n) {
    return Faq ? Faq.related(id, n || 3).map(function (r) { return r.question; }) : [];
  }
  /* Questions à proposer quand on ne sait pas répondre. */
  function starterQuestions(n) {
    return Faq ? Faq.featured().slice(0, n || 3).map(function (r) { return r.question; }) : [];
  }
  /* Prochaine étape utile déclarée par l'entrée FAQ → carte (routes réelles uniquement). */
  function actionCards(it) {
    var a = it && it.action, p;
    if (!a || a === "assistant") return undefined;
    if (a === "contact") return [contactCard()];
    if (a === "agenda") { var ag = agendaCard(); return ag ? [ag] : undefined; }
    if (a === "nacelle") { var n = Knowledge.byId("nacelle"); return n ? [trainingCard(n)] : undefined; }
    p = Knowledge.byId(a === "formations" ? "page-formations" : a === "inscription" ? "page-inscription" : "");
    return p ? [navigationCard(p)] : undefined;
  }
  function faqResponse(it, res) {
    return {
      message: Faq.plainAnswer(it),
      cards: actionCards(it),
      suggestions: relatedQuestions(it.id, 3),
      sources: [{ title: it.question, url: "faq.html#" + it.id }],
      meta: { intent: "faq", faqId: it.id, confidence: res ? res.confidence : "exact" }
    };
  }
  /* Réponse FAQ fiable pour ce message ? Jamais une correspondance faible.
     strict = seulement « exacte » ou « forte » (le cas moyen ne doit pas voler la vedette aux
     pages / formations trouvées ailleurs : « Formations techniques » reste une navigation). */
  function faqLookup(rawMessage, strict) {
    if (!Faq) return null;
    var res = Faq.search(rawMessage, { limit: 3 });
    if (!res.top) return null;
    var ok = res.confidence === "exact" || res.confidence === "high" || (!strict && res.confidence === "medium");
    return ok ? res : null;
  }
  /* Le nom de l'organisme ne désigne aucune formation (« Contacter Wisy Safety » ≠ VCA / « safety »). */
  function withoutBrand(s) { return String(s).replace(/wisy[\s-]*safety/ig, " "); }
  /* Source « Centre d'aide » + questions liées, pour les réponses à intention fixe. */
  function faqExtras(id, n) {
    var it = Faq && Faq.get(id);
    return it ? { sources: [{ title: it.question, url: "faq.html#" + id }], related: relatedQuestions(id, n || 3) } : { sources: [], related: [] };
  }

  /* Réponse FAQ plus PRÉCISE que celle que l'intention détectée donnerait par défaut
     (« Puis-je annuler mon inscription ? » contient « inscription », mais n'est pas
     « Comment s'inscrire ? »). Renvoie null si la FAQ n'a rien de plus spécifique. */
  function specificFaq(rawMessage, defaultId, strict) {
    var hit = faqLookup(rawMessage, strict);
    return (hit && hit.top.item.id !== defaultId) ? hit : null;
  }

  /* --------------------------------------------------------------------- */
  /* Détecteurs d'intention (sur texte normalisé sans accents)             */
  /* --------------------------------------------------------------------- */
  var N = Retrieval.normalize;
  function has(hay, words) {
    for (var i = 0; i < words.length; i++) {
      if ((" " + hay + " ").indexOf(" " + words[i]) !== -1) return true;
    }
    return false;
  }

  function isGreeting(q) {
    return /^(bonjour|bonsoir|salut|coucou|hello|hey|hi|hallo|yo|bjr)\b/.test(q) && q.length <= 24;
  }
  function isInjection(q) {
    return has(q, [
      "ignore", "ignorez", "oublie", "oubliez", "systeme", "system prompt", "prompt systeme",
      "tes instructions", "vos instructions", "tes regles", "consignes", "reveal", "revele",
      "affiche ton prompt", "montre ton prompt", "variables d'environnement", "cle api", "api key",
      "clé", "secret", "token", "jailbreak", "dan mode", "developer mode"
    ]) && has(q, ["prompt", "instruction", "instructions", "regle", "regles", "consigne", "consignes", "secret", "systeme", "api", "environnement", "ignore", "ignorez", "oublie"]);
  }
  function isPrice(q) {
    // « combien de temps / de jours / d'heures » = une question de DURÉE, pas de prix
    if (/combien (de|d'?) ?(temps|jour|jours|heure|heures)/.test(q)) return false;
    return has(q, ["prix", "tarif", "tarifs", "cout", "combien", "coute", "coutent", "devis", "budget", "euro", "euros", "gratuit"]);
  }
  function isContactWanted(q) {
    return has(q, ["contacter", "contact", "conseiller", "humain", "quelqu'un", "quelquun", "parler", "appeler", "telephone", "telephoner", "joindre", "rappel", "rappeler", "email", "mail", "coordonnees", "adresse"]);
  }
  function isListFormations(q) {
    return (has(q, ["formations", "formation", "cours", "catalogue", "proposez", "propose", "offre", "liste", "disponibles", "disponible"]) &&
            has(q, ["quelles", "quels", "quel", "liste", "toutes", "tous", "voir", "proposez", "propose", "disponibles", "disponible", "catalogue", "avez"]));
  }
  function isDuration(q) { return has(q, ["duree", "dure", "combien de temps", "jours", "jour", "heures", "long", "longue"]); }
  function isSchedule(q) { return has(q, ["date", "dates", "quand", "prochaine", "session", "sessions", "calendrier", "agenda", "agendas", "planning", "horaire", "horaires"]); }
  /* Formats horaires (journée / soirée / week-end) d'une FORMATION — pas les horaires d'ouverture de l'équipe. */
  function isScheduleFormat(q) {
    return has(q, ["week-end", "weekend", "week end", "soir", "soiree", "soirees", "en journee", "samedi", "dimanche", "apres le travail"]) &&
           has(q, ["formation", "formations", "cours", "session", "sessions", "stage", "stages", "former", "apprendre"]);
  }
  function isHowItWorks(q) { return has(q, ["deroule", "deroulement", "passe", "fonctionne", "organise", "organisation", "comment ca", "comment se"]); }
  function isSignup(q) { return has(q, ["inscrire", "inscription", "inscris", "reserver", "reservation", "s'inscrire", "sinscrire", "reserve"]); }
  /* Détecteurs « fiche formation » (langues, format, public, types, lieu, réglementaire) */
  function isLanguage(q) { return has(q, ["langue", "langues", "neerlandais", "anglais", "flamand", "nederlands", "english", "dutch"]); }
  /* « format » en mot ENTIER : has() teste un préfixe et « format » préfixerait « formation ». */
  function isPractice(q) { return has(q, ["pratique", "pratiques", "theorie", "theorique", "theoriques", "sur machine", "exercice", "exercices", "mise en situation"]) || /(^|\s)format(\s|$)/.test(q); }
  function isAudience(q) { return has(q, ["pour moi", "public", "s'adresse", "adresse a", "destinee", "destine", "convient", "concerne", "concernee", "a qui", "qui peut", "technicien", "techniciens", "maintenance", "operateur", "operateurs", "entretien", "je travaille", "je suis"]); }
  function isTypes(q) { return has(q, ["type", "types", "sorte", "sortes", "modele", "modeles", "ciseaux", "araignee", "telescopique", "articulee", "camion", "verticale", "automotrice"]); }
  function isWhere(q) { return has(q, ["ou trouver", "ou puis", "ou voir", "ou est", "ou se", "lien", "fiche", "detail", "details", "page"]); }
  function isCertification(q) { return has(q, ["caces", "r486", "certifi", "agree", "agrement", "reconnu", "reconnue", "reconnaissance", "obligatoire", "attestation", "diplome", "homologu"]); }

  /* « a, b et c » */
  function joinList(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " et " + items[items.length - 1];
  }
  function lower(s) { return String(s).charAt(0).toLowerCase() + String(s).slice(1); }

  /* Formation dont le public visé recoupe le message (« je travaille dans la maintenance… »). */
  function audienceMatch(rawMessage) {
    var tokens = Retrieval.tokenize(rawMessage);
    var found = null;
    Knowledge.formations().forEach(function (f) {
      if (found || !f.audience) return;
      var hay = " " + Retrieval.normalize(f.audience.join(" ")) + " ";
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].length >= 5 && hay.indexOf(" " + tokens[i]) !== -1) { found = f; return; }
      }
    });
    return found;
  }

  /* Faits complémentaires d'une fiche (uniquement ceux qui existent). */
  function extraFacts(f) {
    var out = [];
    if (f.format) out.push("Format : " + lower(f.format) + ".");
    if (f.priceLabel) out.push("Tarif : " + f.priceLabel + ".");
    if (f.languages) out.push("Langues : " + f.languages.map(lower).join(", ") + ".");
    return out.length ? " " + out.join(" ") : "";
  }

  /* --------------------------------------------------------------------- */
  /* Écran d'accueil (contextuel)                                           */
  /* --------------------------------------------------------------------- */
  function welcome(ctx) {
    ctx = ctx || {};
    var base = "Bonjour,\nje suis l’Assistant Wisy. Comment puis-je vous aider aujourd’hui ?";
    var suggestions = ["Trouver une formation", "Voir les formations disponibles", "Comment se déroule une formation ?", "Contacter Wisy Safety"];
    var intro = base;

    if (ctx.page === "formation" && ctx.formationId) {
      var f = Knowledge.byId(ctx.formationId);
      if (f) {
        intro = "Une question sur la formation « " + f.title + " » ? Je peux vous en résumer les points clés ou vous aider à vous inscrire.";
        suggestions = ["Durée de cette formation", "Comment m’inscrire ?", "Voir d’autres formations", "Contacter Wisy Safety"];
        if (f.priceLabel && f.subtypes) {
          /* fiche riche (tarif + types de nacelles connus) : questions les plus utiles d'abord */
          suggestions = ["Quel est le tarif ?", "Durée de cette formation", "Quels types de nacelles ?", "Comment m’inscrire ?"];
        }
      }
    } else if (ctx.page === "formations") {
      intro = "Bonjour,\nje peux vous aider à trouver la formation adaptée à votre besoin. Dites-moi votre secteur ou votre objectif.";
      suggestions = ["Formations sécurité", "Formations techniques", "Premiers secours", "Voir toutes les formations"];
    } else if (ctx.page === "contact") {
      suggestions = ["Voir les formations disponibles", "Comment se déroule une formation ?", "Vos horaires", "Trouver une formation"];
    } else if (ctx.page === "faq") {
      /* Centre d'aide : l'assistant s'appuie sur les MÊMES réponses que la page. */
      intro = "Bonjour,\nje suis l’Assistant Wisy. Je réponds à partir des mêmes informations que le Centre d’aide : posez votre question ou choisissez une suggestion.";
      var starters = starterQuestions(4);
      if (starters.length) suggestions = starters;
    }

    return {
      message: intro,
      suggestions: suggestions,
      meta: { intent: "welcome", state: "welcome" }
    };
  }

  /* --------------------------------------------------------------------- */
  /* Réponse principale (déterministe)                                      */
  /* --------------------------------------------------------------------- */
  function respond(rawMessage, opts) {
    opts = opts || {};
    var q = N(rawMessage);

    if (!q) {
      return {
        message: "Pouvez-vous préciser votre question ? Je peux vous aider à trouver une formation ou une information sur Wisy Safety.",
        suggestions: ["Voir les formations disponibles", "Contacter Wisy Safety"],
        meta: { intent: "empty" }
      };
    }

    /* 1) Protection anti prompt-injection — on ne divulgue rien, on recentre */
    if (isInjection(q)) {
      return {
        message: "Je suis l’assistant de Wisy Safety : je réponds uniquement aux questions sur nos formations et notre organisme. Je ne peux pas partager d’instructions internes, mais je serai ravi de vous aider sur une formation.",
        suggestions: ["Voir les formations disponibles", "Trouver une formation", "Contacter Wisy Safety"],
        meta: { intent: "injection" }
      };
    }

    /* 2) Salutation seule */
    if (isGreeting(q)) {
      return {
        message: "Bonjour, comment puis-je vous aider ? Je peux vous orienter vers une formation ou vous donner une information sur Wisy Safety.",
        suggestions: ["Voir les formations disponibles", "Trouver une formation", "Contacter Wisy Safety"],
        meta: { intent: "greeting" }
      };
    }

    /* 2a) Question du Centre d'aide reprise TELLE QUELLE (suggestion cliquable, copier-coller) :
       réponse canonique de la FAQ — la même que sur la page, avec ses questions liées — quelle que
       soit l'intention détectée ensuite. Égalité stricte du libellé : « Combien de temps dure la
       formation ? » posé sur une fiche formation reste, lui, la question de CETTE formation.
       Exception : le catalogue, dont la réponse « cartes de formations » est plus riche (étape 6). */
    if (Faq) {
      var verbatim = Faq.exact(rawMessage);
      if (verbatim && !RICH_INTENT_FAQ[verbatim.id]) return faqResponse(verbatim, null);
    }

    /* Formation évoquée dans le message (ou contexte de page) */
    var mentioned = Retrieval.bestFormation(withoutBrand(rawMessage));
    if (!mentioned && opts.context && opts.context.formationId) mentioned = Knowledge.byId(opts.context.formationId);

    /* 2b) CACES / certification / agrément : jamais affirmés sans confirmation.
       Concerne les formations qui déclarent des affirmations `unconfirmed`
       (la nacelle) — ou toute mention explicite de CACES / R486. */
    if (isCertification(q) && ((mentioned && mentioned.unconfirmed) || has(q, ["caces", "r486"]))) {
      var certTarget = (mentioned && mentioned.unconfirmed) ? mentioned : Knowledge.byId("nacelle");
      return {
        message: "Cette information doit être confirmée auprès de l’équipe Wisy Safety : je ne peux pas affirmer qu’une certification, un CACES, un agrément ou une reconnaissance officielle est associé à cette formation sans confirmation. Contactez-nous pour une réponse précise.",
        cards: (certTarget ? [trainingCard(certTarget)] : []).concat([contactCard()]),
        suggestions: ["Voir les formations disponibles", "Comment m’inscrire ?"],
        sources: [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "certification_unconfirmed" }
      };
    }

    /* 2c) Journée / soirée / week-end : formats NON confirmés par le site → page Agenda + contact,
       jamais une promesse (et jamais les horaires d'ouverture de l'équipe pris pour ceux des formations). */
    if (isScheduleFormat(q) && !isPrice(q)) {
      var fx = faqExtras("faq-inscription-dates");
      return {
        message: (mentioned ? "À propos de la formation « " + mentioned.title + " » :\n" : "") +
          "Je n’ai pas d’information confirmée sur les formats proposés (journée, soirée ou week-end) : ils dépendent des sessions. Les sessions seront consultables sur la page Agenda ; en attendant, l’équipe Wisy Safety peut vous indiquer ce qui est possible.",
        cards: cardsOf(agendaCard(), contactCard()),
        suggestions: fx.related.length ? fx.related : ["Voir les formations disponibles", "Comment m’inscrire ?"],
        sources: fx.sources.length ? fx.sources : [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "schedule_format_unconfirmed", faqId: fx.sources.length ? "faq-inscription-dates" : undefined }
      };
    }

    /* 3a) Prix CONNU pour cette formation (confirmé par Wisy Safety) */
    if (isPrice(q) && mentioned && mentioned.priceLabel) {
      return {
        message: "La formation « " + mentioned.title + " » est proposée à " + mentioned.priceLabel + " (hors TVA). Pour toute question sur les modalités (dates, groupe, entreprise), contactez l’équipe Wisy Safety.",
        cards: [trainingCard(mentioned), contactCard()],
        suggestions: ["Comment m’inscrire ?", "Durée de cette formation", "Voir d’autres formations"],
        sources: [{ title: mentioned.title, url: mentioned.url }],
        meta: { intent: "formation_price" }
      };
    }

    /* 3) Prix / tarif — NON présent pour cette formation → honnêteté + contact */
    if (isPrice(q)) {
      var priceFaq = !mentioned && specificFaq(rawMessage, "faq-tarifs-prix");   // TVA, paiement, financement, devis…
      if (priceFaq) return faqResponse(priceFaq.top.item, priceFaq);
      var px = faqExtras("faq-tarifs-prix");
      return {
        message: (mentioned ? "À propos de la formation « " + mentioned.title + " » :\n" : "") +
          faqText("faq-tarifs-prix", "Les tarifs dépendent de la formation. Contactez-nous pour recevoir un tarif adapté à votre besoin."),
        cards: [contactCard()],
        suggestions: px.related.length ? px.related : ["Voir les formations disponibles", "Comment s’inscrire ?"],
        sources: px.sources.length ? px.sources : [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "price_unavailable", faqId: px.sources.length ? "faq-tarifs-prix" : undefined }
      };
    }

    /* 4) Dates / sessions — NON présent sur le site → contact */
    if (isSchedule(q) && !isDuration(q)) {
      /* « Où voir l'agenda ? » : on répond à la question posée (l'emplacement), sans jamais annoncer une date. */
      if (has(q, ["agenda", "agendas", "calendrier"]) && isWhere(q)) {
        var lx = faqExtras("faq-inscription-dates");
        return {
          message: "L’agenda des formations se trouve sur la page Agenda. L’agenda en ligne arrive prochainement : aucune session n’y est publiée pour le moment. Contactez l’équipe Wisy Safety pour connaître les prochaines disponibilités.",
          cards: cardsOf(agendaCard(), contactCard()),
          suggestions: lx.related.length ? lx.related : ["Voir les formations disponibles", "Comment m’inscrire ?"],
          sources: lx.sources,
          meta: { intent: "agenda_location", faqId: lx.sources.length ? "faq-inscription-dates" : undefined }
        };
      }
      var schedFaq = !mentioned && specificFaq(rawMessage, "faq-inscription-dates");   // ex. « vos horaires » = ouverture
      if (schedFaq) return faqResponse(schedFaq.top.item, schedFaq);
      var sx = faqExtras("faq-inscription-dates");
      return {
        message: (mentioned ? "À propos de la formation « " + mentioned.title + " » :\n" : "") +
          faqText("faq-inscription-dates", "Les dates des sessions ne sont pas encore publiées en ligne. La page Agenda les accueillera prochainement ; contactez-nous pour connaître les prochaines disponibilités."),
        cards: cardsOf(agendaCard(), contactCard()),
        suggestions: sx.related.length ? sx.related : ["Voir les formations disponibles", "Comment m’inscrire ?"],
        sources: sx.sources,
        meta: { intent: "schedule_unavailable", faqId: sx.sources.length ? "faq-inscription-dates" : undefined }
      };
    }

    /* 5) Demande explicite de contact humain */
    if (isContactWanted(q) && !mentioned) {
      var contactFaq = specificFaq(rawMessage, "faq-contact-contact");   // ex. « votre adresse » = lieu
      if (contactFaq) return faqResponse(contactFaq.top.item, contactFaq);
      var cx = faqExtras("faq-contact-contact");
      return {
        message: "Bien sûr. Vous pouvez joindre l’équipe Wisy Safety directement :",
        cards: [contactCard()],
        suggestions: cx.related.length ? cx.related : ["Voir les formations disponibles", "Comment se déroule une formation ?"],
        sources: [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "contact" }
      };
    }

    /* 5b) Langues — aucune formation nommée : on répond avec les faits connus */
    if (isLanguage(q) && !mentioned) {
      var withLang = Knowledge.formations().filter(function (f) { return f.languages; });
      if (withLang.length) {
        var lf = withLang[0];
        return {
          message: "La formation « " + lf.title + " » est disponible en " + joinList(lf.languages.map(lower)) + ". Pour les autres formations, la langue n’est pas indiquée sur le site : contactez l’équipe Wisy Safety.",
          cards: [trainingCard(lf), contactCard()],
          suggestions: ["Voir les formations disponibles", "Comment m’inscrire ?"],
          sources: [{ title: lf.title, url: lf.url }],
          meta: { intent: "formation_languages" }
        };
      }
    }

    /* 5c) Public visé — « je travaille dans la maintenance, est-ce pour moi ? » */
    if (isAudience(q) && !mentioned) {
      var aud = audienceMatch(rawMessage);
      if (aud) {
        return {
          message: "Cela peut vous concerner : la formation « " + aud.title + " » s’adresse aux " + joinList(aud.audience.map(lower)) + ".",
          cards: [trainingCard(aud)],
          suggestions: ["Comment m’inscrire ?", "Quel est le tarif ?", "Voir d’autres formations"],
          sources: [{ title: aud.title, url: aud.url }],
          meta: { intent: "formation_audience" }
        };
      }
    }

    /* 6) Lister les formations */
    if (isListFormations(q) && !mentioned) {
      var listFaq = specificFaq(rawMessage, "faq-choisir-catalogue", true);
      if (listFaq) return faqResponse(listFaq.top.item, listFaq);
      var cat = Retrieval.detectCategory(Retrieval.tokenize(rawMessage));
      var list = cat ? Knowledge.formationsByCategory(cat) : Knowledge.formations();
      var cards = list.slice(0, cat ? 4 : 3).map(trainingCard);
      var names = Knowledge.formations().map(function (f) { return f.title; });
      return {
        message: cat
          ? "Voici nos formations dans la catégorie " + Knowledge.CATEGORIES[cat].label + " :"
          : "Wisy Safety propose 6 formations : " + names.join(", ") + ". En voici quelques-unes — vous pouvez aussi voir le catalogue complet.",
        cards: cards,
        suggestions: cat ? ["Voir toutes les formations", "Comment m’inscrire ?"] : ["Formations sécurité", "Premiers secours", "Voir le catalogue complet"],
        sources: [{ title: "Toutes les formations", url: "formations.html" }],
        meta: { intent: "list_formations" }
      };
    }

    /* 7) Une formation est identifiée : durée, inscription, ou fiche */
    if (mentioned) {
      if (isDuration(q)) {
        return {
          message: "La formation « " + mentioned.title + " » dure " + mentioned.duration + " (niveau " + mentioned.level.toLowerCase() + ").",
          cards: [trainingCard(mentioned)],
          suggestions: ["Comment m’inscrire ?", "Voir d’autres formations"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_duration" }
        };
      }
      if (isSignup(q)) {
        return {
          message: "Pour vous inscrire à la formation « " + mentioned.title + " », utilisez le formulaire d’inscription en ligne. Vous pouvez aussi nous contacter si vous hésitez.",
          cards: [trainingCard(mentioned), contactCard()],
          suggestions: ["Voir d’autres formations", "Comment se déroule une formation ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_signup" }
        };
      }
      /* Fiche riche (faits confirmés dans le registre) : réponses ciblées */
      if (mentioned.languages && isLanguage(q)) {
        return {
          message: "La formation « " + mentioned.title + " » est disponible en " + joinList(mentioned.languages.map(lower)) + ".",
          cards: [trainingCard(mentioned)],
          suggestions: ["Comment m’inscrire ?", "Quel est le tarif ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_languages" }
        };
      }
      if (mentioned.subtypes && isTypes(q)) {
        return {
          message: "La page de la formation « " + mentioned.title + " » présente " + mentioned.subtypes.length + " types de nacelles : " + joinList(mentioned.subtypes.map(lower)) + ". Chaque type est détaillé (principe de fonctionnement, usages, avantages et limites).",
          cards: [trainingCard(mentioned)],
          suggestions: ["Quel est le tarif ?", "Comment m’inscrire ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_types" }
        };
      }
      if (mentioned.audience && isAudience(q)) {
        return {
          message: "La formation « " + mentioned.title + " » s’adresse aux " + joinList(mentioned.audience.map(lower)) + ".",
          cards: [trainingCard(mentioned)],
          suggestions: ["Comment m’inscrire ?", "Quel est le tarif ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_audience" }
        };
      }
      if (mentioned.format && isPractice(q)) {
        return {
          message: "Oui : le format de la formation « " + mentioned.title + " » est « " + lower(mentioned.format) + " ». Elle associe donc des notions théoriques et une mise en pratique.",
          cards: [trainingCard(mentioned)],
          suggestions: ["Durée de cette formation", "Comment m’inscrire ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }],
          meta: { intent: "formation_format" }
        };
      }
      if (isWhere(q) && mentioned.url !== "formations.html#" + mentioned.id) {
        return {
          message: "Vous trouverez la formation « " + mentioned.title + " » sur sa page dédiée (programme, types de nacelles, FAQ) ainsi que dans le catalogue des formations.",
          cards: [trainingCard(mentioned)],
          suggestions: ["Quel est le tarif ?", "Comment m’inscrire ?"],
          sources: [{ title: mentioned.title, url: mentioned.url }, { title: "Toutes les formations", url: "formations.html" }],
          meta: { intent: "formation_location" }
        };
      }
      // Fiche générale de la formation
      return {
        message: "Voici la formation « " + mentioned.title + " » : " + mentioned.description + " Durée : " + mentioned.duration + "." + extraFacts(mentioned),
        cards: [trainingCard(mentioned)],
        suggestions: ["Comment m’inscrire ?", "Voir d’autres formations", "Contacter Wisy Safety"],
        sources: [{ title: mentioned.title, url: mentioned.url }],
        meta: { intent: "formation_detail" }
      };
    }

    /* 8) Comment se déroule une formation (FAQ générique) */
    if (isHowItWorks(q)) {
      return {
        message: faqText("faq-deroulement-comment", "Nos formations durent de 1 à 3 jours selon le programme. Pour les dates précises et l’organisation, le mieux est de nous contacter."),
        suggestions: relatedQuestions("faq-deroulement-comment", 3).concat(["Contacter Wisy Safety"]).slice(0, 4),
        sources: [{ title: "Comment se déroule une formation ?", url: "faq.html#faq-deroulement-comment" }],
        meta: { intent: "how_it_works", faqId: "faq-deroulement-comment" }
      };
    }

    /* 9) Inscription générique (sans formation précise) */
    if (isSignup(q)) {
      var signupFaq = specificFaq(rawMessage, "faq-inscription-comment");   // annulation, participants, confirmation…
      if (signupFaq) return faqResponse(signupFaq.top.item, signupFaq);
      return {
        message: faqText("faq-inscription-comment", "Vous pouvez vous inscrire directement en ligne depuis la page Inscription, ou nous contacter si vous préférez être accompagné dans votre choix."),
        cards: [navigationCard(Knowledge.byId("page-inscription"))],
        suggestions: relatedQuestions("faq-inscription-comment", 2).concat(["Voir les formations disponibles"]).slice(0, 3),
        sources: faqExtras("faq-inscription-comment").sources.concat([{ title: "Inscription", url: "inscription.html" }]),
        meta: { intent: "signup", faqId: "faq-inscription-comment" }
      };
    }

    /* 9b) Question générale couverte par le Centre d'aide (moteur partagé, seuil de confiance) */
    if (!mentioned) {
      var hit = faqLookup(rawMessage, true);
      if (hit) return faqResponse(hit.top.item, hit);
    }

    /* 10) Recherche générale dans la base (pages, FAQ, contact…) */
    var results = Retrieval.search(rawMessage, { limit: 3, types: ["formation", "page", "contact"] });
    if (results.length) {
      var top = results[0].entry;
      if (top.type === "contact") {
        return {
          message: "Voici comment joindre Wisy Safety :",
          cards: [contactCard()],
          sources: [{ title: "Contact", url: C.contactUrl }],
          meta: { intent: "contact" }
        };
      }
      if (top.type === "page") {
        return {
          message: "La page « " + top.title + " » devrait vous aider : " + (top.content || ""),
          cards: [navigationCard(top)],
          suggestions: ["Voir les formations disponibles", "Contacter Wisy Safety"],
          sources: [{ title: top.title, url: top.url }],
          meta: { intent: "navigation" }
        };
      }
      if (top.type === "formation") {
        return {
          message: "Cette formation correspond peut-être à votre recherche : « " + top.title + " ». " + top.description,
          cards: [trainingCard(top)],
          suggestions: ["Comment m’inscrire ?", "Voir d’autres formations"],
          sources: [{ title: top.title, url: top.url }],
          meta: { intent: "formation_detail" }
        };
      }
    }

    /* 10b) Dernière chance avant d'avouer : correspondance FAQ de confiance moyenne */
    if (!mentioned) {
      var soft = faqLookup(rawMessage, false);
      if (soft) return faqResponse(soft.top.item, soft);
    }

    /* 11) Aucune information trouvée — honnêteté + contact + pistes */
    return {
      message: "Je n’ai pas encore suffisamment d’informations pour répondre précisément à cette question. Vous pouvez contacter l’équipe Wisy Safety pour obtenir une réponse personnalisée.",
      cards: [contactCard()],
      suggestions: starterQuestions(3).length ? starterQuestions(3) : ["Voir les formations disponibles", "Comment se déroule une formation ?"],
      meta: { intent: "not_found" }
    };
  }

  return {
    welcome: welcome,
    respond: respond,
    trainingCard: trainingCard,
    navigationCard: navigationCard,
    contactCard: contactCard
  };
});
