# Comment ajouter des vidéos au site Wisy Safety

## 1. Où déposer les vidéos

```
Wisy Safety 2026/
└── assets/
    └── videos/
        ├── hero/          → vidéo de fond / bannière d'accueil
        └── formations/    → vidéos de présentation des formations
```

Mêmes règles de nommage que les images : **minuscules, pas d'espaces (tirets `-`), pas d'accents**.
Exemple : `presentation-vca.mp4` (pas `Présentation VCA.mp4`).

---

## 2. DEUX méthodes — choisissez selon le cas

### Méthode A — Vidéo hébergée sur YouTube / Vimeo  ✅ RECOMMANDÉ

Pour toute vidéo « à regarder » (présentation, témoignage, reportage).
Avantages : **ne pèse rien sur votre site**, qualité qui s'adapte, lecture fluide partout.

```html
<div style="position:relative;padding-top:56.25%;border-radius:16px;overflow:hidden">
  <iframe src="https://www.youtube.com/embed/VOTRE_ID_VIDEO"
          title="Présentation Wisy Safety"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen loading="lazy"></iframe>
</div>
```
> `VOTRE_ID_VIDEO` = la partie après `watch?v=` dans l'URL YouTube.
> Le `padding-top:56.25%` garde le format 16:9 responsive.

### Méthode B — Vidéo hébergée sur votre site (fichier `.mp4`)

Pour un **court** clip d'ambiance en fond (quelques secondes, en boucle, SANS son).

```html
<video
    src="assets/videos/hero/ambiance-chantier.mp4"
    poster="assets/images/hero/ambiance-poster.jpg"
    autoplay muted loop playsinline
    style="width:100%;height:100%;object-fit:cover">
</video>
```
- `poster` = image affichée avant le chargement (à mettre dans `assets/images/`).
- `muted` + `autoplay` : **obligatoire ensemble** — les navigateurs bloquent l'autoplay avec son.
- `playsinline` : évite le plein écran forcé sur iPhone.

Pour une vidéo à contrôler (play/pause), enlevez `autoplay muted loop` et ajoutez `controls` :
```html
<video src="assets/videos/formations/presentation-vca.mp4"
       poster="assets/images/formations/vca-poster.jpg"
       controls style="width:100%;border-radius:16px"></video>
```

---

## 3. Règles importantes (vidéo = lourd)

- **Jamais d'autoplay AVEC son** (règle de votre charte + bloqué par les navigateurs). Une vidéo de fond est toujours `muted`.
- **Format** : `.mp4` (codec H.264) — lu partout. `.webm` en option pour alléger.
- **Poids** : compressez ! Une vidéo de fond doit rester légère (idéalement < 5 Mo).
  Outil gratuit : **HandBrake** (https://handbrake.fr).
- **Durée** : une vidéo de fond = 8 à 15 s en boucle, pas plus.
- **Toujours un `poster`** (image d'attente) pour éviter un écran noir au chargement.
- **Ne jamais** intégrer une vidéo « en dur » dans le HTML (base64) : le fichier deviendrait énorme.

## 4. Quelle méthode choisir ?

| Besoin                                   | Méthode          |
|------------------------------------------|------------------|
| Présentation, témoignage, tuto à regarder| A — YouTube/Vimeo |
| Court fond animé, muet, en boucle        | B — fichier .mp4  |
| Vidéo longue / lourde                    | A — YouTube/Vimeo |
