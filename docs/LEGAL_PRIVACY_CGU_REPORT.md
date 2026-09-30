# Rapport — Politique de confidentialité & Conditions générales d'utilisation

Date : 2026-09-30. Pages : `politique-de-confidentialite.html` et `conditions-generales-utilisation.html`
(+ harmonisation de `mentions-legales.html`). Ce rapport sert de **source de vérité** : chaque affirmation des
deux pages a été vérifiée dans le code du site ce jour-là ; tout ce qui n'a pas pu l'être est une mention
**[À COMPLÉTER — …]** visible sur la page, listée en §4.

> Ceci n'est pas un avis juridique. Les textes ont été rédigés avec prudence à partir du fonctionnement réel du
> site et de sources officielles ; ils doivent être relus par un professionnel du droit avant publication.

---

## 1. Architecture (« suite juridique »)

| Élément | Rôle |
|---|---|
| `css/legal.css` | Socle commun des 3 pages juridiques (anciennement `css/mentions-legales.css`, renommé). Partie 1 = styles d'origine ; partie 2 = composants des nouvelles pages. |
| `js/legal.js` | Comportements communs (anciennement `js/mentions-legales.js`) : sélecteur de documents, sommaire actif + barre compacte mobile, liens d'ancre, onglets, accordéons, inventaire du stockage, préparation de demande RGPD, etc. Amélioration progressive : tout reste lisible sans JavaScript. |
| `js/i18n-data-legal.js` | Textes communs (`lgl.*`) en 10 langues. |
| `js/i18n-data-privacy.js` · `js/i18n-data-cgu.js` | Textes des deux pages (`pp.*`, `cgu.*`) en 10 langues. Le français = copie exacte du HTML (test automatique). |
| Sélecteur « Documents juridiques » (`.lg-suite`) | Présent en haut des 3 pages. |

**Ajouter un document (CGV, politique de remboursement…)** : copier la coque d'une page juridique, créer son
dictionnaire `js/i18n-data-<nom>.js`, ajouter son lien dans le sélecteur `.lg-suite` des pages juridiques, une
entrée `PAGES` dans `js/site-content.js`, une entrée `DOCS` dans `scripts/build-seo.js`, puis :
`node scripts/build-seo.js && node scripts/sync-edge.js && node --test tests/*.test.js`.
La page CGU affiche déjà une carte « Conditions générales de vente — En préparation » (non cliquable) : la
remplacer par un lien quand le document existera.

## 2. Audit technique réel (ce que le site fait vraiment)

### 2.1 Données personnelles collectées
| Outil | Données | Destination réelle | Consentement affiché |
|---|---|---|---|
| Formulaire de contact (`contact.html`) | nom, e-mail, téléphone (facult.), sujet, message | EmailJS → messagerie Wisy | Case obligatoire + lien vers la politique (réparé) |
| Demande de coordination (`coordination.html`) | prénom, nom, e-mail, société, téléphone, services, type/phase, lieu, date, message | EmailJS → messagerie Wisy | Case obligatoire (sans lien vers la politique) |
| Test d'éligibilité PEB (`peb-wallonie-bruxelles.html`) | région, profil, années, nom, e-mail, téléphone, langue, résultat indicatif | EmailJS → messagerie Wisy | **Aucune case ni mention d'information** |
| Avis clients (`avis.html`) | prénom, e-mail, nom/initiale, entreprise/fonction, titre, note, commentaire | Supabase (table `reviews`, RLS) | Case obligatoire (texte incomplet, voir §5) |
| Parcours d'inscription (`inscription.html`) | formations, participants, coordonnées, facturation | **Rien n'est transmis** : `localStorage` uniquement (paiement non activé) | Case présente |
| Assistant Wisy / recherche | questions, recherches | **Rien n'est transmis** (moteur local ; `ASSISTANT_API_URL` non configurée) | — |
| Carte Google Maps (`index.html`) | IP, cookies Google | Google, **seulement après consentement « Fonctionnalités »** | Gestionnaire de cookies |

### 2.2 Stockage dans le navigateur (le code ne crée **aucun** cookie : `document.cookie` n'apparaît nulle part)
`localStorage` : `wisy-consent`, `wisy-lang`, `wisy-recent-search`, `wisy-registration-v1` ·
`sessionStorage` : `wisy-peb-region`, `wisy-home-intro`, `wisyAssistantIntroSeen`, `wisyAssistantEngaged`,
`wisyAssistantCues`. Le tableau de la section 07 de la politique les liste tous et montre en direct lesquels
sont présents sur l'appareil du visiteur (bouton d'effacement).

