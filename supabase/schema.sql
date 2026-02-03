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
  whatsapp_number text not null,
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

alter table public.itinerary_queries
  drop constraint if exists itinerary_queries_name_len,
  drop constraint if exists itinerary_queries_whatsapp_len,
  drop constraint if exists itinerary_queries_planning_time_len,
  drop constraint if exists itinerary_queries_trip_title_len,
  drop constraint if exists itinerary_queries_status_chk;
alter table public.itinerary_queries
  add constraint itinerary_queries_name_len check (length(trim(name)) between 2 and 80) not valid,
  add constraint itinerary_queries_whatsapp_len check (length(regexp_replace(whatsapp_number, '[^0-9]', '', 'g')) between 8 and 15) not valid,
  add constraint itinerary_queries_planning_time_len check (length(trim(planning_time)) between 2 and 50) not valid,
  add constraint itinerary_queries_trip_title_len check (length(trim(trip_title)) between 2 and 140) not valid,
  add constraint itinerary_queries_status_chk check (status in ('new', 'contacted', 'closed')) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_name_len,
  drop constraint if exists contact_messages_email_fmt,
  drop constraint if exists contact_messages_message_len;
alter table public.contact_messages
  add constraint contact_messages_name_len check (length(trim(name)) between 2 and 80) not valid,
  add constraint contact_messages_email_fmt check (email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') not valid,
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

-- Simple server-side rate limits (best-effort, per email/phone).
-- NOTE: For stronger bot protection, use Turnstile/Recaptcha + Edge Function.
create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  count int not null default 0,
  reset_at timestamptz not null,
  primary key (bucket, key)
);

create or replace function public.enforce_rate_limit(
  p_bucket text,
  p_key text,
  p_limit int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  -- Cleanup (Free plan friendly):
  -- `public.rate_limits` can grow unbounded over time because old buckets/keys stick around.
  -- On Supabase Free, scheduled DB jobs (pg_cron) may not be available, so we do a tiny
  -- probabilistic cleanup here to keep the table bounded without adding noticeable latency.
  if random() < 0.01 then
    delete from public.rate_limits
    where ctid in (
      select ctid
      from public.rate_limits
      where reset_at < v_now - interval '15 days'
      limit 500
    );
  end if;

  if p_key is null or length(trim(p_key)) = 0 then
    return;
  end if;

  insert into public.rate_limits(bucket, key, count, reset_at)
  values (p_bucket, p_key, 1, v_now + p_window)
  on conflict (bucket, key) do update set
    count = case when public.rate_limits.reset_at <= v_now then 1 else public.rate_limits.count + 1 end,
    reset_at = case when public.rate_limits.reset_at <= v_now then v_now + p_window else public.rate_limits.reset_at end
  returning count into v_count;

  if v_count > p_limit then
    raise exception 'Rate limit exceeded for %', p_bucket;
  end if;
end;
$$;

create or replace function public.trg_contact_messages_rate_limit()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('contact_email', lower(new.email), 3, interval '1 hour');
  return new;
end;
$$;

create or replace function public.trg_newsletter_rate_limit()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('newsletter_email', lower(new.email), 2, interval '1 day');
  return new;
end;
$$;

create or replace function public.trg_itinerary_queries_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_phone text;
begin
  v_phone := regexp_replace(new.whatsapp_number, '[^0-9]', '', 'g');
  perform public.enforce_rate_limit('itinerary_whatsapp', v_phone, 5, interval '1 day');
  return new;
end;
$$;

drop trigger if exists trg_contact_messages_rate_limit on public.contact_messages;
create trigger trg_contact_messages_rate_limit
before insert on public.contact_messages
for each row
execute function public.trg_contact_messages_rate_limit();

drop trigger if exists trg_newsletter_rate_limit on public.newsletter_subscribers;
create trigger trg_newsletter_rate_limit
before insert on public.newsletter_subscribers
for each row
execute function public.trg_newsletter_rate_limit();

drop trigger if exists trg_itinerary_queries_rate_limit on public.itinerary_queries;
create trigger trg_itinerary_queries_rate_limit
before insert on public.itinerary_queries
for each row
execute function public.trg_itinerary_queries_rate_limit();

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
create policy "no public insert newsletter_subscribers"
on public.newsletter_subscribers
for insert
to anon, authenticated
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
