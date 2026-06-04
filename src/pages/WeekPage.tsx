import { useState } from "react";
import { Link } from "react-router-dom";
import CalendarLinks from "../components/CalendarLinks";
import QuickShopButton, {
  type QuickShopResult,
} from "../components/QuickShopButton";
import { MAIN_CATEGORY_ID, themeClassName } from "../lib/mealCategories";
import { guestEmailsForCalendar } from "../lib/calendarGuests";
import { buildMealCalendarLinks } from "../lib/googleCalendar";
import { getMealRecipeBody } from "../lib/mealRecipeBody";
import { DAYS } from "../types";
import { useStore } from "../StoreContext";

export default function WeekPage() {
  const {
    getMealsForDay,
    removeMealFromDay,
    clearDay,
    getDayCalendar,
    getCategoryForMeal,
    getRecipeById,
    calendarGuests,
  } = useStore();

  const [shopToast, setShopToast] = useState<QuickShopResult | null>(null);

  const handleShopResult = (result: QuickShopResult) => {
    setShopToast(result);
    setTimeout(() => setShopToast(null), 8000);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>This Week</h1>
        <p className="page-lead">Your meal prep calendar</p>
      </header>

      {shopToast && (
        <div className="toast" role="status">
          {shopToast.ok ? (
            <>
              Added {shopToast.count} item{shopToast.count === 1 ? "" : "s"} from{" "}
              {shopToast.sourceTitle}!{" "}
              <Link to="/shopping" className="toast-inline-link">
                Open shopping list →
              </Link>
            </>
          ) : (
            shopToast.message
          )}
        </div>
      )}

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
                            <div className="week-meal-quick-actions">
                              <QuickShopButton
                                sourceTitle={meal.title}
                                body={getMealRecipeBody(
                                  meal,
                                  meal.recipeId
                                    ? getRecipeById(meal.recipeId)
                                    : undefined
                                )}
                                className={themeClass}
                                onResult={handleShopResult}
                              />
                              <Link
                                to={`/meals/${meal.id}/recipe`}
                                className={`btn-recipe ${themeClass}`.trim()}
                              >
                                Recipe
                              </Link>
                            </div>
                            <CalendarLinks
                              links={buildMealCalendarLinks({
                                mealTitle: calTitle,
                                day: d.key,
                                settings: getDayCalendar(d.key),
                                mealSlot: category?.mealSlot ?? "dinner",
                                details: `${window.location.origin}/meals/${meal.id}/recipe`,
                                guests: guestEmailsForCalendar(calendarGuests),
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
        Use <strong>Week</strong> on a recipe card, or tap a meal on{" "}
        <strong>Meals</strong> to pick a day — you can schedule more than one per
        day.
      </p>
    </div>
  );
}
