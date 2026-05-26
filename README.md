# Meal Prep Planner

A mobile-friendly PWA for planning weekly meals. Tap a meal, pick a day, and sync the plan between phones with a shared account.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

- **Week** — Monday–Sunday calendar with assigned meals
- **Meals** — Meal library; tap a meal → choose a day
- **Account** — Shared sign-in; data syncs via [Supabase](https://supabase.com)
- **PWA** — Add to home screen on iPhone or Android

## Quick start (local)

```bash
git clone https://github.com/YOUR_USERNAME/meal-prep-planner.git
cd meal-prep-planner
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm run dev
```

Open `http://localhost:5173`.

## Deploy (recommended: Vercel)

1. Fork or clone this repo to your GitHub account (**public** is fine).
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Open the URL on both phones → **Account** → shared login → **Add to Home Screen**.

In Supabase → **Authentication → URL configuration**, set **Site URL** and **Redirect URLs** to your Vercel URL.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Optional: enable **Realtime** on `meal_plans` for faster cross-device sync.
4. Optional: **Authentication → Email** → disable “Confirm email” for simpler household sign-up.

See [GITHUB-SAFE.md](GITHUB-SAFE.md) for what must stay out of the repo.

## Tech stack

- React + TypeScript + Vite
- Supabase (Auth + Postgres + optional Realtime)
- PWA via `vite-plugin-pwa`

## License

MIT — see [LICENSE](LICENSE). You’re free to use, modify, and share the code. Keep your own Supabase keys and user data private.
