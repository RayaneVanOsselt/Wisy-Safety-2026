# Références de design — pages « fiche technique »

> **Transparence** : le brief cite 21st.dev et Refero comme sources d'inspiration. **Aucun de ces deux sites n'a été
> ouvert pendant cette mission** : aucun composant, aucune capture et aucun code n'en vient. Les pages s'appuient sur
> le design system existant du site et sur les principes ci-dessous, appliqués et vérifiés dans le navigateur.

## Point de départ : le design system du site

- Tokens existants, sans nouvelle couleur : `--epinette #1F6F64`, `--sarcelle #2F7D8C`, `--turquoise #48D6C2`,
  `--brume #3FA69B`, `--creme #F4FAF9`, `--granit #5E6D6A`, `--noir-jais #1B2D28`. Polices Poppins (titres) et Inter
  (texte), auto-hébergées.
- Gabarit de référence : `formation-vca-base.html` (hero, « L'essentiel », sections numérotées, sources datées, barre
  d'action mobile). Les nouvelles pages en reprennent l'en-tête, le pied de page et les boutons.

## Principes appliqués

| Principe | Mise en œuvre | Fichier |
|---|---|---|
| **Une fiche technique se lit, elle ne se vend pas** | Pas de compteurs animés, de badges « certifié » ni de promesses. Sections numérotées 01, 02… avec un titre qui dit ce qu'on y trouve. | `css/formation-fiche.css` (`.fx-sec`, `.fx-num`) |
| **L'essentiel toujours visible** | Colonne latérale collante « Informations clés » (faits sourcés + boutons) sur grand écran. Sur mobile, ces faits suivent le titre et une barre d'action apparaît après le hero. | `.fx-aside`, `.fx-mobile-bar`, `js/formation-fiche.js` |
| **La preuve à côté du fait** | Date de vérification sous le titre, section « Sources » numérotée, chaque élément factuel relié à sa source (`data-src`). | `.fx-verified`, `.fx-src` |
| **Le texte officiel, mis en forme comme tel** | Diisocyanates : plaque typographique (référence, 4 règles, seuil) à la place d'une photo. La mention d'emballage est citée mot pour mot. | `.fx-plate` |
| **Tableaux lisibles partout** | Sur mobile, les tableaux de comparaison passent en cartes (`data-label`). Les tableaux larges des articles défilent, focalisables au clavier et nommés par leur titre. | `.fx-table--stack`, `.am-table-wrap` |
| **Lecture longue confortable** | Articles limités à environ 70 caractères par ligne, interlignage 1,7, intertitres h2/h3, encadré « À retenir ». | `css/article-modal.css` |
| **Accessibilité d'abord** | `<dialog>` natif (focus sur le titre, Échap, retour du focus, bouton retour du navigateur). Onglets ARIA avec flèches (sens inversé en RTL). Contrastes AA (numéros en sarcelle, étapes en granit). Texte masqué « (nouvel onglet) ». | `js/article-modal.js`, `js/formation-fiche.js` |
| **Mouvement sobre** | Ouverture de la modale en 220 ms (opacité et léger déplacement), coupée si `prefers-reduced-motion`. | `css/article-modal.css` |
| **Outil plutôt que discours** | « Suis-je concerné ? » : 3 questions tirées du règlement, résultat annoncé (`aria-live`), rien d'envoyé ni d'enregistré. | `[data-fx-check]` |
| **Images honnêtes** | Visuels IA légendés « Illustration ». Formats AVIF/WebP en 480/960/1600 px, dimensions déclarées, chargement différé hors écran. | `scripts/optimize-images.py`, `docs/images-manifest.md` |
| **10 langues, dont l'arabe** | Mise en page en propriétés logiques (`inset-inline`, `padding-inline-start`), vérifiée en RTL. | `css/formation-fiche.css` |

## Vérifications faites

- Mobile 375 × 812 : le titre et les deux premiers faits clés sont visibles sans défiler. Aucun défilement horizontal.
- Bureau : colonne latérale collante limitée à la hauteur de l'écran (défilement interne si besoin).
- Contrastes contrôlés dans le navigateur, avec correction de deux couleurs trop claires.

## Pistes non faites

- Une vraie photo de session de formation (avec l'accord des personnes) à la place des visuels IA.
- La mutualisation de l'en-tête et du socle CSS dupliqués dans chaque page (dette existante, voir `docs/decisions.md`).
