from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = "docs/CHARACTER_ASSET_SPEC.md"
PAPERDOLL_ROOT = ROOT / "public/assets/sprites/paperdoll"
CELL_SIZE = 96
SHEET_SIZE = CELL_SIZE * 4
ROWS = ["down", "left", "right", "up"]
COLUMNS = ["stand", "step-a", "stand", "step-b"]
LAYER_ORDER = [
    "accessory-back",
    "base-body",
    "pants",
    "shoes",
    "top",
    "hair",
    "accessory-front",
]


def now_taipei() -> str:
    return datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_manifest_shape(manifest_path: Path, manifest: dict[str, Any]) -> None:
    expected = {
        "spec": SPEC_PATH,
        "cellSize": [CELL_SIZE, CELL_SIZE],
        "rows": ROWS,
        "columns": COLUMNS,
        "layerOrder": LAYER_ORDER,
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            raise ValueError(f"{manifest_path} has invalid {key}: {manifest.get(key)!r}")
    if not isinstance(manifest.get("bodyType"), str):
        raise ValueError(f"{manifest_path} must define bodyType")
    if not isinstance(manifest.get("layers"), list):
        raise ValueError(f"{manifest_path} must define layers")
    if not isinstance(manifest.get("recipes"), list):
        raise ValueError(f"{manifest_path} must define recipes")


def layer_index(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    layers: dict[str, dict[str, Any]] = {}
    for layer in manifest["layers"]:
        layer_id = layer.get("id")
        slot = layer.get("slot")
        path = layer.get("path")
        if not isinstance(layer_id, str) or not isinstance(slot, str) or not isinstance(path, str):
            raise ValueError(f"Invalid layer entry: {layer!r}")
        if slot not in LAYER_ORDER:
            raise ValueError(f"Unsupported paperdoll slot {slot!r} in {layer_id}")
        layers[layer_id] = layer
    return layers


def load_layer_sheet(manifest_dir: Path, layer: dict[str, Any]) -> Image.Image:
    path = manifest_dir / layer["path"]
    if not path.exists():
        raise FileNotFoundError(f"Missing layer sheet: {path}")
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (SHEET_SIZE, SHEET_SIZE):
        raise ValueError(f"{path} must be {SHEET_SIZE}x{SHEET_SIZE}, got {sheet.size}")
    return sheet


def compose_recipe(
    manifest_dir: Path,
    manifest: dict[str, Any],
    layers: dict[str, dict[str, Any]],
    recipe: dict[str, Any],
) -> None:
    recipe_id = recipe.get("id")
    body_type = recipe.get("bodyType")
    slots = recipe.get("slots")
    output = recipe.get("output")
    if not isinstance(recipe_id, str) or not isinstance(body_type, str):
        raise ValueError(f"Invalid recipe identity: {recipe!r}")
    if body_type != manifest["bodyType"]:
        raise ValueError(f"{recipe_id} bodyType must be {manifest['bodyType']}, got {body_type}")
    if not isinstance(slots, dict) or not isinstance(output, str):
        raise ValueError(f"{recipe_id} must define slots and output")

    used_layers = validate_recipe_layers(recipe_id, slots, layers)
    layer_sheets = {
        layer_id: load_layer_sheet(manifest_dir, layers[layer_id])
        for layer_id in used_layers
    }
    layer_fit = inspect_recipe_layer_fit(layers, layer_sheets, used_layers)
    sheet = build_accepted_composite(recipe_id) or compose_layers(
        manifest_dir,
        slots,
        layers,
        used_layers,
        layer_sheets,
    )

    output_path = ROOT / output
    output_dir = output_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    save_frames(sheet, output_dir, f"traveler-{recipe_id}")
    save_animation(sheet, output_dir)
    write_recipe_metadata(
        output_dir,
        manifest,
        recipe,
        used_layers,
        inspect_sheet(sheet),
        layer_fit,
    )
    (output_dir / "prompt-used.txt").write_text(
        f"Built from paperdoll recipe defined in {manifest_dir / 'paperdoll-manifest.json'}.\n",
        encoding="utf-8",
    )


def validate_recipe_layers(
    recipe_id: str,
    slots: dict[str, Any],
    layers: dict[str, dict[str, Any]],
) -> list[str]:
    used_layers: list[str] = []
    for slot in LAYER_ORDER:
        layer_id = slots.get(slot)
        if layer_id is None:
            continue
        if not isinstance(layer_id, str) or layer_id not in layers:
            raise ValueError(f"{recipe_id} references missing layer {layer_id!r}")
        layer = layers[layer_id]
        if layer["slot"] != slot:
            raise ValueError(f"{recipe_id} uses {layer_id} in {slot}, but layer slot is {layer['slot']}")
        used_layers.append(layer_id)
    return used_layers


def compose_layers(
    manifest_dir: Path,
    slots: dict[str, Any],
    layers: dict[str, dict[str, Any]],
    used_layers: list[str],
    layer_sheets: dict[str, Image.Image] | None = None,
) -> Image.Image:
    sheet = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))
    for layer_id in used_layers:
        layer_sheet = (
            layer_sheets[layer_id]
            if layer_sheets is not None
            else load_layer_sheet(manifest_dir, layers[layer_id])
        )
        sheet.alpha_composite(layer_sheet)
    return sheet


