"""Shared deterministic finalization for EverrichRPG generated pixel assets."""

from PIL import Image


PROJECT_PALETTE = (
    "0A0912", "0D1825", "132234", "233343", "312D3C", "553B32",
    "FEFBF6", "F6F2E9", "F8E9D6", "F1E4D1", "EACEA9", "D8C0A2", "CEAB7E", "AB9374",
    "083C71", "0E568C", "176FA8", "2C5A6C", "3B8FA8", "73D8D8", "9AF0EA", "D3FFFF",
    "6B4924", "8A642E", "A27847", "D1A14B", "FADBAB",
    "705E4B", "ABA79D", "C1C3BA", "DAD4C9", "F1EBE0",
    "C94F4F", "619788", "D67C9C", "8D6FB2",
)


def _palette_image() -> Image.Image:
    values: list[int] = []
    for color in PROJECT_PALETTE:
        values.extend(int(color[index:index + 2], 16) for index in (0, 2, 4))
    first_color = values[:3]
    while len(values) < 768:
        values.extend(first_color)
    palette = Image.new("P", (1, 1))
    palette.putpalette(values)
    return palette


def quantize_to_project_palette(image: Image.Image, alpha_threshold: int = 144) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= alpha_threshold else 0)
    indexed = rgba.convert("RGB").quantize(
        palette=_palette_image(),
        dither=Image.Dither.NONE,
    )
    result = indexed.convert("RGBA")
    result.putalpha(alpha)
    return result
