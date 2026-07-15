#!/usr/bin/env python3
"""Derive subtle seamless variants from accepted 16px airport floor tiles."""

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "tilesets" / "airport-reference-v2"
OUTPUT_DIR = ROOT / "public" / "assets" / "tilesets" / "airport-reference-v3"
TILED_DIR = ROOT / "public" / "assets" / "maps" / "tiled" / "tilesets" / "images"
FLOORS = ("terrazzo", "ivory", "carpet-blue")
OFFSETS = ((0, 0), (20, 12), (36, 28), (52, 44))
TONE_SHIFTS = (0, 1, -1, 2)


def shift_tone(image: Image.Image, amount: int) -> Image.Image:
    if amount == 0:
        return image
    red, green, blue, alpha = image.convert("RGBA").split()
    adjust = lambda channel: channel.point(lambda value: max(0, min(255, value + amount)))
    return Image.merge("RGBA", (adjust(red), adjust(green), adjust(blue), alpha))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TILED_DIR.mkdir(parents=True, exist_ok=True)
    for floor in FLOORS:
        source = Image.open(SOURCE_DIR / f"floor-{floor}.png").convert("RGBA")
        if source.size != (64, 64):
            raise ValueError(f"floor-{floor}.png must be 64x64, got {source.size}")
        for index, ((offset_x, offset_y), tone_shift) in enumerate(zip(OFFSETS, TONE_SHIFTS), start=1):
            variant = shift_tone(ImageChops.offset(source, offset_x, offset_y), tone_shift)
            name = f"floor-{floor}-v{index}.png"
            variant.save(OUTPUT_DIR / name)
            variant.resize((16, 16), Image.Resampling.LANCZOS).save(TILED_DIR / name)
            print(name)


if __name__ == "__main__":
    main()