### 2.3 Prestataires techniques
EmailJS · Supabase · jsDelivr (CDN des bibliothèques EmailJS/Supabase, reçoit l'IP) · Google (Maps, après
consentement). **Inconnus** : hébergeur du site, fournisseur de la messagerie `info@wisysafety.be`.

## 3. Sources consultées (2026-09-30)

Officielles :
- RGPD — Règlement (UE) 2016/679 (EUR-Lex) : art. 6, 7.3, 12, 13, 15 à 22, 28, 44 à 49, 77.
- Autorité de protection des données — [Cookies et autres traceurs](https://www.autoriteprotectiondonnees.be/professionnel/themes/internet/cookies) (stockage local couvert ; poursuite de navigation ≠ consentement ; refus aussi simple qu'acceptation ; **durée de vie de 6 mois « en principe raisonnable » pour le choix cookies**), [FAQ durée des cookies](https://www.autoriteprotectiondonnees.be/professionnel/faq/pendant-combien-de-temps-les-cookies-peuvent-ils-etre-conserves-sans-que-vous-deviez-obtenir-un-nouveau-consentement), [Contact](https://www.autoriteprotectiondonnees.be/citoyen/agir/contact) (Rue de la Presse 35, 1000 Bruxelles · +32 2 274 48 00 · contact@apd-gba.be), [Introduire une plainte](https://www.autoriteprotectiondonnees.be/citoyen/agir/introduire-une-plainte).
- Loi du 30 juillet 2018, art. 10/2 (règles belges « cookies », référencées par l'APD).
- SPF Économie — [Guidelines pour des avis en ligne fiables](https://economie.fgov.be/fr/themes/entreprises/guidance/pratiques-commerciales/guidelines-pour-des-avis-en) (directive Omnibus 2019/2161 : expliquer comment les avis sont vérifiés, sur l'interface où ils sont affichés).

Politiques des prestataires (citées comme telles, avec la date de consultation) :
- [EmailJS](https://www.emailjs.com/legal/privacy-policy/) : EmailJS Pte. Ltd. (Singapour), serveurs aux États-Unis (AWS), clauses contractuelles types.
- [Supabase](https://supabase.com/privacy) : Supabase Pte. Ltd., région d'hébergement choisie par le client, transferts USA/Singapour sous clauses contractuelles types.
- [jsDelivr](https://www.jsdelivr.com/terms/privacy-policy) · [Google](https://policies.google.com/privacy) (Google Ireland Limited responsable pour l'EEE).

## 4. Mentions « À COMPLÉTER » visibles sur les pages (à fournir par Wisy Safety)

| Clé i18n | Information manquante |
|---|---|
| `pp.todo_dpo` | DPO désigné (coordonnées) ou non |
| `pp.todo_ret_requests` | Durée de conservation des demandes reçues (contact, coordination, PEB) |
| `pp.todo_ret_reviews` | Durée de conservation des avis (publiés, refusés, en attente) |
| `pp.todo_ret_logs` · `pp.todo_basis_logs` | Durée et base juridique des journaux de l'hébergeur |
| `pp.todo_basis_peb` · `pp.todo_basis_short` | Base juridique du test d'éligibilité PEB (piste à valider : mesures précontractuelles, art. 6.1.b) |
| `pp.todo_host` · `pp.todo_host_cookies` | Hébergeur (nom, adresse, localisation) et cookies qu'il dépose éventuellement |
| `pp.todo_mail` | Fournisseur de la messagerie `info@wisysafety.be` |
| `pp.todo_supabase_region` | Région d'hébergement du projet Supabase (tableau de bord Supabase → Settings) |
| `pp.todo_transfers` | Confirmation des garanties de transfert (et des contrats de sous-traitance, art. 28) par prestataire |
| `cgu.todo_cgv` | Conditions générales de vente + informations précontractuelles (avant toute vente en ligne) |
| `cgu.todo_verify` | Comment Wisy vérifie qu'un auteur d'avis a réellement suivi une formation |

Pour remplacer une mention : modifier la clé dans `js/i18n-data-privacy.js` / `js/i18n-data-cgu.js` (10 langues)
**et** le texte français dans le HTML (le test `i18n-static` vérifie qu'ils sont identiques).

## 5. Points de conformité relevés (hors pages juridiques — non modifiés, à décider)

Priorité haute :
1. **Choix cookies sans date d'expiration** (`js/cookie-consent.js`) : l'APD juge 6 mois « en principe raisonnable ». Recommandation : invalider `wisy-consent` après 6 mois.
2. **Brouillon d'inscription conservé indéfiniment** dans le navigateur (`wisy-registration-v1`, contient des données personnelles) : prévoir une expiration (ex. 30 jours) ou un effacement à la fin du parcours.
3. **Texte de consentement des avis incomplet** : il annonce « prénom, note et texte » alors que le nom/initiale, l'entreprise/fonction et le titre sont aussi publiés (`av.f_consent`).
4. **Badge « Avis vérifié »** : selon le SPF Économie, il faut expliquer la vérification réelle (mention `cgu.todo_verify`) ou renommer le badge.
5. **Faux avis de démonstration** (`js/reviews.js`, `DEMO_REVIEWS`, citant Proximus, Constructel…) : affichés si la bibliothèque Supabase ne se charge pas. À retirer en production.
6. **Test PEB sans information RGPD** au moment de la collecte : ajouter une phrase + lien vers la politique à côté du bouton d'envoi.
7. `supabase/harden-admin.sql` (écrit lors d'une session précédente) : vérifier qu'il est appliqué (lecture des e-mails des avis limitée aux administrateurs).

Priorité normale :
8. Catégorie « Mesure d'audience » proposée alors qu'aucun outil n'est installé : la politique le dit ; on peut aussi masquer la catégorie (`active:false`) jusqu'à l'installation d'un outil.
9. Formulaire de coordination : ajouter un lien vers la politique dans la phrase de consentement.
10. `wisy-recent-search` classé « nécessaire » : à valider (pourrait relever de « Fonctionnalités »).
11. Avant d'activer l'IA de l'assistant (`ASSISTANT_API_URL`, Claude via Supabase), le calendrier Outlook de l'agenda, la notification e-mail des avis ou le paiement en ligne : **mettre à jour la politique d'abord** (nouveaux destinataires/transferts).
12. Mentions légales : la clause « compétence exclusive des tribunaux de Bruxelles » n'a pas la réserve « consommateurs » ajoutée dans les CGU — à harmoniser avec votre juriste.
13. Pied de page (non modifié à votre demande) : le libellé « Conditions générales » (et « AGB » en allemand, qui désigne des conditions de vente) mène aux CGU ; « Conditions d'utilisation » serait plus exact.
14. Traductions : les 9 langues sont des traductions de lecture soignées, pas des traductions juridiques certifiées ; envisager une clause « la version française fait foi » et une relecture professionnelle (au minimum NL et DE, langues officielles belges).

## 6. Modifications hors des pages juridiques (toutes nécessaires, aucune refonte)

- 15 pages : **uniquement l'adresse** des liens « Politique de confidentialité » et « Conditions générales » du pied de page (`href="#"` → vraie page). Aucun texte, style ou structure changé.
- `contact.html` + `js/i18n-data-contact.js` : lien de la case de consentement (était `#`), 10 langues.
- `js/cookie-consent.js` : lien « En savoir plus » du bandeau (était `#`) + événement `wisy:consent` (affichage des choix en direct).
- `mentions-legales.html` : barre de recherche remise à jour (elle avait gardé l'ancienne version, sans suggestions ni mode Spotlight), sélecteur de documents, sommaire compact mobile, renvoi vers la politique complète, filigranes rendus décoratifs (contraste). Accessibilité Lighthouse 97 → 100.
- Registre `js/site-content.js` (recherche + assistant), `js/i18n-data-search.js`, `scripts/build-seo.js`, `scripts/check-i18n.js`, tests.

## 7. Vérifications effectuées

- `node --test tests/*.test.js` : 441/444 (les 3 échecs préexistants concernent VCA Entreprise).
- `node scripts/check-i18n.js` : 0 erreur, 49 avertissements (identique à avant).
- `node scripts/build-seo.js --check` : à jour.
- Navigateur : 320, 375, 414, 768, 1024, 1280, 1440 px — aucun débordement horizontal ; arabe (RTL) et anglais contrôlés ; clavier (Tab, flèches dans les onglets, Échap dans le sommaire mobile) ; aucune erreur console ; aucun fichier introuvable.
- Lighthouse mobile (simulation 4G lente) : Accessibilité 100 · Bonnes pratiques 100 · SEO 100 · Performance 89–96 (limite connue du site : dictionnaires de traduction chargés sur chaque page).
- Non testé : lecteur d'écran réel, Safari/Firefox, impression réelle (feuille `@media print` fournie), zoom > 200 %.
