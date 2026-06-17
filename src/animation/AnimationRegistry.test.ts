import { describe, expect, it } from "vitest";
import type {
  AnimationDefinition,
  AnimationGateway
} from "./AnimationDefinition";
import { AnimationRegistry } from "./AnimationRegistry";
import {
  CHARACTER_SELECT_ANIMATION_DEFINITIONS,
  getPlayerIdleFrame,
  getPlayerMovementAnimationKey,
  isDiagonalPlayerFacing,
  resolveObjectAnimation,
  WORLD_ANIMATION_DEFINITIONS
} from "./animationCatalog";

class RecordingGateway implements AnimationGateway {
  readonly created: AnimationDefinition[] = [];
  readonly existing = new Set<string>();

  exists(key: string): boolean {
    return this.existing.has(key);
  }

  create(definition: AnimationDefinition): void {
    this.created.push(definition);
    this.existing.add(definition.key);
  }
}

describe("AnimationRegistry", () => {
  it("registers definitions once through the gateway", () => {
    const gateway = new RecordingGateway();
    const registry = new AnimationRegistry(gateway);

    registry.register(CHARACTER_SELECT_ANIMATION_DEFINITIONS);
    registry.register(CHARACTER_SELECT_ANIMATION_DEFINITIONS);

    expect(gateway.created).toHaveLength(2);
  });

  it("keeps animation keys unique", () => {
    const keys = [
      ...WORLD_ANIMATION_DEFINITIONS,
      ...CHARACTER_SELECT_ANIMATION_DEFINITIONS
    ].map((definition) => definition.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves object and player animations without Phaser dependencies", () => {
    expect(resolveObjectAnimation("airport-vending-machine")).toBe(
      "airport-vending-machine-cycle"
    );
    expect(resolveObjectAnimation("airport-ad-column")).toBe(
      "airport-ad-column-screen-cycle"
    );
    expect(resolveObjectAnimation("airport-moving-walkway")).toBe(
      "airport-moving-walkway-cycle"
    );
    expect(resolveObjectAnimation("airport-escalator-animated-south")).toBe(
      "airport-escalator-south-cycle"
    );
    expect(getPlayerMovementAnimationKey("female", "left", true)).toBe(
      "female-left-run"
    );
    expect(getPlayerMovementAnimationKey("male", "up-right", false)).toBe(
      "male-up-right-walk"
    );
    expect(isDiagonalPlayerFacing("up-right")).toBe(true);
    expect(getPlayerIdleFrame("up")).toBe(3);
  });
});
