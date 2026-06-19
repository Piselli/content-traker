#!/usr/bin/env python3
"""Build overlapping WC respect-list collage (no text)."""

from __future__ import annotations

import html
import io
import os
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "collage-assets"
OUT = ROOT / "public" / "wc-respect-collage-overlap.jpg"

W, H = 1600, 900
BG = (10, 10, 12)

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

SOURCES = {
    "japan_fans": "https://im.rediff.com/1600-900/sports/2026/jun/15japan1.jpg",
    "japan_locker": "https://s.yimg.com/ny/api/res/1.2/wx6dMuSsJPZmu.UuZ9y5AQ--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD02NzU7Y2Y9d2VicA--/https://media.zenfs.com/en/kdfw_fox_local_articles_173/4c180025347da2c557428cee04535cf7",
    "vozinha": "https://ichef.bbci.co.uk/ace/branded_sport/1200/cpsprodpb/d369/live/1ec836f0-68f5-11f1-8546-8f19e4fe30f4.jpg",
    "messi": "https://img.asmedia.epimg.net/resizer/v2/NP6G42PJ6BMMXPI4M2VFTXPA4M.jpg?auth=afcc6ec359165c9cc2c3aacdd67742ddeb46dda70fb64f226d83a83ecded9686&width=1472&height=828&smart=true",
    "korea": "https://fortworthreport.org/wp-content/uploads/2026/06/APTOPIX_Czechia_South_Korea_WCup_Soccer_26163128005873-scaled.jpg",
    "curacao": "https://media-cldnry.s-nbcnews.com/image/upload/t_nbcnews-fp-1200-630,f_auto,q_auto:best/rockcms/2026-06/260614-world-cup-curacao-Livano-Comenencia-vl-356p-62fafa.jpg",
    "mex_kor_fan": "https://cdnimage.dailian.co.kr/news/202606/news_1781684229_1657033_m_1.jpg",
}

# x, y, width, height, angle — back to front
LAYERS: list[tuple[str, int, int, int, int, float]] = [
    ("korea", -40, 380, 620, 400, -3.0),
    ("vozinha", 480, 430, 480, 340, 6.0),
    ("japan_locker", 20, 20, 420, 280, -8.0),
    ("japan_fans", 250, 170, 400, 260, 5.0),
    ("curacao", 400, 500, 460, 320, -5.0),
    ("messi", 720, 30, 520, 340, -4.0),
    ("mex_kor_fan", 900, 250, 420, 520, 8.0),
]


def fetch(name: str, url: str) -> Image.Image:
    path = ASSETS / f"{name}.jpg"
    url = html.unescape(url)
    if not path.exists():
        req = urllib.request.Request(url, headers=HEADERS)
        data = urllib.request.urlopen(req, timeout=30).read()
        path.write_bytes(data)
    return Image.open(path).convert("RGB")


def fit(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)


def rotate_rgba(img: Image.Image, angle: float) -> Image.Image:
    return img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def with_shadow(img: Image.Image, offset: tuple[int, int] = (8, 10), blur: int = 12, alpha: int = 120) -> Image.Image:
    rgba = img.convert("RGBA")
    pad = blur + max(offset)
    w, h = rgba.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", rgba.size, (0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow, (pad + offset[0], pad + offset[1]))
    canvas.alpha_composite(rgba, (pad, pad))
    return canvas


def paste_rgba(base: Image.Image, layer: Image.Image, xy: tuple[int, int]) -> None:
    base.paste(layer, xy, layer)


def place(base: Image.Image, img: Image.Image, x: int, y: int, w: int, h: int, angle: float) -> None:
    sized = fit(img, (w, h))
    layer = with_shadow(sized)
    layer = rotate_rgba(layer, angle)
    paste_rgba(base, layer, (x, y))


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    imgs = {k: fetch(k, v) for k, v in SOURCES.items()}

    base = Image.new("RGBA", (W, H), BG + (255,))

    backdrop = fit(imgs["korea"], (W + 100, H))
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(3))
    backdrop.putalpha(45)
    paste_rgba(base, backdrop, (-50, 0))

    for name, x, y, w, h, angle in LAYERS:
        place(base, imgs[name], x, y, w, h, angle)

    final = base.convert("RGB")
    final.save(OUT, "JPEG", quality=93, optimize=True)
    print(f"Saved {OUT} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
