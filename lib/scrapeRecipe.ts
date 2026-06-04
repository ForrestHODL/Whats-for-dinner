import { scrapeRecipe as scrapeWithLibrary } from "recipe-scrapers";
import { decodeHtmlEntities } from "./decodeHtmlEntities";

export interface ScrapedRecipe {
  title: string;
  description: string;
  imageUrl?: string;
  body: string;
  sourceUrl: string;
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const FETCH_TIMEOUT_MS = 45_000;

function isValidHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return firstString(obj.url ?? obj["@id"] ?? obj.name);
  }
  return undefined;
}

function normalizeInstructions(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    const lines: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) lines.push(t);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const text = firstString(obj.text ?? obj.name ?? obj.itemListElement);
        if (text) lines.push(text);
        else if (Array.isArray(obj.itemListElement)) {
          lines.push(...normalizeInstructions(obj.itemListElement));
        }
      }
    }
    return lines;
  }
  return [];
}

function normalizeIngredients(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return firstString((item as Record<string, unknown>).name) ?? "";
        }
        return "";
      })
      .filter(Boolean);
  }
  return [];
}

function findRecipeNodes(data: unknown): Record<string, unknown>[] {
  const recipes: Record<string, unknown>[] = [];
  if (!data) return recipes;

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : type ? [type] : [];
    if (types.some((t) => String(t).toLowerCase() === "recipe")) {
      recipes.push(obj);
    }
    if (obj["@graph"]) visit(obj["@graph"]);
  };

  visit(data);
  return recipes;
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const recipes: Record<string, unknown>[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim()) as unknown;
      recipes.push(...findRecipeNodes(json));
    } catch {
      /* skip invalid blocks */
    }
  }
  return recipes;
}

function metaContent(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  if (m?.[1]) return m[1].trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i"
  );
  return re2.exec(html)?.[1]?.trim();
}

function titleFromHtml(html: string): string | undefined {
  const og = metaContent(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim();
}

function buildBody(ingredients: string[], instructions: string[]): string {
  const parts: string[] = [];
  if (ingredients.length) {
    parts.push(
      "Ingredients:",
      ...ingredients.map((i) => `- ${decodeHtmlEntities(i)}`),
      ""
    );
  }
  if (instructions.length) {
    parts.push("Instructions:");
    instructions.forEach((s, i) => {
      if (i > 0) parts.push("");
      parts.push(`${i + 1}. ${decodeHtmlEntities(s)}`);
    });
  }
  return parts.join("\n").trim();
}

function toScrapedRecipe(
  sourceUrl: string,
  title: string,
  description: string,
  imageUrl: string | undefined,
  ingredients: string[],
  instructions: string[]
): ScrapedRecipe | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;
  return {
    title: decodeHtmlEntities(trimmedTitle),
    description: decodeHtmlEntities(description.trim().slice(0, 500)),
    imageUrl,
    body: buildBody(ingredients, instructions),
    sourceUrl,
  };
}

function parseRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipe | null {
  const ldRecipes = parseJsonLd(html);
  const recipe = ldRecipes[0];

  const title =
    (recipe && firstString(recipe.name)) ?? titleFromHtml(html) ?? "";
  if (!title) return null;

  const description =
    (recipe && firstString(recipe.description)) ??
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    "";

  const imageUrl =
    (recipe && firstString(recipe.image)) ??
    metaContent(html, "og:image") ??
    undefined;

  const ingredients = recipe
    ? normalizeIngredients(recipe.recipeIngredient ?? recipe.ingredients)
    : [];
  const instructions = recipe
    ? normalizeInstructions(
        recipe.recipeInstructions ?? recipe.instructions
      )
    : [];

  return toScrapedRecipe(
    sourceUrl,
    title,
    description,
    imageUrl,
    ingredients,
    instructions
  );
}

async function parseRecipeWithLibrary(
  html: string,
  sourceUrl: string
): Promise<ScrapedRecipe | null> {
  try {
    const result = await scrapeWithLibrary(html, sourceUrl, {
      safeParse: true,
    });
    if (!result.success || !("data" in result) || !result.data) {
      return null;
    }
    const data = result.data;
    const title = data.title ?? "";
    if (!title.trim()) return null;

    const ingredients = Array.isArray(data.ingredients)
      ? data.ingredients.map(String)
      : [];
    const instructions = Array.isArray(data.instructions)
      ? data.instructions.map(String)
      : [];

    return toScrapedRecipe(
      sourceUrl,
      title,
      data.description ?? "",
      typeof data.image === "string" ? data.image : undefined,
      ingredients,
      instructions
    );
  } catch {
    return null;
  }
}

function stripJinaHeader(markdown: string): string {
  const marker = "Markdown Content:";
  const idx = markdown.indexOf(marker);
  return idx >= 0 ? markdown.slice(idx + marker.length).trim() : markdown;
}

function parseTitleFromJina(full: string, body: string): string {
  const fromMeta = full.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
  if (fromMeta) {
    return fromMeta.replace(/\s+Recipe(\s+\(with Video\))?/i, "").trim();
  }
  const fromH1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (fromH1) {
    return fromH1.replace(/\s+Recipe(\s+\(with Video\))?/i, "").trim();
  }
  return "";
}

