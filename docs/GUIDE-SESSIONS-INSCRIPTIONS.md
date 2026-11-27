# Sessions, inscriptions et e-mails — guide pratique (27/11/2026)

Ce guide explique ce qui a été mis en place, comment l'activer (≈ 10 minutes), comment tout gérer ensuite dans la
feuille Google, et comment toutes les demandes arrivent dans **info@wisysafety.be**.
Le prompt qui décrit ce travail est dans [prompt-sessions-inscription.md](prompt-sessions-inscription.md).

## 1. Ce qui change sur le site

| Avant | Maintenant |
|---|---|
| Aucune session publiée (l'agenda était vide) | **159 sessions** du 28/11/2026 au 31/03/2027, **5 places** chacune |
| « Sur devis » / « En cours de préparation » sur les formations | **« Paiement le jour de la formation »** |
| Récapitulatif « Sous-total 0,00 € · TVA à déterminer » | **Participants** + **Règlement : sur place, le jour de la formation** |
| Étape 4 « Paiement », logos Stripe / Mollie / PayPal | Étape 4 **« Réservation »**, bouton **« Confirmer ma réservation »**, aucun moyen de paiement |
| « Journée entière » quand l'heure manque | **« Horaire à confirmer »** |
| Pas de BA4 | **BA4 — Personne avertie** dans l'inscription, l'agenda et la feuille (sans page dédiée pour l'instant) |

Planning (une session par formation et par jour) :

| Lundi | Mardi | Mercredi | Jeudi | Vendredi | Samedi | Dimanche |
|---|---|---|---|---|---|---|
| Nacelles + CP3 | BA4 | VCA Base | BA4 | Diisocyanates (risque chimique) + CP3 | Nacelles | VCA Base |

Soit : Nacelles 36 sessions · VCA Base 36 · CP3 35 · BA4 35 · Diisocyanates 17.

L'e-mail de confirmation envoyé au client dit désormais : « **Paiement : sur place, le jour de la formation. Aucun
paiement en ligne n'est demandé.** » et, tant que l'heure n'est pas fixée, « L'horaire de la session vous sera
confirmé par e-mail avant la formation. »

## 2. Mise en service — à faire une seule fois, dans cet ordre

> ✅ **Fait le 27/11/2026** : script 1.2.0 collé et déployé, *Installer / réparer* lancé, **159 sessions** ouvertes,
> e-mail de test reçu dans info@wisysafety.be, site fusionné dans `main` (PR n° 85) ; la page Agenda affiche
> « 5 places disponibles sur 5 ».
>
> ✅ **Version 1.2.1 déployée le 27/11/2026 à 17:51** (version 5 du déploiement, même adresse `/exec`) : l'adresse de
> facturation est **facultative** dans la feuille. Vérifié en ligne : `"version":"1.2.1"`, et une réservation sans
> adresse n'est plus refusée. Le site sans bloc de facturation peut donc être mis en ligne.
>
> 💡 Pour copier le script sans abîmer les accents : sur GitHub, ouvrez `google-sheets/reservations.gs` et cliquez sur
> l'icône **Copier le fichier brut** (« Copy raw file »). Vérifiez ensuite dans l'éditeur Apps Script que le mot
> « Réservations » s'affiche avec un vrai « é » (et pas « √© »).

1. Ouvrez la feuille **« Réservations - Wisy Safety »** › menu **Extensions › Apps Script**.
2. Dans l'éditeur : cliquez dans le code, **Cmd + A** (tout sélectionner), **Supprimer**, puis collez **tout** le
   fichier `google-sheets/reservations.gs` du dépôt (il commence par `@OnlyCurrentDoc` et contient
   `var VERSION = "1.2.1";`). Cliquez sur 💾 **Enregistrer**.
3. **Déployer › Gérer les déploiements** › crayon ✏ **Modifier** › *Version* : **Nouvelle version** › **Déployer**.
   L'adresse `/exec` **ne change pas** : rien à modifier sur le site.
4. Revenez dans l'onglet de la feuille et **rechargez la page** (le menu « Wisy Safety » se met à jour).
5. Menu **Wisy Safety › 🛠 Installer / réparer la feuille** (autorisez si Google le demande). Rien n'est effacé : la
   BA4 est ajoutée à l'onglet *Formations*, l'onglet *Demandes* (formulaires de contact) est créé.
6. Menu **Wisy Safety › 📅 Ouvrir les sessions du planning…** › **OK**. Message attendu : « 159 session(s) créée(s) ».
   Les sessions apparaissent dans l'onglet *Sessions*, juste sous la session du 18/10.
7. Menu **Wisy Safety › ✉ Envoyer un e-mail de test à l'équipe** → vérifiez la réception dans **info@wisysafety.be**
   (regardez aussi le dossier *Courrier indésirable*).
8. Contrôle à distance : ouvrez
   `https://script.google.com/macros/s/AKfycbw4fV7ZDyLcEk0J41INJjwQ_41ASkyCSGx7_ZuVxU1U_wmWdYDvLWwxgF-ga_QFxrvnPQ/exec?action=health`
   — vous devez lire `"version":"1.2.1"` et `"planning"` dans `features`. Google peut mettre une minute à servir
   la nouvelle version : si l'ancienne s'affiche encore, réessayez un peu plus tard.
9. **Mettez le site en ligne** : commit + fusion dans `main` (GitHub Pages se met à jour en 1 à 2 minutes). Faites-le
   juste après l'étape 6, pour que le site et la feuille soient alignés.
10. Vérifiez la page **Agenda** : les sessions s'affichent avec « 5 places disponibles sur 5 ».

## 3. Gérer au quotidien dans Google Sheets

| Je veux… | Je fais… |
|---|---|
| **Mettre les horaires** | Onglet *Sessions* : remplissez **Début** et **Fin** (ex. `09:00` et `17:00`). Astuce : *Données › Créer un filtre*, filtrez la colonne *Formation* pour remplir une formation d'un coup. Le site affiche l'heure dès la minute suivante. Si des personnes sont déjà inscrites : sélectionnez la session › *📣 Prévenir les inscrits d'un changement d'horaire*. |
| Voir les inscrits d'une session | Sélectionnez la ligne de la session › *📋 Liste des participants* (un onglet « Liste … » imprimable est créé ; *Fichier › Télécharger* en PDF/Excel). Pratique le jour J pour **cocher qui a payé**. |
| Voir toutes les réservations | Onglet *Réservations* (une ligne par formation réservée, référence WSR-…). **Ne supprimez jamais une ligne** : utilisez le menu. |
| Changer le nombre de places | Colonne **Places (total)** (5 aujourd'hui). *Restantes* se recalcule tout seul. |
| Fermer les inscriptions d'une session | Sélectionnez la ligne › *🔒 Fermer les inscriptions* (la session reste visible, sans bouton Réserver). |
| Supprimer une date (jour férié, absence) | Sélectionnez la ligne › *⛔ Annuler la session sélectionnée…* : elle disparaît du site ; les inscrits éventuels reçoivent un e-mail. Elle ne sera jamais recréée par le planning. |
| Annuler la réservation d'un client | Onglet *Réservations*, sélectionnez la ligne › *✖ Annuler la réservation sélectionnée…* (la place est libérée tout de suite). |
| **Prolonger le planning** (avril → juin…) | *📅 Ouvrir les sessions du planning…* et tapez la période, par ex. `01/04/2027 30/06/2027`. Les sessions existantes ne sont jamais recréées. |
| Changer le planning lui-même (jours, formations, 5 places) | C'est le bloc `PLANNING` en haut du script (`google-sheets/reservations.gs`) — demandez-moi, ou modifiez-le puis publiez une *Nouvelle version* (étape 3). |
| Permettre de réserver plus tard | Les inscriptions en ligne se ferment **48 h avant** le début (sans horaire : 2 jours avant, à minuit). Pour une session : colonne *Fin des inscriptions* (ex. `30/11/2026 18:00`). |
| Vérifier que tout va bien | *🔎 Vérifier la cohérence* ; onglet *Journal* (niveau « Erreur ») ; onglet *File d'envoi* (statut « Échec »). |

Jours à regarder tout de suite (le planning ne connaît pas les jours fériés) :
- **vendredi 25/12/2026** (Noël) et **vendredi 01/01/2027** (Nouvel An) : Diisocyanates + CP3 ;
- **dimanche 28/03/2027** (Pâques) : VCA Base ; **lundi 29/03/2027** (lundi de Pâques) : Nacelles + CP3 ;
- **samedi 28/11 et dimanche 29/11/2026** : déjà fermées à l'inscription en ligne (règle des 48 h). Pour les ouvrir,
  remplissez *Fin des inscriptions*.

## 4. E-mails : tout arrive dans info@wisysafety.be

| Ce qui arrive | Comment | Ce que vous recevez dans info@ |
|---|---|---|
| **Réservation** depuis le site | La feuille enregistre la réservation, puis envoie 2 e-mails | « Nouvelle réservation WSR-… — formation ×N » ; le bouton **Répondre** écrit directement au client. Le client reçoit sa confirmation. |
| **Contact / devis**, Coordination, test PEB | Même script (onglet *Demandes*) | « [Site] Demande de devis — Nom (WSC-…) », **Répondre** = le visiteur. |
| Si la feuille ne répond pas | Secours **EmailJS** | Le même message, envoyé par EmailJS. |
| Avis client | Feuille « Avis » | « Nouvel avis à valider ». |

- **L'adresse de réception** est `NOTIFY_EMAIL: "info@wisysafety.be"` en haut du script. Pour en changer : modifiez
  cette ligne, puis *Nouvelle version* du déploiement.
- **Expéditeur** : les e-mails partent du compte Google propriétaire de la feuille (nom affiché « Wisy Safety »),
  100 e-mails par jour avec un Gmail gratuit. Pour qu'ils partent **de votre domaine** (`formations@wisysafety.be`),
  branchez Microsoft 365 : `docs/README-RESERVATIONS.md` § 4.
- **Secours EmailJS** : dans le tableau de bord EmailJS, *Email Templates › template_0p9dah6* : **To Email** =
  `info@wisysafety.be`, **Reply To** = `{{user_email}}` ; *Account › Security* : autoriser seulement `wisysafety.be`.
- **Ne pas finir dans les indésirables** : ajoutez l'expéditeur aux contacts dans Outlook, et faites ajouter
  SPF / DKIM / DMARC au domaine (`docs/README-FORMULAIRES.md` § 3 — ils étaient absents le 23/10/2026).
- **Tester** : *✉ Envoyer un e-mail de test à l'équipe*, puis une vraie réservation sur une session (annulez-la ensuite
  avec le menu) et un message depuis la page Contact.

## 5. Choix faits à votre place (à confirmer)

- « **VCA** » = **VCA Base** (pas la VCA Ligne hiérarchique) — confirmé par Wisy Safety le 27/11/2026.
- « **Risque chimique et diisocyanates** » = la formation existante *Diisocyanates & substances dangereuses* — confirmé le 27/11/2026.
- **BA4** ajoutée sous le nom « BA4 — Personne avertie » (risque électrique, RGIE), **sans page** et sans durée ni prix :
  seulement dans l'inscription, l'agenda et la feuille. Une page BA4 complète est une étape suivante.
- **CP3** (40 h minimum) : chaque lundi et chaque vendredi est une session distincte de 5 places — confirmé le 27/11/2026.
- **Plus d'adresse de facturation** (décision du 27/11/2026) : l'étape 3 « Vos coordonnées » ne demande plus que nom,
  prénom, e-mail et téléphone. Les colonnes *Entreprise*, *N° de TVA* et *Adresse de facturation* de l'onglet
  Réservations restent vides pour les nouvelles réservations (le script 1.2.1 les accepte vides).
- **Jours fériés** : les 7 sessions des 25/12/2026, 01/01/2027, 28/03/2027 (Pâques) et 29/03/2027 (lundi de Pâques)
  ont été **annulées le 27/11/2026** (menu *⛔ Annuler la session sélectionnée…*, 0 réservation, aucun e-mail) : le
  site affiche 152 sessions. Elles restent dans la feuille au statut « Annulée » (rouvrables).
- **Sessions sans horaire et règle des 48 h** : sans heure de début, le calcul part de **minuit** le jour de la
  session (ex. une session du lundi ferme le samedi à 00:00). Pour une autre limite, remplissez la colonne
  *Fin des inscriptions* (JJ/MM/AAAA HH:MM) — fait le 27/11/2026 pour les 28/11, 29/11 et 30/11 : la veille à 18:00.
- Les **autres pages** (accueil, pages VCA Base, Nacelles, BEPS, VCA Entreprise, recherche du site) affichent toujours
  « En cours de préparation » à la place du tarif : seule l'inscription a été modifiée, comme demandé. Elles peuvent
  passer à « Paiement le jour de la formation » sur simple demande.

## 6. Fichiers modifiés

`google-sheets/reservations.gs` (version 1.2.0 : planning, BA4, e-mails « paiement sur place » ; 1.2.1 : facturation
facultative) · `index.html`, `politique-de-confidentialite.html`, `js/i18n-data-home.js`, `js/i18n-data-privacy.js`,
`js/faq-data.js`, `js/faq-i18n/*` (textes « facturation » retirés, 10 langues) ·
`inscription.html` · `js/registration.js` · `js/registration-data.js` · `css/registration.css` ·
`js/i18n-data-inscription.js` · `js/i18n-data-sessions.js` · `js/i18n-data-common.js` · `js/site-content.js` ·
`js/sessions-ui.js` · `js/search.js` · tests (`tests/planning-inscription.test.js` et mises à jour) · ce guide et le prompt.
