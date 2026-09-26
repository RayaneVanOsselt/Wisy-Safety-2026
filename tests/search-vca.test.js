"use strict";
/* Recherche du site (js/search.js) — refonte VCA Base : groupes Articles et Sessions, accès rapides, état de chargement,
   groupes nommés pour les lecteurs d'écran, tarif issu du registre, traductions dans les 10 langues.
   Le composant vit dans le navigateur : ces tests vérifient son câblage et ses données (sans DOM).
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Site = require("../js/site-content.js");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const SRC = read("js/search.js");
const LANGS = ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"];
const I18N = (() => { const ctx = { window: {} }; ["common", "search", "formations"].forEach((n) => vm.runInNewContext(read("js/i18n-data-" + n + ".js"), ctx)); return ctx.window.I18N; })();

test("registre : les deux articles sont indexés comme « articles » (groupe à part), avec titres et descriptions traduits", () => {
  const arts = Site.pages().filter((p) => p.kind === "article");
  assert.deepEqual(arts.map((a) => a.url).sort(), ["article-vca-cout-financement.html", "article-vca-erreurs-examen.html"]);
  arts.forEach((a) => LANGS.forEach((l) => { assert.ok(I18N[l][a.titleKey], l + " " + a.titleKey); assert.ok(I18N[l][a.descKey], l + " " + a.descKey); }));
  assert.match(SRC, /\(p\.kind === "article" \? ARTICLES : PAGES\)\.push/, "les articles ne se mélangent pas aux pages");
  assert.match(SRC, /groupHTML\(t\("search\.group_articles"\)/);
});

test("groupes de résultats nommés (WAI-ARIA) : role=group + aria-labelledby → en-tête ; résultats annoncés ; ESC / flèches / Entrée conservés", () => {
  assert.match(SRC, /role="group" aria-labelledby="' \+ gid/);
  assert.match(SRC, /class="wsy-search__grouphd" id="' \+ gid/);
  assert.match(SRC, /role="combobox" aria-autocomplete="list"/); assert.match(SRC, /aria-controls="wsy-search-listbox"/);
  assert.match(SRC, /case "Escape"/); assert.match(SRC, /case "ArrowDown"/); assert.match(SRC, /case "ArrowUp"/); assert.match(SRC, /case "Enter"/);
  assert.match(SRC, /aria-activedescendant/); assert.match(SRC, /announce\(total \+ " " \+ t\("search\.results_word"\)\)/);
  assert.match(SRC, /e\.key === "\/"/, "raccourci « / » + ⌘K / Ctrl+K");
});

test("sessions : chargées À LA DEMANDE (jamais sur le chemin critique), lues dans WisySessions, lien = inscription à CETTE session", () => {
  assert.match(SRC, /function ensureSessions\(\)/);
  assert.match(SRC, /input\.addEventListener\("focus", function \(\) \{ ensureExtras\(\); ensureSessions\(\);/);
  assert.match(SRC, /W\.upcoming\(W\.peek\(\)\)/);
  assert.match(SRC, /full \? "agenda\.html" : W\.signupUrl\(s, s\.training\)/, "session complète → agenda ; sinon inscription formation + session");
  ["formation-vca-base.html", "agenda.html", "inscription.html", "index.html"].forEach((f) => assert.doesNotMatch(read(f), /<script[^>]+js\/sessions\.js[^>]*>[\s\S]*?js\/search\.js/, "sessions.js ne précède pas search.js sur le chemin critique de " + f));
  assert.doesNotMatch(SRC, /\b20[2-9]\d-\d{2}-\d{2}\b/, "aucune date dans le code de la recherche");
});

test("état de chargement : « Chargement… » plutôt que « Aucun résultat » tant que le Centre d'aide / les sessions arrivent", () => {
  assert.match(SRC, /extras === "loading" \|\| sessionsState === "loading"/);
  assert.match(SRC, /t\("search\.loading"\)/);
  LANGS.forEach((l) => assert.ok(I18N[l]["search.loading"], l));
});

test("accès rapides (état vide) : VCA Base, prix, dates, examen, adresse — des OPTIONS navigables au clavier ; ancres existantes", () => {
  const vca = read("formation-vca-base.html");
  ["pop_vca", "pop_price", "pop_dates", "pop_exam", "pop_address"].forEach((k) => {
    assert.ok(SRC.includes('"search.' + k + '"'), k);
    LANGS.forEach((l) => assert.ok(I18N[l]["search." + k], l + " " + k));
  });
  [["#apercu", "apercu"], ["#disponibilites", "disponibilites"], ["#examen", "examen"]].forEach(([a, id]) => { assert.ok(SRC.includes('"' + a + '"'), a); assert.match(vca, new RegExp('id="' + id + '"')); });
  assert.match(SRC, /itemHTML\(\{ icon: IC\[q\.icon\], title: esc\(t\(q\.labelKey\)\), href: q\.href \}\)/, "chaque accès rapide est une option (role=option)");
});

test("tarif : affiché dans les résultats depuis le registre, uniquement « par personne » confirmé — jamais une mention HT / TTC inventée", () => {
  const f = Site.formation("vca-base");
  assert.equal(f.priceLabel, "225 €"); assert.equal(f.priceUnit, "participant");
  assert.match(SRC, /f\.priceLabel && f\.priceUnit === "participant"/);
  assert.match(SRC, /priceLabel: f\.priceLabel, priceUnit: f\.priceUnit/);
  LANGS.forEach((l) => assert.ok(I18N[l]["search.per_person"], l + " search.per_person"));
  assert.ok(!Site.formation("nacelle").priceUnit, "aucune unité inventée pour les autres formations");
});

test("mots-clés de recherche : prix / examen / adresse dans plusieurs langues (dont bulgare et arabe) ; aucun mot de prix côté assistant", () => {
  const kw = Site.formation("vca-base").searchKeywords;
  ["prix", "tarif", "price", "prijs", "preis", "prezzo", "examen", "exam", "esame", "цена", "изпит", "سعر", "امتحان"].forEach((w) => assert.ok(kw.includes(w), "mot-clé de recherche : " + w));
  assert.ok(!Site.formation("vca-base").keywords.some((k) => /\b(prix|tarif)\b/.test(k)), "les mots de prix ne désignent pas la VCA Base pour l'assistant");
  assert.ok(!Site.formation("nacelle").searchKeywords.includes("prix"));
});

test("traductions : tous les libellés des nouveaux groupes existent dans les 10 langues (variable {n} conservée)", () => {
  ["search.group_articles", "search.group_sessions", "search.session_seats", "search.session_full", "search.sessions_all", "search.popular", "search.loading", "search.per_person"].forEach((k) =>
    LANGS.forEach((l) => assert.ok(I18N[l][k] && I18N[l][k].trim(), l + " " + k)));
  LANGS.forEach((l) => assert.ok(I18N[l]["search.session_seats"].includes("{n}"), l + " : {n}"));
  assert.match(SRC, /t\("search\.session_seats"\)\.replace\("\{n\}", s\.seatsLeft\)/);
});
