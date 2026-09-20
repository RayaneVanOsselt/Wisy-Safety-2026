# Avis clients — Guide de mise en route

Section complète de **collecte + modération + affichage** d'avis clients, intégrée au
site statique Wisy Safety (HTML/CSS/JS, sans build). Tout fonctionne côté navigateur ;
la base de données et la sécurité sont assurées par **Supabase** (Row Level Security).

## Fichiers ajoutés

| Fichier | Rôle |
|---|---|
| `avis.html` | Page publique : hero, formulaire de dépôt, carrousel des avis approuvés |
| `js/reviews.js` | Logique : notation étoiles, validation, envoi Supabase, stats, carrousel 3D |
| `js/supabase-config.js` | Configuration (valeurs **publiques** : URL + clé anon Supabase, clés EmailJS) |
| `js/i18n-data-avis.js` | Traductions de la page (10 langues) |
| `supabase/schema.sql` | Table `reviews`, vue publique, RLS, triggers — **à coller dans Supabase** |
| `admin/avis.html` | Interface de modération (connexion Supabase Auth → approuver / refuser / supprimer) |
| `.env.example` | Référence des variables (aucune vraie clé) |

Fichiers modifiés (chirurgical) : lien **« Avis »** ajouté au header (desktop + mobile) de
`index.html`, `contact.html`, `formations.html`, `avis.html`, et clé `nav.avis` (10 langues)
dans `js/i18n-data-common.js`. Rien d'autre n'a été touché.

---

## 1. Créer la base Supabase (5 min)

1. Créez un projet sur [supabase.com](https://supabase.com) (offre gratuite suffisante).
2. Ouvrez **SQL Editor → New query**, collez **tout** le contenu de
   [`supabase/schema.sql`](../supabase/schema.sql), puis **Run**.
   → Cela crée la table `reviews`, la vue publique `approved_reviews` (sans e-mail),
   les politiques RLS et les protections anti-spam.
3. Ouvrez **Project Settings → API** et copiez :
   - **Project URL**
   - **anon public** key

## 2. Brancher le site

Ouvrez [`js/supabase-config.js`](../js/supabase-config.js) et remplacez :

```js
SUPABASE_URL:      "https://VOTRE-PROJET.supabase.co",
SUPABASE_ANON_KEY: "VOTRE_CLE_ANON_PUBLIQUE",
```

C'est tout : la page `avis.html` enregistre les avis (statut `pending`) et affiche
uniquement les avis `approved`.

> La clé **anon** est **conçue pour être publique** : elle n'autorise (via RLS) que
> l'insertion d'un avis en attente et la lecture des avis approuvés **sans e-mail**.
> Ne mettez **jamais** la clé `service_role` dans le site.

## 3. Créer votre accès administrateur

1. Supabase → **Authentication → Users → Add user** : créez un utilisateur (e-mail +
   mot de passe) pour l'équipe.
2. Ouvrez **`admin/avis.html`**, connectez-vous, et modérez :
   **En attente / Approuvés / Refusés** avec les actions **Approuver / Refuser / Supprimer**.

Seuls les utilisateurs connectés (rôle `authenticated`) peuvent lire les e-mails et modérer.
Le public ne le peut pas.

## 4. (Facultatif) Notification e-mail d'un nouvel avis — EmailJS

Le compte EmailJS du formulaire de contact est réutilisé. Pour être prévenu à chaque
nouvel avis :

1. Sur [EmailJS](https://dashboard.emailjs.com), créez un **template** dédié aux avis
   utilisant les variables : `reference`, `first_name`, `rating`, `title`, `company`,
   `message`, `email`, `status`, `time`, `to_email`.
2. Collez son ID dans `js/supabase-config.js` :
   ```js
   EMAILJS_TEMPLATE_ID_REVIEW: "template_xxxxxxx",
   ```

Laissé vide → aucune notification (Supabase reste la source de vérité).

## 5. (Facultatif) Anti-spam renforcé — Cloudflare Turnstile

Déjà en place sans dépendance : **honeypot** + **limite serveur de 3 avis/heure/e-mail**
(dans `schema.sql`). Pour ajouter Turnstile, renseignez `TURNSTILE_SITE_KEY` et validez
le jeton via une *edge function* Supabase (la clé secrète reste côté serveur).

---

## Données de démonstration

- **Tant que Supabase n'est pas configuré**, `avis.html` affiche des cartes **« Démo »**
  (badge visible), définies dans `js/reviews.js` (`DEMO_REVIEWS`) — jamais présentées
  comme de vrais avis. Dès que Supabase est branché, seuls les vrais avis approuvés
  s'affichent.
- Un jeu d'exemple SQL (commenté) est fourni en bas de `schema.sql`, préfixé `DEMO —`,
  avec sa requête de suppression.

## Sécurité (résumé)

- ✅ Le public peut **créer** un avis (`pending`) — jamais le lire, le modifier, l'approuver ou le supprimer.
- ✅ L'**e-mail n'est jamais** exposé au public (vue `approved_reviews` sans e-mail ; pas de SELECT anon sur la table).
- ✅ Validation **front + serveur** (contraintes SQL, trigger qui force `status='pending'`).
- ✅ Anti-spam : honeypot, délai minimal, limite serveur par e-mail.
- ✅ Aucune clé secrète dans le dépôt (seules des clés publiques, protégées par RLS).
- ✅ `prefers-reduced-motion` respecté ; effets 3D désactivés au tactile.
