#!/usr/bin/env python3
"""Finalize the generated information kiosk at 2x game display density."""

from pathlib import Path

from PIL import Image
from pixel_art_finalize import quantize_to_project_palette


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "props" / "information-kiosk-v2"


def main() -> None:
    source = Image.open(ASSET_DIR / "processed" / "clean.png").convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Processed kiosk contains no opaque pixels")

    source = source.crop(bounds)
    target_size = (80, 144)
    padding = 6
    scale = min(
        (target_size[0] - padding * 2) / source.width,
        (target_size[1] - padding * 2) / source.height,
    )
    fitted_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    fitted = source.resize(fitted_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_size[0] - fitted.width) // 2
    y = target_size[1] - padding - fitted.height
    canvas.alpha_composite(fitted, (x, y))
    quantize_to_project_palette(canvas).save(ASSET_DIR / "prop.png")
    print(ASSET_DIR / "prop.png")


if __name__ == "__main__":
    main()
