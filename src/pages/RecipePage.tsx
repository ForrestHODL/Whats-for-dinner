import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../StoreContext";

export default function RecipePage() {
  const navigate = useNavigate();
  const { mealId } = useParams<{ mealId: string }>();
  const { getMealById, updateMealRecipe, removeMeal } = useStore();
  const meal = mealId ? getMealById(mealId) : undefined;

  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (meal) setDraft(meal.recipe);
  }, [meal]);

  if (!mealId || !meal) {
    return <Navigate to="/meals" replace />;
  }

  const handleSave = () => {
    updateMealRecipe(meal.id, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = draft !== meal.recipe;

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${meal.title}"? This removes the meal and any days it was assigned to.`
    );
    if (!confirmed) return;
    removeMeal(meal.id);
    navigate("/meals", { replace: true });
  };

  return (
    <div className="page recipe-page">
      <Link to="/meals" className="back-link">
        ← Meals
      </Link>

      <header className="page-header">
        <h1>{meal.title}</h1>
        <p className="page-lead">Recipe</p>
      </header>

      {saved && (
        <div className="toast" role="status">
          Recipe saved
        </div>
      )}

      <section className="recipe-editor">
        <label htmlFor="recipe-text">Ingredients & steps</label>
        <textarea
          id="recipe-text"
          className="recipe-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Example:\n\nIngredients:\n- 2 chicken breasts\n- 1 cup rice\n\nSteps:\n1. Season and grill chicken\n2. Cook rice\n3. Serve together`}
          rows={14}
        />
        <button
          type="button"
          className="btn-primary btn-full"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          {hasChanges ? "Save recipe" : "Saved"}
        </button>
      </section>

      <section className="recipe-danger-zone">
        <h2>Delete meal</h2>
        <p>Remove this meal from your library and the weekly calendar.</p>
        <button
          type="button"
          className="btn-danger btn-full"
          onClick={handleDelete}
        >
          Delete meal
        </button>
      </section>
    </div>
  );
}
