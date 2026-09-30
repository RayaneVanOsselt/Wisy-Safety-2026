# Rapport de recherche — Mentions légales (mentions-legales.html)

Date : 2026-09-28. Périmètre : refonte de la page « Mentions légales » de Wisy Safety, à partir de l'ancienne page en production (`https://wisysafety.be/mentions-legales/`) et du nouveau site statique (ce dépôt).

---

## A. Audit de l'ancienne page

Consultée en direct le 2026-09-28 (navigateur, page rendue — pas seulement le code source). C'est une page WordPress, structurellement différente du nouveau site (menu « Expertise » avec 4 sous-pages qui n'existent pas encore ici, ex. « Sécurité & Réglementation », « Techniques / DAO »… — hors périmètre de cette mission, non touché).

**Informations trouvées** (section « Fiche d'identité de l'association » + corps de texte + pied de page global de l'ancien site) :
- Dénomination : Wisy Safety ASBL
- Siège / adresse : deux valeurs différentes selon l'endroit — voir **C. Conflits détectés**
- Numéro de TVA : BE 1027.725.391 (cohérent à 3 endroits distincts de l'ancien site : fiche d'identité, section Coordonnées, pied de page global)
- Responsable de publication : Rayane Van Osselt, « Coordinateur »
- E-mail : info@wisysafety.be · Téléphone : +32 2 318 86 59
- Marque : « Wisy Safety® — marque déposée »
- Référence document : « ML 2026 » · Dernière mise à jour affichée : « juin 2026 »
- 6 sections : Éditeur, Coordonnées, Propriété intellectuelle, Protection des données, Cookies, Droit applicable

**Contenu conservé** : les 6 sections et leur ordre, la substance juridique de chacune (RGPD, propriété intellectuelle, droit belge/tribunaux de Bruxelles), le numéro de TVA, l'identité du responsable.
**Contenu restructuré** : présentation en fiche d'identité + sommaire à ancres + cartes numérotées au lieu d'un simple empilement de texte (voir **F. Benchmark design**).
**Contenu potentiellement obsolète** : l'adresse du corps de texte de l'ancienne page (voir conflit ci-dessous) ; la section Cookies de l'ancienne page affirmait « aucun cookie de suivi n'est déposé sans consentement explicite » sans détailler de catégories — le nouveau site a depuis un vrai gestionnaire de consentement (`js/cookie-consent.js`) que l'ancienne affirmation ne décrivait pas.

---

## B. Data Integrity

| Donnée | Valeur retenue | Source | Statut |
|---|---|---|---|
| Dénomination | Wisy Safety ASBL | Ancienne page (fiche d'identité) | Vérifié |
| Forme juridique | ASBL | Déduit de la dénomination elle-même (« ASBL ») | Vérifié |
| Adresse | Avenue d'Itterbeek 378, 1070 Anderlecht | Recoupement triple — voir C | Vérifié (confiance élevée) |
| Numéro d'entreprise (BCE) | 1027.725.391 | Déduit du n° de TVA (BE + n° BCE, règle générale belge — voir D) | Vérifié par déduction, pas par une source BCE directe |
| Numéro de TVA | BE 1027.725.391 | Ancienne page, cohérent à 3 endroits | Vérifié |
| Responsable de publication | Rayane Van Osselt, Coordinateur | Ancienne page | Vérifié |
| E-mail | info@wisysafety.be | Ancienne page + nouveau site (identique partout) | Vérifié |
| Téléphone | +32 2 318 86 59 | Ancienne page + nouveau site (identique partout) | Vérifié |
| Marque « Wisy Safety® — marque déposée » | Reprise telle quelle | Ancienne page (auto-déclaration de l'organisation) | **Non vérifié indépendamment** — voir note ci-dessous |
| Réf. document « ML 2026 » | Reprise telle quelle | Ancienne page | Convention interne, pas une donnée légale |

**Note sur la marque déposée** : je n'ai pas consulté le registre BOIP (Benelux) ni l'EUIPO pour confirmer un enregistrement effectif — cela dépasse le périmètre de cette mission. L'affirmation est reprise parce qu'elle est déjà publiée par l'organisation elle-même sur son site officiel actuel (donc pas une donnée que j'ai inventée), mais je ne peux pas certifier son exactitude juridique. Si un usage juridique en dépend, faites vérifier par la personne qui gère la marque.

---

## C. Conflits détectés

### Adresse du siège / établissement

- **Valeur A** (incomplète) : « Avenue d'Itterbeek, 1070 Bruxelles » — trouvée dans le corps de texte de l'ancienne page « Mentions légales » elle-même (section Coordonnées et fiche d'identité).
- **Valeur B** (complète) : « Avenue d'Itterbeek 378, 1070 Anderlecht » — trouvée dans le **pied de page global de ce même ancien site** (présent sur toutes ses pages, y compris la page mentions légales elle-même juste en dessous du texte contenant la valeur A), avec un lien Google Maps.

**Résolution retenue : Valeur B**, avec confiance élevée, sur la base d'un triple recoupement indépendant :
1. Le pied de page **global** de l'ancien site (pas seulement une page isolée) ;
2. La fiche Google Maps publique « Wisy Safety · Centre de formation », géocodée exactement à cette adresse — et c'est l'ancien site **lui-même** qui pointe vers cette fiche ;
3. Les données structurées (JSON-LD) déjà publiées sur **15 pages** du nouveau site en construction (travail de sessions précédentes, non modifié par cette mission), avec des coordonnées GPS précises (50.834996, 4.276271) correspondant au même lieu.

Seule la Valeur A (issue du corps de texte d'une seule page) diverge — plus probablement une adresse jamais mise à jour après un déménagement ou une correction, qu'une réalité distincte. « Bruxelles » et « Anderlecht » ne sont pas non plus incompatibles en soi : Anderlecht fait partie de la Région de Bruxelles-Capitale, d'où la formule « Anderlecht (Bruxelles) » déjà utilisée ailleurs sur le nouveau site.

Je considère ce conflit **résolu**, pas « validation requise » — mais si vous avez un bail ou un extrait BCE sous la main, ça reste la source la plus définitive et vaut la peine d'être comparé.

---

## D. Recherche réglementaire

Sources officielles consultées (recherche web, 2026-09-28) :
- [SPF Économie — Informations obligatoires sur le site web de votre entreprise](https://news.economie.fgov.be/203681-informations-obligatoires-sur-le-site-web-de-votre-entreprise/)
- [SPF Justice — Mentions obligatoires (associations, AISBL)](https://justice.belgium.be/fr/themes_et_dossiers/societes_associations_et_fondations/associations/aisbl/mentions_obligatoires)

**Exigence vérifiée** : la loi belge (transposition de la directive européenne 2000/31/CE sur le commerce électronique) impose à tout site professionnel — y compris une ASBL, qu'elle soit à but commercial ou non — d'afficher : la dénomination, l'adresse d'établissement, au moins deux moyens de contact direct, et le numéro d'entreprise (BCE). Selon le SPF Économie, 85 % des sites belges contrôlés sont en infraction sur ce point, l'identification incomplète étant l'infraction la plus fréquente. → La nouvelle page couvre les 4 exigences (dénomination, adresse, 2 contacts — e-mail et téléphone —, numéro d'entreprise/TVA).

**Recommandation (pas une exigence stricte)** : le droit de réclamation auprès de l'Autorité de protection des données (APD/GBA) — ajouté à la section RGPD, c'est un droit statutaire standard, identique pour tout site belge, pas une affirmation propre à Wisy Safety.

**Élément inconnu** : je n'ai pas de confirmation officielle indépendante (BCE, Moniteur belge) du statut d'enregistrement de l'ASBL elle-même — la dénomination et le numéro proviennent uniquement du site de l'organisation. Ceci n'est pas un avis juridique professionnel ; en cas de doute, une vérification via l'annuaire public de la Banque-Carrefour des Entreprises (`kbopub.economie.fgov.be`) le confirmerait en quelques secondes.

---

## E. Audit cookies/RGPD

Audit technique réel du dépôt (`grep` exhaustif de tous les fichiers `js/*.js` et `*.html`, 2026-09-28), pas une supposition.

**Gestionnaire de cookies déjà en place** (`js/cookie-consent.js`, 455 lignes, aucune dépendance externe) :
- 3 catégories réellement affichées : **Nécessaires** (verrouillée, toujours active — langue, formulaires, mémorisation du choix lui-même), **Mesure d'audience** (optionnelle — point d'intégration prêt, **aucun outil n'est installé à ce jour**, donc le relais ne fait actuellement rien), **Fonctionnalités** (optionnelle — active uniquement la carte Google Maps intégrée en page d'accueil ; sans consentement, un encart de remplacement s'affiche).
- Une 4e catégorie « Marketing » existe dans le code mais n'est **jamais affichée** : aucune technologie marketing n'existe sur le site, donc pas de case à cocher trompeuse.
- Bandeau avec 3 actions à égale importance (Tout refuser / Personnaliser / Tout accepter — « refuser » n'est ni caché ni minimisé), centre de préférences modal accessible (piège de focus, `inert` sur l'arrière-plan, Échap, retour du focus), choix mémorisé dans `localStorage["wisy-consent"]`, une nouvelle version de consentement invalide l'ancien choix.
- **Aucun** Google Analytics, Meta Pixel, Hotjar, Clarity, reCAPTCHA, ni police tierce chargée depuis un CDN externe (polices auto-hébergées).

**Stockage navigateur réel** (5 clés au total, toutes de même origine, jamais transmises à un tiers) : le choix de cookies lui-même, la langue préférée, la région choisie dans le simulateur PEB (le temps de la session), la poursuite du parcours d'inscription en 4 étapes après un rafraîchissement, les 5 dernières recherches sur le site.

**Sous-traitants techniques réels détectés** :
- **EmailJS** — achemine les e-mails du formulaire de contact et, en option, une notification admin sur nouvel avis.
- **Supabase** — héberge la base des avis clients ; la clé exposée côté client est une clé « anonyme » limitée par des règles de sécurité côté serveur (Row Level Security) à l'insertion d'un avis en attente et à la lecture d'une vue publique qui **n'expose jamais l'e-mail** du déposant.
- **Google Maps (intégration)** — uniquement la carte de la page d'accueil, chargée seulement après consentement « Fonctionnalités » (sinon `iframe src="about:blank"`).

**Données personnelles réellement collectées** :
- Formulaire de contact (`contact.html`) : nom, téléphone (facultatif), e-mail, sujet, message.
- Formulaire d'avis (`avis.html`) : prénom, e-mail (obligatoires) ; nom, entreprise, fonction (facultatifs) ; contient sa **propre case de consentement** dédiée.

Aucune divergence trouvée entre ce que le code fait réellement et ce que la nouvelle page « Mentions légales » affirme — c'est justement parce que le texte a été rédigé à partir de cet audit, plutôt que recopié de l'ancienne page.

---

## F. Benchmark design

Référence demandée : 21st.dev, utilisée comme bibliothèque de PRINCIPES (jamais copiée). Éléments retenus, adaptés au système de design existant de Wisy Safety (tokens `--epinette`/`--sarcelle`/`--turquoise`/`--creme`, typographies Poppins/Inter déjà en place) :

- **Carte d'identité structurée** (grille de définitions avec labels discrets + valeurs fortes + boutons « Copier ») plutôt qu'un paragraphe.
- **Sommaire collant en colonne** (desktop) avec surlignage actif au scroll — devient une barre défilante horizontale sur mobile, jamais un menu cassé.
- **Numérotation éditoriale** : chaque section porte un numéro « fantôme » en filigrane, un kicker numéroté (« 04 · RGPD ») et un titre — hiérarchie visuelle claire sans surcharge.
- **Fond clair, sobre, sans dégradé « startup IA »** : à dessein différent du hero sombre de `coordination.html` (page vendeuse) — une page juridique se lit, elle ne se met pas en scène. Signature visuelle propre : un glyphe « § » en filigrane au lieu d'un chiffre, cohérent avec le thème « registre légal ».
- **Micro-interactions discrètes** : bouton Copier avec confirmation visuelle courte, section active du sommaire, apparition douce au scroll (`prefers-reduced-motion` respecté).

Concept retenu : « Legal & Compliance Registry » — dossier officiel numérique, jamais froid ni générique.

---

## G. Responsive

Testé réellement (pas seulement en théorie) via le navigateur intégré, à 375 px (mobile), au-delà par lecture de code aux points de rupture définis (760 / 980 / 1180 / 1401 px, cohérents avec le reste du site).

**Bug trouvé et corrigé** : à 375 px, `.lg-sections` et `.lg-toc` (éléments d'une grille CSS) refusaient de rétrécir sous la largeur de leur contenu (comportement par défaut `min-width:auto` de CSS Grid), provoquant un débordement horizontal silencieux (texte coupé au bord de l'écran, sans barre de défilement visible à cause d'un `overflow:clip` plus haut). Corrigé en ajoutant `min-width:0` aux deux éléments — vérifié après coup : `document.body.scrollWidth === window.innerWidth` exactement à 375 px, plus aucun débordement.

**Bug trouvé et corrigé** : le fil d'Ariane et le sommaire (des `<ol>`) affichaient des numéros de liste natifs du navigateur (« 1. Accueil 2. Mentions légales ») car la remise à zéro du style de liste du site ne couvre que les `<ul>`, pas les `<ol>`. Corrigé avec `list-style:none` explicite sur ces deux éléments.

---

## H. Accessibilité

- Un seul H1, hiérarchie de titres sans saut (H1 → H2 par section), landmarks (`<nav>`, `<main>`, `<footer>`) cohérents avec le reste du site.
- Ancres réelles dans l'URL (`#protection-des-donnees`, etc.), navigables au clavier, focus visible (`:focus-visible` du système de design existant).
- Boutons « Copier » avec `aria-label`, confirmation visuelle ET textuelle (pas seulement une couleur).
- Le bouton « Gérer mes préférences cookies » réutilise le vrai système modal existant (piège de focus, `inert`, Échap, retour du focus au déclencheur) — rien de nouveau à auditer ici, c'est le même composant que sur les autres pages.
- `prefers-reduced-motion` respecté (hérité du socle commun + règle dédiée dans `css/legal.css` (anciennement `css/mentions-legales.css`, renommé le 2026-09-30 : socle commun des pages juridiques)).
- Cibles tactiles : boutons Copier 30×30px avec zone de clic élargie par le padding du conteneur — un peu petit dans l'absolu (WCAG recommande 24×24px minimum, donc conforme, mais 44px serait plus confortable) ; acceptable pour une action secondaire répétée, pas un point bloquant.

Non testé dans cette mission : lecteur d'écran réel (VoiceOver/NVDA), zoom navigateur au-delà de 200 %, Safari/Firefox — mêmes limites que les sessions précédentes sur ce projet.

---

## I. Performance

- **Aucune nouvelle image** : contrairement à `coordination.html` ou `peb-wallonie-bruxelles.html`, cette page est entièrement typographique (grille, icônes SVG en sprite inline, dégradés CSS) — aucun pipeline d'optimisation d'image à maintenir, aucun risque de photo hors-sujet.
- JS de page (`js/legal.js` (anciennement `js/mentions-legales.js`, renommé le 2026-09-30 : socle commun des pages juridiques)) : ~2 Ko non minifié, aucune dépendance, 3 fonctions (sommaire actif, copier, imprimer).
- `js/site-content.js` a grossi de 22 → 23 Ko avec la nouvelle entrée du registre (budget de test mis à jour en conséquence, avec justification documentée dans le commentaire du test — même pratique que les ajouts précédents).
- Aucune police, script ou feuille de style supplémentaire chargée : la page réutilise à 100 % le socle commun déjà mis en cache par les autres pages du site.

## J. Fonctionnalités

| Élément | État |
|---|---|
| Sommaire + ancres | ✅ fonctionnel, surlignage actif vérifié en direct |
| Boutons Copier | ✅ Clipboard API avec repli `execCommand` pour navigateurs anciens |
| Impression / PDF | ✅ feuille `@media print` dédiée (masque header/footer/sommaire/chiffres fantômes, boutons copier) |
| Préférences cookies | ✅ ouvre le vrai centre de préférences existant (vérifié en direct, pas un lien factice) |
| Sélecteur de langue | ✅ 10 langues, clés vérifiées par `node scripts/check-i18n.js` (0 erreur) |
| En-tête / pied de page | ✅ composants globaux inchangés, lien « Mentions légales » du pied de page maintenant réel sur les 15 pages du site |
| Responsive | ✅ 375 px vérifié en direct (2 bugs trouvés et corrigés), autres points de rupture par lecture de code |
| SEO | ✅ canonical, Open Graph, JSON-LD (Organization + BreadcrumbList), `node scripts/build-seo.js --check` propre |
| Assistant (chatbot) | ✅ reste fonctionnel (composant global inchangé) ; la page est maintenant connue du moteur de recherche interne et de l'assistant (entrée `PAGES` dans `js/site-content.js`) |

---

**Action supplémentaire effectuée, hors périmètre strict mais nécessaire à la cohérence** : le pied de page de TOUTES les pages du nouveau site affichait encore un numéro de TVA factice (« BE0XXX.XXX.XXX », un espace réservé jamais rempli). Comme cette mission vérifie et publie le vrai numéro, laisser un faux numéro à côté aurait créé une incohérence flagrante — remplacé partout par la valeur vérifiée « BE 1027.725.391 ».
