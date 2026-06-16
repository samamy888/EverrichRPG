// @ts-expect-error Vitest runs in Node; production TypeScript intentionally omits Node types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TRAVELER_FEMALE_GIVEN_NAMES,
  TRAVELER_FAMILY_NAMES,
  TRAVELER_MALE_GIVEN_NAMES
} from "../data/travelerDirectory";

describe("bitmap font coverage", () => {
  it("contains every character used by generated traveler names", () => {
    const charset = readFileSync(
      "public/assets/fonts/fusion-pixel-12/bitmap/charset.txt",
      "utf8"
    );
    const nameCharacters = new Set(
      [
        ...TRAVELER_FAMILY_NAMES,
        ...TRAVELER_MALE_GIVEN_NAMES,
        ...TRAVELER_FEMALE_GIVEN_NAMES
      ]
        .join("")
        .split("")
    );

    expect([...nameCharacters].filter((character) => !charset.includes(character))).toEqual(
      []
    );
  });
});
