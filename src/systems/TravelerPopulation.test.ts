import { describe, expect, it } from "vitest";
import type { MapObjectData, RegionData } from "../data/prototypeRegions";
import {
  createRandomTravelerPopulation,
  isTravelerObject,
  type TravelerRandomSource
} from "./TravelerPopulation";

class SequenceRandom implements TravelerRandomSource {
  private index = 0;

  constructor(private readonly values: number[]) {}

  integer(minimum: number, maximum: number): number {
    const value = this.values[this.index++ % this.values.length] ?? 0;
    return minimum + Math.abs(value) % (maximum - minimum + 1);
  }

  pick<T>(values: readonly T[]): T {
    const value = values[this.integer(0, values.length - 1)];
    if (value === undefined) throw new Error("Test random source received an empty collection.");
    return value;
  }
}

const travelerTemplate: MapObjectData = {
  id: "story-traveler",
  texture: "traveler-male-npc",
  x: 240,
  baselineY: 240,
  displayWidth: 24,
  collision: { x: 234, y: 228, width: 12, height: 12 },
  label: "旅客",
  interaction: { title: "旅客", lines: ["你好"] },
  npcBehavior: {
    movementType: "wander",
    facing: "down",
    speed: 40,
    animationKey: "traveler-male"
  }
};

function createRegion(): RegionData {
  return {
    id: "departure-hall",
    name: "出境大廳",
    width: 640,
    height: 480,
    floorTexture: "floor-terrazzo",
    spawns: [{ id: "start", x: 64, y: 64, facing: "down" }],
    portals: [
      {
        id: "exit",
        bounds: { x: 288, y: 0, width: 64, height: 32 },
        destinationRegionId: "security-check",
        destinationSpawnId: "start"
      }
    ],
    boundaries: [
      { x: 0, y: 0, width: 640, height: 32, texture: "wall-ivory-panel" }
    ],
    objects: [
      {
        id: "counter",
        texture: "service-counter",
        x: 400,
        baselineY: 240,
        displayWidth: 64,
        collision: { x: 368, y: 208, width: 64, height: 32 }
      },
      travelerTemplate
    ]
  };
}

describe("TravelerPopulation", () => {
  it("creates the configured number of travelers with deterministic randomness", () => {
    const region = createRegion();
    const objects = createRandomTravelerPopulation(
      region,
      new SequenceRandom([0, 0, 0, 1, 2, 3, 4, 5, 6, 7])
    );
    const travelers = objects.filter(isTravelerObject);

    expect(travelers).toHaveLength(4);
    expect(travelers[0]?.id).toBe("story-traveler");
    expect(travelers.slice(1).every((traveler) => traveler.decorative)).toBe(true);
    expect(travelers.slice(1).every((traveler) => !traveler.interaction)).toBe(true);
  });

  it("does not place travelers inside solid objects or portals", () => {
    const region = createRegion();
    const objects = createRandomTravelerPopulation(
      region,
      new SequenceRandom([2, 1, 3, 8, 7, 5, 4, 6, 9, 10])
    );
    const travelers = objects.filter(isTravelerObject);
    const counter = region.objects.find((object) => object.id === "counter")!;
    const portal = region.portals[0]!;

    for (const traveler of travelers) {
      expect(intersects(traveler.collision, counter.collision)).toBe(false);
      expect(intersects(traveler.collision, portal.bounds)).toBe(false);
    }
  });

  it("leaves shop regions without traveler population settings unchanged", () => {
    const region = createRegion();
    region.id = "shop-beauty-01";

    expect(createRandomTravelerPopulation(region)).toBe(region.objects);
  });
});

function intersects(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}
