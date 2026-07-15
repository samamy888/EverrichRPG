export interface GroundShadowSource {
  x: number;
  baselineY: number;
  displayWidth: number;
  collision: {
    width: number;
    height: number;
  };
  decorative?: boolean;
  wallAttachment?: "north" | "west" | "east";
  grounding?: "ground" | "wall" | "suspended" | "none";
}

export interface GroundShadowMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export function resolveGroundingType(
  object: Pick<GroundShadowSource, "decorative" | "wallAttachment" | "grounding">
): NonNullable<GroundShadowSource["grounding"]> {
  if (object.grounding) return object.grounding;
  if (object.wallAttachment) return "wall";
  if (object.decorative) return "none";
  return "ground";
}

export function resolveGroundShadow(
  object: GroundShadowSource
): GroundShadowMetrics | null {
  if (resolveGroundingType(object) !== "ground") return null;

  const footprintWidth = object.collision.width > 0
    ? object.collision.width
    : object.displayWidth * 0.45;
  const footprintHeight = object.collision.height > 0
    ? object.collision.height
    : 8;

  return {
    x: object.x,
    y: object.baselineY - clamp(footprintHeight * 0.06, 1, 4),
    width: clamp(footprintWidth * 1.04, 10, object.displayWidth * 0.94),
    height: clamp(footprintHeight * 0.18, 3, 8)
  };
}
