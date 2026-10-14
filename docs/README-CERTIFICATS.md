# Registre des certificats (Google Sheets) — guide complet

La page **Vérification des certificats** (`certificats.html`) permet à un titulaire ou à un employeur de vérifier un
certificat délivré par Wisy Safety : il saisit le **nom de famille** et la **date de naissance**, et le site affiche
aussitôt le statut (**valide, expiré, annulé** ou **validité à confirmer**), la formation, le numéro et les dates.

Les certificats sont gérés dans **une feuille Google Sheets** (un tableur comme Excel, gratuit, dans votre compte
Google). Vous ajoutez une ligne → le site est à jour **immédiatement**, sans republier le site. Pas de WordPress,
pas de base de données, pas de serveur.

```
 Visiteur                          Votre compte Google
 certificats.html ── nom + date ──▶ script de la feuille (« Application Web ») ──▶ feuille Google Sheets PRIVÉE
                  ◀── statut ─────  (recherche exacte, essais limités)              (vous seul y avez accès)
```

**La feuille n'est jamais publiée.** Le site n'y a pas accès : il pose une question au script (« ce nom + cette
date ? ») et le script ne renvoie que la réponse — jamais la feuille, jamais une liste de personnes.

---

## 1. Mise en service — une seule fois (± 15 minutes)

### Étape 1 — Créer la feuille

