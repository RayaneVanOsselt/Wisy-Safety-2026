#!/usr/bin/env python3
"""
WISY SAFETY — Génère les images optimisées du site à partir des ORIGINAUX (masters).

    python3 scripts/optimize-images.py            # génère tout ce qui manque ou a changé
    python3 scripts/optimize-images.py --force    # régénère tout

Pourquoi : les originaux pèsent jusqu'à 800 Ko (JPEG CMYK, PNG de 1 400 px pour un logo affiché à
65 px…). Le site charge désormais des WebP dimensionnés pour leur usage réel ; les originaux restent
dans assets/ comme sources (ils ne sont plus chargés par les pages).

Dépendances : Pillow (WebP). Aucune autre. Sortie déterministe (mêmes options à chaque exécution).

  logo            assets/logo.png                       → assets/images/logo/logo-102.webp · logo-204.webp
  icônes          assets/logo.png                       → assets/icons/* · favicon.ico
  formations      assets/images/*.jpg|webp (masters)    → assets/images/formations/<id>.webp
  partenaires     assets/images/partenaires/*           → assets/images/partenaires/<nom>-240.webp
  contact         assets/images/page-principale/…       → hero-contact.webp
  affiche vidéo   assets/videos/Accueil/poster.jpg      → poster.webp
  carte de partage (Open Graph) : `--og <dossier de polices Poppins .ttf>` → assets/images/og/…jpg
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

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
    src = "assets/logo.png"
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
    "vca-base":           ("assets/images/vca de base.webp", 720),
    "vca-hierarchique":   ("assets/images/vca ligne hier..jpg", 1000),
    "diisocyanates":      ("assets/images/Diisocyanates et substances dangereuses.jpg", 500),
    "nacelle-elevatrice": ("assets/images/Nacelle élévatrice.jpg", 640),
    "fibre-optique":      ("assets/images/fibre optique .jpg", 1000),
    "beps":               ("assets/images/beps.jpg", 1024),
}


def formations():
    for fid, (src, max_w) in FORMATIONS.items():
        dst = f"assets/images/formations/{fid}.webp"
        if not need(dst, src):
            continue
        if src.endswith(".webp"):                                  # déjà optimisé : on le reprend tel quel
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(src, "rb") as a, open(dst, "wb") as b:
                b.write(a.read())
            report(fid + " (copie)", src, os.path.getsize(dst), "inchangé")
            continue
        im = fit_width(to_rgb(Image.open(src)), max_w)
        size = save_webp(im, dst, quality=78)
        report(fid, src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- partenaires (affichés ≤ 75 px)
PARTNERS = {
    "orange": "Orange_logo.svg.png", "proximus": "proximus-.webp", "telenet": "telenet_logo.webp",
    "constructel": "constructel-.jpeg", "voo": "VOO_logo.svg.png", "unifiber": "uni-fivber-.png",
}


def partners():
    for name, f in PARTNERS.items():
        src = f"assets/images/partenaires/{f}"
        dst = f"assets/images/partenaires/{name}-240.webp"
        if not need(dst, src):
            continue
        im = fit_width(to_rgb(Image.open(src)), 240)
        size = save_webp(im, dst, quality=80, alpha_quality=90)
        report(f"partenaire {name}", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- contact + affiche vidéo
def misc():
    src, dst = "assets/images/page-principale/hero-contact.png", "assets/images/page-principale/hero-contact.webp"
    if need(dst, src):
        im = Image.open(src).convert("RGBA")
        size = save_webp(im, dst, quality=82, alpha_quality=100)
        report("hero contact", src, size, f"{im.width}×{im.height}")
    src, dst = "assets/videos/Accueil/poster.jpg", "assets/videos/Accueil/poster.webp"
    if need(dst, src):
        im = Image.open(src).convert("RGB")
        size = save_webp(im, dst, quality=66)
        report("affiche vidéo", src, size, f"{im.width}×{im.height}")


# --------------------------------------------------------------------------- carte de partage 1200×630
def og(font_dir):
    """Carte Open Graph de marque (charte : crème, épinette, jais). Texte = celui du site (aucune promesse)."""
    W, H = 1200, 630
    dst = "assets/images/og/wisy-safety-og-1200x630.jpg"
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
    logo_im = Image.open("assets/logo.png").convert("RGBA")
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
    partners()
    misc()
    if "--og" in sys.argv:
        og(sys.argv[sys.argv.index("--og") + 1])
    print("Terminé.")
