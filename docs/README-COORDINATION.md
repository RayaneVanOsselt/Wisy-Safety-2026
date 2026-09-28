# WiSy Coordination — guide de la page

Page : **`coordination.html`** (route à plat, comme les autres pages). Technologie du site
inchangée : HTML/CSS/JS vanilla, aucun build. Construite sur le même patron que les pages
PEB/VCA Base (`docs/README-PEB.md`, `docs/README-VCA.md`) : refonte complète, pas une
amélioration cosmétique de l'ancien lien mort du menu.

## Architecture en une vue

| Rôle | Fichier |
|---|---|
| Page (header/footer/CSS de base **réutilisés** des autres pages) | `coordination.html` |
| Styles propres à la page | `css/coordination.css` |
| Logique propre : loupe du hero, rail de chapitres, explorateur de piliers, simulateur du déclencheur, panneaux de services, méthode pas à pas, état vide de l'équipe, formulaire + EmailJS | `js/coordination.js` |
| Header/footer/menu mobile/apparitions au scroll (**partagé**, comme la page VCA Base) | `js/site-chrome.js` |
| Données propres à la page (équipe — VIDE volontairement, sources réglementaires vérifiées) | `js/coordination-data.js` |
| Entrée dans le registre du site (recherche, assistant, sitemap) | `js/site-content.js` → `PAGES` (`id: "coordination"`) |
| Libellés traduits de la recherche (10 langues) | `js/i18n-data-search.js` (`search.page_coordination_t/_d`) |
| Nœud JSON-LD `Service` dédié (jamais le nœud `service` générique, propre à VCA Entreprise) | `scripts/build-seo.js` (`NODES.coordinationService`) |
| Traductions de la page (10 langues, 153 clés : `meta.title` + `coord.*`) | `js/i18n-data-coordination.js` |
| Tests propres à la page (sections retirées, chapitres, sans-JS, simulateur, « rien d'inventé ») | `tests/coordination.test.js` |
| 6 questions ajoutées au Centre d'aide (catégorie `coordination`) | `js/faq-data.js` (source FR) + `js/faq-i18n/faq-<langue>.js` (9 traductions) |

Le registre alimente : la page, la **recherche globale** (`js/search.js`), l'**assistant**
(`knowledge.js` dérive `PAGES` + la FAQ, donc répond sur WiSy Coordination automatiquement), le
**sitemap/SEO** (`scripts/build-seo.js`).

## Structure de la page (v3, 2026-09-27) — une interaction différente par chapitre

Retour du propriétaire sur la v2 : sections « trop simples », pas assez d'envie d'aller plus loin.
Les sections **« La mission » (frise), « Vue d'ensemble / Coordination Control » et « Domaines
d'intervention »** ont été **retirées à sa demande** (HTML, CSS, JS, modals et traductions) —
`tests/coordination.test.js` échoue si elles reviennent. Seul vestige volontaire : les intitulés
des domaines restent les options du champ **« Type de projet »** du formulaire (clés renommées
`coord.form_type_*`), à retirer aussi si le propriétaire le souhaite.

| Chapitre | Interaction (souris · clavier · tactile) |
|---|---|
| Hero | Loupe « inspection » : la photo reprend ses vraies couleurs dans un viseur qui suit la souris (souris uniquement, jamais en mouvement réduit ; même image que le hero — `currentSrc`, aucune requête en plus). **Sommaire du dossier** : 6 liens vers les chapitres. |
| Rail (≥ 1200 px) | Pastilles 01 → 06 fixées dans la marge : chapitre courant, progression, libellé affiché au changement. Doublon visuel du sommaire → `aria-hidden` et hors tabulation. |
| 01 · Notre approche | Explorateur des 4 piliers : onglets WAI-ARIA (clic, survol, flèches, Début/Fin) + fiche sombre + « Suivant ». Mobile : ruban de pastilles défilant. |
| 02 · Cadre réglementaire | **Simulateur du déclencheur** : nombre d'entreprises (1 → 6) × « simultanément / successivement » → frise et verdict. Il n'illustre QUE le texte légal vérifié affiché juste au-dessus (plusieurs entrepreneurs, simultanément ou successivement) et affiche en permanence « pas un avis juridique ». Aucun seuil, niveau A/B ou délai n'y est calculé. Règle revérifiée le 2026-09-27 sur la page du SPF « La coordination pour chantiers temporaires ou mobiles » (https://emploi.belgique.be/fr/themes/bien-etre-au-travail/lieux-de-travail/chantiers-temporaires-ou-mobiles/la-coordination-pour) : coordinateurs requis dès que deux entrepreneurs ou plus interviennent, simultanément ou successivement. |
| 03 · Services | Grand écran : 4 panneaux côte à côte, celui survolé/cliqué s'élargit (détail + livrables + « Demander ce service »). Mobile : accordéon. |
| 04 · Notre méthode | Frise des 5 étapes + fiche + précédent/suivant ; à la dernière étape, « Demander une coordination ». |
| 05 · Équipe | État vide honnête (inchangé sur le fond). |
| 06 · Contact | « Services souhaités » : cases cochées automatiquement par « Demander ce service » (section 03) et reprises dans le message envoyé. |

**Sans JavaScript**, tout reste lisible : fiches des piliers et étapes empilées, services
dépliés, simulateur masqué (le texte légal reste). Chaque composant pose `.is-ready` quand le JS
prend la main. **Aucune animation infinie**, halo/loupe/parallaxe désactivés en mouvement réduit
ou au toucher. Arabe : mise en page miroir (propriétés logiques CSS, flèches retournées).

## RÈGLE D'OR — ce fichier ne remplace pas une vérification humaine

Aucune donnée propre à Wisy Safety n'a été inventée. Ce qui est affiché :

- Le **cadre réglementaire belge** (loi du 4 août 1996 relative au bien-être des travailleurs,
  arrêté royal du 25 janvier 2001 concernant les chantiers temporaires ou mobiles, PSS, DIU,
  niveaux de coordinateur A et B) — vérifié le **2026-09-27** sur le site du SPF Emploi, Travail et
  Concertation sociale (https://emploi.belgique.be/fr/themes/bien-etre-au-travail). Ce sont des
  faits légaux généraux, pas des affirmations sur Wisy Safety.
- Les **services, piliers, missions et étapes de processus** : repris du brief fourni par le
  propriétaire (texte adapté, jamais inventé).
- Les **coordonnées** (téléphone, e-mail, adresse, horaires) : identiques à `js/faq-data.js` →
  `CONTACT`, jamais recopiées à la main.

Ce qui n'est **volontairement pas affiché**, faute de confirmation (voir
`js/coordination-data.js` → `UNCONFIRMED_CLAIMS`) :

1. **Niveaux de coordinateur (A et/ou B) réellement couverts par l'équipe Wisy Safety.**
2. **Zones d'intervention exactes** (Bruxelles, Wallonie, Flandre ?).
3. **Ancienneté** de l'activité de coordination.
4. **Nombre de chantiers/projets suivis.**
5. **Agrément ou affiliation professionnelle** spécifique du/des coordinateur(s).
6. **Tarification** (mission, forfait, régie ?).
7. **Équipe** : `js/coordination-data.js` → `TEAM` est un tableau **vide**. La section « Équipe »
   affiche un état honnête (« Les profils de l'équipe seront présentés ici » + lien Contact) tant
   qu'aucune personne réelle n'est fournie — même principe que `js/sessions-data.js` pour
   l'agenda. Ne jamais y mettre un profil inventé ou une photo générée par IA.

**Avant publication**, Wisy Safety doit confirmer les points 1 à 6 pour activer les badges de
confiance correspondants, et fournir noms/rôles/photos réels pour le point 7.

## Images

Le propriétaire a déposé 7 fichiers dans `assets/images/` pour cette tâche. **Un seul** concernait
la coordination chantier : la photo d'équipements de protection individuelle, déplacée vers
`assets/originaux/coordination/coordination-hero-equipements-securite.webp` puis déclinée en
`assets/images/coordination/coordination-hero-equipements-securite-1400.{avif,webp}` par
`scripts/optimize-images.py` (fonction `coordination()`). Les **6 autres** fichiers (bague de
fiançailles, data center, setup de développeur, deux photos immobilières) n'ont aucun rapport avec
la coordination sécurité-santé de chantier : ils ont été retirés de `assets/` (jamais utilisés sur
le site) et mis de côté pour vérification par le propriétaire plutôt que supprimés. Cette photo
est la seule de la page (la loupe du hero en réutilise le fichier déjà chargé) ; l'équipe et les
fiches utilisent un traitement graphique éditorial (dégradés, trame technique, pictogrammes) en
attendant de vraies photos de chantier/équipe.

## Modifier le contenu

- **Activer un badge de confiance** (ex. « Niveaux A & B », « Bruxelles & Wallonie ») : une fois
  confirmé par le propriétaire, ajouter la puce dans `coordination.html` → `.co-trust` (hero) et
  retirer l'entrée correspondante de `js/coordination-data.js` → `UNCONFIRMED_CLAIMS`.
- **Ajouter un membre d'équipe réel** : ajouter un objet à `js/coordination-data.js` → `TEAM`
  (`{id, name, role, photo:{webp,alt}, qualifications:[]}`) ; `js/coordination.js` →
  `initTeam()` masque automatiquement l'état vide et rend les fiches dès que `TEAM` n'est plus vide.
- **Formulaire de demande** : envoie par le **même compte EmailJS** que `contact.html` /
  `peb-wallonie-bruxelles.html` (mêmes `SERVICE_ID`/`TEMPLATE_ID`, `subject: "Coordination
  sécurité-santé"` — déjà une option du gabarit existant, voir `contact.html` → `ct.f_opt4`).
  Aucune pièce jointe : le compte EmailJS ne le permet pas (voir le brief, point 16 : « Upload
  uniquement si le backend est réellement capable de traiter les fichiers »). Pour un gabarit
  EmailJS dédié (mise en forme différente), créez-le dans le tableau de bord EmailJS et remplacez
  `EMAILJS_TEMPLATE_ID` dans `js/coordination.js`.
- **Piliers, services, étapes** : plus de modals — le détail est dans la page (meilleur pour la
  lecture et le référencement). Ajouter un pilier = un bouton `data-explore-tab` + une fiche
  `data-explore-panel` (même ordre) ; une étape = `data-steps-tab` + `data-steps-panel` ; un service
  = un `<article data-svc-item>` + une case `name="services"` dont la `value` égale son
  `data-svc-pick` (vérifié par `tests/coordination.test.js`). Les largeurs des panneaux de services
  ouverts dépendent de leur `flex-grow` (2,7 ; 2,2 entre 1100 et 1299 px) : garder la fraction
  correspondante dans `.co-svc__bodyin` (`css/coordination.css`).

## i18n : page traduite dans les 10 langues

Contenu de la page : `data-i18n`/`data-i18n-attr` dans le HTML + `js/i18n-data-coordination.js`
(153 clés, français = miroir exact du HTML — `tests/i18n-static.test.js`, où la page est désormais
inscrite, comme dans `scripts/check-i18n.js`, `tests/header.test.js`, `tests/search-band.test.js`
et `tests/perf-budget.test.js`). Les intertitres (`coord.*_kicker`) ne contiennent plus le numéro
de chapitre (il est dans le HTML). Le verdict du simulateur est posé par le script, qui met aussi à
jour l'attribut `data-i18n` : un changement de langue le retraduit correctement. Les 6
nouvelles questions du Centre d'aide sont traduites séparément dans les 9 paquets
`js/faq-i18n/faq-<langue>.js` (même mécanisme que le reste du Centre d'aide).

**Assistant Wisy — nouveauté de cette page** : `js/assistant/assistant.js` → `detectContext()`
reconnaît désormais `coordination.html` et `js/assistant/responder.js` → `welcome()` lui donne un
message et des suggestions dédiées (« Qu'est-ce que WiSy Coordination ? », « Qu'est-ce qu'un
PSS ? »…). **Limite assumée, inchangée depuis les sessions précédentes** : le moteur de réponse de
l'assistant reste **entièrement en français** (voir `docs/README-ASSISTANT.md`) — les ~60 phrases
codées en dur dans `responder.js` ne sont pas traduites. Un chantier séparé, bien plus large,
serait nécessaire pour les traduire correctement (grammaire par langue, RTL arabe…) ; ce n'était
pas dans le périmètre de cette tâche.

Sources réglementaires citées dans le texte : `https://emploi.belgique.be/fr/themes/bien-etre-au-travail`
(déjà autorisé par `tests/site-links.test.js`, domaine utilisé pour la formation VCA Base).

## Lancer / tester

```bash
node --test tests/*.test.js               # (Node ≥ 18) — aucune dépendance
node scripts/check-i18n.js                # 0 erreur attendue
python3 scripts/optimize-images.py        # régénère les dérivés WebP/AVIF si un original change
node scripts/build-seo.js                 # régénère sitemap.xml, robots.txt, le bloc SEO du <head>
node scripts/sync-edge.js                 # régénère la copie de l'assistant pour l'Edge Function
node scripts/sync-faq-edge.js             # régénère la copie FAQ de l'assistant pour l'Edge Function
```
