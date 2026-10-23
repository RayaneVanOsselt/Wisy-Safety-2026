"use strict";
/* Publication GitHub Pages : _config.yml exclut les dossiers de travail (docs, tests, outils, originaux) sans JAMAIS
   exclure un fichier chargé par le site. Le domaine (CNAME) reste publié. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const EXCLUDED = [...read("_config.yml").matchAll(/^\s*-\s*(\S+)\s*$/gm)].map((m) => m[1].replace(/\/$/, ""));

test("_config.yml : dossiers de travail exclus de la publication, domaine conservé", () => {
  ["docs", "tests", "scripts", "google-sheets", "supabase", "assets/originaux"].forEach((d) => assert.ok(EXCLUDED.includes(d), d + " exclu"));
  assert.ok(!EXCLUDED.includes("CNAME"), "CNAME publié (domaine wisysafety.be)");
  assert.equal(read("CNAME").trim(), "wisysafety.be");
});

test("aucun fichier exclu n'est chargé par une page publiée (src, href, url())", () => {
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const files = pages.concat(fs.readdirSync(path.join(ROOT, "css")).map((f) => "css/" + f));
  files.forEach((f) => {
    const refs = [...read(f).matchAll(/(?:\ssrc|\shref|srcset|url)\s*[=(]\s*["']?([^"')\s]+)/g)].map((m) => m[1].replace(/^\.\.\//, "").replace(/^\//, ""));
    refs.forEach((u) => EXCLUDED.forEach((d) => assert.ok(!(u === d || u.startsWith(d + "/")), f + " charge " + u + " (exclu par _config.yml)")));
  });
});
