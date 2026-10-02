# WISY SAFETY — FULL PRODUCT & TECHNICAL AUDIT

Audit du **02/10/2026**, branche `claude/wisy-safety-formations-6e04c2` (commit `6ff4a81`), **avant toute correction**.
Méthode : lecture du dépôt, suite de tests, contrôle automatique des 24 pages publiques + `admin/avis.html` dans un
vrai navigateur (script d'audit injecté : débordement, médias, titres, contrastes, cibles tactiles, formulaires, SEO,
JSON-LD, ressources), balayage responsive dans des cadres de 320 à 1440 px, parcours d'inscription, menu mobile,
étude de 6 systèmes de design sur styles.refero.design et de 6 concurrents (§16).

> **Mise à jour du 02/10/2026 (fin de journée)** : les corrections faites après l'audit, leurs commits et les
> vérifications sont listés au **§24**. Trois constats se sont révélés être des faux positifs (M13, M16, m5) ; quatre
> nouveaux problèmes ont été trouvés en corrigeant (§24.2).

Niveaux de gravité : **Critique** (perte de clients, de crédibilité ou risque juridique), **Majeur** (dégrade nettement
l'expérience, l'accessibilité ou le référencement), **Moyen**, **Mineur**.

---

## 1. Executive Summary

Le site est **techniquement sain** : aucune page ne déborde de 320 à 1440 px, aucune ressource en 404, aucune erreur
console, données structurées valides partout, 10 langues contrôlées, aucun secret côté client, 453 tests sur 456 réussis.

Mais il a **trois défauts qui coûtent des clients aujourd'hui** :

1. **Le parcours d'inscription ne transmet rien.** Après 4 étapes (formations, participants, coordonnées, récapitulatif),
   le dernier bouton affiche « Le paiement en ligne sera prochainement disponible » et **aucune donnée n'est envoyée** à
   Wisy Safety. Le bouton « S'inscrire » de chaque page de formation mène à ce cul-de-sac.
2. **Des affirmations non prouvées en haut de chaque page** : « Organisme de formation **agréé** » (bandeau des 24 pages,
   10 langues), « Nos formations **certifiées** », « Certifications officielles », « Formateurs experts ». Aucun agrément
   n'est documenté. C'est un risque juridique (publicité trompeuse) et de crédibilité.
3. **Les 3 nouvelles pages formation sont visuellement identiques** (même héros, mêmes boutons, mêmes sections) :
   elles donnent l'impression d'un copier-coller et ne mettent aucune formation en valeur.

Au-delà, l'écart avec les concurrents directs (Technicity.brussels à Anderlecht, Vinçotte Academy, ECS) est surtout
**informationnel** : eux affichent prix, durée, dates, lieu et effectif, et permettent de s'inscrire à une date. Wisy
n'affiche ces informations que pour 4 formations sur 6, et aucune date de session. Cela ne se corrige pas par du design :
il faut que Wisy Safety confirme ses données.

Le design est propre mais **générique** : bandeau + menu + barre de recherche empilés (≈ 125 px), héros « titre +
pastilles + image », pastilles et cartes partout, un gabarit différent par page sans langage commun fort.

**Bilan chiffré** : 3 critiques, 17 majeurs, 14 moyens, 4 mineurs (§17 à §20).

---

## 2. Architecture

