# Formulaires du site → info@wisysafety.be — guide complet

Toutes les demandes envoyées depuis le site arrivent dans **une seule boîte : info@wisysafety.be**.

| Formulaire | Page | Chemin d'envoi | Ce que reçoit l'équipe |
|---|---|---|---|
| Contact / **demande de devis** | `contact.html` (sujets : devis, inscription, conseil, coordination, PEB, autre) | script Google « Réservations » → onglet **Demandes** ; secours EmailJS | e-mail « [Site] Demande de devis — Nom (WSC-…) », **Répondre** = le visiteur |
| WiSy Coordination | `coordination.html` | idem | services, type et phase du projet, lieu, date souhaitée |
| Test d'éligibilité PEB | `peb-wallonie-bruxelles.html` | idem | Région, profil, expérience, résultat indicatif affiché |
| **Inscription / réservation** | `inscription.html` | script Google « Réservations » → onglet **Réservations** (places vérifiées sous verrou) ; secours EmailJS si le script est retiré | « Nouvelle réservation WSR-… », **Répondre** = le client |
| Avis client | `avis.html` | script Google « Avis » → onglet des avis (« En attente ») | « Nouvel avis à valider », **Répondre** = l'auteur |
| Boutons e-mail / téléphone | toutes les pages | `mailto:info@wisysafety.be`, `tel:+3223188659` | — |

Ne transmettent rien : la vérification des certificats (recherche dans le registre) et la question posée à l'assistant
du Centre d'aide (traitée dans le navigateur).

## 1. Fonctionnement (contact, coordination, PEB)

```
Navigateur ── POST text/plain ──▶ script Google (…/exec, action "contact")
  js/forms.js                       1. revalide tout (e-mail, longueurs, sujet autorisé, consentement, téléphone)
  · bouton bloqué pendant l'envoi   2. robots : champ piège ou envoi < 2,5 s → réponse normale, rien d'enregistré
  · « envoyé » SEULEMENT si         3. même clé de requête = même référence (un nouvel essai ne crée pas de doublon)
    la réponse est positive         4. limites : 5 demandes / adresse / heure, 40 / heure, 150 / 6 h
  · échec : champs conservés,       5. ligne écrite dans l'onglet « Demandes » (statut « Nouvelle »)
    Réessayer / e-mail / tél.       6. e-mail à info@ (Répondre à = visiteur) + accusé de réception au visiteur
                                       (sans recopier son message) ; un e-mail en échec est réessayé
                                       automatiquement (5 min, 15 min, 1 h…), la demande est déjà en sécurité
        └─ si le script ne connaît pas l'action, est en panne ou injoignable ─▶ EmailJS (gabarit « contact »)
```

- Le site n'affiche « Merci… Référence : WSC-AAAA-XXXXX » qu'après la réponse **ok** du script (ou d'EmailJS en secours,
  référence WSW-AAAA-XXXXX). Un statut HTTP 200 ne suffit pas : la réponse est lue et vérifiée.
- **Aucune clé secrète dans le navigateur.** L'adresse du script et la clé publique EmailJS sont publiques par conception ;
  les identifiants Microsoft 365 éventuels restent dans les propriétés du script.
- Les données ne passent jamais dans l'adresse de la page (formulaires en `method="post"`, corps de requête uniquement).

## 2. Mise en service de la nouvelle version du script (≈ 5 minutes, à faire par Wisy Safety)

Tant que ce n'est pas fait, **rien n'est perdu** : le script actuel (v1.0.1) répond « action inconnue » sans rien
enregistrer, et le site envoie la demande par EmailJS (vérifié le 23/10/2026).

1. Ouvrir la feuille **« Réservations - Wisy Safety »** › Extensions › Apps Script.
2. Tout sélectionner, supprimer, coller **tout** le fichier `google-sheets/reservations.gs` (version 1.1.0) › 💾.
3. Déployer › **Gérer les déploiements** › ✏ › Version : **Nouvelle version** › Déployer. *L'adresse /exec ne change pas.*
4. Dans la feuille : menu **Wisy Safety › 🛠 Installer / réparer la feuille** (crée l'onglet « Demandes » et la colonne
   « Répondre à » de la file d'envoi ; rien n'est effacé).
5. Menu **Wisy Safety › ✉ Envoyer un e-mail de test à l'équipe** → vérifier la réception dans info@wisysafety.be
   (et les indésirables).
6. Vérifier à distance : `https://script.google.com/macros/s/…/exec?action=health` doit afficher
   `"version":"1.1.0"` et `"features":["sessions","book","contact"]`.

Mettre aussi à jour le script **« Avis - Wisy Safety »** avec `google-sheets/avis.gs` (seul changement : lien vers
`https://wisysafety.be/avis.html`) — même procédure, étapes 1 à 3.

## 3. Délivrabilité : expéditeur authentifié, SPF, DKIM, DMARC

État vérifié le 23/10/2026 (DNS Route 53, messagerie Microsoft 365) :

