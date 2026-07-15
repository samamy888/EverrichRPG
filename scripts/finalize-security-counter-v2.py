#!/usr/bin/env python3
"""Place the processed security-counter pair on fixed 2x runtime canvases."""

import json
from pathlib import Path

from PIL import Image
from pixel_art_finalize import quantize_to_project_palette


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "props" / "security-counter-v2"
PROCESSED_DIR = ASSET_DIR / "processed-192"
TARGET_SIZE = (180, 108)
BOTTOM_PADDING = 4


def finalize(source_name: str, output_name: str) -> dict[str, object]:
    source = Image.open(PROCESSED_DIR / source_name).convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"{source_name} contains no opaque pixels")

    cropped = source.crop(bounds)
    if cropped.width > TARGET_SIZE[0] or cropped.height > TARGET_SIZE[1] - BOTTOM_PADDING:
        raise ValueError(f"{source_name} does not fit the target canvas: {cropped.size}")

    canvas = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    x = (TARGET_SIZE[0] - cropped.width) // 2
    y = TARGET_SIZE[1] - BOTTOM_PADDING - cropped.height
    canvas.alpha_composite(cropped, (x, y))
    quantize_to_project_palette(canvas).save(ASSET_DIR / output_name)
    return {
        "file": output_name,
        "source": source_name,
        "contentSize": [cropped.width, cropped.height],
        "canvasSize": list(TARGET_SIZE),
        "anchor": "bottom-center",
    }


def main() -> None:
    outputs = [
        finalize("security-counter-1.png", "security-counter-left.png"),
        finalize("security-counter-2.png", "security-counter-right.png"),
    ]
    manifest = {
        "assetId": "security-counter-v2",
        "displaySize": [90, 54],
        "sourceDensity": 2,
        "collisionFootprint": [80, 32],
        "outputs": outputs,
    }
    (ASSET_DIR / "asset-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    for output in outputs:
        print(ASSET_DIR / str(output["file"]))


if __name__ == "__main__":
    main()
