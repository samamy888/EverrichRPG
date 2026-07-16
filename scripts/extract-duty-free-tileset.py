from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "game/assets/tilesets/duty-free-terminal-v1-source.png"
TILE_OUTPUT = ROOT / "public/assets/tilesets/duty-free-terminal-v1"
PROP_OUTPUT = ROOT / "public/assets/props/duty-free-terminal-v1"


def crop_tile(image: Image.Image, name: str, box: tuple[int, int, int, int]) -> None:
    tile = image.crop(box).resize((16, 16), Image.Resampling.NEAREST)
    tile.save(TILE_OUTPUT / f"{name}.png")


def save_cardinal_variants(image: Image.Image, output: Path, stem: str) -> None:
    image.save(output / f"{stem}-down.png")
    image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(output / f"{stem}-up.png")
    image.rotate(-90, expand=True).save(output / f"{stem}-left.png")
    image.rotate(90, expand=True).save(output / f"{stem}-right.png")


def remove_background(image: Image.Image, tolerance: int = 38) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    background = rgba.getpixel((0, 0))[:3]
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            distance = abs(red - background[0]) + abs(green - background[1]) + abs(blue - background[2])
            if distance <= tolerance:
                pixels[x, y] = (red, green, blue, 0)
            elif distance <= tolerance * 2:
                pixels[x, y] = (red, green, blue, min(alpha, int(255 * (distance - tolerance) / tolerance)))
    return rgba


def crop_prop(
    image: Image.Image,
    name: str,
    box: tuple[int, int, int, int],
    target_width: int,
) -> None:
    prop = remove_background(image.crop(box))
    alpha = prop.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        prop = prop.crop(bounds)
    target_height = max(1, round(prop.height * target_width / prop.width))
    prop = prop.resize((target_width, target_height), Image.Resampling.NEAREST)
    prop.save(PROP_OUTPUT / f"{name}.png")


def main() -> None:
    TILE_OUTPUT.mkdir(parents=True, exist_ok=True)
    PROP_OUTPUT.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE).convert("RGBA")

    crop_tile(image, "floor-cream", (36, 36, 130, 130))
    crop_tile(image, "floor-blue", (438, 36, 530, 130))
    crop_tile(image, "floor-gold", (36, 246, 130, 340))
    crop_tile(image, "floor-dark", (438, 246, 530, 340))

    wall_down = image.crop((832, 36, 927, 130)).resize((16, 16), Image.Resampling.NEAREST)
    save_cardinal_variants(wall_down, TILE_OUTPUT, "monster-airport-wall")

    crop_prop(image, "service-counter", (177, 494, 493, 580), 144)
    crop_prop(image, "display-shelf", (32, 603, 648, 708), 128)
    crop_prop(image, "planter", (806, 468, 891, 583), 42)
    crop_prop(image, "sign-pillar", (1103, 466, 1178, 585), 28)
    crop_prop(image, "shop-doorway", (1170, 599, 1330, 741), 112)

    print(f"Tiles written to {TILE_OUTPUT}")
    print(f"Props written to {PROP_OUTPUT}")


if __name__ == "__main__":
    main()
