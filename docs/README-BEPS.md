# Formation BEPS — Premier secours — guide de la page et de son intégration

Page : **`formation-beps-premiers-secours.html`** (route à plat, comme `formations.html`).
Technologie du site inchangée : HTML/CSS/JS vanilla, aucun build. Construite sur le même
patron que la page Nacelles — voir `docs/README-NACELLES.md`.

## Architecture en une vue

| Rôle | Fichier |
|---|---|
| **Source unique des faits** (route, tarif, durée, langues, format, public, gestes enseignés, mots-clés, visuels) | `js/trainings-data.js` (`TRAININGS.beps`) |
| Page (header/footer/CSS de base **réutilisés** des autres pages) | `formation-beps-premiers-secours.html` |
| Styles propres à la page | `css/formation-beps.css` |
| Logique : `initHeader` · `initFooterStatus` · `initScrollReveal` · `initAccordions` · `initTabs` · `initChain` · `initFaqSchema` · `initSmoothScroll` | `js/formation-beps.js` |
| Titre complet / résumé / durée / format / langues (10 langues, servent partout : recherche, cartes, assistant) | `js/i18n-data-common.js` (`dd.beps_*`) |
| Visuels web calibrés | `assets/images/beps/` (originaux intacts dans `assets/originaux/beps/` et `assets/originaux/formations/beps.jpg`) |

Le registre alimente : la page (SEO/JSON-LD Course), la **recherche** (résultat riche : miniature,
faits clés), l'**assistant** (`knowledge.js` + copie serveur générée `site.generated.ts`) et le
**parcours d'inscription** (`registration-data.js` lit le tarif dans le registre — 70 €).
`tests/trainings.test.js` échoue si l'un d'eux diverge.

## Faits confirmés (source : fiche BEPS publiée par Wisy Safety)

- **Durée** : 15 heures au total, réparties en sessions ; présence à l'intégralité du programme
  requise pour recevoir le certificat.
- **Tarif** : 70 €, encadrement et matériel pédagogique inclus (statut TVA non précisé par la
  source → jamais affiché « HT » ni « TTC », voir `Trainings.formatPrice`).
- **Certificat** : certificat de **participation** attestant le suivi complet du programme
  (jamais présenté comme un agrément ou une certification officielle : voir `unconfirmed`
  dans `js/trainings-data.js`).
- **Langues** : français, néerlandais, anglais.
- **Public** : toute personne, aucun prérequis médical ou technique.
- **Six gestes enseignés** (section « Face à une urgence ») : réanimation & défibrillation,
  position latérale de sécurité, étouffement & désobstruction, hémorragies & plaies, malaises &
  brûlures, alerter le 112.

## Modifier le contenu

- **Durée, tarif, langues, gestes enseignés** : `js/trainings-data.js` (`TRAININGS.beps`), puis
  le texte affiché dans `formation-beps-premiers-secours.html` (contenu en français uniquement,
  voir plus bas) — les tests signalent tout écart de tarif/URL/registre.
- **FAQ** : les 7 questions/réponses de la section `#faq` sont la SEULE source du schéma
  `FAQPage` — celui-ci est injecté à l'exécution par `initFaqSchema()` dans
  `js/formation-beps.js` (jamais dupliqué à la main dans le `<head>`, comme `faq.html` /
  `js/faq-page.js`).

## i18n : page en français uniquement (comme le Centre d'aide)

Contrairement à la page Nacelles (traduite intégralement via `js/i18n-data-nacelles.js`), le
contenu propre à cette page (hero, chaîne des secours, gestes, programme, méthode, FAQ…) est
rédigé **en français uniquement** — même choix que `faq.html` (voir `docs/README-FAQ.md`).
Seul le chrome partagé (header, footer, recherche, assistant) reste traduit dans les 10 langues
via le système i18n existant. Les clés `dd.beps_full/_summary/_dur/_fmt/_langs` (10 langues,
`js/i18n-data-common.js`) restent nécessaires car elles alimentent la recherche, la carte
catalogue et l'assistant sur **toutes** les pages, pas seulement celle-ci.

## Règle de véracité

Rien n'affirme CACES / accréditation officielle / agrément / diplôme d'État : ces points ne sont
pas confirmés (`unconfirmed` dans le registre). « Brevet européen de premiers secours » et
« certificat de participation » sont les seules formulations utilisées, conformes à la fiche
source. Le tarif (70 €) et la durée (15 heures) sont les seuls chiffres confirmés : ne jamais
en afficher d'autres (ni « HT », ni « TTC », ni un nombre de participants).

## Images

**Photo de formation réelle** (hero de la page + miniature de recherche + carte du catalogue) :
`assets/originaux/formations/beps.jpg` → `assets/images/beps/beps-hero-1024.webp` et
`beps-thumb-192.webp`, générés par `scripts/optimize-images.py` (fonction `beps()`). La même
photo reste utilisée telle quelle pour la carte de `formations.html`
(`assets/images/formations/beps.webp`, généré séparément par `formations()`).

**Illustrations d'accent** (petits badges ronds, section « Pourquoi Wisy Safety ») : fournies par
Wisy Safety, rangées dans `assets/originaux/beps/` et recadrées en carré (240×240) par
`scripts/optimize-images.py` :

| Original (`assets/originaux/beps/`) | Dérivé (`assets/images/beps/`) |
|---|---|
| `trousse-secours-illustration.jpg` | `trousse-secours-illustration-240.webp` |
| `mascotte-premiers-secours.jpg` | `mascotte-premiers-secours-240.webp` |
| `journee-mondiale-premiers-secours.jpg` | `journee-mondiale-premiers-secours-240.webp` |
| `geste-secouriste-illustration.jpg` | `geste-secouriste-illustration-240.webp` |

Ce sont des illustrations génériques (pas des photos de formations Wisy Safety) : elles sont
volontairement affichées **petites**, en badges ronds avec un traitement de couleur unifié
(`mix-blend-mode: luminosity` sur fond épinette dans `css/formation-beps.css`) plutôt qu'en
grande photographie de hero, pour rester cohérentes entre elles et avec la charte. Remplacer par
de vraies photos de session Wisy Safety améliorerait encore la crédibilité de la page.

## Lancer / tester

```bash
node --test tests/*.test.js               # (Node ≥ 18) — aucune dépendance
python3 scripts/optimize-images.py        # régénère les dérivés WebP si un original change
node scripts/build-seo.js                 # régénère sitemap.xml, robots.txt, le bloc SEO du <head>
node scripts/sync-edge.js                 # régénère la copie de l'assistant pour l'Edge Function
```
