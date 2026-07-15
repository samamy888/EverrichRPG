#!/usr/bin/env python3
"""Render a deterministic TMJ visual preview when browser capture is unavailable."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
REGIONS = ROOT / "public" / "assets" / "maps" / "tiled" / "regions"
WALL_TEXTURE = ROOT / "public" / "assets" / "tilesets" / "airport-reference-v2" / "wall-ivory-panel.png"


def load_tiles(map_data: dict, map_path: Path) -> dict[int, Path]:
    result: dict[int, Path] = {}
    for reference in map_data["tilesets"]:
        tileset_path = (map_path.parent / reference["source"]).resolve()
        tileset = json.loads(tileset_path.read_text(encoding="utf-8"))
        for tile in tileset.get("tiles", []):
            result[reference["firstgid"] + tile["id"]] = (tileset_path.parent / tile["image"]).resolve()
    return result


def alpha_composite_at(canvas: Image.Image, image: Image.Image, position: tuple[int, int]) -> None:
    canvas.alpha_composite(image.convert("RGBA"), position)


def tile_rectangle(canvas: Image.Image, texture: Image.Image, rect: tuple[int, int, int, int]) -> None:
    x, y, width, height = rect
    tile = texture.convert("RGBA").resize((16, 16), Image.Resampling.LANCZOS)
    for tile_y in range(y, y + height, 16):
        for tile_x in range(x, x + width, 16):
            crop = tile.crop((0, 0, min(16, x + width - tile_x), min(16, y + height - tile_y)))
            alpha_composite_at(canvas, crop, (tile_x, tile_y))


def render(region_id: str, output_path: Path, scale: int) -> None:
    map_path = REGIONS / f"{region_id}.tmj"
    map_data = json.loads(map_path.read_text(encoding="utf-8"))
    gid_images = load_tiles(map_data, map_path)
    width = map_data["width"] * map_data["tilewidth"]
    height = map_data["height"] * map_data["tileheight"]
    canvas = Image.new("RGBA", (width, height), (20, 29, 39, 255))

    for layer in (entry for entry in map_data["layers"] if entry["type"] == "tilelayer"):
        opacity = round(255 * layer.get("opacity", 1))
        for index, raw_gid in enumerate(layer["data"]):
            gid = raw_gid & 0x1FFFFFFF
            image_path = gid_images.get(gid)
            if not image_path or not image_path.exists():
                continue
            tile = Image.open(image_path).convert("RGBA").resize((16, 16), Image.Resampling.LANCZOS)
            if opacity < 255:
                alpha = tile.getchannel("A").point(lambda value: value * opacity // 255)
                tile.putalpha(alpha)
            alpha_composite_at(canvas, tile, ((index % layer["width"]) * 16, (index // layer["width"]) * 16))

    wall_layer = next(layer for layer in map_data["layers"] if layer["name"] == "Walls")
    wall_texture = Image.open(WALL_TEXTURE)
    for wall in wall_layer["objects"]:
        tile_rectangle(canvas, wall_texture, (round(wall["x"]), round(wall["y"]), round(wall["width"]), round(wall["height"])))

    collision_layer = next(layer for layer in map_data["layers"] if layer["name"] == "Collision")
    collisions = {}
    for collision in collision_layer["objects"]:
        owner = next((p["value"] for p in collision.get("properties", []) if p["name"] == "ownerId"), None)
        if owner:
            collisions[owner] = collision

    drawable = []
    for layer_name in ("Props", "Merchandise", "NPCs"):
        layer = next((entry for entry in map_data["layers"] if entry["name"] == layer_name), None)
        if layer:
            drawable.extend(layer["objects"])
    def resolved_depth(entry: dict) -> tuple[float, int]:
        properties = {p["name"]: p["value"] for p in entry.get("properties", [])}
        depth = entry["y"] + properties.get("depthOffset", 0)
        if properties.get("foreground"):
            depth += 10
        return depth, entry["id"]

    drawable.sort(key=resolved_depth)

    for object_data in drawable:
        properties = {p["name"]: p["value"] for p in object_data.get("properties", [])}
        if not properties.get("decorative") and not properties.get("wallAttachment"):
            collision = collisions.get(object_data["name"])
            if collision:
                shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
                draw = ImageDraw.Draw(shadow_layer)
                shadow_width = min(object_data["width"] * 0.94, max(10, collision["width"] * 1.04))
                shadow_height = min(8, max(3, collision["height"] * 0.18))
                center_x = object_data["x"] + object_data["width"] / 2
                center_y = object_data["y"] - min(4, max(1, collision["height"] * 0.06))
                draw.ellipse(
                    (
                        center_x - shadow_width / 2,
                        center_y - shadow_height / 2,
                        center_x + shadow_width / 2,
                        center_y + shadow_height / 2,
                    ),
                    fill=(17, 24, 32, 46),
                )
                alpha_composite_at(canvas, shadow_layer, (0, 0))

        image_path = gid_images.get(object_data.get("gid", 0) & 0x1FFFFFFF)
        if not image_path or not image_path.exists():
            continue
        display_height = properties.get("displayHeight", object_data["height"])
        display_size = (max(1, round(object_data["width"])), max(1, round(display_height)))
        sprite = Image.open(image_path).convert("RGBA").resize(display_size, Image.Resampling.LANCZOS)
        x = round(object_data["x"])
        y = round(object_data["y"] - display_height)
        alpha_composite_at(canvas, sprite, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((width * scale, height * scale), Image.Resampling.NEAREST).save(output_path)
    print(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("region_id")
    parser.add_argument("output")
    parser.add_argument("--scale", type=int, default=2)
    args = parser.parse_args()
    render(args.region_id, Path(args.output).resolve(), args.scale)


if __name__ == "__main__":
    main()
