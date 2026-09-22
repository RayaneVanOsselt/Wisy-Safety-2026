# Images et médias : où ranger quoi

Tout ce qui est dans `assets/` est utilisé par le site, **sauf `originaux/`** : ce dossier contient les
photos et logos d'origine (haute qualité). Les pages ne le chargent jamais ; il sert à fabriquer les
versions légères que le site affiche.

```
assets/
├── fonts/            Polices du site (Poppins, Inter) — ne pas toucher
├── icons/            Icône de l'onglet du navigateur et icône « écran d'accueil » du téléphone
├── images/
│   ├── assistant/    Mascotte de l'assistant virtuel
│   ├── beps/         Photo + illustrations d'accent de la page Formation BEPS
│   ├── contact/      Photo de la page Contact
│   ├── faq/          Décor du Centre d'aide
│   ├── formations/   Photos des 6 formations (catalogue + inscription)
│   ├── logo/         Logo Wisy Safety (voir ci-dessous)
│   ├── nacelles/     Photos de la page Formation Nacelles
│   ├── partage/      Images affichées quand on partage un lien (Facebook, LinkedIn, WhatsApp…)
│   └── partenaires/  Logos des partenaires (bandeau de l'accueil)
├── videos/
│   └── accueil/      Vidéo de l'accueil (3 versions) + image affichée pendant le chargement
└── originaux/        Photos et logos d'ORIGINE — jamais chargés par les pages
```

**Logos :** `logo.png` est le logo principal ; `logo-carre-500.png` est la version carrée à utiliser pour un
profil de réseau social ou la fiche Google ; `logo-102.webp` et `logo-204.webp` sont les versions légères
affichées par le site (ne pas les modifier à la main).

## Règles de nommage

- **Minuscules, sans accents, sans espaces**, mots séparés par des tirets : `nacelle-ciseaux.jpg`
  (et non `Nacelle cisaaux .jpg` ou `Photo 1 (copie).png`).
- Un nom qui dit ce que montre l'image ; pour une version dimensionnée, la largeur en suffixe :
  `logo-204.webp`, `nacelle-araignee-960.webp`.
- Formats : WebP pour ce que le site affiche ; JPEG ou PNG pour les originaux.

## Ajouter ou remplacer une photo

1. Déposez l'**original** (bien nommé) dans `originaux/` (dans le dossier du même thème).
2. Générez la version légère : `python3 scripts/optimize-images.py` (ou demandez-le-moi).
3. Contrôlez le rendu dans la page, puis lancez les tests : `node --test tests/*.test.js`.

Les tests vérifient les noms, l'absence de doublons et qu'aucune page ne référence une image manquante ;
s'ils échouent, ils indiquent le fichier en cause.

## Qui utilise quoi

| Dossier | Utilisé par |
|---|---|
| `images/formations/` | cartes de `formations.html` et étape 1 de `inscription.html` |
| `images/nacelles/` | `formation-nacelles-elevatrices.html` (et l'aperçu dans la recherche) |
| `images/beps/` | `formation-beps-premiers-secours.html` (et l'aperçu dans la recherche) |
| `images/partenaires/` | bandeau des partenaires de `index.html` |
| `images/contact/` | `contact.html` |
| `images/partage/` | aperçu des liens partagés (balises générées par `scripts/build-seo.js`) |
| `images/logo/`, `icons/` | en-tête, pied de page, onglet du navigateur, données envoyées à Google |
| `videos/accueil/` | fond de l'accueil (`index.html`) |
