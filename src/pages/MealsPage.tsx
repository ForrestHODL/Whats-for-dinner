import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import DayPickerModal from "../components/DayPickerModal";
import CalendarLinks from "../components/CalendarLinks";
import { buildMealCalendarLinks } from "../lib/googleCalendar";
import type { CalendarEventLink } from "../lib/googleCalendar";
import { DAYS, type DayOfWeek, type Meal } from "../types";

type ScheduledToast = {
  dayLabel: string;
  links: CalendarEventLink[];
};

export default function MealsPage() {
  const { mealsByPopularity, addMeal, assignMealToDay, getDayCalendar } =
    useStore();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [scheduled, setScheduled] = useState<ScheduledToast | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addMeal(newTitle);
    setNewTitle("");
  };

  const handleDaySelect = (day: DayOfWeek) => {
    if (!selectedMeal) return;
    assignMealToDay(selectedMeal.id, day);
    const dayLabel = DAYS.find((d) => d.key === day)?.label ?? day;
    const details = `Planned in What's for Dinner\n${window.location.origin}/meals/${selectedMeal.id}/recipe`;
    const links = buildMealCalendarLinks({
      mealTitle: selectedMeal.title,
      day,
      settings: getDayCalendar(day),
      details,
    });
    setScheduled({ dayLabel, links });
    setSelectedMeal(null);
    setTimeout(() => setScheduled(null), 10000);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Meals</h1>
        <p className="page-lead">
          Most-scheduled meals first — tap to plan, or open a recipe
        </p>
      </header>

      {scheduled && (
        <div className="toast toast-scheduled" role="status">
          <p>Scheduled for {scheduled.dayLabel}!</p>
          <p className="toast-sub">Tap each to add to Google Calendar:</p>
          <CalendarLinks links={scheduled.links} />
        </div>
      )}

      <form className="add-meal-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="New meal name…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          aria-label="New meal name"
        />
        <button type="submit" className="btn-primary" disabled={!newTitle.trim()}>
          Add
        </button>
      </form>

      <ul className="meals-list">
        {mealsByPopularity.map((meal) => (
          <li key={meal.id}>
            <div className="meal-card">
              <button
                type="button"
                className="meal-card-main"
                onClick={() => setSelectedMeal(meal)}
              >
                <span className="meal-card-title">{meal.title}</span>
                <span className="meal-card-action">Choose day →</span>
              </button>
              <Link
                to={`/meals/${meal.id}/recipe`}
                className="btn-recipe"
              >
                Recipe
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {selectedMeal && (
        <DayPickerModal
          mealTitle={selectedMeal.title}
          onSelect={handleDaySelect}
          onClose={() => setSelectedMeal(null)}
        />
      )}
    </div>
  );
}
