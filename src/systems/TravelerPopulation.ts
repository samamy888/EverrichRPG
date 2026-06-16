import { CONFIG } from "../config";
import type {
  MapObjectData,
  RectData,
  RegionData
} from "../data/prototypeRegions";
import {
  getTravelersForRegion,
  type TravelerProfile
} from "../data/travelerDirectory";

export type { TravelerVariant } from "../data/travelerDirectory";

export interface TravelerRandomSource {
  integer(minimum: number, maximum: number): number;
  pick<T>(values: readonly T[]): T;
}

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
  random: TravelerRandomSource = defaultRandomSource,
  roster: readonly TravelerProfile[] = getTravelersForRegion(region.id)
): MapObjectData[] {
  const travelerTemplates = region.objects.filter(isTravelerObject);
  const staticObjects = region.objects.filter((object) => !isTravelerObject(object));
  if (roster.length === 0) {
    return staticObjects;
  }

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
  const randomizedTravelers: MapObjectData[] = [];

  for (const profile of roster) {
    const template =
      travelerTemplates[random.integer(0, Math.max(0, travelerTemplates.length - 1))];
    const traveler = createTravelerObject(region, profile, template);
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

function createTravelerObject(
  region: RegionData,
  profile: TravelerProfile,
  template?: MapObjectData
): MapObjectData {
  return {
    id: profile.id,
    texture: `traveler-${profile.variant}-npc`,
    x: template?.x ?? region.width / 2,
    baselineY: template?.baselineY ?? region.height / 2,
    displayWidth: CONFIG.characterDisplaySize,
    displayHeight: CONFIG.characterDisplaySize,
    collision: template?.collision ?? {
      x: region.width / 2 - 6,
      y: region.height / 2 - 12,
      width: 12,
      height: 12
    },
    label: profile.name,
    interaction: {
      title: profile.name,
      lines: [profile.dialogue]
    },
    npcBehavior: {
      movementType: profile.movementType,
      facing: profile.facing,
      speed: profile.speed,
      animationKey: `traveler-${profile.variant}`
    }
  };
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

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const anchor = templates.length > 0 ? random.pick(templates) : undefined;
    const collisionX = anchor
      ? anchor.collision.x + random.integer(-6, 6) * CONFIG.tileSize
      : random.integer(
          margin,
          Math.max(margin, region.width - margin - traveler.collision.width)
        );
    const collisionY = anchor
      ? anchor.collision.y + random.integer(-5, 5) * CONFIG.tileSize
      : random.integer(
          margin,
          Math.max(margin, region.height - margin - traveler.collision.height)
        );
    const collision: RectData = {
      x: collisionX,
      y: collisionY,
      width: traveler.collision.width,
      height: traveler.collision.height
    };

    if (
      !isTravelerPlacementAvailable(
        collision,
        region,
        blockedBounds,
        portalBounds,
        occupiedTravelerBounds,
        margin
      )
    ) {
      continue;
    }

    return toTravelerPlacement(collision);
  }

  for (
    let y = margin;
    y <= region.height - margin - traveler.collision.height;
    y += CONFIG.tileSize
  ) {
    for (
      let x = margin;
      x <= region.width - margin - traveler.collision.width;
      x += CONFIG.tileSize
    ) {
      const collision = {
        x,
        y,
        width: traveler.collision.width,
        height: traveler.collision.height
      };
      if (
        isTravelerPlacementAvailable(
          collision,
          region,
          blockedBounds,
          portalBounds,
          occupiedTravelerBounds,
          margin
        )
      ) {
        return toTravelerPlacement(collision);
      }
    }
  }

  return null;
}

function isTravelerPlacementAvailable(
  collision: RectData,
  region: RegionData,
  blockedBounds: RectData[],
  portalBounds: RectData[],
  occupiedTravelerBounds: RectData[],
  margin: number
): boolean {
  if (
    collision.x < margin ||
    collision.y < margin ||
    collision.x + collision.width > region.width - margin ||
    collision.y + collision.height > region.height - margin
  ) {
    return false;
  }

  return !(
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
  );
}

function toTravelerPlacement(
  collision: RectData
): Pick<MapObjectData, "x" | "baselineY" | "collision"> {
  return {
    x: collision.x + collision.width / 2,
    baselineY: collision.y + collision.height,
    collision
  };
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
