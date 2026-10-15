#!/usr/bin/env node
"use strict";
/* =========================================================================
   WISY SAFETY — Test de CONCURRENCE sur la vraie feuille de réservation (après la mise en service)

   Envoie N demandes d'1 place EN MÊME TEMPS à une session DE TEST, puis vérifie que la feuille n'a jamais accepté
   plus de places qu'il n'en restait. C'est la seule chose que les tests automatiques (fausse feuille) ne peuvent pas
   prouver : le verrou de Google entre plusieurs exécutions réellement simultanées.

   ⚠️ Crée de VRAIES lignes dans l'onglet « Réservations » et envoie de vrais e-mails de confirmation. À utiliser
      uniquement sur une session de test (ex. une session « Fermée » le reste du temps, non publiée après le test),
      avec VOTRE adresse e-mail (des variantes « +test1 », « +test2 »… sont utilisées). Ensuite : annulez la session
      de test (menu Wisy Safety › Annuler la session sélectionnée) ou supprimez ses lignes.

   Utilisation (Node 18 ou plus récent) :
     node scripts/test-reservations-live.js --url https://script.google.com/macros/s/…/exec \
          --session 2026-12-01-beps --training beps --email vous@wisysafety.be --count 12 --yes
   ========================================================================= */
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const url = opt("url"), session = opt("session"), training = opt("training"), email = opt("email");
const count = Math.max(2, Math.min(30, parseInt(opt("count", "12"), 10) || 12));

if (!url || !session || !training || !email || !args.includes("--yes")) {
  console.log("Usage : node scripts/test-reservations-live.js --url <…/exec> --session <id> --training <id> --email <vous@…> [--count 12] --yes");
  console.log("Lisez l'en-tête de ce fichier avant de l'utiliser : il crée de vraies réservations.");
  process.exit(1);
}
if (!/^https:\/\/script\.google\.com\/(?:a\/[^\s/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url)) { console.error("Adresse refusée : il faut l'adresse « Application Web » (…/exec)."); process.exit(1); }
const at = email.indexOf("@");
const variant = (i) => email.slice(0, at) + "+test" + i + email.slice(at);

async function sessions() {
  const r = await fetch(url + "?action=sessions", { redirect: "follow" });
  const j = await r.json();
  return (j.sessions || []).find((s) => s.id === session) || null;
}

(async () => {
  const before = await sessions();
  if (!before) { console.error("Session « " + session + " » introuvable dans la liste publique (publiée ? à venir ? ouverte ?)."); process.exit(1); }
  console.log("Avant : " + before.seatsLeft + " place(s) restante(s) sur " + before.capacity + " (" + before.status + ").");
  const stamp = Date.now().toString(36);
  const one = (i) => fetch(url, {
    method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "book", requestId: "live-test-" + stamp + "-" + i, lang: "fr",
      customer: { firstName: "Test", lastName: "Concurrence " + i, email: variant(i), phone: "0000" },
      billing: { address: "Test", zip: "1070", city: "Anderlecht", country: "BE" },
      items: [{ training, sessionId: session, quantity: 1, participants: null }]
    })
  }).then((r) => r.json()).catch((e) => ({ status: "network", error: String(e) }));
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: count }, (_, i) => one(i + 1)));
  const ms = Date.now() - t0;
  const tally = {};
  results.forEach((r) => { const k = r.status + (r.problems ? ":" + r.problems[0].reason : ""); tally[k] = (tally[k] || 0) + 1; });
  const ok = tally.ok || 0;
  const after = await sessions();
  console.log(count + " demandes envoyées en même temps (" + ms + " ms) → " + JSON.stringify(tally));
  console.log("Après : " + (after ? after.seatsLeft + " place(s) restante(s) sur " + after.capacity + " (" + after.status + ")" : "session plus listée"));
  const expectedOk = Math.min(count, before.seatsLeft);
  const sound = ok <= before.seatsLeft && (!after || after.seatsLeft === before.seatsLeft - ok) && (!after || after.seatsLeft >= 0);
  console.log(sound
    ? "✓ AUCUNE surréservation : " + ok + " réservation(s) acceptée(s) pour " + before.seatsLeft + " place(s) libre(s)."
    : "✗ PROBLÈME : " + ok + " réservation(s) acceptée(s) pour " + before.seatsLeft + " place(s) libre(s) — vérifiez la feuille.");
  if (ok < expectedOk) console.log("ℹ " + (expectedOk - ok) + " demande(s) refusée(s) alors qu'il restait de la place (« busy » = verrou saturé, ou limite par heure) : c'est sans danger, la personne réessaie.");
  console.log("N'oubliez pas : annulez la session de test (menu Wisy Safety) ou supprimez ses lignes de test.");
  process.exit(sound ? 0 : 2);
})();
