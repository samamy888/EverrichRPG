import { CONFIG } from "../config";
import type {
  Facing,
  MapObjectData,
  RectData,
  RegionData,
  RegionId
} from "../data/prototypeRegions";

export type TravelerVariant = "male" | "female";

export interface TravelerRandomSource {
  integer(minimum: number, maximum: number): number;
  pick<T>(values: readonly T[]): T;
}

const TRAVELER_VARIANTS: readonly TravelerVariant[] = ["male", "female"];
const TRAVELER_FACING: readonly Facing[] = ["up", "down", "left", "right"];
const TRAVELER_POPULATION: Partial<Record<RegionId, readonly [number, number]>> = {
  "duty-free-entrance": [2, 4],
  "security-check": [2, 4],
  "departure-hall": [4, 7],
  "information-core": [2, 4],
  "airport-facilities": [2, 4],
  "duty-free-central": [4, 7]
};

const defaultRandomSource: TravelerRandomSource = {
  integer(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  },
  pick<T>(values: readonly T[]): T {
    const value = values[Math.floor(Math.random() * values.length)];
    if (value === undefined) throw new Error("Cannot pick from an empty collection.");
    return value;
  }
};

export function createRandomTravelerPopulation(
  region: RegionData,
  random: TravelerRandomSource = defaultRandomSource
): MapObjectData[] {
  const travelerTemplates = region.objects.filter(isTravelerObject);
  const populationRange = TRAVELER_POPULATION[region.id];
  if (!populationRange || travelerTemplates.length === 0) return region.objects;

  const staticObjects = region.objects.filter((object) => !isTravelerObject(object));
  const blockedBounds = [
    ...region.boundaries.map<RectData>((boundary) => ({
      x: boundary.x,
      y: boundary.y,
      width: boundary.width,
      height: boundary.height
    })),
    ...staticObjects
      .filter((object) => !object.decorative)
      .map((object) => object.collision)
  ];
  const portalBounds = region.portals.map((portal) => portal.bounds);
  const occupiedTravelerBounds: RectData[] = [];
  const targetCount = random.integer(populationRange[0], populationRange[1]);
  const randomizedTravelers: MapObjectData[] = [];

  for (let index = 0; index < targetCount; index += 1) {
    const template = travelerTemplates[index % travelerTemplates.length]!;
    const traveler = structuredClone(template);
    const variant = random.pick(TRAVELER_VARIANTS);
    const facing = random.pick(TRAVELER_FACING);
    const isAmbientTraveler = index >= travelerTemplates.length;

    traveler.id = isAmbientTraveler
      ? `${region.id}-ambient-traveler-${index + 1}`
      : template.id;
    traveler.texture = `traveler-${variant}-npc`;
    traveler.npcBehavior = {
      movementType:
        template.npcBehavior?.movementType === "idle" && !isAmbientTraveler
          ? "idle"
          : random.integer(0, 4) === 0
            ? "patrol"
            : "wander",
      facing,
      speed: random.integer(34, 58),
      animationKey: `traveler-${variant}`
    };

    if (isAmbientTraveler) {
      traveler.decorative = true;
      delete traveler.label;
      delete traveler.interaction;
    }

    const placement = findRandomTravelerPlacement(
      traveler,
      travelerTemplates,
      region,
      blockedBounds,
      portalBounds,
      occupiedTravelerBounds,
      random
    );
    if (!placement) continue;

    traveler.x = placement.x;
    traveler.baselineY = placement.baselineY;
    traveler.collision = placement.collision;
    occupiedTravelerBounds.push(placement.collision);
    randomizedTravelers.push(traveler);
  }

  return [...staticObjects, ...randomizedTravelers];
}

export function isTravelerObject(object: MapObjectData): boolean {
  return (
    object.texture === "traveler-male-npc" ||
    object.texture === "traveler-female-npc" ||
    object.npcBehavior?.animationKey === "traveler-male" ||
    object.npcBehavior?.animationKey === "traveler-female"
  );
}

function findRandomTravelerPlacement(
  traveler: MapObjectData,
  templates: MapObjectData[],
  region: RegionData,
  blockedBounds: RectData[],
  portalBounds: RectData[],
  occupiedTravelerBounds: RectData[],
  random: TravelerRandomSource
): Pick<MapObjectData, "x" | "baselineY" | "collision"> | null {
  const margin = CONFIG.tileSize;

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const anchor = random.pick(templates);
    const deltaX = random.integer(-6, 6) * CONFIG.tileSize;
    const deltaY = random.integer(-5, 5) * CONFIG.tileSize;
    const collision: RectData = {
      x: anchor.collision.x + deltaX,
      y: anchor.collision.y + deltaY,
      width: traveler.collision.width,
      height: traveler.collision.height
    };

    if (
      collision.x < margin ||
      collision.y < margin ||
      collision.x + collision.width > region.width - margin ||
      collision.y + collision.height > region.height - margin
    ) {
      continue;
    }
    if (
      blockedBounds.some((bounds) => rectanglesIntersect(bounds, collision)) ||
      portalBounds.some((bounds) => rectanglesIntersect(bounds, collision)) ||
      occupiedTravelerBounds.some((bounds) => rectanglesIntersect(bounds, collision)) ||
      region.spawns.some(
        (spawn) =>
          distance(
            collision.x + collision.width / 2,
            collision.y + collision.height / 2,
            spawn.x,
            spawn.y
          ) < CONFIG.tileSize * 2
      )
    ) {
      continue;
    }

    return {
      x: anchor.x + deltaX,
      baselineY: anchor.baselineY + deltaY,
      collision
    };
  }

  return null;
}

function rectanglesIntersect(left: RectData, right: RectData): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
