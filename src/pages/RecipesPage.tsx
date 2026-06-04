import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuickAddToWeekButton, {
  type QuickWeekResult,
} from "../components/QuickAddToWeekButton";
import QuickShopButton, {
  type QuickShopResult,
} from "../components/QuickShopButton";
import {
  filterRecipesByCategory,
  getRecipeCategoryById,
  RECIPE_FILTER_POPULARITY,
} from "../lib/recipeCategories";
import { useStore } from "../StoreContext";

export default function RecipesPage() {
  const { recipes, recipeCategories, addRecipeCategory, removeRecipeCategory } =
    useStore();

  const [filterCategoryId, setFilterCategoryId] = useState<string>(
    RECIPE_FILTER_POPULARITY
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [shopToast, setShopToast] = useState<QuickShopResult | null>(null);
  const [weekToast, setWeekToast] = useState<QuickWeekResult | null>(null);

  const filteredRecipes = useMemo(
    () => filterRecipesByCategory(recipes, filterCategoryId),
    [recipes, filterCategoryId]
  );

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const id = addRecipeCategory(newCategoryName);
    setNewCategoryName("");
    setShowAddCategory(false);
    if (id) setFilterCategoryId(id);
  };

  const activeCategory =
    filterCategoryId !== RECIPE_FILTER_POPULARITY
      ? getRecipeCategoryById(recipeCategories, filterCategoryId)
      : undefined;

  const canDeleteCategory =
    activeCategory &&
    !recipes.some((r) => r.categoryId === activeCategory.id);

  const handleShopResult = (result: QuickShopResult) => {
    setShopToast(result);
    setTimeout(() => setShopToast(null), 8000);
  };

  const handleWeekResult = (result: QuickWeekResult) => {
    setWeekToast(result);
    setTimeout(() => setWeekToast(null), 8000);
  };

  return (
    <div className="page recipes-page">
      <header className="page-header">
        <h1>Recipes</h1>
        <p className="page-lead">
          Most-viewed recipes first — image, title, and a short description
        </p>
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

      {weekToast && (
        <div className="toast" role="status">
          {weekToast.ok ? (
            <>
              {weekToast.recipeTitle} on {weekToast.dayLabel}!{" "}
              <Link to="/week" className="toast-inline-link">
                Open week →
              </Link>
            </>
          ) : (
            weekToast.message
          )}
        </div>
      )}

      <div className="recipes-actions">
        <Link to="/recipes/new" className="btn-primary recipes-action-btn">
          + New recipe
        </Link>
        <Link to="/recipes/import" className="btn-secondary recipes-action-btn">
          Import from website
        </Link>
      </div>

      <div className="recipes-filters">
        <label className="recipes-filter-field">
          <span className="recipes-filter-label">Show</span>
          <select
            className="recipes-filter-select"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            aria-label="Filter recipes"
          >
            <option value={RECIPE_FILTER_POPULARITY}>Popular</option>
            {recipeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary recipes-add-category-btn"
          onClick={() => setShowAddCategory((v) => !v)}
        >
          {showAddCategory ? "Cancel" : "+ Category"}
        </button>
      </div>

      {showAddCategory && (
        <form className="recipes-category-form" onSubmit={handleAddCategory}>
          <label>
            New category
            <input
              type="text"
              placeholder="e.g. Breakfast, Desserts"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="btn-primary"
            disabled={!newCategoryName.trim()}
          >
            Add category
          </button>
        </form>
      )}

      {canDeleteCategory && activeCategory && (
        <button
          type="button"
          className="btn-ghost recipes-delete-category-btn"
          onClick={() => {
            if (
              window.confirm(`Delete category "${activeCategory.label}"?`)
            ) {
              removeRecipeCategory(activeCategory.id);
              setFilterCategoryId(RECIPE_FILTER_POPULARITY);
            }
          }}
        >
          Delete &quot;{activeCategory.label}&quot; category
        </button>
      )}

      {filteredRecipes.length === 0 ? (
        <p className="recipes-empty">
          {recipes.length === 0
            ? "No recipes yet. Create one or import from a recipe URL."
            : "No recipes in this category."}
        </p>
      ) : (
        <ul className="recipes-grid">
          {filteredRecipes.map((recipe) => {
            const category = recipe.categoryId
              ? getRecipeCategoryById(recipeCategories, recipe.categoryId)
              : undefined;
            return (
              <li key={recipe.id}>
                <div className="recipe-card">
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="recipe-card-main"
                  >
                    <div className="recipe-card-media">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt=""
                          loading="lazy"
                          className="recipe-card-image"
                        />
                      ) : (
                        <div className="recipe-card-placeholder" aria-hidden>
                          🍳
                        </div>
                      )}
                    </div>
                    <div className="recipe-card-body">
                      {category && (
                        <span className="recipe-card-category">
                          {category.label}
                        </span>
                      )}
                      <h2 className="recipe-card-title">{recipe.title}</h2>
                      {recipe.description ? (
                        <p className="recipe-card-desc">{recipe.description}</p>
                      ) : (
                        <p className="recipe-card-desc recipe-card-desc-muted">
                          No description
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="recipe-card-quick-actions">
                    <QuickAddToWeekButton
                      recipeId={recipe.id}
                      recipeTitle={recipe.title}
                      onResult={handleWeekResult}
                    />
                    <QuickShopButton
                      sourceTitle={recipe.title}
                      body={recipe.body}
                      onResult={handleShopResult}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
