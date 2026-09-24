"use strict";
/* Intégrité des liens et des ressources : aucune page, image, feuille de style, script ni ancre
   introuvable (noms EXACTS, casse comprise — l'hébergeur Linux distingue majuscules et minuscules),
   aucune nouvelle destination morte « # », scripts tiers épinglés + SRI, liens sortants sûrs.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Site = require("../js/site-content.js");
const FAQ = require("../js/faq-data.js");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index", "formations", "formation-nacelles-elevatrices", "inscription", "contact", "avis", "faq", "agenda"].map((n) => n + ".html").concat(["admin/avis.html"]);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Existence sensible à la casse. Renvoie true, false, ou le vrai nom si seule la casse diffère. */
function existsExact(rel) {
  let cur = ROOT;
  for (const seg of rel.split("/").filter(Boolean)) {
    let names; try { names = fs.readdirSync(cur); } catch { return false; }
    const hit = names.find((n) => n.normalize("NFC") === seg.normalize("NFC"));
    if (!hit) { const ci = names.find((n) => n.toLowerCase() === seg.toLowerCase()); return ci ? "casse : " + ci : false; }
    cur = path.join(cur, hit);
  }
  return true;
}
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) o[m[1].toLowerCase()] = m[2] ?? m[3]; return o; };
const bodyHtml = (f) => read(f).replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, " ")).replace(/<style\b[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, " "));

