# Prompt — Planning des sessions, inscription sans paiement en ligne, e-mails vers info@

À copier-coller tel quel dans Claude (Claude Code, dans le dépôt `Wisy-Safety-2026`) pour refaire, prolonger ou
faire évoluer ce travail. Rédigé le 27/11/2026 ; la version livrée ce jour-là est décrite dans
[GUIDE-SESSIONS-INSCRIPTIONS.md](GUIDE-SESSIONS-INSCRIPTIONS.md).

---

Agis comme **développeur web senior** et **responsable des inscriptions** d'un centre de formation sécurité. Tu
travailles pour une personne qui **n'est pas développeur** : explique en français simple, fais les manipulations
techniques à sa place, et ne supprime ni n'écrase rien sans avoir regardé d'abord.

## 1. Contexte

- Site **Wisy Safety** (centre de formation sécurité, Anderlecht) — dépôt GitHub `Wisy-Safety-2026`, site **100 %
  statique** (HTML/CSS/JS sans framework), publié par GitHub Pages sur https://wisysafety.be, **10 langues**
  (fr, en, nl, af, ar en RTL, bg, de, ro, it, sl).
- Lis d'abord : `README.md`, `docs/README-RESERVATIONS.md`, `docs/README-FORMULAIRES.md`,
  `docs/GUIDE-SESSIONS-INSCRIPTIONS.md`.
- **Les sessions et les réservations vivent dans une feuille Google Sheets privée** « Réservations - Wisy Safety »,
  pilotée par le script `google-sheets/reservations.gs` (déployé en « Application Web », adresse `/exec` dans
  `js/supabase-config.js` → `RESERVATIONS_API_URL`). Le site lit les sessions publiées et les places restantes
  **calculées** par la feuille ; il ne contient aucune date en dur.
