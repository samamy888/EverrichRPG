from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--cols", type=int, required=True)
    parser.add_argument("--scale", type=float, default=0.84)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    cell_width = source.width // args.cols
    cell_height = source.height // args.rows
    output = Image.new("RGBA", source.size, (255, 0, 255, 255))

    target_width = round(cell_width * args.scale)
    target_height = round(cell_height * args.scale)

    for row in range(args.rows):
        for column in range(args.cols):
            frame = source.crop(
                (
                    column * cell_width,
                    row * cell_height,
                    (column + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            frame = frame.resize((target_width, target_height), Image.Resampling.LANCZOS)
            x = column * cell_width + (cell_width - target_width) // 2
            y = row * cell_height + (cell_height - target_height) // 2
            output.alpha_composite(frame, (x, y))

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    output.convert("RGB").save(args.output)


if __name__ == "__main__":
    main()
