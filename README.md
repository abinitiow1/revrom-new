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
TURNSTILE_SECRET_KEY=...           # Cloudflare Turnstile secret key (server-only) - used for forms (this is the *secret* key, not the site key)
TURNSTILE_EXPECTED_HOSTNAMES=...   # optional: comma-separated hostnames
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only (never expose as VITE_*)
GEOAPIFY_API_KEY=...               # server-side Geoapify key used by /api/geoapify/* (not VITE_GEOAPIFY_API_KEY)
```

Troubleshooting 401 errors

- Turnstile 401: If you see `Turnstile verify result` with status `401` in server logs, the Turnstile secret is missing, invalid, or belongs to a different account. Ensure `TURNSTILE_SECRET_KEY` is set in **server** env (Vercel) and is the secret (server-only) key, not the site (public) key. If you use `TURNSTILE_EXPECTED_HOSTNAMES`, verify it includes your production hostname exactly.

- Geoapify 401: If `/api/geoapify/*` returns 401, the server-side `GEOAPIFY_API_KEY` is missing or incorrect. The client-only `VITE_GEOAPIFY_API_KEY` is separate and not used by server proxies. Add `GEOAPIFY_API_KEY` to Vercel Project Settings (or your server env) and redeploy.

- Local testing: For local testing, you can add the server keys to your local environment (e.g., `.env.local`) but be careful not to commit secrets. Restart `vite`/dev server after adding env vars.

Health-check endpoint

- A new server health-check endpoint is available at `/api/health`. It reports presence of critical server env vars and can optionally run live upstream checks for Turnstile and Geoapify.

- To run live upstream checks, set a server-only secret `HEALTH_CHECK_SECRET` in your deployment, then call:

  GET /api/health?runTests=true
  with header `X-Health-Check: <HEALTH_CHECK_SECRET>`

  Note: live tests make small upstream requests and should only be used by administrators. If `HEALTH_CHECK_SECRET` is not set, `runTests=true` will be ignored for safety.

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
