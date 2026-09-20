# Formation Nacelles Élévatrices — guide de la page et de son intégration

Page : **`formation-nacelles-elevatrices.html`** (route à plat, comme `formations.html`).
Technologie du site inchangée : HTML/CSS/JS vanilla, aucun build.

## Architecture en une vue

| Rôle | Fichier |
|---|---|
| **Source unique des faits** (route, prix HT, durée, langues, format, public, types, mots-clés, visuels) | `js/trainings-data.js` |
| Page (header/footer/CSS de base **réutilisés** des autres pages) | `formation-nacelles-elevatrices.html` |
| Styles propres à la page | `css/formation-nacelles.css` |
| Logique : `initHeader` · `initFooterStatus` · `initScrollReveal` · `initAccordions` · `initFocusTrap` · `initNacelleModal` · `initSmoothScroll` + objet `nacelles` (contenu du modal) | `js/formation-nacelles.js` |
| Scènes automatiques 5 s (module **réutilisable**) | `js/scenes.js` |
| Traductions de la page (fr = miroir du HTML, en, nl) | `js/i18n-data-nacelles.js` |
| Titre complet / résumé / durée / format / langues (10 langues, servent partout) | `js/i18n-data-common.js` (`dd.nacelle_*`) |
| Visuels web calibrés | `assets/images/nacelles/` (photos d'origine intactes dans `assets/originaux/nacelles/`) |

Le registre alimente : la page (SEO/JSON-LD), la **recherche** (résultat riche : miniature,
faits clés), l'**assistant** (`knowledge.js` + copie serveur générée `site.generated.ts`) et le
**parcours d'inscription** (`registration-data.js` lit le prix dans le registre).
`tests/trainings.test.js` échoue si l'un d'eux diverge.

## Modifier le contenu

- **Prix, durée, langues, public** : `js/trainings-data.js`, puis le texte affiché dans le HTML
  (`data-i18n="nac.price_value"` …) et `js/i18n-data-nacelles.js` — les tests signalent tout écart.
- **Textes d'un type de nacelle (modal)** : objet `nacelles` de `js/formation-nacelles.js`
  (français, source). Traductions : clés `nac.t_<type>_desc|principle|uses|pros|cons`
  (listes séparées par `|`).
- **Une langue de plus** (de, it…) : ajouter un bloc `m("de", { … })` dans
  `js/i18n-data-nacelles.js` avec les mêmes clés. Sans cela, le corps de la page retombe sur le
  français (le header, le footer et le titre `dd.nacelle_*` restent traduits dans les 10 langues).
- **Témoignages** : la section existe mais est **masquée** (`hidden`) tant qu'aucun témoignage réel
  n'est fourni. Remplacer les 3 placeholders `[Nom du participant] / [Entreprise] /
  [Témoignage à renseigner]` puis supprimer l'attribut `hidden` de `#temoignages`.

## Règle de véracité

Rien n'affirme CACES / R486 / certification / agrément / reconnaissance : ces points ne sont
pas confirmés (`unconfirmed` dans le registre). Les afficher exige d'abord leur confirmation.

## Images — association et calibrage

| Type | Photo d'origine (`assets/originaux/nacelles/`) | Dérivés (`assets/images/nacelles/`) |
|---|---|---|
| Ciseaux | `nacelle-ciseaux.jpg` (photo, 3:2) | `nacelle-ciseaux-{640,960,1440}.webp` |
| Araignée | `nacelle-araignee.webp` | `nacelle-araignee-{640,960}.webp` |
| Télescopique | `nacelle-telescopique.png` | `nacelle-telescopique-…` |
| Articulée | `nacelle-articulee.jpg` | `nacelle-articulee-…` |
| Sur camion | `nacelle-camion.jpg` (fond dégradé → blanc) | `nacelle-camion-…` |
| Verticale | `nacelle-verticale.webp` | `nacelle-verticale-…` |
| Automotrice | `nacelle-automotrice.webp` | `nacelle-automotrice-…` |

Chaque machine détourée est cadrée dans un canevas 4:3 blanc (960×720) avec la **même zone de
sécurité** (80 %) : aucune machine coupée, échelle visuelle homogène. Le hero, la carte du
catalogue, la miniature de recherche et l'image Open Graph dérivent de la photo « ciseaux ».

## Lancer / tester

```bash
python3 -m http.server 8080        # puis http://localhost:8080/formation-nacelles-elevatrices.html
node --test tests/                 # (Node ≥ 18) — 70+ tests, aucune dépendance
```
