import type Phaser from "phaser";
import type { RegionData, RegionId } from "../prototypeRegions";
import { TiledRegionParser } from "./TiledRegionParser";
import type {
  TiledMap,
  TiledTileset,
  TiledTilesetCollection,
} from "./TiledTypes";

export interface TiledCacheCatalog {
  mapKey(regionId: RegionId): string;
  tilesetKey(source: string): string | undefined;
}

export class PhaserTiledRegionRepository {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly catalog: TiledCacheCatalog,
    private readonly parser = new TiledRegionParser(),
  ) {}

  find(regionId: RegionId): RegionData | null {
    const map = this.scene.cache.json.get(
      this.catalog.mapKey(regionId),
    ) as TiledMap | undefined;
    if (!map) {
      return null;
    }

    return this.parser.parse(regionId, map, this.readTilesets(map));
  }

  private readTilesets(map: TiledMap): TiledTilesetCollection {
    const tilesets = new Map<string, TiledTileset>();
    for (const reference of map.tilesets) {
      const cacheKey = this.catalog.tilesetKey(reference.source);
      if (!cacheKey) {
        continue;
      }

      const tileset = this.scene.cache.json.get(cacheKey) as
        | TiledTileset
        | undefined;
      if (tileset) {
        tilesets.set(reference.source, tileset);
      }
    }

    return tilesets;
  }
}
