"use strict";
/* Redirections des anciennes adresses du site WordPress (même domaine jusqu'au 22/10/2026) — docs/redirects.md.
   GitHub Pages n'envoie pas de 301 : chaque ancienne adresse sans conflit a une page dossier/index.html avec un renvoi
   immédiat (meta refresh 0 s + canonical + location.replace) ; la page 404 contient la même table, plus les anciennes
   adresses qui portent le nom d'une page actuelle (/formations/, /agenda/, /mentions-legales/). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const STUBS = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, "index.html")) && !/^(docs|tests|content|wordpress|chatbot|assets)$/.test(d));
const MAP = JSON.parse(read("404.html").match(/<script>\(function\(\)\{var m=(\{[^}]*\});/)[1]);

test("chaque page de redirection : même cible partout (canonical absolu, meta refresh 0 s, location.replace), cible existante", () => {
  assert.ok(STUBS.length >= 11, "pages de redirection : " + STUBS.join(", "));
  STUBS.forEach((d) => {
    const html = read(d + "/index.html");
    const canon = (html.match(/<link rel="canonical" href="https:\/\/wisysafety\.be\/([a-z0-9-]+\.html)">/) || [])[1];
    assert.ok(canon, d + " : canonical absolu sur le domaine officiel");
    assert.ok(fs.existsSync(path.join(ROOT, canon)), d + " → " + canon + " existe");
    assert.match(html, new RegExp('<meta http-equiv="refresh" content="0; url=/' + canon.replace(/\./g, "\\.") + '">'), d + " : renvoi immédiat");
    assert.match(html, new RegExp('location\\.replace\\("/' + canon.replace(/\./g, "\\.") + '"'), d + " : même cible en JavaScript");
    assert.doesNotMatch(html, /noindex/, d + " : pas de noindex (la redirection doit transmettre le référencement)");
    assert.ok(!fs.existsSync(path.join(ROOT, d + ".html")), d + " : aucun conflit avec une page /" + d + ".html");
    assert.equal(MAP["/" + d], "/" + canon, d + " : même cible dans la table de la page 404");
  });
});

test("page 404 : table de secours complète, cibles existantes, anciennes adresses en conflit traitées sans dossier", () => {
  Object.keys(MAP).forEach((k) => {
    assert.match(k, /^\/[a-z0-9-]+$/, "clé normalisée (minuscules, sans barre finale) : " + k);
    assert.ok(fs.existsSync(path.join(ROOT, MAP[k].slice(1))), k + " → " + MAP[k]);
  });
  ["/formations", "/agenda", "/mentions-legales"].forEach((k) => {
    assert.ok(MAP[k], k + " présent dans la 404");
    assert.ok(!fs.existsSync(path.join(ROOT, k.slice(1), "index.html")), k + " : pas de dossier (il masquerait " + k + ".html)");
  });
  assert.doesNotMatch(read("404.html"), /certificat\//, "les anciennes fiches personnelles /certificat/… ne sont JAMAIS redirigées");
});

test("docs/redirects.md documente chaque ancienne adresse", () => {
  const doc = read("docs/redirects.md");
  Object.keys(MAP).forEach((k) => assert.ok(doc.includes("`" + k + "/`"), "docs/redirects.md : " + k + "/"));
});
