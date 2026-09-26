# Multilingue (10 langues) — guide de maintenance

Le site est proposé en **français (langue source), anglais, néerlandais, afrikaans, arabe (lecture de droite à gauche),
bulgare, allemand, roumain, italien et slovène**. Aucun outil externe : le système existant (`js/i18n.js`) a été
complété, pas remplacé.

## Comment ça marche

- Le visiteur choisit sa langue dans le sélecteur du header. Priorité de détection : `?lang=xx` dans l'adresse →
  choix mémorisé dans le navigateur (`wisy-lang`) → langue du navigateur → français.
- **Une seule adresse par page** : la langue est appliquée dans le navigateur (le HTML servi est en français). Le choix suit
  le visiteur de page en page. Les robots d'exploration (Google, Bing, aperçus de liens) reçoivent toujours le français.
- Les pages portent `data-i18n="clé"` (texte), `data-i18n-html="clé"` (texte avec balises) et
  `data-i18n-attr="attribut:clé"` (alt, aria-label, placeholder, title…). Les textes viennent des dictionnaires
  `js/i18n-data-*.js`, fusionnés dans `window.I18N`.
- **Le français du dictionnaire est le miroir exact du HTML** (`tests/i18n-static.test.js`) : c'est ce qui permet de ne
  rien réécrire au chargement d'une page française.
- Textes créés par JavaScript (résultat du vérificateur PEB, bandeau cookies, statuts de l'agenda, panier d'inscription…) :
  ils lisent `WisyI18N.get(langue, clé)` avec le français en repli, et se remettent à jour sur l'évènement
  `i18n:changed`.

## Où sont les textes

| Fichier | Contenu |
|---|---|
| `js/i18n-data-common.js` | en-tête, menus, pied de page, libellés d'accessibilité, **bandeau et préférences cookies** (`cookies.*`), catalogue (`dd.*`) |
| `js/i18n-data-search.js` | barre de recherche et fiches des pages |
| `js/i18n-data-assistant.js` | interface de l'Assistant Wisy (les *réponses* restent en français) |
| `js/i18n-data-<page>.js` | `home`, `formations`, `contact`, `avis`, `inscription`, `faq`, `agenda`, `nacelles`, `beps`, `peb`, `404` |
| `js/i18n-data-vca.js` · `i18n-data-articles.js` · `i18n-data-art-cost.js` · `i18n-data-art-exam.js` | page **VCA Base** (232 clés `vca.*`), éléments communs aux deux articles (`art.*`), article « coût et financement » (`a1.*`), article « erreurs à l'examen » (`a2.*`) |
| `js/faq-i18n/faq-<langue>.js` | questions/réponses du Centre d'aide (voir plus bas) |
| `js/registration-data.js` | noms et descriptions des formations du parcours d'inscription (10 langues) |

Chaque fichier contient les 10 langues, dans le même ordre. Les valeurs contiennent parfois des balises (`<strong>`,
`<a>`) ou des variables (`{n}`, `{region}`) : elles doivent rester identiques dans toutes les langues.

## Modifier un texte

1. Français : modifier le texte dans le **HTML** *et* dans le dictionnaire (mêmes mots — un test le vérifie).
2. Autres langues : modifier la valeur dans le même fichier `js/i18n-data-*.js`.
3. Lancer `node scripts/check-i18n.js` puis `node --test tests/*.test.js`.

## Ajouter un texte ou une page

1. Poser `data-i18n="page.ma_cle"` sur l'élément (ou `data-i18n-attr="alt:page.ma_cle"`).
2. Ajouter la clé dans les **10 langues** du dictionnaire de la page ; charger ce fichier **avant** `js/i18n.js`.
3. Titre de l'onglet : clé `meta.title` (le français = le `<title>` de la page).
4. Noms propres, marques, adresses, numéros, e-mails : ne pas traduire (`translate="no"` si le texte est isolé).
5. Ajouter la page à `PAGES` dans `scripts/check-i18n.js`.

## Vérifications automatiques

```bash
node scripts/check-i18n.js          # rapport lisible (--all pour tout afficher)
node --test tests/*.test.js         # inclut tests/i18n-coverage.test.js, i18n-static.test.js, faq-i18n.test.js
```

Le contrôle vérifie : les 10 langues présentes dans chaque dictionnaire · mêmes clés, variables `{…}`, balises HTML et
**chiffres** que le français (prix, durées, seuils réglementaires) · aucune valeur vide · clés utilisées par les pages et
les scripts · textes visibles restés en dur dans les pages · encodage UTF-8 (pas de caractère de remplacement, de texte mal
décodé ni de BOM) · `<title>` = `meta.title` français · pas de `lang`/`dir` figés dans le corps des pages.
Les formes identiques au français relues à la main sont listées dans `SAME_REVIEWED`.

