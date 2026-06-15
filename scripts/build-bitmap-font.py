from __future__ import annotations

import math
import urllib.request
import zipfile
from pathlib import Path
from xml.etree.ElementTree import Element, ElementTree, SubElement

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT / "tmp/fusion-pixel-ttf/fusion-pixel-12px-monospaced-zh_hant.ttf"
FONT_ARCHIVE = ROOT / "tmp/fusion-pixel-ttf.zip"
FONT_DOWNLOAD_URL = (
    "https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.05.07/"
    "fusion-pixel-font-12px-monospaced-ttf-v2026.05.07.zip"
)
OUTPUT_DIR = ROOT / "public/assets/fonts/fusion-pixel-12/bitmap"
FONT_NAME = "fusion-pixel-12-bitmap"
FONT_SIZE = 12
CELL_SIZE = 16
ATLAS_WIDTH = 1024
SOURCE_EXTENSIONS = {".ts", ".json", ".tmj"}
SOURCE_ROOTS = [
    ROOT / "src",
    ROOT / "game/content",
    ROOT / "public/assets/maps/tiled/regions",
]
REQUIRED_CHARACTERS = (
    " "
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "，。！？：；、（）【】《》「」『』"
    "+-*/%=<>[]{}#$&@_·…"
    "▶◆☰★"
)


def collect_characters() -> list[str]:
    characters = set(REQUIRED_CHARACTERS)
    for source_root in SOURCE_ROOTS:
        for path in source_root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in SOURCE_EXTENSIONS:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            characters.update(
                character
                for character in text
                if character not in "\r\n\t" and character.isprintable()
            )
    return sorted(characters, key=ord)


def ensure_source_font() -> None:
    if FONT_PATH.exists():
        return

    FONT_ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    print("[bitmap-font] downloading Fusion Pixel source font")
    urllib.request.urlretrieve(FONT_DOWNLOAD_URL, FONT_ARCHIVE)
    FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(FONT_ARCHIVE) as archive:
        source_name = next(
            name
            for name in archive.namelist()
            if name.endswith("fusion-pixel-12px-monospaced-zh_hant.ttf")
        )
        with archive.open(source_name) as source, FONT_PATH.open("wb") as destination:
            destination.write(source.read())


def main() -> None:
    ensure_source_font()

    characters = collect_characters()
    columns = ATLAS_WIDTH // CELL_SIZE
    rows = math.ceil(len(characters) / columns)
    atlas_height = 2 ** math.ceil(math.log2(max(CELL_SIZE, rows * CELL_SIZE)))
    font = ImageFont.truetype(str(FONT_PATH), FONT_SIZE)
    atlas = Image.new("RGBA", (ATLAS_WIDTH, atlas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(atlas)

    root = Element("font")
    SubElement(
        root,
        "info",
        face=FONT_NAME,
        size=str(FONT_SIZE),
        bold="0",
        italic="0",
        charset="",
        unicode="1",
        stretchH="100",
        smooth="0",
        aa="1",
        padding="0,0,0,0",
        spacing="0,0",
    )
    SubElement(
        root,
        "common",
        lineHeight=str(FONT_SIZE),
        base="10",
        scaleW=str(ATLAS_WIDTH),
        scaleH=str(atlas_height),
        pages="1",
        packed="0",
    )
    pages = SubElement(root, "pages")
    SubElement(pages, "page", id="0", file=f"{FONT_NAME}.png")
    chars = SubElement(root, "chars", count=str(len(characters)))

    for index, character in enumerate(characters):
        cell_x = (index % columns) * CELL_SIZE
        cell_y = (index // columns) * CELL_SIZE
        advance = max(1, round(font.getlength(character)))
        if character != " ":
            draw.text(
                (cell_x, cell_y),
                character,
                font=font,
                fill=(255, 255, 255, 255),
                anchor="lt",
            )
        SubElement(
            chars,
            "char",
            id=str(ord(character)),
            x=str(cell_x),
            y=str(cell_y),
            width=str(CELL_SIZE),
            height=str(CELL_SIZE),
            xoffset="0",
            yoffset="0",
            xadvance=str(advance),
            page="0",
            chnl="15",
        )

    SubElement(root, "kernings", count="0")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT_DIR / f"{FONT_NAME}.png", optimize=True)
    ElementTree(root).write(
        OUTPUT_DIR / f"{FONT_NAME}.xml",
        encoding="utf-8",
        xml_declaration=True,
    )
    (OUTPUT_DIR / "charset.txt").write_text("".join(characters), encoding="utf-8")
    print(
        f"[bitmap-font] built {len(characters)} glyphs "
        f"into {ATLAS_WIDTH}x{atlas_height}"
    )


if __name__ == "__main__":
    main()
