# Sessions de formation — comment publier une date

Une **session** = un jour où une formation est réellement organisée. Les dates ne sont **jamais écrites dans une
page HTML** : elles viennent d'**une seule source**, lue par le site tout entier.

| Où la session apparaît | Fichier |
|---|---|
| Page **VCA Base** (section « Disponibilités ») | `js/formation-vca.js` |
| Page **Agenda** (liste + filtre par formation) | `js/agenda.js` |
| **Inscription** (`?formation=…&session=…`) : la session est vérifiée puis reprise dans le récapitulatif | `js/registration.js` |
| **Recherche** du site (groupe « Prochaines sessions ») | `js/search.js` |
| **Assistant** Wisy (« Quelles sont les prochaines sessions ? ») | `js/assistant/` |

Le module `js/sessions.js` (`WisySessions`) valide, trie et distribue les sessions. Il ne touche jamais au DOM.

## Aujourd'hui : aucune session publiée

`js/sessions-data.js` est **vide**. Les pages affichent alors « Aucune session n'est publiée pour le moment » ou
« Consultez les prochaines disponibilités », avec les boutons Agenda et Contact — jamais une date inventée.

## Option 1 — le fichier `js/sessions-data.js` (par défaut, le plus simple)

Ajoutez un bloc entre les crochets (une virgule entre deux blocs), enregistrez, mettez en ligne. Toutes les pages
sont à jour.

```js
{
  id: "2026-11-05-fr",      // unique ; minuscules, chiffres, tirets — ex. la date et la langue
  training: "vca-base",     // identifiant de la formation (voir js/site-content.js : vca-base, nacelle, beps…)
  date: "2026-11-05",       // AAAA-MM-JJ, un vrai jour du calendrier
  startTime: "09:00",       // facultatif
  endTime: "16:30",         // facultatif
  language: "fr",           // facultatif — fr, nl, en…
  location: "…",            // facultatif — sinon le centre d'Anderlecht, uniquement pour une formation dont le lieu est confirmé
  capacity: 12,             // facultatif — places au total
  seatsLeft: 12,            // facultatif — places encore libres (0 = complet)
  status: "open"            // facultatif — open (défaut), full (complet) ou cancelled (annulée : elle disparaît)
}
```

> ⚠ Les valeurs ci-dessus sont un **modèle de format**. N'écrivez que des sessions **réelles**.

Règles utiles :

- Les sessions **passées disparaissent toutes seules** (jour civil et heure de fin, à l'heure de Bruxelles).
- `seatsLeft: 0` (ou `status: "full"`) affiche « Complet » : la session reste visible mais n'est plus réservable.
- Une session mal remplie **n'est pas affichée** et la console du navigateur (F12 → Console) dit pourquoi :
  `[Wisy sessions · sessions-data.js] session ignorée (…) : date : format AAAA-MM-JJ…`.
- `tests/sessions.test.js` vérifie que toutes les sessions du fichier sont valides et que leur formation existe
  (`node --test tests/*.test.js`).

## Option 2 — une table Supabase (sans toucher au code)

1. Supabase → **SQL Editor** → collez et lancez `supabase/sessions.sql` (une seule fois ; idempotent).
2. Donnez le rôle administrateur à votre compte : `supabase/harden-admin.sql`, **BLOC 1**.
3. Dans `js/supabase-config.js`, remplacez `SESSIONS_SOURCE: "data"` par `SESSIONS_SOURCE: "supabase"`.
4. Ajoutez vos sessions dans **Table Editor → training_sessions** (colonne `published` = vrai pour les afficher).

Sécurité : le public (la clé publique du site) ne peut que **lire** les lignes `published = true`. Seul un compte
administrateur peut écrire ou voir les brouillons. Aucune clé privée n'est utilisée par le site. Si la table est
injoignable (panne, réseau), le site **retombe automatiquement** sur `js/sessions-data.js` : aucune page cassée.

## Comment une session mène à l'inscription

Le bouton « Choisir cette session » / « S'inscrire à cette session » ouvre
`inscription.html?formation=vca-base&session=<id>`. Le parcours :

1. présélectionne la formation (1 participant) ;
2. **vérifie** la session auprès de `WisySessions` — elle doit exister, être à venir, ouverte, avec des places, et
   appartenir à la formation demandée ;
3. l'affiche dans le récapitulatif (« Session · Jeudi 5 novembre 2026 · 09:00 – 16:30 · Français ») ;
4. si elle n'est plus disponible, dit « La session demandée n'est plus disponible… » sans bloquer l'inscription ;
5. transmet `sessionId` dans la commande.

Une date lue dans l'adresse n'est **jamais** utilisée : seul l'identifiant compte, et il est filtré
(`[a-z0-9-]{3,64}`) avant tout usage.

## Vérifier rapidement

```bash
node --test tests/sessions.test.js
```

Puis ouvrez `formation-vca-base.html`, `agenda.html` et `inscription.html?formation=vca-base` : la session doit
apparaître sur la première et la deuxième, et être présélectionnée sur la troisième via le bouton d'inscription.
