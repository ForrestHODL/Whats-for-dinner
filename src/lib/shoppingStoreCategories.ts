import type { ShoppingItem, ShoppingStoreCategory } from "../types";
import { formatShoppingItemDisplay } from "./mergeShoppingIngredients";

export const SHOPPING_CATEGORY_AISLES = "aisles";

export const DEFAULT_SHOPPING_STORE_CATEGORIES: ShoppingStoreCategory[] = [
  { id: "produce", label: "Produce", sortOrder: 0 },
  { id: "bakery", label: "Bakery", sortOrder: 1 },
  { id: "deli", label: "Deli", sortOrder: 2 },
  { id: "meat", label: "Meat & seafood", sortOrder: 3 },
  { id: "dairy", label: "Dairy & eggs", sortOrder: 4 },
  { id: "frozen", label: "Frozen", sortOrder: 5 },
  { id: "bulk", label: "Bulk aisle", sortOrder: 6 },
  { id: "baking", label: "Baking aisle", sortOrder: 7 },
  { id: "canned", label: "Canned & soup", sortOrder: 8 },
  { id: "pasta-grains", label: "Pasta & grains", sortOrder: 9 },
  { id: "snacks-drinks", label: "Snacks & drinks", sortOrder: 10 },
  { id: "condiments", label: "Condiments & sauces", sortOrder: 11 },
  { id: "pharmacy", label: "Pharmacy & household", sortOrder: 12 },
  { id: SHOPPING_CATEGORY_AISLES, label: "Other aisles", sortOrder: 13 },
];

type CategoryRule = { id: string; keywords: string[] };

/**
 * Higher-weight keywords win ties. Longer phrases beat single words.
 * Produce is checked via scoring (not last), so fresh items beat generic aisle words.
 */