## Le Centre d'aide (FAQ)

Le contenu français reste dans `js/faq-data.js` (source unique, lue aussi par l'assistant et la copie Edge). Chaque langue
a son fichier `js/faq-i18n/faq-<langue>.js`, **chargé à la demande** quand la langue est choisie. Le moteur de recherche
(`js/faq-search.js`) comprend les alphabets de toutes les langues (accents, ß, arabe, cyrillique) et cherche aussi dans les
mots-clés français. `tests/faq-i18n.test.js` contrôle que chaque langue couvre les 30 questions avec les mêmes numéros,
adresses et coordonnées.

## Règles de traduction

- Tutoiement/vouvoiement : forme de politesse partout (« u » en néerlandais et en afrikaans, « Sie » en allemand, forme de
  politesse au pluriel en roumain, « vi » en slovène, « вие » en bulgare), **sauf l'italien (« tu »)**. Bulgare et slovène :
  les appels à l'action des pages de contenu sont au pluriel de politesse ; les boutons fonctionnels du tunnel d'inscription
  (« Continuer », « Ajouter ») sont à l'impératif singulier, comme dans la plupart des interfaces.
- Glossaire commun : formateur = trainer / opleider / opleier / مدرّب / обучител / Trainer / formator / formatore /
  predavatelj ; premiers secours = first aid / eerste hulp / noodhulp / الإسعافات الأولية / първа помощ / Erste Hilfe /
  prim ajutor / primo soccorso / prva pomoč ; agrément = approval / erkenning / erkenning / الاعتماد / одобрение /
  Zulassung / aprobare / abilitazione / pooblastilo ; certificateur PEB = PEB certifier / PEB-certificeerder /
  PEB-sertifiseerder / مُصدِر شهادات PEB / PEB сертификатор / PEB-Zertifizierer / certificator PEB / certificatore PEB /
  certifikator PEB.
- **Véracité** : aucune traduction ne doit présenter Wisy Safety comme « agréé/reconnu » pour le PEB (seules les
  autorités le sont), ni inventer un prix, une date ou une durée. Les chiffres réglementaires sont contrôlés par le test.
- Roumain : virgule souscrite (ș, ț), jamais la cédille. Nombres : ils s'accordent (pluriels via `Intl.PluralRules`).

## Arabe (droite à gauche)

`<html dir="rtl">` est posé par `js/i18n.js`. Règles d'appoint : `css/i18n.css` (téléphones et e-mails toujours de gauche à
droite, alignements écrits en dur, bandeau cookies), fins de `css/peb.css` et `css/agenda.css`. Préférer les propriétés
logiques (`margin-inline-start`, `text-align: start`) pour tout nouveau CSS.

## Ce qui reste en français (volontairement ou hors périmètre)

- **Réponses de l'Assistant Wisy** et sa base de connaissances (l'interface, elle, est traduite).
- **Aperçus et moteurs de recherche** : `<meta>`, Open Graph, JSON-LD statique et sitemap décrivent la version française
  (une seule adresse par page → pas de `hreflang`). Indexer les autres langues demanderait des adresses distinctes.
- **E-mails envoyés à l'équipe** (contact, avis, vérificateur PEB) : rédigés en français ; la langue du visiteur y figure.
- Contenu affiché sans JavaScript (`<noscript>`) ; l'espace `admin/` ; les documents de `docs/`.
- Sur les pages avec JSON-LD `FAQPage` injecté (FAQ, BEPS, PEB), le JSON-LD suit la langue affichée.


## Pages VCA Base et articles (2026-09-26)

- Les trois pages sont dans `PAGES` de `scripts/check-i18n.js` : chaque clé est contrôlée dans les 10 langues, avec les mêmes
  **chiffres** (40 questions, 60 minutes, 64,5 %, 10 ans, 8 heures : en arabe aussi, en chiffres et non en toutes lettres),
  les mêmes balises et les mêmes variables.
- Les textes réglementaires suivent le français **mot à mot** (mêmes prudences). Ce ne sont **pas** des traductions
  juridiques : en cas de doute, le français et les sources officielles font foi. À faire relire par un locuteur natif pour
  les usages engageants (arabe, bulgare, roumain, slovène notamment).
- Le mot « session » : anglais *session*, néerlandais *sessie*, allemand *Termin* (parcours d'inscription) / *Sitzung* (Centre
  d'aide), slovène *izvedba* — cohérent avec le vocabulaire déjà validé du site.
- Limite volontaire inchangée : `<meta name="description">`, Open Graph et JSON-LD restent en français (adresse unique par page ;
  les robots reçoivent le français). Les réponses de l'assistant restent en français.
