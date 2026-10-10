# Page d'accueil (`index.html`)

Refonte du 2026-09-26. **L'en-tête et le pied de page n'ont pas été modifiés** (HTML, CSS et JavaScript identiques,
octet pour octet, à ceux des autres pages — `tests/home.test.js` le vérifie). Seul le contenu entre les deux a été
refait.

| Fichier | Rôle |
|---|---|
| `index.html` | Contenu de la page (le socle en ligne — en-tête, pied de page, boutons partagés — est inchangé) |
| `css/home.css` | Styles de l'accueil uniquement (tout est préfixé `.home-*`, rien ne touche au chrome partagé) |
| `js/home.js` | Entrée de marque (pilotage), entrée du hero, apparitions au défilement, compteurs, vidéos, halo au pointeur |
| `js/i18n-data-home.js` | Textes propres à l'accueil, en 10 langues |
| `tests/home.test.js` | Garde-fous : en-tête / pied intacts, liens réels, faits du registre, aucune affirmation interdite |

## Déroulé de la page

1. **Hero** — titre en trois lignes, deux actions (« Découvrir nos formations » → `formations.html`, « Former mon
   équipe » → formulaire de devis `contact.html#wisy-contact-form`), l'écran de la **vidéo du logo** et deux cartes
   flottantes (VCA de base, centre d'Anderlecht).
2. **Confiance** — logos des 6 partenaires (déjà présents sur le site) et les chiffres déjà publiés (10+ ans, 500+,
   250+, 100 % — les mêmes que la page Contact et l'agenda, voir `tests/agenda.test.js`).
3. **Parcours** — « Je me forme » (→ `formations.html`) / « Je forme mes équipes » (→ « Demander un devis »,
   formulaire de `contact.html`).
4. **Formations** — les six formations du registre `js/site-content.js` + le certificateur PEB. Titres, descriptions
   et durées reprennent les clés partagées (`dd.*`, `search.*`) : un seul texte par information.
5. **VCA** (bande sombre) — carte « billet » VCA Base (faits confirmés de `js/trainings-data.js`), carte « Examen
   officiel B-VCA » (jauge 64,5 %, 40 questions, 60 minutes : chiffres officiels du registre, source BeSaCC-VCA),
   puis VCA ligne hiérarchique et les deux articles.
6. **Pourquoi Wisy Safety** — engagements tirés des textes existants (experts du terrain, théorie + pratique, centre
   équipé accessible en transports en commun, équipe joignable du lundi au jeudi de 10 h à 16 h).
7. **Comment ça marche** — les quatre étapes réelles de `inscription.html` (chaque étape est un lien).
8. **Le centre** — coordonnées, horaires, carte Google Maps (soumise au consentement « Fonctionnalités »).

> **Pas de section « VCA Entreprise » sur l'accueil** (retirée à la demande du propriétaire le 2026-09-26). Aucune
> page VCA Entreprise n'existe encore (le lien du menu est `href="#"`, comme « Coordination » et « Certificat », en-tête
> inchangé). Le bouton « Former mon équipe » et la carte « Je forme mes équipes » mènent au formulaire de devis réel
> (`contact.html#wisy-contact-form`). Le jour où la page existe : lui faire pointer ces deux liens si souhaité, et retirer
> `nav.vca_entreprise` de la liste `KNOWN` de `tests/site-links.test.js` après avoir mis à jour le menu.

## La vidéo du logo

| Fichier | Usage |
|---|---|
| `assets/originaux/accueil/logo-animation.mp4` | Original fourni (720 × 1280, 8 s, avec piste audio) — jamais chargé par le site |
| `assets/videos/accueil/logo-animation-720.mp4` | Version web desktop : recadrée 4:5 (720 × 900), sans audio, ~0,9 Mo |
| `assets/videos/accueil/logo-animation-480.mp4` | Version web mobile (≤ 767 px) : 480 × 600, ~0,45 Mo |
| `assets/videos/accueil/logo-animation-debut.webp` | 1re image : affichée immédiatement (élément LCP, préchargée) |
| `assets/videos/accueil/logo-animation-fin.webp` | Image finale (logo complet) : mouvement réduit, économie de données, sans JavaScript |

La vidéo est jouée dans l'écran du hero (après l'événement `load`, quand elle est visible, une fois) ; elle ne sert
plus d'intro plein écran depuis le 2026-10-10 (voir « L'entrée de marque » ci-dessous).