1. Connectez-vous à Google avec le compte de Wisy Safety, ouvrez [sheets.new](https://sheets.new) (nouvelle feuille).
2. Renommez-la, par exemple « Registre des certificats Wisy Safety ».
3. **Vous avez déjà un fichier Excel ?** Fichier › Importer › Importer (onglet « Importer ») › choisissez votre
   fichier `.xlsx` › « Insérer de nouvelles feuilles ». Renommez ensuite cet onglet **`Certificats`**
   (clic droit sur l'onglet › Renommer). Sinon, rien à faire : l'onglet sera créé à l'étape 2.
4. **Partage** : laissez « Accès limité » (personne d'autre que vous). Ne choisissez **jamais** « Tous les
   utilisateurs disposant du lien ».

### Étape 2 — Installer le script

1. Dans la feuille : **Extensions › Apps Script**. Un éditeur s'ouvre dans un nouvel onglet.
2. Effacez tout le contenu du fichier `Code.gs`, collez **tout** le contenu de `google-sheets/certificats.gs`
   (dépôt du site), cliquez sur l'icône **Enregistrer** (disquette).
3. Revenez sur l'onglet de la **feuille** et rechargez la page (touche F5) : un menu **Wisy Safety** apparaît en
   haut. Cliquez sur **Wisy Safety › Préparer la feuille**.
4. Google demande une autorisation : **Continuer** › votre compte › **Paramètres avancés** › **Accéder à …
   (non sécurisé)** › **Autoriser**, puis relancez **Wisy Safety › Préparer la feuille**. Cet avertissement est
   normal : c'est votre propre script, et il n'a accès qu'à cette feuille (mention `@OnlyCurrentDoc`).
   **Autre façon, depuis l'éditeur Apps Script** : dans la barre d'outils, la liste à droite de « Débogage » affiche
   le nom d'une fonction (par exemple `doPost`) : choisissez **`installer`**, puis cliquez sur **Exécuter**. Si
   l'exécution reste « en cours », allez sur l'onglet de la feuille et cliquez **OK** dans la fenêtre « Feuille prête ».
   Le menu **Wisy Safety** n'apparaît QUE dans la feuille (jamais dans l'éditeur), après un rechargement. S'il
   n'apparaît toujours pas, le script n'est pas rattaché à la feuille : recréez-le depuis la feuille (Extensions ›
   Apps Script), pas depuis script.google.com.
5. L'onglet **Certificats** est prêt, avec 9 colonnes : Numéro de certificat · Nom · Date de naissance · Formation ·
   Langue · Date de formation · Date de délivrance · Valable jusqu'au · Statut. En-têtes vert foncé, lignes alternées,
   filtres, dates au format JJ/MM/AAAA (une date impossible est refusée à la saisie), listes **Actif / Annulé** et
   **Français / Néerlandais / Anglais / Allemand**, « Valable jusqu'au » en couleur (vert = valide, orange = expire
   dans les 90 jours, rouge = expiré), paramètres régionaux Belgique et fuseau horaire de Bruxelles. La feuille
   s'arrête à la dernière colonne utile.
   Si l'onglet contenait déjà des données, elles sont **gardées et corrigées** (voir « Préparer la feuille » plus bas) :
   le « Prénom » éventuel est ajouté au « Nom », les colonnes vides ou inutiles (« Prénom », « Autres noms » vide,
   anciennes colonnes grises « (interne) », ancienne « Validité (automatique) ») sont retirées, l'ancienne colonne
   « Révoqué » oui / non devient « Statut ». Une colonne inconnue qui contient des données est conservée et signalée.

### Étape 3 — Publier le script comme « Application Web »

1. Retournez dans l'onglet de l'éditeur Apps Script : **Déployer › Nouveau déploiement**.
2. Roue dentée « Sélectionner le type » › **Application Web**.
3. Description : « Vérification des certificats » · **Exécuter en tant que : Moi** · **Qui a accès : Tout le
   monde**. (« Tout le monde » = le site peut poser sa question au script ; la feuille, elle, reste privée.)
4. **Déployer** › copiez l'**URL de l'application Web** (elle se termine par `/exec`).
5. Contrôle : collez cette URL dans votre navigateur → la page affiche `{"service":"wisy-certificats","status":"ok"}`.

### Étape 4 — Brancher le site

1. Ouvrez `js/certificats-config.js` et collez l'URL entre les guillemets :
   `API_URL: "https://script.google.com/macros/s/……/exec"`
2. Publiez le site comme d'habitude.

Tant que l'adresse est vide, la page affiche proprement « Vérification en ligne bientôt disponible » avec un bouton
de contact : **aucune erreur visible** pour les visiteurs.

### Étape 5 — Tester (2 minutes)

1. Dans la feuille, ajoutez une ligne : Numéro `DEMO-0001`, Nom `Demo`, Date de naissance `01/01/1990`,
   Formation `VCA Base`, Date de formation `15/01/2026`, Valable jusqu'au `15/01/2036`.
2. Menu **Wisy Safety › Tester une recherche** (`demo`, `01/01/1990`) → la fenêtre montre ce que verra le public.
3. Sur le site, `certificats.html` : même recherche → le certificat s'affiche, **Valide**.
4. Supprimez la ligne de démonstration.

---

## 2. Ajouter et gérer les personnes (au quotidien)

**Une ligne = un certificat.** Ajoutez, modifiez ou supprimez des lignes dans l'onglet `Certificats` : le site en
tient compte dès la recherche suivante. Une personne qui a suivi trois formations a trois lignes (même nom, même
date de naissance) ; la vérification les affiche toutes.

| Colonne | Contenu | Utilisée par le site ? |
|---|---|---|
| **Numéro de certificat** | Numéro imprimé sur le certificat (unique), au format **NA-EL-001** (groupes séparés par des tirets, 3 chiffres à la fin) | affichée |
| **Nom** | Nom et prénom, tels qu'écrits sur le certificat (ex. « Dupont Marie ») — **obligatoire** | sert à la recherche, affichée |
| **Date de naissance** | JJ/MM/AAAA — **sans elle, le certificat est introuvable en ligne** | sert à la recherche, **jamais affichée** |
| **Formation** | Intitulé de la formation — **obligatoire** | affichée |
| **Langue** | Langue dans laquelle la formation a été donnée (liste ; une autre langue peut être tapée). Vide = Français | affichée (traduite dans la langue du visiteur) |
| **Date de formation** | JJ/MM/AAAA | affichée |
| **Date de délivrance** | JJ/MM/AAAA. Vide = même date que la formation (« Préparer la feuille » la recopie) | affichée |
| **Valable jusqu'au** | Dernier jour de validité, JJ/MM/AAAA. Vide = « validité à confirmer ». En couleur : vert = valide, orange = expire dans les 90 jours, rouge = expiré | affichée + statut |
| **Statut** | **Actif** (normal) ou **Annulé** : le site affiche « Annulé », quelle que soit la date | statut |

Vous pouvez ajouter d'autres colonnes à droite (le site ne les lit jamais ; « Préparer la feuille » les garde si elles
contiennent quelque chose) ; ne renommez pas les colonnes utilisées par le site. Les intitulés d'un ancien fichier sont
aussi reconnus (« Nom de famille », « Numéro de diplôme », « Formation suivie », « Date d'expiration », intitulés
anglais / néerlandais courants…). Besoin d'un nom d'usage ou de naissance ? Insérez une colonne **« Autres noms »**
(noms séparés par « ; ») : la personne sera aussi retrouvée avec ces noms, qui ne sont jamais affichés.

