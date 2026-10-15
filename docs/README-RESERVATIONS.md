# Réservations de formations (Google Sheets) — guide complet

Le site affiche les sessions de formation, **le nombre de places restantes** (« 9 places disponibles sur 10 ») et
permet de **réserver des places** depuis la page Inscription. Tout est géré dans **une feuille Google Sheets**
« Réservations - Wisy Safety » — le même système que vos avis et votre registre de certificats. Pas de WordPress, pas
de serveur à louer, pas de mot de passe supplémentaire.

```
 Visiteur (site GitHub Pages)            Script de la feuille (Google)             Feuille PRIVÉE « Réservations - Wisy Safety »
 Agenda · page Nacelles · Inscription ─▶ calcule les places, réserve          ─▶  Formations · Sessions · Réservations · Participants
                                          (UNE réservation à la fois : verrou)     Écarts Outlook · File d'envoi · Journal
                                               │ toutes les 10 minutes
                                               ▼
                               e-mails (Gmail, ou Microsoft 365 une fois branché) · calendrier Outlook dédié (optionnel)
```

> 📄 **Guide imprimable des onglets** (à quoi sert chaque onglet, menu, « je veux… je fais… ») :
> [guide-feuille-reservations.pdf](guide-feuille-reservations.pdf) — 6 pages.

## 1. Ce qui est garanti

- **Les places ne sont jamais saisies à la main.** « Réservées » et « Restantes » sont recalculées à chaque demande à
  partir des lignes de l'onglet *Réservations* (statut **Confirmée**, ou **En attente** non expirée).
- **Jamais au-delà de la capacité.** Chaque réservation est vérifiée et écrite *sous verrou* : si deux personnes
  demandent la dernière place en même temps, l'une l'obtient, l'autre reçoit « la session est complète ».
- **Tout ou rien.** Une demande pour plusieurs formations est refusée en entier si une session n'a plus assez de places
  (le client voit combien il en reste).
- **Pas de double réservation.** Si la connexion coupe et que la personne réessaie, la feuille reconnaît la demande
  (identifiant de requête) et renvoie la même référence.
- **Complète automatiquement** à 0 place. Les inscriptions en ligne se ferment **48 h avant le début** (modifiable
  session par session, colonne *Fin des inscriptions*).
