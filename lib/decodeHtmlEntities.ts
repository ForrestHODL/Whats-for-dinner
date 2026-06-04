/** Decode common HTML entities (e.g. &quot; → "). */
export function decodeHtmlEntities(text: string): string {
  if (!text.includes("&")) return text;

  let prev = "";
  let result = text;

  while (result !== prev) {
    prev = result;
    result = result
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => codePointFrom(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => codePointFrom(parseInt(dec, 10)))
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&nbsp;/gi, "\u00A0")
      .replace(/&amp;/gi, "&");
  }

  return result;
}

function codePointFrom(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
