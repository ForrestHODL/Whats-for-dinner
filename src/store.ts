import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMealCategories,
  getCategoryById,
  MAIN_CATEGORY_ID,
  normalizeMealCategories,
  resolveMealCategoryId,
  themeForNewCategory,
} from "./lib/mealCategories";
import {
  defaultRecipeCategories,
  normalizeRecipeCategories,
  resolveRecipeCategoryId,
  sortRecipesByPopularity,
} from "./lib/recipeCategories";
import {
  isValidGuestEmail,
  normalizeCalendarGuests,
} from "./lib/calendarGuests";
import { DEFAULT_DAY_CALENDAR_SETTINGS } from "./lib/googleCalendar";
import { decodeHtmlEntities } from "../lib/decodeHtmlEntities";
import { formatRecipeStepSpacing } from "./lib/formatRecipeBody";
import { normalizeCommonShoppingItems } from "./lib/commonShoppingItems";
import {
  guessShoppingCategoryId,
  normalizeShoppingStoreCategories,
  SHOPPING_CATEGORY_AISLES,
  sortCategoriesByStoreOrder,
} from "./lib/shoppingStoreCategories";
import {
  appendShoppingItems,
  pickCanonicalIngredientName,
} from "./lib/mergeShoppingIngredients";
import type {
  AppState,
  DayCalendarMap,
  DayCalendarSettings,
  DayOfWeek,
  DayPrepReminder,
  Meal,
  MealCategory,
  MealSlot,
  CalendarGuest,
  RecipeCategory,
  RecipeEntry,
  ShoppingItem,
  ShoppingItemDetail,
  ShoppingStoreCategory,
} from "./types";
import { DAYS } from "./types";
import {
  fetchCloudPlan,
  isCloudEnabled,
  saveCloudPlan,
  supabase,
} from "./lib/supabase";

const STORAGE_KEY = "meal-prep-planner-v1";
const SAVE_DEBOUNCE_MS = 600;

export const DEFAULT_MEALS: Meal[] = [
  { id: "1", title: "Grilled chicken & rice", recipe: "" },
  { id: "2", title: "Taco bowls", recipe: "" },
  { id: "3", title: "Salmon with veggies", recipe: "" },
  { id: "4", title: "Pasta primavera", recipe: "" },
  { id: "5", title: "Stir fry", recipe: "" },
  { id: "6", title: "Soup & salad", recipe: "" },
  { id: "7", title: "Breakfast burritos", recipe: "" },
  { id: "8", title: "Sheet pan sausage", recipe: "" },
];

function createMealForRecipe(
  recipe: RecipeEntry,
  mealCategories: MealCategory[]
): Meal {
  return normalizeMeal(
    {
      id: crypto.randomUUID(),
      title: recipe.title,
      recipe: recipe.body,
      recipeId: recipe.id,
      categoryId: MAIN_CATEGORY_ID,
      note: "",
    },
    mealCategories
  );
}

