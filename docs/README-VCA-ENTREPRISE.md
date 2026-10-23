# Page « VCA Entreprise » — guide de maintenance

Page : `vca-entreprise.html` (accompagnement des entreprises vers la certification VCA*, VCA**, VCA-P).
C'est un **service** d'accompagnement, pas une formation : dans le registre il est décrit à part
(`vcaEntreprise` dans `js/trainings-data.js`, liste `services` de `js/site-content.js`) et son nœud de données
structurées est `Service` (jamais `Course`).

## Fichiers

| Élément | Fichier |
|---|---|
| Faits affichés (niveaux, étapes, tarif indicatif, mots-clés, affirmations interdites) | `js/trainings-data.js` (`VCA_ENTREPRISE`) |
| Textes traduits (10 langues) | `js/i18n-data-vcae.js` |
| Comportements (lecteur vidéo, mini-diagnostic, suivi des clics) | `js/vca-entreprise.js` |
| Style | `css/vca-entreprise.css` |
| Inscription (catalogue, identifiant `vca-entreprise`) | `js/registration-data.js` |
| Liens « Parler à un conseiller » | `contact.html?subject=vca-entreprise` : le formulaire de contact présélectionne « Conseil & accompagnement sécurité » et ajoute le détail « VCA Entreprise » à la demande (voir `docs/README-FORMULAIRES.md`) |

## Visuels et vidéo

| Original (non publié tel quel) | Dérivés publiés | Outil |
|---|---|---|
| `assets/originaux/vca-entreprise/vca-entreprise-source.mp4` (vidéo fournie, ≈ 35 Mo) | `assets/videos/vca-entreprise/vca-entreprise-720.mp4` et `vca-entreprise-1080.mp4` (H.264, « faststart », son conservé) | `scripts/encode-video.swift` (macOS, aucune installation ; la commande est en tête du fichier) |
| `assets/originaux/vca-entreprise/poster-frame.jpg` | affiches `assets/images/vca-entreprise/poster-640/1024/1600` (AVIF + WebP), miniature de recherche `thumb-192.webp`, carte de partage `assets/images/partage/vca-entreprise-1200x630.jpg` | `python3 scripts/optimize-images.py` (`vca_entreprise()`) |
| `assets/originaux/vca-entreprise/mascotte.png` | `assets/images/vca-entreprise/mascotte-240/480` (AVIF + WebP, marges transparentes retirées) | `python3 scripts/optimize-images.py` (`vca_entreprise()`) |

L'original reste dans `assets/originaux/` pour pouvoir régénérer les dérivés ; il n'est chargé par aucune page.

## Règles

- Aucun agrément, aucune certification de Wisy Safety, aucun taux de réussite ni aucune promesse de délai ne doit être
  affiché sans confirmation écrite (voir `unconfirmed` dans `js/trainings-data.js` et `tests/credibility.test.js`).
- Le tarif affiché est celui du registre ; le modifier uniquement dans `js/trainings-data.js`, puis
  `node scripts/build-seo.js` pour régénérer les données structurées.
