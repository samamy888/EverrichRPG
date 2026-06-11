import { CONFIG } from "../config";
import type { Facing, RegionId } from "../data/prototypeRegions";

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
  const raw = localStorage.getItem(CONFIG.saveKey);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PrototypeSave;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function savePrototype(value: PrototypeSave): void {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(value));
}

export function clearPrototypeSave(): void {
  localStorage.removeItem(CONFIG.saveKey);
  localStorage.removeItem(`${CONFIG.saveKey}-shop`);
  localStorage.removeItem(`${CONFIG.saveKey}-quest`);
  localStorage.removeItem(`${CONFIG.saveKey}-exploration`);
}
