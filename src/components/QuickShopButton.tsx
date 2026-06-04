import { parseRecipeIngredients } from "../lib/parseRecipeIngredients";
import { useStore } from "../StoreContext";

export type QuickShopResult =
  | { ok: true; count: number; sourceTitle: string }
  | { ok: false; message: string; sourceTitle: string };

interface QuickShopButtonProps {
  sourceTitle: string;
  body: string;
  className?: string;
  onResult?: (result: QuickShopResult) => void;
}

export default function QuickShopButton({
  sourceTitle,
  body,
  className = "",
  onResult,
}: QuickShopButtonProps) {
  const { addShoppingItems } = useStore();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const ingredients = parseRecipeIngredients(body);
    if (ingredients.length === 0) {
      onResult?.({
        ok: false,
        message: "No ingredients found — add an Ingredients section first",
        sourceTitle,
      });
      return;
    }

    const count = addShoppingItems(ingredients, sourceTitle);
    onResult?.({ ok: true, count, sourceTitle });
  };

  return (
    <button
      type="button"
      className={`btn-recipe ${className}`.trim()}
      onClick={handleClick}
      title="Add all ingredients to shopping list"
      aria-label={`Add ${sourceTitle} ingredients to shopping list`}
    >
      Shop
    </button>
  );
}
