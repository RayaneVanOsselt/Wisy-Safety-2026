/* Menu mobile (audit du 02/10/2026, M15) : fermé, il sort de la tabulation ; ouvert, le reste de la page est inerte. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && read(f).includes('class="m-panel'));

test("chaque page avec un menu mobile charge menu-a11y.js après la recherche", () => {
  assert.ok(PAGES.length >= 23, "pages avec menu : " + PAGES.length);
  PAGES.forEach((f) => assert.match(read(f), /<script src="js\/search\.js"><\/script>\n<script src="js\/menu-a11y\.js"><\/script>/, f));
});

test("menu fermé : invisible pour le clavier et les lecteurs d'écran ; ouvert : le reste de la page est inerte", () => {
  assert.match(read("css/site-header.css"), /\.m-panel:not\(\.is-open\) \{ visibility: hidden;/);
  const js = read("js/menu-a11y.js");
  assert.match(js, /el\.inert = true/);
  assert.match(js, /attributeFilter: \["class"\]/, "indépendant du script qui ouvre le menu");
  assert.match(js, /toggle\.focus\(\)/, "le focus revient sur le bouton du menu");
});
