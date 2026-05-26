-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- after creating a new project.

create table if not exists public.meal_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{"meals":[],"assignments":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

create policy "Users read own meal plan"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users insert own meal plan"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users update own meal plan"
  on public.meal_plans for update
  using (auth.uid() = user_id);

-- Optional: enable Realtime for instant sync between phones
-- Dashboard → Database → Replication → enable meal_plans
-- Or run:
-- alter publication supabase_realtime add table public.meal_plans;
