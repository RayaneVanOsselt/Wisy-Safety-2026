# Avis clients (Google Sheets) — guide complet

La page **Avis** (`avis.html`) permet à un client de laisser un avis (prénom, note, titre, texte…) et affiche les
avis publiés dans le carrousel, avec la note moyenne. **Le design de la page n'a pas changé** : seul le « moteur »
derrière a été remplacé.

Les avis sont gérés dans **une feuille Google Sheets** « Avis - Wisy Safety » — le même système que la feuille
d'avis Rufix Barber. Pas de Supabase, pas de page d'administration, pas de mot de passe à retenir.

```
 Visiteur                        Votre compte Google
 avis.html ── nouvel avis ──▶ script de la feuille ──▶ feuille « Avis » (PRIVÉE)    ──▶ e-mail « Nouvel avis à valider »
                                                        ligne ajoutée : En attente       à info@wisysafety.be
 avis.html ◀── avis Confirmé ── script de la feuille ◀── vous mettez Statut = Confirmé
```

| Statut | Effet sur le site |
|---|---|
| **Confirmé** (vert) | **publié sur le site**. « Publié le » se remplit tout seul (c'est la date affichée sur la carte). |
| **En attente** (orange) | **attendre validation** : l'avis n'apparaît pas. Tout nouvel avis arrive ainsi. |
| **Refusé** (rouge) | jamais publié. La ligne reste pour l'historique (vous pouvez aussi la supprimer). |

**Ce que le site reçoit** : seulement les avis « Confirmé » — prénom, nom ou initiale, société / fonction, note,
titre, texte, date. **Jamais l'e-mail**, jamais un avis en attente ou refusé. La feuille n'est jamais publiée.

---

## 1. Mise en service — une seule fois (± 10 minutes)

### Étape 1 — Créer la feuille

1. Connectez-vous à Google avec le compte de Wisy Safety, ouvrez [sheets.new](https://sheets.new) (nouvelle feuille).
2. Inutile de la renommer ou de créer des colonnes : l'étape 2 s'en charge (nom « Avis - Wisy Safety »).
3. **Partage** : laissez « Accès limité ». Ne choisissez **jamais** « Tous les utilisateurs disposant du lien »
   (la feuille contient les e-mails des clients).

### Étape 2 — Installer le script

1. Dans la feuille : **Extensions › Apps Script**. Un éditeur s'ouvre dans un nouvel onglet.
2. Effacez tout le contenu du fichier `Code.gs`, collez **tout** le contenu de `google-sheets/avis.gs` (dépôt du
   site), cliquez sur l'icône **Enregistrer** (disquette). Vous pouvez renommer le projet « Avis Wisy Safety ».
3. Dans la barre d'outils, la liste à droite de « Débogage » affiche le nom d'une fonction : choisissez
   **`installer`**, puis **Exécuter**.
4. Google demande une autorisation : **Examiner les autorisations** › votre compte › **Paramètres avancés** ›
   **Accéder à … (non sécurisé)** › **Autoriser**. Cet avertissement est normal : c'est votre propre script. Il n'a
   accès qu'à cette feuille (mention `@OnlyCurrentDoc`) et à l'envoi d'e-mails (pour vous prévenir des nouveaux avis).
5. Revenez sur l'onglet de la feuille et cliquez **OK** dans la fenêtre « Feuille prête ». Rechargez la page (F5) :
   le menu **Wisy Safety** apparaît en haut.

La feuille est prête :

- onglet **Avis** — 11 colonnes : Reçu le · Statut · Note · Prénom · Nom · Société / fonction · Titre · Avis ·
  E-mail (jamais publié) · Publié le · Référence. En-têtes vert foncé avec une note explicative au survol, lignes
  alternées, filtres, liste **Confirmé / En attente / Refusé** en couleur, les avis **en attente surlignés** (à
  traiter), les refusés grisés, notes « 5 / 5 », dates au format JJ/MM/AAAA, fuseau horaire de Bruxelles ;
- onglet **Tableau de bord** — légende des statuts, nombre d'avis publiés / en attente / refusés, note moyenne
  publiée, répartition des notes (barres), lien vers la page du site. Tout se recalcule seul.

### Étape 3 — Publier le script comme « Application Web »

1. Dans l'éditeur Apps Script : **Déployer › Nouveau déploiement**.
2. Roue dentée « Sélectionner le type » › **Application Web**.
3. Description : « Avis du site » · **Exécuter en tant que : Moi** · **Qui a accès : Tout le monde**.
   (« Tout le monde » = le site peut envoyer un avis et lire les avis confirmés ; la feuille, elle, reste privée.)
4. **Déployer** › copiez l'**URL de l'application Web** (elle se termine par `/exec`).
5. Contrôle : collez cette URL dans votre navigateur → la page affiche
   `{"status":"ok","stats":{"count":0,"average":null},"reviews":[]}`.

### Étape 4 — Brancher le site

1. Ouvrez `js/avis-config.js` et collez l'URL entre les guillemets :
   `API_URL: "https://script.google.com/macros/s/……/exec"`
2. Publiez le site comme d'habitude (commit sur `main` → GitHub Pages, 1 à 3 minutes).

Tant que l'adresse est vide, la page reste en place sans avis affiché (« En attente des premiers avis publiés ») et
le formulaire indique que le dépôt n'est pas encore activé : **aucun faux avis** n'est jamais affiché.

### Étape 5 — Tester (2 minutes)

1. Sur la page Avis du site, envoyez un avis de test → écran « Merci pour votre avis » avec une référence
   `WS-2026-XXXXX`.
2. Dans la feuille : une nouvelle ligne **En attente** (surlignée) est apparue, et un e-mail « Nouvel avis à
   valider » est arrivé sur info@wisysafety.be (regardez dans les indésirables la première fois).
3. Passez son Statut sur **Confirmé** → « Publié le » se remplit → rechargez la page Avis : l'avis est affiché et la
   note moyenne est calculée.
4. Remettez-le sur **Refusé** (ou supprimez la ligne) : il disparaît du site.

---

## 2. Au quotidien

- **Publier** un avis : Statut → **Confirmé** (liste déroulante), ou sélectionnez une ou plusieurs lignes puis
  **Wisy Safety › Publier les avis sélectionnés**. Le site est à jour aussitôt (rechargez la page).
- **Refuser** : Statut → **Refusé** (ou **Wisy Safety › Refuser les avis sélectionnés**).
- **Corriger une faute de frappe** avant de publier : modifiez directement la cellule « Avis » ou « Titre ».
- **Changer la date affichée** : modifiez « Publié le » (JJ/MM/AAAA).
- **Ajouter un avis reçu autrement** (e-mail, Google…) : ajoutez une ligne à la main — au minimum Statut, Note,
  Prénom et Avis. Seuls les avis réels avec l'accord de la personne doivent être publiés.
- **Répondre à un client** : son e-mail est dans la colonne « E-mail (jamais publié) », et l'e-mail de notification
  permet de lui répondre directement (« Répondre »).

Menu **Wisy Safety** de la feuille :

| Menu | Effet |
|---|---|
| ✅ Publier les avis sélectionnés | Statut « Confirmé » + date de publication |
| ⏳ Remettre en attente les avis sélectionnés | l'avis disparaît du site |
| ⛔ Refuser les avis sélectionnés | l'avis disparaît du site, la ligne reste grisée |
| Voir ce qui est publié sur le site | nombre d'avis, note moyenne et derniers avis tels que le site les reçoit |
| Vérifier les données | signale un statut incompris, une note manquante, un avis confirmé incomplet |
| Envoyer un e-mail de test | vérifie la notification (et l'autorise la première fois) |
| Préparer / mettre en forme la feuille | refait la mise en forme ; à relancer après une mise à jour du script — **rien n'est jamais effacé** |

## 3. Mettre à jour le script

Quand `google-sheets/avis.gs` change dans le dépôt : Apps Script › tout remplacer par le nouveau contenu ›
Enregistrer › **Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer**. L'adresse
`/exec` ne change pas : rien à modifier sur le site. Relancez ensuite **Wisy Safety › Préparer la feuille**.

Réglages en haut du script (`CONFIG`) : `NOTIFY_EMAIL` (adresse prévenue à chaque nouvel avis, `""` = aucun
e-mail), `PER_EMAIL_PER_HOUR` (3 avis par heure et par adresse e-mail, comme annoncé dans la politique de
confidentialité), `MAX_PUBLISHED` (60 avis les plus récents envoyés au site — la note moyenne compte tous les
avis confirmés).

## 4. Sécurité et confidentialité (résumé)

- ✅ La feuille reste **privée** ; le site ne la lit jamais : il passe par le script, qui ne renvoie que les avis
  **Confirmé**, sans e-mail.
- ✅ Un visiteur ne peut **rien publier** lui-même : tout avis envoyé arrive « En attente ».
- ✅ Le script **revalide tout** (prénom, e-mail, note 1–5, longueur, consentement) et écrit les textes tels quels
  (un texte commençant par `=` ne devient jamais une formule).
- ✅ Anti-spam : champ piège invisible, 3 avis par heure et par e-mail, 30 par heure et 100 par 6 heures au total ;
  un double envoi (même e-mail, même texte) ne crée pas de doublon.
- ✅ `@OnlyCurrentDoc` : le script n'a accès à aucun autre fichier de votre Google Drive.
- ✅ Aucune donnée n'est gardée dans le navigateur du visiteur ; l'avis part dans le corps d'une requête HTTPS.

## 5. Fichiers

| Fichier | Rôle |
|---|---|
| `avis.html` | Page publique (design inchangé) |
| `js/avis-config.js` | Adresse `/exec` du script de la feuille (vide = dépôt pas encore activé) |
| `js/avis-core.js` | Client de la feuille : envoi d'un avis, lecture des avis confirmés, réponses vérifiées |
| `js/reviews.js` | Logique de la page : étoiles, validation, états, stats, carrousel |
| `js/i18n-data-avis.js` | Traductions de la page (10 langues) |
| `google-sheets/avis.gs` | Script à coller dans la feuille (réception, publication, e-mail, menu, mise en forme) |
| `tests/avis.test.js` | Tests (client + script exécuté sur une fausse feuille Google Sheets) |

**Ancien système retiré (14/10/2026)** : Supabase pour les avis (`supabase/schema.sql`, page `admin/avis.html`,
SDK Supabase et EmailJS sur la page Avis). L'adresse du projet Supabase ne répondait plus : aucun avis n'était
récupérable. La politique de confidentialité et les mentions légales citent désormais Google Sheets.
