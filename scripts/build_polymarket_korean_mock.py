#!/usr/bin/env python3
"""Build 1:1 Polymarket mock from Neymar reference screenshot."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REF = Path(
    "/Users/piselli/.cursor/projects/Users-piselli-Desktop-content-tracker/assets/image-4dee3df9-a004-421e-ad04-4c707e76e2c6.png"
)
FAN = ROOT / "public" / "collage-assets" / "mex_kor_fan.jpg"
FONTS = Path("/System/Library/Fonts/Supplemental")
OUT = ROOT / "public" / "polymarket-korean-mexican-market.png"

BG = (21, 24, 29)
PANEL = (24, 29, 33)
MUTED = (139, 148, 158)
WHITE = (240, 243, 246)
BLUE = (53, 133, 196)
GREEN = (72, 159, 114)
BTN_YES = (53, 154, 94)
BTN_NO = (139, 148, 158)

TITLE = "Will a Korean fan dressed as a Mexican appear on the stadium broadcast?"
CRUMB = "Sports · Mexico vs Korea"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def paste_avatar(base: Image.Image, fan: Image.Image, box: tuple[int, int, int, int], radius: int = 8) -> None:
    x, y, w, h = box
    fw, fh = fan.size
    crop = fan.crop((int(fw * 0.15), int(fh * 0.05), int(fw * 0.85), int(fh * 0.55)))
    thumb = ImageOps.fit(crop.convert("RGB"), (w, h), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    thumb.putalpha(mask)
    base.paste(thumb, (x, y), thumb)


def cover(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color=BG) -> None:
    draw.rectangle(box, fill=color)


def wrap(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill,
    max_width: int,
    gap: int = 3,
) -> int:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=font) <= max_width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    cy = y
    for ln in lines:
        draw.text((x, cy), ln, font=font, fill=fill)
        cy += font.size + gap
    return cy


def main() -> None:
    base = Image.open(REF).convert("RGB")
    fan = Image.open(FAN)
    draw = ImageDraw.Draw(base)

    font_title = load_font("Arial Bold.ttf", 20)
    font_crumb = load_font("Arial.ttf", 12)
    font_chance = load_font("Arial Bold.ttf", 26)
    font_delta = load_font("Arial Bold.ttf", 13)
    font_meta = load_font("Arial.ttf", 12)
    font_side = load_font("Arial.ttf", 11)
    font_btn = load_font("Arial Bold.ttf", 14)

    paste_avatar(base, fan, (24, 20, 48, 48), radius=8)
    paste_avatar(base, fan, (684, 24, 36, 36), radius=6)

    cover(draw, (84, 18, 300, 34))
    draw.text((84, 20), CRUMB, font=font_crumb, fill=MUTED)

    cover(draw, (82, 32, 660, 74))
    wrap(draw, TITLE, 84, 34, font_title, WHITE, max_width=545)

    cover(draw, (66, 74, 230, 96))
    draw.text((70, 78), "91% chance", font=font_chance, fill=BLUE)
    draw.text((180, 84), "▲ 38%", font=font_delta, fill=GREEN)

    cover(draw, (62, 326, 220, 340))
    draw.text((69, 328), "$847,293 Vol.", font=font_meta, fill=MUTED)
    cover(draw, (68, 370, 210, 392))
    draw.text((82, 375), "Jun 18, 2026", font=font_meta, fill=MUTED)

    cover(draw, (724, 20, 998, 96), PANEL)
    wrap(draw, TITLE, 728, 24, font_side, (230, 233, 238), max_width=255, gap=2)
    draw.text((728, 58), "Yes", font=font_side, fill=GREEN)

    yes_label = "Yes 91¢"
    no_label = "No 10¢"
    cover(draw, (686, 166, 818, 184), (22, 30, 33))
    yes_w = draw.textlength(yes_label, font=font_btn)
    draw.text((736 + (68 - yes_w) / 2, 175), yes_label, font=font_btn, fill=BTN_YES)
    cover(draw, (830, 166, 958, 185), PANEL)
    no_w = draw.textlength(no_label, font=font_btn)
    draw.text((894 + (52 - no_w) / 2, 175), no_label, font=font_btn, fill=BTN_NO)

    base.save(OUT, quality=95)
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
