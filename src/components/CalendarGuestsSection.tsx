import { useState } from "react";
import { isValidGuestEmail } from "../lib/calendarGuests";
import { useStore } from "../StoreContext";

export default function CalendarGuestsSection() {
  const { calendarGuests, addCalendarGuest, removeCalendarGuest } = useStore();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!isValidGuestEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    const id = addCalendarGuest(trimmed, label);
    if (!id) {
      setError("That email is already linked.");
      return;
    }

    setEmail("");
    setLabel("");
    setError(null);
  };

  return (
    <section className="settings-section">
      <h2>Calendar guests</h2>
      <p>
        Link household emails here. When you add a meal or shopping trip to
        Google Calendar, they&apos;re pre-filled as guests — you still tap Save
        in Google Calendar to send invites.
      </p>

      {calendarGuests.length > 0 ? (
        <ul className="calendar-guest-list">
          {calendarGuests.map((guest) => (
            <li key={guest.id} className="calendar-guest-row">
              <div className="calendar-guest-card">
                <div className="calendar-guest-body">
                  {guest.label ? (
                    <span className="calendar-guest-name">{guest.label}</span>
                  ) : null}
                  <span className="calendar-guest-email" title={guest.email}>
                    {guest.email}
                  </span>
                </div>
                <button
                  type="button"
                  className="calendar-guest-remove"
                  onClick={() => removeCalendarGuest(guest.id)}
                  aria-label={`Remove ${guest.email}`}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="calendar-guest-empty">No guests linked yet.</p>
      )}

      <form className="calendar-guest-form" onSubmit={handleAdd}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="partner@example.com"
          />
        </label>
        <label>
          Name <span className="label-optional">(optional)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Partner"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn-secondary btn-full"
          disabled={!email.trim()}
        >
          Add guest
        </button>
      </form>
    </section>
  );
}
