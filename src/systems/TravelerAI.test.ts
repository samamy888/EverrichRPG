import { describe, expect, it } from "vitest";
import { resolveFacingToward } from "./resolveFacingToward";

describe("resolveFacingToward", () => {
  it("faces horizontally toward the player", () => {
    expect(resolveFacingToward(100, 100, 60, 105)).toBe("left");
    expect(resolveFacingToward(100, 100, 140, 95)).toBe("right");
  });

  it("faces vertically toward the player", () => {
    expect(resolveFacingToward(100, 100, 104, 60)).toBe("up");
    expect(resolveFacingToward(100, 100, 96, 140)).toBe("down");
  });
});
