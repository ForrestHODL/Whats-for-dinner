export type ScrapedRecipePayload = {
  title: string;
  description: string;
  imageUrl?: string;
  body: string;
  sourceUrl: string;
};

export async function fetchScrapedRecipe(url: string): Promise<ScrapedRecipePayload> {
  const res = await fetch(
    `/api/scrape-recipe?url=${encodeURIComponent(url.trim())}`
  );
  const data = (await res.json()) as ScrapedRecipePayload & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not import recipe");
  }
  return data;
}
