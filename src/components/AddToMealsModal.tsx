import { useState } from "react";
import { themeClassName } from "../lib/mealCategories";
import type { MealCategory } from "../types";

interface AddToMealsModalProps {
  recipeTitle: string;
  categories: MealCategory[];
  onSelect: (categoryId: string, note?: string) => void;
  onClose: () => void;
}

export default function AddToMealsModal({
  recipeTitle,
  categories,
  onSelect,
  onClose,
}: AddToMealsModalProps) {
  const [pendingCategory, setPendingCategory] = useState<MealCategory | null>(
    null
  );
  const [who, setWho] = useState("");

  const handleCategoryClick = (category: MealCategory) => {
    if (category.needsWho) {
      setPendingCategory(category);
      return;
    }
    onSelect(category.id);
  };

  const handleWhoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCategory || !who.trim()) return;
    onSelect(pendingCategory.id, who.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-to-meals-title"
        aria-modal="true"
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id="add-to-meals-title" className="modal-title">
          Add to which tab?
        </h2>
        <p className="modal-subtitle">{recipeTitle}</p>

        {pendingCategory ? (
          <form className="add-to-meals-who-form" onSubmit={handleWhoSubmit}>
            <label>
              Who is this for?
              <input
                type="text"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                placeholder="e.g. Mom, Jake"
                autoFocus
                required
              />
            </label>
            <div className="add-to-meals-who-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setPendingCategory(null);
                  setWho("");
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!who.trim()}
              >
                Add meal
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="category-picker-list">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-picker-btn ${themeClassName(category.theme)}`}
                  onClick={() => handleCategoryClick(category)}
                >
                  {category.label.trim() || "Untitled tab"}
                </button>
              ))}
            </div>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
