import Phaser from "phaser";

const KEYCAP_FONT = "fusion-pixel-12-bitmap";

export interface BitmapKeycapPromptOptions {
  keys: readonly string[];
  fontSize?: number;
  keyTextColor?: number;
  keyFillColor?: number;
  keyStrokeColor?: number;
  separatorColor?: number;
}

export function addBitmapKeycapPrompt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: BitmapKeycapPromptOptions
): Phaser.GameObjects.Container {
  const fontSize = options.fontSize ?? 12;
  const keyTextColor = options.keyTextColor ?? 0xfff2c7;
  const keyFillColor = options.keyFillColor ?? 0x17242b;
  const keyStrokeColor = options.keyStrokeColor ?? 0xd8b968;
  const separatorColor = options.separatorColor ?? 0x91aab1;
  const gap = 6;
  const elements: Phaser.GameObjects.GameObject[] = [];
  let cursorX = 0;

  for (const [index, key] of options.keys.entries()) {
    if (index > 0) {
      const separator = scene.add
        .bitmapText(cursorX, 0, KEYCAP_FONT, "/", fontSize)
        .setTint(separatorColor)
        .setOrigin(0, 0.5);
      elements.push(separator);
      cursorX += separator.width + gap;
    }

    const label = scene.add
      .bitmapText(cursorX + 8, 0, KEYCAP_FONT, key.toUpperCase(), fontSize)
      .setTint(keyTextColor)
      .setOrigin(0, 0.5);
    const width = Math.max(22, label.width + 16);
    const height = fontSize + 10;
    const background = scene.add
      .rectangle(cursorX, 0, width, height, keyFillColor, 0.96)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, keyStrokeColor);

    elements.push(background, label);
    cursorX += width + gap;
  }

  const container = scene.add.container(x - cursorX / 2, y, elements);
  return container;
}