**Remplacer la vidéo.** Déposer le nouvel original sous le même nom dans `assets/originaux/accueil/`, puis
(ffmpeg, recadrage 4:5 à partir de la ligne 250 — à ajuster si le logo n'est pas au même endroit) :

```bash
ffmpeg -i assets/originaux/accueil/logo-animation.mp4 -vf "crop=720:900:0:250" -an -c:v libx264 -profile:v high -preset slow -b:v 1000k -maxrate 1300k -bufsize 2000k -g 48 -pix_fmt yuv420p -movflags +faststart assets/videos/accueil/logo-animation-720.mp4
ffmpeg -i assets/originaux/accueil/logo-animation.mp4 -vf "crop=720:900:0:250,scale=480:600" -an -c:v libx264 -profile:v high -preset slow -b:v 520k -maxrate 700k -bufsize 1000k -g 48 -pix_fmt yuv420p -movflags +faststart assets/videos/accueil/logo-animation-480.mp4
ffmpeg -i assets/originaux/accueil/logo-animation.mp4 -vf "crop=720:900:0:250" -frames:v 1 -q:v 2 assets/originaux/accueil/logo-animation-debut.jpg
ffmpeg -sseof -0.05 -i assets/originaux/accueil/logo-animation.mp4 -vf "crop=720:900:0:250" -frames:v 1 -q:v 2 assets/originaux/accueil/logo-animation-fin.jpg
python3 scripts/optimize-images.py
```

(Les fichiers actuels ont été produits avec les mêmes réglages via AVFoundation, ffmpeg n'étant pas installé sur la
machine.) Puis `node --test tests/*.test.js` : `tests/perf-budget.test.js` vérifie les poids (720 px < 1 Mo,
480 px < 550 Ko, affiches < 100 Ko et assez détaillées pour compter comme LCP).

La vidéo de chantier de l'ancien hero (`hero-720.mp4`, `hero-1080.mp4`, `hero-1080.webm`) n'est plus utilisée par le
site : elle est conservée dans `assets/originaux/accueil/` (son affiche `poster.webp` reste produite par
`scripts/optimize-images.py`).

## L'entrée de marque (1re visite de la session)

Remplace, depuis le 2026-10-10, l'ancienne intro vidéo plein écran (≈ 11,5 s, qui dépendait du chargement d'une vidéo
de 0,9 Mo et ne s'affichait pas du tout si elle ne démarrait pas en 1,8 s). Inspirations : « Logo Trace Loader » et
« Arc Preloader Hero » (21st.dev) — le logo se dessine, puis un rideau à bord courbe dévoile la page — avec la retenue des
sites de référence analysés sur Refero Styles (une seule couleur d'accent, typographie calme, aucun effet gratuit).

| Instant | Ce qui se passe |
|---|---|
| 0 → 0,9 s | Rideau sombre (trame fine du hero en négatif). Le « W » du logo se trace au trait turquoise, puis se remplit aux couleurs du logo |
| 0,4 → 1,15 s | « Wisy Safety » monte lettre à lettre ; trait laser et signature « La sécurité comme une référence » (traduite) |
| 1,15 → 2,1 s | Le rideau se lève (bord courbe, liseré turquoise) ; le logo vole jusqu'à sa place exacte dans l'en-tête, puis passe le relais au vrai logo |
| 1,2 → 2,7 s | Le hero monte en parallaxe ; cartes flottantes et soulignement du titre |

**Performances et référencement.**
- **Aucun fichier chargé** : le logo est vectorisé et écrit dans `index.html` (≈ 4 Ko, même cadre `viewBox="106 96 289 319"`
  que `logo.png` / `logo-102.webp`, d'où un atterrissage au pixel près). La vidéo du logo, elle, n'est plus jamais
  chargée avant l'événement `load` (≈ 0,9 Mo de moins pendant le chargement critique de la 1re visite).
- **Tout est en CSS** (`css/home.css`, section 4 bis) : la séquence démarre au premier affichage sans attendre aucun
  script ; `js/home.js` ne fait que la compléter (vol du logo, fin, « passer »). Sans `js/home.js`, le rideau se lève
  quand même.
- **LCP inchangé** : sous le rideau, le hero est déjà peint (titre, texte, affiche du logo) ; son entrée ne joue que
  sur `transform`. Seules des propriétés composées sont animées (`transform`, `opacity`, + le tracé du petit logo) :
  aucune mise en page, aucun décalage (CLS nul, la scène est en `position: fixed` puis retirée du DOM).
- **Robots** : jamais d'entrée (Googlebot, Bingbot…) ; la scène est `hidden` + `aria-hidden` et ne contient aucun lien.

**Quand elle ne se joue pas** : 2e page vue de la session (clé `wisy-home-intro` en `sessionStorage`), lien avec ancre
(`index.html#centre`), onglet ouvert en arrière-plan, robots, mouvement réduit, économie de données, stockage
indisponible. **La passer** : clic ou toucher (le clic n'active rien sous le rideau), n'importe quelle touche, molette,
défilement ; le hero joue alors sa montée tout de suite. Garde-fou : scène retirée au plus tard après 4 s.

**Réglages.** Lever du rideau : `--e-lift` (`css/home.css`) **et** `ENTRANCE_LIFT` (`js/home.js`), toujours égaux
(`tests/home.test.js` le vérifie). Vol du logo : transition de `.home-entrance.is-docking`. Pour la désactiver : retirer
`r.classList.add("home-intro")` du script en tête de `index.html`.

**Revoir l'entrée** : ouvrir l'accueil dans un nouvel onglet (ou vider le `sessionStorage` du site).

## Modifier un texte

- Texte propre à l'accueil : `js/i18n-data-home.js` (même clé dans les 10 langues ; le HTML de `index.html` doit
  rester identique au français — `tests/i18n-static.test.js`). En français, espace insécable avant « ? » et « : ».
- Titre, description ou durée d'une formation : ce sont les textes partagés (`js/i18n-data-common.js`, clés `dd.*`)
  et le registre `js/site-content.js` / `js/trainings-data.js` — ils changent partout à la fois.
- Chiffres (10+, 500+, 250+, 100 %) : attributs `data-count` de `index.html` (le texte affiché doit rester le même
  nombre, pour les visiteurs sans JavaScript).

## Mouvement

Un seul système (`css/home.css`, section 3) : apparition 650 ms (opacité + 20 px), cascade de 70 ms, survols 350 ms,
courbe `cubic-bezier(.22, 1, .36, 1)`, uniquement `transform` / `opacity` / `translate` (entrée de marque : voir plus haut). Parallaxe légère (10–22 px)
sur les colonnes de logos, halo au pointeur sur les cartes (pointeur fin uniquement). `prefers-reduced-motion` :
aucune animation, aucune vidéo. Sans JavaScript : tout le contenu est visible.
