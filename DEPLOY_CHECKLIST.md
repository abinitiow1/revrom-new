# Deploy Checklist (Vercel + Supabase + Turnstile + Geoapify)

This repo ships as a Vite SPA **plus** Vercel Serverless Functions under `api/`. Forms + Geoapify proxies require server env + Supabase schema.

## 1) Supabase (required)

### 1.1 Run required SQL
- In Supabase SQL Editor, run: `supabase/schema.sql`
- This creates required tables + RLS + RPC:
  - `app_state`
  - `admin_users`
  - `itinerary_queries`, `contact_messages`, `newsletter_subscribers`
  - `rate_limit_events`, `turnstile_token_replay`
  - `public.is_admin()`

### 1.2 Bootstrap an admin user
1) Sign up in the deployed app (or Supabase Auth) with your admin email.
2) In Supabase SQL Editor, run:

```sql
-- Replace with your email
select id, email from auth.users where lower(email) = lower('you@example.com');

-- Use the returned id
insert into public.admin_users (user_id, email)
values ('00000000-0000-0000-0000-000000000000', 'you@example.com')
on conflict (user_id) do update set email = excluded.email;
```

### 1.3 (Optional) Storage for Admin uploads
- Create a Supabase Storage bucket named `site-assets`.
- Ensure your Storage policies match the optional section in `supabase/schema.sql` (admin-only upload/update).

### 1.4 Seed `app_state` (required for public content in Supabase mode)
You have two options:
- Option A (recommended): sign in to `/admin`, make a tiny change, click save once (creates/updates `app_state` row).
- Option B: insert manually:

```sql
insert into public.app_state (id, state)
values ('default', '{}'::jsonb)
on conflict (id) do update set state = excluded.state;
```

## 2) Cloudflare Turnstile (required for forms)

Create a Turnstile Site in Cloudflare and add:
- Allowed hostnames: your production domain(s) and any preview domain you intend to use.
- Get:
  - Site key (public) → `VITE_TURNSTILE_SITE_KEY`
  - Secret key (server-only, starts with `0x`) → `TURNSTILE_SECRET_KEY`

Server-side enforcement notes:
- The server checks `TURNSTILE_EXPECTED_HOSTNAMES` **exactly** (no wildcards). See `api/geoapify/shared.ts`.
- If you use Vercel Preview URLs, use a stable preview domain (e.g. `preview.revrom.in`) or set Preview env vars to match that hostname.

Client actions used by the app:
- Booking lead: `forms_lead`
- Contact form: `forms_contact`
- Newsletter: `forms_newsletter`

## 3) Geoapify (required for planner enrichment)

- Create a Geoapify key and set server env: `GEOAPIFY_API_KEY`
- The browser calls `/api/geoapify/*`; the API key must **not** be exposed as `VITE_*`.

## 4) Vercel Environment Variables

Set these in Vercel → Project → Settings → Environment Variables.

### 4.1 Client (build-time, public)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_DATA_MODE`:
  - `supabase` for production (recommended)
  - `local` for demo/offline mode (no Supabase content syncing)

### 4.2 Server (Serverless Functions only; keep “Server” scope)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_EXPECTED_HOSTNAMES` (comma-separated exact hostnames)
- `GEOAPIFY_API_KEY`
- `HEALTH_CHECK_SECRET` (recommended; protects `/api/health`)

## 5) Verify after deploy (quick)

### 5.1 Automated smoke checks (no Turnstile)
- PowerShell: `scripts/smoke-test.ps1`
- Bash: `scripts/smoke-test.sh`

These validate:
- site returns HTML
- CSP header present
- `/api/geoapify/geocode` works (rate limiting + Geoapify key)
- `/api/geoapify/places` works
- `/api/health` works (if `HEALTH_CHECK_SECRET` is set)

### 5.2 Manual checks (Turnstile-gated flows)
1) Booking → submit lead → verify modal appears → success saves lead → redirects to WhatsApp/email.
2) Contact → submit message → verify modal appears → success saves message → WhatsApp/email button works.
3) Newsletter → verify modal appears → subscribe works (duplicate is accepted).
4) Customize Trip Planner → build itinerary → verify it renders consistently; try with/without Geoapify availability.

## 6) Current rate limits (server)
- Geoapify endpoints: `60 requests / 5 minutes / IP`
- Forms:
  - Lead: `10 / 5 minutes / IP`
  - Contact: `10 / 5 minutes / IP`
  - Newsletter: `5 / 5 minutes / IP`

