import { describe, expect, it } from "vitest";
import { findGridPath } from "./GridPathfinder";

describe("GridPathfinder", () => {
  it("routes around blocked cells", () => {
    const path = findGridPath(
      { x: 8, y: 8 },
      { x: 72, y: 8 },
      {
        width: 96,
        height: 96,
        cellSize: 16,
        isBlocked: (x, y) => x === 40 && y < 56
      }
    );

    expect(path.length).toBeGreaterThan(4);
    expect(path.some((point) => point.y >= 56)).toBe(true);
    expect(path.at(-1)).toEqual({ x: 72, y: 8 });
  });

  it("uses a nearby open destination when the click is blocked", () => {
    const path = findGridPath(
      { x: 8, y: 8 },
      { x: 40, y: 40 },
      {
        width: 96,
        height: 96,
        cellSize: 16,
        isBlocked: (x, y) => x === 40 && y === 40
      }
    );

    expect(path).not.toHaveLength(0);
    expect(path.at(-1)).not.toEqual({ x: 40, y: 40 });
  });
});
