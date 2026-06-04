import { useMemo, useState } from "react";
import { parseRecipeIngredients } from "../lib/parseRecipeIngredients";

interface AddToShoppingListModalProps {
  recipeTitle: string;
  recipeBody: string;
  onAdd: (items: string[]) => void;
  onClose: () => void;
}

export default function AddToShoppingListModal({
  recipeTitle,
  recipeBody,
  onAdd,
  onClose,
}: AddToShoppingListModalProps) {
  const ingredients = useMemo(
    () => parseRecipeIngredients(recipeBody),
    [recipeBody]
  );
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(ingredients.map((_, i) => i))
  );

  const allSelected = selected.size === ingredients.length;
  const noneSelected = selected.size === 0;

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(ingredients.map((_, i) => i)));
  };

  const handleAdd = () => {
    const items = ingredients.filter((_, i) => selected.has(i));
    if (items.length === 0) return;
    onAdd(items);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal sheet shopping-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-to-shopping-title"
        aria-modal="true"
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id="add-to-shopping-title" className="modal-title">
          Add to shopping list
        </h2>
        <p className="modal-subtitle">{recipeTitle}</p>

        {ingredients.length === 0 ? (
          <p className="shopping-picker-empty">
            No ingredients found. Add an{" "}
            <strong>Ingredients:</strong> section with bullet points (
            <code>- item</code>) in the recipe.
          </p>
        ) : (
          <>
            <div className="shopping-picker-toolbar">
              <button type="button" className="btn-ghost" onClick={toggleAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="shopping-picker-count">
                {selected.size} of {ingredients.length}
              </span>
            </div>
            <ul className="shopping-picker-list">
              {ingredients.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <label className="shopping-picker-item">
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={() => toggle(index)}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn-primary btn-full"
              disabled={noneSelected}
              onClick={handleAdd}
            >
              Add {selected.size || ""} item{selected.size === 1 ? "" : "s"}
            </button>
          </>
        )}

        <button type="button" className="btn-ghost btn-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
