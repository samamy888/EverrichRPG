import Phaser from 'phaser';

// Register a tiny 5x7 bitmap font for ASCII numerics and symbols we need
// Supported: space, 0-9, ':', '$'
export function registerTinyBitmapFont(scene: Phaser.Scene, key = 'tiny5x7') {
  const glyphW = 5;
  const glyphH = 7;
  const spacingX = 1;
  const chars = ' 0123456789:$';

  const bitmaps: Record<string, string[]> = {
    ' ': [
      '00000','00000','00000','00000','00000','00000','00000',
    ],
    '0': [
      '01110','10001','10011','10101','11001','10001','01110',
    ],
    '1': [
      '00100','01100','00100','00100','00100','00100','01110',
    ],
    '2': [
      '01110','10001','00001','00010','00100','01000','11111',
    ],
    '3': [
      '11110','00001','00001','01110','00001','00001','11110',
    ],
    '4': [
      '00010','00110','01010','10010','11111','00010','00010',
    ],
    '5': [
      '11111','10000','11110','00001','00001','10001','01110',
    ],
    '6': [
      '00110','01000','10000','11110','10001','10001','01110',
    ],
    '7': [
      '11111','00001','00010','00100','01000','10000','10000',
    ],
    '8': [
      '01110','10001','10001','01110','10001','10001','01110',
    ],
    '9': [
      '01110','10001','10001','01111','00001','00010','01100',
    ],
    ':': [
      '00000','00100','00100','00000','00100','00100','00000',
    ],
    '$': [
      '00100','01111','10100','01110','00101','11110','00100',
    ],
  };

  const cols = chars.length;
  const texW = cols * (glyphW + spacingX);
  const texH = glyphH;
  const keyImage = `${key}-image`;

  const canvas = scene.textures.createCanvas(keyImage, texW, texH);
  const ctx = canvas.getContext();
  ctx.clearRect(0, 0, texW, texH);
  ctx.imageSmoothingEnabled = false as any;
  ctx.fillStyle = '#ffffff';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const bmp = bitmaps[ch];
    const ox = i * (glyphW + spacingX);
    if (!bmp) continue;
    for (let y = 0; y < glyphH; y++) {
      const row = bmp[y];
      for (let x = 0; x < glyphW; x++) {
        if (row[x] === '1') ctx.fillRect(ox + x, y, 1, 1);
      }
    }
  }
  canvas.refresh();

  const config: any = {
    image: keyImage,
    width: glyphW,
    height: glyphH,
    chars,
    charsPerRow: cols,
    spacing: { x: spacingX, y: 0 },
  };
  const data = (Phaser.GameObjects as any).RetroFont.Parse(scene, config);
  scene.cache.bitmapFont.add(key, data);
}

