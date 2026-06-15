import type { AssetLoadPort } from "./AssetLoadPort";
import {
  WORLD_IMAGE_ASSETS,
  WORLD_SPRITESHEET_ASSETS
} from "./worldAssetCatalog";

export class WorldAssetLoader {
  constructor(private readonly loader: AssetLoadPort) {}

  preload(): void {
    for (const asset of WORLD_IMAGE_ASSETS) {
      this.loader.image(asset.key, asset.url);
    }
    for (const asset of WORLD_SPRITESHEET_ASSETS) {
      this.loader.spritesheet(asset.key, asset.url, asset.frameConfig);
    }
  }
}