const CATEGORY_RULES: CategoryRule[] = [
  {
    id: "frozen",
    keywords: [
      "frozen pizza",
      "frozen vegetable",
      "frozen fruit",
      "frozen berries",
      "frozen",
      "ice cream",
      "popsicle",
    ],
  },
  {
    id: "bakery",
    keywords: [
      "bread",
      "bagel",
      "hot dog bun",
      "hamburger bun",
      "dinner roll",
      "bun",
      "roll",
      "muffin",
      "croissant",
      "birthday cake",
      "cake",
      "pie crust",
      "pie",
      "donut",
      "doughnut",
      "pastry",
      "tortilla",
      "pita",
      "naan",
      "baguette",
      "brioche",
      "brownie",
      "baked",
      "bakery",
    ],
  },
  {
    id: "meat",
    keywords: [
      "chicken breast",
      "chicken thigh",
      "chicken wing",
      "chicken drumstick",
      "ground beef",
      "ground turkey",
      "ground pork",
      "ground chicken",
      "pork chop",
      "pork loin",
      "pork shoulder",
      "beef steak",
      "beef roast",
      "corned beef",
      "salmon fillet",
      "turkey breast",
      "rotisserie chicken",
      "chicken",
      "beef",
      "pork",
      "turkey",
      "bacon",
      "sausage",
      "ham",
      "prosciutto",
      "steak",
      "meatball",
      "meat",
      "fish",
      "salmon",
      "shrimp",
      "prawn",
      "seafood",
      "tuna",
      "cod",
      "tilapia",
      "lamb",
      "veal",
      "ribs",
      "brisket",
      "hot dog",
      "pepperoni",
    ],
  },
  {
    id: "deli",
    keywords: [
      "deli",
      "deli turkey",
      "deli ham",
      "sliced turkey",
      "sliced ham",
      "lunch meat",
      "cold cuts",
      "salami",
      "pastrami",
      "bologna",
      "mortadella",
      "capicola",
      "prosciutto",
      "antipasto",
      "charcuterie",
      "olive bar",
      "hummus",
      "tzatziki",
      "potato salad",
      "macaroni salad",
      "coleslaw",
      "rotisserie",
    ],
  },
  {
    id: "dairy",
    keywords: [
      "greek yogurt",
      "sour cream",
      "cream cheese",
      "cottage cheese",
      "half and half",
      "whipping cream",
      "heavy cream",
      "almond milk",
      "oat milk",
      "soy milk",
      "milk",
      "eggs",
      "egg",
      "cheese",
      "butter",
      "yogurt",
      "mozzarella",
      "cheddar",
      "parmesan",
      "feta",
      "ricotta",
      "dairy",
    ],
  },
  {
    id: "bulk",
    keywords: [
      "bulk",
      "rolled oats",
      "steel cut oats",
      "oat groats",
      "almonds",
      "walnuts",
      "pecans",
      "cashews",
      "pistachios",
      "macadamia",
      "hazelnuts",
      "peanuts",
      "sunflower seeds",
      "pumpkin seeds",
      "chia seeds",
      "flax seed",
      "flaxseed",
      "hemp hearts",
      "dried cranberries",
      "dried apricots",
      "raisins",
      "trail mix",
      "granola bulk",
      "bulk bin",
    ],
  },
  {
    id: "baking",
    keywords: [
      "all purpose flour",
      "bread flour",
      "cake flour",
      "whole wheat flour",
      "flour",
      "sugar",
      "brown sugar",
      "powdered sugar",
      "confectioners sugar",
      "baking powder",
      "baking soda",
      "active dry yeast",
      "instant yeast",
      "yeast",
      "vanilla extract",
      "almond extract",
      "cocoa powder",
      "chocolate chips",
      "shortening",
      "cornstarch",
      "corn starch",
      "molasses",
      "food coloring",
      "frosting",
      "sprinkles",
      "pie filling",
    ],
  },
  {
    id: "canned",
    keywords: [
      "canned tomatoes",
      "canned corn",
      "canned peas",
      "canned beans",
      "canned tuna",
      "canned salmon",
      "canned soup",
      "canned",
      "can of",
      "soup",
      "chicken broth",
      "beef broth",
      "vegetable broth",
      "stock",
      "broth",
      "bouillon",
      "black beans",
      "kidney beans",
      "pinto beans",
      "chickpeas",
      "garbanzo",
      "diced tomatoes",
      "tomato paste",
      "coconut milk",
    ],
  },
  {
    id: "pasta-grains",
    keywords: [
      "white rice",
      "brown rice",
      "jasmine rice",
      "basmati rice",
      "wild rice",
      "rice",
      "pasta",
      "spaghetti",
      "penne",
      "rigatoni",
      "fettuccine",
      "linguine",
      "macaroni",
      "noodle",
      "ramen",
      "couscous",
      "quinoa",
      "barley",
      "farro",
      "bulgur",
      "polenta",
      "grits",
      "cereal",
      "oatmeal",
      "granola",
      "instant oatmeal",
    ],
  },
  {
    id: "snacks-drinks",
    keywords: [
      "potato chips",
      "tortilla chips",
      "chips",
      "pretzel",
      "popcorn",
      "crackers",
      "cracker",
      "rice cakes",
      "soda",
      "cola",
      "sprite",
      "pepsi",
      "coke",
      "ginger ale",
      "root beer",
      "sparkling water",
      "seltzer",
      "orange juice",
      "apple juice",
      "cranberry juice",
      "grape juice",
      "juice",
      "coffee",
      "tea",
      "kombucha",
      "energy drink",
      "sports drink",
      "snack",
      "candy",
      "chocolate bar",
      "chocolate",
      "granola bar",
      "protein bar",
      "cookie dough",
    ],
  },
  {
    id: "condiments",
    keywords: [
      "peanut butter",
      "almond butter",
      "sunflower butter",
      "olive oil",
      "vegetable oil",
      "canola oil",
      "coconut oil",
      "sesame oil",
      "avocado oil",
      "hot sauce",
      "soy sauce",
      "fish sauce",
      "worcestershire",
      "bbq sauce",
      "barbecue sauce",
      "pasta sauce",
      "marinara",
      "tomato sauce",
      "condiment",
      "ketchup",
      "mustard",
      "mayonnaise",
      "mayo",
      "relish",
      "salsa",
      "dressing",
      "vinaigrette",
      "vinegar",
      "balsamic",
      "seasoning",
      "spice",
      "black pepper",
      "white pepper",
      "cayenne",
      "paprika",
      "cumin",
      "oregano",
      "thyme dried",
      "rosemary dried",
      "honey",
      "maple syrup",
      "jam",
      "jelly",
      "syrup",
    ],
  },
  {
    id: "pharmacy",
    keywords: [
      "pharmacy",
      "aspirin",
      "ibuprofen",
      "advil",
      "tylenol",
      "acetaminophen",
      "antacid",
      "allergy medicine",
      "antihistamine",
      "cough syrup",
      "cold medicine",
      "vitamin",
      "supplement",
      "multivitamin",
      "probiotic",
      "bandage",
      "band-aid",
      "first aid",
      "shampoo",
      "conditioner",
      "body wash",
      "soap",
      "bar soap",
      "toothpaste",
      "toothbrush",
      "dental floss",
      "mouthwash",
      "deodorant",
      "antiperspirant",
      "lotion",
      "sunscreen",
      "tissues",
      "toilet paper",
      "paper towels",
      "paper towel",
      "laundry detergent",
      "dish soap",
      "dishwasher pods",
      "trash bags",
      "ziploc",
      "aluminum foil",
      "plastic wrap",
      "parchment paper",
      "tampon",
      "pad",
      "razor",
      "shaving cream",
    ],
  },
  {
    id: "produce",
    keywords: [
      "sweet potato",
      "bell pepper",
      "red pepper",
      "green pepper",
      "green onion",
      "spring onion",
      "scallion",
      "green bean",
      "string bean",
      "snap pea",
      "snow pea",
      "brussels sprout",
      "romaine",
      "iceberg lettuce",
      "mixed greens",
      "salad mix",
      "baby spinach",
      "cherry tomato",
      "grape tomato",
      "roma tomato",
      "plum tomato",
      "tomato",
      "potato",
      "yam",
      "onion",
      "shallot",
      "leek",
      "garlic",
      "ginger root",
      "ginger",
      "lettuce",
      "spinach",
      "kale",
      "arugula",
      "chard",
      "carrot",
      "celery",
      "cucumber",
      "broccoli",
      "cauliflower",
      "mushroom",
      "zucchini",
      "courgette",
      "squash",
      "butternut",
      "acorn squash",
      "pumpkin",
      "cabbage",
      "bok choy",
      "jalapeno",
      "habanero",
      "serrano",
      "cilantro",
      "coriander",
      "parsley",
      "basil",
      "mint",
      "dill",
      "thyme",
      "rosemary",
      "chive",
      "apple",
      "banana",
      "orange",
      "lemon",
      "lime",
      "grapefruit",
      "grape",
      "berry",
      "strawberry",
      "blueberry",
      "raspberry",
      "blackberry",
      "cranberry",
      "melon",
      "watermelon",
      "cantaloupe",
      "honeydew",
      "pineapple",
      "mango",
      "peach",
      "pear",
      "plum",
      "nectarine",
      "apricot",
      "avocado",
      "corn",
      "pea",
      "asparagus",
      "beet",
      "radish",
      "turnip",
      "parsnip",
      "rutabaga",
      "eggplant",
      "aubergine",
      "artichoke",
      "fennel",
      "okra",
      "fig",
      "pomegranate",
      "kiwi",
      "coconut",
      "fruit",
      "vegetable",
      "veggie",
      "produce",
      "salad",
      "greens",
      "herb",
      "fresh herb",
    ],
  },
  {
    id: SHOPPING_CATEGORY_AISLES,
    keywords: [
      "mac and cheese",
      "instant",
      "meal kit",
      "box mix",
      "salt",
      "lentil",
      "dried lentils",
      "split peas",
      "misc",
      "other",
    ],
  },
];

