"use strict";
/* Calendrier et fiches de session (js/sessions-ui.js) : grille du mois (lundi en premier), navigation, libellés de
   places (« X places disponibles sur Y » seulement si la feuille les a calculées), niveaux de couleur, styles.
   `node --test tests/*.test.js` — aucune dépendance. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const UI = require("../js/sessions-ui.js");
const S = require("../js/sessions.js");
const t = (k, fb) => fb;
const NOW = new Date("2026-10-15T08:00:00Z");
const sess = (o) => S.normalize(Object.assign({ id: "2026-10-18-nacelle", training: "nacelle", date: "2026-10-18", startTime: "10:00", endTime: "18:00", capacity: 10 }, o));

test("grille du mois : lundi en premier, jours des mois voisins marqués, 4 à 6 semaines", () => {
  const oct = UI.monthGrid("2026-10");                          // 1er octobre 2026 = jeudi
  assert.equal(oct.length, 5);
  assert.deepEqual(oct[0].map((c) => c.day), ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  assert.deepEqual(oct[0].map((c) => c.inMonth), [false, false, false, true, true, true, true]);
  assert.equal(oct[2][6].day, "2026-10-18", "le 18/10/2026 est un dimanche (dernière colonne)");
  assert.equal(UI.monthGrid("2027-02").length, 4, "février 2027 commence un lundi : 4 semaines pile");
  assert.equal(UI.monthGrid("2027-02")[0][0].day, "2027-02-01");
  assert.equal(UI.monthGrid("2026-08").length, 6, "août 2026 commence un samedi : 6 semaines");
  oct.forEach((w) => assert.equal(w.length, 7));
  assert.equal(UI.addMonths("2026-12", 1), "2027-01"); assert.equal(UI.addMonths("2026-01", -1), "2025-12"); assert.equal(UI.monthKey(2026, 3), "2026-03");
});

test("libellés : « 10 places disponibles sur 10 », singulier, complet, clôturé ; capacité seule hors feuille de réservation", () => {
  assert.equal(UI.seatsText(S, sess({ seatsLeft: 10, live: true }), t, NOW), "10 places disponibles sur 10");
  assert.equal(UI.seatsText(S, sess({ seatsLeft: 1, live: true }), t, NOW), "1 place disponible sur 10");
  assert.equal(UI.seatsText(S, sess({ seatsLeft: 0, live: true }), t, NOW), "Complet");
  assert.equal(UI.seatsText(S, sess({ seatsLeft: 5, live: true, closesAt: "2026-10-16T10:00" }), t, new Date("2026-10-16T09:00:00Z")), "Inscriptions clôturées");
  assert.equal(UI.seatsText(S, sess({}), t, NOW), "10 places", "fichier js/sessions-data.js : capacité seule, jamais une disponibilité");
  assert.equal(UI.seatsText(S, sess({ seatsLeft: 4 }), t, NOW), "10 places", "un nombre de places saisi à la main n'est jamais affiché comme disponible");
  assert.equal(UI.seatsText(S, sess({ capacity: null }), t, NOW), "");
});

test("niveaux de couleur : disponibles / dernières places (≤ 3 ou ≤ 20 %) / complet / clôturé", () => {
  assert.equal(UI.level(S, sess({ seatsLeft: 10, live: true }), NOW), "open");
  assert.equal(UI.level(S, sess({ seatsLeft: 3, live: true }), NOW), "low");
  assert.equal(UI.level(S, sess({ seatsLeft: 4, live: true, capacity: 40 }), NOW), "low", "10 % restants");
  assert.equal(UI.level(S, sess({ seatsLeft: 0, live: true }), NOW), "full");
  assert.equal(UI.level(S, sess({ status: "closed" }), NOW), "closed");
  assert.equal(UI.level(S, sess({}), NOW), "open", "sans places calculées : jamais « dernières places »");
});

test("jauge : une case par place (≤ 20) avec les places prises ; barre continue au-delà ; rien sans places calculées", () => {
  const g = UI.gaugeHtml(sess({ seatsLeft: 7, live: true }));
  assert.equal((g.match(/is-taken/g) || []).length, 3); assert.equal((g.match(/is-free/g) || []).length, 7);
  assert.match(g, /aria-hidden="true"/, "décorative : le texte dit déjà les places");
  assert.match(UI.gaugeHtml(sess({ capacity: 40, seatsLeft: 10, live: true })), /wss-gauge--bar[\s\S]*width:75%/);
  assert.equal(UI.gaugeHtml(sess({})), "");
});

test("styles : contrastes des pastilles, cibles tactiles, focus visible, mouvement réduit, RTL", () => {
  const css = read("css/sessions.css");
  assert.match(css, /--wsc-low: #8A5A00;/, "ambre foncé : 6:1 avec le texte blanc");
  assert.match(css, /\.wsc-nav__btn \{[^}]*width: 44px; height: 44px/s);
  assert.match(css, /\.wsc-chip \{[^}]*min-height: 30px/s); assert.match(css, /@container wsc \(max-width: 560px\)[\s\S]*\.wsc-chip \{[^}]*min-height: 26px/, "≥ 24 px (WCAG 2.5.8)");
  assert.match(css, /\.wsc-chip:focus-visible \{ outline: 3px solid var\(--wsc-tq\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.wsc-live__dot \{ animation: none; \}/);
  assert.match(css, /\[dir="rtl"\] \.wsc-nav__btn svg \{ transform: scaleX\(-1\); \}/);
});

test("calendrier : jamais de date inventée — le mois affiché suit la première session réservable, sinon le mois courant", () => {
  const src = read("js/sessions-ui.js");
  assert.match(src, /S\.upcoming\(S\.peek\(\), now\)/, "uniquement les sessions publiées et à venir");
  assert.match(src, /list\.filter\(function \(s\) \{ return S\.isBookable\(s, now\); \}\)\.concat\(list\)\[0\]\.date\.slice\(0, 7\)/);
  assert.match(src, /if \(state\.month < thisMonth\) state\.month = thisMonth;/, "jamais un mois passé");
  assert.match(src, /doc\.addEventListener\("wisy:sessions", all\)/, "places relues en direct");
  assert.match(src, /S\.startLive\(\)/);
  assert.doesNotMatch(src, /innerHTML = [^;]*\+ (s|sel)\.(id|training|location)\b(?!\))/, "toute donnée de session passe par esc()");
});
