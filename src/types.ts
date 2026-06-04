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
  /** Linked recipe library entry, if added from Recipes */
  recipeId?: string;
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

/** Household member or partner invited on Google Calendar events */
export interface CalendarGuest {
  id: string;
  email: string;
  /** Optional display name (e.g. Partner) */
  label?: string;
}

export interface RecipeCategory {
  id: string;
  label: string;
}

export interface RecipeEntry {
  id: string;
  title: string;
  /** Short summary shown on the recipe card */
  description: string;
  imageUrl?: string;
  /** Full ingredients & instructions text */
  body: string;
  sourceUrl?: string;
  categoryId?: string;
  /** Times the recipe detail page was opened */
  viewCount?: number;
  /** ISO timestamp of the most recent view (used to rank ties) */
  lastViewedAt?: string;
  createdAt: string;
}

export interface ShoppingItemDetail {
  /** Original ingredient line from the recipe */
  line: string;
  /** Recipe or meal this line came from */
  sourceTitle?: string;
}

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  /** Grocery store section (produce, meat, aisles, etc.) */
  categoryId?: string;
  /** Combined amounts/lines when merged from multiple recipes */
  details?: ShoppingItemDetail[];
  /** @deprecated Migrated into details */
  sourceTitle?: string;
  addedAt: string;
}

/** A section of the store for sorting the shopping list */
export interface ShoppingStoreCategory {
  id: string;
  label: string;
  /** Walk order — lower numbers appear first in the list */
  sortOrder: number;
}

export interface AppState {
  meals: Meal[];
  assignments: DayAssignment[];
  recipes?: RecipeEntry[];
  recipeCategories?: RecipeCategory[];
  dayCalendar?: DayCalendarMap;
  /** Emails pre-filled as guests on new Google Calendar events */
  calendarGuests?: CalendarGuest[];
  mealCategories?: MealCategory[];
  shoppingList?: ShoppingItem[];
  /** Store layout sections (produce, bakery, aisles, …) */
  shoppingStoreCategories?: ShoppingStoreCategory[];
  /** Quick-add staples on the shopping page */
  commonShoppingItems?: string[];
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
