import { useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import AddToMealsModal from "../components/AddToMealsModal";
import AddToShoppingListModal from "../components/AddToShoppingListModal";
import RecipeCategoryField from "../components/RecipeCategoryField";
import RecipeImageField from "../components/RecipeImageField";
import { useStore } from "../StoreContext";

export default function SavedRecipePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recipeId } = useParams<{ recipeId: string }>();
  const {
    mealCategories,
    getRecipeById,
    getMealsForRecipe,
    updateRecipe,
    removeRecipe,
    addMealFromRecipe,
    recordRecipeView,
    addShoppingItems,
  } = useStore();
  const recipe = recipeId ? getRecipeById(recipeId) : undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);
  const [showAddToMeals, setShowAddToMeals] = useState(false);
  const [showAddToShopping, setShowAddToShopping] = useState(false);
  const [addedToMeals, setAddedToMeals] = useState<string | null>(null);
  const [addedToShopping, setAddedToShopping] = useState<number | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!recipeId || viewedRef.current) return;
    viewedRef.current = true;
    recordRecipeView(recipeId);
  }, [recipeId, recordRecipeView]);

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description);
      setImageUrl(recipe.imageUrl ?? "");
      setBody(recipe.body);
    }
  }, [recipe]);

  useEffect(() => {
    const imported = location.state as { addedToMeals?: string } | null;
    if (!imported?.addedToMeals) return;
    setAddedToMeals("Everyone");
    navigate(location.pathname, { replace: true, state: null });
    const timer = setTimeout(() => setAddedToMeals(null), 8000);
    return () => clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  if (!recipeId || !recipe) {
    return <Navigate to="/recipes" replace />;
  }

  const hasChanges =
    title !== recipe.title ||
    description !== recipe.description ||
    imageUrl !== (recipe.imageUrl ?? "") ||
    body !== recipe.body;

  const handleSave = () => {
    updateRecipe(recipe.id, {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      body,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${recipe.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    removeRecipe(recipe.id);
    navigate("/recipes", { replace: true });
  };

  const linkedMeals = getMealsForRecipe(recipe.id);

  const handleAddToMeals = (categoryId: string, note?: string) => {
    addMealFromRecipe(recipe.id, categoryId, note);
    const category = mealCategories.find((c) => c.id === categoryId);
    const tabName = category?.label.trim() || "Meals";
    setShowAddToMeals(false);
    setAddedToMeals(tabName);
    setTimeout(() => setAddedToMeals(null), 8000);
  };

  const handleAddToShopping = (items: string[]) => {
    const count = addShoppingItems(items, title.trim() || recipe.title);
    setShowAddToShopping(false);
    setAddedToShopping(count);
    setTimeout(() => setAddedToShopping(null), 8000);
  };

  return (
    <div className="page saved-recipe-page">
      <Link to="/recipes" className="back-link">
        ← Recipes
      </Link>

      {addedToShopping !== null && (
        <div className="toast" role="status">
          Added {addedToShopping} item{addedToShopping === 1 ? "" : "s"}!{" "}
          <Link to="/shopping" className="toast-inline-link">
            Open shopping list →
          </Link>
        </div>
      )}

      {addedToMeals && (
        <div className="toast" role="status">
          Added to {addedToMeals}!{" "}
          <Link to="/meals" className="toast-inline-link">
            Open Meals →
          </Link>
        </div>
      )}

      {saved && (
        <div className="toast" role="status">
          Recipe saved
        </div>
      )}

      <div className="saved-recipe-hero">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="saved-recipe-hero-image"
          />
        ) : (
          <div className="saved-recipe-hero-placeholder" aria-hidden>
            🍳
          </div>
        )}
      </div>

      <form
        className="recipe-form saved-recipe-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (hasChanges) handleSave();
        }}
      >
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <RecipeCategoryField
          value={recipe.categoryId ?? ""}
          onChange={(categoryId) =>
            updateRecipe(recipe.id, { categoryId })
          }
        />

        <label>
          Short description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <RecipeImageField
          value={imageUrl}
          onChange={(url) => setImageUrl(url ?? "")}
          showPreview={false}
        />

        {recipe.sourceUrl && (
          <p className="recipe-source">
            Imported from{" "}
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
              {(() => {
                try {
                  return new URL(recipe.sourceUrl).hostname;
                } catch {
                  return recipe.sourceUrl;
                }
              })()}
            </a>
          </p>
        )}

        <label>
          Ingredients &amp; steps
          <textarea
            className="recipe-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
          />
        </label>

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={!hasChanges}
        >
          {hasChanges ? "Save changes" : "Saved"}
        </button>
      </form>

      <section className="add-to-shopping-section">
        <h2>Shopping list</h2>
        <p>Pick ingredients from this recipe to add to your shopping list.</p>
        <button
          type="button"
          className="btn-secondary btn-full"
          onClick={() => setShowAddToShopping(true)}
        >
          Add to shopping list
        </button>
      </section>

      <section className="add-to-meals-section">
        <h2>Add to meals</h2>
        <p>
          Put this on the Meals tab so you can schedule it on your week.
        </p>
        {linkedMeals.length > 0 && (
          <p className="add-to-meals-linked">
            On Meals in{" "}
            {linkedMeals
              .map((meal) => {
                const cat = mealCategories.find((c) => c.id === meal.categoryId);
                return cat?.label.trim() || "a tab";
              })
              .join(", ")}
          </p>
        )}
        <button
          type="button"
          className="btn-secondary btn-full"
          onClick={() => setShowAddToMeals(true)}
        >
          Add to meals
        </button>
      </section>

      <section className="recipe-danger-zone">
        <h2>Delete recipe</h2>
        <p>Remove this recipe from your collection.</p>
        <button
          type="button"
          className="btn-danger btn-full"
          onClick={handleDelete}
        >
          Delete recipe
        </button>
      </section>

      {showAddToMeals && (
        <AddToMealsModal
          recipeTitle={title.trim() || recipe.title}
          categories={mealCategories}
          onSelect={handleAddToMeals}
          onClose={() => setShowAddToMeals(false)}
        />
      )}

      {showAddToShopping && (
        <AddToShoppingListModal
          recipeTitle={title.trim() || recipe.title}
          recipeBody={body}
          onAdd={handleAddToShopping}
          onClose={() => setShowAddToShopping(false)}
        />
      )}
    </div>
  );
}
