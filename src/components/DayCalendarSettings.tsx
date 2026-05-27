import { useStore } from "../StoreContext";
import { parseTimeInput, timeInputValue } from "../lib/googleCalendar";
import { DAYS, type DayOfWeek, type DayPrepReminder } from "../types";

function PrepRow({
  label,
  hint,
  prep,
  onChange,
}: {
  label: string;
  hint: string;
  prep: DayPrepReminder;
  onChange: (patch: Partial<DayPrepReminder>) => void;
}) {
  return (
    <div className="day-cal-prep">
      <label className="day-cal-check">
        <input
          type="checkbox"
          checked={prep.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        <span>{label}</span>
      </label>
      <p className="day-cal-hint">{hint}</p>
      <input
        type="time"
        className="day-cal-time"
        value={timeInputValue(prep.hour, prep.minute)}
        disabled={!prep.enabled}
        onChange={(e) => {
          const { hour, minute } = parseTimeInput(e.target.value);
          onChange({ hour, minute });
        }}
        aria-label={`${label} time`}
      />
    </div>
  );
}

function DayRow({ dayKey, label }: { dayKey: DayOfWeek; label: string }) {
  const { getDayCalendar, updateDayCalendar } = useStore();
  const settings = getDayCalendar(dayKey);

  const setDinnerTime = (value: string) => {
    const { hour, minute } = parseTimeInput(value);
    updateDayCalendar(dayKey, { dinnerHour: hour, dinnerMinute: minute });
  };

  return (
    <details className="day-cal-row">
      <summary className="day-cal-summary">
        <span className="day-cal-day">{label}</span>
        <span className="day-cal-dinner-preview">
          Dinner {timeInputValue(settings.dinnerHour, settings.dinnerMinute)}
        </span>
      </summary>
      <div className="day-cal-body">
        <label className="day-cal-field">
          <span>Dinner</span>
          <input
            type="time"
            className="day-cal-time"
            value={timeInputValue(settings.dinnerHour, settings.dinnerMinute)}
            onChange={(e) => setDinnerTime(e.target.value)}
          />
        </label>
        <PrepRow
          label="Morning prep (slow cook)"
          hint="Same day — start the slow cooker, marinade, etc."
          prep={settings.morningPrep}
          onChange={(patch) =>
            updateDayCalendar(dayKey, {
              morningPrep: { ...settings.morningPrep, ...patch },
            })
          }
        />
        <PrepRow
          label="Day-before prep (freezer)"
          hint="Previous day — thaw, move from freezer to fridge"
          prep={settings.dayBeforePrep}
          onChange={(patch) =>
            updateDayCalendar(dayKey, {
              dayBeforePrep: { ...settings.dayBeforePrep, ...patch },
            })
          }
        />
      </div>
    </details>
  );
}

export default function DayCalendarSettingsSection() {
  return (
    <section className="settings-section">
      <h2>Calendar times</h2>
      <p>
        Default dinner is <strong>5:00 PM</strong>. Set times per day — enable
        morning or day-before reminders when you need them. Syncs with your
        account.
      </p>
      <div className="day-cal-list">
        {DAYS.map((d) => (
          <DayRow key={d.key} dayKey={d.key} label={d.label} />
        ))}
      </div>
    </section>
  );
}
