#!/usr/bin/env python3
"""Vertical football math bait — dark livescore UI + Punisher wait meme."""

from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageSequence, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "football-math-bait-collage.png"
MEME_GIF = ROOT / "public" / "collage-assets" / "punisher-wait-wait.gif"
MEME_URL = "https://media.tenor.com/Ntxkcyv6TS0AAAAC/the-punisher-wait-wait-wait-no-no-no.gif"
FONTS = Path("/System/Library/Fonts/Supplemental")

WIDTH = 880
CARD_H = 132
GAP = 6
MEME_H = 420
BG = (0, 0, 0)
PANEL = (14, 16, 20)
BORDER = (34, 40, 48)
MUTED = (108, 116, 126)
WHITE = (245, 247, 250)
GREEN = (46, 174, 96)
AMBER = (232, 178, 58)

MATCHES: list[dict[str, str]] = [
    {
        "home": "Sweden",
        "away": "Tunisia",
        "home_score": "5",
        "away_score": "1",
        "status": "FT",
        "meta": "Friendly",
    },
    {
        "home": "Netherlands",
        "away": "Sweden",
        "home_score": "5",
        "away_score": "1",
        "status": "FT",
        "meta": "Friendly",
    },
    {
        "home": "Tunisia",
        "away": "Netherlands",
        "home_score": "?",
        "away_score": "?",
        "status": "???",
        "meta": "Upcoming",
    },
]


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def fetch_meme() -> Image.Image:
    MEME_GIF.parent.mkdir(parents=True, exist_ok=True)
    if not MEME_GIF.exists():
        req = urllib.request.Request(
            MEME_URL,
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
        )
        MEME_GIF.write_bytes(urllib.request.urlopen(req, timeout=30).read())

    gif = Image.open(MEME_GIF)
    frames = [frame.convert("RGB") for frame in ImageSequence.Iterator(gif)]
    # Pick a mid-sequence frame with the panicked close-up.
    frame = frames[min(8, len(frames) - 1)]
    return ImageOps.fit(frame, (WIDTH, MEME_H), method=Image.Resampling.LANCZOS)


def draw_match_card(
    draw: ImageDraw.ImageDraw,
    y: int,
    match: dict[str, str],
    *,
    upcoming: bool,
) -> None:
    x0, x1 = 0, WIDTH
    draw.rectangle((x0, y, x1, y + CARD_H), fill=PANEL)
    draw.line((x0, y + CARD_H - 1, x1, y + CARD_H - 1), fill=BORDER, width=1)

    font_meta = load_font("Arial.ttf", 13)
    font_team = load_font("Arial Bold.ttf", 26)
    font_score = load_font("Arial Bold.ttf", 28)
    font_status = load_font("Arial Bold.ttf", 14)

    meta = match["meta"]
    draw.text((36, y + 14), meta, font=font_meta, fill=MUTED)

    status = match["status"]
    status_color = AMBER if upcoming else MUTED
    status_w = draw.textlength(status, font=font_status)
    draw.text((WIDTH - 24 - status_w, y + 13), status, font=font_status, fill=status_color)

    if upcoming:
        draw.rectangle((0, y, 4, y + CARD_H), fill=AMBER)

    home = match["home"]
    away = match["away"]
    hs = match["home_score"]
    as_ = match["away_score"]
    score_color = AMBER if upcoming else WHITE

    draw.text((36, y + 52), home, font=font_team, fill=WHITE)
    draw.text((36, y + 86), away, font=font_team, fill=WHITE)

    hs_w = draw.textlength(hs, font=font_score)
    as_w = draw.textlength(as_, font=font_score)
    draw.text((WIDTH - 36 - hs_w, y + 52), hs, font=font_score, fill=score_color)
    draw.text((WIDTH - 36 - as_w, y + 86), as_, font=font_score, fill=score_color)

    dot_color = AMBER if upcoming else GREEN
    draw.ellipse((20, y + 17, 27, y + 24), fill=dot_color)


def build() -> Image.Image:
    meme = fetch_meme()
    total_h = CARD_H * 3 + GAP * 3 + MEME_H
    canvas = Image.new("RGB", (WIDTH, total_h), BG)
    draw = ImageDraw.Draw(canvas)

    y = 0
    for i, match in enumerate(MATCHES):
        draw_match_card(draw, y, match, upcoming=(i == 2))
        y += CARD_H + GAP

    canvas.paste(meme, (0, y))
    return canvas


def main() -> None:
    img = build()
    img.save(OUT, "PNG", optimize=True)
    print(f"Saved {OUT} ({img.size[0]}×{img.size[1]})")


if __name__ == "__main__":
    main()
