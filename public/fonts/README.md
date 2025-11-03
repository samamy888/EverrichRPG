# Chinese Bitmap Font Guide

This game supports an optional Chinese bitmap font for crisp, pixel-perfect UI. Place the generated font files here so BootScene can load them.

Expected files
- `public/fonts/han.fnt`
- `public/fonts/han.png`

Recommended workflow (Windows, AngelCode BMFont)
1) Install BMFont (AngelCode).
2) Open your licensed pixel-compatible Chinese TTF/OTF.
3) Settings:
   - Font size: 12–14 px (match game UI scale)
   - Smoothing/Antialias: OFF; Outline: 0; Padding: 1–2 px; Spacing: 0/0
   - Charset: Use “Use these chars from file” and point to `charset_zh-Hant.txt`
   - Output: Type = “Text” (`.fnt`), Texture = PNG (8-bit), POT not required
4) Export to this folder as `han.fnt` + `han.png`.
5) Reload dev server; UI will automatically switch to the bitmap font when found.

Alternative (Node CLI: msdf-bmfont-xml)
- This can work, but standard bitmap (`.fnt + .png`) via BMFont is recommended for Phaser BitmapText.
- If you use msdf-bmfont-xml, ensure you output a bitmap atlas and a `.fnt`/text format compatible with Phaser; for example:

  npx msdf-bmfont-xml path/to/YourChinese.ttf \
    -o public/fonts/han \
    -f png --pot false --texture-size 1024,1024 \
    --font-size 16 --charset public/fonts/charset_zh-Hant.txt

Notes
- The UI mixes Chinese labels (BitmapText when available) and numeric values (custom tiny 5x7 BitmapText) to keep numbers extra crisp.
- If some characters still fall back or render missing, add them to the charset and regenerate.
