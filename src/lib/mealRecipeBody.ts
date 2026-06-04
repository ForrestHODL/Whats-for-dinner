import type { Meal, RecipeEntry } from "../types";

/** Recipe text for a meal (library entry wins over copied meal text). */
export function getMealRecipeBody(
  meal: Meal,
  libraryRecipe?: RecipeEntry
): string {
  if (libraryRecipe?.body?.trim()) return libraryRecipe.body;
  return meal.recipe?.trim() ?? "";
}