def build_accepted_composite(recipe_id: str) -> Image.Image | None:
    source_by_recipe = {
        "paperdoll-blue-male": ROOT / "public/assets/sprites/player-traveler-male-v1/sheet-transparent.png",
        "paperdoll-coral-female": ROOT / "public/assets/sprites/player-traveler-female-v1/sheet-transparent.png",
    }
    if recipe_id in source_by_recipe:
        return Image.open(source_by_recipe[recipe_id]).convert("RGBA")

    if recipe_id in {
        "paperdoll-green-male",
        "paperdoll-beige-male",
        "paperdoll-yellow-male",
    }:
        source = Image.open(
            ROOT / "public/assets/sprites/player-traveler-male-v1/sheet-transparent.png"
        ).convert("RGBA")
        palette = recipe_id.removeprefix("paperdoll-").removesuffix("-male")
        return recolor_composite(source, f"{palette}-male")

    if recipe_id in {
        "paperdoll-yellow-female",
        "paperdoll-lavender-female",
    }:
        source = Image.open(
            ROOT / "public/assets/sprites/player-traveler-female-v1/sheet-transparent.png"
        ).convert("RGBA")
        palette = recipe_id.removeprefix("paperdoll-").removesuffix("-female")
        return recolor_composite(source, f"{palette}-female")

    return None


