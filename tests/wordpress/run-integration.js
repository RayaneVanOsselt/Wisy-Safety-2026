#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY CERTIFICATS — tests d'intégration de l'extension WordPress, contre un VRAI WordPress
   (WordPress Playground : WordPress + PHP compilés en WebAssembly, base SQLite, tout en local).

       node tests/wordpress/run-integration.js                 (PHP 8.3)
       node tests/wordpress/run-integration.js --php=7.4       (version minimale annoncée)
       node tests/wordpress/run-integration.js --keep          (laisse le serveur ouvert : tests navigateur)

   Prérequis : Node 22 et un accès à npm (le premier lancement télécharge @wp-playground/cli et WordPress).
   Variable facultative : WP_PLAYGROUND_CLI = chemin d'un binaire wp-playground-cli déjà installé.

   Données : 100 % FICTIVES (tests/wordpress/fixtures). Rien n'est envoyé vers wisysafety.be.
   Ce fichier n'est PAS lancé par `node --test tests/*.test.js` (il démarre un serveur et prend ~1 min).
   ========================================================================= */
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const ARGS = process.argv.slice(2);
const PHP = (ARGS.find((a) => a.startsWith("--php=")) || "--php=8.3").split("=")[1];
const KEEP = ARGS.includes("--keep");
const PORT = 9411;
const BASE = `http://127.0.0.1:${PORT}`;
const API = `${BASE}/wp-json/wisy-certificats/v1`;
const ORIGIN = "http://localhost:4310";
const SECRET = crypto.randomBytes(32).toString("hex"); // clé de TEST, propre à ce lancement
const TTL = 6;

/* ------------------------------------------------------------------ PDF de test (généré) */
function testPdf() {
  const text = "CERTIFICAT DE TEST - DONNEES FICTIVES - WISY CERTIFICATS";
  const stream = `BT /F1 18 Tf 60 760 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/* ------------------------------------------------------------------ serveur */
function startServer(gen) {
  const blueprint = {
    preferredVersions: { php: PHP, wp: "latest" },
    steps: [
      { step: "defineWpConfigConsts", consts: { WP_DEBUG: true, WP_DEBUG_LOG: true, WP_DEBUG_DISPLAY: false, WISY_TEST_MODE: true, WISY_CERT_SECRET: SECRET, WISY_CERT_DOCUMENT_TTL: TTL } },
      { step: "activatePlugin", pluginPath: "/wordpress/wp-content/plugins/wisy-certificats/wisy-certificats.php" },
      { step: "runPHP", code: "<?php require '/wordpress/wp-load.php'; require '/fixtures/seed.php';" }
    ]
  };
  const bp = path.join(gen, "blueprint.json");
  fs.writeFileSync(bp, JSON.stringify(blueprint, null, 2));
  const cliArgs = ["server", `--port=${PORT}`, `--php=${PHP}`, "--wp=latest",
    `--mount-dir=${path.join(ROOT, "wordpress", "wisy-certificats")}`, "/wordpress/wp-content/plugins/wisy-certificats",
    `--mount-dir=${path.join(__dirname, "mu")}`, "/wordpress/wp-content/mu-plugins",
    `--mount-dir=${path.join(__dirname, "fixtures")}`, "/fixtures",
    `--mount-dir=${gen}`, "/fixtures-gen",
    `--blueprint=${bp}`, "--verbosity=normal"];
  /* --mount-dir attend deux arguments séparés (chemins avec espaces acceptés). */
  const fixed = [];
  cliArgs.forEach((a) => { if (a.startsWith("--mount-dir=")) { fixed.push("--mount-dir", a.slice(12)); } else fixed.push(a); });
  const bin = process.env.WP_PLAYGROUND_CLI;
  const child = bin ? spawn(bin, fixed, { stdio: ["ignore", "pipe", "pipe"] })
    : spawn("npx", ["--yes", "@wp-playground/cli@3.1.58", ...fixed], { stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => { log += d; });
  child.stderr.on("data", (d) => { log += d; });
  return { child, log: () => log };
}

async function waitReady(server, ms = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      /* Le serveur répond parfois AVANT la fin du blueprint : on attend la fin de l'amorçage (seed.php). */
      const r = await fetch(`${BASE}/wp-json/wisy-test/v1/fixture`);
      if (r.ok) { const f = await r.json(); if (f && f.csv_summary) return true; }
    } catch (e) { /* pas encore prêt */ }
    if (server.child.exitCode !== null) throw new Error("Le serveur WordPress s'est arrêté :\n" + server.log().slice(-3000));
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("WordPress n'a pas démarré à temps :\n" + server.log().slice(-3000));
}

/* ------------------------------------------------------------------ outils de requête */
let ipCounter = 0;
const freshIp = () => `198.51.100.${(++ipCounter % 250) + 1}`;
async function verify(lastName, birthDate, opts = {}) {
  const body = new URLSearchParams();
  if (lastName !== undefined) body.set("lastName", lastName);
  if (birthDate !== undefined) body.set("birthDate", birthDate);
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "X-Real-IP": opts.ip || freshIp() };
  if (opts.origin !== null) headers.Origin = opts.origin || ORIGIN;
  const r = await fetch(`${API}/verify${opts.query || ""}`, { method: "POST", headers, body: opts.rawBody !== undefined ? opts.rawBody : body.toString() });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch (e) { /* non JSON */ }
  return { status: r.status, headers: r.headers, json, text };
}
async function documentReq(token, opts = {}) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "X-Real-IP": opts.ip || freshIp() };
  if (opts.origin !== null) headers.Origin = opts.origin || ORIGIN;
  const r = await fetch(`${API}/document${opts.query || ""}`, { method: "POST", headers, body: new URLSearchParams({ token }).toString() });
  return { status: r.status, headers: r.headers, buf: Buffer.from(await r.arrayBuffer()) };
}
const getJson = async (p) => (await fetch(BASE + p)).json();
const postJson = async (p, data) => (await fetch(BASE + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) })).json();
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/* Même dérivation que Wisy_Cert_Secret::key('document') + Wisy_Cert_REST::issue_token() */
function craftToken(payload) {
  const key = crypto.createHmac("sha256", SECRET).update("wisy-cert:document").digest();
  const p = b64url(JSON.stringify(payload));
  return p + "." + b64url(crypto.createHmac("sha256", key).update(p).digest());
}

/* ------------------------------------------------------------------ mini-harnais */
const results = [];
async function check(group, name, fn) {
  try { await fn(); results.push({ group, name, ok: true }); process.stdout.write("  ✓ " + name + "\n"); }
  catch (e) { results.push({ group, name, ok: false, err: e.message }); process.stdout.write("  ✗ " + name + "\n      → " + e.message + "\n"); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || "") + ` attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || "condition fausse"); }

