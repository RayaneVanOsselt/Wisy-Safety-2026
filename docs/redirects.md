# Redirections de l'ancien site vers le nouveau

Depuis le 22/10/2026, **https://wisysafety.be** sert le nouveau site (GitHub Pages, fichier `CNAME`). Avant, ce même
domaine servait un site WordPress : ses adresses peuvent encore figurer dans Google, dans des favoris ou des liens
partagés. Sans redirection, elles tombent sur la page 404 et le référencement acquis est perdu.

## 1. Ce qui est en place (vérifié par `tests/redirects.test.js`)

GitHub Pages **ne sait pas envoyer de code 301**. Deux mécanismes complémentaires :

1. **Une page de redirection par ancienne adresse** (`dossier/index.html`) : canonical vers la nouvelle page,
   `<meta http-equiv="refresh" content="0">` et `location.replace`. Google traite un renvoi immédiat comme une
   redirection permanente ; le visiteur arrive directement sur la nouvelle page (code 200, pas de 404).
2. **Une table de secours dans `404.html`** (script en tête de page) : même liste, plus les anciennes adresses qui portent
   le nom d'une page actuelle — un dossier `formations/` entrerait en conflit avec l'adresse `/formations` (qui sert
   `formations.html`). Pour celles-là, le visiteur est redirigé ; Google, lui, voit une 404 et finit par oublier
   l'ancienne adresse, la nouvelle étant dans le sitemap.

| Ancienne adresse | Nouvelle page | Mécanisme | Note |
|---|---|---|---|
| `/vca-ligne-hierarchique/` | `/formation-vca-ligne-hierarchique.html` | page + 404 | les 3 dossiers sont dans la page |
| `/produit-dangereux/` | `/formation-diisocyanates.html` | page + 404 | les 3 articles sont dans la page |
| `/fibre-optique/` | `/formation-fibre-optique.html` | page + 404 | |
| `/les-parcours-professionnels-dans-la-fibre-optique-du-technicien-a-lingenieur-reseau/` | `/article-fibre-parcours-professionnels.html` | page + 404 | |
| `/devenir-expert-en-fibre-optique-competences-cles-et-debouches-professionnels/` | `/article-fibre-devenir-expert.html` | page + 404 | |
| `/optimisation-des-reseaux-fibre-optique-gain-de-performance-et-economies/` | `/formation-fibre-optique.html` | page + 404 | article non repris (chiffres sans source) : sujet le plus proche |
| `/sinscrire/` | `/inscription.html` | page + 404 | |
| `/wisy-vca/` | `/vca-entreprise.html` | page + 404 | |
| `/wisy-coordination/` | `/coordination.html` | page + 404 | |
| `/formulaie-de-contact/` | `/contact.html` | page + 404 | orthographe d'origine |
| `/wisy-certificat/` | `/certificats.html` | page + 404 | la page de vérification existe désormais |
| `/formations/` | `/formations.html` | 404 seulement | conflit de nom |
| `/agenda/` | `/agenda.html` | 404 seulement | conflit de nom |
| `/mentions-legales/` | `/mentions-legales.html` | 404 seulement | conflit de nom |

**Volontairement NON redirigées** : les anciennes fiches individuelles `/certificat/<nom>/` (données personnelles
publiées par WordPress) et `/wisy-expertise/` (aucune page équivalente : une redirection vers l'accueil serait traitée
comme une fausse 404 par Google). Elles répondent 404 et sortiront de l'index.

## 2. Inventaire encore incomplet

Cette liste vient des liens relevés sur l'ancien site (01/10/2026). Les archives publiques (Wayback Machine) étaient
indisponibles le 23/10/2026. **À faire après la validation du domaine dans Google Search Console** : rapport
« Pages » › « Introuvable (404) » — chaque ancienne adresse encore visitée s'ajoute ici (une ligne dans la table de
`404.html` et, sans conflit de nom, un dossier `nom/index.html` copié sur un existant), puis `node --test tests/redirects.test.js`.

## 3. Pour de vraies redirections 301 (option)

Mettre le domaine derrière un service qui gère les règles de redirection (Cloudflare, gratuit, en gardant GitHub Pages
comme hébergeur) — changement de DNS à décider par Wisy Safety. Les pages de redirection actuelles resteraient
inoffensives.

## 4. Vérifier

```bash
curl -s https://wisysafety.be/produit-dangereux/ | grep -E "canonical|refresh"
```

Puis ouvrir l'adresse dans un navigateur : on arrive sur la nouvelle page.
