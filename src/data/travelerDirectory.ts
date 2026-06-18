import { CONFIG } from "../config";
import {
  getPaperdollRecipeByVariant,
  getPaperdollVariantForAppearance as findPaperdollVariantForAppearance
} from "./paperdollRecipes";
import type {
  Facing,
  NpcMovementType,
  RegionId
} from "./prototypeRegions";

export type TravelerVariant =
  | "male"
  | "female"
  | "child-male"
  | "child-female"
  | "elder-male"
  | "elder-female"
  | "paperdoll-blue-male"
  | "paperdoll-green-male"
  | "paperdoll-beige-male"
  | "paperdoll-yellow-male"
  | "paperdoll-coral-female"
  | "paperdoll-yellow-female"
  | "paperdoll-lavender-female";

export type TravelerGender = "male" | "female";
export type TravelerAgeGroup = "adult" | "child" | "elder";
export type TravelerHairStyle =
  | "tousled-brown"
  | "sidepart-black"
  | "bob-brown"
  | "silver-short"
  | "silver-bob";
export type TravelerTop =
  | "blue-travel-jacket"
  | "green-hoodie"
  | "coral-jacket"
  | "yellow-cardigan"
  | "beige-cardigan"
  | "lavender-cardigan";
export type TravelerPants =
  | "dark-trousers"
  | "beige-chinos"
  | "navy-pants"
  | "teal-skirt"
  | "charcoal-pants"
  | "dark-skirt";

export interface TravelerAppearance {
  gender: TravelerGender;
  ageGroup: TravelerAgeGroup;
  hairStyle: TravelerHairStyle;
  top: TravelerTop;
  pants: TravelerPants;
}

export interface TravelerProfile {
  id: string;
  name: string;
  variant: TravelerVariant;
  appearance: TravelerAppearance;
  dialogue: string;
  movementType: NpcMovementType;
  facing: Facing;
  speed: number;
}

interface TravelerRosterResponse {
  schemaVersion: number;
  travelers: TravelerRosterItem[];
}

type TravelerRosterItem = Omit<TravelerProfile, "appearance"> &
  Partial<TravelerAppearance> & {
    appearance?: TravelerAppearance;
  };

export type TravelerRosterSource = "api" | "local";

export function isTravelerNameCompatibleWithVariant(
  name: string,
  variant: TravelerVariant
): boolean {
  const givenNames =
    getTravelerGender(variant) === "male"
      ? TRAVELER_MALE_GIVEN_NAMES
      : TRAVELER_FEMALE_GIVEN_NAMES;
  return givenNames.some((givenName) => name.endsWith(givenName));
}

export function isTravelerVariant(value: string): value is TravelerVariant {
  return (TRAVELER_VARIANTS as readonly string[]).includes(value);
}

export function getTravelerGender(variant: TravelerVariant): "male" | "female" {
  return variant === "male" || variant.endsWith("-male") ? "male" : "female";
}

export function getTravelerVariantForAppearance(
  appearance: TravelerAppearance,
  fallbackVariant: TravelerVariant
): TravelerVariant {
  const paperdollVariant = findPaperdollVariantForAppearance(appearance);
  if (paperdollVariant) return paperdollVariant;
  if (appearance.ageGroup === "child") {
    return appearance.gender === "male" ? "child-male" : "child-female";
  }
  if (appearance.ageGroup === "elder") {
    return appearance.gender === "male" ? "elder-male" : "elder-female";
  }
  return fallbackVariant;
}

export function getDefaultAppearanceForVariant(
  variant: TravelerVariant
): TravelerAppearance {
  const paperdollRecipe = getPaperdollRecipeByVariant(variant);
  if (paperdollRecipe) return paperdollRecipe.appearance;

  switch (variant) {
    case "male":
      return {
        gender: "male",
        ageGroup: "adult",
        hairStyle: "tousled-brown",
        top: "blue-travel-jacket",
        pants: "dark-trousers"
      };
    case "female":
      return {
        gender: "female",
        ageGroup: "adult",
        hairStyle: "bob-brown",
        top: "coral-jacket",
        pants: "navy-pants"
      };
    case "child-male":
      return {
        gender: "male",
        ageGroup: "child",
        hairStyle: "tousled-brown",
        top: "green-hoodie",
        pants: "dark-trousers"
      };
    case "child-female":
      return {
        gender: "female",
        ageGroup: "child",
        hairStyle: "bob-brown",
        top: "yellow-cardigan",
        pants: "teal-skirt"
      };
    case "elder-male":
      return {
        gender: "male",
        ageGroup: "elder",
        hairStyle: "silver-short",
        top: "beige-cardigan",
        pants: "charcoal-pants"
      };
    case "elder-female":
      return {
        gender: "female",
        ageGroup: "elder",
        hairStyle: "silver-bob",
        top: "lavender-cardigan",
        pants: "dark-skirt"
      };
  }

  return getTravelerGender(variant) === "male"
    ? {
        gender: "male",
        ageGroup: "adult",
        hairStyle: "tousled-brown",
        top: "blue-travel-jacket",
        pants: "dark-trousers"
      }
    : {
        gender: "female",
        ageGroup: "adult",
        hairStyle: "bob-brown",
        top: "coral-jacket",
        pants: "navy-pants"
      };
}

