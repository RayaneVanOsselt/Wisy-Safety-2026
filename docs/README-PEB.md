# Certificateur PEB — Wallonie & Bruxelles — guide de la page

Page : **`peb-wallonie-bruxelles.html`** (route à plat, comme les autres pages). Technologie du
site inchangée : HTML/CSS/JS vanilla, aucun build. Construite sur le même patron que les pages
Nacelles/BEPS (`docs/README-NACELLES.md`, `docs/README-BEPS.md`), avec un registre dédié plus riche
(deux Régions, deux procédures, jamais interchangeables).

## Architecture en une vue

| Rôle | Fichier |
|---|---|
| **Source unique des faits réglementaires et commerciaux** (autorité, conditions d'accès, procédure, examen, agrément, tarifs, sessions, sources) — SÉPARÉMENT pour la Wallonie et Bruxelles | `js/peb-data.js` (`window.PebData`) |
| Page (header/footer/CSS de base **réutilisés** des autres pages) | `peb-wallonie-bruxelles.html` |
| Styles propres à la page | `css/peb.css` |
| Logique : header/footer/reveal (repris des autres pages) + `initRegionSwitch` · `initEligibilityQuiz` · `initSessionFilter` · `initStickyBar` · `initAccordions` · `initFaqSchema` | `js/peb.js` |
| Entrée dans le registre du site (recherche, assistant, sitemap) | `js/site-content.js` → `PAGES` (`id: "peb"`) |
| Libellés traduits de la recherche (10 langues) | `js/i18n-data-search.js` (`search.page_peb_t/_d`) |
| Nœuds JSON-LD (Organisation, fil d'Ariane, 2 parcours `Course`) | `scripts/build-seo.js` (`NODES.pebCourses`, lit `js/peb-data.js`) |
| Provenance des 4 photos | `docs/image-sources.md` |

Le registre alimente : la page, la **recherche globale** (`js/search.js`, via `js/site-content.js`),
l'**assistant** (`knowledge.js` dérive `PAGES`, donc retrouve la page PEB automatiquement), le
**sitemap/SEO** (`scripts/build-seo.js`). `tests/peb.test.js` échoue si l'un d'eux diverge du
registre, ou si une affirmation interdite apparaît sur la page.

## RÈGLE D'OR — ce fichier ne remplace pas une vérification humaine

Toutes les données réglementaires de `js/peb-data.js` ont été vérifiées le **2026-09-24** par
recoupement multi-sources sur les domaines officiels (voir `sources` dans chaque bloc régional du
fichier). **Avant publication**, Wisy Safety doit :

1. **Confirmer si Wisy Safety est bien un centre reconnu/agréé** pour dispenser la formation PEB
   à Bruxelles. À la date de la vérification, Bruxelles Environnement listait **5 centres reconnus**
   pour l'habitation individuelle (Environment & Economics for Total Quality, UGEB-ULEB, Homegrade
   asbl, Mezure/Syntra Brussel, Certinergie) — **Wisy Safety n'y figurait pas**. Tant que ce point
   n'est pas confirmé, `js/peb-data.js` → `OFFER.wisyIsAccreditedCenter` reste `false` et la page ne
   doit **jamais** utiliser « agréé », « reconnu » ou « officiel » à propos de Wisy Safety lui-même
   (seulement à propos des autorités). `tests/peb.test.js` protège cette règle automatiquement.
2. Vérifier manuellement, en ouvrant les pages sources elles-mêmes (liens dans `sources`), les points
   listés comme **NON CONFIRMÉS** en tête de `js/peb-data.js` : durée de validité de l'agrément
   wallon, délai de traitement du dossier bruxellois, frais de participation à l'examen bruxellois
   lui-même (distinct des 50 € de droit de dossier), dates précises de sessions 2026.
3. Renseigner le tarif réel Wisy Safety dès qu'il est fixé (voir « Modifier le contenu » ci-dessous).

## Sources officielles vérifiées le 2026-09-24

**Wallonie** : https://www.wallonie.be/fr/demarches/devenir-certificateur-peb-batiment-residentiel ·
https://energie.wallonie.be/
**Bruxelles** : https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/devenir-certificateur-ou-certificatrice-peb ·
https://examen.environnement.brussels/fr/conditions ·
https://environnement.brussels/pro/services-et-demandes/agrements-et-enregistrements/formations-des-certificateurs-peb

Les sites concurrents (Certinergie Academy, Homegrade, IFAPME Dinant) ne servent **que** de repère
de positionnement commercial (`pricing.benchmark` dans `js/peb-data.js`) — jamais de source
réglementaire.

## Faits confirmés (résumé — le détail exact, avec citations, est dans `js/peb-data.js`)

- **Wallonie** : SPW Énergie (agrément délivré par le Ministre) ; diplôme admissible (architecte,
  ingénieur architecte, ingénieur civil, bio-ingénieur, ingénieur industriel, gradué/bachelier
  construction, ou autre diplôme supérieur couvrant l'énergie du bâtiment) **ou** 2 ans d'expérience
  professionnelle liée aux aspects énergétiques des bâtiments ; demande d'agrément **avant** la
  formation ; examen = **épreuve écrite puis épreuve orale** (jamais l'ancienne description
  « QCM + logiciel », qui ne s'applique pas à la Wallonie) ; agrément délivré sous 40 jours après le
  rapport de session.
- **Bruxelles** : Bruxelles Environnement ; formation reconnue puis **examen centralisé** (épreuve
  théorique 20 QCM + épreuve pratique avec le logiciel **Certibru-RES**, 4 h maximum, seuils 15/30 ·
  35/70 · 60/100) ; demande d'agrément **après** l'examen, avec un **droit de dossier de 50 €** (frais
  administratif, **pas** le prix de la formation) ; règlement d'examen en vigueur depuis le
  27/01/2026.
- **Non-résidentiel (Bruxelles)** : indisponible — citation exacte de Bruxelles Environnement :
  « Pour le moment, aucun centre de formation ne donne cette formation. » Jamais commercialisé par
  Wisy Safety tant que cela reste vrai (`OFFER.offersBrusselsNonResidential: false`).
  `tests/peb.test.js` vérifie que cette phrase reste affichée.
- **Bâtiments publics** : 3ᵉ agrément distinct (résidentiel / non-résidentiel / bâtiment public,
  dans les deux Régions), non détaillé tant que l'offre Wisy Safety n'est pas confirmée.
- **Cross-Région** : un agrément wallon ne permet pas d'exercer à Bruxelles, et inversement — pas de
  phrase officielle unique trouvée, mais fortement étayé par la structure (deux législations, deux
  autorités, deux examens, deux registres distincts). Voir la note dans `js/peb-data.js`.
- **Prix Wisy** : `js/peb-data.js` → `PRICING = { wallonia: null, brussels: null }` → toujours
  « Tarif sur demande » sur la page. Les montants concurrents (Certinergie Academy, Homegrade,
  IFAPME Dinant) ne sont que des repères, jamais un prix Wisy.

## Modifier le contenu

- **Tarif Wisy** : `js/peb-data.js` → `PEB_PRICING.wallonia` / `.brussels` (en **centimes**, comme
  `js/registration-data.js`). Une fois renseigné, mettre à jour l'affichage `Tarif sur demande` de
  `peb-wallonie-bruxelles.html` (section « Tarifs ») pour afficher le montant réel.
- **Statut de centre reconnu à Bruxelles** : `js/peb-data.js` → `OFFER.wisyIsAccreditedCenter`,
  puis retirer les formulations prudentes de la page une fois confirmé.
- **Sessions réelles** : ajouter des objets dans `js/peb-data.js` → `wallonia.sessions` /
  `brussels.sessions`, puis répliquer une carte `.peb-session-card[data-region="…"]` dans la section
  « Prochaines sessions » (le filtre `js/peb.js` → `initSessionFilter()` fonctionne déjà avec 0 ou N
  cartes).
- **FAQ** : les 12 questions/réponses de la section `#faq` sont la SEULE source du schéma `FAQPage`,
  injecté à l'exécution par `initFaqSchema()` dans `js/peb.js` (comme `formation-beps-premiers-secours.html`,
  jamais dupliqué à la main dans le `<head>`).
- **Vérificateur d'éligibilité** : envoie un e-mail via le **même compte EmailJS** que
  `contact.html` (mêmes `SERVICE_ID`/`TEMPLATE_ID`, champ `subject: "Certification PEB"` — déjà une
  option du gabarit existant, voir `contact.html` → `#wf-subject`). Le résultat affiché reste
  toujours qualifié d'indicatif (`tests/peb.test.js` le protège).

## i18n : page en français uniquement (comme le Centre d'aide, l'Agenda et BEPS)

Le contenu propre à cette page (hero, parcours, programme, conditions, examen, tarifs, comparaison,
FAQ…) est rédigé **en français uniquement**. Seul le chrome partagé (header, footer, recherche,
assistant) reste traduit dans les 10 langues via le système i18n existant. Les clés
`search.page_peb_t/_d` (10 langues, `js/i18n-data-search.js`) restent nécessaires car elles
alimentent la recherche du site sur **toutes** les pages, pas seulement celle-ci.

## Images

4 photos génériques fournies directement par le client pour cette tâche (provenance/licence à
confirmer par Wisy Safety avant publication — voir `docs/image-sources.md`) :
`assets/originaux/peb/*.jpg` → `assets/images/peb/*.webp`, générés par
`scripts/optimize-images.py` (fonction `peb()`). Aucune n'est présentée comme une photo réelle du
centre ou des formateurs Wisy Safety (contrairement au hero BEPS, qui est une photo Wisy réelle) —
traitées comme des illustrations génériques, dont un badge d'accent en niveaux de luminosité (même
principe que les illustrations BEPS).

## Lancer / tester

```bash
node --test tests/*.test.js               # (Node ≥ 18) — aucune dépendance, inclut tests/peb.test.js
python3 scripts/optimize-images.py        # régénère les dérivés WebP si un original change
node scripts/build-seo.js                 # régénère sitemap.xml, robots.txt, le bloc SEO du <head>
node scripts/sync-edge.js                 # régénère la copie de l'assistant pour l'Edge Function
```
