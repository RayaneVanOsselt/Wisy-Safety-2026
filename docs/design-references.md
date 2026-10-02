# Références de design — pages « fiche technique »

> **Transparence** : le brief initial citait 21st.dev et Refero ; ces sites n'avaient pas été ouverts pour la première
> version. Pour la refonte du 02/10/2026 (une direction artistique par formation), 6 systèmes de design de
> styles.refero.design ont été étudiés comme **bibliothèque de principes** (hiérarchie typographique, grilles, rythme
> clair/sombre, retenue des accents) : aucune interface, aucun composant et aucun code n'en est repris.

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
| **L'essentiel toujours visible** | Les faits sourcés suivent immédiatement l'en-tête, mis en forme selon la formation (tableau de bord, fiche signalétique, fiche technique) ; les boutons restent dans l'en-tête, y compris sur mobile, et une barre d'action apparaît après le hero. | `.vlh-board`, `.dii-sheet`, `.fib-spec`, `.fx-mobile-bar`, `js/formation-fiche.js` |
| **La preuve à côté du fait** | Date de vérification sous le titre, section « Sources » numérotée, chaque élément factuel relié à sa source (`data-src`). | `.fx-verified`, `.fx-src` |
| **Le texte officiel, mis en forme comme tel** | Diisocyanates : plaque typographique (référence, 4 règles, seuil) à la place d'une photo. La mention d'emballage est citée mot pour mot. | `.fx-plate` |
| **Tableaux lisibles partout** | Sur mobile, les tableaux de comparaison passent en cartes (`data-label`). Les tableaux larges des articles défilent, focalisables au clavier et nommés par leur titre. | `.fx-table--stack`, `.am-table-wrap` |
| **Lecture longue confortable** | Articles limités à environ 70 caractères par ligne, interlignage 1,7, intertitres h2/h3, encadré « À retenir ». | `css/article-modal.css` |
| **Accessibilité d'abord** | `<dialog>` natif (focus sur le titre, Échap, retour du focus, bouton retour du navigateur). Onglets ARIA avec flèches (sens inversé en RTL). Contrastes AA (numéros en sarcelle, étapes en granit). Texte masqué « (nouvel onglet) ». | `js/article-modal.js`, `js/formation-fiche.js` |
| **Mouvement sobre** | Ouverture de la modale en 220 ms (opacité et léger déplacement), coupée si `prefers-reduced-motion`. | `css/article-modal.css` |
| **Outil plutôt que discours** | « Suis-je concerné ? » : 3 questions tirées du règlement, résultat annoncé (`aria-live`), rien d'envoyé ni d'enregistré. | `[data-fx-check]` |
| **Images honnêtes** | Visuels IA légendés « Illustration ». Formats AVIF/WebP en 480/960/1600 px, dimensions déclarées, chargement différé hors écran. | `scripts/optimize-images.py`, `docs/images-manifest.md` |
| **10 langues, dont l'arabe** | Mise en page en propriétés logiques (`inset-inline`, `padding-inline-start`), vérifiée en RTL. | `css/formation-fiche.css` |

## Une direction artistique par formation (02/10/2026)

Retour du propriétaire : les trois fiches étaient identiques, « on va croire que c'est du copier-coller ». Chaque
formation a maintenant sa composition, sur un socle commun (palette stricte, Poppins/Inter, filets fins, sections
numérotées, sources visibles, turquoise réservé à l'action principale). Aucun texte n'a été réécrit : les éléments
existants (`data-i18n`, `data-src`, liens) ont été déplacés tels quels.

| Formation | Idée | Signature | Fichier |
|---|---|---|---|
| **VCA Ligne hiérarchique** — « Encadrer » | Éditorial et humain | En-tête en deux volets : panneau noir jais + photo de l'encadrant à fond perdu. Examen en grands chiffres (VOL-VCA · 70 · 10). Numéros de section évidés en marge, programme officiel sur une bande épinette, colonne VOL-VCA en négatif dans le comparatif, ressources en liste éditoriale. | `css/fiche-vlh.css` |
| **Diisocyanates** — « Le texte réglementaire » | Clinique, documentaire | En-tête clair où la plaque du règlement tient lieu d'image (en-tête noir, cadre net), mot clé surligné, bande rayée de signalisation. Fiche signalétique en 4 colonnes, sections en paragraphes (§) avec les sources en notes de marge collantes, outil « Suis-je concerné ? » sur panneau sombre. Angles droits. | `css/fiche-dii.css` |
| **Fibre optique** — « Le chemin de la lumière » | Technique, catalogue industriel | En-tête sombre, titre sur toute la largeur traversé par un trait turquoise d'un pixel qui sort de l'écran, photo posée comme une planche. Fiche technique en grands chiffres (3 · 6 · 4), parcours relié par une ligne et des nœuds carrés, modules en fiche de spécification, onglets soulignés, repères techniques sur bande sombre. | `css/fiche-fib.css` |

Socle commun ajouté à `css/formation-fiche.css` : `.fx-theme`, `.fxt-practical`, `.fxt-bleed` (bande pleine largeur
sans balisage supplémentaire) et `.fxt-dark` (texte et sources sur fond sombre, contrastes AA vérifiés).

## Vérifications faites

- Mobile 375 × 812 : le titre et les deux premiers faits clés sont visibles sans défiler. Aucun défilement horizontal.
- Bureau : colonne latérale collante limitée à la hauteur de l'écran (défilement interne si besoin).
- Contrastes contrôlés dans le navigateur, avec correction de deux couleurs trop claires.

## Pistes non faites

- Une vraie photo de session de formation (avec l'accord des personnes) à la place des visuels IA.
- La mutualisation de l'en-tête et du socle CSS dupliqués dans chaque page (dette existante, voir `docs/decisions.md`).