/** Prefer fresh/specific sections over generic aisles when scores tie. */
const TIE_BREAK_ORDER = [
  "produce",
  "dairy",
  "meat",
  "deli",
  "bakery",
  "frozen",
  "bulk",
  "baking",
  "canned",
  "pasta-grains",
  "condiments",
  "snacks-drinks",
  "pharmacy",
  SHOPPING_CATEGORY_AISLES,
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

/** Strip amounts, units, and prep words so "2 cups diced onions" → "onions". */
export function prepareItemForCategory(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/\([^)]*\)/g, " ");
  t = t.replace(/\[[^\]]*\]/g, " ");
  t = t.replace(
    /\b\d+[\d./\s]*(?:cups?|c|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|pinch|dash|cloves?|bunch|head|sprigs?|cans?|packages?|pkg|sticks?|slices?|pieces?|pcs?)?\b/gi,
    " "
  );
  t = t.replace(
    /\b(chopped|diced|minced|sliced|grated|shredded|crushed|peeled|seeded|trimmed|halved|quartered|fresh|organic|ripe|large|small|medium|thinly|roughly|optional|to taste|about|approx(?:imately)?)\b/gi,
    " "
  );
  return normalizeText(t).replace(/\s+/g, " ").trim();
}

function wordForms(word: string): string[] {
  const w = word.trim();
  if (!w) return [];
  const forms = new Set<string>([w]);

  if (w.endsWith("ies") && w.length > 4) {
    forms.add(w.slice(0, -3) + "y");
  }
  if (w.endsWith("es") && w.length > 3) {
    forms.add(w.slice(0, -2));
    forms.add(w.slice(0, -1));
  }
  if (w.endsWith("s") && w.length > 2) {
    forms.add(w.slice(0, -1));
  }
  if (!w.endsWith("s")) {
    forms.add(`${w}s`);
    forms.add(`${w}es`);
    if (w.endsWith("y")) forms.add(`${w.slice(0, -1)}ies`);
    if (w.endsWith("o")) forms.add(`${w}es`);
  }

  return [...forms];
}

function textMatchesKeyword(text: string, keyword: string): boolean {
  const normalized = normalizeText(text);
  const kw = normalizeText(keyword).trim();
  if (!kw) return false;

  if (kw.includes(" ")) {
    return normalized.includes(kw);
  }

  for (const form of wordForms(kw)) {
    const re = new RegExp(`\\b${escapeRegex(form)}\\b`);
    if (re.test(normalized)) return true;
  }
  return false;
}

