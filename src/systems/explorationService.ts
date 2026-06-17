import { CONFIG } from "../config";
import type { MapObjectData, RegionId } from "../data/prototypeRegions";
import { gameStorage, type GameStorage } from "../storage/GameStorage";
import collectibleData from "../../game/content/exploration/hidden-collectibles.json";

export interface HiddenCollectible {
  id: string;
  objectId: string;
  regionId: RegionId;
  name: string;
  description: string;
}

export interface ExplorationSave {
  version: 1;
  currentRegionId: RegionId;
  visitedRegionIds: RegionId[];
  metNpcIds: string[];
  collectibleIds: string[];
}

export const REGION_LABELS: Record<RegionId, string> = {
  "duty-free-entrance": "免稅商店街入口",
  "security-check": "安全檢查區",
  "departure-hall": "三樓出境大廳",
  "information-core": "旅客服務中心",
  "airport-facilities": "機場設施區",
  "duty-free-central": "中央免稅商店街",
  "shop-beauty-01": "美妝香氛免稅店",
  "shop-liquor-food-01": "酒類食品免稅店",
  "shop-gift-01": "台灣禮品免稅店"
};

export const REGION_ORDER = Object.keys(REGION_LABELS) as RegionId[];

export const HIDDEN_COLLECTIBLES =
  collectibleData.collectibles as HiddenCollectible[];

const saveKey = `${CONFIG.saveKey}-exploration`;

function createInitialState(): ExplorationSave {
  return {
    version: 1,
    currentRegionId: "duty-free-entrance",
    visitedRegionIds: ["duty-free-entrance"],
    metNpcIds: [],
    collectibleIds: []
  };
}

export class ExplorationService {
  private state: ExplorationSave;

  constructor(private readonly storage: GameStorage = gameStorage) {
    this.state = this.load();
  }

  getState(): ExplorationSave {
    return structuredClone(this.state);
  }

  visitRegion(regionId: RegionId): void {
    const changed =
      this.state.currentRegionId !== regionId ||
      !this.state.visitedRegionIds.includes(regionId);
    this.state.currentRegionId = regionId;
    if (!this.state.visitedRegionIds.includes(regionId)) {
      this.state.visitedRegionIds.push(regionId);
    }
    if (changed) this.persist();
  }

  meetNpc(object: MapObjectData): void {
    const isNpc =
      object.texture.startsWith("clerk-") ||
      object.texture.startsWith("traveler-");
    if (!isNpc || this.state.metNpcIds.includes(object.id)) return;
    this.state.metNpcIds.push(object.id);
    this.persist();
  }

  discoverCollectible(
    regionId: RegionId,
    objectId: string
  ): HiddenCollectible | null {
    const collectible = HIDDEN_COLLECTIBLES.find(
      (candidate) =>
        candidate.regionId === regionId && candidate.objectId === objectId
    );
    if (!collectible || this.state.collectibleIds.includes(collectible.id)) {
      return null;
    }
    this.state.collectibleIds.push(collectible.id);
    this.persist();
    return collectible;
  }

  getExplorationPercent(): number {
    const regionPoints = this.state.visitedRegionIds.length;
    const npcPoints = this.state.metNpcIds.length;
    const collectiblePoints = this.state.collectibleIds.length;
    const total = REGION_ORDER.length + 11 + HIDDEN_COLLECTIBLES.length;
    return Math.round(
      ((regionPoints + npcPoints + collectiblePoints) / total) * 100
    );
  }

  reset(): void {
    this.state = createInitialState();
    this.persist();
  }

  private load(): ExplorationSave {
    return this.storage.readJson(
      saveKey,
      createInitialState,
      (value): value is ExplorationSave =>
        typeof value === "object" &&
        value !== null &&
        "version" in value &&
        value.version === 1
    );
  }

  private persist(): void {
    this.storage.writeJson(saveKey, this.state);
    window.dispatchEvent(new CustomEvent("prototype:exploration-state"));
  }
}

export const explorationService = new ExplorationService();
