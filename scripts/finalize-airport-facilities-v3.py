#!/usr/bin/env python3
"""Finalize generated v3 airport facilities and compose an in-world QA preview."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "props" / "airport-facilities-v3"
MANIFEST_PATH = ASSET_DIR / "asset-manifest.json"
PREVIEW_PATH = ASSET_DIR / "airport-facilities-v3.preview.png"


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Asset contains no opaque pixels")
    return bounds


def fit_bottom_center(source: Image.Image, size: tuple[int, int], padding: int = 4) -> Image.Image:
    source = source.crop(alpha_bounds(source))
    max_width = max(1, size[0] - padding * 2)
    max_height = max(1, size[1] - padding * 2)
    scale = min(max_width / source.width, max_height / source.height)
    fitted_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    fitted = source.resize(fitted_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - fitted.width) // 2
    y = size[1] - padding - fitted.height
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def load_first_frame(path: Path, frame_size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    return image.crop((0, 0, frame_size[0], frame_size[1]))


def tile_floor(canvas: Image.Image, tile_path: Path, tile_size: int) -> None:
    tile = Image.open(tile_path).convert("RGBA").resize((tile_size, tile_size), Image.Resampling.NEAREST)
    for y in range(0, canvas.height, tile_size):
        for x in range(0, canvas.width, tile_size):
            canvas.alpha_composite(tile, (x, y))


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    finalized: dict[str, Image.Image] = {}

    for asset in manifest["assets"]:
        source = Image.open(ASSET_DIR / asset["processedSource"]).convert("RGBA")
        target_size = tuple(asset["sourceSize"])
        final = fit_bottom_center(source, target_size)
        final.save(ASSET_DIR / asset["file"])
        finalized[asset["id"]] = final

    preview = Image.new("RGBA", (960, 540), (240, 238, 228, 255))
    tile_floor(
        preview,
        ROOT / "public" / "assets" / "tilesets" / "airport-reference-v2" / "floor-terrazzo.png",
        32,
    )

    wall_color = (241, 236, 219, 255)
    wall_shadow = (43, 55, 72, 255)
    wall = Image.new("RGBA", (960, 86), wall_color)
    shadow = Image.new("RGBA", (960, 12), wall_shadow)
    preview.alpha_composite(wall, (0, 0))
    preview.alpha_composite(shadow, (0, 86))

    hero = load_first_frame(
        ROOT / "public" / "assets" / "sprites" / "player_hero" / "sheet-transparent.png",
        (96, 96),
    ).resize((80, 80), Image.Resampling.NEAREST)
    preview.alpha_composite(hero, (440, 400))

    placements = [
        ("airport-charging-station-front-v3", 80, 120),
        ("airport-charging-station-side-v3", 205, 120),
        ("airport-emergency-cabinet-front-v3", 300, 136),
        ("airport-emergency-cabinet-side-v3", 425, 136),
        ("airport-recycling-station-v3", 560, 170),
        ("airport-queue-barriers-v3", 176, 320),
    ]
    for asset_id, x, y in placements:
        preview.alpha_composite(finalized[asset_id], (x, y))

    preview.convert("RGB").save(PREVIEW_PATH, quality=95)
    print(PREVIEW_PATH)


if __name__ == "__main__":
    main()
