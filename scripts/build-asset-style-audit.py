#!/usr/bin/env python3
"""Build the visual A/B/C board from the non-destructive style-audit manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
AUDIT_DIR = ROOT / "docs" / "asset-style-audit"
MANIFEST_PATH = AUDIT_DIR / "audit-manifest.json"
OUTPUT_PATH = AUDIT_DIR / "asset-style-reference-board.png"

GRADE_COLORS = {
    "A": (54, 155, 105),
    "B": (211, 150, 48),
    "C": (194, 73, 73),
}


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (239, 235, 224, 255))
    draw = ImageDraw.Draw(image)
    alternate = (226, 231, 232, 255)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=alternate)
    return image


def fit_asset(entry: dict, target: tuple[int, int]) -> Image.Image:
    source = Image.open(ROOT / entry["path"]).convert("RGBA")
    if crop := entry.get("crop"):
        x, y, width, height = crop
        source = source.crop((x, y, x + width, y + height))

    bounds = source.getbbox()
    if bounds:
        source = source.crop(bounds)

    max_w, max_h = target
    scale = min(max_w / max(source.width, 1), max_h / max(source.height, 1))
    scale = max(scale, 0.01)
    size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    return source.resize(size, Image.Resampling.NEAREST)


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    entries = [entry for entry in manifest["entries"] if entry["usageCount"] > 0]

    board_w = 1600
    margin = 42
    header_h = 150
    section_header_h = 58
    card_w = 360
    card_h = 250
    gap = 24
    cards_per_row = 4

    grade_rows = {}
    total_h = header_h + margin
    for grade in ("A", "B", "C"):
        count = sum(1 for entry in entries if entry["grade"] == grade)
        rows = (count + cards_per_row - 1) // cards_per_row
        grade_rows[grade] = rows
        total_h += section_header_h + rows * card_h + max(0, rows - 1) * gap + margin

    board = Image.new("RGBA", (board_w, total_h), (18, 29, 42, 255))
    draw = ImageDraw.Draw(board)
    title_font = load_font(42, bold=True)
    subtitle_font = load_font(21)
    section_font = load_font(29, bold=True)
    card_title_font = load_font(21, bold=True)
    card_meta_font = load_font(16)

    draw.text((margin, 34), "EverrichRPG Asset Style Audit", fill=(247, 242, 226), font=title_font)
    draw.text(
        (margin, 92),
        "Target: modern detailed pixel-inspired airport RPG | A = reference, B = revise, C = replace",
        fill=(172, 193, 208),
        font=subtitle_font,
    )

    grade_titles = {
        "A": "A — Canonical references",
        "B": "B — Keep, then revise",
        "C": "C — Replace first",
    }
    y = header_h
    for grade in ("A", "B", "C"):
        color = GRADE_COLORS[grade]
        draw.rounded_rectangle(
            (margin, y, board_w - margin, y + section_header_h - 8),
            radius=16,
            fill=(*color, 42),
            outline=(*color, 255),
            width=2,
        )
        draw.text((margin + 20, y + 10), grade_titles[grade], fill=(245, 245, 240), font=section_font)
        y += section_header_h

        grade_entries = [entry for entry in entries if entry["grade"] == grade]
        for index, entry in enumerate(grade_entries):
            row, col = divmod(index, cards_per_row)
            x = margin + col * (card_w + gap)
            card_y = y + row * (card_h + gap)
            draw.rounded_rectangle(
                (x, card_y, x + card_w, card_y + card_h),
                radius=14,
                fill=(244, 241, 231),
                outline=(*color, 255),
                width=3,
            )

            preview = checker((card_w - 24, 168))
            asset = fit_asset(entry, (card_w - 50, 148))
            px = (preview.width - asset.width) // 2
            py = (preview.height - asset.height) // 2
            preview.alpha_composite(asset, (px, py))
            board.alpha_composite(preview, (x + 12, card_y + 12))

            draw.text((x + 16, card_y + 188), entry["label"], fill=(23, 34, 46), font=card_title_font)
            meta = f"grade {grade}  |  active uses {entry['usageCount']}"
            draw.text((x + 16, card_y + 220), meta, fill=(75, 88, 99), font=card_meta_font)

        y += grade_rows[grade] * card_h + max(0, grade_rows[grade] - 1) * gap + margin

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    board.convert("RGB").save(OUTPUT_PATH, quality=95)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
