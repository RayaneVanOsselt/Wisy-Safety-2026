# SEO technique, contenu partagé et performance — mode d'emploi

Le site reste **statique, sans build de production, sans dépendance**. Trois petits outils Node/Python
(fournis, sans `npm install`) et des tests gardent le tout cohérent.

## Une source pour chaque donnée

| Donnée | Source unique | Consommateurs |
|---|---|---|
| Pages, catégories, formations (route, ancre, clés i18n, mots-clés) | `js/site-content.js` | recherche du site, assistant, sitemap, JSON-LD, copie Edge |
| Coordonnées, horaires, position GPS, questions/réponses de la FAQ | `js/faq-data.js` | Centre d'aide, assistant, recherche (infos pratiques + FAQ), JSON-LD |
| Faits de la formation Nacelles (prix, durée, langues, format) | `js/trainings-data.js` | page dédiée, recherche, assistant, inscription, JSON-LD |
| Prix du parcours d'inscription | `js/registration-data.js` | parcours d'inscription |

Ajouter ou modifier une formation ou une page = éditer `js/site-content.js` (+ ses textes i18n), puis :

```bash
node scripts/build-seo.js    # sitemap.xml, robots.txt, canonical, Open Graph, JSON-LD
node scripts/sync-edge.js    # copies TypeScript de la fonction Edge (assistant IA)
node --test tests/*.test.js  # échoue si une copie générée est obsolète
```

## Ce que génère `scripts/build-seo.js`

- `sitemap.xml` : uniquement les pages publiques indexables, en URL canonique absolue (`https://www.wisysafety.be/…`).
- `robots.txt` : tout est explorable (CSS, JS et images inclus, indispensables au rendu) ; référence du sitemap.
- Dans le `<head>` de chaque page, entre `<!-- seo:start -->` et `<!-- seo:end -->` : canonical, Open Graph, Twitter,
  `theme-color`, données structurées JSON-LD. **Ne pas éditer ce bloc à la main.** Le `<title>` et la meta
  description restent écrits dans chaque page (ils sont traduits par l'i18n).
- Pages techniques (`404.html`, `admin/avis.html`, maquettes `wisy-safety-header/footer.html`) : `noindex`, hors sitemap.

Données structurées (chacune reprend un fait **déjà affiché** sur la page ; `tests/seo.test.js` le vérifie) :
`EducationalOrganization`+`LocalBusiness` (adresse, téléphone, horaires, position), `WebSite` (accueil),
`BreadcrumbList` (pages avec fil d'Ariane visible), `Course` (Nacelles : prix HT, durée, langues),
`ItemList` de `Course` (catalogue), `ContactPage`. Le `FAQPage` du Centre d'aide est injecté par `js/faq-page.js`
à partir des questions affichées. Volontairement **absents** : `AggregateRating`/`Review` (avis dynamiques),
`Event` (aucune session publiée), `SearchAction` (la recherche n'a pas d'URL de résultats).

## Choix techniques à connaître

- **Langue des robots** : `js/i18n.js` détecte la langue du navigateur. Googlebot annonce « en-US » : sans garde-fou il
  aurait indexé la version *anglaise* des pages françaises. Les robots reçoivent donc le français (langue du HTML) ;
  les visiteurs humains gardent la langue de leur navigateur ; `?lang=xx` reste honoré.
- **hreflang retiré** : les 10 langues sont la *même URL* traduite en JavaScript ; les anciennes balises `hreflang`
  (URLs relatives vers `?lang=xx`, canonical identique) étaient invalides et ignorées. Une vraie indexation par langue
  exigerait une URL et un HTML distincts par langue (projet à part).
- **URL canonique** : `https://www.wisysafety.be`. L'accueil est la racine `/` ; les autres pages gardent `.html`
  (fichiers réels). Des URL sans `.html` dépendent de l'hébergeur (réécriture) — non nécessaire au SEO.
- **404** : `404.html` est autonome (chemins racine) et prête pour GitHub Pages / Netlify / Cloudflare Pages / Vercel.

## Performance (Core Web Vitals)

- **Polices auto-hébergées** (`css/fonts.css`, `assets/fonts/`) : plus de CSS Google Fonts bloquant, plus de connexion
  à un tiers (RGPD), 3 fichiers critiques préchargés, `font-display: swap`.
- **Images** (`python3 scripts/optimize-images.py`) : les originaux (jusqu'à 800 Ko, JPEG CMYK) restent dans `assets/`
  comme sources ; les pages chargent des WebP dimensionnés. `width`/`height` partout (pas de décalage).
- **CLS** : la barre de recherche injectée par JS a son espace réservé en CSS (`css/search.css`).
- **Vidéo d'accueil** : l'affiche WebP est préchargée ; les sources vidéo ne se téléchargent qu'*après* le chargement de la
  page, jamais en mouvement réduit ni économie de données.
- **Recherche** : le FAQ (37 Ko) n'est chargé qu'à la première utilisation de la barre.
- **Scripts tiers** : versions exactes épinglées + SRI (`integrity`) ; `tests/site-links.test.js` l'impose.

## Limites connues

- Pas d'étape de minification (site sans build) : envisageable si l'hébergeur le permet.
- Pages légales (mentions légales, confidentialité, CGV) et entrées de menu « VCA Entreprise / PEB / Coordination /
  Certificat » : `href="#"` (pages à créer avec un contenu fourni par Wisy Safety). `tests/site-links.test.js` fige cette
  liste : toute *nouvelle* destination morte fait échouer les tests.
- En-têtes HTTP (cache long, `Content-Security-Policy`, `X-Content-Type-Options`, HSTS) : à configurer chez l'hébergeur.
