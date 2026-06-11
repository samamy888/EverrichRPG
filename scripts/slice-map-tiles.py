#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Slice a map PNG into fixed-size tiles and emit metadata.")
    parser.add_argument("--input", required=True, help="Input map PNG path.")
    parser.add_argument("--output-dir", required=True, help="Output folder for sliced tiles.")
    parser.add_argument("--tile-size", type=int, default=128, help="Tile size in pixels.")
    parser.add_argument("--meta-output", required=True, help="Output metadata JSON path.")
    parser.add_argument("--url-base", required=True, help="Public URL base for tiles.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    meta_output = Path(args.meta_output)
    tile_size = args.tile_size
    url_base = args.url_base.rstrip("/")

    if not input_path.exists():
        raise FileNotFoundError(f"Input map not found: {input_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    meta_output.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(input_path).convert("RGBA")
    width, height = image.size

    if width % tile_size != 0 or height % tile_size != 0:
        raise ValueError(
            f"Map size {width}x{height} is not divisible by tile size {tile_size}. "
            "Please resize/crop map or choose another tile size."
        )

    cols = width // tile_size
    rows = height // tile_size
    tiles = []

    for row in range(rows):
        for col in range(cols):
            x = col * tile_size
            y = row * tile_size
            tile = image.crop((x, y, x + tile_size, y + tile_size))
            filename = f"tile_{row}_{col}.png"
            tile.save(output_dir / filename)
            tiles.append(
                {
                    "key": f"terminal-tile-{row}-{col}",
                    "row": row,
                    "col": col,
                    "x": x,
                    "y": y,
                    "path": f"{url_base}/{filename}",
                }
            )

    meta = {
        "name": "terminal-hall",
        "width": width,
        "height": height,
        "tileSize": tile_size,
        "rows": rows,
        "cols": cols,
        "tiles": tiles,
    }

    meta_output.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Sliced {len(tiles)} tiles to {output_dir}")
    print(f"Wrote metadata: {meta_output}")


if __name__ == "__main__":
    main()
