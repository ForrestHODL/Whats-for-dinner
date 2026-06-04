import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AddToShoppingListModal from "../components/AddToShoppingListModal";
import RecipeCategoryField from "../components/RecipeCategoryField";
import RecipeImageField from "../components/RecipeImageField";
import { MAIN_CATEGORY_ID, themeClassName } from "../lib/mealCategories";
import { useStore } from "../StoreContext";

export default function RecipePage() {
  const navigate = useNavigate();
  const { mealId } = useParams<{ mealId: string }>();
  const {
    getMealById,
    getRecipeById,
    getCategoryForMeal,
    saveMealRecipeForm,
    removeMeal,
    addShoppingItems,
  } = useStore();
  const meal = mealId ? getMealById(mealId) : undefined;
  const category = mealId ? getCategoryForMeal(mealId) : undefined;
  const libraryRecipe = meal?.recipeId
    ? getRecipeById(meal.recipeId)
    : undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [recipeCategoryId, setRecipeCategoryId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState<{
    recipeId: string;
  } | null>(null);
  const [showAddToShopping, setShowAddToShopping] = useState(false);
  const [addedToShopping, setAddedToShopping] = useState<number | null>(null);

  useEffect(() => {
    if (!meal) return;
    setTitle(meal.title);
    setDescription(libraryRecipe?.description ?? "");
    setImageUrl(libraryRecipe?.imageUrl ?? "");
    setBody(libraryRecipe?.body ?? meal.recipe);
    setRecipeCategoryId(libraryRecipe?.categoryId ?? "");
    setNoteDraft(meal.note ?? "");
  }, [meal, libraryRecipe]);

  if (!mealId || !meal) {
    return <Navigate to="/meals" replace />;
  }

  const themeClass = category ? themeClassName(category.theme) : "";
  const needsWho = category?.needsWho ?? false;
  const hasLibraryRecipe = Boolean(meal.recipeId && libraryRecipe);

  const baseline = {
    title: meal.title,
    description: libraryRecipe?.description ?? "",
    imageUrl: libraryRecipe?.imageUrl ?? "",
    body: libraryRecipe?.body ?? meal.recipe,
    recipeCategoryId: libraryRecipe?.categoryId ?? "",
    note: meal.note ?? "",
  };

  const hasChanges =
    title !== baseline.title ||
    description !== baseline.description ||
    imageUrl !== baseline.imageUrl ||
    body !== baseline.body ||
    recipeCategoryId !== baseline.recipeCategoryId ||
    (needsWho && noteDraft !== baseline.note);

  const handleSave = () => {
    if (!title.trim()) return;
    const { createdLibraryRecipe, recipeId: savedRecipeId } = saveMealRecipeForm(
      meal.id,
      {
        title,
        description,
        imageUrl: imageUrl.trim() || undefined,
        body,
        note: needsWho ? noteDraft : undefined,
        recipeCategoryId: recipeCategoryId || undefined,
      }
    );
    setSaved(true);
    if (createdLibraryRecipe && savedRecipeId) {
      setSavedToLibrary({ recipeId: savedRecipeId });
      setTimeout(() => setSavedToLibrary(null), 8000);
    }
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${meal.title}"? This removes the meal and any days it was assigned to.`
    );
    if (!confirmed) return;
    removeMeal(meal.id);
    navigate("/meals", { replace: true });
  };

  const handleAddToShopping = (items: string[]) => {
    const count = addShoppingItems(items, title.trim() || meal.title);
    setShowAddToShopping(false);
    setAddedToShopping(count);
    setTimeout(() => setAddedToShopping(null), 8000);
  };

  return (
    <div className={`page recipe-page saved-recipe-page ${themeClass}`.trim()}>
      <Link to="/meals" className="back-link">
        ← Meals
      </Link>

      {savedToLibrary && (
        <div className="toast" role="status">
          Saved to your recipe library!{" "}
          <Link
            to={`/recipes/${savedToLibrary.recipeId}`}
            className="toast-inline-link"
          >
            View in Recipes →
          </Link>
        </div>
      )}

      {saved && !savedToLibrary && (
        <div className="toast" role="status">
          Recipe saved
        </div>
      )}

      {addedToShopping !== null && (
        <div className="toast" role="status">
          Added {addedToShopping} item{addedToShopping === 1 ? "" : "s"}!{" "}
          <Link to="/shopping" className="toast-inline-link">
            Open shopping list →
          </Link>
        </div>
      )}

      <header className="page-header">
        <h1>{title.trim() || meal.title}</h1>
        <p className="page-lead">
          {category && category.id !== MAIN_CATEGORY_ID
            ? needsWho && noteDraft
              ? `${category.label} · For ${noteDraft}`
              : category.label
            : hasLibraryRecipe
              ? "Edit meal recipe — synced with your recipe library"
              : "Add your recipe — first save adds it to your library"}
        </p>
      </header>

      {hasLibraryRecipe && meal.recipeId && (
        <p className="recipe-library-link">
          <Link to={`/recipes/${meal.recipeId}`}>Open in Recipes tab →</Link>
        </p>
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
        {needsWho && (
          <label>
            Who is this for?
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. Mom, Jake, gluten-free"
            />
          </label>
        )}

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
          value={recipeCategoryId}
          onChange={(id) => setRecipeCategoryId(id ?? "")}
        />

        <label>
          Short description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One line summary for the recipe card"
          />
        </label>

        <RecipeImageField
          value={imageUrl}
          onChange={(url) => setImageUrl(url ?? "")}
          showPreview={false}
        />

        <label>
          Ingredients &amp; steps
          <textarea
            className="recipe-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder={
              "Ingredients:\n- \n\nInstructions:\n\n1. "
            }
          />
        </label>

        <button
          type="submit"
          className={`btn-primary btn-full ${themeClass}`.trim()}
          disabled={!title.trim() || !hasChanges}
        >
          {hasChanges
            ? hasLibraryRecipe
              ? "Save changes"
              : "Save to recipe library"
            : "Saved"}
        </button>
      </form>

      <section className="add-to-shopping-section">
        <h2>Shopping list</h2>
        <p>Pick ingredients from this recipe to add to your shopping list.</p>
        <button
          type="button"
          className={`btn-secondary btn-full ${themeClass}`.trim()}
          onClick={() => setShowAddToShopping(true)}
        >
          Add to shopping list
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

      {showAddToShopping && (
        <AddToShoppingListModal
          recipeTitle={title.trim() || meal.title}
          recipeBody={body}
          onAdd={handleAddToShopping}
          onClose={() => setShowAddToShopping(false)}
        />
      )}
    </div>
  );
}