function extractMarkdownSection(body: string, heading: string): string {
  const re = new RegExp(
    `## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## [A-Za-z]|\\n### Local Offers|$)`,
    "i"
  );
  return re.exec(body)?.[1]?.trim() ?? "";
}

function parseBulletIngredients(section: string): string[] {
  const items: string[] = [];
  for (const line of section.split(/\n/)) {
    const match = line.match(/^\*\s+(.+)$/);
    if (!match) continue;
    const item = match[1].trim();
    if (item && !/^Oops!/i.test(item)) items.push(item);
  }
  return items;
}

function parseNumberedInstructions(section: string): string[] {
  const steps: string[] = [];
  for (const part of section.split(/\n(?=\d+\.\s+)/)) {
    const match = part.match(/^\d+\.\s+([\s\S]*?)(?=\n!\[|$)/);
    if (!match) continue;
    const step = match[1].replace(/\s+/g, " ").trim();
    if (step) steps.push(step);
  }
  return steps;
}

function stripMarkdownLinks(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDescriptionFromMarkdown(body: string): string {
  const jumpMatch = body.match(
    /Jump to recipe\s*\n+([\s\S]*?)(?=\n### |\n## |\n!\[|$)/i
  );
  if (jumpMatch) {
    const text = stripMarkdownLinks(
      jumpMatch[1].split(/\n\n+/).find((p) => p.trim().length > 40) ??
        jumpMatch[1]
    );
    if (text.length > 40) return text.slice(0, 500);
  }

  const beforeIngredients = body.split(/## Ingredients/i)[0] ?? body;
  const paragraphs = beforeIngredients
    .split(/\n\n+/)
    .map((p) => stripMarkdownLinks(p))
    .filter(
      (p) =>
        p.length > 50 &&
        !p.startsWith("#") &&
        !p.startsWith("*") &&
        !/^[\d.]/.test(p) &&
        !/^Skip to content/i.test(p) &&
        !/^Allrecipes/i.test(p) &&
        !/^Save$/i.test(p) &&
        !/^\w+ Time:/i.test(p) &&
        !/^Servings:/i.test(p) &&
        !/^Dinners/i.test(p)
    );
  return paragraphs[0]?.slice(0, 500) ?? "";
}

const MARKDOWN_IMAGE_EXTENSIONS = [
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".avif",
] as const;

function extractMarkdownLinkUrl(body: string, urlStart: number): string | null {
  if (!body.startsWith("http", urlStart)) return null;

  let depth = 0;
  for (let j = urlStart; j < body.length; j++) {
    const char = body[j];
    if (char === "(") depth++;
    else if (char === ")") {
      if (depth === 0) return body.slice(urlStart, j);
      depth--;
    }
  }
  return null;
}

/** Markdown links break on `[^)]+` when URLs contain parentheses (AllRecipes thmb paths). */
function extractMarkdownImageUrls(body: string): string[] {
  const urls: string[] = [];
  let searchFrom = 0;

  while (searchFrom < body.length) {
    const imgStart = body.indexOf("![", searchFrom);
    if (imgStart === -1) break;

    const linkStart = body.indexOf("](", imgStart);
    if (linkStart === -1) break;

    const urlStart = linkStart + 2;
    const url = extractMarkdownLinkUrl(body, urlStart);
    if (
      url &&
      !url.includes("\n") &&
      !url.includes("](") &&
      MARKDOWN_IMAGE_EXTENSIONS.some((ext) =>
        url.toLowerCase().includes(ext)
      )
    ) {
      urls.push(url);
    }

    searchFrom = urlStart + 1;
  }

  return urls;
}

function decodeImageSvcUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("meredithcorp.io")) return undefined;
    const inner = parsed.searchParams.get("url");
    if (!inner) return undefined;
    return decodeURIComponent(inner);
  } catch {
    return undefined;
  }
}

function isStepImage(url: string): boolean {
  return /step[-_]\d|vat-\d+-step/i.test(url);
}

function isHeroImage(url: string): boolean {
  return /primary/i.test(url) && !isStepImage(url);
}

function pickBestRecipeImageUrl(urls: string[]): string | undefined {
  if (!urls.length) return undefined;

  const normalized = urls.map((url) => decodeImageSvcUrl(url) ?? url);

  const hero = normalized.find(isHeroImage);
  if (hero) return hero;

  const largeThmb = normalized.find(
    (url) =>
      url.includes("allrecipes.com/thmb") &&
      url.includes("/1500x0/") &&
      !url.includes("/160x90/") &&
      !isStepImage(url)
  );
  if (largeThmb) return largeThmb;

  const thmb = normalized.find(
    (url) => url.includes("allrecipes.com/thmb") && !isStepImage(url)
  );
  if (thmb) return thmb;

  const publicAsset = normalized.find((url) =>
    url.includes("public-assets.meredithcorp.io")
  );
  if (publicAsset) return publicAsset;

  return normalized.find((url) => !isStepImage(url)) ?? normalized[0];
}

function parseImageFromMarkdown(body: string): string | undefined {
  return pickBestRecipeImageUrl(extractMarkdownImageUrls(body));
}

function parseRecipeFromJinaMarkdown(
  markdown: string,
  sourceUrl: string
): ScrapedRecipe | null {
  const body = stripJinaHeader(markdown);
  const title = parseTitleFromJina(markdown, body);
  const ingredients = parseBulletIngredients(
    extractMarkdownSection(body, "Ingredients")
  );
  const instructions = parseNumberedInstructions(
    extractMarkdownSection(body, "Directions")
  );

  if (!title && !ingredients.length && !instructions.length) {
    return null;
  }

  return toScrapedRecipe(
    sourceUrl,
    title || "Imported recipe",
    parseDescriptionFromMarkdown(body),
    parseImageFromMarkdown(body),
    ingredients,
    instructions
  );
}

function isBlockedStatus(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429;
}

async function fetchDirectHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    if (isBlockedStatus(res.status)) return null;
    throw new Error(`Could not fetch page (${res.status})`);
  }
  const html = await res.text();
  if (html.length < 500 || /people\.inc|access issue/i.test(html.slice(0, 2000))) {
    return null;
  }
  return html;
}