### Le menu « Wisy Safety » de la feuille

- **Vérifier les données** : liste les lignes à corriger — date impossible (31/02/1990) ou illisible, nom ou
  formation manquants, numéro en double, ligne sans date de naissance (introuvable en ligne), fin de validité avant
  la formation. Une ligne avec une date illisible est **ignorée par le site** (jamais devinée) tant qu'elle n'est pas
  corrigée. À lancer après chaque gros ajout.
- **Tester une recherche** : montre exactement ce que le public verrait pour un nom et une date (sans compter dans les
  limites d'essais).
- **Préparer / mettre en forme la feuille** : remet l'onglet en forme et corrige les données, puis affiche la liste
  de ce qui a changé. Relançable à volonté (une 2e fois, elle ne change plus rien) :
  - accents abîmés par un copier-coller (« Nacelle √©l√©vatrice » → « Nacelle élévatrice ») ;
  - numéros au format **NA-EL-001** (« NA-EL012 », « NA-EL_015 », « NA-ELE-001 », « VCA_001 » → « NA-EL-012 »,
    « NA-EL-015 », « NA-EL-001 », « VCA-001 ») ;
  - date de délivrance vide = date de formation ; langue vide = Français ; statut vide = Actif ;
  - colonnes inutiles retirées (voir l'étape 2 ci-dessus).

### Astuces

- **Ajouter toute une liste depuis Excel** : copiez les lignes dans Excel, collez-les dans la feuille (mêmes colonnes,
  même ordre : Numéro · Nom · Date de naissance · Formation · Langue · Date de formation · Date de délivrance ·
  Valable jusqu'au · Statut). Ou Fichier › Importer › « Ajouter à la feuille actuelle ». Puis **Préparer la feuille**
  (mise en forme + corrections) et **Vérifier les données**.
- **Annuler un certificat** : choisissez « Annulé » dans la colonne Statut (inutile de supprimer la ligne).
- **Repérer les renouvellements** : les dates « Valable jusqu'au » en **orange** expirent dans les 90 jours. Pour les
  regrouper : icône de filtre de « Valable jusqu'au » › Trier de A à Z, ou Filtrer par couleur › orange.
- **Sauvegarde** : Google garde l'historique des versions (Fichier › Historique des versions). Pour une copie Excel :
  Fichier › Télécharger › Microsoft Excel (.xlsx).
- **Vous travaillez à plusieurs** : partagez la feuille avec les collègues concernés (Partager › leur adresse,
  « Éditeur ») — jamais avec un lien public.

---

## 3. Ce que voit le public — et ce qui reste privé

| Affiché après une recherche **exacte** (nom + date de naissance) | Jamais affiché, jamais transmis |
|---|---|
| Nom du titulaire (tel qu'écrit dans « Nom ») | Date de naissance, autres noms |
| Formation suivie, langue de la formation, numéro du certificat | Toute autre colonne de la feuille |
| Dates de formation, de délivrance et de fin de validité | La feuille elle-même, une liste de personnes |
| Statut : valide / expiré / annulé / validité à confirmer | |

Le nom est comparé **sans tenir compte** des majuscules, accents, espaces, tirets et apostrophes
(« Van-Össelt » = « van osselt »), mais **jamais approximativement** : « Dupon » ne trouve pas « Dupont ». Une
personne qui saisit « Dupont Marie » (nom + prénom) est retrouvée aussi. Si la colonne « Nom » contient un nom en
plusieurs mots (nom composé, ou nom complet « Nom Prénom » comme dans la reprise WordPress), chaque suite de mots suffit
(« El Hammouchi », « Hammouchi », « Ibrahim El Hammouchi »…), jamais un fragment de moins de 3 lettres ; la date de
naissance reste toujours exigée.

---

## 4. Sécurité

- **Feuille privée** : seul votre compte (et ceux avec qui vous la partagez) y a accès. Le script n'a accès qu'à
  cette feuille (`@OnlyCurrentDoc`) et ne lit **jamais** les colonnes internes.
- **Une seule question possible** : nom + date de naissance exacts → réponse limitée aux champs publics.
- **Essais limités** : 10 recherches par heure pour un même nom de famille (impossible d'essayer toutes les dates de
  naissance de quelqu'un), 500 par heure et 1 500 par tranche de 6 heures au total. Au-delà : « Trop de
  vérifications, réessayez dans N min ». Les noms recherchés ne sont jamais conservés en clair (empreinte SHA-256,
  effacée après une heure).
- **Navigateur** : rien n'est conservé (ni cookie, ni stockage, ni URL) ; le nom et la date partent dans le corps
  d'une requête chiffrée (HTTPS) ; tout ce qui revient est affiché comme du texte (pas d'injection possible).

### Ce qui a été vérifié

`tests/certificats.test.js` exécute le **vrai script** `google-sheets/certificats.gs` sur une **fausse feuille
Google Sheets** (cellules date et texte, colonnes internes, lignes vides et erronées) : recherche exacte, champs
publics seulement (ni date de naissance, ni entreprise, ni e-mail, ni note), nom + prénom et autres noms, statuts,
dernier jour de validité inclus, saisies invalides, feuille absente, limites d'essais (11e essai refusé, autre nom non
bloqué, plafond global), contrôle des données (doublons, dates impossibles). Plus le client de la page, la page,
les traductions, la recherche, l'assistant et le Centre d'aide. La suite complète passe.

Le premier essai réel avec **votre** compte Google se fait à l'étape 5.

---

## 5. Recherche du site, Centre d'aide et assistant IA

- **Recherche** (barre du haut) : « vérifier certificat », « certificat valide », « verify certificate »,
  « certificaat controleren »… proposent la page (10 langues).
- **Centre d'aide** : « Comment vérifier la validité d'un certificat Wisy Safety ? » (10 langues), avec le bouton
  « Vérifier un certificat ».
- **Assistant Wisy** : « vérifier un certificat », « mon certificat est-il valide ? », « j'ai perdu mon
  attestation »… → il renvoie vers la page et le contact. **Il ne consulte jamais le registre** et ne répète aucune
  donnée personnelle, même si on lui donne un nom et une date de naissance. Même règle dans le prompt de
  l'assistant IA serveur (`supabase/functions/chat/index.ts`, copie dans `chatbot/system-prompt.md`).

---

## 6. Réglages et mises à jour

| Je veux… | Où |
|---|---|
| Changer les limites d'essais ou le nom de l'onglet | En tête de `google-sheets/certificats.gs` (`CONFIG`), puis recoller le script (ci-dessous) |
| Mettre à jour le script après une modification | 1. Apps Script › tout sélectionner › coller la nouvelle version de `google-sheets/certificats.gs` › Enregistrer. 2. **Déployer › Gérer les déploiements › crayon › Version : Nouvelle version › Déployer** (l'URL ne change pas). 3. Dans la feuille : **Wisy Safety › Préparer / mettre en forme la feuille** |
| Changer l'adresse du script sur le site | `js/certificats-config.js` |
| Changer les textes de la page (10 langues) | `js/i18n-data-certificats.js` (le français doit rester identique au HTML de `certificats.html`) |
| Changer le style / les animations | `css/certificats.css` |
| Changer le comportement de la page | `js/certificats.js` (interface), `js/certificats-core.js` (validation, client du registre) |

Après une modification du site : `node --test tests/*.test.js`.

---

## 7. Dépannage

| Symptôme | Cause / solution |
|---|---|
| La page affiche « Vérification en ligne bientôt disponible » | L'URL n'est pas dans `js/certificats-config.js`, ou l'onglet `Certificats` / les colonnes « Nom », « Date de naissance », « Formation » sont introuvables (menu Wisy Safety › Vérifier les données). |
| La page affiche « Le registre ne répond pas » | Le déploiement n'est pas en « Qui a accès : Tout le monde » (Google renvoie une page de connexion), ou l'URL copiée n'est pas celle qui finit par `/exec`. |
| J'ai modifié le script mais rien ne change | Il faut une **nouvelle version** du déploiement (§ 6). Les modifications de la **feuille**, elles, sont immédiates. |
| Un certificat existe mais n'est pas trouvé | Vérifier la date de naissance de la ligne et l'orthographe du nom (menu › Tester une recherche) ; si la personne utilise un autre nom, insérer une colonne « Autres noms » (§ 2). |
| Des accents bizarres après un copier-coller (« √© » au lieu de « é ») | Menu **Wisy Safety › Préparer / mettre en forme la feuille** : les cellules sont réparées (le site affiche déjà le bon texte). |
| « Numéro au format inhabituel » dans Vérifier les données | Le numéro ne suit pas le modèle NA-EL-001 (ex. une ligne de test « 1 ») : corrigez-le, ou lancez « Préparer la feuille » pour les fautes de format courantes. |
| Une date s'affiche bizarrement (ex. 03/01 au lieu de 01/03) | Fichier › Paramètres › Paramètres régionaux : **Belgique**, puis ressaisir la date. « Préparer la feuille » règle cela automatiquement. |
| « Trop de vérifications » pendant vos tests | Limite d'essais : attendre la fin de l'heure, ou utiliser « Tester une recherche » dans la feuille (sans limite). |

---

## 8. Et WordPress / Supabase ?

La page n'utilise **ni WordPress ni Supabase**. L'ancienne extension `wordpress/wisy-certificats/` (et
`tests/wordpress/`) reste dans le dépôt, inutilisée : vous pouvez la supprimer. Pour reprendre des certificats saisis
dans WordPress : exportez-les en CSV/Excel puis importez-les dans la feuille (étape 1.3). Supabase reste utilisé
uniquement pour les avis clients, comme avant.

## 9. À faire de votre côté

- **Politique de confidentialité** : ajouter le traitement « vérification des certificats » (données : nom, prénom,
  date de naissance, formation, numéro, dates ; finalité : permettre la vérification d'un certificat ; outil : Google
  Sheets / Google Apps Script ; compteur anti-abus pseudonymisé conservé une heure). Ce texte juridique n'a pas été
  rédigé à votre place : il doit être validé par Wisy Safety.
- Informer les participants, au moment de la formation, que leur certificat sera vérifiable en ligne.

## 10. Fichiers

| Fichier | Rôle |
|---|---|
| `google-sheets/certificats.gs` | Script à coller dans la feuille : recherche exacte, limites d'essais, menu Wisy Safety |
| `js/certificats-config.js` | Adresse du script (seul réglage du site) |
| `certificats.html`, `css/certificats.css`, `js/certificats.js` | Page publique (design, animations, accessibilité) |
| `js/certificats-core.js` | Validation des saisies et client du registre (sans interface, testé) |
| `js/i18n-data-certificats.js` | Textes de la page en 10 langues |
| `tests/certificats.test.js` | Tests automatiques (dont le script Google sur une fausse feuille) |
