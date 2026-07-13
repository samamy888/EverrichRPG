import { describe, expect, it } from "vitest";
import {
  createBalancedTravelerSelection,
  getDefaultAppearanceForVariant,
  isTravelerNameCompatibleWithVariant,
  TRAVELER_FEMALE_GIVEN_NAMES,
  TRAVELER_MALE_GIVEN_NAMES,
  type TravelerProfile,
  type TravelerVariant
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

  it("matches child and elder variants by gender", () => {
    const maleName = `??${TRAVELER_MALE_GIVEN_NAMES[0]}`;
    const femaleName = `??${TRAVELER_FEMALE_GIVEN_NAMES[0]}`;

    expect(isTravelerNameCompatibleWithVariant(maleName, "child-male")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant(maleName, "elder-male")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant(maleName, "child-female")).toBe(false);
    expect(isTravelerNameCompatibleWithVariant(femaleName, "child-female")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant(femaleName, "elder-female")).toBe(true);
    expect(isTravelerNameCompatibleWithVariant(femaleName, "elder-male")).toBe(false);
  });

  it("selects a balanced traveler mix across paperdoll outfits", () => {
    const variants: TravelerVariant[] = [
      "paperdoll-blue-male",
      "paperdoll-green-male",
      "paperdoll-beige-male",
      "paperdoll-yellow-male",
      "paperdoll-coral-female",
      "paperdoll-yellow-female",
      "paperdoll-lavender-female"
    ];
    const travelers = Array.from({ length: variants.length * 3 }, (_, index) =>
      createTravelerProfile(index + 1, variants[index % variants.length]!)
    );

    const selected = createBalancedTravelerSelection(travelers, variants.length);

    expect(new Set(selected.map((traveler) => traveler.variant)).size).toBe(
      variants.length
    );
  });
});

function createTravelerProfile(
  index: number,
  variant: TravelerVariant
): TravelerProfile {
  return {
    id: `traveler-${index}`,
    name: `旅客${index}`,
    variant,
    appearance: getDefaultAppearanceForVariant(variant),
    dialogue: "我正在逛免稅店。",
    movementType: "wander",
    facing: "down",
    speed: 40
  };
}
