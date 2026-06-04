const STEP_LINE = /^\d+\.\s/;

/** Inserts a blank line between consecutive numbered steps (idempotent). */
export function formatRecipeStepSpacing(body: string): string {
  const lines = body.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isStep = STEP_LINE.test(trimmed);
    const prev = result[result.length - 1];
    const prevTrimmed = prev?.trim() ?? "";
    const prevIsStep = STEP_LINE.test(prevTrimmed);
    const prevIsBlank = prev !== undefined && prevTrimmed === "";

    if (isStep && prevIsStep && !prevIsBlank) {
      result.push("");
    }
    result.push(line);
  }

  return result.join("\n");
}