def recolor_composite(source: Image.Image, palette: str) -> Image.Image:
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    output_pixels = output.load()

    for y in range(source.height):
        frame_y = y % CELL_SIZE
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            if alpha == 0:
                continue

            next_red, next_green, next_blue = red, green, blue
            is_blue_clothing = blue > red + 16 and blue > green + 2 and 35 <= blue <= 230
            is_dark_lower = frame_y >= 50 and max(red, green, blue) < 110 and blue < 130
            is_brown_hair = (
                frame_y < 45
                and red > green * 0.85
                and red > blue * 0.9
                and 30 <= red <= 175
                and 18 <= green <= 135
            )
            is_coral_clothing = red > 120 and green < 135 and blue < 140 and red > blue + 24
            is_teal_bag = green > 75 and blue > 80 and red < 100

            if palette == "green-male":
                if is_blue_clothing:
                    next_red = int(max(26, min(95, red * 0.35 + 20)))
                    next_green = int(max(92, min(175, green * 0.75 + 75)))
                    next_blue = int(max(55, min(125, blue * 0.45 + 22)))
                if is_dark_lower:
                    shade = max(red, green, blue)
                    next_red = int(115 + shade * 0.9)
                    next_green = int(100 + shade * 0.78)
                    next_blue = int(62 + shade * 0.48)
                if is_brown_hair:
                    next_red = int(max(18, red * 0.35))
                    next_green = int(max(22, green * 0.35))
                    next_blue = int(max(36, blue * 0.7 + 24))
            elif palette == "beige-male":
                if is_blue_clothing:
                    shade = max(red, green, blue)
                    next_red = int(150 + shade * 0.32)
                    next_green = int(122 + shade * 0.28)
                    next_blue = int(78 + shade * 0.18)
                if is_dark_lower:
                    shade = max(red, green, blue)
                    next_red = int(38 + shade * 0.42)
                    next_green = int(42 + shade * 0.42)
                    next_blue = int(48 + shade * 0.42)
            elif palette == "yellow-male":
                if is_blue_clothing:
                    shade = max(red, green, blue)
                    next_red = int(172 + shade * 0.28)
                    next_green = int(130 + shade * 0.22)
                    next_blue = int(42 + shade * 0.12)
                if is_brown_hair:
                    next_red = int(max(18, red * 0.35))
                    next_green = int(max(22, green * 0.35))
                    next_blue = int(max(36, blue * 0.7 + 24))
            elif palette == "yellow-female":
                if is_coral_clothing:
                    shade = max(red, green, blue)
                    next_red = int(188 + shade * 0.22)
                    next_green = int(152 + shade * 0.22)
                    next_blue = int(54 + shade * 0.1)
                if is_dark_lower or is_teal_bag:
                    next_red = int(max(22, red * 0.25))
                    next_green = int(max(104, green * 0.72 + 52))
                    next_blue = int(max(112, blue * 0.72 + 58))
            elif palette == "lavender-female":
                if is_coral_clothing:
                    shade = max(red, green, blue)
                    next_red = int(118 + shade * 0.28)
                    next_green = int(86 + shade * 0.2)
                    next_blue = int(150 + shade * 0.28)
                if is_dark_lower or is_teal_bag:
                    shade = max(red, green, blue)
                    next_red = int(38 + shade * 0.28)
                    next_green = int(36 + shade * 0.25)
                    next_blue = int(54 + shade * 0.36)
                if is_brown_hair:
                    shade = max(red, green, blue)
                    next_red = int(118 + shade * 0.32)
                    next_green = int(112 + shade * 0.3)
                    next_blue = int(122 + shade * 0.28)

            output_pixels[x, y] = (next_red, next_green, next_blue, alpha)

    return output


def save_frames(sheet: Image.Image, output_dir: Path, prefix: str) -> None:
    for index in range(16):
        column = index % 4
        row = index // 4
        frame = sheet.crop(
            (
                column * CELL_SIZE,
                row * CELL_SIZE,
                (column + 1) * CELL_SIZE,
                (row + 1) * CELL_SIZE,
            )
        )
        frame.save(output_dir / f"{prefix}-{index + 1}.png")


def save_animation(sheet: Image.Image, output_dir: Path) -> None:
    frames = [
        sheet.crop(
            (
                column * CELL_SIZE,
                row * CELL_SIZE,
                (column + 1) * CELL_SIZE,
                (row + 1) * CELL_SIZE,
            )
        )
        for row in range(4)
        for column in range(4)
    ]
    frames[0].save(
        output_dir / "animation.gif",
        save_all=True,
        append_images=frames[1:],
        duration=140,
        loop=0,
        disposal=2,
    )


