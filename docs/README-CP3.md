# Formation Conseiller en prévention niveau III (« CP3 ») — mode d'emploi

Page : `formation-conseiller-prevention-niveau-3.html` (ajoutée le 19/11/2026).
Identifiant partout dans le site : `conseiller-prevention` (inscription : `inscription.html?formation=conseiller-prevention`).

## Situation vis-à-vis de la liste du SPF Emploi (constat du 19/11/2026)

Le Code du bien-être au travail (art. II.4-24) juge satisfaite l'exigence de connaissances de base (art. II.1-20) par le conseiller
qui a suivi un cours de base **dans un établissement figurant sur la liste publiée par le Ministre** (liste du SPF Emploi). Le
diplôme personnel du formateur ne suffit pas : c'est l'établissement qui doit figurer sur la liste.

**Wisy Safety y figure** : entrée « **Wisy asbl** » — Avenue d'Itterbeek 378 bte 1, 1070 Anderlecht, info@wisysafety.be,
https://wisysafety.be, langue « français » — dans la liste lue **en entier** le 19/11/2026 (source `SRC-CP3-010` ; la BCE donne
1027.725.391 = « WISY », ASBL, même adresse). La toute première version de la page, le même jour, disait le contraire : la liste est
longue, « Wisy asbl » est tout près de la fin, une lecture tronquée l'avait manquée. Liste officielle :
https://emploi.belgique.be/fr/agrements/notification-liste-des-institutions-qui-dispensent-des-cours-de-base-pour-les-conseillers

**Ce que la page dit** : « Wisy Safety figure sur la liste du SPF Emploi » (hero, § 06, FAQ), sous le nom « Wisy asbl », avec la date
du constat, le lien vers la liste, et la nature exacte de l'inscription : une **notification** de l'établissement, qui s'engage à
respecter l'art. II.4-25 (art. II.4-26), retirable après contrôle (art. II.4-27).

**Ce qu'elle ne dit jamais** (`tests/cp3.test.js`, registre `unconfirmed`) : « agréé » / « agrément » (le SPF réserve ce mot aux cours de
niveaux I et II ; pour le niveau III il parle de notification et de liste), « reconnu par le SPF », « certificat officiel »,
« examen officiel ». Le Code dit « jugé avoir satisfait à l'exigence » : la page reprend ces mots.

**Engagements à tenir à chaque session** (art. II.4-25, pris par la notification ; sinon risque de radiation, art. II.4-27) :
contenu conforme à l'art. II.1-20 (les six domaines de la section 03), **40 heures minimum**, formateurs ayant une expérience pratique
des matières, locaux et matériel adaptés, **attestation de participation** remise à chaque participant.

**Si l'entrée disparaît de la liste** : `CP3.official.spfListed` → `null` dans `js/trainings-data.js` (le test `liste du SPF`
échoue alors tant que la page l'affirme), retirer le badge du hero, la FAQ « Wisy Safety figure-t-elle… », réécrire le § 06
(`cp3.s6_h2`, `cp3.s6_p2`, `cp3.listed`, `cp3.q7*`) dans la page et dans `content/i18n/cp3/*.json`, puis
`node scripts/build-i18n-fiches.js`. Pour se réinscrire : formulaire et procédure
https://emploi.belgique.be/fr/themes/bien-etre-au-travail/structures-organisationnelles/le-conseiller-en-prevention/formation-1
(gratuit, e-mail à hut@emploi.belgique.be, délai « quelques semaines »).

## Ce qui reste à confirmer avant de publier plus

Prix, durée exacte et calendrier des sessions, langue(s) (la liste du SPF indique « français » pour Wisy asbl, mais la page dit « sur
demande » tant que ce n'est pas confirmé pour chaque session), mode d'évaluation, formateurs. Une fois confirmés : les saisir **une
fois** dans `js/trainings-data.js` (puis les retirer de `unconfirmedClaims`) et relancer
`node scripts/build-seo.js && node scripts/sync-edge.js && node --test tests/*.test.js`. Publier une session : feuille Google
« Réservations » (formation `conseiller-prevention`).

## Ce qui a été branché

| Élément | Fichier |
|---|---|
| Page, thème « registre » | `formation-conseiller-prevention-niveau-3.html`, `css/fiche-cp3.css` |
| Outil « Quel niveau pour mon entreprise ? » (groupes A–D) | règle : `js/trainings-data.js` (`cp3Outcome`, testée) ; affichage : `js/formation-fiche.js` (`[data-fx-level]`) |
| Faits, mots-clés, affirmations interdites | `js/trainings-data.js` (`conseillerPrevention`) |
| Catalogue, recherche, assistant | `js/site-content.js`, `formations.html`, `index.html` |
| Menus (bureau + mobile) | les 25 pages du site |
| Inscription (« Sur devis ») | `js/registration-data.js`, `google-sheets/reservations.gs` |
| Sources vérifiées (SRC-CP3-001 à 011) | `js/sources-data.js` |
| Traductions (10 langues) | `content/i18n/cp3/*.json` → `js/i18n-data-cp3.js` ; menus : `js/i18n-data-common.js` |
| SEO (canonical, Open Graph, JSON-LD `Course`, sitemap) | `scripts/build-seo.js` |
| Images (carte, miniature, partage) | `scripts/optimize-images.py` (`cp3()`), image = illustration « briefing d'équipe » réutilisée |

## Repères du marché (recherche du 19/11/2026 — inspiration, aucun texte copié)

Mensura (Bruxelles, 42 h / 6 jours), Securex (formule classique ou mixte avec e-learning), IFAPME (Liège, Verviers,
Villers-le-Bouillet, Mons : 42 h), UMONS / UO-FWB (Charleroi-Mons, 750 €, les jeudis), Form'action André Renard (Liège),
Filova (Mouscron). Tous présentent : programme par journée, public (groupes C/D), durée, examen/attestation, recyclage.
Différence Wisy Safety : outil interactif « quel niveau ? », sources officielles visibles, parcours III → recyclage → II,
sessions pour groupes d'entreprise sur demande.

## Contrôles

`tests/cp3.test.js` protège : pas de « agréé / reconnu par le SPF / certificat officiel » (page + 10 langues), pas de prix ni de durée de session, `data-src` partout, règle de l'outil, inscription sur la liste affirmée seulement si le registre la confirme, lien dans les menus des pages.
