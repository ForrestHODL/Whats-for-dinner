import type { MealSlot } from "../types";

interface MealSlotFieldProps {
  value: MealSlot;
  onChange: (slot: MealSlot) => void;
  name?: string;
}

export default function MealSlotField({
  value,
  onChange,
  name = "mealSlot",
}: MealSlotFieldProps) {
  return (
    <fieldset className="meal-slot-field">
      <legend className="meal-slot-legend">Lunch or dinner?</legend>
      <div className="meal-slot-options" role="radiogroup" aria-label="Lunch or dinner">
        <label className="meal-slot-option">
          <input
            type="radio"
            name={name}
            value="lunch"
            checked={value === "lunch"}
            onChange={() => onChange("lunch")}
          />
          Lunch
        </label>
        <label className="meal-slot-option">
          <input
            type="radio"
            name={name}
            value="dinner"
            checked={value === "dinner"}
            onChange={() => onChange("dinner")}
          />
          Dinner
        </label>
      </div>
    </fieldset>
  );
}
