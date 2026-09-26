#!/usr/bin/env python3
"""
WISY SAFETY — Génère les images optimisées du site à partir des ORIGINAUX.

    python3 scripts/optimize-images.py            # génère tout ce qui manque ou a changé
    python3 scripts/optimize-images.py --force    # régénère tout

Pourquoi : les originaux pèsent jusqu'à 800 Ko (JPEG CMYK, PNG de 1 400 px pour un logo affiché à
65 px…). Le site charge des WebP dimensionnés pour leur usage réel ; les originaux sont rangés dans
assets/originaux/ (les pages ne les chargent jamais). Pour changer une photo : remplacez son
original dans assets/originaux/, relancez ce script, vérifiez le rendu.

Dépendances : Pillow (WebP). Aucune autre. Sortie déterministe (mêmes options à chaque exécution).

  logo            assets/images/logo/logo.png             → assets/images/logo/logo-102.webp · logo-204.webp
  icônes          assets/images/logo/logo.png             → assets/icons/* · favicon.ico
  formations      assets/originaux/formations/<id>.jpg    → assets/images/formations/<id>.webp
                  (vca-base : n'a pas d'original à part — le WebP servi EST l'original)
  illustrations BEPS  assets/originaux/beps/<nom>.jpg      → assets/images/beps/<nom>-240.webp (recadrage carré centré)
  partenaires     assets/originaux/partenaires/<nom>.*    → assets/images/partenaires/<nom>-240.webp
  contact         assets/originaux/contact/hero-contact.png → assets/images/contact/hero-contact.webp
  affiche vidéo   assets/originaux/accueil/poster.jpg     → assets/videos/accueil/poster.webp
  logo animé      assets/originaux/accueil/logo-animation-debut.jpg · logo-animation-fin.jpg
                  → assets/videos/accueil/logo-animation-debut.webp · logo-animation-fin.webp (affiches de l'accueil)
                  (la vidéo assets/originaux/accueil/logo-animation.mp4 et ses deux images sont traitées HORS Pillow :
                   recadrage 4:5, ré-encodage web, extraction des images — commandes dans docs/README-ACCUEIL.md)
  VCA Base        assets/originaux/vca-base/article-*.webp → assets/images/vca-base/article-*-640.webp · -1024.webp
                  (+ miniature de recherche + 3 cartes de partage 1200×630 : page VCA Base et ses 2 articles)
  carte de partage (Open Graph) : `--og <dossier de polices Poppins .ttf>` → assets/images/partage/wisy-safety-1200x630.jpg
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
FORCE = "--force" in sys.argv

PALETTE = {"epinette": "#1F6F64", "sarcelle": "#2F7D8C", "creme": "#F4FAF9", "granit": "#5E6D6A", "jais": "#1B2D28"}


def save_webp(im, dst, quality=80, **kw):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "WEBP", quality=quality, method=6, **kw)
    return os.path.getsize(dst)


def fit_width(im, max_w):
    if im.width <= max_w:
        return im
    return im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)


def to_rgb(im):
    """CMYK/palette → sRGB (fond blanc pour les images à transparence sans alpha)."""
    if im.mode == "P":
        im = im.convert("RGBA")
    if im.mode in ("RGBA", "LA"):
        return im
    return im.convert("RGB")


def report(label, src, dst_size, dsts):
    before = os.path.getsize(src) if src and os.path.exists(src) else 0
    print(f"  {label:34s} {before/1024:7.1f} Ko → {dst_size/1024:6.1f} Ko   {dsts}")


def need(dst, src):
    return FORCE or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


# --------------------------------------------------------------------------- logo + icônes
def logo():
    src = "assets/images/logo/logo.png"
    im = Image.open(src).convert("RGBA")
    for w in (102, 204):                                         # 51 px @2x · pied de page 102 px @2x
        dst = f"assets/images/logo/logo-{w}.webp"
        if need(dst, src):
            h = round(im.height * w / im.width)
            size = save_webp(im.resize((w, h), Image.LANCZOS), dst, quality=92, alpha_quality=100)
            report(f"logo {w}px", src, size, dst)
    # Icônes : le logo (non carré) centré dans un carré transparent ; « apple-touch » sur fond crème.
    def square(size, bg=None, pad=0.06):
        canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
        inner = round(size * (1 - 2 * pad))
        k = inner / max(im.width, im.height)
        r = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        canvas.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
        return canvas
    os.makedirs("assets/icons", exist_ok=True)
    for name, size, bg in (("favicon-48.png", 48, None), ("favicon-192.png", 192, None), ("apple-touch-icon.png", 180, (244, 250, 249, 255))):
        dst = f"assets/icons/{name}"
        if need(dst, src):
            icon = square(size, bg)
            if size > 48:                                          # palette 8 bits + alpha : ~4× plus léger
                icon = icon.quantize(colors=96, method=Image.FASTOCTREE, dither=Image.NONE)
            icon.save(dst, "PNG", optimize=True)
            report(name, src, os.path.getsize(dst), dst)
    ico = "favicon.ico"
    if need(ico, src):
        square(64).save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        report(ico, src, os.path.getsize(ico), ico)


# --------------------------------------------------------------------------- formations
FORMATIONS = {
    # id : (master, largeur max)
    "vca-hierarchique":   ("assets/originaux/formations/vca-hierarchique.jpg", 1000),
    "diisocyanates":      ("assets/originaux/formations/diisocyanates.jpg", 500),
    "nacelle-elevatrice": ("assets/originaux/formations/nacelle-elevatrice.jpg", 640),
    "fibre-optique":      ("assets/originaux/formations/fibre-optique.jpg", 1000),
    "beps":               ("assets/originaux/formations/beps.jpg", 1024),
    # « vca-base » (720×540) n'a pas d'original séparé : assets/images/formations/vca-base.webp est déjà optimisé.
}


def formations():
    for fid, (src, max_w) in FORMATIONS.items():
        dst = f"assets/images/formations/{fid}.webp"
        if not need(dst, src):
            continue
        im = fit_width(to_rgb(Image.open(src)), max_w)
        size = save_webp(im, dst, quality=78)
        report(fid, src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- illustrations BEPS (accents ronds, affichés ≤ 96 px @2x)
def center_square(im):
    w, h = im.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    return im.crop((left, top, left + s, top + s))


BEPS_ILLUSTRATIONS = ["trousse-secours-illustration", "mascotte-premiers-secours", "journee-mondiale-premiers-secours", "geste-secouriste-illustration"]


def beps():
    for name in BEPS_ILLUSTRATIONS:
        src = f"assets/originaux/beps/{name}.jpg"
        dst = f"assets/images/beps/{name}-240.webp"
        if not os.path.exists(src) or not need(dst, src):
            continue
        im = center_square(to_rgb(Image.open(src))).resize((240, 240), Image.LANCZOS)
        size = save_webp(im, dst, quality=80)
        report(f"beps {name}", src, size, f"{im.width}×{im.height}")

    # Photo de formation réelle (même master que assets/images/formations/beps.webp) : dérivés
    # dédiés à la page BEPS — hero (pleine largeur du cadre) + miniature de résultat de recherche.
    src = "assets/originaux/formations/beps.jpg"
    if os.path.exists(src):
        dst = "assets/images/beps/beps-hero-1024.webp"
        if need(dst, src):
            im = fit_width(to_rgb(Image.open(src)), 1024)
            size = save_webp(im, dst, quality=82)
            report("beps hero", src, size, f"{im.width}×{im.height}")
        dst = "assets/images/beps/beps-thumb-192.webp"
        if need(dst, src):
            im = fit_width(to_rgb(Image.open(src)), 192)
            size = save_webp(im, dst, quality=78)
            report("beps thumb", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- page PEB (Wallonie & Bruxelles)
# Photos génériques fournies par Wisy Safety pour la page /peb-wallonie-bruxelles.html (voir
# docs/image-sources.md pour la provenance). Hero + deux visuels de section en pleine largeur,
# plus un accent carré (même traitement que les illustrations BEPS : recadrage centré 240×240).
PEB_SECTIONS = {
    "peb-residence-facade": ("assets/originaux/peb/peb-residence-facade.jpg", 1200),   # hero
    "peb-structure-chantier": ("assets/originaux/peb/peb-structure-chantier.jpg", 900),  # section "bâtiment & technique"
    "peb-cles-immeuble": ("assets/originaux/peb/peb-cles-immeuble.jpg", 900),         # section "agrément obtenu"
}


def peb():
    for name, (src, max_w) in PEB_SECTIONS.items():
        if not os.path.exists(src):
            continue
        dst = f"assets/images/peb/{name}-{max_w}.webp"
        if not need(dst, src):
            continue
        im = fit_width(to_rgb(Image.open(src)), max_w)
        size = save_webp(im, dst, quality=74)
        report(f"peb {name}", src, size, f"{im.width}×{im.height}")

    # Accent (badge rond, section éligibilité) : même traitement que les illustrations BEPS.
    src = "assets/originaux/peb/peb-verification-conformite.jpg"
    if os.path.exists(src):
        dst = "assets/images/peb/peb-verification-conformite-240.webp"
        if need(dst, src):
            im = center_square(to_rgb(Image.open(src))).resize((240, 240), Image.LANCZOS)
            size = save_webp(im, dst, quality=80)
            report("peb accent", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- partenaires (affichés ≤ 75 px)
PARTNERS = {
    "orange": "orange.png", "proximus": "proximus.webp", "telenet": "telenet.webp",
    "constructel": "constructel.jpeg", "voo": "voo.png", "unifiber": "unifiber.png",
}


def partners():
    for name, f in PARTNERS.items():
        src = f"assets/originaux/partenaires/{f}"
        dst = f"assets/images/partenaires/{name}-240.webp"
        if not need(dst, src):
            continue
        im = fit_width(to_rgb(Image.open(src)), 240)
        size = save_webp(im, dst, quality=80, alpha_quality=90)
        report(f"partenaire {name}", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- contact + affiche vidéo
def misc():
    src, dst = "assets/originaux/contact/hero-contact.png", "assets/images/contact/hero-contact.webp"
    if need(dst, src):
        im = Image.open(src).convert("RGBA")
        size = save_webp(im, dst, quality=82, alpha_quality=100)
        report("hero contact", src, size, f"{im.width}×{im.height}")
    src, dst = "assets/originaux/accueil/poster.jpg", "assets/videos/accueil/poster.webp"
    if need(dst, src):
        im = Image.open(src).convert("RGB")
        size = save_webp(im, dst, quality=66)
        report("affiche vidéo", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- accueil : affiches du logo animé
# Deux images de assets/originaux/accueil/logo-animation.mp4, déjà recadrées en 4:5 (720 × 900) :
#   « debut » = 1re image : affiche pendant le chargement de l'intro, élément LCP de l'accueil ;
#   « fin »   = image finale (logo complet) : mouvement réduit, économie de données, sans JavaScript.
LOGO_FRAMES = ("logo-animation-debut", "logo-animation-fin")


def accueil():
    for name in LOGO_FRAMES:
        src, dst = f"assets/originaux/accueil/{name}.jpg", f"assets/videos/accueil/{name}.webp"
        if need(dst, src):
            im = Image.open(src).convert("RGB")
            # qualité 90 : image très sombre, ~15–25 Ko ; en dessous, Chrome la jugerait « de faible entropie »
            # (< 0,05 bit/pixel affiché) et ne la retiendrait plus comme élément LCP.
            size = save_webp(im, dst, quality=90)
            report(f"affiche {name}", src, size, f"{im.width}×{im.height}")



# --------------------------------------------------------------------------- VCA Base : articles, miniature, cartes de partage
# Images des deux articles fournies par le propriétaire (voir docs/image-sources.md). Le WebP fourni est
# l'original : on en dérive une carte (640 px) et un visuel d'en-tête d'article (1024 px).
VCA_ARTICLES = {
    "article-cout-financement": "assets/originaux/vca-base/article-cout-financement.webp",
    "article-erreurs-examen":   "assets/originaux/vca-base/article-erreurs-examen.webp",
}
VCA_PHOTO = "assets/images/formations/vca-base.webp"          # photo VCA Base du site (720 × 540, pas d'original séparé)


def photo_card(src, dst, focus=(0.5, 0.45)):
    """Carte de partage 1200×630 : la photo entière au centre, prolongée à gauche et à droite par son propre
    flou assombri (même principe que la carte de la formation Nacelles). Aucun texte, aucune promesse."""
    W, H = 1200, 630
    if not FORCE and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return
    im = to_rgb(Image.open(src)).convert("RGB")
    bg = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=focus).filter(ImageFilter.GaussianBlur(30))
    bg = Image.blend(bg, Image.new("RGB", (W, H), PALETTE["jais"]), 0.42)
    fg = ImageOps.contain(im, (W, H), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bg.save(dst, "JPEG", quality=78, optimize=True, progressive=True)
    report("carte de partage " + os.path.basename(dst), src, os.path.getsize(dst), f"{W}×{H}")


def vca():
    for name, src in VCA_ARTICLES.items():
        if not os.path.exists(src):
            continue
        for w in (640, 1024):
            dst = f"assets/images/vca-base/{name}-{w}.webp"
            if need(dst, src):
                im = fit_width(to_rgb(Image.open(src)), w)
                size = save_webp(im, dst, quality=72)
                report(f"vca {name} {w}", src, size, f"{im.width}×{im.height}")
        photo_card(src, f"assets/images/partage/{name}-1200x630.jpg", focus=(0.5, 0.35))
    if os.path.exists(VCA_PHOTO):
        dst = "assets/images/vca-base/vca-base-thumb-192.webp"
        if need(dst, VCA_PHOTO):
            im = fit_width(to_rgb(Image.open(VCA_PHOTO)), 192)
            size = save_webp(im, dst, quality=78)
            report("vca thumb", VCA_PHOTO, size, f"{im.width}×{im.height}")
        photo_card(VCA_PHOTO, "assets/images/partage/formation-vca-base-1200x630.jpg")

# --------------------------------------------------------------------------- carte de partage 1200×630
def og(font_dir):
    """Carte Open Graph de marque (charte : crème, épinette, jais). Texte = celui du site (aucune promesse)."""
    W, H = 1200, 630
    dst = "assets/images/partage/wisy-safety-1200x630.jpg"
    if not FORCE and os.path.exists(dst):
        return
    bg = Image.new("RGB", (W, H), PALETTE["creme"])
    d = ImageDraw.Draw(bg)
    # bande épinette à gauche + forme organique très discrète à droite (aucun turquoise : couleur d'action)
    d.rectangle([0, 0, 22, H], fill=PALETTE["epinette"])
    blob = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blob)
    bd.ellipse([760, -160, 1400, 480], fill=(47, 125, 140, 34))      # sarcelle, très faible opacité
    bd.ellipse([900, 300, 1300, 700], fill=(31, 111, 100, 30))       # épinette, très faible opacité
    bg = Image.alpha_composite(bg.convert("RGBA"), blob).convert("RGB")
    d = ImageDraw.Draw(bg)
    logo_im = Image.open("assets/images/logo/logo.png").convert("RGBA")
    k = 190 / logo_im.height
    logo_im = logo_im.resize((round(logo_im.width * k), 190), Image.LANCZOS)
    bg.paste(logo_im, (96, 92), logo_im)
    def fitted(name, text, size, max_w):
        """Police Poppins réduite au besoin pour que `text` tienne dans `max_w` pixels."""
        while size > 24:
            f = ImageFont.truetype(os.path.join(font_dir, name), size)
            if f.getlength(text) <= max_w:
                return f
            size -= 2
        return ImageFont.truetype(os.path.join(font_dir, name), 24)
    max_w = W - 96 - 72
    d.text((96, 318), "Wisy Safety", font=fitted("Poppins-Bold.ttf", "Wisy Safety", 84, max_w), fill=PALETTE["jais"])
    tagline = "La sécurité comme une référence"
    d.text((96, 424), tagline, font=fitted("Poppins-SemiBold.ttf", tagline, 66, max_w), fill=PALETTE["epinette"])
    sub = "Formations sécurité · Anderlecht, Bruxelles"
    d.text((96, 528), sub, font=fitted("Poppins-Medium.ttf", sub, 34, max_w), fill=PALETTE["granit"])
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bg.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
    report("carte Open Graph", None, os.path.getsize(dst), f"{W}×{H}")


if __name__ == "__main__":
    print("Optimisation des images (Pillow", Image.__version__ + ")")
    logo()
    formations()
    beps()
    peb()
    partners()
    misc()
    accueil()
    vca()
    if "--og" in sys.argv:
        og(sys.argv[sys.argv.index("--og") + 1])
    print("Terminé.")
