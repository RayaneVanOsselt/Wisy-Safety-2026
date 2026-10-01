# Archive de l'ancien site (wisysafety.be, WordPress/Elementor)

Copies **brutes** des pages migrées, récupérées le 1er octobre 2026 (heure UTC et code HTTP dans l'en-tête de chaque
fichier). Le dossier commence par « _ » : GitHub Pages (Jekyll) ne le publie pas.

**Aucune affirmation de ces fichiers n'est une source.** Ce qui a été repris, corrigé ou retiré est tracé dans
`docs/content-audit.md`, `docs/articles-fact-check/` et `docs/content-sources.md`.

| Fichier | Contenu |
|---|---|
| `fibre-optique.md` | page formation (niveaux, 6 modules, 4 formats, liens vers 3 articles) |
| `produit-dangereux.md` | page formation diisocyanates + les 3 articles affichés en modale |
| `vca-ligne-hierarchique.md` | page formation VCA Ligne hiérarchique + les 3 dossiers WSY-RES/01 à 03 en modale |
| `les-parcours-professionnels-…md`, `optimisation-des-reseaux-…md`, `devenir-expert-…md` | les 3 articles fibre optique (pages séparées) |
| `sinscrire.md` | bordereau d'inscription (tarifs indicatifs par participant) — utilisé pour constater les écarts de prix |

Méthode : `curl` puis conversion HTML → Markdown sans dépendance (titres, listes, tableaux, liens, images). Aucune date
de publication ni aucun auteur n'apparaît dans ces pages ; les images y sont téléversées en avril, octobre et
novembre 2025 (chemins `wp-content/uploads/AAAA/MM/`).
