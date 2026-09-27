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
| Logique propre : système de modals (piliers/services/domaines), état vide de l'équipe, formulaire + EmailJS | `js/coordination.js` |
| Header/footer/menu mobile/apparitions au scroll (**partagé**, comme la page VCA Base) | `js/site-chrome.js` |
| Données propres à la page (équipe — VIDE volontairement, sources réglementaires vérifiées) | `js/coordination-data.js` |
| Entrée dans le registre du site (recherche, assistant, sitemap) | `js/site-content.js` → `PAGES` (`id: "coordination"`) |
| Libellés traduits de la recherche (10 langues) | `js/i18n-data-search.js` (`search.page_coordination_t/_d`) |
| Nœud JSON-LD `Service` dédié (jamais le nœud `service` générique, propre à VCA Entreprise) | `scripts/build-seo.js` (`NODES.coordinationService`) |
| Traductions de la page (10 langues, 178 clés `coord.*`) | `js/i18n-data-coordination.js` |
| 6 questions ajoutées au Centre d'aide (catégorie `coordination`) | `js/faq-data.js` (source FR) + `js/faq-i18n/faq-<langue>.js` (9 traductions) |

Le registre alimente : la page, la **recherche globale** (`js/search.js`), l'**assistant**
(`knowledge.js` dérive `PAGES` + la FAQ, donc répond sur WiSy Coordination automatiquement), le
**sitemap/SEO** (`scripts/build-seo.js`).

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
le site) et mis de côté pour vérification par le propriétaire plutôt que supprimés. Les sections
qui bénéficieraient de photos réelles (domaines d'intervention, équipe) utilisent un traitement
graphique éditorial (dégradés, trame technique) en attendant de vraies photos de chantier/équipe.

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
- **Modals** : chaque pilier/service/domaine a son propre `<div class="co-modal" id="modal-…">`
  statique dans `coordination.html` (piège de focus, `inert` sur l'arrière-plan, verrouillage du
  scroll, Échap, retour du focus — voir `js/coordination.js` → `initModals()`). Pour en ajouter un,
  dupliquer un bloc existant et un déclencheur `data-modal-open="modal-…"`.

## i18n : page traduite dans les 10 langues

Contenu de la page : `data-i18n`/`data-i18n-attr` dans le HTML + `js/i18n-data-coordination.js`
(178 clés `coord.*`, français = miroir exact du HTML — `tests/i18n-static.test.js`). Les 6
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
