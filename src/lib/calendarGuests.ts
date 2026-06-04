import type { CalendarGuest } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGuestEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function normalizeCalendarGuests(raw: unknown): CalendarGuest[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const guests: CalendarGuest[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<CalendarGuest>;
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!isValidGuestEmail(email) || seen.has(email)) continue;
    seen.add(email);
    const id =
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : crypto.randomUUID();
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : undefined;
    guests.push({ id, email, label });
  }

  return guests;
}

export function guestEmailsForCalendar(guests: CalendarGuest[]): string[] {
  return guests.map((g) => g.email);
}
