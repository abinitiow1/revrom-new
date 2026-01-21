-- Revrom app persistence (single-row JSON state)
-- Run this in Supabase SQL editor.

create table if not exists public.admin_users (
  email text primary key
);

-- Helper to get the current user's email from JWT claims (lowercased).
-- Different auth configurations can populate email in different claim locations.
create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.email(),
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email'
    )
  );
$$;

create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Customer inquiries (leads). Public can insert; only admins can read.
create table if not exists public.itinerary_queries (
  id text primary key,
  trip_id text not null,
  trip_title text not null,
  name text not null,
  whatsapp_number text not null,
  planning_time text not null,
  date timestamptz not null default now()
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
alter table public.itinerary_queries enable row level security;

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
    where lower(au.email) = public.current_email()
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
    where lower(au.email) = public.current_email()
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = public.current_email()
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
    where lower(au.email) = public.current_email()
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = public.current_email()
  )
);

-- Public can submit leads (inquiries). Only admins can read them.
drop policy if exists "public insert itinerary_queries" on public.itinerary_queries;
create policy "public insert itinerary_queries"
on public.itinerary_queries
for insert
to anon, authenticated
with check (true);

drop policy if exists "admin read itinerary_queries" on public.itinerary_queries;
create policy "admin read itinerary_queries"
on public.itinerary_queries
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where lower(au.email) = public.current_email()
  )
);

-- Grants: required in addition to RLS policies for the API roles to work.
grant usage on schema public to anon, authenticated;
grant select on table public.app_state to anon, authenticated;
grant insert, update on table public.app_state to authenticated;
grant select, insert, update, delete on table public.admin_users to authenticated;
grant insert on table public.itinerary_queries to anon, authenticated;
grant select on table public.itinerary_queries to authenticated;
