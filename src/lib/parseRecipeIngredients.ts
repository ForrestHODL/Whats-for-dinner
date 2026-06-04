const INGREDIENTS_HEADING = /^ingredients:?/i;
const INSTRUCTIONS_HEADING = /^instructions:?/i;
const BULLET_LINE = /^[-*•]\s+(.+)$/;
const NUMBERED_LINE = /^\d+[.)]\s+(.+)$/;

function parseIngredientLines(lines: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bullet = trimmed.match(BULLET_LINE);
    if (bullet) {
      items.push(bullet[1].trim());
      continue;
    }

    const numbered = trimmed.match(NUMBERED_LINE);
    if (numbered) {
      items.push(numbered[1].trim());
    }
  }
  return items;
}

/** Pull ingredient lines from a recipe body (Ingredients: section or leading bullets). */
export function parseRecipeIngredients(body: string): string[] {
  if (!body.trim()) return [];

  const lines = body.split(/\r?\n/);
  let inIngredients = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (INGREDIENTS_HEADING.test(trimmed)) {
      inIngredients = true;
      continue;
    }
    if (inIngredients && INSTRUCTIONS_HEADING.test(trimmed)) break;
    if (inIngredients) sectionLines.push(line);
  }

  const fromSection = parseIngredientLines(sectionLines);
  if (fromSection.length > 0) return fromSection;

  const beforeInstructions: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (INSTRUCTIONS_HEADING.test(trimmed)) break;
    if (INGREDIENTS_HEADING.test(trimmed)) continue;
    beforeInstructions.push(line);
  }

  return parseIngredientLines(beforeInstructions);
}
