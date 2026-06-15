export interface SpriteSheetFrameConfig {
  frameWidth: number;
  frameHeight: number;
}

export interface AssetLoadPort {
  image(key: string, url: string): void;
  spritesheet(key: string, url: string, frameConfig: SpriteSheetFrameConfig): void;
}
