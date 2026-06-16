import { CONFIG } from "../config";
import type { Facing, RegionId } from "../data/prototypeRegions";
import { gameStorage } from "../storage/GameStorage";

export type PlayerVariant = "male" | "female";

export interface PrototypeSave {
  version: 1;
  playerVariant: PlayerVariant;
  regionId: RegionId;
  spawnId: string;
  facing: Facing;
  movementMode?: "walk" | "run";
}

export function loadPrototypeSave(): PrototypeSave | null {
  return gameStorage.readJson(
    CONFIG.saveKey,
    () => null,
    (value): value is PrototypeSave =>
      typeof value === "object" &&
      value !== null &&
      "version" in value &&
      value.version === 1
  );
}

export function savePrototype(value: PrototypeSave): void {
  gameStorage.writeJson(CONFIG.saveKey, value);
}

export function clearPrototypeSave(): void {
  gameStorage.remove(CONFIG.saveKey);
  gameStorage.remove(`${CONFIG.saveKey}-shop`);
  gameStorage.remove(`${CONFIG.saveKey}-quest`);
  gameStorage.remove(`${CONFIG.saveKey}-exploration`);
}
