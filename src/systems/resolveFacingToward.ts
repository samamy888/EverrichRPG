import type { Facing } from "../data/prototypeRegions";

export function resolveFacingToward(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): Facing {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  return Math.abs(deltaX) > Math.abs(deltaY)
    ? deltaX < 0
      ? "left"
      : "right"
    : deltaY < 0
      ? "up"
      : "down";
}
