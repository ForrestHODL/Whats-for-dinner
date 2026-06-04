import type { RecipeCategory, RecipeEntry } from "../types";

export const RECIPE_FILTER_POPULARITY = "all";

/** @deprecated Use RECIPE_FILTER_POPULARITY */
export const RECIPE_FILTER_ALL = RECIPE_FILTER_POPULARITY;

export function defaultRecipeCategories(): RecipeCategory[] {
  return [];
}

export function normalizeRecipeCategories(
  raw: RecipeCategory[] | undefined
): RecipeCategory[] {
  if (!raw?.length) return defaultRecipeCategories();

  const seen = new Set<string>();
  const categories: RecipeCategory[] = [];
  for (const item of raw) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    categories.push(normalizeRecipeCategory(item));
  }
  return categories;
}

function normalizeRecipeCategory(raw: RecipeCategory): RecipeCategory {
  return {
    id: raw.id,
    label:
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : "Category",
  };
}

export function resolveRecipeCategoryId(
  recipe: RecipeEntry,
  categories: RecipeCategory[]
): string | undefined {
  if (
    recipe.categoryId &&
    categories.some((c) => c.id === recipe.categoryId)
  ) {
    return recipe.categoryId;
  }
  return undefined;
}

export function getRecipeCategoryById(
  categories: RecipeCategory[],
  categoryId: string
): RecipeCategory | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function sortRecipesByPopularity(recipes: RecipeEntry[]): RecipeEntry[] {
  return [...recipes].sort((a, b) => {
    const diff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
    if (diff !== 0) return diff;
    const viewedDiff = (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? "");
    if (viewedDiff !== 0) return viewedDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterRecipesByCategory(
  recipes: RecipeEntry[],
  filterId: string
): RecipeEntry[] {
  if (filterId === RECIPE_FILTER_POPULARITY) {
    return sortRecipesByPopularity(recipes);
  }
  return recipes.filter((r) => r.categoryId === filterId);
}
