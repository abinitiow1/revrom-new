<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Revrom (Vite + React)

## Local run

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run: `npm run dev`

## Supabase persistence (admin changes saved)

This project supports two data modes:
- `local` (default): uses `localStorage` + `data/mockData.ts`
- `supabase`: loads/saves the whole app state in Supabase (JSON)

### 1) Create DB tables + policies

In Supabase SQL editor, run: `supabase/schema.sql`

Then:
- Create your admin user in Supabase Auth (Email/Password).
- Add that user to `public.admin_users` (recommended: store `auth.users.id` as `user_id`).

### 2) Configure env vars

Create `.env.local`:

```
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TURNSTILE_SITE_KEY=...   # Cloudflare Turnstile site key (public)
```

### 4) Vercel API env vars (server-side)

If you deploy to Vercel and want the `/api/*` routes (forms, Turnstile verification, Geoapify proxy) to work, set these in Vercel Project Settings → Environment Variables:

```
TURNSTILE_SECRET_KEY=...           # Cloudflare Turnstile secret key (server-only) - used for forms
TURNSTILE_EXPECTED_HOSTNAMES=...   # optional: comma-separated hostnames
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only (never expose as VITE_*)
GEOAPIFY_API_KEY=...
```

### 3) What each function does

- `services/supabaseClient.ts:getSupabase()` creates and returns the configured Supabase client.
- `services/appStateService.ts:loadAppState()` reads `public.app_state` (`id='default'`) and returns the saved JSON snapshot.
- `services/appStateService.ts:saveAppState()` upserts the full snapshot to `public.app_state` (`id='default'`).
- `services/appStateService.ts:createDebouncedStateSaver()` prevents spam writes while editing in Admin.
- `App.tsx` hydrates from Supabase on load (when `VITE_DATA_MODE=supabase`) and auto-saves changes (debounced).
- `pages/LoginPage.tsx` uses Supabase Auth in `supabase` mode, otherwise uses local demo credentials.

## "Supabase sleeps" / keep-alive ping

Supabase DB projects generally don't "sleep" like hobby dynos, but some endpoints can have cold starts. If you still want a keep-alive ping, there is an optional GitHub Action at `.github/workflows/ping.yml`.

- Set `PING_URL` as a GitHub repo secret (use your deployed Vercel URL).
- The workflow will `curl` it on a schedule.
