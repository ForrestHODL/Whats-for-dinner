export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Meal {
  id: string;
  title: string;
  recipe: string;
  /** Times this meal was scheduled to a day (drives list order). */
  scheduleCount?: number;
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
  /** Morning of — e.g. start slow cooker */
  morningPrep: DayPrepReminder;
  /** Previous day — e.g. move from freezer to fridge */
  dayBeforePrep: DayPrepReminder;
}

export type DayCalendarMap = Record<DayOfWeek, DayCalendarSettings>;

export interface AppState {
  meals: Meal[];
  assignments: DayAssignment[];
  dayCalendar?: DayCalendarMap;
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
