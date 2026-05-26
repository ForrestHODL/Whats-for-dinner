import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import DayPickerModal from "../components/DayPickerModal";
import type { Meal } from "../types";

export default function MealsPage() {
  const { meals, addMeal, assignMealToDay } = useStore();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [showAdded, setShowAdded] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addMeal(newTitle);
    setNewTitle("");
  };

  const handleDaySelect = (day: Parameters<typeof assignMealToDay>[1]) => {
    if (!selectedMeal) return;
    assignMealToDay(selectedMeal.id, day);
    setShowAdded(`${selectedMeal.title} → ${day}`);
    setSelectedMeal(null);
    setTimeout(() => setShowAdded(null), 2500);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Meals</h1>
        <p className="page-lead">Tap a meal to schedule it, or open its recipe</p>
      </header>

      {showAdded && (
        <div className="toast" role="status">
          Added to calendar!
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
        {meals.map((meal) => (
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
