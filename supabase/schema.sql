-- Revrom app persistence (single-row JSON state)
-- Run this in Supabase SQL editor.

create table if not exists public.admin_users (
  email text primary key
);

create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.app_state enable row level security;

-- Public can read the website content.
drop policy if exists "public read app_state" on public.app_state;
create policy "public read app_state"
on public.app_state
for select
to anon, authenticated
using (true);

-- Only admins can write.
-- Admins are authenticated users whose email exists in admin_users.
drop policy if exists "admin write app_state" on public.app_state;
create policy "admin write app_state"
on public.app_state
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = lower(auth.email())
  )
);

drop policy if exists "admin update app_state" on public.app_state;
create policy "admin update app_state"
on public.app_state
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = lower(auth.email())
  )
);

-- Lock down admin_users: only admins should manage this table.
drop policy if exists "admins manage admin_users" on public.admin_users;
create policy "admins manage admin_users"
on public.admin_users
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = lower(auth.email())
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = lower(auth.email())
  )
);
