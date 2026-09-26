# Formation VCA Base — guide de la page, de ses articles et de leur intégration

Page : **`formation-vca-base.html`** (route à plat, comme `formations.html`). Deux articles l'accompagnent :
**`article-vca-cout-financement.html`** et **`article-vca-erreurs-examen.html`**.
Technologie du site inchangée : HTML/CSS/JS sans framework, aucun build.

> L'ancienne page `wisysafety.be/vca-base/` n'a servi que de **source de contenu**. Sa mise en page n'a pas été
> reprise, et toutes ses données non vérifiables ont été retirées (voir « Ce qui a été retiré » plus bas).

## Règle d'or

**Rien n'est inventé.** Ni date, ni session, ni tarif, ni agrément, ni numéro, ni statistique, ni taux de
réussite, ni témoignage, ni partenaire, ni formateur, ni aide financière, ni obligation légale. Une information
manquante est laissée vide et signalée (« à confirmer »), jamais devinée. Les tests l'appliquent
(`tests/vca-base.test.js`, `tests/sessions.test.js`).

## Architecture en une vue

| Rôle | Fichier |
|---|---|
| **Source unique des faits** : prix, durée, format, lieu, examen inclus, programme officiel, faits officiels sourcés, mots-clés, visuels | `js/trainings-data.js` → `VCA_BASE` |
| Registre commun (recherche, assistant, sitemap) : la VCA Base y est construite **depuis** le registre ci-dessus | `js/site-content.js` |
| Page | `formation-vca-base.html` |
| Styles propres à la page / aux articles | `css/formation-vca.css` · `css/article.css` |
| Comportements de la page (accordéons, disponibilités, copier l'adresse, barre mobile, `vca_view`) | `js/formation-vca.js` |
| Coque partagée des nouvelles pages (en-tête, menu mobile, pied de page, apparition au scroll, événements) | `js/site-chrome.js` |
| Sommaire dynamique des articles | `js/article.js` |
| **Dates** : lues, validées et mises à disposition (jamais écrites dans le HTML) | `js/sessions.js` + `js/sessions-data.js` (voir [README-SESSIONS.md](README-SESSIONS.md)) |
| Traductions (10 langues) | `js/i18n-data-vca.js` (232 clés) · `js/i18n-data-articles.js` (partagées) · `js/i18n-data-art-cost.js` · `js/i18n-data-art-exam.js` · `dd.vca_base_*` dans `js/i18n-data-common.js` |
| Prix dans le parcours d'inscription | `js/registration-data.js` (lit le registre) |
| Balises de partage, JSON-LD, sitemap | `scripts/build-seo.js` (puis `node scripts/build-seo.js`) |
| Images | `assets/images/formations/vca-base.webp` (photo existante du site), `assets/images/vca-base/`, `assets/images/partage/` — originaux dans `assets/originaux/vca-base/` |

Le registre alimente : la page (SEO/JSON-LD), le **catalogue** (`formations.html`), la **recherche** (résultat riche
avec le tarif), l'**assistant** (`knowledge.js` + copie serveur générée `site.generated.ts`) et le **parcours
d'inscription**. `tests/vca-base.test.js` échoue si l'un d'eux diverge.

## Ce qui est confirmé, et ce qui ne l'est pas

Confirmé par Wisy Safety : formation **VCA Base**, **225 € par personne**, **examen inclus**, **présentiel**,
centre Wisy Safety, Avenue d'Itterbeek 378, 1070 Anderlecht, +32 2 318 86 59, info@wisysafety.be, accueil du lundi
au jeudi de 10 h à 16 h, durée **1 jour**, « Certification VCA après réussite de l'examen ».

**Faits officiels** (lus directement dans les documents de BeSaCC-VCA, de l'autorité belge du VCA — pas dans un
résumé), avec leur date de vérification (`official.verifiedAt`, **26 septembre 2026**) :

| Fait | Source |
|---|---|
| Examen B-VCA : **40 questions, 60 minutes, seuil 64,5 %** ; 12 sujets répartis en 4 chapitres | matrice d'évaluation officielle v2.0 + règlement général des examens VCA v2018-03 (`besacc-vca.be`) |
| Un diplôme de sécurité de base est valable s'il date de **moins de 10 ans** à compter de l'examen | checklist VCA de BeSaCC-VCA |
| Vérification d'un diplôme : registre central des diplômes | `csm-examen.be/cdr` |
| Formation de base en sécurité **d'au moins 8 heures** sur les chantiers temporaires ou mobiles ; un VCA n'est accepté que si l'examen est réussi | SPF Emploi (arrêté royal du 7 avril 2023, FAQ du 2 juin 2026) |
| Aide sectorielle possible pour certaines formations | Constructiv |

**Non confirmé — donc jamais affirmé** (liste `unconfirmedClaims` du registre, protégée par les tests) : agrément,
accréditation, « reconnu internationalement », statut de **centre d'examen reconnu**, langues (FR/EN/NL),
« 8 heures » de formation Wisy, horaires de la journée, effectif maximum, taux de réussite, financement ou aides
propres à cette formation.

### À confirmer par Wisy Safety (voir aussi la liste du rapport final)

1. **Wisy Safety est-il un centre d'examen reconnu par Contractor Safety Management (BeSaCC-VCA) ?** Les articles
   expliquent qu'un diplôme n'est valable que s'il vient d'un centre reconnu. Tant que ce n'est pas confirmé, la
   page ne dit **pas** que Wisy l'est. Si c'est le cas, l'ajouter au registre puis à la page.
2. **Les 225 € sont-ils HT ou TTC ?** Le registre ne précise rien (`vatIncluded: null`) : le site ne dit ni « HT »
   ni « TTC » ; la FAQ et l'assistant le disent honnêtement.
3. **Langues proposées** (`languages: null` aujourd'hui) : la page écrit « indiquée pour chaque session ».
4. **Numéro de TVA du pied de page** : `BE0XXX.XXX.XXX` est un emplacement (préexistant, sur toutes les pages).
5. **Origine et licence des photos** des articles (voir [image-sources.md](image-sources.md)).
6. **Date de publication des articles** (`published` dans `js/site-content.js`) : 26 septembre 2026 = date de mise
   en ligne prévue ; à ajuster si elle change.

## Modifier le contenu

- **Prix, durée, format, lieu, public, programme, faits officiels** : `js/trainings-data.js` (`VCA_BASE`), puis le
  texte affiché (HTML + `js/i18n-data-vca.js` / `js/i18n-data-common.js`). Les tests signalent tout écart.
  Ensuite : `node scripts/build-seo.js && node scripts/sync-edge.js`.
- **Une langue confirmée** : renseigner `languages` / `languageLabels` dans le registre (la page et le JSON-LD les
  reprennent) — jamais avant confirmation.
- **Une session** : `js/sessions-data.js` — voir [README-SESSIONS.md](README-SESSIONS.md).
- **Une question de la FAQ de la page** : elle est dans `js/i18n-data-vca.js` (`vca.faq_*`) et le HTML ; les
  réponses générales du Centre d'aide sont dans `js/faq-data.js` (+ `js/faq-i18n/`).
- **Remplacer la photo principale** : déposer le nouvel original dans `assets/originaux/vca-base/`, l'ajouter à
  `scripts/optimize-images.py` (fonction `vca()`), relancer `python3 scripts/optimize-images.py` puis
  `node --test tests/*.test.js`. (Le script régénère aussi deux icônes : si `git status` les montre modifiées
  sans raison, les restaurer avec `git checkout assets/icons/`.)

## Plan de la page

Hero (titre, prix, examen, appels à l'action) → bandeau « L'essentiel » → aperçu (fiche) → à qui s'adresse la
formation → programme (12 sujets officiels, répartition des 40 questions) → examen et certification (faits officiels
et cadre légal, avec sources et date) → pourquoi Wisy Safety (uniquement des faits vérifiables) → disponibilités
(sessions dynamiques ou message honnête) → inscription et tarif → deux articles → FAQ → contact et adresse
(appel, e-mail, itinéraire, copie de l'adresse). Sur mobile, une **barre d'action collante** « VCA Base — 225 € /
S'inscrire » apparaît après le hero (zones sûres des téléphones respectées).

Ancres : `#apercu` `#pour-qui` `#programme` `#examen` `#pourquoi` `#disponibilites` `#inscription` `#ressources`
`#faq` `#contact` (la recherche en utilise trois : ne pas les renommer sans mettre à jour `js/search.js`).

## Mesure d'audience (événements)

Chaque lien clé porte `data-vca-track` ; les événements passent par le bus interne `wisy:analytics`, **relayé
seulement si le visiteur a accepté la mesure d'audience** (`js/cookie-consent.js`). Aucune donnée personnelle n'y est
jamais placée.

| Événement | Quand |
|---|---|
| `vca_view` | affichage de la page |
| `vca_signup_click` | clic sur un bouton d'inscription |
| `vca_agenda_click` | clic vers l'agenda |
| `vca_phone_click` · `vca_email_click` | clic sur le téléphone / l'e-mail |
| `vca_article_click` | clic vers un article |
| `vca_registration_start` | arrivée dans le parcours d'inscription avec la VCA Base |
| `vca_registration_complete` | commande initialisée avec un prestataire de paiement réel — **pas encore actif** : le paiement en ligne n'est qu'un emplacement, l'inscription n'est donc jamais comptée « terminée » aujourd'hui |

## Recherche, assistant, langues

- **Recherche** : la VCA Base s'affiche avec son tarif (« 225 € / personne »), les articles forment un groupe à part,
  les sessions publiées apparaissent (avec un lien d'inscription à *cette* session) et l'état vide propose des accès
  rapides (VCA Base, prix, dates, examen, adresse).
- **Assistant Wisy** : répond depuis les faits du registre (tarif, examen officiel, validité du diplôme, lieu) et cite
  les sessions publiées. Il **refuse d'affirmer** un agrément ou une reconnaissance et renvoie vers l'équipe. Ses
  réponses restent en **français** (limite documentée) ; l'interface du panneau est traduite. Aucune intégration
  payante n'a été ajoutée : la fonction serveur optionnelle (`supabase/functions/chat/`) reste **inactive** tant
  qu'elle n'est pas configurée ; voir [README-ASSISTANT.md](README-ASSISTANT.md).
- **Langues** : les 10 langues du site changent réellement le contenu de la page et des articles. Les textes
  réglementaires traduits suivent le français mot à mot (mêmes chiffres, mêmes prudences) ; **aucune traduction
  n'est présentée comme juridique** : en cas de doute, la version française et les sources officielles font foi.
  Contrôle : `node scripts/check-i18n.js`.

## Ce qui a été retiré de l'ancienne page (et pourquoi)

« 15 septembre 2025 » et toute date de session ; « Weversstraat 12, 1730 Asse » (autre adresse) ; pourcentages sans
source (taux de réussite, satisfaction) ; les trois témoignages (Pierre Martin, Sophie Leroy, Thomas Dubois) ; « reconnue
internationalement » ; les langues FR/EN/NL non confirmées ; les 7 modules d'origine (remplacés par les 12 sujets
officiels de l'examen).

## Lancer / tester

```bash
node --test tests/*.test.js          # tous les tests
node scripts/check-i18n.js           # traductions
node scripts/build-seo.js            # (re)génère sitemap + balises de partage
node scripts/sync-edge.js            # copie serveur de l'assistant
```