function scoreKeyword(text: string, keyword: string): number {
  if (!textMatchesKeyword(text, keyword)) return 0;
  const base = keyword.length;
  return keyword.includes(" ") ? base + 12 : base;
}

function scoreCategory(text: string, rule: CategoryRule): number {
  let best = 0;
  for (const keyword of rule.keywords) {
    best = Math.max(best, scoreKeyword(text, keyword));
  }
  return best;
}

export function guessShoppingCategoryId(
  itemText: string,
  categories: ShoppingStoreCategory[]
): string {
  const validIds = new Set(categories.map((c) => c.id));
  const fallback =
    categories.find((c) => c.id === SHOPPING_CATEGORY_AISLES)?.id ??
    categories[categories.length - 1]?.id ??
    SHOPPING_CATEGORY_AISLES;

  const prepared = prepareItemForCategory(itemText);
  if (!prepared) {
    return validIds.has(fallback) ? fallback : categories[0]?.id ?? fallback;
  }

  const scores: { id: string; score: number }[] = [];

  for (const rule of CATEGORY_RULES) {
    if (!validIds.has(rule.id)) continue;
    const score = scoreCategory(prepared, rule);
    if (score > 0) scores.push({ id: rule.id, score });
  }

  if (scores.length === 0) {
    return validIds.has(fallback) ? fallback : categories[0]?.id ?? fallback;
  }

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aIdx = TIE_BREAK_ORDER.indexOf(a.id);
    const bIdx = TIE_BREAK_ORDER.indexOf(b.id);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return scores[0].id;
}

export function normalizeShoppingStoreCategories(
  raw: ShoppingStoreCategory[] | undefined
): ShoppingStoreCategory[] {
  if (!raw?.length) {
    return DEFAULT_SHOPPING_STORE_CATEGORIES.map((c) => ({ ...c }));
  }

  const seen = new Set<string>();
  const categories: ShoppingStoreCategory[] = [];

  for (const item of raw) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    categories.push({
      id: item.id,
      label:
        typeof item.label === "string" && item.label.trim()
          ? item.label.trim()
          : "Section",
      sortOrder:
        typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
          ? item.sortOrder
          : categories.length,
    });
  }

  const existingIds = new Set(categories.map((c) => c.id));
  for (const def of DEFAULT_SHOPPING_STORE_CATEGORIES) {
    if (!existingIds.has(def.id)) {
      categories.push({
        id: def.id,
        label: def.label,
        sortOrder: categories.length,
      });
      existingIds.add(def.id);
    }
  }

  categories.sort((a, b) => a.sortOrder - b.sortOrder);
  categories.forEach((c, index) => {
    c.sortOrder = index;
  });

  return categories.length > 0
    ? categories
    : DEFAULT_SHOPPING_STORE_CATEGORIES.map((c) => ({ ...c }));
}

export function sortCategoriesByStoreOrder(
  categories: ShoppingStoreCategory[]
): ShoppingStoreCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveShoppingCategoryId(
  categoryId: string | undefined,
  categories: ShoppingStoreCategory[],
  itemText = ""
): string {
  if (categoryId && categories.some((c) => c.id === categoryId)) {
    return categoryId;
  }
  return guessShoppingCategoryId(itemText, categories);
}

export type ShoppingListSection = {
  category: ShoppingStoreCategory;
  items: ShoppingItem[];
};

export function groupShoppingListByCategory(
  items: ShoppingItem[],
  categories: ShoppingStoreCategory[]
): ShoppingListSection[] {
  const sortedCategories = sortCategoriesByStoreOrder(categories);
  const byCategory = new Map<string, ShoppingItem[]>();

  for (const cat of sortedCategories) {
    byCategory.set(cat.id, []);
  }

  for (const item of items) {
    const catId = resolveShoppingCategoryId(
      item.categoryId,
      categories,
      item.text
    );
    const bucket = byCategory.get(catId) ?? [];
    bucket.push(item);
    byCategory.set(catId, bucket);
  }

  return sortedCategories
    .map((category) => ({
      category,
      items: byCategory.get(category.id) ?? [],
    }))
    .filter((section) => section.items.length > 0);
}

export function formatShoppingListForCalendar(
  items: ShoppingItem[],
  categories: ShoppingStoreCategory[]
): string {
  const sections = groupShoppingListByCategory(
    items.filter((i) => !i.checked),
    categories
  );
  if (sections.length === 0) return "";

  return sections
    .map(
      (section) =>
        `${section.category.label}:\n${section.items
          .map((i) => `- ${formatShoppingItemDisplay(i)}`)
          .join("\n")}`
    )
    .join("\n\n");
}