- **L'affichage n'est qu'indicatif.** Le site relit les places toutes les 45 secondes, mais seule la réponse de la
  feuille au moment de confirmer fait foi (le client est prévenu s'il ne reste plus assez de places).
- **Aucune donnée personnelle sur le site.** Le site ne reçoit que les sessions publiées (date, horaires, places). Les
  noms, e-mails et adresses restent dans la feuille privée. Les identifiants Microsoft restent dans le script.

## 2. Mise en service (une seule fois, ~15 minutes)

> Faites-le avec le compte Google qui gère déjà vos feuilles d'avis et de certificats. Si c'est un compte **Google
> Workspace** (payant), Google fournit un contrat de traitement des données (RGPD) ; avec un compte Gmail gratuit, non.

1. **Créer la feuille** : Google Drive › Nouveau › Google Sheets (feuille vide). Laissez le partage sur « Accès limité ».
2. **Coller le script** : Extensions › Apps Script › supprimez tout › collez **tout** le fichier
   `google-sheets/reservations.gs` › 💾 Enregistrer.
3. **Installer** : dans l'éditeur Apps Script, choisissez la fonction `installer` › ▶ Exécuter › autorisez l'accès
   (Google affiche « application non validée » : *Paramètres avancés › Accéder au projet* — c'est votre propre script).
   Revenez dans la feuille : les 7 onglets existent, **les 7 formations du site** sont dans *Formations* et la session
   **Nacelles élévatrices du dimanche 18/10/2026, 10:00–18:00, 10 places** est dans *Sessions*.
4. **Publier le script** : Apps Script › **Déployer › Nouveau déploiement** › type **Application Web** ›
   *Exécuter en tant que* : **Moi** › *Qui a accès* : **Tout le monde** › Déployer. Copiez l'adresse qui se termine par
   **`/exec`**.
5. **Brancher le site** : collez cette adresse dans `js/supabase-config.js` :
   `RESERVATIONS_API_URL: "https://script.google.com/macros/s/…/exec",` — puis commit + fusion dans `main` (GitHub
   Pages se met à jour en 1 à 2 minutes). Vous pouvez aussi simplement me donner l'adresse.
6. **Vérifier** : page Agenda → le calendrier affiche « 10 places disponibles sur 10 » et le badge « Places mises à jour
   en direct ». Menu de la feuille *Wisy Safety › Voir ce que le site affiche* donne la même chose.

> ⚠ **Session du 18/10/2026** : avec la règle des 48 h, les inscriptions en ligne se ferment **vendredi 16/10 à 10 h**.
> Pour les laisser ouvertes plus longtemps, écrivez par exemple `17/10/2026 18:00` dans la colonne *Fin des inscriptions*.

**Tant que l'adresse n'est pas collée** (étape 5), rien ne change pour les visiteurs : les sessions viennent du fichier
de secours `js/sessions-data.js` (capacité seule, jamais des « places restantes ») et l'inscription envoie une demande
par e-mail, comme avant.

## 3. Utilisation au quotidien (menu « Wisy Safety » de la feuille)

| Je veux… | Je fais… |
|---|---|
| **Créer une session** | *➕ Nouvelle session* (ou une nouvelle ligne dans *Sessions*) : formation (liste), date, début, fin, places. L'identifiant se remplit tout seul. Cochez **Publiée sur le site** quand tout est prêt. |
| Modifier la date ou l'horaire | Changez la cellule. Les réservations restent attachées à la session. Puis *📣 Prévenir les inscrits d'un changement d'horaire* (e-mail à chaque client). |
| Changer la capacité | Changez *Places (total)*. *Restantes* est recalculé. Si vous descendez sous le nombre déjà réservé, *Vérifier la cohérence* vous le signale. |
| **Fermer les inscriptions** | Sélectionnez la session › *🔒 Fermer les inscriptions* (la session reste visible, sans bouton Réserver). |
| **Annuler une session** | Sélectionnez la session › *⛔ Annuler la session sélectionnée…* : elle disparaît du site, ses réservations passent en « Annulée » et chaque client reçoit un e-mail. |
| **Annuler une réservation** | Onglet *Réservations*, sélectionnez la ligne › *✖ Annuler la réservation sélectionnée…* : places libérées immédiatement, e-mail au client si vous le souhaitez. **Ne supprimez jamais une ligne.** |
| **Liste des participants** | Sélectionnez la session › *📋 Liste des participants* : un onglet « Liste … » est créé ; *Fichier › Télécharger* en CSV, Excel ou PDF. |
| Voir les erreurs (e-mails, Outlook) | Onglets *Journal* (niveau « Erreur ») et *File d'envoi* (statut « Échec »), ou *🔎 Vérifier la cohérence*. |
| Forcer l'envoi / la synchronisation | *🔄 Synchroniser maintenant* (sinon c'est fait automatiquement toutes les 10 minutes). |
| Valider à la main chaque réservation | Dans le script, `CONFIRMATION: "manual"` : les réservations arrivent « En attente » (places bloquées 72 h) ; *✔ Confirmer la réservation sélectionnée* envoie la confirmation. |

Statuts d'une réservation : **Confirmée** (compte dans les places) · **En attente** (compte jusqu'à « Expire le ») ·
**Annulée** / **Expirée** (ne comptent plus) · **Demande (date à convenir)** (formation choisie sans date : aucune
place prise, l'équipe propose une date).

## 4. Outlook (Microsoft 365) — à brancher ensuite

Votre messagerie wisysafety.be est chez Microsoft 365 : la feuille peut tenir à jour un **calendrier Outlook dédié**
(un événement par session, « Nacelles élévatrices — 3/10 inscrits ») et envoyer les e-mails depuis votre domaine.
**La feuille fait référence** : Outlook en est le reflet.

- Un événement **déplacé** ou **supprimé** directement dans Outlook n'écrase jamais la feuille : il apparaît dans
  l'onglet *Écarts Outlook* ; choisissez **Appliquer** (la feuille prend l'horaire d'Outlook, réservations gardées) ou
  **Ignorer** (Outlook est remis comme la feuille), puis *↔ Traiter les écarts Outlook décidés*. Une suppression par
  erreur dans Outlook n'annule donc **aucune** réservation.
- **Aucun doublon** : chaque événement porte l'identifiant (caché) de sa session et un identifiant de transaction.
- **Erreurs** : réessai automatique (5 min, 15 min, 1 h, 3 h…), détail dans le *Journal*.
- **Vie privée** : l'application n'a accès qu'à **une** boîte dédiée ; votre calendrier personnel lui reste
  inaccessible et le site public ne lit jamais Outlook. Les événements ne contiennent aucun nom de client.

Réglages (à faire par l'administrateur Microsoft 365 ; je peux vous guider pas à pas) :

1. **Boîte partagée** (gratuite, sans licence) : Centre d'administration Microsoft 365 › Équipes et groupes › Boîtes
   aux lettres partagées › *formations@wisysafety.be*. Ajoutez-vous comme membre : son calendrier apparaît dans votre
   Outlook.
2. **Application** : Microsoft Entra › Inscriptions d'applications › Nouvelle inscription (« Wisy Safety
   réservations », comptes de cet annuaire seulement). Notez l'**ID d'application (client)** et l'**ID de l'annuaire
   (locataire)**. *Certificats et secrets* › nouveau secret client (24 mois max — notez la date) › copiez sa **valeur**.
   **N'ajoutez AUCUNE permission Microsoft Graph dans Entra** (elles donneraient accès à toutes les boîtes).
3. **Limiter l'accès à la seule boîte dédiée** (Exchange Online PowerShell, rôle « Organization Management ») — RBAC for
   Applications :

   ```powershell
   Connect-ExchangeOnline
   New-ServicePrincipal -AppId <ID d'application> -ObjectId <ID d'objet de l'application d'entreprise> -DisplayName "Wisy Safety réservations"
   New-ManagementScope -Name "Wisy formations" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'formations@wisysafety.be'"
   New-ManagementRoleAssignment -App <ID d'objet> -Role "Application Calendars.ReadWrite" -CustomResourceScope "Wisy formations"
   New-ManagementRoleAssignment -App <ID d'objet> -Role "Application Mail.Send" -CustomResourceScope "Wisy formations"
   Test-ServicePrincipalAuthorization -Identity <ID d'objet> -Resource formations@wisysafety.be
   ```

   (L'*ID d'objet* est celui de la page **Applications d'entreprise**, pas celui de « Inscriptions d'applications ».
   Les changements peuvent mettre 30 minutes à 2 heures à s'appliquer.)
4. Dans la feuille : *⚙ Configurer Microsoft 365 (Outlook)…* → les 4 valeurs (locataire, client, secret, boîte). Elles
   sont rangées dans les **propriétés du script**, jamais dans une cellule. Le test de connexion s'affiche.
5. *🔄 Synchroniser maintenant* : l'événement du 18/10 apparaît dans le calendrier *formations@*.

Sans cette configuration, tout fonctionne quand même : les e-mails partent de votre compte Google (100 destinataires
par jour avec Gmail, 1 500 avec Google Workspace) et rien n'est envoyé à Outlook.

## 5. Mettre à jour le script

Collez la nouvelle version de `google-sheets/reservations.gs` › Enregistrer › **Déployer › Gérer les déploiements › ✏
Modifier › Version : Nouvelle version › Déployer**. L'adresse `/exec` reste la même (rien à changer sur le site).
Relancez *🛠 Installer / réparer la feuille* si la nouvelle version ajoute des colonnes (rien n'est effacé).

## 6. Tests

- `node --test tests/*.test.js` : `tests/reservations.test.js` exécute le **vrai script** sur une fausse feuille Google
  (réservations successives 10 → 9 → 8 → entreprise 4 places → complète ; dernière place disputée ; écriture d'une autre
  personne pendant l'attente du verrou ; double envoi ; tout ou rien ; annulations ; clôture ; validation manuelle ;
  e-mails et réessais ; Outlook simulé : création, doublons, déplacement, suppression, pannes) + le client du site + le
  parcours complet affiché « 10 places disponibles sur 10 » → « Complet ». `tests/sessions-ui.test.js` : calendrier.
- **Après la mise en service**, une fois : `scripts/test-reservations-live.js` envoie de vraies demandes simultanées à
  une session de TEST et vérifie qu'aucune place de trop n'est acceptée (lire l'en-tête du script : il crée de vraies
  lignes et de vrais e-mails).

## 7. Limites connues (honnêtes)

- Google répond en 1 à 3 secondes ; au-delà d'environ 30 demandes **exactement** simultanées, certaines reçoivent
  « réessayez dans quelques secondes » (rien n'est réservé pour elles).
- Une modification **à la main** de l'onglet *Réservations* contourne les garde-fous (Google affiche un avertissement) :
  utilisez le menu. *Vérifier la cohérence* détecte une surréservation éventuelle.
- Outlook est mis à jour avec jusqu'à 10 minutes de décalage (pas de notification instantanée de Microsoft vers Google).
- Les e-mails aux clients sont en français.
- Pas de paiement en ligne : la facture est envoyée par l'équipe. Un paiement (Mollie / Stripe, Bancontact) est
  possible plus tard, en vérifiant le statut du paiement depuis la feuille.
- GitHub Pages n'est pas prévu pour le commerce en ligne : avant un paiement en ligne, déplacer l'hébergement (ex.
  Cloudflare Pages, gratuit, même dépôt).
- **Politique de confidentialité** : à compléter par Wisy Safety (traitement « réservations » : données, finalité,
  durée de conservation, Google / Microsoft comme sous-traitants). Ce texte juridique n'a pas été rédigé à votre place.

## 8. Fichiers

| Fichier | Rôle |
|---|---|
| `google-sheets/reservations.gs` | Script à coller dans la feuille : liste publique, réservation sous verrou, e-mails, Outlook, menu |
| `js/supabase-config.js` | `RESERVATIONS_API_URL` (adresse `/exec`) et `SESSIONS_SOURCE: "sheets"` |
| `js/sessions.js` | Lit les sessions et leurs places dans la feuille (repli : `js/sessions-data.js`), actualisation toutes les 45 s |
| `js/sessions-ui.js` · `css/sessions.css` | Calendrier de la page Agenda, bloc « Prochaines sessions » des pages formation, jauge de places |
| `js/reservations.js` | Envoi d'une réservation à la feuille (réponses vérifiées, identifiant de requête) |
| `js/registration.js` | Inscription : choix de la session, contrôle des places, réservation à l'étape 4 (sinon e-mail) |
| `js/i18n-data-sessions.js` | Textes des sessions et réservations, 10 langues |
| `js/sessions-data.js` | Secours (session du 18/10/2026, capacité seule) tant que la feuille n'est pas branchée |
| `tests/reservations.test.js`, `tests/sessions-ui.test.js`, `tests/helpers/gas-fake.js` | Tests (fausse feuille Google) |
| `scripts/test-reservations-live.js` | Test de concurrence sur la vraie feuille, après la mise en service |
