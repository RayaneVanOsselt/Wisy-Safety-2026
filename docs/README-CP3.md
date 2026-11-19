# Formation Conseiller en prévention niveau III (« CP3 ») — mode d'emploi

Page : `formation-conseiller-prevention-niveau-3.html` (ajoutée le 19/11/2026).
Identifiant partout dans le site : `conseiller-prevention` (inscription : `inscription.html?formation=conseiller-prevention`).

## ⚠️ À faire AVANT de vendre la formation

Le Code du bien-être au travail (art. II.4-24) reconnaît un cours de base **seulement s'il est donné par un établissement
inscrit sur la liste du SPF Emploi**. Le diplôme personnel du formateur ne suffit pas : c'est **Wisy Safety** qui doit être
inscrite sur la liste.

1. Remplir le formulaire « Demande d'inscription sur la liste des établissements qui dispensent des cours de base pour
   conseillers en prévention (niveau III) » :
   https://emploi.belgique.be/fr/themes/bien-etre-au-travail/structures-organisationnelles/le-conseiller-en-prevention/formation-1
2. L'envoyer (gratuit, signé par un responsable) à **hut@emploi.belgique.be**. Contenu demandé : identification (BCE),
   description du cours, locaux et matériel, **programme couvrant l'art. II.1-20**, **liste des formateurs** (expérience pratique
   des matières), **mode d'évaluation**, **modèle d'attestation de participation**.
3. Engagements (art. II.4-25) : **40 heures minimum**, formateurs avec expérience pratique, locaux et matériel adaptés,
   attestation de participation remise à chaque participant.
4. Délai annoncé par le SPF : quelques semaines. Vérifier ensuite la liste :
   https://emploi.belgique.be/fr/agrements/notification-liste-des-institutions-qui-dispensent-des-cours-de-base-pour-les-conseillers

Tant que ce n'est pas fait, la page **n'affirme pas** que Wisy Safety est reconnue : elle renvoie vers la liste officielle et
dit « Nous vous confirmons la situation de Wisy Safety au moment de votre demande ».

## Une fois inscrit sur la liste

- `js/trainings-data.js` → `CP3.official.spfListed: true`, retirer « inscription … sur la liste du SPF » de `unconfirmedClaims`.
- Remplacer, dans la page (section 06, clé `cp3.s6_p2`) et dans `content/i18n/cp3/*.json`, la dernière phrase par
  « Wisy Safety figure sur cette liste. » (+ traductions), puis `node scripts/build-i18n-fiches.js`.
- Ajouter le prix, la durée exacte, les langues : registre `js/trainings-data.js` (une seule source), puis
  `node scripts/build-seo.js && node scripts/sync-edge.js && node --test tests/*.test.js`.
- Publier une session : feuille Google « Réservations » (formation `conseiller-prevention`).

## Ce qui a été branché

| Élément | Fichier |
|---|---|
| Page, thème « registre » | `formation-conseiller-prevention-niveau-3.html`, `css/fiche-cp3.css` |
| Outil « Quel niveau pour mon entreprise ? » (groupes A–D) | `js/formation-fiche.js` (`[data-fx-level]`) |
| Faits, mots-clés, affirmations interdites | `js/trainings-data.js` (`conseillerPrevention`) |
| Catalogue, recherche, assistant | `js/site-content.js`, `formations.html`, `index.html` |
| Menus (bureau + mobile) | les 25 pages du site |
| Inscription (« Sur devis ») | `js/registration-data.js`, `google-sheets/reservations.gs` |
| Sources vérifiées (SRC-CP3-001 à 009) | `js/sources-data.js` |
| Traductions (10 langues) | `content/i18n/cp3/*.json` → `js/i18n-data-cp3.js` ; menus : `js/i18n-data-common.js` |
| SEO (canonical, Open Graph, JSON-LD `Course`, sitemap) | `scripts/build-seo.js` |
| Images (carte, miniature, partage) | `scripts/optimize-images.py` (`cp3()`), image = illustration « briefing d'équipe » réutilisée |

## Repères du marché (recherche du 19/11/2026 — inspiration, aucun texte copié)

Mensura (Bruxelles, 42 h / 6 jours), Securex (formule classique ou mixte avec e-learning), IFAPME (Liège, Verviers,
Villers-le-Bouillet, Mons : 42 h), UMONS / UO-FWB (Charleroi-Mons, 750 €, les jeudis), Form'action André Renard (Liège),
Filova (Mouscron). Tous présentent : programme par journée, public (groupes C/D), durée, examen/attestation, recyclage.
Différence Wisy Safety : outil interactif « quel niveau ? », sources officielles visibles, parcours III → recyclage → II,
sessions pour groupes d'entreprise sur demande.
