# Registre des certificats — guide complet

La page **Vérification des certificats** (`certificats.html`) permet à un titulaire ou à un employeur de vérifier
un certificat délivré par Wisy Safety : il saisit le **nom de famille** et la **date de naissance**, et le site affiche
aussitôt le statut (**valide, expiré, révoqué** ou **validité à confirmer**), la formation, le numéro et les dates.

Tout repose sur **Supabase**, déjà utilisé par le site pour les avis clients : **pas de WordPress, pas de serveur à
installer, rien à payer en plus** pour un registre de cette taille. Les personnes s'ajoutent depuis une page
d'administration privée (`/admin/certificats.html`), une par une ou **en masse depuis Excel**.

```
 Visiteur                         Supabase (votre projet)                        Vous (administrateur)
 certificats.html  ── nom + date ──▶  verify_certificate()  ──▶  table privée  ◀──  admin/certificats.html
                   ◀── statut ─────   (seule porte publique)     certificates        (connexion + rôle admin)
```

---

## 1. Mise en service — une seule fois (± 10 minutes)

### Étape 1 — Créer le registre dans Supabase

1. Ouvrez [supabase.com](https://supabase.com) → votre projet (celui des avis : `frylezdzcuegyqqmxris`).
2. Menu de gauche **SQL Editor** → **New query**.
3. Copiez **tout** le contenu du fichier `supabase/certificats.sql`, collez-le, cliquez sur **Run**.
   Le message « Success. No rows returned » s'affiche. Le fichier peut être relancé sans risque (il ne supprime jamais
   de certificat) — utile après une mise à jour.
4. (Facultatif) Contrôle : dans une nouvelle requête, lancez
   `select public.verify_certificate('Test', '1990-01-01');` → la réponse doit contenir `"status": "not_found"`.

### Étape 2 — Le compte administrateur

Le registre n'est visible **que** par un compte portant le rôle « admin » (un simple compte connecté ne voit rien).

1. **Authentication → Users** : si le compte `info@wisysafety.be` n'existe pas encore (il existe si vous modérez déjà
   les avis), cliquez **Add user → Create new user**, saisissez l'e-mail et un **mot de passe fort**.
2. **Authentication → Sign In / Providers** : désactivez **« Allow new users to sign up »** (personne d'autre ne
   doit pouvoir créer de compte).
