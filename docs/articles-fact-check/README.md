# Vérification des 9 articles de l'ancien site

Relecture faite le **01/10/2026**. Chaque fiche compare le texte d'origine (archive brute dans `content/_legacy/`)
à des sources ouvertes et lues ce jour-là. Les sources sont tracées par identifiant (`SRC-…`) dans
`js/sources-data.js` ; le tableau lisible est dans `docs/content-sources.md`.

Verdicts possibles :

- **Publiable** : rien à corriger, ou des conseils présentés comme tels.
- **Publiable après corrections** : publié, mais seulement après les corrections listées dans la fiche.
- **Non publiable** : pas publié sur le nouveau site.

| # | Article d'origine | Fiche | Verdict | Où il est publié |
|---|---|---|---|---|
| 1 | VCA LH — WSY-RES/01 Communication hiérarchique | [vlh-communication-hierarchique.md](vlh-communication-hierarchique.md) | Publiable (conseils) | modale `formation-vca-ligne-hierarchique.html#article-communication-hierarchique` |
| 2 | VCA LH — WSY-RES/02 Erreurs fréquentes de la hiérarchie | [vlh-erreurs-hierarchie.md](vlh-erreurs-hierarchie.md) | Publiable (conseils), deux phrases retirées | modale `#article-erreurs-hierarchie` |
| 3 | VCA LH — WSY-RES/03 Ligne hiérarchique et culture sécurité | [vlh-culture-securite.md](vlh-culture-securite.md) | Publiable (conseils) | modale `#article-culture-securite` |
| 4 | Diisocyanates — Définition, types et applications | [diisocyanates-definition.md](diisocyanates-definition.md) | Publiable après corrections | modale `formation-diisocyanates.html#article-diisocyanates-definition` |
| 5 | Diisocyanates — Réglementation et obligations | [diisocyanates-reglementation.md](diisocyanates-reglementation.md) | Publiable après corrections (réécrit) | modale `#article-diisocyanates-reglementation` |
| 6 | Diisocyanates — Autres substances dangereuses | [substances-dangereuses.md](substances-dangereuses.md) | Publiable après corrections (réécrit) | modale `#article-substances-dangereuses` |
| 7 | Fibre — Les parcours professionnels | [fibre-parcours-professionnels.md](fibre-parcours-professionnels.md) | Publiable après corrections | `article-fibre-parcours-professionnels.html` + modale sur la page fibre |
| 8 | Fibre — Devenir expert | [fibre-devenir-expert.md](fibre-devenir-expert.md) | Publiable après corrections (réécrit) | `article-fibre-devenir-expert.html` + modale sur la page fibre |
| 9 | Fibre — Optimisation des réseaux | [fibre-optimisation-reseaux.md](fibre-optimisation-reseaux.md) | **Non publiable** | non publié (l'ancienne URL est redirigée vers la page fibre, voir `docs/redirects.md`) |

Règles appliquées partout :

- Aucun chiffre, aucune étude, aucun prix ni aucune durée sans source ouverte et lue.
- Les conseils de l'équipe pédagogique restent, mais ils sont présentés comme des conseils (« Conseils de l'équipe
  pédagogique Wisy Safety »). Ils ne passent jamais pour un fait sourcé.
- Les textes recopiés ou très proches d'un texte en ligne ont été cherchés : sur 5 phrases témoins, aucune copie mot pour mot n'a été trouvée.
  Les articles publiés sont tout de même réécrits.
- Les images sont générées par IA (fichiers « Firefly ») : la légende le dit quand l'image accompagne un sujet technique.
