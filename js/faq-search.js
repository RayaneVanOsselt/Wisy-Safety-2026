/* =========================================================================
   WISY SAFETY — Centre d'aide · Moteur de recherche PARTAGÉ
   -------------------------------------------------------------------------
   Interroge js/faq-data.js (source unique) et sert À LA FOIS :
     • la barre de recherche de faq.html (résultats en direct, surlignage) ;
     • l'assistant Wisy (js/assistant/responder.js) — même logique, mêmes
       réponses : aucune divergence possible entre la FAQ et le chatbot.

   Volontairement SANS IA ni dépendance : une recherche locale, déterministe,
   instantanée et testable, suffisante pour ~30 questions.

   Ce qu'elle sait faire
     1. Normalisation (toutes écritures) : minuscules, accents, ligatures et marques
        diacritiques retirés (latin, cyrillique, arabe — variantes de l'alif ramenées
        à une seule forme…), ponctuation neutralisée, mots vides ignorés
        (« comment », « hoe », « wie »…).
     2. Variantes simples : pluriels / féminins ramenés à une même racine
        (formation ~ formations, certifiante ~ certifiant).
     3. Synonymes et familles de mots (LEXIQUE ci-dessous) : « prix » retrouve
        les tarifs, « payer » le paiement et le financement, « certificat » la
        certification / l'attestation, « inscription » s'inscrire, etc.
     4. Champs pondérés : question > mots-clés / synonymes de l'entrée >
        catégorie > texte de la réponse. Mots rares plus discriminants que
        « formation ».
     5. Correspondance partielle « en tapant » (« insc » → inscription) et
        tolérance aux fautes de frappe (« inscirption »).
     6. Confiance du résultat (exact / high / medium / low / none) : l'assistant
        ne répond QUE si la confiance est suffisante, sinon il le dit.

   Langues : la recherche s'exécute sur le texte de la langue demandée (option
   `lang`, packs js/faq-i18n/) — question, mots-clés, synonymes, catégorie et
   réponse traduits — ET sur les mots-clés / synonymes français, pour qu'un mot
   français saisi sur une page traduite retrouve la bonne entrée. Le lexique de
   familles de mots (LEXIQUE) reste français : ailleurs, ce sont les mots-clés et
   synonymes propres à chaque langue qui élargissent la recherche.

   Module « dual-mode » : complète `window.WisyFAQ` (navigateur) ou l'objet
   exporté par js/faq-data.js (Node). Charger js/faq-data.js AVANT.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var isNode = typeof module === "object" && module.exports;
  var Data = isNode ? require("./faq-data.js") : root.WisyFAQ;
  if (!Data || !Data.ITEMS) return; // données absentes : rien à exposer
  var api = factory(Data);
  Object.keys(api).forEach(function (k) { Data[k] = api[k]; });
  if (isNode) module.exports = Data; else root.WisyFAQ = Data;
})(typeof self !== "undefined" ? self : this, function (Data) {
  "use strict";

  /* ---------------------------------------------------------------------
     1. Normalisation
     --------------------------------------------------------------------- */
  function fold(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss")
      /* arabe : variantes de l'alif, ya / alif maqsura, ta marbouta, hamza portée, tatwil */
      .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647")
      .replace(/\u0624/g, "\u0648").replace(/\u0626/g, "\u064a").replace(/\u0640/g, "")
      /* accents latins / cyrilliques (U+0300–036F) et voyelles brèves arabes (U+064B–065F, U+0670) */
      .normalize("NFD").replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "");
  }
  /* « Où s'inscrire ? » → « ou s inscrire » ; toutes les écritures (lettres et chiffres Unicode) */
  function normalize(s) {
    return fold(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  var STOP = {};
  ("le la les l un une des du de d au aux et ou a en dans sur sous pour par avec sans chez vers " +
   "je tu il elle on nous vous ils elles me te se s m j t c n qu ce cet cette ces ci ca cela ceci " +
   "mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
   "que qui quoi dont quel quelle quels quelles lequel laquelle lesquels " +
   "est sont suis es ai as avez avons ont sera seront etait etre avoir fait faire " +
   "comment pourquoi peut peux puis pouvez pouvons peuvent doit dois doivent faut besoin " +
   "y ne pas plus moins tres tout tous toute toutes aussi ainsi alors donc mais car ni si oui non pre " +
   "question questions reponse reponses aide aides aider aidez " +
   "bonjour bonsoir salut coucou hello hey merci svp stp voudrais voulais voudrait veux veut voulez souhaite souhaiterais souhaiterait aimerais aimerait " +
   "savoir connaitre demander dire indiquer expliquer possible faites faisons font " +
   "the an of to in on for and or is are do you my your it this that with how what where").split(" ")
    .forEach(function (w) { if (w) STOP[w] = 1; });

  /* Mots vides des langues traduites (repliés comme le reste). Volontairement courts : seulement
     les mots-outils qui n'aident pas à trouver une réponse (« comment », « can », « wie », « как »…). */
  ("de het een en of van voor met bij op in te is zijn ik je u we wij ze hij zij ons uw mijn jouw hoe wat waar wanneer wie kan kunnen mag moet naar aan om dat dit die er niet geen ook maar dan als " +
   "die en of van vir met by op in te is was ek jy u ons hulle hy sy my jou hoe wat waar wanneer wie kan kon mag moet na aan om dat dit nie geen ook maar dan as " +
   "der die das ein eine einen und oder von fur mit bei auf zu ist sind ich du sie wir er es mein ihr ihre ihren wie was wo wann wer kann konnen darf muss nach an um dass nicht kein auch aber dann wenn " +
   "sau cu pe un o este sunt eu el ea noi voi ei ele meu mea tau dumneavoastra cum ce unde cand cine poate pot trebuie catre prin din ca nu nici dar apoi daca " +
   "il lo gli uno una da con su per tra fra sono io lui lei loro mio tuo come cosa dove quando chi puo posso devo verso che non anche ma poi se " +
   "in ali ter da je so sem si smo ste jaz ti on ona mi vi oni moj tvoj vas kako kaj kje kdaj kdo lahko moram do za od na v z s pri po ne tudi ampak potem ce " +
   "и или на в във за с със от до по при е са съм си сме сте аз ти той тя ние вие те мой ваш как какво къде кога кой може мога трябва към че не също но след ако " +
   "في من على الى عن مع هو هي نحن انا انت هم هذا هذه ذلك و او ثم لا ما هل كيف اين متى لماذا يمكن يجب ان كان قد كل بعد قبل").split(" ")
    .forEach(function (w) { w = fold(w); if (w) STOP[w] = 1; });

  function keepWord(w) { return !!w && (w.length >= 2 || /\d/.test(w)) && !STOP[w]; }
  function words(s) { var n = normalize(s); return n ? n.split(" ") : []; }

  /* Racine légère : pluriel (s/x) puis « e » final féminin. Appliquée à l'identique
     aux mots de la requête, du contenu et du lexique. */
  function stem(w) {
    if (/^[\u0600-\u06ff]+$/.test(w)) {              // arabe : article « ال » (et ses préfixes) puis pluriel régulier
      var a = w.replace(/^(?:\u0648\u0627\u0644|\u0628\u0627\u0644|\u0643\u0627\u0644|\u0641\u0627\u0644|\u0644\u0644|\u0627\u0644)/, "");
      if (a.length >= 3) w = a;
      if (w.length > 4) w = w.replace(/(?:\u0627\u062a|\u0627\u0646|\u0648\u0646|\u064a\u0646)$/, "");
      return w;
    }
    if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1);
    if (w.length > 5 && /e$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  function stems(s) { return words(s).filter(keepWord).map(stem); }

  /* ---------------------------------------------------------------------
     2. Lexique — familles de mots et équivalences (côté REQUÊTE).
        forms : formes reconnues (sans accents ; les expressions sont
                reconnues comme un tout) — links : familles voisines, prises
                en compte avec un poids plus faible.
        Ce lexique n'affirme rien : il ne fait qu'orienter vers l'entrée
        pertinente. Le contenu affiché reste celui de faq-data.js.
     --------------------------------------------------------------------- */
  var LEXICON = [
    { id: "tarif", links: ["paiement", "tva"], forms: ["prix", "tarif", "tarifs", "tarification", "tarifaire", "cout", "couts", "coute", "coutent", "cher", "budget", "euro", "euros", "montant", "gratuit", "payant"] },
    { id: "tva", links: ["tarif"], forms: ["tva", "ht", "ttc", "taxe", "taxes", "hors taxe", "toutes taxes comprises"] },
    { id: "paiement", links: ["financement", "tarif"], forms: ["payer", "paye", "payes", "paie", "paient", "payez", "paiement", "paiements", "payement", "regler", "reglement", "facture", "factures", "facturation", "facturer", "virement", "acompte", "carte bancaire", "cb"] },
    { id: "financement", links: ["paiement", "tarif"], forms: ["financement", "financements", "financer", "finance", "subvention", "subventions", "subside", "subsides", "cpf", "opco", "prise en charge", "financier", "financiere", "fonds de formation", "compte formation"] },
    { id: "inscription", links: ["prerequis", "delai"], forms: ["inscription", "inscriptions", "inscrire", "inscris", "inscrit", "inscrits", "inscrivez", "inscrivons", "reserver", "reservation", "reservations", "enregistrer", "rejoindre", "adhesion"] },
    { id: "prerequis", links: ["inscription"], forms: ["prerequis", "requis", "condition", "conditions", "exigence", "exigences", "niveau requis", "destinataires"] },
    { id: "certification", links: ["examen"], forms: ["certificat", "certificats", "certification", "certifications", "certifiant", "certifiante", "certifie", "attestation", "attestations", "diplome", "diplomes", "brevet", "brevets", "agrement", "agree", "agreee", "agrees", "reconnaissance", "reconnu", "reconnue", "reconnus", "homologue", "homologation", "accreditation", "caces", "r486", "qualification"] },
    { id: "examen", links: ["certification"], forms: ["examen", "examens", "test", "tests", "evaluation", "epreuve", "qcm", "reussite", "echec", "repasser"] },
    { id: "delai", links: ["duree", "inscription"], forms: ["delai", "delais", "date", "dates", "quand", "prochaine", "prochaines", "session", "sessions", "calendrier", "planning", "disponibilite", "disponibilites", "agenda", "echeance", "rapidement", "urgent", "urgence"] },
    { id: "duree", links: ["delai"], forms: ["duree", "durees", "dure", "durent", "combien de temps", "jour", "jours", "journee", "heure", "heures", "long", "longue", "longueur", "semaine"] },
    { id: "deroulement", links: ["duree", "pratique"], forms: ["deroulement", "deroule", "organisation", "organise", "organisee", "fonctionnement", "fonctionne", "passe", "modalite", "modalites", "format", "programme", "programmes"] },
    { id: "pratique", links: ["deroulement"], forms: ["pratique", "pratiques", "theorie", "theorique", "theoriques", "exercice", "exercices", "terrain", "manipulation", "equipement", "equipements", "materiel", "mise en pratique"] },
    { id: "lieu", links: ["contact"], forms: ["lieu", "lieux", "adresse", "situe", "situee", "localisation", "anderlecht", "bruxelles", "acces", "itineraire", "transport", "transports", "parking", "metro", "locaux", "venir"] },
    { id: "horaires", links: ["contact"], forms: ["horaire", "horaires", "ouverture", "ouvert", "ouverts", "ouverte", "ferme", "fermes", "fermee", "heures d ouverture", "weekend", "week end", "samedi", "dimanche", "vendredi", "lundi", "mardi", "mercredi", "jeudi"] },
    { id: "contact", links: ["horaires"], forms: ["contact", "contacter", "joindre", "telephone", "tel", "telephoner", "appeler", "appel", "mail", "email", "courriel", "ecrire", "coordonnees", "parler", "conseiller", "conseil", "humain", "rappel", "rappeler", "formulaire", "numero"] },
    { id: "entreprise", links: ["devis"], forms: ["entreprise", "entreprises", "societe", "societes", "collaborateur", "collaborateurs", "employe", "employes", "salarie", "salaries", "personnel", "groupe", "groupes", "equipe", "equipes", "intra", "b2b", "sur site"] },
    { id: "devis", links: ["tarif", "entreprise"], forms: ["devis", "estimation", "proposition", "sur mesure", "sur devis"] },
    { id: "langue", links: [], forms: ["langue", "langues", "francais", "neerlandais", "anglais", "flamand", "nl", "dutch", "english", "french", "traduction", "bilingue", "nederlands"] },
    { id: "catalogue", links: [], forms: ["cours", "catalogue", "liste", "offre", "propose", "proposez", "proposons", "domaine", "domaines", "theme", "themes"] },
    { id: "assistant", links: ["contact"], forms: ["assistant", "chatbot", "bot", "robot", "chat", "discuter", "conversation", "wisy"] },
    { id: "annulation", links: ["contact"], forms: ["annulation", "annuler", "annule", "annulee", "reporter", "report", "desistement", "desister", "remboursement", "rembourser", "rembourse", "modifier", "modification", "changer", "deplacer", "empechement"] },
    { id: "accessibilite", links: ["lieu"], forms: ["accessibilite", "accessible", "accessibles", "pmr", "handicap", "handicape", "handicapee", "mobilite reduite", "fauteuil", "besoins particuliers", "amenagement", "amenagements", "ascenseur"] },
    { id: "participants", links: ["entreprise"], forms: ["participant", "participants", "stagiaire", "stagiaires", "personne", "personnes", "nom", "noms", "prenom", "prenoms"] }
  ];

  var GROUP_BY_ID = {}, GROUP_BY_STEM = {}, PHRASES = [];
  LEXICON.forEach(function (g) {
    g.stems = {};
    GROUP_BY_ID[g.id] = g;
  });
  LEXICON.forEach(function (g) {
    g.linkGroups = g.links.map(function (id) { return GROUP_BY_ID[id]; }).filter(Boolean);
    g.forms.forEach(function (f) {
      var ws = stems(f);
      if (!ws.length) return;
      if (ws.length === 1) {
        g.stems[ws[0]] = 1;
        (GROUP_BY_STEM[ws[0]] = GROUP_BY_STEM[ws[0]] || []).push(g);
      } else {
        PHRASES.push({ seq: ws, group: g });
      }
    });
  });
  PHRASES.sort(function (a, b) { return b.seq.length - a.seq.length; });

  /* ---------------------------------------------------------------------
     3. Index (construit une seule fois, à la première recherche)
     --------------------------------------------------------------------- */
  var W_Q = 6, W_KEY = 7, W_SYN = 5, W_KW = 2.2, W_C = 2.5, W_A = 2;
  var W_GROUP = 0.8, W_LINK = 0.35, W_FUZZY = 0.7;
  var INDEXES = {};                                   // un index par langue (français = « fr »)

  function setOf(list) { var o = {}; list.forEach(function (s) { o[s] = 1; }); return o; }

  function langOf(lang) { return lang && lang !== "fr" && Data.hasPack && Data.hasPack(lang) ? lang : "fr"; }

  function build(lang) {
    var L = langOf(lang);
    if (INDEXES[L]) return INDEXES[L];
    var vocab = {}, df = {};
    function note(o) { Object.keys(o).forEach(function (s) { vocab[s] = 1; }); }

    var docs = Data.items(L).map(function (it, i) {
      var cat = Data.categoryById(it.category, L);
      var d = {
        item: it, order: i,
        qNorm: normalize(it.question),
        q: setOf(stems(it.question)),
        c: setOf(stems(cat ? cat.label : "")),
        a: setOf(stems(it.answer)),
        key: {}, syn: {}, kw: {}, phrases: [], rawPhrases: []
      };
      function indexTerm(term, target) {
        var all = words(term), kept = all.filter(keepWord).map(stem);
        if (!kept.length) return;
        if (all.length === 1) { target[kept[0]] = 1; return; }
        if (kept.length >= 2) {                       // « formation en entreprise »
          d.phrases.push({ seq: " " + kept.join(" ") + " ", stems: kept });
          kept.forEach(function (s) { d.kw[s] = 1; });
        } else {                                      // « où se trouve » : mots vides → expression brute
          d.rawPhrases.push({ seq: " " + all.join(" ") + " ", stems: all.map(stem) });
        }
      }
      (it.keywords || []).forEach(function (t) { indexTerm(t, d.key); });
      (it.synonyms || []).forEach(function (t) { indexTerm(t, d.syn); });
      if (L !== "fr") {                               // + mots-clés / synonymes français (saisie française sur une page traduite)
        var fr = Data.get(it.id) || {};
        (fr.keywords || []).forEach(function (t) { indexTerm(t, d.key); });
        (fr.synonyms || []).forEach(function (t) { indexTerm(t, d.syn); });
      }
      var seen = {};
      [d.q, d.key, d.syn, d.kw, d.c, d.a].forEach(function (o) { Object.keys(o).forEach(function (s) { seen[s] = 1; }); });
      Object.keys(seen).forEach(function (s) { df[s] = (df[s] || 0) + 1; vocab[s] = 1; });
      return d;
    });
    LEXICON.forEach(function (g) { note(g.stems); });

    var n = docs.length;
    INDEXES[L] = { docs: docs, vocab: vocab, vocabList: Object.keys(vocab), df: df, n: n, maxIdf: Math.log(1 + n) };
    return INDEXES[L];
  }

  /* Poids d'un mot selon sa rareté : « formation » (partout) pèse moins que « nacelle ». */
  function idfWeight(stemTok, ix) {
    var f = ix.df[stemTok] || 1;
    return 0.3 + 0.7 * (Math.log(1 + ix.n / f) / ix.maxIdf);
  }

  /* Distance de Damerau-Levenshtein restreinte (une transposition = 1 faute). */
  function osa(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= la; i++) { d[i] = [i]; }
    for (j = 0; j <= lb; j++) { d[0][j] = j; }
    for (i = 1; i <= la; i++) {
      for (j = 1; j <= lb; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[la][lb];
  }

  /* ---------------------------------------------------------------------
     4. Analyse de la requête
        → liste d'« items » : un mot (avec ses variantes) ou une expression
          du lexique reconnue comme un tout (« combien de temps »).
     --------------------------------------------------------------------- */
  function addVariants(v, group, weight, linkWeight) {
    Object.keys(group.stems).forEach(function (s) { if ((v[s] || 0) < weight) v[s] = weight; });
    group.linkGroups.forEach(function (lg) {
      Object.keys(lg.stems).forEach(function (s) { if ((v[s] || 0) < linkWeight) v[s] = linkWeight; });
    });
  }

  function analyze(query, partialMode, ix) {
    var toks = words(query).filter(keepWord).map(stem);
    var used = toks.map(function () { return false; });
    var items = [];

    /* a) expressions du lexique (consomment leurs mots) */
    PHRASES.forEach(function (p) {
      for (var i = 0; i + p.seq.length <= toks.length; i++) {
        var ok = true, j;
        for (j = 0; j < p.seq.length; j++) { if (used[i + j] || toks[i + j] !== p.seq[j]) { ok = false; break; } }
        if (!ok) continue;
        for (j = 0; j < p.seq.length; j++) used[i + j] = true;
        var v = {};
        addVariants(v, p.group, 1, W_LINK);
        items.push({ pos: i, phrase: true, stem: p.seq.join(" "), variants: v, idf: 0.9, partial: false });
      }
    });

    /* b) mots isolés */
    var lastIdx = -1;
    toks.forEach(function (t, i) { if (!used[i]) lastIdx = i; });
    toks.forEach(function (t, i) {
      if (used[i]) return;
      var partial = !!partialMode && i === lastIdx;
      var v = {}; v[t] = 1;
      var groups = (GROUP_BY_STEM[t] || []).slice();
      if (partial && t.length >= 4) {
        /* en tapant : « insc » appartient déjà à la famille « inscription » */
        Object.keys(GROUP_BY_STEM).forEach(function (s) {
          if (s.length > t.length && s.indexOf(t) === 0) {
            GROUP_BY_STEM[s].forEach(function (g) { if (groups.indexOf(g) === -1) groups.push(g); });
          }
        });
      }
      groups.forEach(function (g) { addVariants(v, g, W_GROUP, W_LINK); });

      /* Faute de frappe : le mot n'existe ni dans le contenu ni dans le lexique */
      var known = ix.vocab[t] || GROUP_BY_STEM[t];
      if (!known && partial && t.length >= 3) {
        known = ix.vocabList.some(function (s) { return s.indexOf(t) === 0; });
      }
      var fuzzy = false;
      /* Tolérance aux fautes de frappe, volontairement prudente : mot d'au moins 6
         lettres, même début (2 lettres) — « demain » ne devient pas « semaine ». */
      if (!known && t.length >= 6 && !/\d/.test(t)) {
        var max = t.length >= 9 ? 2 : 1;
        ix.vocabList.forEach(function (s) {
          if (s.length >= 5 && s.slice(0, 2) === t.slice(0, 2) && osa(t, s, max) <= max) {
            if ((v[s] || 0) < W_FUZZY) v[s] = W_FUZZY;
            (GROUP_BY_STEM[s] || []).forEach(function (g) { addVariants(v, g, 0.6, 0.3); });
            fuzzy = true;
          }
        });
      }
      items.push({ pos: i, phrase: false, stem: t, variants: v, idf: idfWeight(t, ix), partial: partial, fuzzy: fuzzy });
    });

    items.sort(function (a, b) { return a.pos - b.pos; });
    return { stems: toks, items: items };
  }

  /* ---------------------------------------------------------------------
     5. Score
     --------------------------------------------------------------------- */
  function fieldQuality(set, v, prefix) {
    if (set[v]) return 1;
    if (prefix && v.length >= 3) {
      for (var s in set) { if (s.length > v.length && s.indexOf(v) === 0) return 0.65; }
    }
    return 0;
  }

  function itemScore(doc, qi) {
    var best = 0;
    for (var v in qi.variants) {
      var w = qi.variants[v];
      var pfx = qi.partial && v === qi.stem;   // préfixe : uniquement pour le mot en cours de frappe
      var f1 = 0, f2 = 0, f = [
        fieldQuality(doc.q, v, pfx) * W_Q,
        fieldQuality(doc.key, v, pfx) * W_KEY,
        fieldQuality(doc.syn, v, pfx) * W_SYN,
        fieldQuality(doc.kw, v, pfx) * W_KW,
        fieldQuality(doc.c, v, pfx) * W_C,
        fieldQuality(doc.a, v, pfx) * W_A
      ];
      for (var i = 0; i < f.length; i++) {
        if (f[i] > f1) { f2 = f1; f1 = f[i]; } else if (f[i] > f2) f2 = f[i];
      }
      var s = (f1 + 0.25 * f2) * w;          // plusieurs champs concordants = preuve plus forte
      if (s > best) best = s;
    }
    return best * qi.idf;
  }

  var MIN_SCORE = 1.4;

  /**
   * search(query, options) → {
   *   query, normalized, hits:[{ item, score, coverage, exact }], top, confidence,
   *   terms:{ stems:{…}, prefixes:[…] }   // pour le surlignage
   * }
   * options.limit (déf. 8) · options.category (id) : restreint à une catégorie ·
   * options.partial : le dernier mot peut être incomplet (saisie en direct de la page) ·
   * options.lang : langue des textes interrogés (défaut « fr » ; sans pack chargé → français).
   */
  function search(query, options) {
    options = options || {};
    var ix = build(options.lang);
    var normalized = normalize(query);
    var res = { query: String(query == null ? "" : query), normalized: normalized, hits: [], top: null, confidence: "none", terms: { stems: {}, prefixes: [] } };
    if (!normalized) return res;

    var an = analyze(query, options.partial, ix);
    if (!an.items.length) return res;

    /* termes à surligner : mots de la requête + équivalents directs */
    an.items.forEach(function (qi) {
      Object.keys(qi.variants).forEach(function (s) { if (qi.variants[s] >= 0.69) res.terms.stems[s] = 1; });  // mot saisi, équivalents directs et correction de faute — pas les familles voisines
      if (qi.partial && qi.stem.length >= 3) res.terms.prefixes.push(qi.stem);
    });

    var seq = " " + an.stems.join(" ") + " ";
    var rawSeq = " " + normalized + " ";
    var qStemSet = setOf(an.stems);
    var minCov = an.items.length === 1 ? 1 : 0.5;
    var hits = [];

    ix.docs.forEach(function (doc) {
      if (options.category && options.category !== "all" && doc.item.category !== options.category) return;

      var exact = (doc.qNorm === normalized);
      if (!exact) { /* même ensemble de mots (ordre libre) que la question */
        var qs = Object.keys(doc.q);
        exact = qs.length >= 3 && qs.length === Object.keys(qStemSet).length && qs.every(function (s) { return qStemSet[s]; });
      }

      var total = 0, matched = 0, hit = [];
      an.items.forEach(function (qi, idx) {
        var s = itemScore(doc, qi);
        if (s > 0.001) { matched++; total += s; hit[idx] = true; }
      });

      /* Expression d'entrée reconnue telle quelle (« où se trouve », « formation en entreprise ») */
      var phrase = null, p;
      for (p = 0; p < doc.phrases.length && !phrase; p++) { if (seq.indexOf(doc.phrases[p].seq) !== -1) phrase = doc.phrases[p]; }
      for (p = 0; p < doc.rawPhrases.length && !phrase; p++) { if (rawSeq.indexOf(doc.rawPhrases[p].seq) !== -1) phrase = doc.rawPhrases[p]; }
      if (phrase) {
        an.items.forEach(function (qi, idx) {
          if (!hit[idx] && phrase.stems.indexOf(qi.stem) !== -1) { hit[idx] = true; matched++; }
        });
      }
      var coverage = matched / an.items.length;
      if (!exact && coverage < minCov) return;

      var score = total * (0.55 + 0.45 * coverage);
      if (phrase) score += 9;
      if (exact) score += 100;
      if (score < MIN_SCORE) return;
      hits.push({ item: doc.item, score: score, coverage: coverage, exact: exact, order: doc.order });
    });

    hits.sort(function (a, b) { return (b.score - a.score) || (a.order - b.order); });
    res.hits = hits.slice(0, options.limit || 8).map(function (h) { return { item: h.item, score: h.score, coverage: h.coverage, exact: h.exact }; });
    res.total = hits.length;
    res.top = res.hits[0] || null;
    res.confidence = confidence(res.hits);
    return res;
  }

  /* Fiabilité de la meilleure réponse — l'assistant s'y fie pour ne PAS inventer. */
  function confidence(hits) {
    var top = hits[0], second = hits[1];
    if (!top) return "none";
    if (top.exact) return "exact";
    var lead = !second || top.score >= second.score * 1.3;
    if (top.coverage >= 0.99 && ((top.score >= 7 && lead) || (top.score >= 4 && !second) || (top.score >= 4 && top.score >= second.score * 1.8))) return "high";
    if (top.coverage >= 0.6 && top.score >= 3.5) return "medium";
    return "low";
  }

  /** Question dont le libellé correspond (à la casse / ponctuation près) à `text`. */
  function exact(text) {
    var n = normalize(text);
    if (!n) return null;
    var found = null;
    Data.ITEMS.forEach(function (it) { if (!found && normalize(it.question) === n) found = it; });
    return found;
  }

  /* ---------------------------------------------------------------------
     6. Surlignage — segments prêts à rendre SANS innerHTML.
        highlight("Tarifs et prix", terms) → [{text:"Tarifs",mark:true}, …]
     --------------------------------------------------------------------- */
  var WORD_RE = /[\p{L}\p{M}\p{N}]+/gu;

  function highlight(text, terms) {
    text = String(text == null ? "" : text);
    var segs = [], last = 0, m;
    if (!terms || (!Object.keys(terms.stems || {}).length && !(terms.prefixes || []).length)) return [{ text: text, mark: false }];
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) {
      var w = m[0], s = stem(fold(w)), hit = false;
      if (!STOP[fold(w)] || terms.stems[s]) {
        if (terms.stems[s]) hit = true;
        else if (terms.prefixes) {
          for (var i = 0; i < terms.prefixes.length; i++) {
            if (s.length >= terms.prefixes[i].length && s.indexOf(terms.prefixes[i]) === 0) { hit = true; break; }
          }
        }
      }
      if (!hit) continue;
      if (m.index > last) segs.push({ text: text.slice(last, m.index), mark: false });
      segs.push({ text: w, mark: true });
      last = m.index + w.length;
    }
    if (last < text.length) segs.push({ text: text.slice(last), mark: false });
    return segs.length ? segs : [{ text: text, mark: false }];
  }

  return {
    normalize: normalize,
    search: search,
    exact: exact,
    highlight: highlight,
    LEXICON: LEXICON
  };
});
