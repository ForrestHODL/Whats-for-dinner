import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloudEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type MealPlanRow = {
  user_id: string;
  data: AppState;
  updated_at: string;
};

export async function fetchCloudPlan(userId: string): Promise<MealPlanRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("meal_plans")
    .select("user_id, data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as MealPlanRow | null;
}

export async function saveCloudPlan(userId: string, state: AppState): Promise<string> {
  if (!supabase) throw new Error("Cloud sync is not configured");

  const updated_at = new Date().toISOString();
  const { error } = await supabase.from("meal_plans").upsert({
    user_id: userId,
    data: state,
    updated_at,
  });

  if (error) throw error;
  return updated_at;
}
