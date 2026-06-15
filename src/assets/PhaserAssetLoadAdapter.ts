import Phaser from "phaser";
import type {
  AssetLoadPort,
  SpriteSheetFrameConfig
} from "./AssetLoadPort";

export class PhaserAssetLoadAdapter implements AssetLoadPort {
  constructor(private readonly loader: Phaser.Loader.LoaderPlugin) {}

  image(key: string, url: string): void {
    this.loader.image(key, url);
  }

  spritesheet(
    key: string,
    url: string,
    frameConfig: SpriteSheetFrameConfig
  ): void {
    this.loader.spritesheet(key, url, frameConfig);
  }
}
