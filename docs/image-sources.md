# Provenance des images — page Certificateur PEB

Registre des visuels externes utilisés par `peb-wallonie-bruxelles.html` (voir aussi `assets/README.md`
pour les règles générales de rangement des images du site).

| Fichier (original) | Dérivés WebP | Auteur / plateforme | URL source | Licence | Récupéré le |
|---|---|---|---|---|---|
| `assets/originaux/peb/peb-residence-facade.jpg` | `assets/images/peb/peb-residence-facade-1200.webp` | Fourni par le client (Rayane Van Osselt, Wisy Safety) | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-24 |
| `assets/originaux/peb/peb-structure-chantier.jpg` | `assets/images/peb/peb-structure-chantier-900.webp` | Fourni par le client (Rayane Van Osselt, Wisy Safety) | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-24 |
| `assets/originaux/peb/peb-cles-immeuble.jpg` | `assets/images/peb/peb-cles-immeuble-900.webp` | Fourni par le client (Rayane Van Osselt, Wisy Safety) | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-24 |
| `assets/originaux/peb/peb-verification-conformite.jpg` | `assets/images/peb/peb-verification-conformite-240.webp` | Fourni par le client (Rayane Van Osselt, Wisy Safety) | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-24 |

## ⚠️ À vérifier avant mise en ligne

Ces quatre photos ont été déposées directement dans `assets/images/` par le client pour cette tâche
(fichiers `PEB 1.JPG` → `PEB 4.JPG`, renommés et rangés dans `assets/originaux/peb/` puis optimisés en
WebP par `scripts/optimize-images.py`). Leur **origine et leur licence d'usage commercial n'ont pas pu
être vérifiées** dans ce cadre de travail (aucune métadonnée de provenance, EXIF minimal).

Avant publication, confirmer auprès de Wisy Safety :
- que ces images sont soit la propriété de Wisy Safety, soit sous licence libre de droits pour un usage
  commercial (Pexels/Unsplash/Pixabay ou équivalent), soit générées avec des droits d'usage commercial ;
- qu'aucune ne provient d'un concurrent, d'un site tiers protégé ou d'une banque d'images sans licence.

Si l'origine ne peut pas être confirmée, les remplacer par des images sourcées explicitement (Pexels,
Unsplash, Pixabay) suivant le même gabarit (voir les tailles ci-dessus), en complétant ce tableau avec
l'URL exacte de la source.

Aucune de ces images ne représente une personne, un document administratif réel ou un lieu identifiable
de Wisy Safety : elles sont utilisées comme illustrations génériques (bâtiment résidentiel, structure
technique, symbolique de la remise de clés/agrément), jamais comme preuve factuelle (ex. jamais présentées
comme "notre centre" ou "nos formateurs").


# Provenance des images — page Formation VCA Base et ses articles

| Fichier (original) | Dérivés | Auteur / plateforme | URL source | Licence | Récupéré le |
|---|---|---|---|---|---|
| `assets/originaux/vca-base/article-cout-financement.webp` | `assets/images/vca-base/article-cout-financement-{640,1024}.webp`, `assets/images/partage/article-cout-financement-1200x630.jpg` | Fourni par le client (Wisy Safety) — fichier « articles vcabase 1 » | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-26 |
| `assets/originaux/vca-base/article-erreurs-examen.webp` | `assets/images/vca-base/article-erreurs-examen-{640,1024}.webp`, `assets/images/partage/article-erreurs-examen-1200x630.jpg` | Fourni par le client (Wisy Safety) — fichier « articles vcabase 2 » | Non communiquée — **à confirmer par Wisy Safety** | Non confirmée | 2026-09-26 |
| `assets/images/formations/vca-base.webp` (photo principale de la page, déjà présente sur le site) | `assets/images/vca-base/vca-base-thumb-192.webp`, `assets/images/partage/formation-vca-base-1200x630.jpg` | Déjà utilisée par la carte du catalogue | Non communiquée | Non confirmée | — |

## ⚠️ À vérifier avant mise en ligne

Comme pour les photos PEB : l'**origine** et la **licence d'usage commercial** de ces images n'ont pas pu être
vérifiées (aucune métadonnée de provenance). Avant publication, confirmer qu'elles appartiennent à Wisy Safety ou
qu'elles sont libres de droits pour un usage commercial ; sinon les remplacer par des images sourcées explicitement
(même gabarit, voir `scripts/optimize-images.py`, fonction `vca()`).

Les textes alternatifs décrivent uniquement ce qui est visible (aucune personne identifiée, aucun lieu présenté
comme « notre centre » ni comme « nos formateurs »). Les images de partage (1200 × 630) sont fabriquées à partir de ces
photos par `scripts/optimize-images.py` (fond flouté + photo, sans texte incrusté).
