"use strict";
/* Rangement de assets/ (voir assets/README.md) : noms propres, dossiers connus, aucun doublon, aucun
   fichier orphelin. Ces tests échouent avec le NOM du fichier fautif : ils servent de garde-fou pour que
   le dossier reste rangé quand de nouvelles images arrivent. `node --test tests/*.test.js`. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const IGNORED = new Set([".DS_Store"]);                       // fichier système de macOS (jamais versionné)

/* Tous les fichiers de assets/, en chemins relatifs à la racine du site (séparateur « / »). */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (IGNORED.has(name)) continue;
    const abs = path.join(dir, name), rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (fs.statSync(abs).isDirectory()) walk(abs, out); else out.push(rel);
  }
  return out;
}
const FILES = walk(ASSETS);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("noms propres : minuscules, chiffres, tirets — sans espace, sans accent, sans majuscule", () => {
  const bad = [];
  FILES.filter((f) => f !== "assets/README.md").forEach((f) => {
    f.split("/").slice(1).forEach((seg) => { if (!/^[a-z0-9][a-z0-9._-]*$/.test(seg)) bad.push(f + "   (« " + seg + " » : renommer en minuscules sans accents ni espaces)"); });
  });
  assert.deepEqual([...new Set(bad)], []);
});

test("dossiers connus : chaque image est rangée dans un dossier prévu (voir assets/README.md)", () => {
  const TOP = ["fonts", "icons", "images", "videos", "originaux"];
  const IMAGES = ["assistant", "contact", "faq", "formations", "logo", "nacelles", "partage", "partenaires"];
  const bad = [];
  FILES.forEach((f) => {
    const [, a, b] = f.split("/");
    if (f === "assets/README.md") return;
    if (!TOP.includes(a)) bad.push(f + "   (dossier « " + a + " » inconnu : " + TOP.join(", ") + ")");
    else if (a === "images" && !IMAGES.includes(b)) bad.push(f + "   (assets/images/" + b + " inconnu : " + IMAGES.join(", ") + ")");
    else if (a === "videos" && b !== "accueil") bad.push(f + "   (vidéos : seulement assets/videos/accueil/)");
  });
  assert.deepEqual(bad, []);
});

test("aucun doublon : deux fichiers identiques dans assets/ se règlent en n'en gardant qu'un", () => {
  const seen = new Map(), dup = [];
  FILES.forEach((f) => {
    const h = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");
    if (seen.has(h)) dup.push(f + "  =  " + seen.get(h)); else seen.set(h, f);
  });
  assert.deepEqual(dup, []);
});

test("aucun fichier orphelin : tout fichier hors « originaux » est utilisé par une page, un style ou un script", () => {
  /* Le code qui peut nommer un fichier : pages, styles, scripts du site et outils de génération. */
  const code = [];
  const collect = (dir, exts) => fs.readdirSync(path.join(ROOT, dir)).filter((n) => exts.some((e) => n.endsWith(e))).forEach((n) => code.push(read(dir + "/" + n)));
  collect(".", [".html"]); collect("css", [".css"]); collect("js", [".js"]); collect("js/assistant", [".js"]);
  collect("scripts", [".js", ".py"]); collect("admin", [".html"]); collect("supabase/functions/chat", [".ts"]);
  const corpus = code.join("\n");
  /* Réserve volontaire : conservés pour un usage hors site (profil de réseau social, fiche Google). */
  const RESERVE = new Set(["assets/images/logo/logo-carre-500.png", "assets/README.md"]);
  const orphan = FILES.filter((f) => !f.startsWith("assets/originaux/") && !RESERVE.has(f))
    .filter((f) => !corpus.includes(path.basename(f)));
  assert.deepEqual(orphan, [], "fichiers que rien n'utilise : à supprimer, ou à déplacer dans assets/originaux/");
});

test("originaux : chacun est cité par l'outil de génération ou par le guide de la formation Nacelles", () => {
  const cited = read("scripts/optimize-images.py") + "\n" + read("docs/README-NACELLES.md");
  const bad = FILES.filter((f) => f.startsWith("assets/originaux/") && !cited.includes(path.basename(f)));
  assert.deepEqual(bad, [], "original que ni scripts/optimize-images.py ni docs/README-NACELLES.md ne mentionne");
});

test("l'outil de génération lit et écrit aux BONS endroits (tous les chemins qu'il cite existent)", () => {
  const src = read("scripts/optimize-images.py");
  const fixed = [...src.matchAll(/["'](assets\/[a-z0-9\/._-]+\.[a-z0-9]+)["']/g)].map((m) => m[1]);
  assert.ok(fixed.length >= 8, "chemins fixes détectés : " + fixed.length);
  const missing = [...new Set(fixed)].filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(missing, []);
});
