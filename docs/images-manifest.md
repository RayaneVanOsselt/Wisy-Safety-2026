# Manifeste des images — formations VCA Ligne hiérarchique, Diisocyanates, Fibre optique

Mis à jour le **1er octobre 2026**. Convention du dépôt conservée (`assets/README.md`) : **originaux** dans
`assets/originaux/<thème>/` (jamais chargés par les pages), **dérivés** générés par `scripts/optimize-images.py` dans
`assets/images/<thème>/`. Aucun fichier supprimé : déplacements par `git mv` (l'historique suit les fichiers).

## 1. Classement des 9 fichiers ajoutés le 01/10/2026 (commit `ca4dfdd`)

| Ancien chemin | Nouveau chemin (original) | Usage | Dimensions | Poids original | Origine | Statut |
|---|---|---|---|---|---|---|
| `assets/images/diiso2.jpg` | `assets/originaux/diisocyanates/diisocyanates-laboratoire-flacons.jpg` | carte + modale de l'article « Diisocyanates : définition, familles et usages » ; miniature de recherche et carte de partage de la page | 2304×1792 | 961 Ko | **IA** (série Firefly de l'ancien site) | À remplacer par une photo réelle |
| `assets/images/diiso1.webp` | `assets/originaux/diisocyanates/diisocyanates-salle-formation-pictogrammes.webp` | article « Ce que dit le règlement (UE) 2020/1149 » | 2304×1792 | 132 Ko | **IA** | À remplacer par une photo réelle |
| `assets/images/diiso3.webp` | `assets/originaux/diisocyanates/substances-dangereuses-futs-combinaisons.webp` | article « Autres substances dangereuses » | 2304×1792 | 177 Ko | **IA** | À remplacer par une photo réelle |
| `assets/images/fibreoptique 1.webp` | `assets/originaux/fibre-optique/fibre-technicien-casque-reseau.webp` | article « Parcours professionnels dans la fibre optique » (modale + page autonome + carte de partage) | 2304×1792 | 185 Ko | **IA** | À remplacer par une photo réelle |
| `assets/images/fibreoptique2.webp` | `assets/originaux/fibre-optique/fibre-reseau-urbain-illustration.webp` | **aucun** : illustrait l'article « Optimisation des réseaux », jugé non publiable — aucun dérivé généré | 2304×1792 | 351 Ko | **IA** | Conservé, non publié |
| `assets/images/fibreoptique 3.webp` | `assets/originaux/fibre-optique/fibre-technicienne-coffret-cables.webp` | article « Devenir expert en fibre optique » (modale + page autonome + carte de partage) | 2304×1792 | 169 Ko | **IA** — l'image montre des étincelles : elle **ne représente pas** une soudure de fibre réaliste ; le texte alternatif ne le prétend pas | À remplacer **en priorité** |
| `assets/images/vcaligne1.webp` | `assets/originaux/vca-ligne-hierarchique/vca-lh-briefing-equipe.webp` | dossier 01 « Communication hiérarchique » | 2304×1792 | 161 Ko | **IA** | À remplacer par une photo réelle |
| `assets/images/vcaligne2.webp` | `assets/originaux/vca-ligne-hierarchique/vca-lh-encadrants-chantier.webp` | dossier 02 « Erreurs fréquentes de la hiérarchie » | 2304×1792 | 126 Ko | **IA** | À remplacer par une photo réelle |
| `assets/images/vcaligne3.webp` | `assets/originaux/vca-ligne-hierarchique/vca-lh-session-formation.webp` | dossier 03 « Culture sécurité » | 2304×1792 | 87 Ko | **IA** (texte d'écran « VCA Safety Leadership » généré) | À remplacer par une photo réelle |

Contrôle : `grep -rn "diiso[123]\|fibreoptique\|vcaligne"` sur le HTML, le CSS, le JS et les scripts → **0 résultat**
(seuls ce manifeste et l'audit citent les anciens noms, à titre d'historique). Doublons par empreinte SHA-256 : aucun.
Métadonnées : aucun EXIF ni GPS dans les originaux ; les dérivés sont de nouvelles images, sans métadonnées.

## 2. Dérivés générés (`python3 scripts/optimize-images.py`, fonction `fiches()`)

Chaque visuel publié → `<nom>-480`, `-960`, `-1600` en **AVIF** (qualité 56) et **WebP** (qualité 76), servis par
`<picture>` + `srcset` + `sizes`, avec `width`/`height` explicites et `loading="lazy"` (aucun n'est l'image LCP).

| Visuel | 480 WebP / AVIF | 960 WebP / AVIF | 1600 WebP / AVIF |
|---|---|---|---|
| vca-lh-briefing-equipe | 25 / 19 Ko | 61 / 48 Ko | 111 / 94 Ko |
| vca-lh-encadrants-chantier | 18 / 15 Ko | 45 / 37 Ko | 85 / 73 Ko |
| vca-lh-session-formation | 15 / 11 Ko | 33 / 27 Ko | 60 / 54 Ko |
| diisocyanates-laboratoire-flacons | 18 / 14 Ko | 44 / 35 Ko | 84 / 69 Ko |
| diisocyanates-salle-formation-pictogrammes | 21 / 15 Ko | 50 / 39 Ko | 93 / 77 Ko |
| substances-dangereuses-futs-combinaisons | 25 / 19 Ko | 64 / 50 Ko | 122 / 100 Ko |
| fibre-technicien-casque-reseau | 27 / 21 Ko | 68 / 54 Ko | 130 / 107 Ko |
| fibre-technicienne-coffret-cables | 25 / 18 Ko | 63 / 45 Ko | 119 / 90 Ko |

Toutes sous le plafond de 200 Ko de `tests/perf-budget.test.js` (l'original `diiso2.jpg`, 961 Ko, n'est plus chargé).

Autres dérivés :

| Fichier | Source | Usage |
|---|---|---|
| `assets/images/vca-ligne-hierarchique/vca-lh-thumb-192.webp` (6 Ko) | `assets/originaux/formations/vca-hierarchique.jpg` (photo du catalogue, origine non documentée) | miniature des résultats de recherche |
| `assets/images/diisocyanates/diisocyanates-thumb-192.webp` (7 Ko) | `diisocyanates-laboratoire-flacons.jpg` (IA) | idem |
| `assets/images/fibre-optique/fibre-optique-thumb-192.webp` (4 Ko) | `assets/originaux/formations/fibre-optique.jpg` (image de synthèse du catalogue, origine non documentée) | idem |
| `assets/images/partage/formation-vca-ligne-hierarchique-1200x630.jpg` (64 Ko) | photo du catalogue | Open Graph / carte X de la page |
| `assets/images/partage/formation-diisocyanates-1200x630.jpg` (71 Ko) | IA | idem |
| `assets/images/partage/formation-fibre-optique-1200x630.jpg` (58 Ko) | image du catalogue | idem |
| `assets/images/partage/article-fibre-parcours-1200x630.jpg` (94 Ko) · `article-fibre-expert-1200x630.jpg` (90 Ko) | IA | Open Graph des 2 pages d'articles fibre |

## 3. Images de tête des pages

- **VCA Ligne hiérarchique** : `assets/images/formations/vca-hierarchique.webp` (1000×800, déjà utilisée par le catalogue).
- **Fibre optique** : `assets/images/formations/fibre-optique.webp` (1000×600, déjà utilisée par le catalogue).
- **Diisocyanates** : **pas de photo** — la tête de page est une « plaque réglementaire » typographique (le brief demande
  d'ouvrir sur le cadre réglementaire) ; la photo du catalogue (500×333) est trop petite pour un affichage large.

Origine et licence des photos du catalogue : **non documentées** (`docs/image-sources.md`) — à confirmer par Wisy Safety.

## 4. Textes alternatifs

Les `alt` décrivent ce que l'on voit **sans prétendre** montrer des participants, des formateurs ou les locaux de Wisy
Safety (ex. « Illustration : un encadrant en gilet haute visibilité s'adresse à une équipe dans un entrepôt »). Ils sont
traduits dans les 10 langues (`data-i18n-attr="alt:…"`).

## 5. Fichiers non référencés

Hors `originaux/`, aucun : `tests/assets-structure.test.js` échoue si un fichier d'`assets/images/` n'est cité par
aucune page, feuille de style ou script.
