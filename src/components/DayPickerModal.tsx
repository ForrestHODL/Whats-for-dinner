import { DAYS, type DayOfWeek } from "../types";

interface DayPickerModalProps {
  mealTitle: string;
  onSelect: (day: DayOfWeek) => void;
  onClose: () => void;
}

export default function DayPickerModal({
  mealTitle,
  onSelect,
  onClose,
}: DayPickerModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="day-picker-title"
        aria-modal="true"
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id="day-picker-title" className="modal-title">
          Add to which day?
        </h2>
        <p className="modal-subtitle">{mealTitle}</p>
        <div className="day-picker-grid">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="day-picker-btn"
              onClick={() => onSelect(d.key)}
            >
              <span className="day-picker-short">{d.short}</span>
              <span className="day-picker-full">{d.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
