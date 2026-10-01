# Redirections de l'ancien site vers le nouveau

Quand le nouveau site remplacera l'ancien sur **wisysafety.be** (domaine supposé, **[À CONFIRMER]**), les anciennes
adresses doivent renvoyer vers les nouvelles par une **redirection permanente (301)**. Sinon, les liens partagés et
les résultats Google tombent sur une page 404, et le référencement acquis est perdu.

## 1. Pages de cette mission (URLs ouvertes le 01/10/2026, code 200)

| Ancienne URL | Nouvelle URL | Note |
|---|---|---|
| `/vca-ligne-hierarchique/` | `/formation-vca-ligne-hierarchique.html` | les 3 dossiers sont dans la page (`#article-communication-hierarchique`, `#article-erreurs-hierarchie`, `#article-culture-securite`) |
| `/produit-dangereux/` | `/formation-diisocyanates.html` | les 3 articles sont dans la page (`#article-diisocyanates-definition`, `#article-diisocyanates-reglementation`, `#article-substances-dangereuses`) |
| `/fibre-optique/` | `/formation-fibre-optique.html` | |
| `/les-parcours-professionnels-dans-la-fibre-optique-du-technicien-a-lingenieur-reseau/` | `/article-fibre-parcours-professionnels.html` | |
| `/devenir-expert-en-fibre-optique-competences-cles-et-debouches-professionnels/` | `/article-fibre-devenir-expert.html` | |
| `/optimisation-des-reseaux-fibre-optique-gain-de-performance-et-economies/` | `/formation-fibre-optique.html` | article **non repris** (`docs/articles-fact-check/fibre-optimisation-reseaux.md`) : redirigé vers le sujet le plus proche |
| `/sinscrire/` | `/inscription.html` | |

## 2. Autres adresses vues dans le pied de page de l'ancien site (liens relevés, pages **non ouvertes**)

| Ancienne URL | Proposition | À décider |
|---|---|---|
| `/formations/` | `/formations.html` | — |
| `/wisy-vca/` | `/vca-entreprise.html` | — |
| `/wisy-coordination/` | `/coordination.html` | — |
| `/agenda/` | `/agenda.html` | — |
| `/formulaie-de-contact/` (orthographe d'origine) | `/contact.html` | — |
| `/mentions-legales/` | `/mentions-legales.html` | — |
| `/wisy-expertise/` | aucune page équivalente | page cible à choisir (accueil ?) |
| `/wisy-certificat/` | aucune page équivalente (l'entrée « Certificat » du nouveau menu pointe aussi vers `#`) | à décider avec le propriétaire |

Avant la bascule, il faut faire l'inventaire complet des URLs de l'ancien site (sitemap WordPress `/wp-sitemap.xml`
ou Google Search Console) et compléter ce tableau. Cette mission ne l'a pas fait.

## 3. Comment les mettre en place

Le site est aujourd'hui publié par **GitHub Pages**, qui **ne sait pas** faire de vraies redirections 301. Trois options :

1. **Recommandé** : mettre le domaine derrière un service qui gère les redirections (Cloudflare, Netlify…). Fichier
   au format `_redirects` (Netlify, Cloudflare Pages) :

   ```text
   /vca-ligne-hierarchique/   /formation-vca-ligne-hierarchique.html   301
   /produit-dangereux/        /formation-diisocyanates.html            301
   /fibre-optique/            /formation-fibre-optique.html            301
   /les-parcours-professionnels-dans-la-fibre-optique-du-technicien-a-lingenieur-reseau/   /article-fibre-parcours-professionnels.html   301
   /devenir-expert-en-fibre-optique-competences-cles-et-debouches-professionnels/          /article-fibre-devenir-expert.html            301
   /optimisation-des-reseaux-fibre-optique-gain-de-performance-et-economies/              /formation-fibre-optique.html                 301
   /sinscrire/                /inscription.html                        301
   ```

2. **Hébergement Apache** (`.htaccess`) : `Redirect 301 /produit-dangereux/ /formation-diisocyanates.html`, etc.

3. **En restant sur GitHub Pages** : créer une petite page par ancienne adresse (par exemple `produit-dangereux/index.html`)
   avec `<link rel="canonical">` vers la nouvelle page et `<meta http-equiv="refresh" content="0; url=…">`. Google
   traite ce renvoi immédiat presque comme une 301, mais ce n'en est pas une. Ce n'est qu'un **dernier recours**.

Cette mission n'a créé aucune de ces pages : le domaine et l'hébergement final ne sont pas confirmés.

## 4. Après la bascule

- Tester chaque ancienne URL (`curl -I`) : code `301` et bonne destination.
- Soumettre `sitemap.xml` dans Google Search Console et suivre les erreurs 404 pendant quelques semaines.
- Les liens vers l'ancien site dans les sources (`legacyUrl` dans `js/trainings-data.js`) servent seulement à la
  traçabilité. Ils ne sont pas affichés.
