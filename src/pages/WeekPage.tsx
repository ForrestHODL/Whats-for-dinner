import { Link } from "react-router-dom";
import CalendarLinks from "../components/CalendarLinks";
import { MAIN_CATEGORY_ID, themeClassName } from "../lib/mealCategories";
import { buildMealCalendarLinks } from "../lib/googleCalendar";
import { DAYS } from "../types";
import { useStore } from "../StoreContext";

export default function WeekPage() {
  const {
    getMealsForDay,
    removeMealFromDay,
    clearDay,
    getDayCalendar,
    getCategoryForMeal,
  } = useStore();

  return (
    <div className="page">
      <header className="page-header">
        <h1>This Week</h1>
        <p className="page-lead">Your meal prep calendar</p>
      </header>

      <ul className="week-list">
        {DAYS.map((d) => {
          const meals = getMealsForDay(d.key);
          return (
            <li
              key={d.key}
              className={`week-day ${meals.length > 0 ? "has-meal" : ""}`}
            >
              <div className="week-day-label">
                <span className="week-day-short">{d.short}</span>
                <span className="week-day-full">{d.label}</span>
              </div>
              <div className="week-day-meal">
                {meals.length > 0 ? (
                  <ul className="week-day-meals">
                    {meals.map((meal) => {
                      const category = getCategoryForMeal(meal.id);
                      const themeClass = category
                        ? themeClassName(category.theme)
                        : "";
                      const calTitle =
                        category?.needsWho && meal.note
                          ? `${meal.note}: ${meal.title}`
                          : category && category.id !== MAIN_CATEGORY_ID
                            ? `${category.label}: ${meal.title}`
                            : meal.title;

                      return (
                        <li
                          key={meal.id}
                          className={`week-day-meal-item ${themeClass}`.trim()}
                        >
                          <div className="week-meal-info">
                            {category && category.id !== MAIN_CATEGORY_ID && (
                              <span className={`week-meal-cat ${themeClassName(category.theme)}`}>
                                {category.needsWho && meal.note
                                  ? meal.note
                                  : category.label}
                              </span>
                            )}
                            <div className="week-meal-title-row">
                              <Link
                                to={`/meals/${meal.id}/recipe`}
                                className="meal-name meal-name-link"
                              >
                                {meal.title}
                              </Link>
                            </div>
                            <Link
                              to={`/meals/${meal.id}/recipe`}
                              className="week-recipe-link"
                            >
                              Recipe
                            </Link>
                            <CalendarLinks
                              links={buildMealCalendarLinks({
                                mealTitle: calTitle,
                                day: d.key,
                                settings: getDayCalendar(d.key),
                                mealSlot: category?.mealSlot ?? "dinner",
                                details: `${window.location.origin}/meals/${meal.id}/recipe`,
                              })}
                              linkClassName="week-gcal-link"
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-clear"
                            onClick={() => removeMealFromDay(meal.id, d.key)}
                            aria-label={`Remove ${meal.title} from ${d.label}`}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span className="empty-slot">No meals yet</span>
                )}
                {meals.length > 1 && (
                  <button
                    type="button"
                    className="btn-clear-day"
                    onClick={() => clearDay(d.key)}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="hint">
        Tap meals on the <strong>Meals</strong> tab to add them to a day — you
        can schedule more than one per day.
      </p>
    </div>
  );
}
