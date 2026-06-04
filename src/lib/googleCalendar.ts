import type { DayCalendarSettings, DayOfWeek, MealSlot } from "../types";

const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MEAL_DURATION_MINUTES = 60;
const PREP_DURATION_MINUTES = 30;

export const LUNCH_HOUR = 12;
export const LUNCH_MINUTE = 0;

export const DEFAULT_DAY_CALENDAR_SETTINGS: DayCalendarSettings = {
  dinnerHour: 17,
  dinnerMinute: 0,
  morningPrep: { enabled: false, hour: 8, minute: 0 },
  dayBeforePrep: { enabled: false, hour: 18, minute: 0 },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format for Google Calendar template URLs (local time). */
function formatGCalDateTime(d: Date): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

/** Next time this weekday occurs at the given clock time (local). */
export function getNextOccurrence(
  day: DayOfWeek,
  hour: number,
  minute: number
): Date {
  const target = DAY_INDEX[day];
  const now = new Date();
  let daysAhead = target - now.getDay();
  if (daysAhead < 0) daysAhead += 7;

  const result = new Date(now);
  result.setDate(now.getDate() + daysAhead);
  result.setHours(hour, minute, 0, 0);

  if (result <= now) {
    result.setDate(result.getDate() + 7);
  }
  return result;
}

function getDayBeforePrepDate(
  day: DayOfWeek,
  hour: number,
  minute: number
): Date {
  const mealDay = getNextOccurrence(day, 12, 0);
  const result = new Date(mealDay);
  result.setDate(result.getDate() - 1);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function buildEventUrl(
  title: string,
  start: Date,
  durationMinutes: number,
  details?: string,
  guests?: string[]
): string {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatGCalDateTime(start)}/${formatGCalDateTime(end)}`,
  });
  if (details) params.set("details", details);
  const guestList = guests?.map((e) => e.trim()).filter(Boolean) ?? [];
  if (guestList.length > 0) {
    params.set("add", guestList.join(","));
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildShoppingCalendarUrl(options: {
  title?: string;
  start: Date;
  durationMinutes?: number;
  items: string[];
  /** If set, used as event description instead of a flat bullet list */
  details?: string;
  /** Guest emails added to the Google Calendar event */
  guests?: string[];
}): string {
  const details =
    options.details?.trim() ||
    options.items.map((item) => `- ${item}`).join("\n");
  return buildEventUrl(
    options.title ?? "Grocery shopping",
    options.start,
    options.durationMinutes ?? 60,
    details || undefined,
    options.guests
  );
}

export function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  const { hour, minute } = parseTimeInput(timeValue);
  const result = new Date();
  result.setFullYear(year, month - 1, day);
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function defaultShoppingDateValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatTimeLabel(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: minute === 0 ? undefined : "2-digit",
  });
}

export function timeInputValue(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function parseTimeInput(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 17,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

export type CalendarEventLink = { label: string; url: string };

export function buildMealCalendarLinks(options: {
  mealTitle: string;
  day: DayOfWeek;
  settings: DayCalendarSettings;
  mealSlot?: MealSlot;
  details?: string;
  /** Guest emails added to each Google Calendar event */
  guests?: string[];
}): CalendarEventLink[] {
  const { mealTitle, day, settings, details, guests } = options;
  const mealSlot = options.mealSlot ?? "dinner";
  const links: CalendarEventLink[] = [];

  if (settings.dayBeforePrep.enabled) {
    const start = getDayBeforePrepDate(
      day,
      settings.dayBeforePrep.hour,
      settings.dayBeforePrep.minute
    );
    links.push({
      label: `Freezer · ${formatTimeLabel(settings.dayBeforePrep.hour, settings.dayBeforePrep.minute)}`,
      url: buildEventUrl(
        `Prep (freezer): ${mealTitle}`,
        start,
        PREP_DURATION_MINUTES,
        details,
        guests
      ),
    });
  }

  if (settings.morningPrep.enabled) {
    const start = getNextOccurrence(
      day,
      settings.morningPrep.hour,
      settings.morningPrep.minute
    );
    links.push({
      label: `Slow cook · ${formatTimeLabel(settings.morningPrep.hour, settings.morningPrep.minute)}`,
      url: buildEventUrl(
        `Prep (slow cook): ${mealTitle}`,
        start,
        PREP_DURATION_MINUTES,
        details,
        guests
      ),
    });
  }

  const mealHour =
    mealSlot === "lunch" ? LUNCH_HOUR : settings.dinnerHour;
  const mealMinute =
    mealSlot === "lunch" ? LUNCH_MINUTE : settings.dinnerMinute;
  const mealLabel = mealSlot === "lunch" ? "Lunch" : "Dinner";
  const mealStart = getNextOccurrence(day, mealHour, mealMinute);

  links.push({
    label: `${mealLabel} · ${formatTimeLabel(mealHour, mealMinute)}`,
    url: buildEventUrl(
      `${mealLabel}: ${mealTitle}`,
      mealStart,
      MEAL_DURATION_MINUTES,
      details,
      guests
    ),
  });

  return links;
}