const idCache = {};
function idsOf(file) {
  if (!idCache[file]) {
    const ids = new Set([...read(file).matchAll(/\bid\s*=\s*"([^"]+)"/g)].map((m) => m[1]));
    if (file === "faq.html") FAQ.items().forEach((it) => ids.add(it.id));           // accordéons générés par js/faq-page.js
    idCache[file] = ids;
  }
  return idCache[file];
}

/* Toutes les références internes d'une page : { page, tag, attr, url } */
function refs(file) {
  const out = [], html = bodyHtml(file);
  /* balises <script src> : le HTML « nettoyé » ci-dessus vide leurs blocs — on lit donc leur balise ouvrante à part */
  for (const m of read(file).replace(/<!--[\s\S]*?-->/g, "").matchAll(/<script\b([^>]*\bsrc\s*=[^>]*)>/gi)) {
    const a = attrs(m[1]); out.push({ file, tag: "script", attr: "src", url: (a.src || "").trim(), a });
  }
  for (const m of html.matchAll(/<(a|link|img|source|script|video|iframe|form|area|track)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(), a = attrs(m[2]);
    const push = (attr, url) => { if (url != null) out.push({ file, tag, attr, url: url.trim(), a }); };
    if (tag === "a" || tag === "area") push("href", a.href);
    else if (tag === "link") { if (/stylesheet|icon|preload|apple-touch/.test(a.rel || "")) push("href", a.href); }
    else if (tag === "form") push("action", a.action);
    else if (tag !== "script") { push("src", a.src); push("poster", a.poster); }
    if (a.srcset) a.srcset.split(",").forEach((s) => push("srcset", s.trim().split(/\s+/)[0]));
    if (a.imagesrcset) a.imagesrcset.split(",").forEach((s) => push("imagesrcset", s.trim().split(/\s+/)[0]));
  }
  return out;
}
const isExternal = (u) => /^(https?:)?\/\//i.test(u);
const isSpecial = (u) => /^(mailto:|tel:|data:|blob:|about:)/i.test(u);

/* ------------------------------------------------------------------ ressources et pages */
test("toute page, image, feuille de style, script, poster et srcset référencés existent (casse exacte)", () => {
  const bad = [];
  PAGES.forEach((f) => {
    const dir = path.posix.dirname(f);
    refs(f).forEach(({ url, attr, tag }) => {
      if (!url || url === "#" || isExternal(url) || isSpecial(url) || /^javascript:/i.test(url)) return;
      const p0 = url.split("#")[0].split("?")[0];
      if (!p0) return;                                                  // ancre de la page courante
      const target = path.posix.normalize(path.posix.join(dir, decodeURI(p0)));
      const ok = existsExact(target);
      if (ok !== true) bad.push(f + " <" + tag + " " + attr + "> " + url + " → " + (ok || "introuvable"));
    });
  });
  assert.deepEqual(bad, []);
});

test("toute ancre « page.html#id » pointe vers un id qui existe (FAQ : questions de faq-data.js)", () => {
  const bad = [];
  PAGES.forEach((f) => {
    const dir = path.posix.dirname(f);
    refs(f).filter((r) => r.attr === "href").forEach(({ url }) => {
      if (isExternal(url) || isSpecial(url) || url === "#" || !url.includes("#")) return;
      const [p0, frag] = url.split("#");
      const target = p0 ? path.posix.normalize(path.posix.join(dir, p0.split("?")[0])) : f;
      if (frag && /\.html$/.test(target) && existsExact(target) === true && !idsOf(target).has(decodeURIComponent(frag))) bad.push(f + " → " + url);
    });
  });
  assert.deepEqual(bad, []);
});

test("url() des feuilles de style et chemins d'images cités dans le JS existent", () => {
  const bad = [];
  fs.readdirSync(path.join(ROOT, "css")).filter((f) => f.endsWith(".css")).forEach((f) => {
    for (const m of read("css/" + f).matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)) {
      const u = m[2].trim(); if (/^(data:|https?:|#)/.test(u)) continue;
      const t = path.posix.normalize(path.posix.join("css", decodeURI(u.split("?")[0].split("#")[0])));
      if (existsExact(t) !== true) bad.push("css/" + f + " : " + u);
    }
  });
  const js = fs.readdirSync(path.join(ROOT, "js")).filter((f) => f.endsWith(".js")).map((f) => "js/" + f)
    .concat(fs.readdirSync(path.join(ROOT, "js/assistant")).map((f) => "js/assistant/" + f));
  js.forEach((f) => {
    for (const m of read(f).matchAll(/["'`]((?:assets\/[^"'`\n$]+?\.(?:png|jpe?g|webp|avif|svg|mp4|webm|woff2)|[\w-]+\.html)(?:#[\w-]+)?)["'`]/g)) {
      const [p0, frag] = m[1].split("#");
      const ok = existsExact(decodeURI(p0));
      if (ok !== true) bad.push(f + " : " + m[1] + " → " + (ok || "introuvable"));
      else if (frag && /\.html$/.test(p0) && !idsOf(p0).has(frag)) bad.push(f + " : ancre " + m[1]);
    }
  });
  assert.deepEqual(bad, []);
});

/* ------------------------------------------------------------------ destinations mortes */
test("aucune NOUVELLE destination morte « # » : seules les entrées de menu et mentions légales connues (à créer)", () => {
  /* Dette connue et VISIBLE : ces liens n'ont pas encore de page (voir le rapport d'audit). Toute autre
     ancre « # » nue est une régression. Quand une page est créée, retirez sa clé de cette liste. */
  const KNOWN = new Set(["nav.vca_entreprise", "nav.peb", "nav.coordination", "nav.certificat",
    "footer.legal_mentions", "footer.legal_privacy", "footer.legal_terms"]);
  const bad = [];
  PAGES.forEach((f) => {
    for (const m of bodyHtml(f).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const a = attrs(m[1]);
      if (a.href !== "#") continue;
      const key = a["data-i18n"] || ((m[2].match(/data-i18n="([^"]+)"/) || [])[1]);
      const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
      if (!KNOWN.has(key) && !(f === "contact.html" && text === "politique de confidentialité")) bad.push(f + " : <a href=\"#\"> « " + m[2].replace(/<[^>]+>/g, "").trim().slice(0, 40) + " » (" + (key || "sans clé") + ")");
    }
  });
  assert.deepEqual(bad, []);
});

test("aucun lien javascript: ni href/src vide ; mailto: et tel: bien formés", () => {
  PAGES.forEach((f) => refs(f).forEach(({ url, attr, tag }) => {
    assert.ok(url !== "", f + " <" + tag + " " + attr + "> vide");
    assert.doesNotMatch(url, /^javascript:/i, f + " : javascript:");
    if (/^mailto:/i.test(url)) assert.match(url, /^mailto:[^\s@?]+@[^\s@?]+\.[a-z]{2,}(\?[^\s]*)?$/i, f + " : mailto " + url);
    if (/^tel:/i.test(url)) assert.match(url, /^tel:\+?\d{8,15}$/, f + " : tel " + url);
  }));
});

/* ------------------------------------------------------------------ sécurité des liens sortants */
test("target=_blank : toujours rel=noopener ; liens sortants limités aux domaines attendus", () => {
  const ALLOWED = new Set(["maps.google.com", "www.google.com", "cdn.jsdelivr.net", "www.wisysafety.be"]);
  PAGES.forEach((f) => {
    refs(f).forEach(({ url, a, tag }) => {
      if (a.target === "_blank") assert.match(a.rel || "", /noopener/, f + " : target=_blank sans noopener : " + url);
      if (isExternal(url) && /^(a|script|iframe|link|img)$/.test(tag)) {
        const host = new URL(url.startsWith("//") ? "https:" + url : url).host;
        assert.ok(ALLOWED.has(host), f + " : domaine externe inattendu : " + host);
      }
    });
  });
});

test("scripts tiers : version EXACTE épinglée + intégrité SRI + crossorigin (chaîne d'approvisionnement)", () => {
  const found = [];
  PAGES.forEach((f) => {
    refs(f).filter((r) => r.tag === "script" && isExternal(r.url)).forEach(({ url, a }) => {
      found.push(f + " " + url);
      assert.match(url, /@\d+\.\d+\.\d+/, f + " : version flottante interdite : " + url);
      assert.match(a.integrity || "", /^sha384-[A-Za-z0-9+/]{64}$/, f + " : intégrité SRI manquante : " + url);
      assert.equal(a.crossorigin, "anonymous", f + " : crossorigin=anonymous requis avec SRI");
    });
  });
  assert.ok(found.length >= 4, "scripts tiers détectés : " + found.length);
});

test("aucun secret privé dans le code livré au navigateur (seules les clés PUBLIQUES de js/supabase-config.js)", () => {
  const files = ["js", "js/assistant", "css"].flatMap((d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => /\.(js|css)$/.test(f)).map((f) => d + "/" + f))
    .concat(PAGES, ["404.html"]);
  files.forEach((f) => {
    const s = read(f);
    assert.doesNotMatch(s, /sk-ant-[A-Za-z0-9_-]{10,}|service_role["']?\\s*[:=]\\s*["']eyJ|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, f + " : secret ou jeton privé");
  });
  const cfg = read("js/supabase-config.js");
  assert.match(cfg, /SUPABASE_ANON_KEY:\s+"sb_publishable_/, "clé Supabase : format « publishable » (publique par conception, protégée par la RLS)");
  assert.doesNotMatch(read(".env.example"), /sk-ant-[A-Za-z0-9]{10,}/, ".env.example ne contient aucune vraie clé");
});

test("registre : chaque page publique et chaque fiche formation pointe vers une destination réelle", () => {
  Site.pages().forEach((p) => assert.equal(existsExact(p.url), true, "page " + p.id));
  Site.formations().forEach((f) => {
    const [p0, frag] = f.url.split("#");
    assert.equal(existsExact(p0), true, "fiche " + f.id);
    if (frag) assert.ok(idsOf(p0).has(frag), "ancre de la fiche " + f.id + " : #" + frag);
    assert.match(f.signupUrl, /^inscription\.html\?formation=[a-z-]+$/, "inscription " + f.id);
  });
});
