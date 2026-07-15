#!/usr/bin/env python3
"""Normalize selected animated props to 2x runtime display canvases."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "public" / "assets" / "props"
ASSETS = [
    {
        "source_dir": PROPS / "airport-long-kiosk-v1",
        "source_prefix": "long-kiosk",
        "output_dir": PROPS / "airport-long-kiosk-v2",
        "frame_size": (352, 152),
        "padding": 8,
    },
    {
        "source_dir": PROPS / "airport-moving-walkway-v1",
        "source_prefix": "moving-walkway",
        "output_dir": PROPS / "airport-moving-walkway-v2",
        "frame_size": (288, 96),
        "padding": 6,
    },
]


def fit_bottom_center(source: Image.Image, size: tuple[int, int], padding: int) -> Image.Image:
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Animated frame contains no opaque pixels")
    source = source.crop(bounds)
    scale = min(
        (size[0] - padding * 2) / source.width,
        (size[1] - padding * 2) / source.height,
    )
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


def main() -> None:
    for asset in ASSETS:
        output_dir: Path = asset["output_dir"]
        output_dir.mkdir(parents=True, exist_ok=True)
        frames: list[Image.Image] = []
        for frame_number in range(1, 5):
            source_path = asset["source_dir"] / f"{asset['source_prefix']}-{frame_number}.png"
            source = Image.open(source_path).convert("RGBA")
            frame = fit_bottom_center(source, asset["frame_size"], asset["padding"])
            frame.save(output_dir / f"{asset['source_prefix']}-{frame_number}.png")
            frames.append(frame)

        frame_width, frame_height = asset["frame_size"]
        sheet = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, (index * frame_width, 0))
        sheet.save(output_dir / "sheet-transparent.png")
        print(output_dir / "sheet-transparent.png")


if __name__ == "__main__":
    main()
