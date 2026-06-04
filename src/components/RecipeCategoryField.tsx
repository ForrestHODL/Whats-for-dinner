import { useState } from "react";
import { useStore } from "../StoreContext";

export const RECIPE_NEW_CATEGORY = "__new__";

interface RecipeCategoryFieldProps {
  value: string;
  onChange: (categoryId: string | undefined) => void;
}

export default function RecipeCategoryField({
  value,
  onChange,
}: RecipeCategoryFieldProps) {
  const { recipeCategories, addRecipeCategory } = useStore();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === RECIPE_NEW_CATEGORY) {
      setAdding(true);
      return;
    }
    setAdding(false);
    setNewName("");
    onChange(selected || undefined);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = addRecipeCategory(trimmed);
    if (id) {
      onChange(id);
      setNewName("");
      setAdding(false);
    }
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewName("");
  };

  return (
    <div className="recipe-category-field">
      <label>
        Category
        <select
          className="recipe-category-select"
          value={adding ? RECIPE_NEW_CATEGORY : value || ""}
          onChange={handleSelect}
        >
          <option value="">No category</option>
          {recipeCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
          <option value={RECIPE_NEW_CATEGORY}>+ Add new category…</option>
        </select>
      </label>

      {adding && (
        <form className="recipe-category-add-inline" onSubmit={handleAddNew}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Breakfast, Desserts"
            autoFocus
          />
          <div className="recipe-category-add-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={cancelAdd}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!newName.trim()}
            >
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
