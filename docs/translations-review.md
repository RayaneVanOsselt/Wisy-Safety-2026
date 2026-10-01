# Traductions des nouvelles pages — à relire

Traductions faites le **01/10/2026** pour les 10 langues actives du site (fr, en, nl, af, ar, bg, de, ro, it, sl).
Elles sont **produites par l'IA (Claude) puis contrôlées automatiquement**. Aucun traducteur humain natif ne les a
encore relues. Pour les textes réglementaires, une relecture humaine est **recommandée avant mise en ligne** (§4).

## 1. Ce qui est traduit

| Dictionnaire | Clés | Contenu | Fichier source par langue |
|---|---|---|---|
| `fiche` | 35 | éléments communs (fil d'Ariane, sources, modale, outil, appels à l'action) | `content/i18n/fiche/<langue>.json` |
| `vlh` | 203 | page VCA Ligne hiérarchique + 3 dossiers | `content/i18n/vlh/<langue>.json` |
| `diiso` | 208 | page Diisocyanates + 3 articles | `content/i18n/diiso/<langue>.json` |
| `fibre` | 93 | page Fibre optique | `content/i18n/fibre/<langue>.json` |
| `fibre-art` | 97 | 2 articles fibre (modale et pages autonomes) | `content/i18n/fibre-art/<langue>.json` |
| `art-fib1`, `art-fib2` | 1 + 1 | titres d'onglet des 2 pages d'articles | `content/i18n/art-fib1|2/<langue>.json` |

Plus les clés partagées ajoutées dans `js/i18n-data-common.js` (`dd.*` des 3 formations), `js/i18n-data-search.js`
(`search.art_*`), `js/i18n-data-formations.js` (cartes du catalogue), les réponses de FAQ modifiées
(`js/faq-i18n/faq-*.js`) et les libellés d'inscription (`js/registration-data.js`).

**Le français n'est jamais recopié** : `scripts/build-i18n-fiches.js` le lit dans le HTML des pages. Pour modifier un
texte : modifier le HTML (français) et/ou `content/i18n/<dictionnaire>/<langue>.json`, puis lancer
`node scripts/build-i18n-fiches.js` et `node scripts/check-i18n.js`.

## 2. Contrôles automatiques (résultat)

`node scripts/check-i18n.js` : **0 erreur**. Le script vérifie pour chaque langue : les mêmes clés que le français,
les mêmes chiffres (dates, seuils, valeurs limites, numéros de chapitres), les mêmes balises HTML et classes, le même
nombre d'éléments « | », et l'absence de texte resté en dur dans les pages.
71 avertissements « identique au français », tous légitimes. Pour les nouvelles pages : noms officiels (« CFOT —
Certified Fiber Optic Technician (FOA) », « CCNA — Cisco Certified Network Associate (Cisco) »), « À la carte »
(en, nl, it), « 40 questions, 60 minutes » (en).

Contrôle visuel dans le navigateur : anglais (diisocyanates), arabe en RTL (VCA Ligne hiérarchique), allemand (article
fibre) et italien (modale fibre) : textes traduits, liens par langue corrects, aucune clé restée en français.

## 3. Choix de traduction

- **Mention obligatoire sur l'emballage** (règlement (UE) 2020/1149, point 2) : pas traduite. On reprend le **texte
  officiel de chaque version linguistique** du règlement, relevé sur EUR-Lex le 01/10/2026 (en, nl, de, bg, ro, it, sl).
  Même chose pour « y compris en ligne » (en : « including on-line training », de : « einschließlich Online-Schulung »…).
  L'**afrikaans** et l'**arabe** ne sont pas des langues de l'UE : la mention est traduite et **signalée comme
  traduction**. L'arabe paraphrase « y compris en ligne » sans guillemets.
- **Chapitres VOL-VCA** : en néerlandais, ce sont les **intitulés officiels** du document « Eind- en toetstermen VCA
  VOL » (la note le dit). Dans les autres langues, ils sont traduits par Wisy Safety (comme en français).
- **Nom de l'examen** : néerlandais officiel « Veiligheid voor Operationeel Leidinggevenden », anglais repris de la page
  anglaise de BeSaCC-VCA (« Safety for Operational Managers »), autres langues traduites.
- **Liens vers les sources** : version linguistique vérifiée quand elle existe (EUR-Lex : 8 langues ; BeSaCC-VCA :
  fr/nl/en). Sinon, la version anglaise (af, ar). Aucune URL n'a été construite de mémoire : toutes figurent dans
  `js/sources-data.js`. Quand une source n'existe qu'en français (Constructiv, SPF ETCS, règlements d'examen), la langue
  est indiquée dans le libellé (« (French) », « (Frans) », « (auf Französisch) »…).
- **Glossaire du site respecté** (`js/i18n-data-common.js`) : en « VCA Basic » / « VCA for Supervisors » ; nl « VCA
  Basis » / « VCA voor Leidinggevenden » ; de « VCA Grundlagen » / « VCA für Führungskräfte » ; it « VCA base » /
  « VCA per responsabili » ; etc.
- **Institutions belges** : nl « FOD Werkgelegenheid, Arbeid en Sociaal Overleg », « koninklijk besluit »,
  « Belgisch Staatsblad », « preventieadviseur » ; de « FÖD Beschäftigung, Arbeit und Soziale Konzertierung »,
  « Königlicher Erlass », « Gefahrenverhütungsberater ». Dans les autres langues, ces noms sont traduits.
- **Registre** : vouvoiement partout, sauf l'**italien** qui tutoie, comme le reste du site.
- **Chiffres** : chiffres latins en arabe. Formats décimaux et dates de chaque langue (0,1 % / 0.1%), avec les mêmes
  valeurs, vérifiées par le script.

## 4. Relecture humaine recommandée (par priorité)

1. **Diisocyanates, en nl et de** (langues officielles de la Belgique) : encadré réglementaire (`dii.plate_*`), section
   01 (`dii.s1_*`), outil « Suis-je concerné ? » (`dii.c_*`, `dii.r_*`), FAQ (`dii.q*`), article 2 (`dii.a2_*`). Vérifier
   les termes juridiques belges.
2. **VCA Ligne hiérarchique, en nl** : section examen (`vlh.s3_*`, `vlh.e_*`) et financement (`vlh.s5_*`). Comparer aux
   termes de BeSaCC-VCA et de Constructiv.
3. **Arabe** : relecture par un locuteur natif (terminologie chimique et VCA, rendu RTL des sigles et des formules).
4. Les autres langues (af, bg, ro, it, sl) : relecture courante.

Les contenus juridiques n'ont pas été relus par un juriste dans aucune langue, y compris en français. Les pages le disent :
« ce n'est pas un avis juridique ».
