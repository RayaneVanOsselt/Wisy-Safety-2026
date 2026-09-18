/* =========================================================================
   WISY SAFETY — Assistant · Moteur de réponse local (déterministe)
   -------------------------------------------------------------------------
   Cœur FIABLE de l'assistant. Transforme un message en réponse STRUCTURÉE
   (ChatResponse) à partir de la SEULE base de connaissances. Aucune
   invention : prix, dates et modalités absents du site déclenchent une
   redirection vers le contact humain.

   Ce moteur fonctionne 100 % côté client, sans réseau ni clé API : le site
   dispose donc d'un assistant réellement utile même sans service externe.
   La route serveur optionnelle (/api/chat) ne fait que l'enrichir en
   langage naturel (voir js/assistant/assistant.js pour l'orchestration).

   ChatResponse = {
     message: string,
     cards?:      Array<{ type:"training"|"navigation"|"contact", ... }>,
     suggestions?: string[],
     sources?:    Array<{ title:string, url:string }>,
     meta?:       { intent, state? }
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
      url: f.url,
      signupUrl: f.signupUrl
    };
  }
  function navigationCard(p) {
    return { type: "navigation", title: p.title, titleKey: p.titleKey, description: p.content || p.description || "", url: p.url };
  }
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
  function isPrice(q) { return has(q, ["prix", "tarif", "tarifs", "cout", "combien", "coute", "coutent", "devis", "budget", "euro", "euros", "gratuit"]); }
  function isContactWanted(q) {
    return has(q, ["contacter", "contact", "conseiller", "humain", "quelqu'un", "quelquun", "parler", "appeler", "telephone", "telephoner", "joindre", "rappel", "rappeler", "email", "mail", "coordonnees", "adresse"]);
  }
  function isListFormations(q) {
    return (has(q, ["formations", "formation", "cours", "catalogue", "proposez", "propose", "offre", "liste", "disponibles", "disponible"]) &&
            has(q, ["quelles", "quels", "quel", "liste", "toutes", "tous", "voir", "proposez", "propose", "disponibles", "disponible", "catalogue", "avez"]));
  }
  function isDuration(q) { return has(q, ["duree", "dure", "combien de temps", "jours", "jour", "heures", "long", "longue"]); }
  function isSchedule(q) { return has(q, ["date", "dates", "quand", "prochaine", "session", "sessions", "calendrier", "planning", "horaire", "horaires"]); }
  function isHowItWorks(q) { return has(q, ["deroule", "deroulement", "passe", "fonctionne", "organise", "organisation", "comment ca", "comment se"]); }
  function isSignup(q) { return has(q, ["inscrire", "inscription", "inscris", "reserver", "reservation", "s'inscrire", "sinscrire", "reserve"]); }

  /* --------------------------------------------------------------------- */
  /* Écran d'accueil (contextuel)                                           */
  /* --------------------------------------------------------------------- */
  function welcome(ctx) {
    ctx = ctx || {};
    var base = "Bonjour 👋\nJe suis l’assistant Wisy Safety. Je peux vous aider à trouver une formation, comprendre nos modalités ou retrouver rapidement une information.";
    var suggestions = ["Trouver une formation", "Voir les formations disponibles", "Comment se déroule une formation ?", "Contacter Wisy Safety"];
    var intro = base;

    if (ctx.page === "formation" && ctx.formationId) {
      var f = Knowledge.byId(ctx.formationId);
      if (f) {
        intro = "Une question sur la formation « " + f.title + " » ? Je peux vous en résumer les points clés ou vous aider à vous inscrire.";
        suggestions = ["Durée de cette formation", "Comment m’inscrire ?", "Voir d’autres formations", "Contacter Wisy Safety"];
      }
    } else if (ctx.page === "formations") {
      intro = "Bonjour 👋\nJe peux vous aider à trouver la formation adaptée à votre besoin. Dites-moi votre secteur ou votre objectif.";
      suggestions = ["Formations sécurité", "Formations techniques", "Premiers secours", "Voir toutes les formations"];
    } else if (ctx.page === "contact") {
      suggestions = ["Voir les formations disponibles", "Comment se déroule une formation ?", "Vos horaires", "Trouver une formation"];
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
        message: "Bonjour 👋 Comment puis-je vous aider ? Je peux vous orienter vers une formation ou vous donner une information sur Wisy Safety.",
        suggestions: ["Voir les formations disponibles", "Trouver une formation", "Contacter Wisy Safety"],
        meta: { intent: "greeting" }
      };
    }

    /* Formation évoquée dans le message (ou contexte de page) */
    var mentioned = Retrieval.bestFormation(rawMessage);
    if (!mentioned && opts.context && opts.context.formationId) mentioned = Knowledge.byId(opts.context.formationId);

    /* 3) Prix / tarif — NON présent sur le site → honnêteté + contact */
    if (isPrice(q)) {
      return {
        message: "Les tarifs ne sont pas indiqués sur le site : ils dépendent de la formation et du contexte (individuel ou entreprise). Le mieux est de nous contacter pour recevoir un tarif adapté" + (mentioned ? " pour la formation « " + mentioned.title + " »." : ".") ,
        cards: [contactCard()],
        suggestions: ["Voir les formations disponibles", "Comment s’inscrire ?"],
        sources: [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "price_unavailable" }
      };
    }

    /* 4) Dates / sessions — NON présent sur le site → contact */
    if (isSchedule(q) && !isDuration(q)) {
      return {
        message: "Les dates précises des prochaines sessions ne sont pas publiées sur le site. Contactez-nous et nous vous indiquerons les disponibilités" + (mentioned ? " pour la formation « " + mentioned.title + " »." : ".") + " Nos horaires : " + C.hours + ".",
        cards: [contactCard()],
        suggestions: ["Voir les formations disponibles", "Comment m’inscrire ?"],
        meta: { intent: "schedule_unavailable" }
      };
    }

    /* 5) Demande explicite de contact humain */
    if (isContactWanted(q) && !mentioned) {
      return {
        message: "Bien sûr. Vous pouvez joindre l’équipe Wisy Safety directement :",
        cards: [contactCard()],
        suggestions: ["Voir les formations disponibles", "Comment se déroule une formation ?"],
        sources: [{ title: "Contact", url: C.contactUrl }],
        meta: { intent: "contact" }
      };
    }

    /* 6) Lister les formations */
    if (isListFormations(q) && !mentioned) {
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
      // Fiche générale de la formation
      return {
        message: "Voici la formation « " + mentioned.title + " » : " + mentioned.description + " Durée : " + mentioned.duration + ".",
        cards: [trainingCard(mentioned)],
        suggestions: ["Comment m’inscrire ?", "Voir d’autres formations", "Contacter Wisy Safety"],
        sources: [{ title: mentioned.title, url: mentioned.url }],
        meta: { intent: "formation_detail" }
      };
    }

    /* 8) Comment se déroule une formation (FAQ générique) */
    if (isHowItWorks(q)) {
      var faqD = Knowledge.byId("faq-deroulement");
      return {
        message: faqD.answer,
        suggestions: ["Voir les formations disponibles", "Comment m’inscrire ?", "Contacter Wisy Safety"],
        sources: [{ title: "Nos formations", url: "formations.html" }],
        meta: { intent: "how_it_works" }
      };
    }

    /* 9) Inscription générique (sans formation précise) */
    if (isSignup(q)) {
      return {
        message: "Vous pouvez vous inscrire directement en ligne depuis la page Inscription. Dites-moi la formation qui vous intéresse et je vous guide.",
        cards: [navigationCard(Knowledge.byId("page-inscription"))],
        suggestions: ["Voir les formations disponibles", "Trouver une formation"],
        sources: [{ title: "Inscription", url: "inscription.html" }],
        meta: { intent: "signup" }
      };
    }

    /* 10) Recherche générale dans la base (pages, FAQ, contact…) */
    var results = Retrieval.search(rawMessage, { limit: 3 });
    if (results.length) {
      var top = results[0].entry;
      if (top.type === "faq") {
        return {
          message: top.answer,
          cards: top.unavailableOnSite ? [contactCard()] : undefined,
          suggestions: ["Voir les formations disponibles", "Contacter Wisy Safety"],
          sources: [{ title: top.title, url: top.url }],
          meta: { intent: "faq" }
        };
      }
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

    /* 11) Aucune information trouvée — honnêteté + contact + pistes */
    return {
      message: "Je n’ai pas trouvé cette information sur le site. Je peux vous orienter vers nos formations, ou vous pouvez contacter directement l’équipe Wisy Safety qui répondra précisément.",
      cards: [contactCard()],
      suggestions: ["Voir les formations disponibles", "Comment se déroule une formation ?"],
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
