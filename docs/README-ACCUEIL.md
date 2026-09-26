# Page d'accueil (`index.html`)

Refonte du 2026-09-26. **L'en-tête et le pied de page n'ont pas été modifiés** (HTML, CSS et JavaScript identiques,
octet pour octet, à ceux des autres pages — `tests/home.test.js` le vérifie). Seul le contenu entre les deux a été
refait.

| Fichier | Rôle |
|---|---|
| `index.html` | Contenu de la page (le socle en ligne — en-tête, pied de page, boutons partagés — est inchangé) |
| `css/home.css` | Styles de l'accueil uniquement (tout est préfixé `.home-*`, rien ne touche au chrome partagé) |
| `js/home.js` | Intro du logo, entrée du hero, apparitions au défilement, compteurs, vidéos, halo au pointeur |
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

**Intro (1re visite de la session uniquement).** Décidée avant le premier affichage par le petit script du `<head>`
(`html.home-intro`) : l'écran de la vidéo est centré sur une scène sombre ; la vidéo est jouée en entier (8 s), puis le
logo complet reste affiché avec la signature « La sécurité comme une référence » (2,6 s) avant de rejoindre sa place
dans le hero pendant que le titre apparaît (≈ 11,5 s au total). L'en-tête reste utilisable pendant
toute l'intro. Elle s'arrête d'elle-même si la vidéo ne démarre pas en 1,8 s (réseau lent) et au plus tard après
16 s ; bouton « Passer l'intro », Échap, défilement, molette, toucher ou tabulation l'interrompent. Jamais d'intro :
mouvement réduit, économie de données, lien avec ancre (`index.html#centre`), robots, 2e visite de la session
(clé `wisy-home-intro` en `sessionStorage`). Réglages : `INTRO_HOLD`, `INTRO_START_TIMEOUT`, `INTRO_MAX`
en tête de `js/home.js`.

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

## Modifier un texte

- Texte propre à l'accueil : `js/i18n-data-home.js` (même clé dans les 10 langues ; le HTML de `index.html` doit
  rester identique au français — `tests/i18n-static.test.js`). En français, espace insécable avant « ? » et « : ».
- Titre, description ou durée d'une formation : ce sont les textes partagés (`js/i18n-data-common.js`, clés `dd.*`)
  et le registre `js/site-content.js` / `js/trainings-data.js` — ils changent partout à la fois.
- Chiffres (10+, 500+, 250+, 100 %) : attributs `data-count` de `index.html` (le texte affiché doit rester le même
  nombre, pour les visiteurs sans JavaScript).

## Mouvement

Un seul système (`css/home.css`, section 3) : apparition 650 ms (opacité + 20 px), cascade de 70 ms, survols 350 ms,
courbe `cubic-bezier(.22, 1, .36, 1)`, uniquement `transform` / `opacity` / `translate`. Parallaxe légère (10–22 px)
sur les colonnes de logos, halo au pointeur sur les cartes (pointeur fin uniquement). `prefers-reduced-motion` :
aucune animation, aucune vidéo. Sans JavaScript : tout le contenu est visible.
