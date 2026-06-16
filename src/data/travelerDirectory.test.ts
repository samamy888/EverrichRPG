import { describe, expect, it } from "vitest";
import {
  isTravelerNameCompatibleWithVariant,
  TRAVELER_FEMALE_GIVEN_NAMES,
  TRAVELER_MALE_GIVEN_NAMES
} from "./travelerDirectory";

describe("traveler name compatibility", () => {
  it("keeps male and female given-name pools separate", () => {
    expect(
      TRAVELER_MALE_GIVEN_NAMES.filter((name) =>
        TRAVELER_FEMALE_GIVEN_NAMES.includes(
          name as (typeof TRAVELER_FEMALE_GIVEN_NAMES)[number]
        )
      )
    ).toEqual([]);
  });

  it("matches names only to their corresponding variant", () => {
    expect(isTravelerNameCompatibleWithVariant("陳宇軒", "male")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant("陳宇軒", "female")).toBe(false);
    expect(isTravelerNameCompatibleWithVariant("林雅婷", "female")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant("林雅婷", "male")).toBe(false);
  });
});