3. **SQL Editor**, lancez (en remplaçant l'e-mail si besoin) :

   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    where email = 'info@wisysafety.be';
   ```

   C'est la même commande que le « bloc 1 » de `supabase/harden-admin.sql` : si vous l'avez déjà faite pour les
   avis, rien à refaire.
4. Choisissez un mot de passe long et unique pour ce compte : c'est la clé du registre.

### Étape 3 — Mettre le site en ligne

Publiez les fichiers du site comme d'habitude (fusion de la branche / de la *pull request* puis déploiement).
La clé utilisée par la page est la clé **publique** déjà présente dans `js/supabase-config.js` : aucune nouvelle clé,
aucun secret à copier.

### Étape 4 — Tester (2 minutes)

1. Ouvrez `https://www.wisysafety.be/admin/certificats.html`, connectez-vous.
2. **Ajouter une personne** : Nom `Demo`, Formation `VCA Base`, N° `DEMO-0001`, Date de naissance `01/01/1990`,
   Date de formation `15/01/2026`, Valable jusqu'au `15/01/2036` → **Enregistrer**.
3. Sur `certificats.html` : nom `demo`, date `01/01/1990` → le certificat s'affiche, **Valide**.
4. Supprimez la fiche de démonstration (ouvrir la ligne → **Supprimer**).

Tant que l'étape 1 n'est pas faite, la page affiche proprement « Vérification en ligne bientôt disponible » avec un
bouton de contact : **aucune erreur visible** pour les visiteurs.

---

## 2. Ajouter et gérer les personnes (au quotidien)

Tout se fait sur **`/admin/certificats.html`** (page privée, non référencée par Google).

### A. Une personne à la fois

**Ajouter une personne** → remplissez la fiche → **Enregistrer**.

- Obligatoires : **nom de famille**, **formation**, **numéro de certificat** (bouton **Générer** si vous n'en avez
  pas : format `WS-2026-XXXXX`, toujours unique).
- **Date de naissance** : indispensable pour que la personne soit trouvable en ligne (jamais affichée au public).
- **Valable jusqu'au** : boutons **+1 an / +3 ans / +5 ans / +10 ans** calculés depuis la date de formation.
  Vide = « validité à confirmer » sur le site.
- **Autres noms** (nom d'usage, de naissance…) séparés par « ; » : la personne est aussi trouvée avec ces noms.
- Champs **internes** (entreprise, e-mail, téléphone, notes, motif de révocation) : **jamais affichés au public**.

### B. Toute une liste depuis Excel

1. **Importer depuis Excel → Télécharger le modèle Excel (CSV)** : il s'ouvre dans Excel avec les bonnes colonnes.
2. Remplissez une ligne par certificat (dates au format **JJ/MM/AAAA**).
3. Excel : **Fichier → Enregistrer sous → « CSV UTF-8 (délimité par des virgules) »** (ou « CSV séparateur
   point-virgule »). Un fichier `.xlsx` est refusé avec cette explication.
4. Déposez le fichier : un **aperçu** liste chaque ligne (Nouveau / Mise à jour / Erreur, avec la raison).
   **Rien n'est enregistré** avant le bouton **Importer N lignes**.
5. Relancer le **même fichier** ne crée **aucun doublon** : une ligne dont le numéro existe déjà **met à jour** le
   certificat, et une cellule vide **ne modifie rien**.

| Colonne du modèle | Contenu | Obligatoire |
|---|---|---|
| `numero_certificat` | Numéro imprimé sur le certificat (unique) | oui (ou case « Générer un numéro ») |
| `nom` | Nom de famille | oui |
| `prenom` | Prénom | conseillé |
| `autres_noms` | Autres noms, séparés par « ; » | non |
| `date_naissance` | JJ/MM/AAAA — jamais affichée | conseillé (sinon introuvable en ligne) |
| `formation` | Intitulé de la formation | oui |
| `date_formation` | JJ/MM/AAAA | conseillé |
| `date_delivrance` | JJ/MM/AAAA, si différente | non |
| `date_expiration` | Dernier jour de validité, JJ/MM/AAAA | conseillé |
| `revoque` | oui / non | non (non par défaut) |
| `motif_revocation` | Interne | non |
| `entreprise`, `email`, `telephone`, `notes` | Internes | non |

Les intitulés d'un ancien fichier sont reconnus aussi : « Nom de famille », « Prénom », « Date de naissance »,
« Formation suivie », « Numéro de diplôme », « Valable jusqu'au », l'ancien modèle WordPress (`id_wordpress`,
`numero_diplome`, `employeur`…), et les intitulés anglais / néerlandais courants. Une colonne inconnue est simplement
ignorée (et signalée).

**Aucune donnée n'est devinée** : une date impossible (31/02/1990) ou à deux chiffres (03/04/90) fait refuser la
ligne, avec la raison, au lieu de l'enregistrer de travers.

### C. Modifier, révoquer, supprimer, PDF, sauvegarde

- **Modifier** : cliquez sur la ligne (recherche par nom, numéro, formation ou entreprise ; filtres par statut en
  cliquant sur les compteurs en haut, dont « Expirent sous 90 jours » et « Sans date de naissance »).
- **Révoquer** : cochez « Certificat révoqué » → le site affiche « Révoqué », quelle que soit la date de validité.
- **Supprimer** : bouton rouge dans la fiche (confirmation demandée, définitif).
- **PDF** (facultatif) : « Joindre un PDF » (5 Mo max) — rangé dans un espace **privé** ; vous seul pouvez l'ouvrir.
  Le PDF n'est **jamais** proposé au public.
- **Exporter** : télécharge le registre (ou le résultat filtré) en CSV pour Excel — à faire régulièrement comme
  **sauvegarde**. Le fichier exporté se réimporte tel quel.

### D. Alternative : directement dans Supabase

**Table Editor → certificates** fonctionne comme un tableur (ajout de ligne, modification, import CSV). Les clés de
recherche (`name_keys`) se calculent toutes seules. La page d'administration reste plus simple et contrôle les
saisies (dates, doublons) avant l'enregistrement.

---

## 3. Ce que voit le public — et ce qui reste privé

| Affiché après une recherche **exacte** (nom + date de naissance) | Jamais affiché, jamais transmis au navigateur |
|---|---|
| Prénom et nom du titulaire | Date de naissance |
| Formation suivie, numéro du certificat | Entreprise, e-mail, téléphone, notes, motif de révocation |
| Dates de formation, de délivrance et de fin de validité | Le PDF du certificat |
| Statut : valide / expiré / révoqué / validité à confirmer | Une liste de certificats ou de personnes |

Le nom est comparé **sans tenir compte** des majuscules, accents, espaces, tirets et apostrophes
(« Van-Össelt » = « van osselt »), mais **jamais approximativement** : « Dupon » ne trouve pas « Dupont ». Une
personne qui saisit « Dupont Marie » (nom + prénom) est retrouvée aussi.

---

## 4. Sécurité — ce qui protège le registre

- **Table privée (Row Level Security)** : la clé publique du site ne donne **aucun** accès aux tables. Le public ne
  peut appeler qu'une fonction, `verify_certificate`, qui exige la correspondance exacte et ne renvoie que les champs
  publics ci-dessus.
- **Anti-essais automatisés** : 10 vérifications par visiteur sur 15 minutes, 50 sur 24 heures, 1 500 par heure au
  total. Au-delà : message « Trop de vérifications, réessayez dans N min ». Les adresses IP ne sont **jamais
  stockées** : seulement une empreinte salée (SHA-256), effacée après 48 heures.
- **Administration** réservée au rôle « admin » (impossible à s'attribuer soi-même) ; inscriptions désactivées.
- **Navigateur** : rien n'est conservé (ni cookie, ni stockage, ni URL) ; le nom et la date partent dans le corps
  d'une requête chiffrée (HTTPS) ; toute donnée reçue est affichée comme du texte (pas d'injection possible).
- **Excel** : l'export neutralise les formules (une cellule « =… » ne s'exécute pas à l'ouverture).

### Ce qui a été vérifié

Le fichier `supabase/certificats.sql` a été **exécuté sur un vrai PostgreSQL 16** (même moteur que Supabase) avec un
scénario de **46 contrôles**, tous réussis : installation et ré-installation sans erreur ; public sans aucun accès
aux tables, au sel ni au journal ; compte connecté **sans** rôle admin qui ne voit et ne modifie rien ; réponse limitée
aux champs publics (ni date de naissance, ni entreprise, ni e-mail, ni note) ; recherche exacte (date différente ou nom
partiel → introuvable) ; autres noms et « nom + prénom » ; statuts valide / expiré / révoqué / à confirmer ;
validations (date impossible, future, trop ancienne, nom trop long ou avec chiffres, tentative d'injection SQL) ;
limitation (11e tentative refusée, autre visiteur non bloqué, levée après 15 min, plafond global) ; journal sans IP en
clair ; numéro unique ; stockage PDF privé.

Côté site : `tests/certificats.test.js` (22 tests : client, import / export Excel, invariants de sécurité du SQL,
page, administration, recherche, assistant, Centre d'aide) — la suite complète passe (`node --test tests/*.test.js`).

---

## 5. Recherche du site, Centre d'aide et assistant IA

- **Recherche** (barre du haut) : la page « Vérification des certificats » est dans le registre du site
  (`js/site-content.js`, 10 langues) : taper « vérifier certificat », « certificat valide », « verify certificate »,
  « certificaat controleren »… la propose.
- **Centre d'aide** : nouvelle question « Comment vérifier la validité d'un certificat Wisy Safety ? » (10 langues),
  avec le bouton « Vérifier un certificat ».
- **Assistant Wisy** (moteur local) : « vérifier un certificat », « mon certificat est-il valide ? », « j'ai perdu mon
  attestation »… → il renvoie vers la page et le contact. **Il ne consulte jamais le registre** et ne répète aucune
  donnée personnelle, même si on lui donne un nom et une date de naissance.
- **Assistant IA serveur** (Claude, optionnel) : la même règle est écrite dans son prompt
  (`supabase/functions/chat/index.ts`, copie dans `chatbot/system-prompt.md`).

---

## 6. Réglages

| Je veux… | Où |
|---|---|
| Changer les limites anti-abus | `supabase/certificats.sql`, en tête de la fonction `verify_certificate` (`c_per_window`, `c_window`, `c_per_day`, `c_global_hour`), puis relancer le fichier dans SQL Editor |
| Changer les textes de la page (10 langues) | `js/i18n-data-certificats.js` (le français doit rester identique au HTML de `certificats.html`) |
| Changer le style / les animations | `css/certificats.css` (en-tête du fichier : direction artistique et règles) |
| Changer le comportement de la page | `js/certificats.js` (interface) et `js/certificats-core.js` (validation, client du registre) |
| Changer l'import / l'export Excel | `js/certificats-import.js` (colonnes, intitulés reconnus, règles) |

Après une modification : `node --test tests/*.test.js` (et `node scripts/build-seo.js && node scripts/sync-edge.js`
si le registre du site a changé).

---

## 7. Dépannage

| Symptôme | Cause / solution |
|---|---|
| La page affiche « Vérification en ligne bientôt disponible » | `supabase/certificats.sql` n'a pas été exécuté (étape 1), ou l'adresse / la clé de `js/supabase-config.js` ne correspondent pas au projet. |
| Administration : « Ce compte n'a pas le rôle administrateur » | Étape 2.3, puis **se déconnecter et se reconnecter** (le rôle est lu à la connexion). |
| Administration : « La table n'existe pas encore » | Étape 1. |
| Un certificat existe mais n'est pas trouvé | Vérifier la **date de naissance** de la fiche (compteur « Sans date de naissance ») et l'orthographe du nom ; ajouter l'autre nom dans « Autres noms ». |
| Accents cassés après un import | Le fichier n'était pas en UTF-8 : réenregistrer en « CSV UTF-8 ». (Les CSV Windows classiques sont aussi détectés automatiquement.) |
| « Trop de vérifications » pendant vos tests | Limite anti-abus : attendre 15 minutes, ou vider le journal : `delete from public.certificate_lookups;` |
| Mot de passe administrateur oublié | Supabase → Authentication → Users → supprimer le compte, puis refaire l'étape 2 (création + rôle admin). Les certificats ne sont pas touchés. |

---

## 8. Et WordPress ?

La page n'utilise **plus** l'extension WordPress `wordpress/wisy-certificats/` (ni `tests/wordpress/`). Elle est
laissée dans le dépôt, inutilisée, au cas où vous voudriez la consulter ; vous pouvez la supprimer quand vous voulez.
**Reprendre des certificats saisis dans WordPress** : exportez-les en CSV (l'extension fournissait un modèle de
mêmes intitulés), puis importez le fichier dans `/admin/certificats.html` : les colonnes sont reconnues.

## 9. À faire de votre côté

- **Politique de confidentialité** : ajouter le traitement « vérification des certificats » (données : nom, prénom,
  date de naissance, formation, numéro, dates ; finalité : permettre la vérification d'un certificat ; journal
  anti-abus pseudonymisé conservé 48 h ; prestataire : Supabase). Ce texte juridique n'a pas été rédigé à votre
  place : il doit être validé par Wisy Safety.
- Informer les participants, au moment de la formation, que leur certificat sera vérifiable en ligne.

## 10. Fichiers

| Fichier | Rôle |
|---|---|
| `supabase/certificats.sql` | Registre : table, règles d'accès, fonction de vérification, anti-abus, stockage PDF |
| `certificats.html`, `css/certificats.css`, `js/certificats.js` | Page publique (design, animations, accessibilité) |
| `js/certificats-core.js` | Validation des saisies et client du registre (sans interface, testé) |
| `js/i18n-data-certificats.js` | Textes de la page en 10 langues |
| `admin/certificats.html`, `js/certificats-admin.js` | Administration privée |
| `js/certificats-import.js` | Import / export Excel (sans interface, testé) |
| `tests/certificats.test.js` | Tests automatiques |
