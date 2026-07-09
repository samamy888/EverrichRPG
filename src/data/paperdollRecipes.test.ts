// @ts-expect-error Vitest runs in Node; production TypeScript intentionally omits Node types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getPaperdollRecipeByVariant,
  getPaperdollRecipesByBodyType,
  getPaperdollVariantForAppearance,
  isPaperdollVariant,
  PAPERDOLL_RECIPES
} from "./paperdollRecipes";

interface ManifestRecipe {
  id: string;
  bodyType: "adult-male" | "adult-female";
  appearance: {
    gender: string;
    ageGroup: string;
    hairStyle: string;
    top: string;
    pants: string;
  };
}

interface PaperdollManifest {
  bodyType: "adult-male" | "adult-female";
  recipes: ManifestRecipe[];
}

const MANIFEST_PATHS = [
  "public/assets/sprites/paperdoll/adult-male-v1/paperdoll-manifest.json",
  "public/assets/sprites/paperdoll/adult-female-v1/paperdoll-manifest.json"
] as const;

function readManifestRecipes(): ManifestRecipe[] {
  return MANIFEST_PATHS.flatMap((path) => {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as PaperdollManifest;
    return manifest.recipes.map((recipe) => ({
      id: recipe.id,
      bodyType: recipe.bodyType,
      appearance: recipe.appearance
    }));
  });
}

describe("paperdoll recipes", () => {
  it("keeps TypeScript recipes synchronized with paperdoll manifests", () => {
    expect(
      PAPERDOLL_RECIPES.map((recipe) => ({
        id: recipe.id,
        bodyType: recipe.bodyType,
        appearance: recipe.appearance
      }))
    ).toEqual(readManifestRecipes());
  });

  it("resolves recipes from variants and appearance values", () => {
    for (const recipe of PAPERDOLL_RECIPES) {
      expect(isPaperdollVariant(recipe.id)).toBe(true);
      expect(getPaperdollRecipeByVariant(recipe.id)).toBe(recipe);
      expect(getPaperdollVariantForAppearance(recipe.appearance)).toBe(recipe.id);
    }
  });

  it("groups recipes by body type for future outfit selection UI", () => {
    expect(getPaperdollRecipesByBodyType("adult-male")).toEqual(
      PAPERDOLL_RECIPES.filter((recipe) => recipe.bodyType === "adult-male")
    );
    expect(getPaperdollRecipesByBodyType("adult-female")).toEqual(
      PAPERDOLL_RECIPES.filter((recipe) => recipe.bodyType === "adult-female")
    );
  });
});