export const TRAVELER_VARIANTS = [
  "male",
  "female",
  "child-male",
  "child-female",
  "elder-male",
  "elder-female",
  "paperdoll-blue-male",
  "paperdoll-green-male",
  "paperdoll-beige-male",
  "paperdoll-yellow-male",
  "paperdoll-coral-female",
  "paperdoll-yellow-female",
  "paperdoll-lavender-female"
] as const satisfies readonly TravelerVariant[];

const POPULATION_RANGES: Record<RegionId, readonly [number, number]> = {
  "duty-free-entrance": [2, 4],
  "security-check": [2, 4],
  "departure-hall": [4, 7],
  "information-core": [2, 4],
  "airport-facilities": [2, 4],
  "duty-free-central": [4, 7],
  "shop-beauty-01": [1, 3],
  "shop-liquor-food-01": [1, 3],
  "shop-gift-01": [1, 3]
};

export const TRAVELER_FAMILY_NAMES = [
  "陳",
  "林",
  "黃",
  "張",
  "李",
  "王",
  "吳",
  "劉",
  "蔡",
  "楊",
  "許",
  "鄭"
] as const;
export const TRAVELER_MALE_GIVEN_NAMES = [
  "宇軒",
  "柏翰",
  "冠廷",
  "俊傑",
  "宥辰",
  "家豪",
  "志明",
  "建宏",
  "承恩",
  "彥廷"
] as const;
export const TRAVELER_FEMALE_GIVEN_NAMES = [
  "子晴",
  "雅婷",
  "品妤",
  "思妤",
  "欣怡",
  "語彤",
  "婉婷",
  "佳穎",
  "佩珊",
  "心瑜"
] as const;
const DIALOGUE = [
  "第一次來這裡，免稅店比我想像中還熱鬧。",
  "我正在找適合帶回家的伴手禮。",
  "這裡的指標很清楚，逛起來很舒服。",
  "候機前慢慢逛一下，時間過得真快。",
  "你有推薦的商品嗎？我還在猶豫呢。",
  "免稅價格挺吸引人的，我想再比較一下。",
  "準備挑一份禮物送給家人。",
  "逛完這一區，我就要去結帳了。"
] as const;
const FACINGS: readonly Facing[] = ["up", "down", "left", "right"];
const MOVEMENT_TYPES: readonly NpcMovementType[] = [
  "wander",
  "wander",
  "wander",
  "patrol",
  "idle"
];
const SESSION_POOL_SIZE = 40;

const sessionPool: TravelerProfile[] = [];
const regionAssignments = new Map<RegionId, TravelerProfile[]>();
const assignedTravelerIds = new Set<string>();
let rosterSource: TravelerRosterSource = "local";

export function getTravelerRosterSource(): TravelerRosterSource {
  return rosterSource;
}

export function getTravelersForRegion(regionId: RegionId): TravelerProfile[] {
  const existingAssignment = regionAssignments.get(regionId);
  if (existingAssignment) {
    return existingAssignment;
  }

  const [minimum, maximum] = POPULATION_RANGES[regionId];
  const count = randomInteger(minimum, maximum);
  const available = shuffle(
    sessionPool.filter((traveler) => !assignedTravelerIds.has(traveler.id))
  );
  const selected = available.slice(0, count);

  for (const traveler of selected) {
    assignedTravelerIds.add(traveler.id);
  }
  regionAssignments.set(regionId, selected);
  return selected;
}

