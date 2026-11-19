# Décisions — intégration de 3 formations et de leurs articles (01/10/2026)

Chaque décision donne : le choix, la raison, et ce qu'il faudrait faire pour la changer.

## Cadre

1. **Pas de `CLAUDE.md`.** Le brief renvoie à un « Master Prompt » qui n'existe pas dans le dépôt, ni dans l'historique.
   Les règles suivies sont : le brief, les conventions du dépôt (`README.md`, `docs/README-*.md`) et ses tests. Voir
   `docs/audit-integration.md`.
2. **Ne rien inventer, même par omission.** Une donnée interne non confirmée (prix, durée, effectif, format, langue,
   document remis) vaut `null` dans le registre et n'est **jamais affichée**. Elle reste listée dans
   `unconfirmedClaims` (`js/trainings-data.js`) pour que les tests en empêchent le retour. Les mentions
   [À CONFIRMER] ne figurent que dans la documentation et le rapport, jamais en production.

## Structure

3. **URLs à plat** `formation-vca-ligne-hierarchique.html`, `formation-diisocyanates.html`, `formation-fibre-optique.html`
   et `article-fibre-*.html`. C'est la convention du site (toutes les pages sont à la racine). Les anciennes adresses
   WordPress se traitent par des redirections 301 (`docs/redirects.md`), pas en recréant leurs chemins.
4. **Gabarit « fiche technique » séparé** (`css/formation-fiche.css`, préfixe `fx-` ; `js/formation-fiche.js`). Le
   gabarit VCA Base n'est pas modifié (aucun risque de régression). L'en-tête, le pied de page et le socle CSS en ligne sont
   repris de `formation-vca-base.html`. La duplication existait déjà : elle est signalée en dette (P2), pas corrigée ici.
4 bis. **Une direction artistique par formation** (02/10/2026, retour du propriétaire : « effet copier-coller ») : chaque
   fiche charge, après le gabarit commun, sa propre feuille (`css/fiche-vlh.css`, `fiche-dii.css`, `fiche-fib.css`) et
   recompose son en-tête et ses informations essentielles. La colonne latérale collante disparaît de ces trois pages :
   les faits suivent l'en-tête, les boutons restent dans l'en-tête sur mobile. Détail : `docs/design-references.md`.
5. **Articles** :
   - VCA LH et diisocyanates : en **fenêtre native `<dialog>`** (`js/article-modal.js`, `css/article-modal.css`), avec
     lien direct `#article-<slug>`, bouton retour du navigateur, retour du focus, et lecture **sans JavaScript** (les
     articles sont dans la page, en fin de document).
   - Fibre : ces articles avaient leur propre URL sur l'ancien site. Ils gardent donc une **page autonome**
     (`article-fibre-*.html`) **et** une modale sur la page formation.
   - L'article « Optimisation des réseaux » n'est **pas publié** (chiffres sans source). L'ancienne URL est redirigée.
6. **Date des articles** : les pages d'origine ne donnent ni date ni auteur. On affiche donc « Mis en ligne sur ce site le
   1er octobre 2026 » et « Dernière vérification », sans antidater.

## Sources et vérification

7. **Registre des sources** `js/sources-data.js` : documents (`DOC-…`) et affirmations (`SRC-…`), avec le passage cité,
   la seconde source, le statut et la date. `docs/content-sources.md` est **généré** (`scripts/build-sources-doc.js`).
   `scripts/check-sources.js` vérifie que chaque `data-src` des pages renvoie à une affirmation publiable.
8. **Sur les pages** : une section « Sources » avec date de consultation, « (nouvel onglet) » en texte masqué,
   `rel="noopener noreferrer"`, et des `citation` (`CreativeWork`) dans le JSON-LD.
9. **Liens externes** : `scripts/check-external-links.js` et `.github/workflows/check-external-links.yml` (chaque
   mois, ouvre ou commente une issue). Trois sites renvoient un 403 aux robots (Cisco, ECHA ×2). Ils ont été
   vérifiés à la main dans un navigateur et sont classés « anti-robot », pas « mort ».

## Contenu

10. **Examen VOL-VCA** : jamais « examen inclus », jamais « Wisy délivre le diplôme ». Wisy Safety n'est pas dans
    la liste des centres d'examen reconnus par BeSaCC-VCA. La page parle de **préparation** à l'examen.
11. **Diisocyanates** : « exigée pour les usages industriels ou professionnels à 0,1 % ou plus », jamais « obligatoire »
    sans nuance, jamais « certificat européen », **aucun montant d'amende** (l'ancien « 250 €/jour » est sans source).
12. **Image du hero diisocyanates** : une **plaque typographique** (référence du règlement et ses 4 règles) plutôt
    qu'une image IA d'un produit dangereux, qui aurait pu induire en erreur. VCA LH et fibre réutilisent les visuels du
    catalogue. Les images IA de l'ancien site sont légendées « Illustration ».
