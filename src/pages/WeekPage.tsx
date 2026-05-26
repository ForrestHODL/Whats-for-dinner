import { Link } from "react-router-dom";
import { DAYS } from "../types";
import { useStore } from "../StoreContext";

export default function WeekPage() {
  const { getMealForDay, clearDay } = useStore();

  return (
    <div className="page">
      <header className="page-header">
        <h1>This Week</h1>
        <p className="page-lead">Your meal prep calendar</p>
      </header>

      <ul className="week-list">
        {DAYS.map((d) => {
          const meal = getMealForDay(d.key);
          return (
            <li key={d.key} className={`week-day ${meal ? "has-meal" : ""}`}>
              <div className="week-day-label">
                <span className="week-day-short">{d.short}</span>
                <span className="week-day-full">{d.label}</span>
              </div>
              <div className="week-day-meal">
                {meal ? (
                  <>
                    <div className="week-meal-info">
                      <Link
                        to={`/meals/${meal.id}/recipe`}
                        className="meal-name meal-name-link"
                      >
                        {meal.title}
                      </Link>
                      <Link
                        to={`/meals/${meal.id}/recipe`}
                        className="week-recipe-link"
                      >
                        Recipe
                      </Link>
                    </div>
                    <button
                      type="button"
                      className="btn-clear"
                      onClick={() => clearDay(d.key)}
                      aria-label={`Clear ${d.label}`}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span className="empty-slot">No meal yet</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="hint">
        Tap a meal on the <strong>Meals</strong> tab to assign it to a day.
      </p>
    </div>
  );
}
