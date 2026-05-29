import type { Meal, MealCategory, MealCategoryTheme, MealSlot } from "../types";

export const MAIN_CATEGORY_ID = "main";
export const ALTERNATE_CATEGORY_ID = "alternate";

const DEFAULT_ALTERNATE_LABEL = "Also making";

/** Assignable colors for custom tabs (no repeats until all are used). */
export const CUSTOM_CATEGORY_THEMES = [
  "blue",
  "warm",
  "violet",
  "rose",
  "teal",
  "lime",
  "plum",
  "coral",
] as const satisfies readonly MealCategoryTheme[];

const VALID_THEMES = new Set<MealCategoryTheme>([
  "default",
  ...CUSTOM_CATEGORY_THEMES,
]);

export function defaultMealCategories(
  alternateLabel = DEFAULT_ALTERNATE_LABEL
): MealCategory[] {
  return [
    {
      id: MAIN_CATEGORY_ID,
      label: "Everyone",
      theme: "default",
      needsWho: false,
      mealSlot: "dinner",
    },
    {
      id: ALTERNATE_CATEGORY_ID,
      label: alternateLabel.trim() || DEFAULT_ALTERNATE_LABEL,
      theme: "blue",
      needsWho: false,
      mealSlot: "dinner",
    },
  ];
}

export function normalizeMealCategories(
  raw: MealCategory[] | undefined,
  legacyAlternateLabel?: string
): MealCategory[] {
  if (!raw?.length) {
    return defaultMealCategories(legacyAlternateLabel);
  }

  const seen = new Set<string>();
  const categories: MealCategory[] = [];

  for (const item of raw) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    categories.push(normalizeCategory(item, categories));
  }

  if (!categories.some((c) => c.id === MAIN_CATEGORY_ID)) {
    categories.unshift(defaultMealCategories()[0]);
  }

  return categories;
}

function normalizeCategory(
  raw: MealCategory,
  existing: MealCategory[] = []
): MealCategory {
  let theme: MealCategoryTheme = VALID_THEMES.has(raw.theme as MealCategoryTheme)
    ? (raw.theme as MealCategoryTheme)
    : "blue";

  if (theme !== "default") {
    const usedByOthers = new Set(
      existing
        .filter((c) => c.id !== raw.id && c.theme !== "default")
        .map((c) => c.theme)
    );
    if (usedByOthers.has(theme)) {
      theme = themeForNewCategory(existing.filter((c) => c.id !== raw.id));
    }
  }

  return {
    id: raw.id,
    label:
      typeof raw.label === "string" && raw.label.trim()
        ? raw.label.trim()
        : "Meals",
    theme,
    needsWho:
      raw.id === ALTERNATE_CATEGORY_ID ? false : Boolean(raw.needsWho),
    mealSlot: raw.mealSlot === "lunch" ? "lunch" : "dinner",
  };
}

export function inferMealSlotFromLabel(label: string): MealSlot {
  return /\blunch\b/i.test(label) ? "lunch" : "dinner";
}

/** CSS class prefix for a category theme (empty for default/green). */
export function themeClassName(theme: MealCategoryTheme): string {
  return theme === "default" ? "" : `theme-${theme}`;
}

/** First unused color; if all are taken, use the least-used one. */
export function themeForNewCategory(existing: MealCategory[]): MealCategoryTheme {
  const used = new Set(
    existing
      .filter((c) => c.theme !== "default")
      .map((c) => c.theme)
  );

  for (const theme of CUSTOM_CATEGORY_THEMES) {
    if (!used.has(theme)) return theme;
  }

  let best: MealCategoryTheme = CUSTOM_CATEGORY_THEMES[0];
  let minCount = Infinity;
  for (const theme of CUSTOM_CATEGORY_THEMES) {
    const count = existing.filter((c) => c.theme === theme).length;
    if (count < minCount) {
      minCount = count;
      best = theme;
    }
  }
  return best;
}

export function resolveMealCategoryId(
  meal: Meal,
  categories: MealCategory[]
): string {
  if (meal.categoryId && categories.some((c) => c.id === meal.categoryId)) {
    return meal.categoryId;
  }
  if (meal.list === "alternate") return ALTERNATE_CATEGORY_ID;
  return MAIN_CATEGORY_ID;
}

export function getCategoryById(
  categories: MealCategory[],
  categoryId: string
): MealCategory | undefined {
  return categories.find((c) => c.id === categoryId);
}
