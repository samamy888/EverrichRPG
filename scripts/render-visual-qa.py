#!/usr/bin/env python3
"""Render every production TMJ and assemble a compact visual-QA contact sheet."""

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "visual-qa" / "current"
REGIONS = (
    "security-check",
    "departure-hall",
    "airport-facilities",
    "information-core",
    "duty-free-entrance",
    "duty-free-central",
    "shop-beauty-01",
    "shop-liquor-food-01",
    "shop-gift-01",
)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    renderer = ROOT / "scripts" / "render-tmj-preview.py"
    previews = []
    for region_id in REGIONS:
        output = OUTPUT / f"{region_id}.png"
        subprocess.run(
            [sys.executable, str(renderer), region_id, str(output), "--scale", "1"],
            check=True,
        )
        previews.append((region_id, Image.open(output).convert("RGB")))

    cell_width = max(preview.width for _, preview in previews)
    map_height = max(preview.height for _, preview in previews)
    title_height = 24
    sheet = Image.new("RGB", (cell_width * 3, (map_height + title_height) * 3), "#111820")
    draw = ImageDraw.Draw(sheet)
    for index, (region_id, preview) in enumerate(previews):
        column, row = index % 3, index // 3
        x, y = column * cell_width, row * (map_height + title_height)
        draw.text((x + 8, y + 6), region_id, fill="#f8e7bd")
        preview_x = x + (cell_width - preview.width) // 2
        preview_y = y + title_height + (map_height - preview.height) // 2
        sheet.paste(preview, (preview_x, preview_y))

    contact_sheet = ROOT / "docs" / "visual-qa" / "all-regions-current.png"
    sheet.save(contact_sheet)
    print(contact_sheet)

    scale_output = ROOT / "docs" / "visual-qa" / "scale-check"
    scale_output.mkdir(parents=True, exist_ok=True)
    for scale in (1, 2, 3):
        output = scale_output / f"information-core-{scale * 100}.png"
        subprocess.run(
            [sys.executable, str(renderer), "information-core", str(output), "--scale", str(scale)],
            check=True,
        )


if __name__ == "__main__":
    main()