async function fetchViaJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const headers: Record<string, string> = {
    Accept: "text/plain",
  };
  const apiKey = process.env.JINA_API_KEY ?? process.env.VITE_JINA_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(jinaUrl, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Could not read recipe page (${res.status})`);
  }
  const markdown = await res.text();
  if (markdown.length < 500) {
    throw new Error("Recipe page returned too little content");
  }
  return markdown;
}

interface ManageMealsScraperJson {
  title?: string;
  description?: string;
  image?: string;
  ingredients?: string[];
  ingredient_groups?: { ingredients?: string[] }[];
  instructions?: string;
  instructions_list?: string[];
}

function parseManageMealsScraperJson(
  data: ManageMealsScraperJson,
  sourceUrl: string
): ScrapedRecipe {
  const title = decodeHtmlEntities(data.title?.trim() ?? "Imported recipe");
  const description = decodeHtmlEntities((data.description ?? "").slice(0, 500));
  const imageUrl = data.image?.trim() || undefined;

  let ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  if (!ingredients.length && Array.isArray(data.ingredient_groups)) {
    ingredients = data.ingredient_groups.flatMap((g) => g.ingredients ?? []);
  }

  let instructions: string[] = [];
  if (Array.isArray(data.instructions_list) && data.instructions_list.length) {
    instructions = data.instructions_list;
  } else if (typeof data.instructions === "string" && data.instructions.trim()) {
    instructions = data.instructions
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  return {
    title,
    description,
    imageUrl,
    body: buildBody(ingredients, instructions),
    sourceUrl,
  };
}

async function scrapeViaExternalScraper(
  scraperBaseUrl: string,
  url: string
): Promise<ScrapedRecipe> {
  const base = scraperBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/?url=${encodeURIComponent(url)}`, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Scraper returned ${res.status}`);
  }
  const data = (await res.json()) as ManageMealsScraperJson;
  if (!data.title?.trim()) {
    throw new Error("No recipe title found at that URL");
  }
  return parseManageMealsScraperJson(data, url);
}

async function scrapeFromHtml(html: string, url: string): Promise<ScrapedRecipe> {
  const fromJsonLd = parseRecipeFromHtml(html, url);
  if (fromJsonLd?.body) return fromJsonLd;
  if (fromJsonLd && (fromJsonLd.title || fromJsonLd.description)) {
    const fromLibrary = await parseRecipeWithLibrary(html, url);
    if (fromLibrary?.body) return fromLibrary;
    if (fromLibrary) return fromLibrary;
    return fromJsonLd;
  }

  const fromLibrary = await parseRecipeWithLibrary(html, url);
  if (fromLibrary) return fromLibrary;

  if (fromJsonLd) return fromJsonLd;

  throw new Error(
    "No recipe found on that page. Try a direct link to the recipe."
  );
}

export async function scrapeRecipeFromUrl(rawUrl: string): Promise<ScrapedRecipe> {
  const parsed = isValidHttpUrl(rawUrl.trim());
  if (!parsed) {
    throw new Error("Enter a valid http or https URL");
  }
  const url = parsed.toString();

  const scraperUrl =
    process.env.RECIPE_SCRAPER_URL ?? process.env.VITE_RECIPE_SCRAPER_URL;
  if (scraperUrl) {
    try {
      return await scrapeViaExternalScraper(scraperUrl, url);
    } catch {
      /* fall through to built-in strategies */
    }
  }

  const html = await fetchDirectHtml(url);
  if (html) {
    try {
      return await scrapeFromHtml(html, url);
    } catch {
      /* try reader fallback */
    }
  }

  const markdown = await fetchViaJina(url);
  const fromMarkdown = parseRecipeFromJinaMarkdown(markdown, url);
  if (fromMarkdown) {
    return fromMarkdown;
  }

  throw new Error(
    "Could not extract a recipe from that page. Check the URL points to a single recipe."
  );
}
