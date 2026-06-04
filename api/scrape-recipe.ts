import { scrapeRecipeFromUrl } from "../lib/scrapeRecipe";

type ApiRequest = {
  method?: string;
  query?: { url?: string | string[] };
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

function readUrl(req: ApiRequest): string | null {
  const q = req.query?.url;
  if (typeof q === "string" && q.trim()) return q.trim();
  if (Array.isArray(q) && typeof q[0] === "string" && q[0].trim()) {
    return q[0].trim();
  }
  if (req.body && typeof req.body === "object") {
    const url = (req.body as { url?: unknown }).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = readUrl(req);
  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const recipe = await scrapeRecipeFromUrl(url);
    return res.status(200).json(recipe);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not import recipe";
    return res.status(422).json({ error: message });
  }
}
