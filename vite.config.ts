import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { scrapeRecipeFromUrl } from "./lib/scrapeRecipe";

function scrapeRecipeApiPlugin(): Plugin {
  return {
    name: "scrape-recipe-api",
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/scrape-recipe") {
          next();
          return;
        }

        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const urlObj = new URL(req.url ?? "/", "http://localhost");
        const targetUrl = urlObj.searchParams.get("url");

        if (!targetUrl?.trim()) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing url parameter" }));
          return;
        }

        try {
          const recipe = await scrapeRecipeFromUrl(targetUrl.trim());
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(recipe));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Could not import recipe";
          res.statusCode = 422;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    scrapeRecipeApiPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Meal Prep Planner",
        short_name: "Meals",
        description: "Plan weekly meals together",
        theme_color: "#1a4d3e",
        background_color: "#f5f0e8",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
