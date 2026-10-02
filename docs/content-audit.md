# Audit de contenu — VCA Ligne hiérarchique, Diisocyanates, Fibre optique

Audit du **01/10/2026**. Pour chaque page de l'ancien site (archives dans `content/_legacy/`), on indique ce que devient
chaque affirmation sur le nouveau site. Les 9 articles ont leur propre fiche dans `docs/articles-fact-check/`.
Les sources (`SRC-…`) sont dans `js/sources-data.js` et `docs/content-sources.md`.

Légende des décisions :

- **Gardé** : publié tel quel.
- **Corrigé** : publié après correction, selon la source.
- **Retiré** : non publié.
- **[À CONFIRMER]** : donnée interne de Wisy Safety, contradictoire ou non prouvée. Elle n'est **jamais affichée**
  et reste dans `unconfirmedClaims` (`js/trainings-data.js`), les tests empêchent qu'elle réapparaisse.

## 1. VCA Ligne hiérarchique — `formation-vca-ligne-hierarchique.html`

Ancienne URL : https://wisysafety.be/vca-ligne-hierarchique/

| Affirmation de l'ancienne page | Décision | Source / raison |
|---|---|---|
| « Formez vos cadres… et obtenez la **certification VCA reconnue pour votre entreprise** » | **Corrigé** | Confusion entre deux choses : le VOL-VCA est le diplôme d'une **personne**, délivré par un centre d'examen reconnu (`SRC-VLH-004`). La certification VCA d'une **entreprise** est un autre produit (page VCA Entreprise). |
| Public : chefs d'équipe, superviseurs, responsables ; entreprises visant la certification | Gardé, sourcé | `SRC-VLH-001` (checklist VCA, question 3.3) |
| Programme : « législation, prévention, EPI, travaux en hauteur » | **Corrigé** | Remplacé par les **14 chapitres officiels** des termes finaux VOL-VCA (`SRC-VLH-007`). Titres traduits par Wisy Safety, signalé sur la page. |
| Examen « QCM de 70 questions — note minimale 45/70 » | **Corrigé** | 70 questions **de plusieurs types**, seuil 64,5 % = 4 515 / 7 000 points (`SRC-VLH-005`, `SRC-VLH-006`). Durée 75 min selon un centre (`SRC-VLH-008`). Changement de format aux Pays-Bas en 2026 signalé (`SRC-VLH-010`). |
| « Certification valable 10 ans » | Gardé, précisé | Diplôme valable 10 ans **à compter du jour de l'examen** (`SRC-VLH-002`) ; vérifiable au registre central (`SRC-VLH-009`) |
| « Certification reconnue dans de nombreux secteurs » | Retiré | Non sourcé |
| « Taux de réussite exceptionnel : 95 % » | Retiré | Non sourcé |
| « Formateurs certifiés avec expérience terrain » | **[À CONFIRMER]** | Aucune preuve fournie |
| Compteurs « 0 ans / 0 % / 0h » (animation cassée) | Retiré | — |
| Durée : « 2 jours (14h) ou 1 jour intensif » ; formule Standard « 1 jour intensif — 10 heures » | **[À CONFIRMER]** | Incohérent (1 jour = 10 h ?). Page : « communiquée sur demande » |
| Tarifs 280 € / 370 € / 195–345 € (et 295 € au bordereau d'inscription) | **[À CONFIRMER]** | Contradictoires. Page et inscription : « sur demande » / « Sur devis » |
| « Examen VCA inclus » | **[À CONFIRMER]** | Wisy Safety **ne figure pas** dans la liste des centres d'examen reconnus par BeSaCC-VCA (`SRC-VLH-004`). Page : « Wisy Safety vous prépare à l'examen ; le diplôme est délivré par le centre d'examen reconnu ». |
| « Manuel complet », « Repas & boissons inclus », « Support prioritaire » | **[À CONFIRMER]** | Non affiché |
| Réf. « WSY-VOL/2025-BE » | Retiré | Référence interne sans portée pour le visiteur |
| Financement « Constructiv/CP124, Forem, Actiris, VDAB » | **Corrigé** | Liens vers chaque organisme ; l'éligibilité dépend de lui, sans garantie de prise en charge (`SRC-VLH-011`). « CP124 » non vérifié, retiré. |
| 3 dossiers WSY-RES/01 à 03 | Publiés (conseils) | Fiches `docs/articles-fact-check/vlh-*.md` |

Ajouts sourcés : comparatif B-VCA / VOL-VCA (`SRC-VCAB-EXAM`, `SRC-VCAB-VALID`), FAQ, sources datées, JSON-LD
`Course` sans prix ni durée.

## 2. Diisocyanates — `formation-diisocyanates.html`

Ancienne URL : https://wisysafety.be/produit-dangereux/

| Affirmation de l'ancienne page | Décision | Source / raison |
|---|---|---|
| « Formation Obligatoire — Belgique », « Certification professionnelle obligatoire depuis le 24 août 2023 » | **Corrigé** | Règlement **européen** (UE) 2020/1149. La formation est exigée avant tout usage **industriel ou professionnel** de produits à **0,1 % ou plus** (`SRC-DII-002`, `SRC-DII-003`). Il n'y a pas de « certification » : l'employeur ou l'indépendant **atteste** la réussite (`SRC-DII-006`). |
| « plus de 0,1 % » | **Corrigé** | « 0,1 % ou plus » (`SRC-DII-002`) |
| « formation certifiée », « Reconnaissance légale européenne — certification valide partout en Europe », « Certification reconnue » | Retiré | Faux : aucun certificat européen (`SRC-DII-006`) |
| « Validité 5 ans » | **Corrigé** | Renouvellement **au moins tous les cinq ans** (`SRC-DII-005`) |
| « vous protège légalement et médicalement », « Protection santé garantie », « Protégez-vous… contre les contrôles de l'inspection » | Retiré | Promesses non fondées |
| Public : salariés et indépendants ; peintres, façadiers, étancheurs, menuisiers, opérateurs | Gardé, précisé | Personnes qui manipulent **ou supervisent** (`SRC-DII-004`). Les métiers sont des exemples ; seule l'étiquette ou la FDS dit si un produit est concerné. |
| Secteurs (construction, adhésifs, revêtements, mousses, isolation, polyuréthane…) | **Corrigé** | Réduit aux usages cités par le règlement (`SRC-DII-014`) et par ISOPA (`SRC-DII-015`) |
| Durée « 2-4 h » | **[À CONFIRMER]** | Page : « communiquée sur demande » |
| Tarif « 200 € à partir de » (et 95 € au bordereau d'inscription) | **[À CONFIRMER]** | Contradictoires. Page et inscription : « sur demande » / « Sur devis » |
| Format « présentiel, en centre ou intra-entreprise » | **[À CONFIRMER]** | Non affiché |
| Niveau couvert par une session (général, intermédiaire, avancé) | **[À CONFIRMER]** | Page : « confirmé lors de votre demande » |
| « Offre limitée — Accès immédiat », « +2 500 professionnels », « 98 % de satisfaction », « 4,9/5 », « Accès illimité à vie », « Communauté exclusive », « Première leçon offerte », « Sans engagement 30j », « S'inscrire gratuitement », « SSL 256-bit » | Retiré | Non vérifiés. Ces textes ressemblent à un modèle de page de vente en ligne et ne correspondent pas à une formation en présentiel. |
| 3 articles (définition, réglementation, autres substances) | Publiés après corrections | Fiches `docs/articles-fact-check/diisocyanates-*.md` et `substances-dangereuses.md` |

Ajouts sourcés : encadré réglementaire (entrée 74, seuil, renouvellement, mention d'emballage), outil
« Suis-je concerné ? » (3 questions tirées du texte, aucune donnée envoyée), tableau des 3 niveaux (`SRC-DII-007`),
valeurs limites belges 2026/2029 (`SRC-DII-012`), obligation générale d'évaluation des risques (`SRC-DII-013`),
« aucun montant d'amende » (`SRC-DII-025`, la page n'invente pas de chiffre).

## 3. Fibre optique — `formation-fibre-optique.html`

Ancienne URL : https://wisysafety.be/fibre-optique/

| Affirmation de l'ancienne page | Décision | Source / raison |
|---|---|---|
| « 500+ professionnels formés », « 15+ ans d'expertise », « 100 % certifications reconnues » | Retiré | Non prouvés. Pour « 15+ ans », la BCE indique seulement la forme légale ASBL depuis le 14/09/2025 (`DOC-KBO-WISY`), pas le début de l'activité : à prouver par Wisy Safety. |
| 3 niveaux (débutant, intermédiaire, avancé) et leurs publics | Gardé | Offre publiée par Wisy Safety elle-même. La page le dit (« programme, niveaux et formats publiés par Wisy Safety »). |
| 6 modules et leurs contenus | Gardé | Idem |
| Durées des modules (20, 25, 30, 28, 35, 32 h ; 170 h au total) | **[À CONFIRMER]** | Incompatibles avec « intensif 5 à 7 jours / 35-40 h ». Page : « communiquées sur demande ». |
| Formats intensif / modulaire / mixte / chantier | Gardé (sans chiffres) | Durées, effectif, « 3 à 4 jours de pratique » : **[À CONFIRMER]** |
| « Maximum 8 participants », « 80 % de pratique » | **[À CONFIRMER]** | Non affiché |
| « Certification — Attestation de compétences reconnue par les professionnels… Diplômant » | Retiré | Non prouvé. Page : Wisy ne présente pas cette formation comme une certification officielle ; les certifications existantes (CFOT) sont délivrées par leurs organismes (`SRC-FIB-006`). |
| « E-learning sur notre plateforme », « forum d'entraide » | **[À CONFIRMER]** | Aucune plateforme constatée. Non affiché. |
| « Techniciens certifiés avec plus de 10 ans d'expérience », « rencontres avec des employeurs », « formés depuis 2010 » | **[À CONFIRMER]** | Non affiché |
| Tarif (650 € au bordereau d'inscription) | **[À CONFIRMER]** | Page et inscription : « sur demande » / « Sur devis » |
| 3 articles | 2 publiés après corrections, 1 non publiable | Fiches `docs/articles-fact-check/fibre-*.md` |

Ajouts sourcés : repères techniques FOA / UIT (`SRC-FIB-001` à `SRC-FIB-005`), FAQ (« pas une certification
officielle », tarif et durée sur demande).

## 4. Ailleurs sur le site (préexistant, signalé, non modifié sauf mention)

| Où | Affirmation | État |
|---|---|---|
| Barre utilitaire de l'en-tête, toutes les pages (10 langues) | « Organisme de formation **agréé** » / « Centre de formation accrédité » | **Retiré** le 02/10/2026 (`4dcc134`) : « Centre de formation à la sécurité · Anderlecht, Belgique ». À rétablir seulement sur preuve écrite d'un agrément |
| `formations.html` (titre) | « Nos formations **certifiées** » ; menu « catalogue complet certifié » | **Retiré** le 02/10/2026 (`4dcc134`) |
| `formation-vca-base.html`, assistant | « 225 € par personne, **examen inclus** » (confirmé par le propriétaire le 26/09/2026) | **[À CONFIRMER]** : Wisy Safety n'est pas dans la liste des centres d'examen reconnus (`SRC-VLH-004`). Qui organise l'examen, et où ? |
| `formations.html` (cartes des 3 formations) | Durées « 2 jours / 1 jour / 3 jours », « Conforme aux normes européennes », « Équipement fourni »… | **Corrigé** : cartes réécrites avec des faits sourcés uniquement |
| `js/registration-data.js` | 295 / 95 / 650 € | **Corrigé** : « Sur devis » (commit `b96b8fa`) |
| Accueil, PEB, agenda, Contact | Compteurs « 500+ », « 10+ », « 100 % » | Hors périmètre, signalé (imposés par des tests existants) |
| `contact.html` (carte du visuel) | « Conseillers habilités · N1 · N2 · PEB · VCA » ; traduit « Certified advisors », « Erkende adviseurs », « Zugelassene Berater », « مستشارون معتمدون »… | **[À CONFIRMER]** : texte du propriétaire, non modifié. Les traductions affirment un agrément que le français ne dit pas : à aligner une fois les qualifications confirmées (audit, N3) |

## 5. Ce qu'il faut à Wisy Safety pour compléter les pages

Une confirmation **écrite**, formation par formation, de : tarif (HT ou TTC), durée, formats réellement proposés,
effectif maximal, langues, document remis en fin de formation, lieu et organisation de l'examen (VOL-VCA), niveau
couvert (diisocyanates), qualifications des formateurs. Chaque donnée confirmée se saisit **une seule fois** dans
`js/trainings-data.js` : la page, le catalogue, l'inscription, la recherche et l'assistant la reprennent.
