-- Revrom app persistence (single-row JSON state)
-- Run this in Supabase SQL editor.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  -- Prefer user_id (auth.uid()) over email for admin checks.
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique
);

-- Helper to get the current user's email from JWT claims (lowercased).
-- Use PostgREST request settings to avoid privilege issues calling auth.* functions.
create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'email'),
      (nullif(current_setting('request.jwt.claims', true), '')::json -> 'user_metadata' ->> 'email')
    )
  );
$$;

create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Customer inquiries (leads).
-- SECURITY MODEL (recommended): inserts happen via server/API using the Supabase Service Role key.
-- Public (anon) cannot insert directly; only admins can read/update via RLS.
create table if not exists public.itinerary_queries (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  trip_title text not null,
  name text not null,
  whatsapp_number text,
  email text,
  planning_time text not null,
  status text not null default 'new',
  date timestamptz not null default now()
);

-- Contact form messages.
-- SECURITY MODEL (recommended): inserts happen via server/API using the Supabase Service Role key.
-- Public (anon) cannot insert directly; only admins can read via RLS.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whatsapp_number text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Newsletter subscribers.
-- SECURITY MODEL (recommended): inserts happen via server/API using the Supabase Service Role key.
-- Public (anon) cannot insert directly; only admins can read via RLS.
create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

-- --- Security: server-side rate limiting + Turnstile replay protection ---
-- These tables are written/read only by the server (Service Role). Public access is denied via RLS.

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  bucket text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_ip_created_at_idx
on public.rate_limit_events (bucket, ip, created_at desc);

create table if not exists public.turnstile_token_replay (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists turnstile_token_replay_expires_at_idx
on public.turnstile_token_replay (expires_at);

-- Prevent duplicate subscriptions that differ only by email casing (e.g. User@X.com vs user@x.com).
-- Note: if you already have such duplicates, creating this index will fail until you delete/merge them.
create unique index if not exists newsletter_subscribers_email_lower_uniq
on public.newsletter_subscribers ((lower(email)));

-- --- Migrations / hardening (safe to re-run) ---
do $$
begin
  -- admin_users legacy migration: email PK -> user_id PK
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_users' and column_name = 'email'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_users' and column_name = 'user_id'
  ) then
    alter table public.admin_users add column user_id uuid;
    -- Best-effort backfill (only works if auth user already exists).
    update public.admin_users au
    set user_id = u.id
    from auth.users u
    where lower(u.email) = lower(au.email) and au.user_id is null;
  end if;

  -- Ensure email column exists (optional, helpful for display / bootstrap).
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_users' and column_name = 'email'
  ) then
    alter table public.admin_users add column email text;
  end if;

  -- Ensure user_id is PK when present.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_users' and column_name = 'user_id'
  ) then
    begin
      alter table public.admin_users drop constraint if exists admin_users_pkey;
      alter table public.admin_users add constraint admin_users_pkey primary key (user_id);
    exception when others then
      -- ignore (e.g., if still nulls)
      null;
    end;
  end if;

  -- itinerary_queries legacy migration: id text -> uuid
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'itinerary_queries' and column_name = 'id'
      and data_type = 'text'
  ) then
    -- Add a new UUID id, backfill, swap, drop old column.
    alter table public.itinerary_queries add column if not exists id_uuid uuid default gen_random_uuid();
    update public.itinerary_queries set id_uuid = gen_random_uuid() where id_uuid is null;
    begin
      alter table public.itinerary_queries drop constraint if exists itinerary_queries_pkey;
    exception when others then null; end;
    alter table public.itinerary_queries add constraint itinerary_queries_pkey primary key (id_uuid);
    alter table public.itinerary_queries drop column id;
    alter table public.itinerary_queries rename column id_uuid to id;
  end if;
end $$;

-- Admin check helper used by RLS policies and the frontend (RPC).
-- Defined after migrations so it works for legacy schemas too.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- Basic validation constraints (server-side; complements client-side validation).
-- Lead status (safe to re-run).
alter table public.itinerary_queries
  add column if not exists status text not null default 'new';

-- Optional contact details (safe to re-run).
alter table public.itinerary_queries
  add column if not exists email text;
alter table public.itinerary_queries
  alter column whatsapp_number drop not null;

alter table public.contact_messages
  add column if not exists whatsapp_number text;

alter table public.itinerary_queries
  drop constraint if exists itinerary_queries_name_len,
  drop constraint if exists itinerary_queries_whatsapp_len,
  drop constraint if exists itinerary_queries_planning_time_len,
  drop constraint if exists itinerary_queries_trip_title_len,
  drop constraint if exists itinerary_queries_status_chk,
  drop constraint if exists itinerary_queries_email_fmt;
alter table public.itinerary_queries
  add constraint itinerary_queries_name_len check (length(trim(name)) between 2 and 80) not valid,
  add constraint itinerary_queries_whatsapp_len check (length(regexp_replace(whatsapp_number, '[^0-9]', '', 'g')) between 8 and 15) not valid,
  add constraint itinerary_queries_email_fmt check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') not valid,
  add constraint itinerary_queries_planning_time_len check (length(trim(planning_time)) between 2 and 50) not valid,
  add constraint itinerary_queries_trip_title_len check (length(trim(trip_title)) between 2 and 140) not valid,
  add constraint itinerary_queries_status_chk check (status in ('new', 'contacted', 'closed')) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_name_len,
  drop constraint if exists contact_messages_email_fmt,
  drop constraint if exists contact_messages_message_len,
  drop constraint if exists contact_messages_whatsapp_len;
