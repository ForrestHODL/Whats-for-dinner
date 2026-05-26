import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, DayOfWeek, Meal } from "./types";
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

function normalizeMeal(meal: Meal): Meal {
  return {
    id: meal.id,
    title: meal.title,
    recipe: typeof meal.recipe === "string" ? meal.recipe : "",
  };
}

export function normalizeState(state: AppState): AppState {
  return {
    meals: state.meals.map(normalizeMeal),
    assignments: state.assignments,
  };
}

export function defaultState(): AppState {
  return { meals: DEFAULT_MEALS, assignments: [] };
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

  const addMeal = useCallback((title: string) => {
    const meal: Meal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      recipe: "",
    };
    setState((s) => ({ ...s, meals: [...s.meals, meal] }));
    return meal;
  }, []);

  const removeMeal = useCallback((mealId: string) => {
    setState((s) => ({
      meals: s.meals.filter((m) => m.id !== mealId),
      assignments: s.assignments.filter((a) => a.mealId !== mealId),
    }));
  }, []);

  const assignMealToDay = useCallback((mealId: string, day: DayOfWeek) => {
    setState((s) => ({
      ...s,
      assignments: [
        ...s.assignments.filter((a) => a.day !== day),
        { day, mealId },
      ],
    }));
  }, []);

  const clearDay = useCallback((day: DayOfWeek) => {
    setState((s) => ({
      ...s,
      assignments: s.assignments.filter((a) => a.day !== day),
    }));
  }, []);

  const getMealForDay = useCallback(
    (day: DayOfWeek): Meal | undefined => {
      const assignment = state.assignments.find((a) => a.day === day);
      if (!assignment) return undefined;
      return state.meals.find((m) => m.id === assignment.mealId);
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
    assignments: state.assignments,
    syncStatus,
    syncError,
    isCloudEnabled,
    addMeal,
    removeMeal,
    assignMealToDay,
    clearDay,
    getMealForDay,
    getMealById,
    updateMealRecipe,
    exportData,
    importData,
  };
}
