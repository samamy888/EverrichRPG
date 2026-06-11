from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SOURCE_DIR = Path("docs")
OUTPUT_DIR = SOURCE_DIR / "airport-photo-reference"
THUMBNAIL_SIZE = (320, 240)
CELL_SIZE = (344, 286)
COLUMNS = 3
ROWS = 3


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msjh.ttc"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image_paths = sorted(
        path
        for path in SOURCE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}
    )
    font = load_font(16)
    sheet_size = (CELL_SIZE[0] * COLUMNS, CELL_SIZE[1] * ROWS)

    for sheet_index, start in enumerate(range(0, len(image_paths), COLUMNS * ROWS), start=1):
        sheet = Image.new("RGB", sheet_size, "#111a1f")
        draw = ImageDraw.Draw(sheet)
        for cell_index, image_path in enumerate(image_paths[start : start + COLUMNS * ROWS]):
            column = cell_index % COLUMNS
            row = cell_index // COLUMNS
            cell_x = column * CELL_SIZE[0]
            cell_y = row * CELL_SIZE[1]

            with Image.open(image_path) as source:
                source = ImageOps.exif_transpose(source).convert("RGB")
                thumbnail = ImageOps.contain(source, THUMBNAIL_SIZE)

            image_x = cell_x + (CELL_SIZE[0] - thumbnail.width) // 2
            image_y = cell_y + 8 + (THUMBNAIL_SIZE[1] - thumbnail.height) // 2
            sheet.paste(thumbnail, (image_x, image_y))
            draw.rectangle(
                (cell_x + 4, cell_y + 4, cell_x + CELL_SIZE[0] - 4, cell_y + CELL_SIZE[1] - 4),
                outline="#d8b968",
                width=2,
            )
            draw.text(
                (cell_x + 12, cell_y + THUMBNAIL_SIZE[1] + 18),
                image_path.name,
                fill="#fff2c7",
                font=font,
            )

        output_path = OUTPUT_DIR / f"contact-sheet-{sheet_index:02d}.jpg"
        sheet.save(output_path, quality=90, optimize=True)
        print(output_path)


if __name__ == "__main__":
    main()
