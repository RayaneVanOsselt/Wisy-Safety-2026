/* Crédibilité (audit du 02/10/2026, C2 et M3) : aucune page n'affirme un agrément ou des formations « certifiées »
   sans preuve, et la navigation ne contient aucun lien mort (« Certificat » → #). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

function dict(file) {
  globalThis.window = {};
  require(path.join(ROOT, file));
  const I = globalThis.window.I18N; delete globalThis.window; return I;
}
const CLAIM = /agréé|agréée|accrédit|accredit|erkend|akkredit|anerkannt|معتمد|акредит|acreditat|certifi|gecertific|zertifiz|сертифиц|recunoscut|reconnu/i;

test("bandeau, menu et en-tête du catalogue : aucun agrément ni « formations certifiées » affirmé, dans les 10 langues", () => {
  const C = dict("js/i18n-data-common.js"), F = dict("js/i18n-data-formations.js");
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    ["util.badge", "nav.all_formations_desc"].forEach((k) => assert.doesNotMatch(C[l][k], CLAIM, l + " · " + k + " : « " + C[l][k] + " »"));
    ["meta.title", "fo.hero_pill", "fo.hero_title", "fo.hero_desc", "fo.badge1", "fo.badge2", "fo.badge3"].forEach((k) =>
      assert.doesNotMatch(F[l][k], CLAIM, l + " · " + k + " : « " + F[l][k] + " »"));
  });
});

test("aucune page ne garde l'entrée de menu « Certificat » vers une ancre vide", () => {
  PAGES.forEach((f) => assert.doesNotMatch(read(f), /href="#"[^>]*data-i18n="nav\.certificat"/, f));
});
