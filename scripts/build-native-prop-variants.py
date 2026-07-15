#!/usr/bin/env python3
"""Repack accepted prop art into 2x runtime frames without geometric distortion."""

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "public" / "assets" / "props"


@dataclass(frozen=True)
class AnimatedProfile:
    source_dir: str
    source_prefix: str
    output_dir: str
    target: tuple[int, int]


ANIMATED = (
    AnimatedProfile("airport-self-order-kiosk-v1", "self-order-kiosk", "airport-self-order-kiosk-v2", (144, 224)),
    AnimatedProfile("airport-water-dispenser-animated-v1", "water-dispenser", "airport-water-dispenser-animated-v2", (112, 176)),
    AnimatedProfile("airport-planter-animated-v2/north", "planter-north", "airport-planter-animated-native-v3/north", (192, 176)),
    AnimatedProfile("airport-planter-animated-v2/west", "planter-west", "airport-planter-animated-native-v3/west", (124, 200)),
    AnimatedProfile("airport-planter-animated-v2/east", "planter-east", "airport-planter-animated-native-v3/east", (124, 200)),
    AnimatedProfile("airport-vending-machine-v1", "vending-machine", "airport-vending-machine-v2", (128, 192)),
    AnimatedProfile("airport-ad-column-v1", "ad-column", "airport-ad-column-v2", (128, 224)),
    AnimatedProfile("airport-atrium-lamp-v1", "atrium-lamp", "airport-atrium-lamp-v2", (128, 192)),
    AnimatedProfile("airport-escalator-animated-south-v1", "escalator-south", "airport-escalator-animated-south-v2", (224, 256)),
)

STATIC = (
    ("airport-directional-v2/waiting-seats-horizontal.png", "airport-directional-v3/waiting-seats-horizontal.png", (352, 144)),
    ("airport-terminal-details-v1/airport-recycling-station/prop.png", "airport-terminal-details-native-v2/airport-recycling-station/prop.png", (160, 128)),
    ("airport-terminal-details-v1/airport-cleaning-trolley/prop.png", "airport-terminal-details-native-v2/airport-cleaning-trolley/prop.png", (128, 144)),
)


def crop_opaque(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Source image contains no opaque pixels")
    return rgba.crop(bounds)


def fit_bottom(source: Image.Image, target: tuple[int, int], scale: float) -> Image.Image:
    padding = 4
    fitted_size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    fitted = source.resize(fitted_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target, (0, 0, 0, 0))
    x = (target[0] - fitted.width) // 2
    y = target[1] - padding - fitted.height
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def build_animated(profile: AnimatedProfile) -> None:
    sources = [
        crop_opaque(Image.open(PROPS / profile.source_dir / f"{profile.source_prefix}-{index}.png"))
        for index in range(1, 5)
    ]
    padding = 4
    scale = min(
        (profile.target[0] - padding * 2) / max(image.width for image in sources),
        (profile.target[1] - padding * 2) / max(image.height for image in sources),
    )
    frames = [fit_bottom(image, profile.target, scale) for image in sources]
    output_dir = PROPS / profile.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, start=1):
        frame.save(output_dir / f"{profile.source_prefix}-{index}.png")
    sheet = Image.new("RGBA", (profile.target[0] * len(frames), profile.target[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (profile.target[0] * index, 0))
    sheet.save(output_dir / "sheet-transparent.png")
    print(f"{profile.output_dir}: {profile.target[0]}x{profile.target[1]}")


def build_static(source_path: str, output_path: str, target: tuple[int, int]) -> None:
    source = crop_opaque(Image.open(PROPS / source_path))
    padding = 4
    scale = min((target[0] - padding * 2) / source.width, (target[1] - padding * 2) / source.height)
    output = fit_bottom(source, target, scale)
    destination = PROPS / output_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination)
    print(f"{output_path}: {target[0]}x{target[1]}")


def main() -> None:
    for profile in ANIMATED:
        build_animated(profile)
    for source_path, output_path, target in STATIC:
        build_static(source_path, output_path, target)


if __name__ == "__main__":
    main()