| Élément | Constat |
|---|---|
| Type | Site statique, 24 pages HTML à plat + `admin/avis.html`, aucun framework, aucune étape de build pour publier |
| Hébergement | GitHub Pages (pas d'en-têtes HTTP personnalisés, pas de redirections 301) |
| JS | Modules sans dépendance (registre `js/trainings-data.js` → `js/site-content.js` → recherche, assistant, SEO, inscription) |
| Données | Supabase (avis, sessions — sessions en mode fichier aujourd'hui), EmailJS (contact, coordination, PEB) |
| i18n | Moteur maison, 10 langues, **toutes chargées sur chaque page**, une seule URL par page |
| Tests | 456 tests `node:test`, scripts de contrôle (i18n, sources, SEO, liens externes) — pas de `package.json`, pas de lint/typecheck/build (sans objet pour ce site) |
| Point fort | Une source unique pour les faits ; tests qui empêchent les affirmations non confirmées de revenir |
| Point faible | Le socle CSS et l'en-tête sont **copiés dans les 24 pages** : toute modification du menu touche 24 fichiers |

## 3. Functional Audit

| Parcours | Résultat |
|---|---|
| Accueil → catalogue → page formation | ✓ |
| Recherche (Ctrl/⌘ K, suggestions, filtres) | ✓ |
| Page formation → « S'inscrire » → inscription pré-remplie | ✓ jusqu'à l'étape 4 |
| **Étape 4 → envoi** | ✗ **rien n'est envoyé** (C1) |
| Contact (EmailJS) | ✓ code correct (non soumis pendant l'audit pour ne pas écrire à Wisy) |
| Menu mobile | ✓ ouverture / Échap / retour du focus ; ✗ focus non piégé (M15) |
| Lien de menu « Certificat » | ✗ `href="#"` sur les 24 pages (M3) |
| Assistant | ✓ 34 questions testées (`docs/chatbot-tests.md`) |
| Fenêtres d'articles | ✓ lien direct, Échap, retour du focus |
| Vidéo VCA Entreprise | ✓ chargée seulement au clic |

## 4. UX Audit

- **En-tête trop haut** : bandeau utilitaire + menu + barre de recherche avec suggestions ≈ 125 px sur ordinateur et
  ≈ 180 px sur mobile. Le contenu commence tard (M5).
- **Bandeau cookies** : ≈ 60 % du premier écran mobile, et il pousse le bouton de l'assistant sur le texte (M6).
- **Pages formation** : beaucoup d'information juste, mais l'essentiel commercial manque (prix, durée, dates) (M7).
- **Catalogue** : en-tête avec une grande zone vide à droite et 4 pastilles d'affirmations non prouvées (C2, M17).
- Bonne pratique déjà présente : fil d'Ariane, sections numérotées, sources datées, barre d'action mobile sur les fiches.

## 5. UI / Design Audit

- **Générique** : la plupart des pages suivent « sur-titre + grand titre + paragraphe + 2 boutons + image ou carte ».
  Les pastilles arrondies sont partout (en-tête, recherche, héros, cartes), ce qui fait « modèle SaaS ».
- **Pas de signature** : chaque page a son propre gabarit (VCA Base, Nacelles, BEPS, PEB, Coordination, fiches), sans
  système commun reconnaissable (traits, numérotation, cadrages photo, rythme clair/sombre).
- **Palette** : respectée. Le turquoise reste rare sur les fiches, mais le crème (#F4FAF9) et le blanc se suivent sans
  séparation nette sur plusieurs pages.
- **Les 3 fiches** : même gabarit (M1).
- **Typographie** : Poppins + Inter bien chargées ; titres en « Title Case » à l'anglaise (« Nos Formations
  Certifiées ») alors que le français s'écrit en minuscules (m4).

## 6. Conversion Audit

| Problème | Effet |
|---|---|
| Inscription qui n'aboutit pas (C1) | 100 % des demandes en ligne perdues |
| Aucune date de session publiée | Le visiteur ne peut pas se projeter ; les concurrents affichent un calendrier |
| Prix et durée absents sur 3 formations | Principale objection non traitée |
| Deux boutons équivalents partout (« S'inscrire » / « Devis ») | Choix peu guidé pour un particulier |
| Preuves : pas d'avis réels visibles sur les fiches, pas de formateurs nommés, pas de photos réelles | Confiance plus faible que chez ECS (références clients) ou Vinçotte (formateur affiché) |
| Affirmations non prouvées (C2) | Risque inverse : un visiteur averti doute de tout le reste |

## 7. Responsive Audit

Balayage automatique des 24 pages à **320, 375, 390, 430, 768, 1024 et 1440 px** : **aucun débordement horizontal**.
Problèmes : hauteur de l'en-tête sur mobile (M5), bandeau cookies (M6), cibles tactiles trop petites (M10), pied de
page très long sur mobile (m15 : ≈ 2 100 px à 375 px, soit 2,6 écrans, mesuré sur l'accueil, Contact et Fibre optique).

## 8. Accessibility Audit (WCAG 2.2 AA)

| Critère | Constat |
|---|---|
| 1.4.3 Contraste | 14 éléments sous le seuil (M9) |
| 2.4.1 Contourner des blocs | Pas de lien d'évitement sur 9 pages (M8) |
| 2.5.8 Taille des cibles | Liens du bandeau et du pied de page à 19–23 px de haut, cases à cocher de 13 px (M10) |
| 1.3.1 Titres | ~~Sauts H1 → H3 sur 4 pages (M13)~~ : faux positif, la hiérarchie du code source est correcte (§24.3) |
| 4.1.2 Nom accessible | ~~1 lien sans nom sur Coordination (M16)~~ : faux positif, lien décoratif `aria-hidden` et hors tabulation (§24.3) |
| 2.4.3 Ordre du focus | Menu mobile : l'arrière-plan reste focalisable (M15) ; menu **fermé** encore atteignable au clavier (N1, §24.2) |
| 2.3.3 Mouvement | `prefers-reduced-motion` respecté |
| Formulaires | Tous les champs ont une étiquette |

## 9. Performance Audit

| Mesure | Constat |
|---|---|
| HTML | 55–127 Ko par page (socle CSS copié en ligne) |
| JS | **350–660 Ko non compressés par page**, dont l'essentiel = dictionnaires des 10 langues (`i18n-data-common.js` 74 Ko, `i18n-data-search.js` 60 Ko, `i18n-data-assistant.js` 27 Ko, dictionnaire de page jusqu'à 120 Ko) (M4) |
| Images | AVIF/WebP en tailles multiples ; 1 image surdimensionnée sur mobile (m6) ; 7 images sans dimensions sur l'inscription (m5) |
| Vidéos | Accueil 0,9 Mo (poster, muette, lecture différée) ; VCA Entreprise 6,5–9,8 Mo au clic uniquement |
| CLS | 0 mesuré sur l'accueil |
| LCP | Retardé quand le titre porte la classe `reveal` (opacité 0 jusqu'à l'exécution du JS) (M2) |

## 10. SEO Audit

| Point | Constat |
|---|---|
| Titres | 4 pages > 60 caractères (PEB 69, VCA Entreprise 63, 2 articles VCA 62–63) (M11) |
| Descriptions | 11 pages > 155 caractères (jusqu'à 174) (M11) |
| Canonical, OG, JSON-LD | Présents et valides partout ; 404 en `noindex` |
| Sitemap / robots | 23 URL, cohérentes ; robots ouvert |
| Langues | **Seul le français est indexable** : les 9 autres langues sont appliquées dans le navigateur, sans URL ni `hreflang` (M12). À Bruxelles, le néerlandais compte. |
| Domaine | `https://www.wisysafety.be` partout (canonical, sitemap) — à confirmer avant la bascule |
| Redirections | Aucune 301 possible sur GitHub Pages (`docs/redirects.md`) (m11) |

## 11. Content & Data Reliability

Voir C2 et C3. Aussi, préexistant : compteurs de l'accueil (« 500+ », « 10+ », « 250+ », « 100 % »), de l'agenda,
de PEB et de Contact, sans source (imposés par des tests existants). Page Contact : carte « Conseillers habilités ·
N1 · N2 · PEB · VCA », traduite par « Certified advisors », « Erkende adviseurs », « Zugelassene Berater »… (N3, §24.2). Les 3 nouvelles formations sont sourcées
(`docs/content-sources.md`).

## 12. Media Audit

24,2 Mo d'assets référencés, **2 fichiers inutilisés** (0,2 Mo : `logo-carre-500.png`, documenté comme logo de partage ;
`videos/accueil/poster.webp`), **0 image cassée**, toutes les images ont un `alt`. Les visuels des formations sont des
illustrations (images générées par IA, ou photos dont la licence reste à confirmer : `docs/image-sources.md`) : aucune
photo réelle de Wisy Safety (salle, formateurs, sessions) n'est identifiée comme telle. C'est le premier
levier de différenciation et de confiance (S2).

## 13. Security Audit

- Aucun secret côté client : seules la clé *publishable* Supabase et la clé publique EmailJS sont présentes (prévu pour).
- Scripts tiers chargés avec `integrity` (SRI).
- Données utilisateur échappées avant affichage (inscription, avis, recherche).
- Page de modération : authentification Supabase + RLS (`supabase/harden-admin.sql`), `noindex`.
- Faiblesses : pas d'en-têtes de sécurité (CSP, etc.) sur GitHub Pages (m10) ; noms et e-mails des participants gardés
  dans `localStorage` sans expiration (m9).

## 14. Code Quality

- Bon : modules courts, registre unique, commentaires utiles, tests nombreux.
- À améliorer : socle CSS dupliqué dans 24 pages (m3) ; 3 tests en échec liés à VCA Entreprise (M14) ; `.reveal` sans
  garde JS (M2).

## 15. Project Structure

Organisation claire (`css/`, `js/`, `assets/originaux` → `assets/images`, `docs/`, `scripts/`, `tests/`). Dossier
`admin/` isolé. Aucun fichier mort significatif (2 assets). `content/_legacy/` non publié (préfixe `_`).

## 16. Competitor / Market Observations

Pages consultées le 02/10/2026 :

- **[Technicity.brussels — VCA Cadre](https://technicity.brussels/vca-cadre/)** (Anderlecht, même commune) : durée
  (2 jours), horaires, 14 participants maximum, 14 thèmes, « sur devis », primes sectorielles listées, inscription par
  téléphone ou e-mail.
- **[Vinçotte Academy — B-VCA](https://www.vincotte-academy.be/fr/courses-detail?id=139)** : prix affiché (263 € HT),
  dates et lieux en tableau, places disponibles, formateur, fiche PDF, boutons « S'inscrire » / « Demander une offre ».
- **[ECS — VCA Base](https://e-c-s.be/fr/formation/vca-base/)** : prix (250 € HT), durée, 3 lieux, déjeuner et manuel,
  calendrier avec inscription par date, références clients.
- **Diisocyanates** : les producteurs (ISOPA / ALIPA) proposent la formation officielle en ligne
  ([safeusediisocyanates](https://isopa-aisbl.idloom.events/index/utilisation-sure-des-diisocyanates-selection-de-formation-fr)).
  Wisy doit donc mettre en avant ce qu'un e-learning n'apporte pas : présentiel, pratique, aide au choix du niveau,
  formation sur site.
- **Fibre** : [SEBA](https://formations.seba.be/glasvezelbekabeling-proximus/) (3 jours, orientée Proximus),
  [ORSYS](https://www.orsys.fr/belgique/formation/formation-reseau-fibre-optique-mise-en-oeuvre) (4 jours, 28 h).

**Ce que Wisy peut faire mieux** : la seule offre du marché qui **source chaque fait** (règlements, examens) et le dit.
Mais les informations pratiques sont aujourd'hui la faiblesse, et le design ne porte pas encore cette rigueur comme une
signature.

---

## 17. Critical Issues

**C1 — L'inscription en ligne ne transmet rien**
- Location : `inscription.html` étape 4 ; `js/registration.js` (`handlePayClick`)
- Severity : Critique
- Impact : toutes les demandes d'inscription faites en ligne sont perdues ; le visiteur croit s'être inscrit ou abandonne
- Root cause : le paiement n'est pas configuré (`provider: null`) et aucune autre voie d'envoi n'est prévue
- Recommended solution : tant que le paiement n'est pas actif, **envoyer la demande à Wisy Safety** (gabarit EmailJS déjà utilisé par Contact, Coordination et PEB), afficher une confirmation avec une référence, et dire clairement que rien n'est débité
- Risk : faible (même mécanisme que Contact) ; dépend du quota EmailJS

**C2 — « Organisme de formation agréé », « formations certifiées », « certifications officielles », « formateurs experts » sans preuve**
- Location : bandeau utilitaire des 24 pages (10 langues, clé `util.badge`), en-tête du catalogue (`formations.html`)
- Severity : Critique
- Impact : risque juridique (allégation non prouvée) et de crédibilité ; contredit les pages formation qui disent que le diplôme VCA est délivré par un centre d'examen reconnu
- Root cause : textes du gabarit d'origine jamais vérifiés
- Recommended solution : remplacer par des faits (« Centre de formation à la sécurité · Anderlecht ») jusqu'à preuve écrite ; garder les mentions vérifiables (lieu, sources)
- Risk : faible ; décision de communication à valider par le propriétaire

**C3 — VCA Base : « examen inclus » alors que Wisy Safety ne figure pas dans la liste des centres d'examen reconnus**
- Location : `formation-vca-base.html`, registre, assistant
- Severity : Critique (à confirmer)
- Impact : si l'examen n'est pas réellement organisé par un centre reconnu, promesse non tenue
- Root cause : information confirmée par le propriétaire le 26/09, sans précision sur l'organisation de l'examen
- Recommended solution : faire préciser **qui organise l'examen** (centre reconnu partenaire, sur place ?) puis l'écrire. **Non modifié** sans cette réponse
- Risk : aucun à demander ; modifier sans réponse risquerait d'enlever une information vraie

## 18. Major Issues

| # | Problem | Location | Impact | Root cause | Recommended solution | Risk |
|---|---|---|---|---|---|---|
| M1 | Les 3 nouvelles fiches sont identiques | `formation-vca-ligne-hierarchique`, `-diisocyanates`, `-fibre-optique` | Effet copier-coller, aucune formation mise en valeur | Gabarit commun unique | Direction artistique propre à chaque formation sur un socle commun (traits, rythme) | Moyen (i18n et tests à garder) |
| M2 | `.reveal { opacity: 0 }` sans garde JS | socle CSS de toutes les pages ; le H1 est concerné sur le catalogue, VCA Base, Nacelles, Coordination, Avis et les pages légales | Contenu (dont le H1) invisible si un script échoue ; LCP retardé | CSS d'animation non conditionnée | N'appliquer l'état caché que si `html.js` (classe posée par un script en tête) | Faible |
| M3 | Entrée de menu « Certificat » vers `#` | en-tête + menu mobile, 24 pages | Lien mort dans la navigation principale | Page jamais créée | Retirer l'entrée tant que la page n'existe pas | Faible |
| M4 | 10 langues chargées sur chaque page | `js/i18n-data-*.js` | 350–660 Ko de JS non compressé par page | Dictionnaires multilingues monolithiques | Un fichier par langue, chargé à la demande | Moyen (moteur i18n) |
| M5 | En-tête sur 3 étages | toutes les pages | ≈ 125 px (ordinateur) / ≈ 180 px (mobile) avant le contenu | Bandeau + menu + recherche empilés | Fusionner la recherche dans l'en-tête, réduire le bandeau | Moyen |
| M6 | Bandeau cookies trop haut sur mobile | `js/cookie-consent.js`, `css/cookie-consent.css` | ≈ 60 % du premier écran ; bouton assistant sur le texte | Texte long, boutons empilés | Version compacte (≤ 35 % de hauteur), boutons Accepter / Refuser côte à côte | Faible (garder l'égalité des choix) |
| M7 | Prix, durée et dates absents | 3 nouvelles fiches ; aucune date publiée sur le site | Principale objection d'achat non traitée | Données internes non confirmées | Confirmation écrite de Wisy, puis tableau « Prochaines sessions » | — (décision du propriétaire) |
| M8 | Pas de lien d'évitement | index, formations, coordination, inscription, contact, avis, 3 pages légales | WCAG 2.4.1 | Oubli dans ces gabarits | Ajouter « Aller au contenu » | Faible |
| M9 | 14 contrastes insuffisants | codes langue du menu (2,34), accueil (3,32–4,26), BEPS (1,37 et 2,67), PEB (2,34 et 4,45), Coordination (1,84–2,94), inscription « Sur devis » (2,94) | WCAG 1.4.3 | Couleurs trop claires sur fond clair | Granit / épinette selon le fond | Faible |
| M10 | Cibles tactiles < 24 px | bandeau utilitaire, contacts du pied de page, liens « fx-link », cases de consentement 13–18 px | WCAG 2.5.8, erreurs au doigt | `line-height` serré, pas de zone de clic | `min-height: 24px` (44 px pour les actions principales) | Faible |
| M11 | Titres > 60 et descriptions > 155 caractères | 4 + 11 pages | Textes coupés dans Google | Rédaction | Raccourcir | Faible |
| M12 | 9 langues non indexables | moteur i18n | Aucun trafic organique NL/EN | Une URL par page, traduction côté navigateur | URL par langue (`/nl/…`) + `hreflang`, en commençant par le néerlandais | Élevé (chantier) |
| ~~M13~~ | ~~Sauts de niveau de titre~~ — **faux positif** (§24.3) | index, formations, agenda, contact | — | — | Aucune action | — |
| M14 | 3 tests en échec | `tests/site-content.test.js`, `tests/assets-structure.test.js` | CI rouge, vraies régressions masquées | Service VCA Entreprise partiellement relié au registre ; guide manquant | Relier `vca-entreprise` au registre et ajouter le guide | Faible |
| M15 | Menu mobile : focus non piégé | script du menu (`js/main.js`, `js/site-chrome.js`) | Au clavier, on tabule derrière le menu ouvert | Pas d'`inert` sur le reste de la page | `inert` sur `main` et le pied de page tant que le menu est ouvert, focus sur le premier lien | Faible |
| ~~M16~~ | ~~Lien sans nom accessible~~ — **faux positif** (§24.3) | `coordination.html` (`#co-why`) | — | — | Aucune action | — |
| M17 | En-tête du catalogue générique | `formations.html` | Zone vide, pastilles, aucun message fort | Gabarit | Refonte avec une vraie entrée en matière (après C2) | Moyen |

## 19. Medium Issues

| # | Problem | Location | Recommended solution |
|---|---|---|---|
| m1 | Bouton de l'assistant posé sur le texte quand le bandeau cookies est ouvert | assistant | Le masquer tant que le bandeau est visible |
| m2 | Codes langue peu contrastés dans le sélecteur | menu langue | Granit au lieu de #9AA8A4 |
| m3 | Socle CSS copié dans 24 pages | toutes les pages | Le sortir dans un fichier CSS mis en cache |
| m4 | « Title Case » anglais sur des titres français | catalogue et autres | Majuscule initiale seulement |
| ~~m5~~ | ~~7 images sans `width`/`height`~~ — **faux positif** (§24.3) | `inscription.html` | Aucune action |
| m6 | Image 1024 px affichée à 216 px | accueil (`beps.webp`) | `srcset` |
| m7 | Vidéo VCA Entreprise 1080p : 9,8 Mo | `assets/videos/vca-entreprise/` | Réencoder (CRF plus élevé) |
| m8 | Compteurs non sourcés (« 500+ », « 100 % »…) | accueil, agenda, PEB, Contact | Retirer ou sourcer (tests à adapter) |
| m9 | Données des participants gardées sans expiration | `localStorage` de l'inscription | Effacer après envoi, expirer après 7 jours |
| m10 | Pas d'en-têtes de sécurité | GitHub Pages | Hébergeur avec en-têtes (CSP, Referrer-Policy…) |
| m11 | Pas de 301 pour l'ancien site | hébergement | Voir `docs/redirects.md` |
| m12 | Photos génériques (« Photo d'illustration », visuels IA) sur les fiches | fiches | Remplacer par des photos réelles de Wisy |
| m13 | Deux appels à l'action de même poids partout | fiches, catalogue | Un bouton principal, l'autre en lien |
| m14 | Pas de preuves sur les fiches (avis, formateurs) | fiches | Avis réels (page Avis) et formateurs nommés, après accord |
| m15 | Pied de page ≈ 2 100 px sur mobile (2,6 écrans) | toutes les pages | Colonnes repliables sur mobile, bloc d'appel à l'action raccourci |

## 20. Minor Issues

1. Liens « Accueil » et « Formations » de la page 404 à 18 px de haut.
2. Champ de recherche de l'en-tête : 22 px de haut (la pastille cliquable est plus grande).
3. 2 assets inutilisés (0,2 Mo).
4. `admin/avis.html` charge les polices et feuilles du site (≈ 100 Ko) pour une page interne.

## 21. Quick Wins

C1 (envoi des demandes), C2 (retirer les allégations), M3 (lien « Certificat »), M2 (garde JS), M8 (liens
d'évitement), M9 (contrastes), M10 (cibles), M11 (titres et descriptions), M13 (titres), M16 (nom accessible), m5.

## 22. Strategic Improvements

1. **S1 — Données commerciales confirmées** : prix, durée, dates et lieux pour chaque formation, puis un calendrier des
   sessions avec inscription par date (ce que font les concurrents).
2. **S2 — Photos réelles** : salle, matériel, formateurs, sessions (avec l'accord des personnes). Aucun design ne remplace ça.
3. **S3 — Signature visuelle** : un langage commun (traits fins, numérotation, cadrages, rythme clair/sombre, un seul accent)
   décliné par formation, à partir des 3 fiches.
4. **S4 — Néerlandais indexable** (puis anglais) : URL par langue.
5. **S5 — Allègement** : dictionnaires par langue, socle CSS en fichier commun.
6. **S6 — Preuves** : avis vérifiés sur les fiches, partenaires réels (centres d'examen, fonds sectoriels) une fois confirmés.

## 23. Recommended Roadmap

| Étape | Contenu | Qui |
|---|---|---|
| 1 (maintenant) | C1, C2, M2, M3, M8, M9, M10, M11, M13, M16, m5 + refonte des 3 fiches (M1) | développement |
| 2 | M5 en-tête, M6 cookies, M15 menu mobile, M17 catalogue, M14 tests | développement |
| 3 | S1 données et calendrier, C3 examen VCA, S2 photos | **Wisy Safety** puis développement |
| 4 | M4 / S5 allègement, M12 / S4 néerlandais indexable, m3 socle CSS | développement |
| 5 | Hébergement avec en-têtes et 301 (m10, m11), bascule du domaine | Wisy Safety + développement |

---

## 24. Corrections apportées (02/10/2026)

Chaque série a été suivie de la suite de tests (les 3 échecs préexistants VCA Entreprise, M14, restent les seuls),
de `scripts/check-i18n.js` (aucune erreur) et de `scripts/build-seo.js --check` (à jour).

### 24.1 Constats de l'audit corrigés

| # | Correction | Commit |
|---|---|---|
| C1 | L'étape finale de l'inscription **envoie la demande** à Wisy Safety (EmailJS, même gabarit que Contact), affiche une référence, efface les données du navigateur après envoi ; en cas d'échec, lien e-mail prérempli et téléphone. Libellés dans les 10 langues. | `5f88842` |
| C2, M3 | Plus d'« agréé », de « formations certifiées » ni de « certifications officielles » (bandeau des 24 pages, menu, catalogue, 10 langues) ; entrée de menu « Certificat » vers `#` retirée (69 occurrences). Test `tests/credibility.test.js`. | `4dcc134` |
| M2 | L'état caché des animations « reveal » ne s'applique que si JavaScript tourne (`html.js`), et la classe est retirée si un script échoue. | `6778f07` |
| M8, M9, M10 | Lien « Aller au contenu » sur 9 pages ; 14 contrastes corrigés ; cibles d'au moins 24 px (bandeau, pied de page, liens d'action). | `f803b55` |
| M11 | Titres ≤ 60 et descriptions ≤ 155 caractères sur 12 pages (HTML, dictionnaires, données structurées régénérées). | `2f0a1cd` |
| M1 | **Une direction artistique par formation** : VCA Ligne hiérarchique « Encadrer » (éditorial), Diisocyanates « Le texte réglementaire » (documentaire), Fibre optique « Le chemin de la lumière » (catalogue technique). Détail : `docs/design-references.md`. | `d825fda` |
| M15 | Menu mobile ouvert : reste de la page inerte, focus dans le panneau, retour du focus sur le bouton. Test `tests/menu-a11y.test.js`. | `7e20614` |
| M6, m1 | Bandeau cookies mobile : ≈ 60 % → ≈ 38 % de l'écran (375 × 812), « Tout accepter » et « Tout refuser » côte à côte et de même taille, boutons toujours visibles ; l'assistant ne se pose plus sur le contenu tant que le choix n'est pas fait. | `97a22bd` |

### 24.2 Problèmes trouvés en corrigeant

| # | Problème | Gravité | Statut |
|---|---|---|---|
| N1 | Menu mobile **fermé** : ses 27 liens, hors écran et invisibles, restaient atteignables au clavier sur toutes les pages, même sur ordinateur (WCAG 2.4.3, 2.4.7). | Majeur | Corrigé (`7e20614`) |
| N2 | Rubrique « Formations » active (`aria-current="true"`) et survol du menu en brume sur crème : 2,79:1. | Majeur (1.4.3) | Corrigé (`06b1785`) : épinette, 5,9:1 |
| N4 | Avis, de 320 à 375 px : l'intro « Votre expérience compte » et le formulaire de dépôt rognés à droite (jusqu'à 65 px de texte coupé, 5e étoile de la note invisible). La page ne défile pas horizontalement, d'où l'absence de signalement au §7 : c'est le conteneur qui coupait. | Majeur | Corrigé (`bb7c107`) |
| N3 | Contact : carte « Conseillers habilités · N1 · N2 · PEB · VCA » avec 5 étoiles, traduite par « Certified advisors », « Erkende adviseurs », « Zugelassene Berater », « مستشارون معتمدون »… : la traduction durcit le texte français en **agrément**. Texte d'origine du propriétaire (équipe nommée), donc **non modifié**. | Critique si non confirmé | **À confirmer par Wisy Safety** : qualifications exactes (conseiller en prévention niveau 1 / 2, auditeur VCA), puis aligner les 9 traductions sur le français |

Également corrigé dans les fiches formation : en-têtes de ligne des tableaux empilés trop étroits sur mobile
(« Pour qui / ? » sur deux lignes), cibles « Recommencer » et « Ouvrir la page de l'article » portées à 44 px.

### 24.3 Faux positifs

- **M13** : recontrôle du code source des 4 pages (accueil, catalogue, agenda, contact) : aucun passage de H1 à H3 ni de H2 à H4. Le relevé initial, fait sur la page rendue, ne se reproduit pas dans le code source : aucune action.
- **M16** : le lien `#co-why` est décoratif, `aria-hidden="true"` et `tabindex="-1"` : il n'est ni lu ni atteignable.
- **m5** : les images sans dimensions d'`inscription.html` sont dans des conteneurs à rapport d'aspect fixe : aucun décalage de mise en page.

### 24.4 Vérifications des 3 fiches refondues

- 320, 375, 768, 1024, 1280 et 1440 px : aucun débordement ; en arabe (droite à gauche) : mise en page miroir correcte.
- Balayage final des 24 pages à 320, 375, 768, 1024 et 1440 px : aucune page ne défile horizontalement ; les seuls éléments
  hors cadre sont dans des zones à défilement horizontal voulues (tableaux, onglets, sommaires, filtres) ou une image
  décorative recadrée (Coordination).
- Contrastes : aucun texte sous 4,5:1 (contrôle automatique sur l'ensemble du texte visible) ; cibles ≥ 24 px.
- Fonctions : onglets au clavier (flèches), « Suis-je concerné ? » (3 issues + réinitialisation), articles en fenêtre,
  FAQ, barre d'action mobile, boutons d'inscription et de devis dans l'en-tête à toutes les largeurs.
- Aucune ressource en erreur, aucun texte réécrit (éléments `data-i18n` et `data-src` déplacés tels quels).

### 24.5 Ce qui reste

| Étape | Contenu | Qui |
|---|---|---|
| Décisions | C3 (qui organise l'examen VCA Base), N3 (qualifications de l'équipe), M7 / S1 (prix, durées, dates), m8 (compteurs), m12 / S2 (photos réelles) | **Wisy Safety** |
| Développement | M5 en-tête sur 3 étages, M17 en-tête du catalogue, M14 (relier VCA Entreprise au registre et écrire son guide), m15 pied de page mobile, M4 / S5 allègement, M12 / S4 néerlandais indexable | développement |

