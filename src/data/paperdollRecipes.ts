import type {
  TravelerAppearance,
  TravelerVariant
} from "./travelerDirectory";

export interface PaperdollRecipe {
  id: TravelerVariant;
  bodyType: "adult-male" | "adult-female";
  appearance: TravelerAppearance;
}

export const PAPERDOLL_RECIPES = [
  {
    id: "paperdoll-blue-male",
    bodyType: "adult-male",
    appearance: {
      gender: "male",
      ageGroup: "adult",
      hairStyle: "tousled-brown",
      top: "blue-travel-jacket",
      pants: "dark-trousers"
    }
  },
  {
    id: "paperdoll-green-male",
    bodyType: "adult-male",
    appearance: {
      gender: "male",
      ageGroup: "adult",
      hairStyle: "sidepart-black",
      top: "green-hoodie",
      pants: "beige-chinos"
    }
  },
  {
    id: "paperdoll-beige-male",
    bodyType: "adult-male",
    appearance: {
      gender: "male",
      ageGroup: "adult",
      hairStyle: "tousled-brown",
      top: "beige-cardigan",
      pants: "charcoal-pants"
    }
  },
  {
    id: "paperdoll-yellow-male",
    bodyType: "adult-male",
    appearance: {
      gender: "male",
      ageGroup: "adult",
      hairStyle: "sidepart-black",
      top: "yellow-cardigan",
      pants: "dark-trousers"
    }
  },
  {
    id: "paperdoll-coral-female",
    bodyType: "adult-female",
    appearance: {
      gender: "female",
      ageGroup: "adult",
      hairStyle: "bob-brown",
      top: "coral-jacket",
      pants: "navy-pants"
    }
  },
  {
    id: "paperdoll-yellow-female",
    bodyType: "adult-female",
    appearance: {
      gender: "female",
      ageGroup: "adult",
      hairStyle: "bob-brown",
      top: "yellow-cardigan",
      pants: "teal-skirt"
    }
  },
  {
    id: "paperdoll-lavender-female",
    bodyType: "adult-female",
    appearance: {
      gender: "female",
      ageGroup: "adult",
      hairStyle: "silver-bob",
      top: "lavender-cardigan",
      pants: "dark-skirt"
    }
  }
] as const satisfies readonly PaperdollRecipe[];

export type PaperdollBodyType = PaperdollRecipe["bodyType"];

export const PAPERDOLL_RECIPE_IDS = PAPERDOLL_RECIPES.map(
  (recipe) => recipe.id
) as readonly TravelerVariant[];

export function isPaperdollVariant(
  variant: TravelerVariant
): boolean {
  return PAPERDOLL_RECIPE_IDS.includes(variant);
}

export function getPaperdollRecipeByVariant(
  variant: TravelerVariant
): PaperdollRecipe | undefined {
  return PAPERDOLL_RECIPES.find((recipe) => recipe.id === variant);
}

export function getPaperdollRecipesByBodyType(
  bodyType: PaperdollBodyType
): readonly PaperdollRecipe[] {
  return PAPERDOLL_RECIPES.filter((recipe) => recipe.bodyType === bodyType);
}

export function getPaperdollVariantForAppearance(
  appearance: TravelerAppearance
): TravelerVariant | undefined {
  return PAPERDOLL_RECIPES.find((recipe) =>
    isSameAppearance(recipe.appearance, appearance)
  )?.id;
}

function isSameAppearance(
  left: TravelerAppearance,
  right: TravelerAppearance
): boolean {
  return (
    left.gender === right.gender &&
    left.ageGroup === right.ageGroup &&
    left.hairStyle === right.hairStyle &&
    left.top === right.top &&
    left.pants === right.pants
  );
}
