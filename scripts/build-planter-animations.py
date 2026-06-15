from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public/assets/props/airport-directional-v1"
OUTPUT_DIR = ROOT / "public/assets/props/airport-planter-animated-v2"
FRAME_SIZE = 128


def sway_canopy(source: Image.Image, delta: int, cutoff: int) -> Image.Image:
    result = source.copy()
    pixels = source.load()
    output = result.load()

    for y in range(cutoff):
        shift = round(delta * (cutoff - y) / cutoff)
        for x in range(source.width):
            source_x = x - shift
            output[x, y] = pixels[source_x, y] if 0 <= source_x < source.width else (0, 0, 0, 0)

    return result


def place_in_frame(source: Image.Image) -> Image.Image:
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    x = (FRAME_SIZE - source.width) // 2
    y = FRAME_SIZE - source.height - 5
    frame.alpha_composite(source, (x, y))
    return frame


def build_direction(direction: str) -> None:
    source = Image.open(SOURCE_DIR / f"planter-{direction}.png").convert("RGBA")
    alpha_bounds = source.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise RuntimeError(f"Empty planter source: {direction}")

    cutoff = max(1, round(source.height * 0.58))
    direction_dir = OUTPUT_DIR / direction
    direction_dir.mkdir(parents=True, exist_ok=True)
    frames = [
        place_in_frame(sway_canopy(source, delta, cutoff))
        for delta in (0, -1, 0, 1)
    ]

    sheet = Image.new("RGBA", (FRAME_SIZE * 2, FRAME_SIZE * 2), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        frame.save(direction_dir / f"planter-{direction}-{index + 1}.png")
        sheet.alpha_composite(
            frame,
            ((index % 2) * FRAME_SIZE, (index // 2) * FRAME_SIZE),
        )
    sheet.save(direction_dir / "sheet-transparent.png")

    frames[0].save(
        direction_dir / "animation.gif",
        save_all=True,
        append_images=frames[1:],
        duration=650,
        loop=0,
        disposal=2,
        transparency=0,
    )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for direction in ("south", "west", "east", "north"):
        build_direction(direction)
    print(f"[planter-animation] built four directions in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