| Enregistrement | État | À faire |
|---|---|---|
| MX `wisysafety.be` | ✅ `wisysafety-be.mail.protection.outlook.com` | — |
| SPF (TXT `wisysafety.be`) | ❌ **absent** (seul `MS=ms83709506`) | ajouter `v=spf1 include:spf.protection.outlook.com ~all` |
| DKIM Microsoft 365 | ❌ **absent** (`selector1/2._domainkey`) | Microsoft Defender › Politiques › **Authentification des e-mails › DKIM** › wisysafety.be : copier les 2 CNAME proposés dans Route 53, puis **Activer** |
| DMARC (TXT `_dmarc.wisysafety.be`) | ❌ **absent** | ajouter `v=DMARC1; p=none; rua=mailto:info@wisysafety.be; fo=1` puis, après 2 à 4 semaines de rapports propres, `p=quarantine` |
| autodiscover (CNAME) | ❌ absent | `autodiscover` → `autodiscover.outlook.com` (configuration automatique d'Outlook ; sans effet sur le site) |

Pourquoi c'est important : sans SPF/DKIM/DMARC, les e-mails **envoyés depuis info@wisysafety.be** (vos réponses aux
clients, les confirmations envoyées par Microsoft 365) partent plus souvent en indésirables, et n'importe qui peut
usurper l'adresse. Depuis février 2024, Gmail et Yahoo exigent SPF ou DKIM de tout expéditeur (et DMARC des gros
expéditeurs).

Expéditeur des e-mails du site :
- **aujourd'hui** : le compte Google qui possède la feuille (MailApp, nom affiché « Wisy Safety », Répondre à = visiteur
  ou info@). Authentifié par Google (SPF/DKIM de Google) ; quota Gmail gratuit : 100 e-mails / jour.
- **recommandé** : brancher Microsoft 365 (`docs/README-RESERVATIONS.md` § 4, boîte partagée gratuite
  `formations@wisysafety.be`) : les e-mails partent alors **de votre domaine**, authentifiés par DKIM, sans quota Gmail.
- **EmailJS (secours)** : l'expéditeur dépend du « service » configuré dans le tableau de bord EmailJS (non visible
  depuis le code). À vérifier : *Email Services › service_k348qw9* (idéalement « Outlook 365 » connecté à
  info@wisysafety.be) et *Email Templates › template_0p9dah6* : **To Email** = `info@wisysafety.be`,
  **Reply To** = `{{user_email}}`. Dans *Account › Security*, activer la **liste des domaines autorisés**
  (`wisysafety.be`) : aujourd'hui EmailJS accepte des envois depuis n'importe quel site (constaté le 23/10/2026).

## 4. Vérifier en conditions réelles

Tests réels du 23/10/2026 (messages marqués « TEST — ne pas traiter ») :

| Formulaire | Résultat côté prestataire | Réception dans info@ |
|---|---|---|
| Contact (site en ligne) | EmailJS : HTTP 200 « OK » (1,98 s) | à confirmer par Wisy Safety |
| Coordination (code identique, serveur local) | EmailJS : HTTP 200 (1,6 s) | à confirmer |
| Test PEB (idem) | EmailJS : HTTP 200 (1,3 s) | à confirmer |
| Inscription (idem) | script Google : `ok`, réf. **WSR-2026-8ADDP** (« Demande (date à convenir) ») | à confirmer + ligne à annuler dans « Réservations » |
| Avis (idem) | script Google : `ok`, réf. **WS-2026-VWGNA** (« En attente ») | à confirmer + avis à refuser |
| Nouveau formulaire de contact (repli EmailJS) | script v1.0.1 : refus sans écriture, puis EmailJS HTTP 200 — réf. **WSW-2026-BJP9Z** | à confirmer |

Après la mise en service (§ 2), refaire un envoi depuis chaque page et vérifier : la ligne dans « Demandes », le statut
« Envoyé » dans « File d'envoi », l'e-mail reçu, et que **Répondre** s'adresse bien au visiteur.

## 5. Données personnelles (RGPD)

- Consentement explicite sur les trois formulaires (case obligatoire, ajoutée au test PEB le 23/10/2026).
- Conservation : `CONFIG.REQUEST_RETENTION_MONTHS` dans le script (0 = désactivé). Une durée fixée (par ex. 36 mois
  pour une demande sans suite) anonymise automatiquement les demandes plus anciennes — **la durée doit être choisie
  par Wisy Safety et inscrite dans la politique de confidentialité** (mention « [À COMPLÉTER] » actuelle).
- La politique de confidentialité doit mentionner Google (feuille + envoi des e-mails) comme destinataire des
  demandes et des réservations — à valider par Wisy Safety.

## 6. Fichiers et tests

| Fichier | Rôle |
|---|---|
| `js/forms.js` | client commun : envoi, repli EmailJS, états du bouton et messages |
| `google-sheets/reservations.gs` | `submitContact_`, onglet « Demandes », e-mails, limites, anonymisation |
| `js/supabase-config.js` | adresse du script (`RESERVATIONS_API_URL`, ou `FORMS_API_URL`) et clés EmailJS publiques |
| `tests/forms.test.js` | 21 tests : serveur (validation, robots, doublons, limites, pannes, injections) + client + pages |
