export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** @deprecated Migrated to categoryId */
export type MealList = "main" | "alternate";

export type MealSlot = "lunch" | "dinner";

export type MealCategoryTheme =
  | "default"
  | "blue"
  | "warm"
  | "violet"
  | "rose"
  | "teal"
  | "lime"
  | "plum"
  | "coral";

export interface MealCategory {
  id: string;
  label: string;
  theme: MealCategoryTheme;
  /** Show "who is this for?" when adding meals */
  needsWho: boolean;
  /** Lunch events use 12pm; dinner uses per-day times in settings */
  mealSlot: MealSlot;
}

export interface Meal {
  id: string;
  title: string;
  recipe: string;
  /** Times this meal was scheduled to a day (drives list order). */
  scheduleCount?: number;
  /** Which tab/category this meal belongs to */
  categoryId?: string;
  /** @deprecated Use categoryId */
  list?: MealList;
  /** Who it's for (categories with needsWho) */
  note?: string;
}

export interface DayAssignment {
  day: DayOfWeek;
  mealId: string;
}

export interface DayPrepReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

/** Per-weekday Google Calendar times (synced with meal plan). */
export interface DayCalendarSettings {
  dinnerHour: number;
  dinnerMinute: number;
  morningPrep: DayPrepReminder;
  dayBeforePrep: DayPrepReminder;
}

export type DayCalendarMap = Record<DayOfWeek, DayCalendarSettings>;

export interface AppState {
  meals: Meal[];
  assignments: DayAssignment[];
  dayCalendar?: DayCalendarMap;
  mealCategories?: MealCategory[];
  /** @deprecated Migrated into mealCategories */
  alternateTabLabel?: string;
}

export const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];
