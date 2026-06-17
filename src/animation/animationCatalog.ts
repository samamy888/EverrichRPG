import type { Facing, MapObjectTexture } from "../data/prototypeRegions";
import type { PlayerVariant } from "../systems/prototypeSave";
import type { AnimationDefinition } from "./AnimationDefinition";

export type PlayerAnimationFacing =
  | Facing
  | "down-left"
  | "down-right"
  | "up-left"
  | "up-right";

const FACING_ROWS: Readonly<Record<Facing, number>> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3
};

const DIAGONAL_FACING_ROWS: Readonly<
  Record<Exclude<PlayerAnimationFacing, Facing>, number>
> = {
  "down-left": 0,
  "down-right": 1,
  "up-left": 2,
  "up-right": 3
};

const OBJECT_ANIMATION_BY_TEXTURE: Readonly<
  Partial<Record<MapObjectTexture, string>>
> = {
  "clerk-beauty-01": "clerk-beauty-01-work",
  "clerk-liquor-food-01": "clerk-liquor-food-01-work",
  "clerk-gift-01": "clerk-gift-01-work",
  "airport-long-kiosk": "airport-long-kiosk-screen-cycle",
  "airport-self-order-kiosk": "airport-self-order-kiosk-screen-cycle",
  "airport-restroom-animated": "airport-restroom-light-cycle",
  "airport-water-dispenser-animated": "airport-water-dispenser-cycle",
  "airport-planter-animated-south": "airport-planter-south-sway",
  "airport-planter-animated-west": "airport-planter-west-sway",
  "airport-planter-animated-east": "airport-planter-east-sway",
  "airport-planter-animated-north": "airport-planter-north-sway",
  "airport-vending-machine": "airport-vending-machine-cycle",
  "airport-ad-column": "airport-ad-column-screen-cycle",
  "airport-atrium-lamp": "airport-atrium-lamp-light-cycle",
  "airport-moving-walkway": "airport-moving-walkway-cycle",
  "airport-escalator-animated-south": "airport-escalator-south-cycle"
};

export const WORLD_ANIMATION_DEFINITIONS: readonly AnimationDefinition[] = [
  ...createPlayerAnimationDefinitions(),
  ...createClerkAnimationDefinitions(),
  {
    key: "airport-long-kiosk-screen-cycle",
    texture: "airport-long-kiosk",
    startFrame: 0,
    endFrame: 3,
    frameRate: 0.7,
    repeat: -1
  },
  {
    key: "airport-self-order-kiosk-screen-cycle",
    texture: "airport-self-order-kiosk",
    startFrame: 0,
    endFrame: 3,
    frameRate: 0.7,
    repeat: -1
  },
  ...[
    ["airport-restroom-light-cycle", "airport-restroom-animated", 1.4],
    ["airport-water-dispenser-cycle", "airport-water-dispenser-animated", 2.4],
    ["airport-vending-machine-cycle", "airport-vending-machine", 1.5],
    ["airport-ad-column-screen-cycle", "airport-ad-column", 1.25],
    ["airport-atrium-lamp-light-cycle", "airport-atrium-lamp", 1.55],
    ["airport-moving-walkway-cycle", "airport-moving-walkway", 4],
    ["airport-escalator-south-cycle", "airport-escalator-animated-south", 3.4]
  ].map<AnimationDefinition>(([key, texture, frameRate]) => ({
    key: String(key),
    texture: String(texture),
    startFrame: 0,
    endFrame: 3,
    frameRate: Number(frameRate),
    repeat: -1
  })),
  ...(["south", "west", "east", "north"] as const).map<AnimationDefinition>(
    (direction) => ({
      key: `airport-planter-${direction}-sway`,
      texture: `airport-planter-animated-${direction}`,
      startFrame: 0,
      endFrame: 3,
      frameRate: 1.55,
      repeat: -1
    })
  )
];

export const CHARACTER_SELECT_ANIMATION_DEFINITIONS: readonly AnimationDefinition[] = (
  ["male", "female"] as const
).map((variant) => ({
  key: `${variant}-character-select-walk`,
  texture: `character-select-${variant}`,
  startFrame: 0,
  endFrame: 3,
  frameRate: 8,
  repeat: -1
}));

export function resolveObjectAnimation(
  texture: MapObjectTexture
): string | undefined {
  return OBJECT_ANIMATION_BY_TEXTURE[texture];
}

export function isAnimatedObjectTexture(texture: MapObjectTexture): boolean {
  return resolveObjectAnimation(texture) !== undefined;
}

export function getPlayerIdleFrame(facing: Facing): number {
  return FACING_ROWS[facing];
}

export function getPlayerMovementAnimationKey(
  variant: PlayerVariant,
  facing: PlayerAnimationFacing,
  running: boolean
): string {
  return `${variant}-${facing}-${running ? "run" : "walk"}`;
}

export function isDiagonalPlayerFacing(
  facing: PlayerAnimationFacing
): facing is Exclude<PlayerAnimationFacing, Facing> {
  return facing in DIAGONAL_FACING_ROWS;
}

function createPlayerAnimationDefinitions(): AnimationDefinition[] {
  const definitions: AnimationDefinition[] = [];
  for (const variant of ["male", "female"] as const) {
    for (const [facing, row] of Object.entries(FACING_ROWS) as Array<
      [Facing, number]
    >) {
      for (const [speed, frameRate] of [
        ["walk", 13],
        ["run", 22]
      ] as const) {
        definitions.push({
          key: `${variant}-${facing}-${speed}`,
          texture: `traveler-${variant}-sheet`,
          startFrame: row * 4,
          endFrame: row * 4 + 3,
          frameRate,
          repeat: -1
        });
      }
    }
    for (const [facing, row] of Object.entries(DIAGONAL_FACING_ROWS) as Array<
      [Exclude<PlayerAnimationFacing, Facing>, number]
    >) {
      for (const [speed, frameRate] of [
        ["walk", 13],
        ["run", 22]
      ] as const) {
        definitions.push({
          key: `${variant}-${facing}-${speed}`,
          texture: `traveler-${variant}-diagonal-sheet`,
          startFrame: row * 4,
          endFrame: row * 4 + 3,
          frameRate,
          repeat: -1
        });
      }
    }
  }
  return definitions;
}

function createClerkAnimationDefinitions(): AnimationDefinition[] {
  return [
    ["clerk-beauty-01-work", 0],
    ["clerk-liquor-food-01-work", 4],
    ["clerk-gift-01-work", 8]
  ].map<AnimationDefinition>(([key, startFrame]) => ({
    key: String(key),
    texture: "duty-free-clerks-animated-v2",
    startFrame: Number(startFrame),
    endFrame: Number(startFrame) + 3,
    frameRate: 3.5,
    repeat: -1
  }));
}
