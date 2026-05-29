import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import DayPickerModal from "../components/DayPickerModal";
import CalendarLinks from "../components/CalendarLinks";
import MealSlotField from "../components/MealSlotField";
import { MAIN_CATEGORY_ID, themeClassName } from "../lib/mealCategories";
import { buildMealCalendarLinks } from "../lib/googleCalendar";
import type { CalendarEventLink } from "../lib/googleCalendar";
import {
  DAYS,
  type DayOfWeek,
  type Meal,
  type MealCategory,
  type MealSlot,
} from "../types";

type ScheduledToast = {
  dayLabel: string;
  links: CalendarEventLink[];
};

function mealCalendarTitle(meal: Meal, category?: MealCategory): string {
  if (category?.needsWho && meal.note) {
    return `${meal.note}: ${meal.title}`;
  }
  if (category && category.id !== MAIN_CATEGORY_ID) {
    return `${category.label}: ${meal.title}`;
  }
  return meal.title;
}

export default function MealsPage() {
  const {
    mealCategories,
    getMealsForCategory,
    addMeal,
    addMealCategory,
    updateMealCategory,
    removeMealCategory,
    assignMealToDay,
    getDayCalendar,
  } = useStore();

  const [activeCategoryId, setActiveCategoryId] = useState(MAIN_CATEGORY_ID);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledToast | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newWho, setNewWho] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlot, setNewCategorySlot] = useState<MealSlot>("dinner");

  useEffect(() => {
    if (!mealCategories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(MAIN_CATEGORY_ID);
    }
  }, [mealCategories, activeCategoryId]);

  const activeCategory =
    mealCategories.find((c) => c.id === activeCategoryId) ?? mealCategories[0];
  const themeClass = activeCategory
    ? themeClassName(activeCategory.theme)
    : "";
  const categoryMeals = activeCategory
    ? getMealsForCategory(activeCategory.id)
    : [];
  const canDeleteCategory =
    activeCategory &&
    activeCategory.id !== MAIN_CATEGORY_ID &&
    categoryMeals.length === 0;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const id = addMealCategory(newCategoryName, newCategorySlot);
    setNewCategoryName("");
    setNewCategorySlot("dinner");
    setShowAddCategory(false);
    if (id) setActiveCategoryId(id);
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    if (activeCategory.needsWho) {
      if (!newWho.trim() || !newTitle.trim()) return;
      addMeal(newTitle, {
        categoryId: activeCategory.id,
        note: newWho.trim(),
      });
    } else {
      if (!newTitle.trim()) return;
      addMeal(newTitle, { categoryId: activeCategory.id });
    }
    setNewTitle("");
    setNewWho("");
  };

  const handleDaySelect = (day: DayOfWeek) => {
    if (!selectedMeal || !activeCategory) return;
    const category =
      mealCategories.find((c) => c.id === selectedMeal.categoryId) ??
      activeCategory;
    assignMealToDay(selectedMeal.id, day);
    const dayLabel = DAYS.find((d) => d.key === day)?.label ?? day;
    const details = `Planned in What's for Dinner\n${window.location.origin}/meals/${selectedMeal.id}/recipe`;
    const links = buildMealCalendarLinks({
      mealTitle: mealCalendarTitle(selectedMeal, category),
      day,
      settings: getDayCalendar(day),
      mealSlot: category.mealSlot,
      details,
    });
    setScheduled({ dayLabel, links });
    setSelectedMeal(null);
    setTimeout(() => setScheduled(null), 10000);
  };

  const renderMealList = (
    meals: Meal[],
    category: MealCategory
  ) => {
    const themed = themeClassName(category.theme);
    return (
      <ul className={`meals-list ${themed}`}>
        {meals.map((meal) => (
          <li key={meal.id}>
            <div className={`meal-card ${themed}`}>
              <button
                type="button"
                className="meal-card-main"
                onClick={() => setSelectedMeal(meal)}
              >
                <span className="meal-card-text">
                  {category.needsWho && meal.note ? (
                    <span className="meal-card-who">{meal.note}</span>
                  ) : null}
                  <span className="meal-card-title">{meal.title}</span>
                </span>
                <span className="meal-card-action">Choose day →</span>
              </button>
              <Link
                to={`/meals/${meal.id}/recipe`}
                className={`btn-recipe ${themed}`}
              >
                Recipe
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (!activeCategory) return null;

  return (
    <div className={`page ${themeClass ? `page-${themeClass}` : ""}`}>
      <header className="page-header">
        <h1>Meals</h1>
        <p className="page-lead">
          {activeCategory.id === MAIN_CATEGORY_ID
            ? "Most-scheduled meals first — tap to add to a day"
            : `Meals in ${activeCategory.label}`}
        </p>
      </header>

      <div className="meals-tabs-wrap">
        <div
          className="meals-tabs"
          role="tablist"
          aria-label="Meal categories"
        >
          {mealCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryId === cat.id}
              className={`meals-tab ${themeClassName(cat.theme)} ${
                activeCategoryId === cat.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveCategoryId(cat.id);
                setShowAddCategory(false);
              }}
            >
              {cat.label}
            </button>
          ))}
          <button
            type="button"
            className="meals-tab-add"
            onClick={() => setShowAddCategory(true)}
            aria-label="Add meal category"
            title="Add category (e.g. Lunch)"
          >
            +
          </button>
        </div>
      </div>

      {showAddCategory && (
        <form className="category-add-form" onSubmit={handleAddCategory}>
          <label>
            New category
            <input
              type="text"
              placeholder="e.g. Lunch, Snacks, Kids"
              value={newCategoryName}
              onChange={(e) => {
                const name = e.target.value;
                setNewCategoryName(name);
                if (/\blunch\b/i.test(name)) setNewCategorySlot("lunch");
                else if (/\bdinner\b/i.test(name)) setNewCategorySlot("dinner");
              }}
              autoFocus
            />
          </label>
          <MealSlotField
            name="newCategorySlot"
            value={newCategorySlot}
            onChange={setNewCategorySlot}
          />
          <div className="category-add-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowAddCategory(false);
                setNewCategoryName("");
                setNewCategorySlot("dinner");
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!newCategoryName.trim()}
            >
              Add tab
            </button>
          </div>
        </form>
      )}

      {scheduled && (
        <div className="toast toast-scheduled" role="status">
          <p>Scheduled for {scheduled.dayLabel}!</p>
          <p className="toast-sub">Tap each to add to Google Calendar:</p>
          <CalendarLinks links={scheduled.links} />
        </div>
      )}

      <div
        className={`category-panel ${themeClass || "category-panel-default"}`}
        role="tabpanel"
      >
        <label className="category-rename-field">
          <span className="category-rename-label">Tab name</span>
          <input
            type="text"
            className="category-rename-input"
            value={activeCategory.label}
            onChange={(e) =>
              updateMealCategory(activeCategory.id, { label: e.target.value })
            }
            disabled={activeCategory.id === MAIN_CATEGORY_ID}
            aria-label="Category name"
          />
        </label>

        <MealSlotField
          name={`slot-${activeCategory.id}`}
          value={activeCategory.mealSlot}
          onChange={(mealSlot) =>
            updateMealCategory(activeCategory.id, { mealSlot })
          }
        />

        <form className="add-meal-block" onSubmit={handleAddMeal}>
          {activeCategory.needsWho && (
            <div className="add-meal-form">
              <input
                type="text"
                placeholder="Who is this for?…"
                value={newWho}
                onChange={(e) => setNewWho(e.target.value)}
                aria-label="Who is this for"
              />
            </div>
          )}
          <div className="add-meal-form">
            <input
              type="text"
              placeholder="New meal name…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="New meal name"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={
                !newTitle.trim() ||
                (activeCategory.needsWho && !newWho.trim())
              }
            >
              Add
            </button>
          </div>
        </form>

        {categoryMeals.length > 0 ? (
          renderMealList(categoryMeals, activeCategory)
        ) : (
          <p className="meals-empty">No meals yet — add one above.</p>
        )}

        {canDeleteCategory && (
          <button
            type="button"
            className="btn-ghost category-delete-btn"
            onClick={() => {
              removeMealCategory(activeCategory.id);
              setActiveCategoryId(MAIN_CATEGORY_ID);
            }}
          >
            Delete this tab
          </button>
        )}
      </div>

      {selectedMeal && (
        <DayPickerModal
          mealTitle={(() => {
            const cat = mealCategories.find(
              (c) => c.id === selectedMeal.categoryId
            );
            if (cat?.needsWho && selectedMeal.note) {
              return `${selectedMeal.note} · ${selectedMeal.title}`;
            }
            return selectedMeal.title;
          })()}
          onSelect={handleDaySelect}
          onClose={() => setSelectedMeal(null)}
        />
      )}
    </div>
  );
}
