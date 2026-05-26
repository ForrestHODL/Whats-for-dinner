# What's for Dinner

A simple calendar and meal prep app to plan dinner (and the rest of the week). Meals have titles; tap a meal, pick a day, and sync the plan between phones with a shared account.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Features

- **Week** — Monday–Sunday calendar with assigned meals
- **Meals** — Meal library; tap a meal → choose a day
- **Account** — Shared sign-in; data syncs via [Supabase](https://supabase.com)
- **PWA** — Add to home screen on iPhone or Android

## Quick start (local)

```bash
git clone https://github.com/ForrestHODL/Whats-for-dinner.git
cd Whats-for-dinner
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm run dev
```

Open `http://localhost:5173`.

## Deploy (recommended: Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import [ForrestHODL/Whats-for-dinner](https://github.com/ForrestHODL/Whats-for-dinner).
2. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy. Open the URL on both phones → **Account** → shared login → **Add to Home Screen**.

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
