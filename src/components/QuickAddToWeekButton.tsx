import { useState } from "react";
import DayPickerModal from "./DayPickerModal";
import { MAIN_CATEGORY_ID } from "../lib/mealCategories";
import { useStore } from "../StoreContext";
import { DAYS, type DayOfWeek } from "../types";

export type QuickWeekResult =
  | { ok: true; recipeTitle: string; dayLabel: string }
  | { ok: false; message: string; recipeTitle: string };

interface QuickAddToWeekButtonProps {
  recipeId: string;
  recipeTitle: string;
  className?: string;
  onResult?: (result: QuickWeekResult) => void;
}

export default function QuickAddToWeekButton({
  recipeId,
  recipeTitle,
  className = "",
  onResult,
}: QuickAddToWeekButtonProps) {
  const { getMealsForRecipe, addMealFromRecipe, assignMealToDay } = useStore();
  const [pickingDay, setPickingDay] = useState(false);
  const [mealId, setMealId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const linked = getMealsForRecipe(recipeId);
    const resolvedMealId =
      linked[0]?.id ?? addMealFromRecipe(recipeId, MAIN_CATEGORY_ID);

    if (!resolvedMealId) {
      onResult?.({
        ok: false,
        message: "Could not add to week",
        recipeTitle,
      });
      return;
    }

    setMealId(resolvedMealId);
    setPickingDay(true);
  };

  const handleDaySelect = (day: DayOfWeek) => {
    if (!mealId) return;
    assignMealToDay(mealId, day);
    setPickingDay(false);
    setMealId(null);
    const dayLabel = DAYS.find((d) => d.key === day)?.label ?? day;
    onResult?.({ ok: true, recipeTitle, dayLabel });
  };

  const handleClose = () => {
    setPickingDay(false);
    setMealId(null);
  };

  return (
    <>
      <button
        type="button"
        className={`btn-recipe ${className}`.trim()}
        onClick={handleClick}
        title="Add to a day this week"
        aria-label={`Add ${recipeTitle} to this week`}
      >
        Week
      </button>
      {pickingDay && (
        <DayPickerModal
          mealTitle={recipeTitle}
          onSelect={handleDaySelect}
          onClose={handleClose}
        />
      )}
    </>
  );
}
