# Prompt — Formation Conseiller en prévention niveau III (CP3) sur wisysafety.be

À réutiliser pour faire évoluer la page (nouvelle session, prix, inscription SPF obtenue, nouvelle langue…).

---

Agis comme un **designer UX/UI senior** et un **développeur web front-end** qui connaît la réglementation belge du
bien-être au travail.

## Contexte
- Site : **Wisy Safety** (wisysafety.be), centre de formation sécurité à Anderlecht, pour Bruxelles et la Wallonie.
- Dépôt GitHub `Wisy-Safety-2026`, site **100 % statique** (HTML/CSS/JS sans framework), GitHub Pages, 10 langues
  (fr, en, nl, af, ar RTL, bg, de, ro, it, sl). Lire d'abord `README.md`, `docs/decisions.md`, `docs/README-CP3.md`.
- Charte : vert épinette #1F6F64, sarcelle #2F7D8C, turquoise #48D6C2, crème #F4FAF9, noir jais #1B2D28 ;
  titres Poppins, texte Inter ; composants des fiches : `css/formation-fiche.css` (préfixe `fx-`).
- Le formateur est diplômé conseiller en prévention ; la formation proposée est le **cours de base de niveau III**.

## Objectif
Présenter et vendre la formation « Conseiller en prévention niveau III » de façon professionnelle, crédible et
**personnalisée Wisy Safety** — inspirée des offres de Bruxelles et de Wallonie (Mensura, Securex, IFAPME, UMONS/UO-FWB,
Form'action André Renard…) **sans copier aucun texte ni structure**.

## Faits réglementaires à respecter (sources officielles, à revérifier à chaque modification)
- Art. II.1-20 du Code : tout conseiller en prévention a une connaissance de base suffisante (analyse des risques,
  coordination, hygiène, premiers secours / danger grave, missions du CP, rédaction des rapports).
- Art. II.1-2 : groupes A (> 1 000), B (200–1 000), C (< 200), D (< 20, l'employeur est CP) ; seuils abaissés selon le secteur (NACE).
- Groupes C et D : aucune formation complémentaire, connaissances de base suffisantes. B : niveau II pour le CP chef de
  service. A : niveau I (chef), niveau II (autres).
- Art. II.4-24 à II.4-27 : cours reconnu s'il est donné par un établissement **inscrit sur la liste du SPF Emploi** ;
  40 h minimum ; formateurs avec expérience pratique ; **attestation de participation**.
- Recyclage : droit et devoir annuel ; volume non fixé pour le niveau III (à convenir avec l'employeur).
- Art. II.4-4 § 4 : cours de base + 5 ans d'expérience utile → admission au niveau II.

## Règles d'honnêteté (non négociables)
- Ne jamais écrire « agréé », « reconnu par le SPF », « certificat officiel » tant que Wisy Safety n'est pas sur la liste.
- Aucun prix, durée exacte, langue ou date non confirmés : « sur demande » / « Sur devis ».
- Chaque affirmation réglementaire porte un `data-src="SRC-CP3-…"` décrit dans `js/sources-data.js`.

## Contenu de la page
Hero (H1, accroche, 2 CTA, extrait du Code) · fiche signalétique · rôle du CP · outil interactif « Quel niveau pour
mon entreprise ? » · programme (6 domaines) · public · parcours III → recyclage → II · encadré « liste du SPF » · FAQ ·
sources · bandeau final · barre d'action mobile.

## Intégration
Registre `js/trainings-data.js` (source unique), `js/site-content.js`, menus des 25 pages, `formations.html`,
`index.html`, `js/registration-data.js`, `google-sheets/reservations.gs`, FAQ, SEO (`scripts/build-seo.js`),
traductions (`content/i18n/cp3/*.json` → `node scripts/build-i18n-fiches.js`).

## Vérification finale
`node scripts/build-seo.js && node scripts/sync-edge.js && node scripts/check-i18n.js && node scripts/check-sources.js && node --test tests/*.test.js`,
puis contrôle visuel 390 px / 768 px / 1440 px, arabe (RTL), outil interactif, absence de défilement horizontal, contraste
et focus clavier.
