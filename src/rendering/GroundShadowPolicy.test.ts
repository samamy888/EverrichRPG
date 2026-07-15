import { describe, expect, it } from "vitest";
import { resolveGroundingType, resolveGroundShadow } from "./GroundShadowPolicy";

describe("resolveGroundShadow", () => {
  it("uses the collision footprint and keeps the shadow under the baseline", () => {
    expect(resolveGroundShadow({
      x: 248,
      baselineY: 128,
      displayWidth: 176,
      collision: { width: 160, height: 32 }
    })).toEqual({
      x: 248,
      y: 126.08,
      width: 165.44,
      height: 5.76
    });
  });

  it("skips wall attachments and decorative overlays", () => {
    const base = {
      x: 32,
      baselineY: 64,
      displayWidth: 40,
      collision: { width: 32, height: 16 }
    };
    expect(resolveGroundShadow({ ...base, wallAttachment: "north" })).toBeNull();
    expect(resolveGroundShadow({ ...base, decorative: true })).toBeNull();
  });

  it("separates ground, wall, suspended and no-shadow policies", () => {
    expect(resolveGroundingType({})).toBe("ground");
    expect(resolveGroundingType({ wallAttachment: "north" })).toBe("wall");
    expect(resolveGroundingType({ decorative: true })).toBe("none");
    expect(resolveGroundingType({ decorative: true, grounding: "suspended" })).toBe(
      "suspended"
    );
  });
});
