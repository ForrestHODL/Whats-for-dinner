import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RecipeCategoryField from "../components/RecipeCategoryField";
import RecipeImageField from "../components/RecipeImageField";
import { useStore } from "../StoreContext";

export default function NewRecipePage() {
  const navigate = useNavigate();
  const { addRecipe, ensureMealForRecipe } = useStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = addRecipe({
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      body: body.trim(),
      categoryId: categoryId || undefined,
    });
    ensureMealForRecipe(id);
    navigate(`/recipes/${id}`, { replace: true });
  };

  return (
    <div className="page recipe-form-page">
      <Link to="/recipes" className="back-link">
        ← Recipes
      </Link>

      <header className="page-header">
        <h1>New recipe</h1>
        <p className="page-lead">
          Saves to your library and adds to Everyone on Meals automatically
        </p>
      </header>

      <form className="recipe-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sheet pan chicken"
            required
            autoFocus
          />
        </label>

        <RecipeCategoryField
          value={categoryId}
          onChange={(id) => setCategoryId(id ?? "")}
        />

        <label>
          Short description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One line summary for the card"
          />
        </label>

        <RecipeImageField
          value={imageUrl}
          onChange={(url) => setImageUrl(url ?? "")}
        />

        <label>
          Ingredients &amp; steps
          <textarea
            className="recipe-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Ingredients and instructions…"
          />
        </label>

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={!title.trim()}
        >
          Save recipe
        </button>
      </form>
    </div>
  );
}
