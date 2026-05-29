import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMealCategories,
  getCategoryById,
  MAIN_CATEGORY_ID,
  normalizeMealCategories,
  resolveMealCategoryId,
  themeForNewCategory,
} from "./lib/mealCategories";
import { DEFAULT_DAY_CALENDAR_SETTINGS } from "./lib/googleCalendar";
import type {
  AppState,
  DayCalendarMap,
  DayCalendarSettings,
  DayOfWeek,
  DayPrepReminder,
  Meal,
  MealCategory,
  MealSlot,
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

function normalizeMeal(meal: Meal, categories: MealCategory[]): Meal {
  const count = meal.scheduleCount;
  return {
    id: meal.id,
    title: meal.title,
    recipe: typeof meal.recipe === "string" ? meal.recipe : "",
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

export function normalizeState(state: AppState): AppState {
  const mealCategories = normalizeMealCategories(
    state.mealCategories,
    state.alternateTabLabel
  );
  return {
    meals: state.meals.map((m) => normalizeMeal(m, mealCategories)),
    assignments: state.assignments,
    dayCalendar: normalizeDayCalendar(state.dayCalendar),
    mealCategories,
  };
}

export function defaultState(): AppState {
  return {
    meals: DEFAULT_MEALS.map((m) => ({ ...m, categoryId: MAIN_CATEGORY_ID })),
    assignments: [],
    dayCalendar: defaultDayCalendarMap(),
    mealCategories: defaultMealCategories(),
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
      options?: { categoryId?: string; note?: string }
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
          recipe: "",
          categoryId,
          note: options?.note?.trim() ?? "",
        };
        return { ...s, meals: [...s.meals, normalizeMeal(meal, categories)] };
      });
    },
    []
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
                    typeof patch.label === "string" && patch.label.trim()
                      ? patch.label.trim()
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
    mealCategories,
    getMealsForCategory,
    getCategoryForMeal,
    assignments: state.assignments,
    dayCalendar: normalizeDayCalendar(state.dayCalendar),
    syncStatus,
    syncError,
    isCloudEnabled,
    addMeal,
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
    updateMealNote,
    updateDayCalendar,
    getDayCalendar,
    exportData,
    importData,
  };
}