/** Every library recipe should appear on the Meals tab (Everyone). */
function ensureMealsForRecipes(
  meals: Meal[],
  recipes: RecipeEntry[],
  mealCategories: MealCategory[]
): Meal[] {
  const result = [...meals];
  const linkedRecipeIds = new Set(
    result
      .map((m) => m.recipeId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  for (const recipe of recipes) {
    if (linkedRecipeIds.has(recipe.id)) continue;
    result.push(createMealForRecipe(recipe, mealCategories));
    linkedRecipeIds.add(recipe.id);
  }

  return result;
}

function normalizeMeal(meal: Meal, categories: MealCategory[]): Meal {
  const count = meal.scheduleCount;
  return {
    id: meal.id,
    title: meal.title,
    recipe:
      typeof meal.recipe === "string"
        ? formatRecipeStepSpacing(decodeHtmlEntities(meal.recipe))
        : "",
    recipeId:
      typeof meal.recipeId === "string" && meal.recipeId.trim()
        ? meal.recipeId.trim()
        : undefined,
    scheduleCount:
      typeof count === "number" && count >= 0 ? Math.floor(count) : 0,
    categoryId: resolveMealCategoryId(meal, categories),
    note: typeof meal.note === "string" ? meal.note : "",
  };
}

export function sortMealsByPopularity(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    const diff = (b.scheduleCount ?? 0) - (a.scheduleCount ?? 0);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function clampHour(h: number): number {
  return Math.min(23, Math.max(0, Math.round(h)));
}

function clampMinute(m: number): number {
  return Math.min(59, Math.max(0, Math.round(m)));
}

function normalizePrep(
  raw: unknown,
  fallback: DayPrepReminder
): DayPrepReminder {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const r = raw as Partial<DayPrepReminder>;
  return {
    enabled: Boolean(r.enabled),
    hour: clampHour(r.hour ?? fallback.hour),
    minute: clampMinute(r.minute ?? fallback.minute),
  };
}

function normalizeDaySettings(raw: unknown): DayCalendarSettings {
  const d = DEFAULT_DAY_CALENDAR_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d, morningPrep: { ...d.morningPrep }, dayBeforePrep: { ...d.dayBeforePrep } };
  const r = raw as Partial<DayCalendarSettings>;
  return {
    dinnerHour: clampHour(r.dinnerHour ?? d.dinnerHour),
    dinnerMinute: clampMinute(r.dinnerMinute ?? d.dinnerMinute),
    morningPrep: normalizePrep(r.morningPrep, d.morningPrep),
    dayBeforePrep: normalizePrep(r.dayBeforePrep, d.dayBeforePrep),
  };
}

export function defaultDayCalendarMap(): DayCalendarMap {
  return Object.fromEntries(
    DAYS.map((d) => [
      d.key,
      {
        ...DEFAULT_DAY_CALENDAR_SETTINGS,
        morningPrep: { ...DEFAULT_DAY_CALENDAR_SETTINGS.morningPrep },
        dayBeforePrep: { ...DEFAULT_DAY_CALENDAR_SETTINGS.dayBeforePrep },
      },
    ])
  ) as DayCalendarMap;
}

function normalizeDayCalendar(raw: DayCalendarMap | undefined): DayCalendarMap {
  const base = defaultDayCalendarMap();
  if (!raw) return base;
  for (const d of DAYS) {
    base[d.key] = normalizeDaySettings(raw[d.key]);
  }
  return base;
}

function normalizeRecipe(
  raw: RecipeEntry,
  categories: RecipeCategory[] = []
): RecipeEntry {
  const count = raw.viewCount;
  return {
    id: raw.id,
    title: (() => {
      const trimmed =
        typeof raw.title === "string"
          ? decodeHtmlEntities(raw.title.trim())
          : "";
      return trimmed || "Untitled";
    })(),
    description:
      typeof raw.description === "string"
        ? decodeHtmlEntities(raw.description.trim())
        : "",
    imageUrl:
      typeof raw.imageUrl === "string" && raw.imageUrl.trim()
        ? raw.imageUrl.trim()
        : undefined,
    body:
      typeof raw.body === "string"
        ? formatRecipeStepSpacing(decodeHtmlEntities(raw.body))
        : "",
    sourceUrl:
      typeof raw.sourceUrl === "string" && raw.sourceUrl.trim()
        ? raw.sourceUrl.trim()
        : undefined,
    categoryId: resolveRecipeCategoryId(raw, categories),
    viewCount:
      typeof count === "number" && count >= 0 ? Math.floor(count) : 0,
    lastViewedAt:
      typeof raw.lastViewedAt === "string" && raw.lastViewedAt.trim()
        ? raw.lastViewedAt.trim()
        : undefined,
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

function normalizeShoppingItemDetails(
  raw: ShoppingItem,
  text: string
): ShoppingItemDetail[] {
  const details: ShoppingItemDetail[] = [];

  if (Array.isArray(raw.details)) {
    for (const entry of raw.details) {
      if (!entry?.line?.trim()) continue;
      details.push({
        line: decodeHtmlEntities(entry.line.trim()),
        sourceTitle:
          typeof entry.sourceTitle === "string" && entry.sourceTitle.trim()
            ? decodeHtmlEntities(entry.sourceTitle.trim())
            : undefined,
      });
    }
  }

  if (!details.length && text) {
    details.push({
      line: text,
      sourceTitle:
        typeof raw.sourceTitle === "string" && raw.sourceTitle.trim()
          ? decodeHtmlEntities(raw.sourceTitle.trim())
          : undefined,
    });
  }

  const seen = new Set<string>();
  const unique: ShoppingItemDetail[] = [];
  for (const d of details) {
    const key = `${d.line.toLowerCase()}|${d.sourceTitle ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(d);
  }
  return unique;
}

function normalizeShoppingItem(
  raw: ShoppingItem,
  categories: ShoppingStoreCategory[]
): ShoppingItem {
  const text =
    typeof raw.text === "string"
      ? decodeHtmlEntities(raw.text.trim())
      : "";
  const details = normalizeShoppingItemDetails(raw, text);
  const displayText =
    details.length > 1
      ? pickCanonicalIngredientName(details.map((d) => d.line))
      : details[0]?.line ?? text;

  const categorySource = details[details.length - 1]?.line ?? displayText;
  const guessed = guessShoppingCategoryId(categorySource, categories);
  let categoryId = guessed;
  if (raw.categoryId && categories.some((c) => c.id === raw.categoryId)) {
    categoryId = raw.categoryId;
    if (
      categoryId === SHOPPING_CATEGORY_AISLES &&
      guessed !== SHOPPING_CATEGORY_AISLES
    ) {
      categoryId = guessed;
    }
  }

  return {
    id: raw.id,
    text: displayText,
    checked: Boolean(raw.checked),
    categoryId,
    details: details.length > 0 ? details : undefined,
    addedAt:
      typeof raw.addedAt === "string" && raw.addedAt
        ? raw.addedAt
        : new Date().toISOString(),
  };
}

function normalizeShoppingList(
  raw: ShoppingItem[] | undefined,
  categories: ShoppingStoreCategory[]
): ShoppingItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: ShoppingItem[] = [];
  for (const item of raw) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    const normalized = normalizeShoppingItem(item, categories);
    if (normalized.text) items.push(normalized);
  }
  return items;
}

export function normalizeState(state: AppState): AppState {
  const mealCategories = normalizeMealCategories(
    state.mealCategories,
    state.alternateTabLabel
  );
  const recipeCategories = normalizeRecipeCategories(state.recipeCategories);
  const shoppingStoreCategories = normalizeShoppingStoreCategories(
    state.shoppingStoreCategories
  );
  const recipes = Array.isArray(state.recipes)
    ? state.recipes.map((r) => normalizeRecipe(r, recipeCategories))
    : [];
  const meals = ensureMealsForRecipes(
    state.meals.map((m) => normalizeMeal(m, mealCategories)),
    recipes,
    mealCategories
  );

  return {
    meals,
    assignments: state.assignments,
    recipes,
    recipeCategories,
    dayCalendar: normalizeDayCalendar(state.dayCalendar),
    calendarGuests: normalizeCalendarGuests(state.calendarGuests),
    mealCategories,
    shoppingList: normalizeShoppingList(state.shoppingList, shoppingStoreCategories),
    shoppingStoreCategories,
    commonShoppingItems: normalizeCommonShoppingItems(state.commonShoppingItems),
  };
}

export function defaultState(): AppState {
  return {
    meals: DEFAULT_MEALS.map((m) => ({ ...m, categoryId: MAIN_CATEGORY_ID })),
    assignments: [],
    recipes: [],
    recipeCategories: defaultRecipeCategories(),
    dayCalendar: defaultDayCalendarMap(),
    calendarGuests: [],
    mealCategories: defaultMealCategories(),
    shoppingList: [],
    shoppingStoreCategories: normalizeShoppingStoreCategories(undefined),
    commonShoppingItems: normalizeCommonShoppingItems(undefined),
  };
}

function loadLocalState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.meals?.length && Array.isArray(parsed.assignments)) {
        return normalizeState(parsed);
      }
    }
  } catch {
    /* use defaults */
  }
  return defaultState();
}

function saveLocalState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isValidAppState(data: unknown): data is AppState {
  if (!data || typeof data !== "object") return false;
  const d = data as AppState;
  return Array.isArray(d.meals) && Array.isArray(d.assignments);
}

export type SyncStatus = "offline" | "loading" | "syncing" | "synced" | "error";

export function useAppStore(userId: string | null) {
  const [state, setState] = useState<AppState>(loadLocalState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    userId && isCloudEnabled ? "loading" : "offline"
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  const stateRef = useRef(state);
  const userIdRef = useRef(userId);
  const lastRemoteAt = useRef(0);
  const skipSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;
  userIdRef.current = userId;

  useEffect(() => {
    saveLocalState(state);
  }, [state]);

  // Load cloud data when user signs in
  useEffect(() => {
    if (!userId || !isCloudEnabled) {
      setSyncStatus("offline");
      setSyncError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setSyncStatus("loading");
      setSyncError(null);
      try {
        const row = await fetchCloudPlan(userId);
        if (cancelled) return;

        if (row && isValidAppState(row.data)) {
          skipSaveRef.current = true;
          lastRemoteAt.current = new Date(row.updated_at).getTime();
          setState(normalizeState(row.data));
        } else {
          await saveCloudPlan(userId, stateRef.current);
          if (!cancelled) setSyncStatus("synced");
          return;
        }
        setSyncStatus("synced");
      } catch (err) {
        if (!cancelled) {
          setSyncStatus("error");
          setSyncError(err instanceof Error ? err.message : "Could not load plan");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Debounced save to cloud when state changes
  useEffect(() => {
    if (!userId || !isCloudEnabled) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const updatedAt = await saveCloudPlan(userId, stateRef.current);
        lastRemoteAt.current = new Date(updatedAt).getTime();
        setSyncStatus("synced");
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "Could not save plan");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, userId]);

  // Realtime updates from other devices
  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel(`meal-plan-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_plans",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { data?: AppState; updated_at?: string };
          if (!row?.data || !isValidAppState(row.data)) return;

          const remoteAt = row.updated_at
            ? new Date(row.updated_at).getTime()
            : 0;
          if (remoteAt <= lastRemoteAt.current) return;

          lastRemoteAt.current = remoteAt;
          skipSaveRef.current = true;
          setState(normalizeState(row.data));
          setSyncStatus("synced");
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [userId]);

  const addMeal = useCallback(
    (
      title: string,
      options?: {
        categoryId?: string;
        note?: string;
        recipe?: string;
        recipeId?: string;
      }
    ) => {
      setState((s) => {
        const categories = normalizeMealCategories(s.mealCategories);
        const categoryId =
          options?.categoryId && categories.some((c) => c.id === options.categoryId)
            ? options.categoryId
            : MAIN_CATEGORY_ID;
        const meal: Meal = {
          id: crypto.randomUUID(),
          title: title.trim(),
          recipe: options?.recipe ?? "",
          recipeId: options?.recipeId,
          categoryId,
          note: options?.note?.trim() ?? "",
        };
        return { ...s, meals: [...s.meals, normalizeMeal(meal, categories)] };
      });
    },
    []
  );

  const addMealFromRecipe = useCallback(
    (recipeId: string, categoryId: string, note?: string): string | null => {
      let newMealId: string | null = null;
      setState((s) => {
        const recipe = (s.recipes ?? []).find((r) => r.id === recipeId);
        if (!recipe) return s;

        const categories = normalizeMealCategories(s.mealCategories);
        const resolvedCategoryId =
          categories.some((c) => c.id === categoryId)
            ? categoryId
            : MAIN_CATEGORY_ID;

        const id = crypto.randomUUID();
        newMealId = id;
        const meal: Meal = {
          id,
          title: recipe.title.trim(),
          recipe: recipe.body,
          recipeId: recipe.id,
          categoryId: resolvedCategoryId,
          note: note?.trim() ?? "",
        };
        return {
          ...s,
          meals: [...s.meals, normalizeMeal(meal, categories)],
        };
      });
      return newMealId;
    },
    []
  );

  const getMealsForRecipe = useCallback(
    (recipeId: string): Meal[] => {
      return state.meals.filter((m) => m.recipeId === recipeId);
    },
    [state.meals]
  );

  const addMealCategory = useCallback(
    (label: string, mealSlot: MealSlot = "dinner") => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    let newId: string | null = null;
    setState((s) => {
      const categories = normalizeMealCategories(s.mealCategories);
      const id = crypto.randomUUID();
      newId = id;
      const category: MealCategory = {
        id,
        label: trimmed,
        theme: themeForNewCategory(categories),
        needsWho: false,
        mealSlot: mealSlot === "lunch" ? "lunch" : "dinner",
      };
      return {
        ...s,
        mealCategories: [...categories, category],
      };
    });
    return newId;
  },
  []);

  const updateMealCategory = useCallback(
    (
      categoryId: string,
      patch: Partial<Pick<MealCategory, "label" | "mealSlot">>
    ) => {
      setState((s) => {
        const categories = normalizeMealCategories(s.mealCategories);
        return {
          ...s,
          mealCategories: categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  label:
                    typeof patch.label === "string"
                      ? patch.label
                      : c.label,
                  mealSlot:
                    patch.mealSlot === "lunch" || patch.mealSlot === "dinner"
                      ? patch.mealSlot
                      : c.mealSlot,
                }
              : c
          ),
        };
      });
    },
    []
  );

  const removeMealCategory = useCallback((categoryId: string) => {
    if (categoryId === MAIN_CATEGORY_ID) return;
    setState((s) => {
      const categories = normalizeMealCategories(s.mealCategories);
      if (!categories.some((c) => c.id === categoryId)) return s;
      const nextCategories = categories.filter((c) => c.id !== categoryId);
      return {
        ...s,
        mealCategories: nextCategories,
        meals: s.meals.map((m) => {
          const currentCat = resolveMealCategoryId(m, categories);
          if (currentCat !== categoryId) {
            return normalizeMeal(m, nextCategories);
          }
          return normalizeMeal(
            { ...m, categoryId: MAIN_CATEGORY_ID },
            nextCategories
          );
        }),
      };
    });
  }, []);

  const removeMeal = useCallback((mealId: string) => {
    setState((s) => ({
      meals: s.meals.filter((m) => m.id !== mealId),
      assignments: s.assignments.filter((a) => a.mealId !== mealId),
    }));
  }, []);

  const assignMealToDay = useCallback((mealId: string, day: DayOfWeek) => {
    setState((s) => {
      const alreadyOnDay = s.assignments.some(
        (a) => a.day === day && a.mealId === mealId
      );
      if (alreadyOnDay) return s;
      return {
        ...s,
        meals: s.meals.map((m) =>
          m.id === mealId
            ? { ...m, scheduleCount: (m.scheduleCount ?? 0) + 1 }
            : m
        ),
        assignments: [...s.assignments, { day, mealId }],
      };
    });
  }, []);

  const removeMealFromDay = useCallback((mealId: string, day: DayOfWeek) => {
    setState((s) => ({
      ...s,
      assignments: s.assignments.filter(
        (a) => !(a.day === day && a.mealId === mealId)
      ),
    }));
  }, []);

  const mealCategories = useMemo(
    () => normalizeMealCategories(state.mealCategories),
    [state.mealCategories]
  );

  const getMealsForCategory = useCallback(
    (categoryId: string) => {
      return sortMealsByPopularity(
        state.meals.filter((m) => m.categoryId === categoryId)
      );
    },
    [state.meals]
  );

  const getCategoryForMeal = useCallback(
    (mealId: string): MealCategory | undefined => {
      const meal = state.meals.find((m) => m.id === mealId);
      if (!meal?.categoryId) return undefined;
      return getCategoryById(mealCategories, meal.categoryId);
    },
    [state.meals, mealCategories]
  );

  const clearDay = useCallback((day: DayOfWeek) => {
    setState((s) => ({
      ...s,
      assignments: s.assignments.filter((a) => a.day !== day),
    }));
  }, []);

  const getMealsForDay = useCallback(
    (day: DayOfWeek): Meal[] => {
      const mealById = new Map(state.meals.map((m) => [m.id, m]));
      return state.assignments
        .filter((a) => a.day === day)
        .map((a) => mealById.get(a.mealId))
        .filter((m): m is Meal => m !== undefined);
    },
    [state]
  );

  const getMealById = useCallback(
    (mealId: string): Meal | undefined => {
      return state.meals.find((m) => m.id === mealId);
    },
    [state]
  );

  const updateMealRecipe = useCallback((mealId: string, recipe: string) => {
    setState((s) => ({
      ...s,
      meals: s.meals.map((m) =>
        m.id === mealId ? { ...m, recipe } : m
      ),
    }));
  }, []);

  const saveMealRecipeForm = useCallback(
    (
      mealId: string,
      input: {
        title: string;
        description: string;
        imageUrl?: string;
        body: string;
        note?: string;
        recipeCategoryId?: string;
      }
    ): { createdLibraryRecipe: boolean; recipeId: string | undefined } => {
      let createdLibraryRecipe = false;
      let savedRecipeId: string | undefined;
      setState((s) => {
        const meal = s.meals.find((m) => m.id === mealId);
        if (!meal) return s;

        const mealCategories = normalizeMealCategories(s.mealCategories);
        const recipeCategories = normalizeRecipeCategories(s.recipeCategories);
        const trimmedTitle = input.title.trim();
        if (!trimmedTitle) return s;

        let recipeId = meal.recipeId;
        let recipes = s.recipes ?? [];

        const recipePayload = {
          title: trimmedTitle,
          description: input.description.trim(),
          imageUrl: input.imageUrl?.trim() || undefined,
          body: input.body.trim(),
          categoryId: input.recipeCategoryId || undefined,
        };

        if (recipeId && recipes.some((r) => r.id === recipeId)) {
          recipes = recipes.map((r) =>
            r.id === recipeId
              ? normalizeRecipe({ ...r, ...recipePayload }, recipeCategories)
              : r
          );
        } else {
          recipeId = crypto.randomUUID();
          createdLibraryRecipe = true;
          savedRecipeId = recipeId;
          recipes = [
            ...recipes,
            normalizeRecipe(
              {
                id: recipeId,
                ...recipePayload,
                viewCount: 0,
                createdAt: new Date().toISOString(),
              },
              recipeCategories
            ),
          ];
        }

        const meals = s.meals.map((m) =>
          m.id === mealId
            ? normalizeMeal(
                {
                  ...m,
                  title: trimmedTitle,
                  recipe: recipePayload.body,
                  recipeId,
                  note:
                    input.note !== undefined ? input.note.trim() : m.note ?? "",
                },
                mealCategories
              )
            : m
        );

        savedRecipeId = recipeId;
        return { ...s, meals, recipes };
      });
      return {
        createdLibraryRecipe,
        recipeId: savedRecipeId,
      };
    },
    []
  );

  const addRecipe = useCallback(
    (
      input: Omit<RecipeEntry, "id" | "createdAt" | "viewCount"> & {
        id?: string;
        categoryId?: string;
      }
    ): string => {
      const id = input.id ?? crypto.randomUUID();
      setState((s) => {
        const categories = normalizeRecipeCategories(s.recipeCategories);
        const entry = normalizeRecipe(
          {
            id,
            title: input.title,
            description: input.description,
            imageUrl: input.imageUrl,
            body: input.body,
            sourceUrl: input.sourceUrl,
            categoryId: input.categoryId,
            viewCount: 0,
            createdAt: new Date().toISOString(),
          },
          categories
        );
        const mealCategories = normalizeMealCategories(s.mealCategories);
        const meal = createMealForRecipe(entry, mealCategories);
        return {
          ...s,
          recipes: [...(s.recipes ?? []), entry],
          meals: [...s.meals, meal],
        };
      });
      return id;
    },
    []
  );

  const ensureMealForRecipe = useCallback((recipeId: string): string | null => {
    let mealId: string | null = null;
    setState((s) => {
      const recipe = (s.recipes ?? []).find((r) => r.id === recipeId);
      if (!recipe) return s;

      const existing = s.meals.find((m) => m.recipeId === recipeId);
      if (existing) {
        mealId = existing.id;
        return s;
      }

      const mealCategories = normalizeMealCategories(s.mealCategories);
      const entry = normalizeRecipe(
        recipe,
        normalizeRecipeCategories(s.recipeCategories)
      );
      const meal = createMealForRecipe(entry, mealCategories);
      mealId = meal.id;
      return { ...s, meals: [...s.meals, meal] };
    });
    return mealId;
  }, []);

  const updateRecipe = useCallback(
    (
      recipeId: string,
      patch: Partial<
        Omit<RecipeEntry, "id" | "createdAt" | "viewCount">
      >
    ) => {
      setState((s) => {
        const categories = normalizeRecipeCategories(s.recipeCategories);
        return {
          ...s,
          recipes: (s.recipes ?? []).map((r) =>
            r.id === recipeId
              ? normalizeRecipe(
                  {
                    ...r,
                    ...patch,
                    title: patch.title ?? r.title,
                    description: patch.description ?? r.description,
                    body: patch.body ?? r.body,
                    categoryId:
                      patch.categoryId !== undefined
                        ? patch.categoryId
                        : r.categoryId,
                  },
                  categories
                )
              : r
          ),
        };
      });
    },
    []
  );

  const recordRecipeView = useCallback((recipeId: string) => {
    setState((s) => {
      const categories = normalizeRecipeCategories(s.recipeCategories);
      const now = new Date().toISOString();
      const updated = (s.recipes ?? []).map((r) =>
        r.id === recipeId
          ? normalizeRecipe(
              {
                ...r,
                viewCount: (r.viewCount ?? 0) + 1,
                lastViewedAt: now,
              },
              categories
            )
          : r
      );
      return {
        ...s,
        recipes: sortRecipesByPopularity(updated),
      };
    });
  }, []);

  const addShoppingItems = useCallback(
    (
      items: string[],
      sourceTitle?: string
    ): number => {
      const trimmed = items.map((t) => t.trim()).filter(Boolean);
      if (trimmed.length === 0) return 0;
      const now = new Date().toISOString();
      setState((s) => {
        const categories = normalizeShoppingStoreCategories(
          s.shoppingStoreCategories
        );
        const existing = normalizeShoppingList(s.shoppingList ?? [], categories);
        const merged = appendShoppingItems(
          existing,
          trimmed,
          sourceTitle,
          (text) => guessShoppingCategoryId(text, categories),
          now
        );
        return {
          ...s,
          shoppingList: merged.map((item) => normalizeShoppingItem(item, categories)),
        };
      });
      return trimmed.length;
    },
    []
  );

  const updateShoppingItemCategory = useCallback(
    (itemId: string, categoryId: string) => {
      setState((s) => {
        const categories = normalizeShoppingStoreCategories(
          s.shoppingStoreCategories
        );
        if (!categories.some((c) => c.id === categoryId)) return s;
        return {
          ...s,
          shoppingList: (s.shoppingList ?? []).map((item) =>
            item.id === itemId ? { ...item, categoryId } : item
          ),
        };
      });
    },
    []
  );

  const updateShoppingStoreCategoryLabel = useCallback(
    (categoryId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      setState((s) => ({
        ...s,
        shoppingStoreCategories: normalizeShoppingStoreCategories(
          s.shoppingStoreCategories
        ).map((c) => (c.id === categoryId ? { ...c, label: trimmed } : c)),
      }));
    },
    []
  );

  const moveShoppingStoreCategory = useCallback(
    (categoryId: string, direction: "up" | "down") => {
      setState((s) => {
        const categories = sortCategoriesByStoreOrder(
          normalizeShoppingStoreCategories(s.shoppingStoreCategories)
        );
        const index = categories.findIndex((c) => c.id === categoryId);
        if (index === -1) return s;
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= categories.length) return s;

        const next = [...categories];
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        return {
          ...s,
          shoppingStoreCategories: next.map((c, i) => ({ ...c, sortOrder: i })),
        };
      });
    },
    []
  );

  const addShoppingStoreCategory = useCallback((label: string): string | null => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const id = crypto.randomUUID();
    setState((s) => {
      const categories = normalizeShoppingStoreCategories(
        s.shoppingStoreCategories
      );
      return {
        ...s,
        shoppingStoreCategories: [
          ...categories,
          { id, label: trimmed, sortOrder: categories.length },
        ],
      };
    });
    return id;
  }, []);

  const removeShoppingStoreCategory = useCallback((categoryId: string) => {
    setState((s) => {
      const categories = normalizeShoppingStoreCategories(
        s.shoppingStoreCategories
      );
      if (categories.length <= 1) return s;
      const fallback =
        categories.find((c) => c.id === SHOPPING_CATEGORY_AISLES)?.id ??
        categories.find((c) => c.id !== categoryId)?.id;
      if (!fallback || !categories.some((c) => c.id === categoryId)) return s;

      const nextCategories = categories
        .filter((c) => c.id !== categoryId)
        .map((c, i) => ({ ...c, sortOrder: i }));

      return {
        ...s,
        shoppingStoreCategories: nextCategories,
        shoppingList: (s.shoppingList ?? []).map((item) =>
          item.categoryId === categoryId
            ? { ...item, categoryId: fallback }
            : item
        ),
      };
    });
  }, []);

  const recategorizeShoppingList = useCallback(() => {
    setState((s) => {
      const categories = normalizeShoppingStoreCategories(
        s.shoppingStoreCategories
      );
      return {
        ...s,
        shoppingList: (s.shoppingList ?? []).map((item) =>
          normalizeShoppingItem(
            {
              ...item,
              categoryId: guessShoppingCategoryId(item.text, categories),
            },
            categories
          )
        ),
      };
    });
  }, []);

  const toggleShoppingItem = useCallback((itemId: string) => {
    setState((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
  }, []);

  const removeShoppingItem = useCallback((itemId: string) => {
    setState((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).filter((item) => item.id !== itemId),
    }));
  }, []);

  const clearCheckedShoppingItems = useCallback(() => {
    setState((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).filter((item) => !item.checked),
    }));
  }, []);

  const addCommonShoppingItem = useCallback((text: string): boolean => {
    const trimmed = decodeHtmlEntities(text.trim());
    if (!trimmed) return false;
    let added = false;
    setState((s) => {
      const current = normalizeCommonShoppingItems(s.commonShoppingItems);
      if (current.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return s;
      }
      added = true;
      return {
        ...s,
        commonShoppingItems: [...current, trimmed],
      };
    });
    return added;
  }, []);

  const removeCommonShoppingItem = useCallback((text: string) => {
    const key = text.trim().toLowerCase();
    if (!key) return;
    setState((s) => ({
      ...s,
      commonShoppingItems: normalizeCommonShoppingItems(s.commonShoppingItems).filter(
        (item) => item.toLowerCase() !== key
      ),
    }));
  }, []);

  const addRecipeCategory = useCallback((label: string): string | null => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    let newId: string | null = null;
    setState((s) => {
      const categories = normalizeRecipeCategories(s.recipeCategories);
      const id = crypto.randomUUID();
      newId = id;
      const category: RecipeCategory = { id, label: trimmed };
      return {
        ...s,
        recipeCategories: [...categories, category],
      };
    });
    return newId;
  }, []);

  const removeRecipeCategory = useCallback((categoryId: string) => {
    setState((s) => {
      const categories = normalizeRecipeCategories(s.recipeCategories);
      if (!categories.some((c) => c.id === categoryId)) return s;
      const nextCategories = categories.filter((c) => c.id !== categoryId);
      return {
        ...s,
        recipeCategories: nextCategories,
        recipes: (s.recipes ?? []).map((r) =>
          r.categoryId === categoryId
            ? normalizeRecipe({ ...r, categoryId: undefined }, nextCategories)
            : normalizeRecipe(r, nextCategories)
        ),
      };
    });
  }, []);

  const removeRecipe = useCallback((recipeId: string) => {
    setState((s) => ({
      ...s,
      recipes: (s.recipes ?? []).filter((r) => r.id !== recipeId),
    }));
  }, []);

  const getRecipeById = useCallback(
    (recipeId: string): RecipeEntry | undefined => {
      return (state.recipes ?? []).find((r) => r.id === recipeId);
    },
    [state.recipes]
  );

  const recipeCategories = useMemo(
    () => normalizeRecipeCategories(state.recipeCategories),
    [state.recipeCategories]
  );

  const sortedRecipes = useMemo(() => {
    return sortRecipesByPopularity(state.recipes ?? []);
  }, [state.recipes]);

  const shoppingList = useMemo(() => {
    const categories = normalizeShoppingStoreCategories(
      state.shoppingStoreCategories
    );
    return normalizeShoppingList(state.shoppingList, categories);
  }, [state.shoppingList, state.shoppingStoreCategories]);

  const shoppingStoreCategories = useMemo(
    () =>
      sortCategoriesByStoreOrder(
        normalizeShoppingStoreCategories(state.shoppingStoreCategories)
      ),
    [state.shoppingStoreCategories]
  );

  const commonShoppingItems = useMemo(
    () => normalizeCommonShoppingItems(state.commonShoppingItems),
    [state.commonShoppingItems]
  );

  const updateMealNote = useCallback((mealId: string, note: string) => {
    setState((s) => ({
      ...s,
      meals: s.meals.map((m) =>
        m.id === mealId ? { ...m, note: note.trim() } : m
      ),
    }));
  }, []);

  const updateDayCalendar = useCallback(
    (day: DayOfWeek, patch: Partial<DayCalendarSettings>) => {
      setState((s) => {
        const current = normalizeDayCalendar(s.dayCalendar)[day];
        return {
          ...s,
          dayCalendar: {
            ...normalizeDayCalendar(s.dayCalendar),
            [day]: normalizeDaySettings({ ...current, ...patch }),
          },
        };
      });
    },
    []
  );

  const getDayCalendar = useCallback(
    (day: DayOfWeek): DayCalendarSettings => {
      return normalizeDayCalendar(state.dayCalendar)[day];
    },
    [state.dayCalendar]
  );

  const calendarGuests = useMemo(
    () => normalizeCalendarGuests(state.calendarGuests),
    [state.calendarGuests]
  );

  const addCalendarGuest = useCallback(
    (email: string, label?: string): string | null => {
      const trimmed = email.trim().toLowerCase();
      if (!isValidGuestEmail(trimmed)) return null;

      let newId: string | null = null;
      setState((s) => {
        const guests = normalizeCalendarGuests(s.calendarGuests);
        if (guests.some((g) => g.email === trimmed)) return s;

        const id = crypto.randomUUID();
        newId = id;
        const guest: CalendarGuest = {
          id,
          email: trimmed,
          label: label?.trim() || undefined,
        };
        return {
          ...s,
          calendarGuests: [...guests, guest],
        };
      });
      return newId;
    },
    []
  );

  const removeCalendarGuest = useCallback((guestId: string) => {
    setState((s) => ({
      ...s,
      calendarGuests: normalizeCalendarGuests(s.calendarGuests).filter(
        (g) => g.id !== guestId
      ),
    }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importData = useCallback((json: string) => {
    const parsed = JSON.parse(json) as AppState;
    if (!parsed.meals || !parsed.assignments) {
      throw new Error("Invalid data");
    }
    setState(normalizeState(parsed));
  }, []);

  return {
    meals: state.meals,
    recipes: sortedRecipes,
    recipeCategories,
    mealCategories,
    getMealsForCategory,
    getCategoryForMeal,
    assignments: state.assignments,
    dayCalendar: normalizeDayCalendar(state.dayCalendar),
    calendarGuests,
    addCalendarGuest,
    removeCalendarGuest,
    syncStatus,
    syncError,
    isCloudEnabled,
    addMeal,
    addMealFromRecipe,
    getMealsForRecipe,
    addMealCategory,
    updateMealCategory,
    removeMealCategory,
    removeMeal,
    assignMealToDay,
    removeMealFromDay,
    clearDay,
    getMealsForDay,
    getMealById,
    updateMealRecipe,
    saveMealRecipeForm,
    addRecipe,
    ensureMealForRecipe,
    updateRecipe,
    removeRecipe,
    getRecipeById,
    recordRecipeView,
    shoppingList,
    shoppingStoreCategories,
    commonShoppingItems,
    addShoppingItems,
    toggleShoppingItem,
    removeShoppingItem,
    clearCheckedShoppingItems,
    updateShoppingItemCategory,
    updateShoppingStoreCategoryLabel,
    moveShoppingStoreCategory,
    addShoppingStoreCategory,
    removeShoppingStoreCategory,
    recategorizeShoppingList,
    addCommonShoppingItem,
    removeCommonShoppingItem,
    addRecipeCategory,
    removeRecipeCategory,
    updateMealNote,
    updateDayCalendar,
    getDayCalendar,
    exportData,
    importData,
  };
}