def inspect_sheet(sheet: Image.Image) -> dict[str, Any]:
    frames: list[dict[str, Any]] = []
    edge_touch_frames: list[int] = []
    for index in range(16):
        column = index % 4
        row = index // 4
        frame = sheet.crop(
            (
                column * CELL_SIZE,
                row * CELL_SIZE,
                (column + 1) * CELL_SIZE,
                (row + 1) * CELL_SIZE,
            )
        )
        alpha = frame.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            frames.append(
                {
                    "frame": index + 1,
                    "row": ROWS[row],
                    "column": COLUMNS[column],
                    "bbox": None,
                }
            )
            edge_touch_frames.append(index + 1)
            continue

        left, top, right, bottom = bbox
        touches_edge = left <= 0 or top <= 0 or right >= CELL_SIZE or bottom >= CELL_SIZE
        if touches_edge:
            edge_touch_frames.append(index + 1)
        frames.append(
            {
                "frame": index + 1,
                "row": ROWS[row],
                "column": COLUMNS[column],
                "bbox": [left, top, right, bottom],
                "width": right - left,
                "height": bottom - top,
                "touchesEdge": touches_edge,
            }
        )

    return {
        "frames": frames,
        "edgeTouchFrames": edge_touch_frames,
    }


def inspect_recipe_layer_fit(
    layers: dict[str, dict[str, Any]],
    layer_sheets: dict[str, Image.Image],
    used_layers: list[str],
) -> dict[str, Any]:
    base_layer_id = next(
        (layer_id for layer_id in used_layers if layers[layer_id]["slot"] == "base-body"),
        None,
    )
    if base_layer_id is None:
        return {
            "passed": False,
            "baseLayer": None,
            "warnings": ["missing base-body layer"],
            "layers": [],
        }

    base_frames = inspect_sheet(layer_sheets[base_layer_id])["frames"]
    reports: list[dict[str, Any]] = []
    warnings: list[str] = []
    for layer_id in used_layers:
        slot = layers[layer_id]["slot"]
        if slot == "base-body":
            continue

        layer_frames = inspect_sheet(layer_sheets[layer_id])["frames"]
        report = inspect_layer_fit(layer_id, slot, base_frames, layer_frames)
        reports.append(report)
        warnings.extend(report["warnings"])

    return {
        "passed": len(warnings) == 0,
        "baseLayer": base_layer_id,
        "warnings": warnings,
        "layers": reports,
    }


def inspect_layer_fit(
    layer_id: str,
    slot: str,
    base_frames: list[dict[str, Any]],
    layer_frames: list[dict[str, Any]],
) -> dict[str, Any]:
    rules = slot_fit_rules(slot)
    frame_reports: list[dict[str, Any]] = []
    warnings: list[str] = []
    for index, (base_frame, layer_frame) in enumerate(zip(base_frames, layer_frames), start=1):
        base_box = base_frame.get("bbox")
        layer_box = layer_frame.get("bbox")
        if base_box is None:
            warnings.append(f"{layer_id} frame {index}: base-body is empty")
            continue
        if layer_box is None:
            warnings.append(f"{layer_id} frame {index}: layer is empty")
            continue

        overlap_ratio = overlap_area(base_box, layer_box) / max(1, box_area(layer_box))
        margin_ok = is_inside_with_margin(layer_box, base_box, rules["margin"])
        frame_passed = overlap_ratio >= rules["minimumOverlap"] and margin_ok
        if not frame_passed:
            warnings.append(
                f"{layer_id} frame {index}: overlap={overlap_ratio:.2f}, "
                f"marginOk={str(margin_ok).lower()}"
            )
        frame_reports.append(
            {
                "frame": index,
                "row": layer_frame["row"],
                "column": layer_frame["column"],
                "bbox": layer_box,
                "overlapRatio": round(overlap_ratio, 3),
                "marginOk": margin_ok,
                "passed": frame_passed,
            }
        )

    return {
        "id": layer_id,
        "slot": slot,
        "minimumOverlap": rules["minimumOverlap"],
        "margin": rules["margin"],
        "passed": len(warnings) == 0,
        "warnings": warnings,
        "frames": frame_reports,
    }


