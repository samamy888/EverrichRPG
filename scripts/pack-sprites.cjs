const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const SPRITE_DIR = path.join(__dirname, '../public/sprites/character');
const OUTPUT_IMAGE = path.join(__dirname, '../public/sprites/characters_atlas.png');
const OUTPUT_JSON = path.join(__dirname, '../public/sprites/characters_atlas.json');

const FRAME_SIZE = 32;

async function pack() {
  const files = fs.readdirSync(SPRITE_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} spritesheets.`);

  const atlasData = {
    frames: {},
    meta: {
      app: "EverrichRPG Sprite Packer",
      version: "1.0",
      image: "characters_atlas.png",
      format: "RGBA8888",
      size: { w: 0, h: 0 },
      scale: "1"
    }
  };

  const sheets = [];
  let maxWidth = 0;
  let totalHeight = 0;

  for (const file of files) {
    const image = await Jimp.read(path.join(SPRITE_DIR, file));
    const name = path.parse(file).name;
    sheets.push({ name, image });
    maxWidth = Math.max(maxWidth, image.bitmap.width);
    totalHeight += image.bitmap.height;
  }

  // Create atlas canvas
  const atlas = new Jimp({ width: maxWidth, height: totalHeight, color: 0x00000000 });
  let currentY = 0;

  for (const sheet of sheets) {
    atlas.composite(sheet.image, 0, currentY);
    
    const cols = sheet.image.bitmap.width / FRAME_SIZE;
    const rows = sheet.image.bitmap.height / FRAME_SIZE;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const frameName = `${sheet.name}_${r}_${c}`;
        atlasData.frames[frameName] = {
          frame: { x: c * FRAME_SIZE, y: currentY + r * FRAME_SIZE, w: FRAME_SIZE, h: FRAME_SIZE },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: FRAME_SIZE, h: FRAME_SIZE },
          sourceSize: { w: FRAME_SIZE, h: FRAME_SIZE },
          pivot: { x: 0.5, y: 0.5 }
        };
      }
    }
    currentY += sheet.image.bitmap.height;
  }

  atlasData.meta.size = { w: maxWidth, h: totalHeight };

  await atlas.write(OUTPUT_IMAGE);
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(atlasData, null, 2));

  console.log(`Atlas created: ${OUTPUT_IMAGE}`);
  console.log(`JSON created: ${OUTPUT_JSON}`);
}

pack().catch(console.error);
