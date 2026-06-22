#!/usr/bin/env python3
"""Export 9 clean PM propaganda reply crops + readable collage."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path("/Users/piselli/.cursor/projects/Users-piselli-Desktop-content-tracker/assets")
CROPS_DIR = ROOT / "public" / "pm-replies-crops"
COLLAGE_OUT = ROOT / "public" / "pm-propaganda-replies-collage.png"

CARD_W = 880
GAP = 8  # tiny black gap so tweets don't bleed into each other
BG = (0, 0, 0)

# Each entry: output slug, source file, crop (x1,y1,x2,y2)
# Crops = ONE reply only (no bigchog answers below).
PANELS: list[tuple[str, str, tuple[int, int, int, int]]] = [
    ("01-vibeman-ngmi", "image-881bf75b-aa7b-4fd2-987b-dcac8d58633e.png", (0, 290, 753, 430)),
    ("02-veee-no-need-to-stop", "image-9937f4f4-1b44-4bb6-9506-0350d9b4b9ab.png", (0, 0, 709, 188)),
    ("03-soli-try-again", "image-f9b7f2fa-28f6-4ec1-9fd6-bc360dfd2c80.png", (0, 0, 717, 128)),
    ("04-afonso-miner-meme", "image-5595ed73-453b-457e-8fb4-fb5120587119.png", (0, 0, 843, 545)),
    ("05-mahera-just-dont-stop", "image-3abe30db-eae6-4abe-8c07-711dc656bad1.png", (0, 318, 773, 752)),
    ("06-ledora-play-for-excitement", "image-9937f4f4-1b44-4bb6-9506-0350d9b4b9ab.png", (0, 305, 709, 435)),
    ("07-loner-all-in-6", "image-6e95f702-10c0-4b25-8c16-ed7a156a09df.png", (0, 452, 701, 688)),
    ("08-spinna-one-last-shot", "image-63a0df0c-578d-4f96-9047-84066a98cc55.png", (0, 530, 738, 728)),
    ("09-johnny-manage-grid", "image-a84d6417-6bd9-4b48-b876-f32b08c9843b.png", (0, 668, 747, 795)),
]


def load_crop(fname: str, box: tuple[int, int, int, int]) -> Image.Image:
    path = ASSETS / fname
    if not path.exists():
        raise FileNotFoundError(path)
    return Image.open(path).convert("RGB").crop(box)


def scale_to_width(img: Image.Image, width: int) -> Image.Image:
    w, h = img.size
    nh = max(1, round(h * width / w))
    return img.resize((width, nh), Image.Resampling.LANCZOS)


def export_individual() -> list[Image.Image]:
    CROPS_DIR.mkdir(parents=True, exist_ok=True)
    scaled: list[Image.Image] = []
    for slug, fname, box in PANELS:
        raw = load_crop(fname, box)
        out = CROPS_DIR / f"{slug}.png"
        raw.save(out, "PNG", optimize=True)
        scaled.append(scale_to_width(raw, CARD_W))
        print(f"  {out.name}  ({raw.size[0]}×{raw.size[1]})")
    return scaled


def stack_vertical(cards: list[Image.Image]) -> Image.Image:
    heights = [c.size[1] for c in cards]
    total_h = sum(heights) + GAP * (len(cards) - 1)
    canvas = Image.new("RGB", (CARD_W, total_h), BG)
    y = 0
    for i, card in enumerate(cards):
        canvas.paste(card, (0, y))
        y += card.size[1] + (GAP if i < len(cards) - 1 else 0)
    return canvas


def grid_two_column(cards: list[Image.Image]) -> Image.Image:
    """2 columns, row height = max of pair, cleaner than squashed 3×3."""
    cols = 2
    rows: list[list[Image.Image]] = []
    for i in range(0, len(cards), cols):
        rows.append(cards[i : i + cols])

    row_heights: list[int] = []
    for row in rows:
        if len(row) == 2:
            row_heights.append(max(row[0].size[1], row[1].size[1]))
        else:
            row_heights.append(row[0].size[1])

    total_w = CARD_W * cols + GAP
    total_h = sum(row_heights) + GAP * (len(rows) - 1)
    canvas = Image.new("RGB", (total_w, total_h), BG)

    y = 0
    for row, rh in zip(rows, row_heights):
        if len(row) == 2:
            canvas.paste(row[0], (0, y))
            canvas.paste(row[1], (CARD_W + GAP, y))
        else:
            # center last odd card
            x = (total_w - CARD_W) // 2
            canvas.paste(row[0], (x, y))
        y += rh + GAP
    return canvas


def main() -> None:
    print("Exporting individual crops → public/pm-replies-crops/")
    cards = export_individual()

    vertical = stack_vertical(cards)
    vertical_path = ROOT / "public" / "pm-propaganda-replies-vertical.png"
    vertical.save(vertical_path, "PNG", optimize=True)

    grid = grid_two_column(cards)
    grid.save(COLLAGE_OUT, "PNG", optimize=True)

    print(f"\nCollage (2 col): {COLLAGE_OUT} ({grid.size[0]}×{grid.size[1]})")
    print(f"Collage (1 col): {vertical_path} ({vertical.size[0]}×{vertical.size[1]})")
    print(f"\n9 files in {CROPS_DIR}/ — attach individually or use vertical/2-col collage.")


if __name__ == "__main__":
    main()
