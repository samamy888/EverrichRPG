import Phaser from "phaser";
import type { RegionData, RegionId } from "./prototypeRegions";
import {
  PhaserTiledRegionRepository,
  type TiledCacheCatalog,
} from "./tiled/PhaserTiledRegionRepository";

const MAP_CACHE_PREFIX = "tiled-map-";
const TILED_BASE_PATH = "/assets/maps/tiled";
const TILESET_CACHE_BY_FILE = {
  "airport-floors.tsj": "tiled-tileset-floors",
  "airport-props.tsj": "tiled-tileset-props",
  "airport-npcs.tsj": "tiled-tileset-npcs",
} as const;

export const TILED_REGION_IDS = [
  "duty-free-entrance",
  "security-check",
  "departure-hall",
  "information-core",
  "airport-facilities",
  "duty-free-central",
  "shop-beauty-01",
  "shop-liquor-food-01",
  "shop-gift-01",
] as const satisfies readonly RegionId[];

const cacheCatalog: TiledCacheCatalog = {
  mapKey: (regionId) => `${MAP_CACHE_PREFIX}${regionId}`,
  tilesetKey: (source) => {
    const fileName = source.split("/").at(-1);
    return fileName
      ? TILESET_CACHE_BY_FILE[
          fileName as keyof typeof TILESET_CACHE_BY_FILE
        ]
      : undefined;
  },
};

export function preloadTiledRegions(scene: Phaser.Scene): void {
  for (const [fileName, cacheKey] of Object.entries(TILESET_CACHE_BY_FILE)) {
    scene.load.json(cacheKey, `${TILED_BASE_PATH}/tilesets/${fileName}`);
  }

  for (const regionId of TILED_REGION_IDS) {
    scene.load.json(
      cacheCatalog.mapKey(regionId),
      `${TILED_BASE_PATH}/regions/${regionId}.tmj`,
    );
  }
}

export function loadTiledRegion(
  scene: Phaser.Scene,
  regionId: RegionId,
): RegionData | null {
  return new PhaserTiledRegionRepository(scene, cacheCatalog).find(regionId);
}
