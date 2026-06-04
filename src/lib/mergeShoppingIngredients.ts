import { prepareItemForCategory } from "./shoppingStoreCategories";
import type { ShoppingItem, ShoppingItemDetail } from "../types";

/** Normalized name used to detect duplicates (e.g. "1 tsp butter" → "butter"). */
export function getIngredientMatchKey(text: string): string {
  return prepareItemForCategory(text);
}

export function ingredientsMatch(a: string, b: string): boolean {
  const ka = getIngredientMatchKey(a);
  const kb = getIngredientMatchKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;

  const shorter = ka.length <= kb.length ? ka : kb;
  const longer = ka.length > kb.length ? ka : kb;
  if (shorter.length < 3) return false;

  return (
    longer === shorter ||
    longer.endsWith(` ${shorter}`) ||
    longer.startsWith(`${shorter} `)
  );
}

function titleCaseIngredient(key: string): string {
  if (!key) return "";
  return key.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function pickCanonicalIngredientName(lines: string[]): string {
  const keys = lines.map(getIngredientMatchKey).filter(Boolean);
  if (keys.length === 0) return lines[0]?.trim() ?? "";

  const shortest = keys.reduce((a, b) => (a.length <= b.length ? a : b));
  const fromLine = lines.find((line) => getIngredientMatchKey(line) === shortest);
  if (fromLine && getIngredientMatchKey(fromLine) === fromLine.trim().toLowerCase()) {
    return fromLine.trim();
  }
  return titleCaseIngredient(shortest);
}

export function getShoppingItemDetails(item: ShoppingItem): ShoppingItemDetail[] {
  if (item.details?.length) return item.details;
  if (!item.text.trim()) return [];
  return [
    {
      line: item.text.trim(),
      sourceTitle: item.sourceTitle?.trim() || undefined,
    },
  ];
}

export function getShoppingItemSourceTitles(item: ShoppingItem): string[] {
  const fromDetails = getShoppingItemDetails(item)
    .map((d) => d.sourceTitle?.trim())
    .filter((t): t is string => Boolean(t));
  const legacy = item.sourceTitle?.trim();
  return [...new Set(legacy ? [...fromDetails, legacy] : fromDetails)];
}

function detailLinesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function mergeShoppingItem(
  existing: ShoppingItem,
  newLine: string,
  sourceTitle?: string
): ShoppingItem {
  const trimmedLine = newLine.trim();
  const trimmedSource = sourceTitle?.trim() || undefined;
  const details = [...getShoppingItemDetails(existing)];

  if (
    !details.some(
      (d) =>
        detailLinesMatch(d.line, trimmedLine) &&
        (d.sourceTitle ?? "") === (trimmedSource ?? "")
    )
  ) {
    details.push({ line: trimmedLine, sourceTitle: trimmedSource });
  }

  const lines = details.map((d) => d.line);
  return {
    ...existing,
    text: pickCanonicalIngredientName(lines),
    details,
    sourceTitle: undefined,
  };
}

export function findMatchingShoppingIndex(
  list: ShoppingItem[],
  newLine: string
): number {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (ingredientsMatch(item.text, newLine)) return i;

    for (const detail of getShoppingItemDetails(item)) {
      if (ingredientsMatch(detail.line, newLine)) return i;
    }
  }
  return -1;
}

export function appendShoppingItems(
  list: ShoppingItem[],
  newLines: string[],
  sourceTitle: string | undefined,
  guessCategory: (text: string) => string,
  now: string
): ShoppingItem[] {
  const result = [...list];
  const trimmedSource = sourceTitle?.trim() || undefined;

  for (const line of newLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matchIndex = findMatchingShoppingIndex(result, trimmed);
    if (matchIndex >= 0) {
      result[matchIndex] = mergeShoppingItem(
        result[matchIndex],
        trimmed,
        trimmedSource
      );
    } else {
      result.push({
        id: crypto.randomUUID(),
        text: trimmed,
        checked: false,
        categoryId: guessCategory(trimmed),
        details: [{ line: trimmed, sourceTitle: trimmedSource }],
        addedAt: now,
      });
    }
  }

  return result;
}

export function formatShoppingItemDisplay(item: ShoppingItem): string {
  const details = getShoppingItemDetails(item);
  if (details.length <= 1) return item.text;
  const amounts = details.map((d) => d.line).join("; ");
  return `${item.text} (${amounts})`;
}