export async function syncTravelerRoster(): Promise<TravelerRosterSource> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(
      `${CONFIG.apiBaseUrl}/travelers/random?count=${SESSION_POOL_SIZE}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal
      }
    );
    if (!response.ok) {
      throw new Error(`Traveler selection request failed with ${response.status}.`);
    }

    const roster = (await response.json()) as TravelerRosterResponse;
    if (!isTravelerRoster(roster)) {
      throw new Error("Traveler selection response is invalid.");
    }

    resetSessionPool(roster.travelers.map(normalizeTravelerProfile));
    rosterSource = "api";
  } catch (error) {
    resetSessionPool(createLocalSessionPool());
    rosterSource = "local";
    console.warn("Traveler API unavailable; using local session pool.", error);
  } finally {
    window.clearTimeout(timeout);
  }

  return rosterSource;
}

function resetSessionPool(travelers: readonly TravelerProfile[]): void {
  sessionPool.splice(0, sessionPool.length, ...travelers);
  regionAssignments.clear();
  assignedTravelerIds.clear();
}

function createLocalSessionPool(): TravelerProfile[] {
  const variants = Array.from(
    { length: SESSION_POOL_SIZE },
    (_, index) => TRAVELER_VARIANTS[index % TRAVELER_VARIANTS.length]!
  );
  const namesByGender: Record<ReturnType<typeof getTravelerGender>, string[]> = {
    male: createNames(TRAVELER_MALE_GIVEN_NAMES),
    female: createNames(TRAVELER_FEMALE_GIVEN_NAMES)
  };

  return variants.map((variant, index) => ({
    appearance: getDefaultAppearanceForVariant(variant),
    id: `local-traveler-${index + 1}`,
    name: namesByGender[getTravelerGender(variant)].pop()!,
    variant,
    dialogue: DIALOGUE[index % DIALOGUE.length]!,
    movementType: MOVEMENT_TYPES[index % MOVEMENT_TYPES.length]!,
    facing: FACINGS[index % FACINGS.length]!,
    speed: 34 + (index % 25)
  }));
}

function createNames(givenNames: readonly string[]): string[] {
  return shuffle(
    TRAVELER_FAMILY_NAMES.flatMap((familyName) =>
      givenNames.map((givenName) => `${familyName}${givenName}`)
    )
  );
}

function isTravelerRoster(value: TravelerRosterResponse): boolean {
  return (
    value?.schemaVersion >= 2 &&
    Array.isArray(value.travelers) &&
    value.travelers.length > 0 &&
    value.travelers.every(
      (traveler) =>
        typeof traveler.id === "string" &&
        typeof traveler.name === "string" &&
        traveler.name.trim().length > 0 &&
        isTravelerVariant(traveler.variant) &&
        typeof traveler.dialogue === "string" &&
        (traveler.movementType === "idle" ||
          traveler.movementType === "wander" ||
          traveler.movementType === "patrol") &&
        (traveler.facing === "up" ||
          traveler.facing === "down" ||
          traveler.facing === "left" ||
          traveler.facing === "right") &&
        Number.isInteger(traveler.speed) &&
        traveler.speed > 0 &&
        (traveler.appearance === undefined ||
          isTravelerAppearance(traveler.appearance)) &&
        (traveler.appearance !== undefined ||
          hasFlatTravelerAppearance(traveler) ||
          isTravelerVariant(traveler.variant))
    )
  );
}

function normalizeTravelerProfile(traveler: TravelerRosterItem): TravelerProfile {
  const appearance =
    traveler.appearance ??
    (hasFlatTravelerAppearance(traveler)
      ? {
          gender: traveler.gender,
          ageGroup: traveler.ageGroup,
          hairStyle: traveler.hairStyle,
          top: traveler.top,
          pants: traveler.pants
        }
      : getDefaultAppearanceForVariant(traveler.variant));
  const variant = getTravelerVariantForAppearance(appearance, traveler.variant);
  return { ...traveler, appearance, variant };
}

function hasFlatTravelerAppearance(
  traveler: TravelerRosterItem
): traveler is TravelerRosterItem & TravelerAppearance {
  return (
    isTravelerGender(traveler.gender) &&
    isTravelerAgeGroup(traveler.ageGroup) &&
    isTravelerHairStyle(traveler.hairStyle) &&
    isTravelerTop(traveler.top) &&
    isTravelerPants(traveler.pants)
  );
}

function isTravelerAppearance(value: TravelerAppearance): boolean {
  return (
    isTravelerGender(value.gender) &&
    isTravelerAgeGroup(value.ageGroup) &&
    isTravelerHairStyle(value.hairStyle) &&
    isTravelerTop(value.top) &&
    isTravelerPants(value.pants)
  );
}

function isTravelerGender(value: unknown): value is TravelerGender {
  return value === "male" || value === "female";
}

function isTravelerAgeGroup(value: unknown): value is TravelerAgeGroup {
  return value === "adult" || value === "child" || value === "elder";
}

function isTravelerHairStyle(value: unknown): value is TravelerHairStyle {
  return (
    value === "tousled-brown" ||
    value === "sidepart-black" ||
    value === "bob-brown" ||
    value === "silver-short" ||
    value === "silver-bob"
  );
}

function isTravelerTop(value: unknown): value is TravelerTop {
  return (
    value === "blue-travel-jacket" ||
    value === "green-hoodie" ||
    value === "coral-jacket" ||
    value === "yellow-cardigan" ||
    value === "beige-cardigan" ||
    value === "lavender-cardigan"
  );
}

function isTravelerPants(value: unknown): value is TravelerPants {
  return (
    value === "dark-trousers" ||
    value === "beige-chinos" ||
    value === "navy-pants" ||
    value === "teal-skirt" ||
    value === "charcoal-pants" ||
    value === "dark-skirt"
  );
}

function shuffle<T>(values: readonly T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!
    ];
  }
  return shuffled;
}

function randomInteger(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}
