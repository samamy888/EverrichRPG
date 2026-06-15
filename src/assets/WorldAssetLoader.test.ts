import { describe, expect, it } from "vitest";
import type {
  AssetLoadPort,
  SpriteSheetFrameConfig
} from "./AssetLoadPort";
import { WorldAssetLoader } from "./WorldAssetLoader";
import {
  WORLD_IMAGE_ASSETS,
  WORLD_SPRITESHEET_ASSETS
} from "./worldAssetCatalog";

class RecordingAssetLoader implements AssetLoadPort {
  readonly images: string[] = [];
  readonly sheets: string[] = [];

  image(key: string): void {
    this.images.push(key);
  }

  spritesheet(
    key: string,
    _url: string,
    _frameConfig: SpriteSheetFrameConfig
  ): void {
    this.sheets.push(key);
  }
}

describe("WorldAssetLoader", () => {
  it("loads every catalog asset through the port", () => {
    const port = new RecordingAssetLoader();

    new WorldAssetLoader(port).preload();

    expect(port.images).toHaveLength(WORLD_IMAGE_ASSETS.length);
    expect(port.sheets).toHaveLength(WORLD_SPRITESHEET_ASSETS.length);
  });

  it("keeps all asset keys unique", () => {
    const keys = [
      ...WORLD_IMAGE_ASSETS.map((asset) => asset.key),
      ...WORLD_SPRITESHEET_ASSETS.map((asset) => asset.key)
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });
});
