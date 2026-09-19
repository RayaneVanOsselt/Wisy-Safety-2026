/* =========================================================================
   WISY SAFETY — Assistant · Récupération de contexte (retrieval)
   -------------------------------------------------------------------------
   Choix d'architecture (documenté pour la maintenance) :
   Le site est PETIT et statique (6 formations, ~5 pages, quelques faits).
   Un RAG avec embeddings + vector store serait surdimensionné, coûteux et
   nécessiterait un service externe permanent. On retient donc une
   RECHERCHE FULL-TEXT LOCALE pondérée (option B, hybridée avec un index
   structuré A). Elle est :
     • déterministe (donc testable) ;
     • instantanée, sans réseau ni clé API ;
     • suffisante pour retrouver la bonne formation / page.

   Ce module ne renvoie QUE des passages issus de la base de connaissances
   (js/assistant/knowledge.js). Il sert de « fournisseur de contexte » aussi
   bien au moteur de réponse local qu'à la route serveur optionnelle.

   Module « dual-mode » : navigateur (`window.WisyAssistant.Retrieval`) et
   Node (`module.exports`) pour les tests.
   ========================================================================= */
(function (root, factory) {
  "use strict";
  var Knowledge = (typeof module === "object" && module.exports)
    ? require("./knowledge.js")
    : (root.WisyAssistant && root.WisyAssistant.Knowledge);
  var api = factory(Knowledge);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Retrieval = api;
})(typeof self !== "undefined" ? self : this, function (Knowledge) {
  "use strict";

  /* Mots vides (FR + quelques EN/NL fréquents) — ignorés au scoring. */
  var STOP = {};
  ("le la les un une des du de d au aux et ou où a à en dans sur pour par avec sans " +
   "je tu il elle on nous vous ils elles me te se ce cet cette ces mon ma mes ton ta tes son sa ses " +
   "que qui quoi dont est sont suis es ai as avez avons ont c'est quel quelle quels quelles " +
   "the a an of to in on for and or is are do you i my your it this that with " +
   "de het een van en of is voor met").split(" ").forEach(function (w) { if (w) STOP[w] = 1; });

  /* Retire les accents et met en minuscules (recherche insensible). */
  function normalize(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Découpe en tokens signifiants (≥ 3 caractères, hors mots vides).
     Les jetons de 2 lettres sont du bruit : l'apostrophe typographique de
     « qu’il » produit un « qu » parasite qui, avec un mot courant, suffisait à
     faire passer une AUTRE formation devant celle du contexte de page. */
  function tokenize(s) {
    var raw = normalize(s).split(" ");
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (!w || w.length < 3) continue;
      if (STOP[w]) continue;
      out.push(w);
    }
    return out;
  }

  /* Un token matche-t-il un mot de l'index ? Égalité ou PRÉFIXE de mot
     (« formation » ~ « formations »), jamais une sous-chaîne au milieu d'un
     mot : « dure » ne doit pas matcher « sou-dure » (ce repli faisait répondre
     « Fibre optique » à « Combien de temps dure la formation ? »). */
  function tokenMatches(token, hay) {
    if (hay.indexOf(token) === -1) return false;
    var re = new RegExp("(^|[^a-z0-9])" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return re.test(hay);
  }

  /* Score une entrée face aux tokens de la requête. */
  function scoreEntry(entry, tokens) {
    var title = normalize(entry.title || "");
    var keywords = normalize((entry.keywords || []).join(" "));
    var body = normalize(entry._text || Knowledge.searchableText(entry));
    var score = 0;
    var hits = 0;
    var strong = 0;   // correspondances discriminantes : titre ou mot-clé (pas le corps de texte)

    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      var matched = false;
      if (title.indexOf(tk) !== -1 && tokenMatches(tk, title)) { score += 6; matched = true; strong++; }
      if (tokenMatches(tk, keywords)) { score += 4; matched = true; strong++; }
      if (!matched && tokenMatches(tk, body)) { score += 2; matched = true; }
      if (matched) hits++;
    }

    // Bonus si la requête couvre plusieurs tokens de l'entrée (pertinence).
    if (hits > 1) score += hits;
    // Léger avantage aux formations (cœur de métier de l'assistant).
    if (entry.type === "formation" && score > 0) score += 1;

    return { score: score, hits: hits, strong: strong };
  }

  /* Détecte une catégorie explicitement nommée dans la requête. */
  function detectCategory(tokens) {
    var joined = " " + tokens.join(" ") + " ";
    var map = {
      securite: ["securite", "surete", "chantier", "safety"],
      secours: ["secours", "secourisme", "premiers", "sauvetage", "medical"],
      technique: ["technique", "machine", "installation"],
      management: ["management", "encadrement", "responsable", "responsables", "manager", "chef"]
    };
    for (var cat in map) {
      if (!Object.prototype.hasOwnProperty.call(map, cat)) continue;
      for (var i = 0; i < map[cat].length; i++) {
        if (joined.indexOf(" " + map[cat][i]) !== -1) return cat;
      }
    }
    return null;
  }

  /* --------------------------------------------------------------------- */
  /* API principale                                                         */
  /* --------------------------------------------------------------------- */

  /**
   * search(query, options) → [{ entry, score, hits }]
   * options.limit  (def. 5)
   * options.types  (ex: ["formation"]) — filtre par type
   * options.minScore (def. 1)
   */
  function search(query, options) {
    options = options || {};
    var limit = options.limit || 5;
    var minScore = options.minScore != null ? options.minScore : 1;
    var tokens = tokenize(query);
    if (!tokens.length) return [];

    var entries = Knowledge.all();
    var results = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (options.types && options.types.indexOf(e.type) === -1) continue;
      var sc = scoreEntry(e, tokens);
      if (sc.score >= minScore) results.push({ entry: e, score: sc.score, hits: sc.hits, strong: sc.strong });
    }

    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      // Départage stable : formations d'abord, puis ordre d'index.
      if (a.entry.type !== b.entry.type) return a.entry.type === "formation" ? -1 : 1;
      return 0;
    });

    return results.slice(0, limit);
  }

  /** Meilleure formation correspondant à la requête (ou null).
   *  minScore élevé par défaut : on exige une correspondance DISCRIMINANTE
   *  (titre ou mot-clé), sinon un mot générique comme « formation » suffirait
   *  à renvoyer une formation au hasard — et écraserait le contexte de page. */
  function bestFormation(query, minScore) {
    var r = search(query, { types: ["formation"], limit: 10, minScore: minScore == null ? 5 : minScore });
    // Une seule correspondance dans le CORPS de texte (« jours », « formation »…) ne désigne pas une formation :
    // il faut au moins un mot du titre ou des mots-clés.
    for (var i = 0; i < r.length; i++) if (r[i].strong > 0) return r[i].entry;
    return null;
  }

  /** Contexte compact destiné au prompt serveur (jamais tout le site). */
  function contextFor(query, limit) {
    return search(query, { limit: limit || 4 }).map(function (r) {
      return {
        id: r.entry.id,
        title: r.entry.title,
        url: r.entry.url,
        type: r.entry.type,
        content: r.entry.answer || r.entry.description || r.entry.content || "",
        score: r.score
      };
    });
  }

  return {
    normalize: normalize,
    tokenize: tokenize,
    search: search,
    bestFormation: bestFormation,
    detectCategory: detectCategory,
    contextFor: contextFor
  };
});
