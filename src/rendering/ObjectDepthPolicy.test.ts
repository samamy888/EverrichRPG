import { describe, expect, it } from "vitest";
import { resolveObjectDepth } from "./ObjectDepthPolicy";

describe("resolveObjectDepth", () => {
  it("sorts ordinary objects by their floor baseline", () => {
    expect(resolveObjectDepth({ baselineY: 160 })).toBe(160);
    expect(resolveObjectDepth({ baselineY: 176 })).toBeGreaterThan(
      resolveObjectDepth({ baselineY: 160 })
    );
  });

  it("applies foreground priority and explicit offsets deterministically", () => {
    expect(resolveObjectDepth({ baselineY: 160, foreground: true })).toBe(170);
    expect(resolveObjectDepth({ baselineY: 160, depthOffset: -20 })).toBe(140);
    expect(
      resolveObjectDepth({ baselineY: 160, foreground: true, depthOffset: 4 })
    ).toBe(174);
  });

  it("lets the player cross naturally behind and in front of an object baseline", () => {
    const objectDepth = resolveObjectDepth({ baselineY: 160 });
    expect(159).toBeLessThan(objectDepth);
    expect(161).toBeGreaterThan(objectDepth);
  });
});
