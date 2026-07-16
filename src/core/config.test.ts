import { describe, expect, it } from "vitest";
import { APP_NAME } from "./config";

describe("application configuration", () => {
  it("has a stable application name", () => {
    expect(APP_NAME).toBe("Everrich RPG");
  });
});
