create table if not exists public.tracker_data (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);
alter table public.tracker_data enable row level security;
drop policy if exists "own rows" on public.tracker_data;
create policy "own rows" on public.tracker_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
