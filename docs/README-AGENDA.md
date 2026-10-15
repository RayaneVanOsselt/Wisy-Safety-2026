# Page Agenda — `agenda.html`

Page « Agenda des formations » (site statique, sans build). Sa section `#agenda` affiche le **calendrier des
formations** (mois par mois, une pastille par session avec ses places : « 9/10 ») et, en dessous, la **liste des
sessions publiées** (filtre par formation). Les deux lisent `js/sessions.js` : sessions et places viennent de la
**feuille de réservation** (voir [README-RESERVATIONS.md](README-RESERVATIONS.md)), ou du fichier de secours
`js/sessions-data.js` (voir [README-SESSIONS.md](README-SESSIONS.md)).

> ⚠ Aucune date, aucune disponibilité, aucune formation fictive n'est écrite dans le HTML — c'est une règle
> (testée dans `tests/agenda.test.js` et `tests/sessions.test.js`).

> **15/10/2026 — l'emplacement « calendrier Outlook publié » (iframe, `js/agenda-calendar.js`) a été retiré** : publier
> un calendrier Outlook l'expose tel quel (titres, horaires, événements privés) et n'indique pas les places. Il est
> remplacé par le calendrier ci-dessus, alimenté par la feuille. Outlook reste l'outil interne de Wisy Safety : la
> feuille y synchronise un calendrier dédié (README-RESERVATIONS.md, § 4). Récupérable dans l'historique git si besoin.

## Fichiers

| Fichier | Rôle |
|---|---|
| `agenda.html` | Page complète : chrome du site (en-tête, menu mobile, pied de page, scripts communs) + contenu |
| `css/agenda.css` | Styles propres à la page (`.ag-*`) |
| `js/sessions-ui.js` · `css/sessions.css` | **Calendrier des formations** (`[data-sessions-calendar]`) : grille du mois, pastilles colorées selon les places, fiche de la session sélectionnée, actualisation toutes les 45 s |
| `js/agenda.js` | Colle de page : `--ag-hh` (hauteur d'en-tête), sauts d'ancre accessibles, bouton « Assistant », **liste des sessions publiées** (filtre par formation, places « X disponibles sur Y », inscription à une session, état vide honnête) |
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

## Calendrier des formations

- Mois affiché : celui de la première session réservable (sinon le mois courant) ; flèches mois précédent / suivant
  (jamais avant le mois courant). Lundi en premier ; arabe : grille en miroir.
- Pastilles : **vert** = places disponibles, **ambre** = dernières places (≤ 3 ou ≤ 20 %), **gris barré** = complet ou
  inscriptions clôturées. Calendrier étroit (téléphone, colonne) : la pastille montre seulement « 9/10 » ; le nom complet
  est dans l'étiquette accessible et dans la fiche.
- Fiche de la session : date, horaires, lieu, langue, grand compteur « 9 / 10 », jauge (une case par place), bouton
  **Réserver cette session** (`inscription.html?formation=…&session=…`) et la mention « disponibilité indicative ».
- « Places mises à jour en direct » n'apparaît que si les places viennent de la feuille de réservation.

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
- Contenu **traduit dans les 10 langues** (`data-i18n` + `js/i18n-data-agenda.js`, clés `ag.*` ; calendrier et places :
  `js/i18n-data-sessions.js`, clés `sess.*`). Les chiffres du bandeau de confiance sont les mêmes dans toutes les langues.

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
