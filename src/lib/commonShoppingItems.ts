export const DEFAULT_COMMON_SHOPPING_ITEMS = [
  "Milk",
  "Eggs",
  "Bread",
  "Butter",
  "Cheese",
  "Chicken breast",
  "Ground beef",
  "Rice",
  "Pasta",
  "Onions",
  "Garlic",
  "Potatoes",
  "Bananas",
  "Apples",
  "Coffee",
  "Olive oil",
  "Tomatoes",
  "Lettuce",
  "Yogurt",
  "Orange juice",
];

export function normalizeCommonShoppingItems(raw: string[] | undefined): string[] {
  if (!raw?.length) return [...DEFAULT_COMMON_SHOPPING_ITEMS];

  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trimmed);
  }
  return items.length > 0 ? items : [...DEFAULT_COMMON_SHOPPING_ITEMS];
}