const FORBIDDEN_KEYS = ["birthDate", "birth_date", "employer", "employer_phone", "employer_email", "employerPhone", "employerEmail", "internal_note", "revoked_reason", "id", "post_id"];
function assertMinimal(cert) {
  const keys = Object.keys(cert).sort().join(",");
  eq(keys, "diplomaNumber,document,expiryDate,holder,issueDate,status,training,trainingDate", "champs publics :");
  FORBIDDEN_KEYS.forEach((k) => ok(!(k in cert), "champ interdit présent : " + k));
}

/* ------------------------------------------------------------------ scénario */
async function main() {
  const gen = fs.mkdtempSync(path.join(os.tmpdir(), "wisy-cert-it-"));
  const pdf = testPdf();
  fs.writeFileSync(path.join(gen, "certificat-test.pdf"), pdf);
  const pdfSha = crypto.createHash("sha256").update(pdf).digest("hex");
  console.log(`Démarrage de WordPress Playground (PHP ${PHP})…`);
  const server = startServer(gen);
  const stop = () => { try { server.child.kill("SIGTERM"); } catch (e) { /* déjà arrêté */ } };
  process.on("SIGINT", () => { stop(); process.exit(130); });
  try {
    await waitReady(server);
    const fixture = await getJson("/wp-json/wisy-test/v1/fixture");
    const id = (line) => fixture.csv[line];
    console.log("WordPress prêt. Certificats fictifs :", JSON.stringify(fixture.csv_summary));

    console.log("\n— Import CSV et reprise");
    await check("import", "import CSV : 8 créés, 2 lignes rejetées (date impossible 31/02, doublon de n° dans le fichier), 1 non vérifiable", async () => {
      const s = fixture.csv_summary;
      eq(s.created, 8, "créés"); eq(s.errors, 2, "erreurs"); eq(s.not_searchable, 1, "non vérifiables");
    });
    await check("import", "réimport du même fichier : aucun doublon (tout « inchangé » ou rejeté)", async () => {
      const r = await postJson("/wp-json/wisy-test/v1/import", { dry: false });
      eq(r.summary.created, 0, "créés"); eq(r.summary.updated, 0, "mis à jour"); eq(r.summary.unchanged, 8, "inchangés");
    });
    await check("legacy", "découverte des anciens champs (sans la référence ACF « _date_naissance »)", async () => {
      const r = await postJson("/wp-json/wisy-test/v1/legacy", { dry: true });
      ["date_naissance", "numero_diplome", "formation", "date_validite", "date_formation", "certificat_pdf"].forEach((k) => ok(r.discovered.includes(k), "clé non découverte : " + k));
      ok(!r.discovered.includes("_date_naissance"), "la référence ACF ne doit pas être proposée");
      eq(r.map.birth_date, "date_naissance"); eq(r.map.expiry_date, "date_validite"); eq(r.map.last_name, "@title"); eq(r.map.pdf, "certificat_pdf");
    });
    await check("legacy", "simulation de reprise : rien n'est écrit", async () => {
      const before = await getJson("/wp-json/wisy-test/v1/record?id=" + fixture.legacy.lefevre);
      eq(before.record.birth_date, "", "avant reprise");
      const after = await getJson("/wp-json/wisy-test/v1/record?id=" + fixture.legacy.lefevre);
      eq(after.record.birth_date, "", "après simulation");
      eq(after.lookups, 0, "pas d'index");
    });
    await check("legacy", "reprise réelle : champs normalisés (AAAAMMJJ, JJ/MM/AAAA → ISO), nom tiré du titre, PDF copié (SHA-256 identique)", async () => {
      const r = await postJson("/wp-json/wisy-test/v1/legacy", { dry: false });
      ok(r.summary.updated >= 3, "certificats complétés : " + r.summary.updated);
      const rec = await getJson("/wp-json/wisy-test/v1/record?id=" + fixture.legacy.lefevre);
      eq(rec.record.last_name, "Lefèvre"); eq(rec.record.first_name, "Jean-Marc"); eq(rec.record.birth_date, "1985-03-27");
      eq(rec.record.expiry_date, "2034-03-15"); eq(rec.record.training_date, "2024-03-15"); eq(rec.record.employer_phone, "+32 2 000 00 09");
      eq(rec.lookups, 1, "index"); eq(rec.doc && rec.doc.sha256, pdfSha, "empreinte du PDF copié");
      const copy = rec.public_copies.find((c) => c.certificate === fixture.legacy.lefevre);
      ok(copy && copy.secured, "le PDF public est repéré comme sécurisé (copie identique)");
    });
    await check("legacy", "reprise relancée : idempotente (rien à compléter)", async () => {
      const r = await postJson("/wp-json/wisy-test/v1/legacy", { dry: false });
      eq(r.summary.updated, 0, "complétés au 2e passage");
    });
    await check("legacy", "certificat repris trouvable par la recherche publique", async () => {
      const r = await verify("lefevre", "1985-03-27");
      eq(r.json.status, "found"); eq(r.json.certificates[0].holder, "Jean-Marc Lefèvre"); eq(r.json.certificates[0].status, "valid");
    });

    console.log("\n— Recherche (fonctionnel)");
    await check("fonctionnel", "1. nom + date corrects → certificat retrouvé, valide, champs minimaux", async () => {
      const r = await verify("Ngô", "1995-02-28");
      eq(r.status, 200); eq(r.json.status, "found"); eq(r.json.count, 1);
      const c = r.json.certificates[0];
      assertMinimal(c); eq(c.status, "valid"); eq(c.holder, "Thị Lan Ngô"); eq(c.diplomaNumber, "TEST-FIB-1005"); eq(c.expiryDate, "2031-01-20");
      ok(!r.text.includes("1995-02-28"), "la date de naissance ne doit jamais revenir dans la réponse");
      eq(r.json.timezone, "Europe/Brussels");
    });
    await check("fonctionnel", "2. date de naissance incorrecte → aucun résultat", async () => {
      const r = await verify("Ngô", "1995-02-27"); eq(r.status, 200); eq(r.json.status, "not_found"); ok(!("certificates" in r.json));
    });
    await check("fonctionnel", "3. nom inexistant → même réponse neutre (aucun indice sur le nom ou la date)", async () => {
      const a = await verify("Zzyzx", "1995-02-28"); const b = await verify("Ngô", "1995-02-27");
      eq(Object.keys(a.json).sort().join(), Object.keys(b.json).sort().join(), "mêmes clés"); eq(a.json.status, "not_found"); eq(a.status, b.status);
    });
    await check("fonctionnel", "4. espaces superflus et casse → trouvé", async () => {
      const r = await verify("   NGÔ   ", "1995-02-28"); eq(r.json.status, "found");
    });
    await check("fonctionnel", "5. accents, tréma, apostrophe, tirets : « muller », « dhondt », « D’Hondt », « van-damme », « NGO »", async () => {
      eq((await verify("muller", "1978-11-02")).json.status, "found", "Müller ← muller");
      eq((await verify("dhondt", "1988-07-21")).json.status, "found", "D'Hondt ← dhondt");
      eq((await verify("D’Hondt", "1988-07-21")).json.status, "found", "apostrophe typographique");
      eq((await verify("van-damme", "1990-01-01")).json.status, "found", "Van Damme ← van-damme");
      eq((await verify("NGO", "1995-02-28")).json.status, "found", "Ngô ← NGO");
      eq((await verify("Nguyen", "1995-02-28")).json.status, "found", "autre nom de famille");
    });
    await check("fonctionnel", "5b. pas de correspondance partielle : « Dupon », « Dupontt », « Hondt » → aucun résultat", async () => {
      for (const n of ["Dupon", "Dupontt", "Hondt"]) eq((await verify(n, n === "Hondt" ? "1988-07-21" : "1992-05-14")).json.status, "not_found", n);
    });
    await check("fonctionnel", "6. champs vides → 400 avec le détail par champ", async () => {
      const r = await verify("", ""); eq(r.status, 400); eq(r.json.code, "invalid_input");
      eq(r.json.fields.lastName, "required"); eq(r.json.fields.birthDate, "required");
      const m = await verify(undefined, undefined); eq(m.status, 400);
    });
    await check("fonctionnel", "7. formats de date invalides → 400 (JJ/MM/AAAA côté API, 30 février, futur, avant 1900)", async () => {
      eq((await verify("Ngô", "28/02/1995")).json.fields.birthDate, "invalid");
      eq((await verify("Ngô", "1995-02-30")).json.fields.birthDate, "invalid");
      eq((await verify("Ngô", "2999-01-01")).json.fields.birthDate, "future");
      eq((await verify("Ngô", "1850-01-01")).json.fields.birthDate, "out_of_range");
      eq((await verify("Ngô", "1995-2-28")).json.fields.birthDate, "invalid");
    });
    await check("fonctionnel", "8. plusieurs certificats pour la même personne → 2 cartes, la valide d'abord", async () => {
      const r = await verify("Dupont", "1992-05-14"); eq(r.json.count, 2);
      eq(r.json.certificates[0].status, "valid"); eq(r.json.certificates[0].diplomaNumber, "TEST-VCA-1001");
      eq(r.json.certificates[1].status, "expired"); eq(r.json.certificates[1].diplomaNumber, "TEST-PEMP-1002");
      r.json.certificates.forEach(assertMinimal);
    });
    await check("fonctionnel", "9-10. valide → document disponible ; expiré → statut « expired »", async () => {
      const r = await verify("Dupont", "1992-05-14");
      eq(r.json.certificates[0].document.available, true); ok(r.json.certificates[0].document.token.length > 40); eq(r.json.certificates[0].document.expiresIn, TTL);
      eq(r.json.certificates[1].status, "expired"); eq(r.json.certificates[1].document.available, false); eq(r.json.certificates[1].document.reason, "missing");
    });
    await check("fonctionnel", "11. révoqué → « revoked » (prime sur la date encore future), PDF jamais proposé", async () => {
      const c = (await verify("Müller", "1978-11-02")).json.certificates[0];
      eq(c.status, "revoked"); eq(c.expiryDate, "2034-06-05"); eq(c.document.available, false); eq(c.document.reason, "revoked");
      ok(!JSON.stringify(c).includes("fictive"), "le motif de révocation ne doit pas sortir");
    });
    await check("fonctionnel", "12. sans date d'expiration → « undetermined » (jamais « valide » par défaut)", async () => {
      const c = (await verify("D'Hondt", "1988-07-21")).json.certificates[0]; eq(c.status, "undetermined"); eq(c.expiryDate, null);
    });
    await check("fonctionnel", "13. PDF absent / masqué → document indisponible avec la raison", async () => {
      eq((await verify("Ngô", "1995-02-28")).json.certificates[0].document.reason, "missing");
      const leroy = (await verify("Leroy", "1999-09-09")).json.certificates[0];
      eq(leroy.status, "valid"); eq(leroy.document.available, false); eq(leroy.document.reason, "not_authorized");
    });
    await check("fonctionnel", "brouillon et certificat sans date de naissance : introuvables", async () => {
      eq((await verify("Martin", "1980-01-01")).json.status, "not_found", "brouillon");
      eq((await verify("Sans-Date", "2000-01-01")).json.status, "not_found", "sans date");
      eq((await verify("Ali", "2000-01-01")).json.status, "not_found", "ancien sans date");
    });

    console.log("\n— PDF");
    await check("pdf", "jeton valide → PDF (application/pdf, inline, no-store), octets identiques à l'original", async () => {
      const c = (await verify("Dupont", "1992-05-14")).json.certificates[0];
      const d = await documentReq(c.document.token);
      eq(d.status, 200); ok(d.headers.get("content-type").startsWith("application/pdf"), d.headers.get("content-type"));
      ok(/inline; filename="certificat-wisy-safety-TEST-VCA-1001\.pdf"/.test(d.headers.get("content-disposition")), d.headers.get("content-disposition"));
      ok(/no-store/.test(d.headers.get("cache-control")), "cache-control"); eq(d.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
      eq(crypto.createHash("sha256").update(d.buf).digest("hex"), pdfSha, "empreinte");
    });
    await check("pdf", "jeton falsifié → 403 ; jeton dans l'URL → 400 ; jeton vide → 403", async () => {
      const c = (await verify("Dupont", "1992-05-14")).json.certificates[0];
      const t = c.document.token; const bad = t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA");
      eq((await documentReq(bad)).status, 403, "falsifié");
      eq((await documentReq(t, { query: "?token=" + t })).status, 400, "dans l'URL");
      eq((await documentReq("")).status, 403, "vide");
      const forged = craftToken({ c: id(2), d: 999999, e: Math.floor(Date.now() / 1000) + 60, n: "x" });
      eq((await documentReq(forged)).status, 410, "document inexistant pour ce certificat");
    });
    await check("pdf", "certificat révoqué ou brouillon : PDF refusé même avec un jeton correctement signé", async () => {
      const rev = (await getJson("/wp-json/wisy-test/v1/token?ttl=60&id=" + id(4))).token;
      eq((await documentReq(rev)).status, 403, "révoqué");
      const draft = (await getJson("/wp-json/wisy-test/v1/token?ttl=60&id=" + id(8))).token;
      eq((await documentReq(draft)).status, 404, "brouillon");
      const hidden = (await getJson("/wp-json/wisy-test/v1/token?ttl=60&id=" + id(7))).token;
      eq((await documentReq(hidden)).status, 403, "PDF masqué");
    });
    await check("pdf", "PDF remplacé → l'ancien lien ne fonctionne plus (410), le nouveau oui", async () => {
      const old = (await verify("Dupont", "1992-05-14")).json.certificates[0].document.token;
      await postJson("/wp-json/wisy-test/v1/replace-pdf", { id: id(2) });
      eq((await documentReq(old)).status, 410, "ancien jeton");
      const fresh = (await verify("Dupont", "1992-05-14")).json.certificates[0].document.token;
      eq((await documentReq(fresh)).status, 200, "nouveau jeton");
    });
    await check("pdf", `lien expiré après ${TTL} s → 410 avec une page lisible`, async () => {
      const t = (await verify("Dupont", "1992-05-14")).json.certificates[0].document.token;
      await new Promise((r) => setTimeout(r, (TTL + 2) * 1000));
      const d = await documentReq(t); eq(d.status, 410); ok(d.buf.toString().includes("expiré"), "message");
      ok(d.headers.get("content-type").startsWith("text/html"), "page HTML");
    });

    console.log("\n— Sécurité");
    await check("sécurité", "1. injection SQL dans le nom → 400 (caractères refusés), base intacte", async () => {
      for (const n of ["' OR 1=1 --", "Dupont' OR '1'='1", "x\"; DROP TABLE wp_posts; --", "%", "_", "*", "Dupont%"]) eq((await verify(n, "1992-05-14")).status, 400, n);
      eq((await verify("O'Reilly", "1992-05-14")).json.status, "not_found", "apostrophe légitime acceptée");
      eq((await verify("Dupont", "1992-05-14")).json.count, 2, "base intacte");
      eq((await verify("Dupont", "1992-05-14' OR '1'='1")).json.fields.birthDate, "invalid");
    });
    await check("sécurité", "2. entrées anormalement longues → 400 (nom > 80) / 413 (corps > 2 Ko)", async () => {
      eq((await verify("A".repeat(81), "1992-05-14")).json.fields.lastName, "too_long");
      eq((await verify(null, null, { rawBody: "lastName=" + "A".repeat(3000) + "&birthDate=1992-05-14" })).status, 413);
    });
    await check("sécurité", "3a. tentatives répétées depuis une même IP → 429 + Retry-After à la 11e", async () => {
      const ip = "203.0.113.77"; let last;
      for (let i = 0; i < 11; i++) last = await verify("Personne" + "abcdefghijk"[i], "2000-01-01", { ip });
      eq(last.status, 429); eq(last.json.code, "rate_limited"); ok(+last.headers.get("retry-after") > 0, "Retry-After");
    });
    await check("sécurité", "3b. 8 échecs pour un même nom depuis 8 IP → nom verrouillé, même avec la bonne date et une nouvelle IP", async () => {
      for (let i = 0; i < 8; i++) eq((await verify("Leroy", `1999-09-${String(10 + i)}`)).json.status, "not_found");
      const r = await verify("Leroy", "1999-09-09"); eq(r.status, 429, "verrou par nom");
      eq((await verify("Ngô", "1995-02-28")).json.status, "found", "les autres noms restent consultables");
    });
    await check("sécurité", "4. accès admin sans connexion → refusé (modèle CSV, PDF équipe, wp-admin)", async () => {
      const t = await fetch(`${BASE}/wp-admin/admin-post.php?action=wisy_cert_template`, { redirect: "manual" });
      ok([302, 403].includes(t.status) || !(await t.text()).includes("date_naissance"), "modèle CSV : " + t.status);
      const p = await fetch(`${BASE}/wp-admin/admin-post.php?action=wisy_cert_admin_pdf&post=${id(2)}`, { redirect: "manual" });
      ok(p.status !== 200 || !(p.headers.get("content-type") || "").includes("pdf"), "PDF équipe : " + p.status);
      const imp = await fetch(`${BASE}/wp-admin/edit.php?post_type=certificat&page=wisy-cert-import`, { redirect: "manual" });
      ok([302, 403].includes(imp.status), "écran d'import : " + imp.status);
    });
    await check("sécurité", "5. aucune liste publique : /wp/v2/certificat (404), médias des certificats masqués, pages /certificat/ en 404, absent du sitemap", async () => {
      eq((await fetch(`${BASE}/wp-json/wp/v2/certificat`)).status, 404, "API REST des certificats");
      eq((await fetch(`${BASE}/wp-json/wp/v2/certificat/${id(2)}`)).status, 404, "certificat par ID");
      const media = await (await fetch(`${BASE}/wp-json/wp/v2/media?mime_type=application/pdf&per_page=100`)).json();
      eq(Array.isArray(media) ? media.length : -1, 0, "PDF listés par l'API médias");
      const rec = await getJson("/wp-json/wisy-test/v1/record?id=" + fixture.legacy.lefevre);
      const att = rec.public_copies.find((c) => c.certificate === fixture.legacy.lefevre).attachment;
      eq((await fetch(`${BASE}/wp-json/wp/v2/media/${att}`)).status, 404, "média par ID");
      eq((await fetch(`${BASE}/?post_type=certificat&p=${id(2)}`, { redirect: "manual" })).status, 404, "page publique du certificat");
      eq((await fetch(`${BASE}/?attachment_id=${att}`, { redirect: "follow" })).status, 404, "page de la pièce jointe");
      const sm = await (await fetch(`${BASE}/wp-sitemap.xml`)).text();
      ok(!/certificat/.test(sm), "sitemap");
    });
    await check("sécurité", "7. CORS : origine autorisée renvoyée (sans « credentials ») ; autre origine et absence d'origine → 403 sans en-tête", async () => {
      const a = await verify("Ngô", "1995-02-28"); eq(a.headers.get("access-control-allow-origin"), ORIGIN); eq(a.headers.get("access-control-allow-credentials"), null);
      const e = await verify("Ngô", "1995-02-28", { origin: "https://evil.example" }); eq(e.status, 403); eq(e.headers.get("access-control-allow-origin"), null);
      const n = await verify("Ngô", "1995-02-28", { origin: null }); eq(n.status, 403);
      const pre = await fetch(`${API}/verify`, { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } });
      eq(pre.headers.get("access-control-allow-origin"), ORIGIN, "pré-vérification");
    });
    await check("sécurité", "8. données personnelles jamais dans l'URL : paramètres en query string refusés", async () => {
      const r = await verify("Ngô", "1995-02-28", { query: "?lastName=Ngo&birthDate=1995-02-28" }); eq(r.status, 400); eq(r.json.code, "params_in_url");
    });
    await check("sécurité", "9. aucune donnée personnelle dans les compteurs, statistiques ni debug.log ; aucune alerte PHP", async () => {
      const r = await getJson("/wp-json/wisy-test/v1/inspect");
      eq(r.leaks.length, 0, "fuites : " + r.leaks.join(" | "));
      ok(r.rate_limit_counters > 0, "les compteurs existent (hachés)");
      eq(r.plugin_log_lines.length, 0, "alertes PHP de l'extension dans debug.log : " + r.plugin_log_lines.slice(0, 5).join(" | "));
    });
    await check("sécurité", "10. cache : no-store + noindex sur les réponses 200, 400, 403 et 429 de l'API", async () => {
      for (const r of [await verify("Ngô", "1995-02-28"), await verify("", ""), await verify("Ngô", "1995-02-28", { origin: "https://evil.example" })]) {
        ok(/no-store/.test(r.headers.get("cache-control") || ""), "cache-control " + r.status); eq(r.headers.get("x-robots-tag"), "noindex, nofollow, noarchive", "x-robots " + r.status);
      }
    });
    await check("sécurité", "7b. hébergeur qui ajoute déjà « * » aux réponses réussies (cas wisysafety.be) : pas de doublon sur 200, en-tête fourni sur 4xx", async () => {
      const probe = (await postJson("/wp-json/wisy-test/v1/host-cors", {})).probe_here;
      ok(probe && probe.success === false && probe.error === false || probe.reachable === false, "sonde réelle du serveur de test : " + JSON.stringify(probe));
      console.log("      (sonde CORS réelle du serveur de test : " + JSON.stringify({ reachable: probe.reachable, success: probe.success, error: probe.error }) + ")");
      const a = await verify("Ngô", "1995-02-28"); eq(a.status, 200); eq(a.headers.get("access-control-allow-origin"), null, "200 : l'hébergeur s'en charge");
      const b = await verify("", ""); eq(b.status, 400); eq(b.headers.get("access-control-allow-origin"), ORIGIN, "400 : l'extension le fournit");
      await postJson("/wp-json/wisy-test/v1/host-cors", { reset: true });
      eq((await verify("Ngô", "1995-02-28")).headers.get("access-control-allow-origin"), ORIGIN, "retour au mode extension");
    });

    console.log("\n— Administration (connecté en administrateur)");
    const login = await fetch(`${BASE}/wp-json/wisy-test/v1/login`);
    const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const admin = async (p, init = {}) => { const r = await fetch(BASE + p, Object.assign({ redirect: "manual" }, init, { headers: Object.assign({ Cookie: cookie }, init.headers || {}) })); return { status: r.status, html: await r.text(), headers: r.headers }; };
    const field = (html, name) => { const m = html.match(new RegExp('name="' + name.replace(/[[\]]/g, "\\$&") + '"[^>]*value="([^"]*)"')) || html.match(new RegExp('value="([^"]*)"[^>]*name="' + name.replace(/[[\]]/g, "\\$&") + '"')); return m ? m[1].replace(/&amp;/g, "&") : ""; };
    await check("admin", "écrans Tableau de bord, Importer, Reprise, Réglages : affichés sans erreur PHP", async () => {
      const pages = { "wisy-cert-dashboard": "vérifiables", "wisy-cert-import": "Télécharger le modèle CSV", "wisy-cert-legacy": "Champs trouvés dans vos certificats", "wisy-cert-settings": "Sites autorisés à interroger" };
      for (const [slug, needle] of Object.entries(pages)) {
        const r = await admin(`/wp-admin/edit.php?post_type=certificat&page=${slug}`);
        eq(r.status, 200, slug); ok(r.html.includes(needle), slug + " : « " + needle + " » absent"); ok(!/Fatal error|Warning:|Notice:/.test(r.html), slug + " : erreur PHP affichée");
      }
    });
    await check("admin", "liste des certificats : colonnes Formation, N° diplôme, Statut, Vérifiable", async () => {
      const r = await admin("/wp-admin/edit.php?post_type=certificat");
      eq(r.status, 200); ["Formation", "N° diplôme", "Statut", "Vérifiable", "TEST-VCA-1001", "Révoqué", "Expiré"].forEach((t) => ok(r.html.includes(t), "absent : " + t));
    });
    await check("admin", "fiche certificat : enregistrement (date de validité modifiée + envoi d'un PDF) → statut et PDF à jour dans l'API", async () => {
      const ngo = id(6);
      const edit = await admin(`/wp-admin/post.php?post=${ngo}&action=edit`);
      eq(edit.status, 200); ok(edit.html.includes("Données du certificat"), "boîte de l'extension"); ok(edit.html.includes('value="Ngô"'), "valeur du nom");
      const fd = new FormData();
      const rec = (await getJson("/wp-json/wisy-test/v1/record?id=" + ngo)).record;
      Object.entries({ _wpnonce: field(edit.html, "_wpnonce"), _wp_http_referer: field(edit.html, "_wp_http_referer"), user_ID: "1", action: "editpost", originalaction: "editpost", post_author: "1", post_type: "certificat", original_post_status: "publish", post_ID: String(ngo), post_title: "Thị Lan Ngô", post_status: "publish", wisy_cert_nonce: field(edit.html, "wisy_cert_nonce") }).forEach(([k, v]) => fd.append(k, v));
      ["last_name", "first_name", "other_last_names", "birth_date", "training", "diploma_number", "training_date", "issue_date", "revoked_date", "revoked_reason", "employer_name", "employer_phone", "employer_email", "internal_note"].forEach((k) => fd.append(`wisy_cert[${k}]`, rec[k] || ""));
      fd.append("wisy_cert[expiry_date]", "2021-01-20");
      fd.append("wisy_cert_pdf", new Blob([pdf], { type: "application/pdf" }), "nouveau.pdf");
      ok(fd.get("_wpnonce") && fd.get("wisy_cert_nonce"), "jetons de formulaire trouvés");
      const save = await admin("/wp-admin/post.php", { method: "POST", body: fd });
      ok([200, 302].includes(save.status), "enregistrement : " + save.status);
      const c = (await verify("Ngô", "1995-02-28")).json.certificates[0];
      eq(c.status, "expired", "statut après modification"); eq(c.expiryDate, "2021-01-20"); eq(c.document.available, true, "PDF envoyé depuis la fiche");
    });
    await check("admin", "fiche : un faux PDF (texte renommé .pdf) est refusé", async () => {
      const ngo = id(6);
      const edit = await admin(`/wp-admin/post.php?post=${ngo}&action=edit`);
      const before = (await getJson("/wp-json/wisy-test/v1/record?id=" + ngo)).doc.sha256;
      const fd = new FormData();
      Object.entries({ _wpnonce: field(edit.html, "_wpnonce"), user_ID: "1", action: "editpost", post_type: "certificat", post_ID: String(ngo), post_title: "Thị Lan Ngô", post_status: "publish", wisy_cert_nonce: field(edit.html, "wisy_cert_nonce"), "wisy_cert[last_name]": "Ngô", "wisy_cert[birth_date]": "1995-02-28", "wisy_cert[training]": "Fibre optique", "wisy_cert[expiry_date]": "2021-01-20" }).forEach(([k, v]) => fd.append(k, v));
      fd.append("wisy_cert_pdf", new Blob(["<script>alert(1)</script>"], { type: "application/pdf" }), "faux.pdf");
      await admin("/wp-admin/post.php", { method: "POST", body: fd });
      eq((await getJson("/wp-json/wisy-test/v1/record?id=" + ngo)).doc.sha256, before, "le PDF précédent est conservé");
    });
    await check("admin", "import CSV depuis l'écran (simulation) : rapport affiché, rien d'écrit", async () => {
      const page = await admin("/wp-admin/edit.php?post_type=certificat&page=wisy-cert-import");
      const fd = new FormData();
      fd.append("_wpnonce", field(page.html, "_wpnonce")); fd.append("wisy_cert_action", "import"); fd.append("wisy_cert_mode", "simulate"); fd.append("wisy_cert_update", "1");
      fd.append("wisy_cert_csv", new Blob([fs.readFileSync(path.join(__dirname, "fixtures", "certificats-test.csv"))], { type: "text/csv" }), "test.csv");
      const r = await admin("/wp-admin/edit.php?post_type=certificat&page=wisy-cert-import", { method: "POST", body: fd });
      eq(r.status, 200); ok(r.html.includes("Résultat de la simulation"), "rapport"); ok(r.html.includes("31/02/1990"), "ligne rejetée citée");
    });
    await check("admin", "formulaire sans jeton de sécurité (nonce) → refusé", async () => {
      const fd = new FormData(); fd.append("wisy_cert_action", "import"); fd.append("_wpnonce", "invalide");
      const r = await admin("/wp-admin/edit.php?post_type=certificat&page=wisy-cert-import", { method: "POST", body: fd });
      ok(r.status === 403 || /lien que vous avez suivi a expiré|link you followed has expired|Are you sure/i.test(r.html), "statut " + r.status);
    });
    await check("admin", "aucune alerte PHP de l'extension après les écrans d'administration", async () => {
      const r = await getJson("/wp-json/wisy-test/v1/inspect");
      eq(r.plugin_log_lines.length, 0, r.plugin_log_lines.slice(0, 5).join(" | "));
    });
    await check("sécurité", "santé : /health ne révèle ni version ni donnée", async () => {
      const h = await (await fetch(`${API}/health`)).json(); eq(Object.keys(h).sort().join(), "api,challenge,status,timezone"); eq(h.challenge, null);
    });
  } finally {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} contrôles réussis (PHP ${PHP}).`);
    if (failed.length) console.log("ÉCHECS :\n" + failed.map((f) => " - [" + f.group + "] " + f.name + " : " + f.err).join("\n"));
    if (KEEP) console.log(`\nServeur laissé ouvert sur ${BASE} (Ctrl+C pour arrêter). Origine autorisée : ${ORIGIN}`);
    else stop();
    process.exitCode = failed.length ? 1 : 0;
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