13. **Prix** : « sur demande » sur les pages et « Sur devis » à l'inscription (commit `b96b8fa`). Le bordereau de
    l'ancien site (295 / 95 / 650 €) contredit ses propres pages (280–370 € ; 200 €).

## Maillage, recherche, assistant

14. **Menus** (en-tête et mobile, toutes les pages), **catalogue**, **accueil**, **fil d'Ariane JSON-LD**, **sitemap** :
    pointent vers les nouvelles pages. Le **pied de page n'est pas modifié** : il liste des services et pages générales,
    pas les formations une par une (le lien « Formations » suffit), et il est copié dans chaque page.
15. **Recherche** : le moteur existant, qui lit le registre, est conservé. Ajouts : mots-clés et synonymes métier
    (VOL, chef d'équipe, OTDR, épissure, FTTH, polyuréthane…) et 8 articles indexés. **Pas de tolérance aux fautes de frappe** :
    `search.js` est à 1,3 Ko de son budget de 62 Ko. C'est à faire avec un relèvement de budget justifié.
16. **Assistant** : il reste **déterministe** (aucun appel à un modèle d'IA en production). Il cite le contenu
    vérifié et renvoie vers `page#sources` : la validation des liens n'autorise que les pages du site. Règles détaillées
    dans `docs/chatbot-system-prompt.md`, tests dans `docs/chatbot-tests.md`.

## Traductions et SEO

17. **Traductions** : générateur `scripts/build-i18n-fiches.js` (le français est lu dans le HTML, les autres langues
    dans `content/i18n/`). Une seule URL par page et pas de `hreflang` : décision existante du site
    (`docs/README-I18N.md`). Choix de traduction : `docs/translations-review.md`.
18. **SEO** : titres ≤ 60 caractères, descriptions ≤ 155, canonical, `lastmod` connu seulement dans le sitemap, JSON-LD
    `Course` **sans** `offers` ni `timeRequired` (aucune donnée confirmée), `BreadcrumbList`, `Article` pour les pages
    d'articles. Tout est généré par `scripts/build-seo.js`.

## Budgets et tests

19. **Budgets JS relevés**, avec justification écrite dans `tests/perf-budget.test.js` : `trainings-data.js` 28 → 40 Ko,
    `site-content.js` 26 → 31 Ko (3 formations avec faits officiels sourcés, 8 articles indexés).
20. **Tests** : 456 tests, dont 3 échecs **préexistants**, déjà présents au début de la mission et liés au service VCA
    Entreprise : le guide `docs/README-VCA-ENTREPRISE.md` est absent, et deux contrôles de `site-content.test.js`
    attendent l'entrée `vca-entreprise` dans des listes dérivées du registre. Non corrigés : hors périmètre. Aucun test existant
    n'a été affaibli : les attentes modifiées remplacent des durées non confirmées par des faits sourcés.

# Décisions — formation « Conseiller en prévention niveau III » (CP3, 19/11/2026)

21. **Une fiche « thème registre »** (`css/fiche-cp3.css`) sur le socle `fx-`, comme les trois fiches du 01/10 : la plaque du Code tient lieu
    d'image, outil « Quel niveau pour mon entreprise ? » (groupes A–D, art. II.1-2) dont la règle vit dans le registre
    (`cp3Outcome`, testée), pas dans le script de la page.
22. **Wisy Safety figure sur la liste du SPF Emploi** (entrée « Wisy asbl », constat du 19/11/2026, `SRC-CP3-010`). La première version de la
    page disait le contraire : la liste, longue, avait été lue en partie. Conséquence : la page l'affirme, avec date, lien et nature
    exacte de l'inscription (notification, retirable après contrôle). Le drapeau `official.spfListed` du registre la pilote ; un test échoue
    si la page affirme ce que le registre ne confirme pas.
23. **Mots interdits, même une fois inscrite** : « agréé / agrément » (le SPF les réserve aux niveaux I et II), « reconnu par le SPF »
    (le Code dit « jugé avoir satisfait », art. II.4-24), « certificat officiel » (le Code prévoit une attestation de participation,
    art. II.4-25). Tests : `tests/cp3.test.js`.
24. **Prix, durée de session, langue(s), dates : « sur demande »** (« Sur devis » à l'inscription). « 40 heures » n'est affiché que comme
    minimum légal (art. II.4-25, 3°). La liste du SPF indique « français » pour Wisy asbl : non repris tant que non confirmé session par session.
25. **Contrôle des sources** : `scripts/check-sources.js` ignore aussi `https://wisysafety.be/` (canonical sans « www » depuis le 23/10) ; il
    échouait sur les 5 fiches existantes. Focus clavier de la page : anneau épinette (5,7:1) au lieu de l'anneau « brume » du socle (2,8:1).
