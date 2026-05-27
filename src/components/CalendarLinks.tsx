import type { CalendarEventLink } from "../lib/googleCalendar";

interface CalendarLinksProps {
  links: CalendarEventLink[];
  linkClassName?: string;
}

export default function CalendarLinks({
  links,
  linkClassName = "toast-link",
}: CalendarLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className="calendar-links">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
