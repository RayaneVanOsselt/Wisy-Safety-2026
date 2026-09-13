# Comment ajouter des images au site Wisy Safety

## 1. Où déposer les images

```
Wisy Safety 2026/
├── index.html
└── assets/
    ├── images/
    │   ├── logo/          → le logo, les variantes du logo
    │   ├── hero/          → grande image d'accueil (bannière)
    │   ├── formations/    → une image par formation (VCA, nacelle…)
    │   ├── equipe/        → photos des formateurs / de l'équipe
    │   └── partenaires/   → logos des entreprises partenaires
    └── icons/             → petites icônes (svg)
```

Déposez chaque image dans le dossier qui correspond à son usage.

## 2. Comment nommer les fichiers (RÈGLE IMPORTANTE)

- **Tout en minuscules**
- **Pas d'espaces** → utilisez des tirets `-`
- **Pas d'accents ni de caractères spéciaux** (é, è, à, ç, ', …)

| À éviter                   | Correct                       |
|----------------------------|-------------------------------|
| `VCA de Base.png`          | `vca-de-base.jpg`             |
| `Photo Équipe.JPG`         | `equipe-formateurs.jpg`       |
| `Logo Wisy Safety.png`     | `logo.png`                    |

> Les espaces et accents cassent souvent l'affichage une fois le site en ligne.

## 3. Comment insérer une image dans le code (index.html)

Le chemin part TOUJOURS de `index.html` :

```html
<!-- Image d'une formation -->
<img src="assets/images/formations/vca-de-base.jpg"
     alt="Formation VCA de base en salle">

<!-- Photo d'un formateur -->
<img src="assets/images/equipe/jean-dupont.jpg"
     alt="Jean Dupont, formateur sécurité">
```

- `src` = le chemin vers le fichier
- `alt` = description courte (obligatoire : accessibilité + référencement Google)

## 4. Bonnes pratiques

- **Format** : `.jpg` pour les photos, `.png` pour le fond transparent, `.svg` pour les icônes/logos, `.webp` pour alléger (le plus léger).
- **Poids** : compressez avant de mettre en ligne (viser < 300 Ko par photo). Outil gratuit : https://squoosh.app
- **Taille** : une bannière ~1920 px de large suffit ; inutile d'un 6000 px.
- **Toujours remplir `alt`** avec une vraie description.

## 5. Astuce d'affichage en local

Si une image ne s'affiche pas après double-clic sur `index.html`, c'est presque toujours :
1. une **faute dans le nom** (accent, espace, majuscule) — le chemin doit être IDENTIQUE au fichier ;
2. l'image **pas dans le bon dossier**.

Une fois le site **hébergé en ligne**, les chemins relatifs (`assets/images/...`) fonctionnent parfaitement.
