# Putting this on GitHub safely

## What must NEVER go on GitHub

| File / secret | Why |
|---------------|-----|
| `.env` | Contains your Supabase anon key |
| `service_role` key | Full database access — only use in Supabase dashboard |
| Meal app **passwords** | Not in this repo; they live in Supabase Auth only |

This project already lists `.env` in `.gitignore` so Git should skip it.

## What is OK on GitHub

- All source code in `src/`
- `.env.example` (placeholders only, no real keys)
- `package.json`, `vercel.json`, etc.

The **anon** key is designed for browser apps, but still keep it out of the repo. Set it only in Vercel (or local `.env`).

## Before your first push — checklist

Run in PowerShell from the project folder:

```powershell
cd "z:\meal prep app"
git init
git status
```

You should **not** see `.env` in the list. If you do, stop and fix `.gitignore` before committing.

Confirm ignore works:

```powershell
git check-ignore -v .env
```

Should print a line showing `.gitignore` is ignoring `.env`.

## Public (open source) vs private

**Public is safe** for this project if `.env` is never committed. Secrets live in Vercel and Supabase; user data is protected by login + Row Level Security.

Use **private** only if you prefer not to share the code publicly.

## Create the GitHub repository

1. [github.com](https://github.com) → **New repository**
2. Name it e.g. `meal-prep-planner`
3. Choose **Public** (open source) or **Private**
4. Do **not** check “Add a README” (this repo already has one)

Then:

```powershell
cd "z:\meal prep app"
git add .
git status
```

Review the list again — no `.env`, no `node_modules`, no `dist`.

```powershell
git commit -m "Initial commit: meal prep planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meal-prep-planner.git
git push -u origin main
```

Replace `YOUR_USERNAME` and repo name with yours. GitHub may ask you to sign in.

## After GitHub: secrets go in Vercel only

In Vercel → Project → **Settings → Environment Variables**, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never paste those into a GitHub issue, README, or commit message.

## If you already leaked a key

1. Supabase → **Project Settings → API** → regenerate **anon** key
2. Update `.env` and Vercel env vars with the new key
3. Old key stops working

## What strangers cannot get from your public code

- Your **meal app login password** (stored in Supabase, not in this repo)
- Your **database rows** (protected by Row Level Security — users only see their own plan)

Even with the anon key, attackers should not read other users’ data if RLS is enabled (you ran `schema.sql`).
