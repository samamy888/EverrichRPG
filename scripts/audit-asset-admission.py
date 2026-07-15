#!/usr/bin/env python3
"""Fail when production map assets violate the pixel-art admission contract."""

import json
import re
from pathlib import Path

from PIL import Image

from pixel_art_finalize import PROJECT_PALETTE


ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "public" / "assets" / "props"
TILESETS = ROOT / "public" / "assets" / "maps" / "tiled" / "tilesets"
PROJECT_COLORS = {tuple(bytes.fromhex(color)) for color in PROJECT_PALETTE}
REGIONS = ROOT / "public" / "assets" / "maps" / "tiled" / "regions"


def fail(message: str) -> None:
    raise SystemExit(f"[assets:admission] {message}")


def assert_image(path: Path, size: tuple[int, int] | None = None) -> Image.Image:
    if not path.exists():
        fail(f"missing image: {path.relative_to(ROOT)}")
    image = Image.open(path).convert("RGBA")
    if size and image.size != size:
        fail(f"{path.relative_to(ROOT)} must be {size}, got {image.size}")
    return image


def assert_generated_final(path: Path, size: tuple[int, int]) -> None:
    image = assert_image(path, size)
    pixels = list(image.get_flattened_data())
    alpha_values = {pixel[3] for pixel in pixels}
    if not alpha_values.issubset({0, 255}):
        fail(f"{path.relative_to(ROOT)} contains soft alpha values")
    colors = {pixel[:3] for pixel in pixels if pixel[3] == 255}
    outside_palette = colors - PROJECT_COLORS
    if outside_palette:
        fail(f"{path.relative_to(ROOT)} has {len(outside_palette)} colors outside the 36-color palette")
    magenta = sum(1 for red, green, blue, alpha in pixels if alpha and red > 230 and blue > 180 and green < 80)
    if magenta:
        fail(f"{path.relative_to(ROOT)} contains {magenta} opaque magenta pixels")
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        fail(f"{path.relative_to(ROOT)} is empty")
    if bounds[0] < 2 or bounds[1] < 2 or bounds[2] > image.width - 2 or bounds[3] > image.height - 2:
        fail(f"{path.relative_to(ROOT)} does not preserve a 2px transparent safe edge")


def audit_generated_bundles() -> None:
    bundles = (
        ("information-kiosk-v2", "generated-raw.png", "processed/pipeline-meta.json", (("prop.png", (80, 144)),)),
        ("information-counter-v2", "generated-raw-v2.png", "processed-v2/pipeline-meta.json", (("prop.png", (352, 128)),)),
        (
            "security-counter-v2",
            "generated-raw.png",
            "processed-192/pipeline-meta.json",
            (("security-counter-left.png", (180, 108)), ("security-counter-right.png", (180, 108))),
        ),
    )
    for folder, raw_name, metadata_name, outputs in bundles:
        asset_dir = PROPS / folder
        prompt_files = list(asset_dir.glob("*.prompt.txt"))
        if len(prompt_files) != 1:
            fail(f"{folder} must contain exactly one saved prompt")
        for required in (raw_name, metadata_name, "asset-manifest.json"):
            if not (asset_dir / required).exists():
                fail(f"{folder} is missing traceability file {required}")
        for output_name, size in outputs:
            assert_generated_final(asset_dir / output_name, size)


def audit_tileset_images() -> None:
    for tileset_path in TILESETS.glob("*.tsj"):
        tileset = json.loads(tileset_path.read_text(encoding="utf-8"))
        max_id = max((tile["id"] for tile in tileset.get("tiles", [])), default=-1)
        if tileset.get("tilecount") != max_id + 1:
            fail(f"{tileset_path.name} tilecount does not match max tile id")
        image_widths = [tile.get("imagewidth", 0) for tile in tileset.get("tiles", [])]
        image_heights = [tile.get("imageheight", 0) for tile in tileset.get("tiles", [])]
        if tileset.get("tilewidth") != max(image_widths, default=0):
            fail(f"{tileset_path.name} tilewidth must equal the maximum collection image width")
        if tileset.get("tileheight") != max(image_heights, default=0):
            fail(f"{tileset_path.name} tileheight must equal the maximum collection image height")
        for tile in tileset.get("tiles", []):
            image_path = (tileset_path.parent / tile["image"]).resolve()
            assert_image(image_path, (tile["imagewidth"], tile["imageheight"]))


def audit_floor_variants() -> None:
    runtime_dir = ROOT / "public" / "assets" / "tilesets" / "airport-reference-v3"
    tiled_dir = TILESETS / "images"
    for floor in ("terrazzo", "ivory", "carpet-blue"):
        for variant in range(1, 5):
            name = f"floor-{floor}-v{variant}.png"
            assert_image(runtime_dir / name, (64, 64))
            assert_image(tiled_dir / name, (16, 16))


def average_opaque_rgb(image: Image.Image) -> tuple[float, float, float]:
    pixels = [pixel for pixel in image.convert("RGBA").get_flattened_data() if pixel[3] > 0]
    return tuple(sum(pixel[channel] for pixel in pixels) / len(pixels) for channel in range(3))


def audit_active_directional_pairs() -> None:
    used_textures: set[str] = set()
    for map_path in REGIONS.glob("*.tmj"):
        map_data = json.loads(map_path.read_text(encoding="utf-8"))
        for layer in map_data["layers"]:
            for object_data in layer.get("objects", []):
                texture = next(
                    (entry["value"] for entry in object_data.get("properties", []) if entry["name"] == "texture"),
                    None,
                )
                if texture:
                    used_textures.add(texture)

    tileset = json.loads((TILESETS / "airport-props.tsj").read_text(encoding="utf-8"))
    texture_paths = {}
    for tile in tileset["tiles"]:
        texture = next(
            (entry["value"] for entry in tile.get("properties", []) if entry["name"] == "texture"),
            None,
        )
        if texture:
            texture_paths[texture] = (TILESETS / tile["image"]).resolve()

    families: dict[str, dict[str, str]] = {}
    for texture in used_textures:
        match = re.match(r"(.+)-(east|west)$", texture)
        if match:
            families.setdefault(match.group(1), {})[match.group(2)] = texture

    for family, directions in families.items():
        if set(directions) != {"east", "west"}:
            continue
        east = assert_image(texture_paths[directions["east"]])
        west = assert_image(texture_paths[directions["west"]])
        if east.height != west.height or abs(east.width - west.width) > 1:
            fail(f"{family} east/west variants have inconsistent source volume: {east.size} vs {west.size}")
        east_mean = average_opaque_rgb(east)
        west_mean = average_opaque_rgb(west)
        if any(abs(left - right) > 3 for left, right in zip(east_mean, west_mean)):
            fail(f"{family} east/west variants have inconsistent average color or lighting")
        east_area = sum(pixel[3] > 0 for pixel in east.convert("RGBA").get_flattened_data())
        west_area = sum(pixel[3] > 0 for pixel in west.convert("RGBA").get_flattened_data())
        if abs(east_area - west_area) / max(east_area, west_area) > 0.03:
            fail(f"{family} east/west variants have inconsistent opaque volume")


def main() -> None:
    audit_generated_bundles()
    audit_tileset_images()
    audit_floor_variants()
    audit_active_directional_pairs()
    print("[assets:admission] OK (generated bundles, TSJ images, floor variants, directional pairs)")


if __name__ == "__main__":
    main()
