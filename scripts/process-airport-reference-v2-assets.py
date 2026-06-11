from pathlib import Path
from shutil import copy2

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = Path(
    "C:/Users/samam/.codex/generated_images/019eab94-bf21-7582-b87e-0ad06077f2f6"
)
SOURCE_DIR = ROOT / "game/assets/airport-reference-v2/source"
PROCESSED_DIR = ROOT / "game/assets/airport-reference-v2/processed"
TILE_DIR = ROOT / "public/assets/tilesets/airport-reference-v2"
PROP_DIR = ROOT / "public/assets/props/airport-reference-v2"

GENERATED_FILES = {
    "airport-floor-atlas-v2": "ig_07e89e393a2e8c12016a2808b6a1b0819192407fe2aa25a559.png",
    "digital-map-kiosk-v2": "ig_07e89e393a2e8c12016a280924a7608191b1a9758d72e9c61c.png",
    "curved-duty-free-storefront-v2": "ig_07e89e393a2e8c12016a28096e5f24819182d013f67fa6515f.png",
    "luxury-storefront-v2": "ig_07e89e393a2e8c12016a2809b5f5e8819181554fb9165efd39.png",
    "beauty-display-island-v2": "ig_07e89e393a2e8c12016a280a0100708191a42862bfaf01f0d8.png",
}

PROP_WIDTHS = {
    "digital-map-kiosk-v2": 144,
    "curved-duty-free-storefront-v2": 320,
    "luxury-storefront-v2": 288,
    "beauty-display-island-v2": 144,
}


def trim_and_resize(image: Image.Image, target_width: int) -> Image.Image:
    image = image.convert("RGBA")
    alpha_bounds = image.getchannel("A").getbbox()
    if alpha_bounds:
        image = image.crop(alpha_bounds)
    target_height = max(1, round(image.height * target_width / image.width))
    return image.resize((target_width, target_height), Image.Resampling.NEAREST)


def process_floor_atlas(source_path: Path) -> None:
    image = Image.open(source_path).convert("RGB")
    half_width = image.width // 2
    half_height = image.height // 2
    quadrants = {
        "floor-terrazzo": (0, 0, half_width, half_height),
        "floor-ivory": (half_width, 0, image.width, half_height),
        "floor-carpet-blue": (0, half_height, half_width, image.height),
        "floor-navy-panel": (half_width, half_height, image.width, image.height),
    }
    for name, box in quadrants.items():
        tile = image.crop(box).resize((64, 64), Image.Resampling.NEAREST)
        tile.save(TILE_DIR / f"{name}.png")


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    PROP_DIR.mkdir(parents=True, exist_ok=True)

    for asset_name, generated_name in GENERATED_FILES.items():
        source_path = GENERATED_DIR / generated_name
        copied_path = SOURCE_DIR / f"{asset_name}-source.png"
        copy2(source_path, copied_path)

    process_floor_atlas(SOURCE_DIR / "airport-floor-atlas-v2-source.png")

    for asset_name, target_width in PROP_WIDTHS.items():
        source = Image.open(PROCESSED_DIR / asset_name / "clean.png")
        processed = trim_and_resize(source, target_width)
        processed.save(PROP_DIR / f"{asset_name}.png")

    print(f"Source images copied to {SOURCE_DIR}")
    print(f"Tiles written to {TILE_DIR}")
    print(f"Props written to {PROP_DIR}")


if __name__ == "__main__":
    main()