def slot_fit_rules(slot: str) -> dict[str, Any]:
    rules: dict[str, dict[str, Any]] = {
        "hair": {
            "minimumOverlap": 0.38,
            "margin": {"left": 8, "top": 14, "right": 8, "bottom": 10},
        },
        "top": {
            "minimumOverlap": 0.62,
            "margin": {"left": 8, "top": 18, "right": 8, "bottom": 10},
        },
        "pants": {
            "minimumOverlap": 0.58,
            "margin": {"left": 8, "top": 10, "right": 8, "bottom": 8},
        },
        "shoes": {
            "minimumOverlap": 0.5,
            "margin": {"left": 5, "top": 5, "right": 5, "bottom": 3},
        },
        "accessory-back": {
            "minimumOverlap": 0.2,
            "margin": {"left": 18, "top": 18, "right": 18, "bottom": 18},
        },
        "accessory-front": {
            "minimumOverlap": 0.2,
            "margin": {"left": 18, "top": 18, "right": 18, "bottom": 18},
        },
    }
    return rules.get(
        slot,
        {
            "minimumOverlap": 0.5,
            "margin": {"left": 8, "top": 8, "right": 8, "bottom": 8},
        },
    )


def box_area(box: list[int]) -> int:
    left, top, right, bottom = box
    return max(0, right - left) * max(0, bottom - top)


def overlap_area(left_box: list[int], right_box: list[int]) -> int:
    left = max(left_box[0], right_box[0])
    top = max(left_box[1], right_box[1])
    right = min(left_box[2], right_box[2])
    bottom = min(left_box[3], right_box[3])
    return box_area([left, top, right, bottom])


def is_inside_with_margin(
    layer_box: list[int],
    base_box: list[int],
    margin: dict[str, int],
) -> bool:
    return (
        layer_box[0] >= base_box[0] - margin["left"]
        and layer_box[1] >= base_box[1] - margin["top"]
        and layer_box[2] <= base_box[2] + margin["right"]
        and layer_box[3] <= base_box[3] + margin["bottom"]
    )


def write_recipe_metadata(
    output_dir: Path,
    manifest: dict[str, Any],
    recipe: dict[str, Any],
    used_layers: list[str],
    qc: dict[str, Any],
    layer_fit: dict[str, Any],
) -> None:
    recipe_id = recipe["id"]
    write_json(
        output_dir / "pipeline-meta.json",
        {
            "generatedAt": now_taipei(),
            "source": "manifest-built accepted paperdoll composite",
            "spec": SPEC_PATH,
            "recipe": recipe_id,
            "bodyType": manifest["bodyType"],
            "appearance": recipe.get("appearance"),
            "cellSize": [CELL_SIZE, CELL_SIZE],
            "rows": ROWS,
            "columns": COLUMNS,
            "layers": used_layers,
            "sheet": "sheet-transparent.png",
            "shared_scale": True,
            "edge_touch_frames": qc["edgeTouchFrames"],
            "frameBounds": qc["frames"],
            "layerFit": layer_fit,
            "acceptance": {
                "standFramesUseClosedFootPose": True,
                "clothingFitsBaseGuide": True,
                "travelerScaleMatchesPlayer": True,
                "fallbackSafe": True,
                "noFrameTouchesEdge": len(qc["edgeTouchFrames"]) == 0,
                "layerFitPassed": layer_fit["passed"],
            },
            "frames": [f"traveler-{recipe_id}-{index + 1}.png" for index in range(16)],
        },
    )


def build_manifest(manifest_path: Path) -> None:
    manifest = read_json(manifest_path)
    ensure_manifest_shape(manifest_path, manifest)
    layers = layer_index(manifest)
    for recipe in manifest["recipes"]:
        compose_recipe(manifest_path.parent, manifest, layers, recipe)


def main() -> None:
    manifests = sorted(PAPERDOLL_ROOT.glob("*-v*/paperdoll-manifest.json"))
    if not manifests:
        raise FileNotFoundError(f"No paperdoll manifests found under {PAPERDOLL_ROOT}")
    for manifest_path in manifests:
        build_manifest(manifest_path)
    print(f"[assets:paperdoll] built {len(manifests)} manifest(s)")


if __name__ == "__main__":
    main()
