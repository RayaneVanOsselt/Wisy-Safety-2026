# Page Agenda — `agenda.html`

Page « Agenda des formations » (site statique, sans build). Elle affiche la **liste des sessions publiées**
(lues dans `js/sessions.js`, voir [README-SESSIONS.md](README-SESSIONS.md)) et, en dessous, le composant qui
accueillera le **calendrier Outlook** de Wisy Safety : il suffira de renseigner **une URL** (voir plus bas).

> ⚠ Aucune date, aucune disponibilité, aucune formation fictive n'est écrite dans le HTML — c'est une règle
> (testée dans `tests/agenda.test.js` et `tests/sessions.test.js`). Les sessions viennent de `js/sessions-data.js`
> (vide aujourd'hui : la page dit alors « Aucune session n'est publiée pour le moment », avec les boutons Contact et
> Formations) ou de la table Supabase `training_sessions`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `agenda.html` | Page complète : chrome du site (en-tête, menu mobile, pied de page, scripts communs) + contenu |
| `css/agenda.css` | Styles propres à la page (`.ag-*`) et au composant calendrier (`.agc*`) |
| `js/agenda-calendar.js` | Composant **AgendaCalendarSection** (URL Outlook future, iframe isolé, états) |
| `js/agenda.js` | Colle de page : `--ag-hh` (hauteur d'en-tête), sauts d'ancre accessibles, bouton « Assistant », **liste des sessions publiées** (filtre par formation, inscription à une session, état vide honnête) |
| `js/sessions.js` · `js/sessions-data.js` | Source unique des dates (chargées par la page) |
| `tests/agenda.test.js` | 24 tests : structure, honnêteté du contenu, charte, mouvement, accessibilité, composant, intégrations |

Réutilisé tel quel : jetons de couleurs/typo/rayons/ombres, `.btn` (`--cta`, `--outline`, `--light`), `.container`,
système `.reveal` + compteurs `data-count` (une seule fois à l'entrée dans le viewport), en-tête sticky, pied de page,
icônes linéaires (trait 1,8), `css/site-header.css` (+ état actif `aria-current` de la navigation).

## Structure UX

Hero (55/45, composition abstraite) → chiffres de réassurance → « Une formation qui s'adapte au terrain » →
timeline « Tout ce qu'il vous faut… » → **Agenda** (`#agenda`, composant) → « Comment ça fonctionne ? » →
« Vous ne trouvez pas la session… ? » → CTA final (fond `#1B2D28`). Le turquoise n'existe que sur les deux
`.btn--cta` (hero + final) ; toutes les formes décoratives sont en épinette / sarcelle / brume à très faible opacité.

## Brancher le calendrier Outlook (le jour venu)

1. Dans Outlook (Microsoft 365) : **Paramètres → Calendrier → Calendriers partagés → Publier un calendrier**, choisir le
   calendrier Wisy Safety et le niveau « peut voir tous les détails » (ou « disponibilités seulement » pour ne pas
   exposer les titres), puis copier le **lien HTML** (`https://outlook.office365.com/owa/calendar/…/calendar.html`).
2. Dans `agenda.html`, section `#agenda`, renseigner l'attribut :

   ```html
   <div class="agc" data-agenda-calendar data-calendar-url="https://outlook.office365.com/owa/calendar/…/calendar.html" …>
   ```

   (ou, pour tout le site, `AGENDA_CALENDAR_URL` dans `window.WISY_CONFIG`, `js/supabase-config.js` ; l'attribut a priorité).
3. C'est tout : l'état vide est remplacé par l'agenda. Aucun autre fichier à modifier.

**Ce que fait le composant** (voir l'en-tête de `js/agenda-calendar.js`)

- l'URL doit être en **https**, sans identifiants ni port exotique, et son hôte doit être dans la liste blanche
  (`outlook.office365.com`, `outlook.office.com`, `outlook.live.com`) ; pour un autre fournisseur, ajouter l'hôte
  exact : `data-allowed-hosts="agenda.exemple.org"`. Une URL refusée n'affiche **aucune erreur** au visiteur : l'état
  « à venir » reste en place ;
- `<iframe>` **isolé** : `sandbox` (scripts + origine propre du calendrier + pop-ups sortants, **jamais** de navigation du
  site parent), `referrerpolicy`, `title` accessible (`data-calendar-title`), chargé **quand la section approche de
  l'écran** (`IntersectionObserver` + `loading="lazy"`) ;
- états sur la racine (`data-state`) : `planned` → « Intégration Outlook prévue » · `loading` (`aria-busy`) · `ready` →
  « Synchronisé avec Outlook » (seulement pour un hôte Outlook réellement chargé) · `slow` après 12 s ;
- lien de secours « Ouvrir l'agenda dans un nouvel onglet » (`rel="noopener noreferrer"`) et lien vers la page Contact ;
- hauteur responsive gérée en CSS (`.agc__slot`, `clamp(520px, 78vh, 780px)`), aucune barre horizontale sur mobile.

**À vérifier au moment de la mise en ligne** : Microsoft peut interdire l'affichage en iframe selon la configuration du
tenant (en-tête `X-Frame-Options` / `frame-ancestors`). Le navigateur ne signale pas ce blocage : si l'agenda reste blanc,
le lien « Ouvrir dans un nouvel onglet » reste le repli. Si le site reçoit un jour une politique CSP, autoriser
`frame-src https://outlook.office365.com`.

## Contenu : d'où viennent les textes et les chiffres

- Textes : ancienne page `wisysafety.be/agenda` (approche terrain, 5 idées de la timeline), reformulés ; aucune reprise
  de mise en page ni de structure.
- Chiffres (barre de réassurance) : **uniquement ceux déjà validés sur le nouveau site** (`index.html`, `contact.html`) :
  500+ professionnels formés, 10+ ans d'expérience, 250+ certifications délivrées, 100 % de satisfaction, et les
  horaires réels de l'équipe (lun.–jeu., 10 h–16 h).
- **Écarts avec l'ancienne page, non repris** (à trancher par Wisy Safety) : « 15 ans d'expérience » (le site dit 10+),
  « 98 % de satisfaction » (le site dit 100 %), « 24 formations agréées » (le site présente 6 formations), « 24 h support
  dédié » (l'équipe est joignable du lundi au jeudi, 10 h–16 h), « 100 % certifiées » (garde-fou existant : la formation
  Nacelles n'est pas confirmée comme certifiante ; la page renvoie vers la fiche de chaque formation) et
  « Calendrier complet 2025 » (obsolète).
- Le statut « Agenda en cours de synchronisation » n'est **pas** affiché : rien n'est en cours de synchronisation ;
  la page dit « Intégration Outlook prévue ».
- Contenu **traduit dans les 10 langues** (`data-i18n` + `js/i18n-data-agenda.js`, clés `ag.*`) ; le composant calendrier
  (`js/agenda-calendar.js`) retraduit ses statuts (`ag.st_*`) et le titre de l'iframe (`ag.cal_title`) à chaque changement de
  langue. Les chiffres du bandeau de confiance sont les mêmes dans toutes les langues.

## Intégrations

- **Navigation** : le lien « Agenda » (auparavant `#`) pointe vers `agenda.html` sur les 8 pages (en-tête, menu mobile,
  pied de page) ; sur `/agenda`, `aria-current="page"` (texte épinette + soulignement plein, `css/site-header.css`).
- **Recherche du site** : `js/search.js` (`PAGES`) + `search.page_agenda_t/_d` dans les 10 langues de `js/i18n-data-search.js`.
- **Assistant Wisy** : `page-agenda` dans `js/assistant/knowledge.js`, route autorisée dans `validation.js`, intentions du
  `responder.js` (« Quand est la prochaine formation ? », « Où voir l'agenda ? », « Avez-vous des formations le week-end ? »…) →
  carte Agenda + carte Contact, **jamais** de date ni de disponibilité ; miroir Edge (`supabase/functions/chat/knowledge.ts`,
  consigne du prompt).
- **Centre d'aide** : la réponse « Puis-je choisir la date de ma formation ? » (`faq-data.js`) renvoie vers la page Agenda
  (action `agenda`) ; `node scripts/sync-faq-edge.js` a régénéré le miroir Edge.

## Quand les vraies sessions existeront

Ne pas écrire de dates à la main dans la page. Si l'agenda est enrichi (liste de sessions), ajouter alors les données
structurées `schema.org/Event` **à partir des sessions réelles seulement**, puis mettre à jour l'assistant (`responder.js`,
branches « dates / sessions ») et la FAQ (`faq-inscription-dates`) pour qu'ils citent l'agenda au lieu de dire « pas encore publié ».

## Tester

```bash
node --test tests/*.test.js     # dont tests/agenda.test.js
```