- Fichiers clés : `js/registration-data.js` (catalogue d'inscription), `js/registration.js` (parcours en 4 étapes),
  `inscription.html`, `css/registration.css`, `js/i18n-data-inscription.js`, `js/i18n-data-sessions.js`,
  `js/sessions.js`, `js/sessions-ui.js` (agenda / calendrier), `js/site-content.js` (registre du site),
  `tests/planning-inscription.test.js`, `tests/reservations.test.js`.

## 2. Ce que je veux (objectif)

Quand une personne s'inscrit à une formation sur le site, elle **choisit une vraie date de session**, ses places sont
**réservées en direct** (jamais au-delà de la limite), **elle ne paie rien en ligne** : elle **paie sur place, le jour
de la formation**. Toutes les inscriptions et tous les messages de contact arrivent dans **info@wisysafety.be**.

## 3. Planning des sessions à ouvrir

Période : **du samedi 28 novembre 2026 au mercredi 31 mars 2027 inclus** (environ 3 mois — à prolonger ensuite).

| Jour | Formation(s) | Identifiant(s) |
|---|---|---|
| Lundi | Nacelles élévatrices **et** Conseiller en prévention niveau III (CP3) | `nacelle`, `conseiller-prevention` |
| Mardi | BA4 — personne avertie (risque électrique) | `ba4` |
| Mercredi | VCA Base | `vca-base` |
| Jeudi | BA4 | `ba4` |
| Vendredi | Risque chimique & diisocyanates **et** CP3 | `diisocyanates`, `conseiller-prevention` |
| Samedi | Nacelles élévatrices | `nacelle` |
| Dimanche | VCA Base | `vca-base` |

Règles :
- **5 personnes maximum par session** (capacité 5 ; les places restantes sont calculées par la feuille).
- **Pas encore d'horaire** : les sessions sont créées **sans heure** ; le site affiche « Horaire à confirmer » et
  l'e-mail de confirmation annonce que l'horaire sera communiqué. Les heures se complètent plus tard dans la feuille
  (colonnes *Début* / *Fin*).
- Une session par formation et par jour ; **jamais de doublon** si l'on relance ; une session **annulée** n'est jamais
  recréée ; aucune date passée n'est créée.
- Les sessions sont créées **dans la feuille** (source unique), par un menu « 📅 Ouvrir les sessions du planning… »
  qui accepte aussi une autre période (« 01/04/2027 30/06/2027 ») pour prolonger.
- La **BA4** n'existe pas encore sur le site : l'ajouter au catalogue d'inscription et à la feuille, **sans page
  dédiée** et **sans inventer** de durée, de prix ou de programme (seulement son nom et son cadre : RGIE).
- « VCA » = **VCA Base** ; « risque chimique et diisocyanates » = la formation existante *Diisocyanates & substances
  dangereuses* — sauf instruction contraire.

## 4. Inscription : aucun moyen de paiement

- **Supprimer tous les moyens de paiement** du parcours d'inscription : logos Stripe / Mollie / PayPal, bouton
  « Procéder au paiement », étape « Paiement », mentions « Paiement sécurisé », « Aller au paiement », sous-total
  « 0,00 € », « TVA à déterminer ».
- L'étape 4 s'appelle **« Réservation »** : la personne vérifie son récapitulatif puis clique **« Confirmer ma
  réservation »** (la feuille vérifie et réserve les places sous verrou). Si la feuille ne répond pas, la demande part
  par e-mail (EmailJS) vers info@wisysafety.be.
- Prix : **ne plus jamais afficher « Sur devis »** (ni « En cours de préparation ») dans l'inscription. À la place,
  pour chaque formation sélectionnée : **« Paiement le jour de la formation »** ; dans le récapitulatif : **Règlement —
  « Sur place, le jour de la formation »** et la note « Aucun paiement en ligne : vous réglez votre formation sur place,
  le jour de la formation. » Si un tarif est publié un jour, l'afficher avec la même mention.
- Tous les textes dans les **10 langues** (contrôle : `node scripts/check-i18n.js`, 0 erreur).
- E-mail de confirmation au client : « Paiement : sur place, le jour de la formation » — plus de « l'équipe vous envoie
  la facture ».

## 5. E-mails : tout vers info@wisysafety.be

- Réservations : e-mail de confirmation au client + avis à l'équipe envoyé à `CONFIG.NOTIFY_EMAIL`
  (= `info@wisysafety.be`) avec « Répondre » = le client.
- Formulaires contact / devis, coordination, test PEB : même script (action `contact`) → onglet « Demandes » + e-mail
  à info@ ; secours EmailJS (gabarit dont le *To Email* doit être `info@wisysafety.be`).
- Explique au propriétaire, pas à pas : mettre à jour le script dans la feuille, publier une **nouvelle version** du
  déploiement (l'adresse `/exec` ne change pas), lancer « Installer / réparer », « Envoyer un e-mail de test »,
  vérifier `…/exec?action=health` (version, fonctions), vérifier les indésirables, et la délivrabilité (SPF, DKIM,
  DMARC de wisysafety.be — voir `docs/README-FORMULAIRES.md` § 3).

## 6. Règles non négociables

- **N'invente rien** : ni prix, ni horaire, ni durée, ni lieu, ni agrément. Ce qui n'est pas confirmé reste « à
  confirmer ».
- **Ne publie pas d'adresse ou de secret** dans le dépôt (il est public). Les données personnelles restent dans la
  feuille privée.
- **Ne committe pas** sans qu'on te le demande ; rappelle de committer à la fin.
- Ne mets jamais de date dans une page HTML : les sessions viennent de la feuille.

## 7. Livrables attendus

1. Script de la feuille mis à jour (`google-sheets/reservations.gs`, nouvelle version) avec le planning et le menu.
2. Parcours d'inscription sans paiement, BA4 ajoutée, textes en 10 langues.
3. Tests automatiques (planning, doublons, 5 places, BA4, e-mails, absence de moyens de paiement) +
   `node --test tests/*.test.js` vert (hors échecs déjà connus, à signaler).
4. Vérification visuelle (navigateur, 390 px et ordinateur) : catalogue, récapitulatif, étape 4, agenda.
5. Un guide en français simple : mise en service, gestion quotidienne dans Google Sheets, e-mails vers info@.

## 8. Vérification finale

```bash
node scripts/build-seo.js && node scripts/sync-edge.js && node scripts/check-i18n.js && node --test tests/*.test.js
```

Puis, après la mise en service par le propriétaire : `https://script.google.com/macros/s/…/exec?action=health` doit
afficher `"version":"1.2.1"` (1.2.0 au minimum) et `"planning"` dans `features`, et la page Agenda doit montrer les sessions à
« 5 places disponibles sur 5 ».
