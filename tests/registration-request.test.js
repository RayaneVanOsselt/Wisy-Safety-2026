/* Inscription : tant que le paiement en ligne n'est pas branché, l'étape 4 ENVOIE la demande à Wisy Safety
   (audit du 02/10/2026, C1 : le bouton « payer » n'envoyait rien et toutes les demandes étaient perdues). */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("sans prestataire de paiement, le bouton final envoie la demande (jamais un simple « bientôt disponible »)", () => {
  const js = read("js/registration.js");
  assert.match(js, /if \(res\.status !== "ready"\) \{[\s\S]{0,200}submitRequest\(res\.order\)/, "handlePayClick → submitRequest");
  assert.match(js, /window\.emailjs\.send\(cfg\.EMAILJS_SERVICE_ID, cfg\.EMAILJS_TEMPLATE_ID_CONTACT, params\)/);
  assert.match(js, /clearStorage\(\);\s*\/\* les données personnelles/, "données effacées du navigateur après envoi");
  assert.match(js, /mailto:info@wisysafety\.be\?subject=/, "secours par e-mail si l'envoi échoue");
  assert.doesNotMatch(js, /box\.textContent = t\("reg\.payment_soon"/, "plus de cul-de-sac « paiement bientôt disponible »");
});

test("la page d'inscription charge EmailJS (avec contrôle d'intégrité) et la configuration porte le gabarit", () => {
  const html = read("inscription.html");
  assert.match(html, /<script defer src="https:\/\/cdn\.jsdelivr\.net\/npm\/@emailjs\/browser@4\.4\.1\/dist\/email\.min\.js" integrity="sha384-[^"]+" crossorigin="anonymous"><\/script>/);
  assert.match(read("js/supabase-config.js"), /EMAILJS_TEMPLATE_ID_CONTACT: "template_\w+"/);
});

test("les libellés de l'envoi existent dans les 10 langues", () => {
  globalThis.window = {};
  require("../js/i18n-data-inscription.js");
  const I = globalThis.window.I18N;
  const keys = ["reg.step_request", "reg.req_sub", "reg.req_title", "reg.req_desc", "reg.req_action", "reg.req_sending", "reg.req_sent",
    "reg.req_sent_btn", "reg.req_error", "reg.req_mail", "reg.req_status", "reg.req_journey_s"];
  ["fr", "en", "nl", "af", "ar", "bg", "de", "ro", "it", "sl"].forEach((l) => {
    keys.forEach((k) => assert.ok(I[l] && I[l][k], l + " · " + k));
    assert.match(I[l]["reg.req_sent"], /\{ref\}/, l + " : la référence est affichée");
    assert.match(I[l]["reg.req_error"], /\+32 2 318 86 59/, l + " : le téléphone de secours est donné");
  });
  delete globalThis.window;
});
