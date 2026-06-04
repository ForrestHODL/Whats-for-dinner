import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RecipeCategoryField from "../components/RecipeCategoryField";
import { fetchScrapedRecipe } from "../lib/recipeImport";
import { useStore } from "../StoreContext";

const URL_PATTERN = /^https?:\/\//i;

export default function ImportRecipePage() {
  const navigate = useNavigate();
  const { addRecipe, ensureMealForRecipe } = useStore();

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importAndSave = async (recipeUrl: string) => {
    const trimmed = recipeUrl.trim();
    if (!trimmed || !URL_PATTERN.test(trimmed)) return;

    setLoading(true);
    setError(null);
    try {
      const scraped = await fetchScrapedRecipe(trimmed);
      const title = scraped.title.trim() || "Untitled";
      const id = addRecipe({
        title,
        description: scraped.description.trim(),
        imageUrl: scraped.imageUrl?.trim() || undefined,
        body: scraped.body.trim(),
        sourceUrl: scraped.sourceUrl || trimmed,
        categoryId: categoryId || undefined,
      });
      ensureMealForRecipe(id);
      setLoading(false);
      navigate(`/recipes/${id}`, {
        replace: true,
        state: { addedToMeals: title },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void importAndSave(url);
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!URL_PATTERN.test(pasted)) return;
    e.preventDefault();
    setUrl(pasted);
    void importAndSave(pasted);
  };

  return (
    <div className="page recipe-form-page">
      <Link to="/recipes" className="back-link">
        ← Recipes
      </Link>

      <header className="page-header">
        <h1>Import from website</h1>
        <p className="page-lead">
          Paste a recipe URL — we fetch, save to your library, and add it to
          Everyone on Meals
        </p>
      </header>

      <form className="recipe-form" onSubmit={handleSubmit}>
        <RecipeCategoryField
          value={categoryId}
          onChange={(id) => setCategoryId(id ?? "")}
        />

        <label>
          Recipe URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handleUrlPaste}
            placeholder="https://example.com/your-recipe"
            required
            autoFocus
            disabled={loading}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={!url.trim() || loading}
        >
          {loading ? "Importing & saving…" : "Import recipe"}
        </button>
      </form>

      <p className="import-hint">
        Works with AllRecipes, Food Network, and most recipe blogs. Pasting a
        link starts import right away.
      </p>
    </div>
  );
}
