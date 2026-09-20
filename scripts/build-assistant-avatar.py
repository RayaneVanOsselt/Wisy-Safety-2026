#!/usr/bin/env python3
"""Régénère les dérivés web de la mascotte de l'Assistant Wisy.

    python3 scripts/build-assistant-avatar.py <image-robot.png> [dossier-de-sortie]

Entrée  : l'image d'origine du robot (525 × 350, fond studio gris).
Sortie  : assets/images/assistant/wisy-assistant-{144,216}.{webp,avif}
          (carré transparent : tête détourée + ombre de contact très douce).
Besoin  : Python 3 + Pillow ≥ 11.3 (WebP et AVIF). Aucune autre dépendance.

Méthode (aucun outil de détourage IA) :
  1. contour GROSSIER de la tête tracé à la main (HEAD, coordonnées de l'image d'origine) ;
  2. « accroche » de ce contour sur le vrai bord : programmation dynamique le long des normales
     (force du bord − variation de l'extérieur − distance au tracé), contour lissé ;
  3. masque anti-aliasé (sur-échantillonnage ×4), rétréci de 0,7 px pour écarter la frange du fond ;
  4. fenêtre carrée de 280 px centrée sur la tête, ombre de contact (jais, 15 %, flou 3,4 px, +4 px) ;
  5. réduction 144 / 216 px, léger renforcement de netteté, export WebP + AVIF.
Pour changer le cadrage : modifier CENTER / WINDOW ci-dessous et relancer.
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

CENTER = (255, 94)          # centre de la fenêtre, dans l'image d'origine
WINDOW = 280                # côté de la fenêtre carrée (px de l'image d'origine)
SIZES = (144, 216)          # 2× et 3× d'un affichage à 72 px
SS = 4                      # sur-échantillonnage du masque

# Contour grossier de la tête (sens horaire), px de l'image d'origine.
HEAD = [(149, 90), (150, 67), (157, 53), (165, 43), (178, 33), (190, 27), (200, 22), (213, 15), (227, 10), (240, 7),
        (253, 4), (267, 3), (280, 3), (293, 6), (307, 12), (320, 18), (333, 25), (337, 35), (347, 32), (357, 35),
        (367, 43), (372, 57), (374, 73), (373, 90), (374, 107), (367, 112), (353, 113), (348, 116), (348, 123),
        (346, 133), (340, 143), (327, 152), (313, 157), (300, 163), (287, 173), (273, 180), (257, 185), (240, 184),
        (224, 184), (212, 183), (202, 181), (192, 178), (182, 175), (174, 171), (163, 164), (154, 157), (147, 150),
        (141, 142), (137, 120), (142, 100), (148, 98)]


def chaikin(pts, it=3):
    for _ in range(it):
        out = []
        for i, p in enumerate(pts):
            q = pts[(i + 1) % len(pts)]
            out += [(0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]), (0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1])]
        pts = out
    return pts


def resample(pts, step=1.2):
    n = len(pts)
    seg = [math.dist(pts[i], pts[(i + 1) % n]) for i in range(n)]
    total, m = sum(seg), max(8, int(sum(seg) / step))
    out, acc, i = [], 0.0, 0
    for k in range(m):
        target = total * k / m
        while acc + seg[i] < target:
            acc += seg[i]
            i = (i + 1) % n
        t = (target - acc) / seg[i] if seg[i] else 0
        p, q = pts[i], pts[(i + 1) % n]
        out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def normals(pts):
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n)) / 2
    out = []
    for i in range(n):
        a, b = pts[(i - 2) % n], pts[(i + 2) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        d = math.hypot(tx, ty) or 1
        tx, ty = tx / d, ty / d
        out.append((ty, -tx) if area > 0 else (-ty, tx))     # normale sortante
    return out


class Lum:
    """Luminance floutée échantillonnable en bilinéaire."""

    def __init__(self, img):
        g = img.convert("L").filter(ImageFilter.GaussianBlur(0.9))
        self.w, self.h, self.d = g.size[0], g.size[1], list(g.getdata())

    def at(self, x, y):
        x = min(max(x, 0.0), self.w - 1.001)
        y = min(max(y, 0.0), self.h - 1.001)
        x0, y0 = int(x), int(y)
        fx, fy, w = x - x0, y - y0, self.w
        a, b = self.d[y0 * w + x0], self.d[y0 * w + x0 + 1]
        c, d = self.d[(y0 + 1) * w + x0], self.d[(y0 + 1) * w + x0 + 1]
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def snap(rough, img, reach=6.0, dstep=0.5, lam=0.6, mu=0.9, out_len=5.0):
    """Accroche le contour grossier sur le vrai bord (DP cyclique le long des normales)."""
    lum = Lum(img)
    pts = resample(chaikin(rough, 3), 1.2)
    nrm = normals(pts)
    offs = [k * dstep for k in range(-int(reach / dstep), int(reach / dstep) + 1)]
    n, m = len(pts), len(offs)

    def prof(i, d):
        return lum.at(pts[i][0] + nrm[i][0] * d, pts[i][1] + nrm[i][1] * d)

    score = [[0.0] * m for _ in range(n)]
    for i in range(n):
        for j, d in enumerate(offs):
            edge = abs((prof(i, d + 1.5) - prof(i, d - 1.5)) / 3.0)
            v, t, prev, cnt = 0.0, d + 2.0, prof(i, d + 2.0), 0
            while t < d + 2.0 + out_len:              # l'extérieur doit être lisse (fond de studio)
                t += 1.0
                cur = prof(i, t)
                v += abs(cur - prev)
                prev, cnt = cur, cnt + 1
            score[i][j] = edge - lam * v / max(1, cnt) - mu * abs(d) / reach

    def dp(start=None):
        best = [[-1e18] * m for _ in range(n)]
        back = [[0] * m for _ in range(n)]
        for j in range(m):
            if start is None or j == start:
                best[0][j] = score[0][j]
        for i in range(1, n):
            for j in range(m):
                bj, bv = j, best[i - 1][j]
                if j > 0 and best[i - 1][j - 1] > bv:
                    bj, bv = j - 1, best[i - 1][j - 1]
                if j < m - 1 and best[i - 1][j + 1] > bv:
                    bj, bv = j + 1, best[i - 1][j + 1]
                best[i][j], back[i][j] = bv + score[i][j], bj
        return best, back

    def trace(best, back, jend):
        path = [0] * n
        path[-1] = jend
        for i in range(n - 1, 0, -1):
            path[i - 1] = back[i][path[i]]
        return path

    best, back = dp()
    path = trace(best, back, max(range(m), key=lambda j: best[-1][j]))
    best, back = dp(start=path[0])                    # 2e passe : on referme la boucle
    path = trace(best, back, max((j for j in range(m) if abs(j - path[0]) <= 1), key=lambda j: best[-1][j]))
    d = [offs[j] for j in path]
    for _ in range(2):                                # lissage circulaire des offsets
        d = [sum(d[(i + k) % n] for k in range(-4, 5)) / 9.0 for i in range(n)]
    return [(pts[i][0] + nrm[i][0] * d[i], pts[i][1] + nrm[i][1] * d[i]) for i in range(n)]


def head_mask(size, contour, shrink=0.7, feather=0.85):
    w, h = size
    big = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(big).polygon([(x * SS, y * SS) for x, y in contour], fill=255)
    big = big.filter(ImageFilter.MinFilter(2 * max(1, round(shrink * SS)) + 1))
    return big.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(feather))


def window(img, mode, fill):
    canvas = Image.new(mode, (WINDOW, WINDOW), fill)
    canvas.paste(img, (-(CENTER[0] - WINDOW // 2), -(CENTER[1] - WINDOW // 2)))
    return canvas


def main(src, out_dir):
    img = Image.open(src).convert("RGB")
    alpha = window(head_mask(img.size, snap(HEAD, img)), "L", 0)
    rgb = window(img, "RGB", (0, 0, 0))

    shadow_a = ImageChops.offset(alpha.filter(ImageFilter.GaussianBlur(3.4)), 0, 4).point(lambda v: int(v * 0.15))
    shadow = Image.new("RGBA", (WINDOW, WINDOW), (27, 45, 40, 0))    # jais #1B2D28
    shadow.putalpha(shadow_a)
    head = rgb.convert("RGBA")
    head.putalpha(alpha)
    comp = shadow.copy()
    comp.alpha_composite(head)

    os.makedirs(out_dir, exist_ok=True)
    for px in SIZES:
        im = comp.resize((px, px), Image.LANCZOS)
        r, g, b, a = im.split()
        sharp = Image.merge("RGB", (r, g, b)).filter(ImageFilter.UnsharpMask(radius=0.7, percent=60, threshold=2))
        im = Image.merge("RGBA", (*sharp.split(), a))
        for ext, opts in (("webp", dict(quality=86, method=6, alpha_quality=92)), ("avif", dict(quality=68, speed=2))):
            path = os.path.join(out_dir, "wisy-assistant-%d.%s" % (px, ext))
            im.save(path, ext.upper(), **opts)
            print("%s  %d o" % (path, os.path.getsize(path)))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    default_out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "images", "assistant")
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else default_out)