alter table public.contact_messages
  add constraint contact_messages_name_len check (length(trim(name)) between 2 and 80) not valid,
  add constraint contact_messages_email_fmt check (email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') not valid,
  add constraint contact_messages_whatsapp_len check (length(regexp_replace(whatsapp_number, '[^0-9]', '', 'g')) between 8 and 15) not valid,
  add constraint contact_messages_message_len check (length(trim(message)) between 10 and 2000) not valid;

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_email_fmt;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_email_fmt check (email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') not valid;

-- After cleaning any legacy/bad rows, validate constraints:
-- alter table public.itinerary_queries validate constraint itinerary_queries_name_len;
-- alter table public.itinerary_queries validate constraint itinerary_queries_whatsapp_len;
-- alter table public.itinerary_queries validate constraint itinerary_queries_planning_time_len;
-- alter table public.itinerary_queries validate constraint itinerary_queries_trip_title_len;
-- alter table public.contact_messages validate constraint contact_messages_name_len;
-- alter table public.contact_messages validate constraint contact_messages_email_fmt;
-- alter table public.contact_messages validate constraint contact_messages_message_len;
-- alter table public.newsletter_subscribers validate constraint newsletter_subscribers_email_fmt;

-- Legacy DB-level rate-limit triggers removed.
-- Rate limiting is handled in the server/API (per-IP buckets) so behavior is consistent and returns proper 429s.
drop trigger if exists trg_contact_messages_rate_limit on public.contact_messages;
drop trigger if exists trg_newsletter_rate_limit on public.newsletter_subscribers;
drop trigger if exists trg_itinerary_queries_rate_limit on public.itinerary_queries;
drop function if exists public.trg_contact_messages_rate_limit();
drop function if exists public.trg_newsletter_rate_limit();
drop function if exists public.trg_itinerary_queries_rate_limit();
drop function if exists public.enforce_rate_limit(text, text, int, interval);
drop table if exists public.rate_limits;

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
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.turnstile_token_replay enable row level security;

-- Public can read the website content.
drop policy if exists "public read app_state" on public.app_state;
create policy "public read app_state"
on public.app_state
for select
to anon, authenticated
using (true);

-- Only admins can write.
-- Admins are authenticated users whose auth.uid() exists in admin_users.
drop policy if exists "admin write app_state" on public.app_state;
create policy "admin write app_state"
on public.app_state
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists "admin update app_state" on public.app_state;
create policy "admin update app_state"
on public.app_state
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- Admin users table: no public read. Use RPC `public.is_admin()` for checks.
drop policy if exists "read own admin_users row" on public.admin_users;
drop policy if exists "admin read admin_users" on public.admin_users;
create policy "admin read admin_users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

-- Lead/message/newsletter inserts:
-- We intentionally block direct inserts from anon/authenticated and accept inserts via server/API (Service Role).
drop policy if exists "public insert itinerary_queries" on public.itinerary_queries;
drop policy if exists "no public insert itinerary_queries" on public.itinerary_queries;
create policy "no public insert itinerary_queries"
on public.itinerary_queries
for insert
to anon, authenticated
with check (false);

drop policy if exists "admin read itinerary_queries" on public.itinerary_queries;
create policy "admin read itinerary_queries"
on public.itinerary_queries
for select
to authenticated
using (
  public.is_admin()
);

drop policy if exists "admin update itinerary_queries" on public.itinerary_queries;
create policy "admin update itinerary_queries"
on public.itinerary_queries
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "public insert contact_messages" on public.contact_messages;
drop policy if exists "no public insert contact_messages" on public.contact_messages;
create policy "no public insert contact_messages"
on public.contact_messages
for insert
to anon, authenticated
with check (false);

drop policy if exists "admin read contact_messages" on public.contact_messages;
create policy "admin read contact_messages"
on public.contact_messages
for select
to authenticated
using (
  public.is_admin()
);

drop policy if exists "public insert newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "no public insert newsletter_subscribers" on public.newsletter_subscribers;
create policy "no public insert newsletter_subscribers"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (false);

drop policy if exists "no public access rate_limit_events" on public.rate_limit_events;
create policy "no public access rate_limit_events"
on public.rate_limit_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "no public access turnstile_token_replay" on public.turnstile_token_replay;
create policy "no public access turnstile_token_replay"
on public.turnstile_token_replay
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "admin read newsletter_subscribers" on public.newsletter_subscribers;
create policy "admin read newsletter_subscribers"
on public.newsletter_subscribers
for select
to authenticated
using (
  public.is_admin()
);

-- Grants: required in addition to RLS policies for the API roles to work.
grant usage on schema public to anon, authenticated;
grant select on table public.app_state to anon, authenticated;
grant insert, update on table public.app_state to authenticated;
revoke insert on table public.itinerary_queries from anon, authenticated;
grant select on table public.itinerary_queries to authenticated;
grant update on table public.itinerary_queries to authenticated;
revoke insert on table public.contact_messages from anon, authenticated;
grant select on table public.contact_messages to authenticated;
revoke insert on table public.newsletter_subscribers from anon, authenticated;
grant select on table public.newsletter_subscribers to authenticated;
revoke all on table public.rate_limit_events from anon, authenticated;
revoke all on table public.turnstile_token_replay from anon, authenticated;

-- Allow frontend to call the admin-check RPC without exposing admin_users table.
grant execute on function public.is_admin() to anon, authenticated;

-- Optional: Storage policies (only needed if uploads fail)
-- Allows authenticated users (admins) to upload/update in the `site-assets` bucket.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    execute 'drop policy if exists "admin upload site-assets" on storage.objects';
    execute 'create policy "admin upload site-assets"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = ''site-assets'' and public.is_admin())';

    execute 'drop policy if exists "admin update site-assets" on storage.objects';
    execute 'create policy "admin update site-assets"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = ''site-assets'' and public.is_admin())
      with check (bucket_id = ''site-assets'' and public.is_admin())';
  end if;
end $$;
