# Turnstile Integration Setup Guide

## Issues Found and Fixed

### ✅ Fixed Issues:
1. **TypeScript Configuration** - Added `strict: true` and `forceConsistentCasingInFileNames: true` to tsconfig.json
2. **Package.json** - Fixed invalid package name from `copy-of-revrom.in-|-adventure-travel` to `revrom-adventure-travel`
3. **Turnstile Component** - Moved inline styles to CSS class (`.turnstile-retry-button`) in components/Turnstile.tsx
4. **ContactPage** - Added clearer Turnstile requirement logic with `requiresTurnstile` flag

---

## ⚠️ Critical Setup Required

### 1. Environment Variables - LOCAL DEV (.env.local)

```env
# Public (can be exposed in client)
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Local dev doesn't need secret key - it bypasses verification
# But if testing server verification locally with 'vercel dev', you'll need:
# TURNSTILE_SECRET_KEY=0x4AAA...
```

**How to get these:**
1. Go to https://dash.cloudflare.com/
2. Navigate to Turnstile → Sites
3. Create a site (or use existing)
4. Copy **Site Key** (public) → `VITE_TURNSTILE_SITE_KEY`
5. Copy **Secret Key** (server-only) → `TURNSTILE_SECRET_KEY` (for production only!)

### 2. Vercel Production Deployment

**Client Environment (accessible in browser):**
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Add: `VITE_TURNSTILE_SITE_KEY=1x00000000...`
- Check: "Preview" and "Production"

**Server Environment (NOT accessible in browser):**
- Still in Vercel Dashboard → Project Settings → Environment Variables
- Add: `TURNSTILE_SECRET_KEY=0x4AAA...`
- Check: Only "Production" (or "Preview" too, depending on your setup)
- ⚠️ **DO NOT** use VITE_ prefix for server variables!
- ⚠️ **DO NOT** set this as a public variable!

### 3. Verify the Setup

Run the health check to verify configuration:

```bash
curl https://your-app.vercel.app/api/health
```

Should show:
```json
{
  "environment": {
    "TURNSTILE_SECRET_KEY": true,
    "VITE_TURNSTILE_SITE_KEY": true
  },
  "timestamp": "..."
}
```

If `TURNSTILE_SECRET_KEY` shows `false`, your production forms will fail!

---

## 🔍 Where Turnstile is Used

1. **Contact Form** (`pages/ContactPage.tsx`)
   - Located in `/contact` route
   - Submits to `/api/forms/contact`
   - Verifies with server

2. **Newsletter Signup** (`components/Footer.tsx`)
   - Located at bottom of every page
   - Submits to `/api/forms/newsletter`
   - Verifies with server

3. **Trip Booking** (`pages/BookingPage.tsx`)
   - Located in booking flow
   - Saves inquiry to database
   - Optional - WhatsApp still works without verification

---

## 🛡️ Common Issues and Solutions

### Issue: "Turnstile verification returned 401"
**Cause:** `TURNSTILE_SECRET_KEY` is missing or wrong (not in server environment)
**Solution:**
- Verify it's set in Vercel **Server Environment** (not client)
- Check it's the **Secret Key**, not Site Key
- Ensure no `VITE_` prefix for server variables
- Redeploy after adding the variable

### Issue: "Turnstile failed to load"
**Cause:** Content Security Policy blocks Cloudflare
**Solution:** Check `vercel.json` has correct CSP header:
```
connect-src 'self' https://challenges.cloudflare.com ...
frame-src https://challenges.cloudflare.com
script-src 'self' 'unsafe-eval' https://challenges.cloudflare.com ...
```

### Issue: "Missing Turnstile token" on localhost
**Expected behavior** - Turnstile is bypassed on localhost (unless `VITE_TURNSTILE_SITE_KEY` is explicitly set in .env.local)

### Issue: Form validation fails without clear message
**Check:**
- Is `TURNSTILE_SECRET_KEY` set in server environment?
- Is rate limiting being triggered? (20 requests per 5 minutes per IP)
- Are error logs showing "timeout-or-duplicate"? (can be cached, retry after 2 minutes)

---

## 📋 Deployment Checklist

- [ ] Create Cloudflare Turnstile site
- [ ] Copy Site Key to `VITE_TURNSTILE_SITE_KEY` (public env)
- [ ] Copy Secret Key to `TURNSTILE_SECRET_KEY` (private server env)
- [ ] Verify CSP headers in `vercel.json` include `challenges.cloudflare.com`
- [ ] Test locally with `npm run dev`
- [ ] Deploy to Vercel preview and test
- [ ] Test `/api/health` endpoint returns both keys as `true`
- [ ] Submit contact form and verify it saves to database
- [ ] Check Vercel logs for "Turnstile verify result" messages

---

## 🔧 Testing Turnstile Locally

With `npm run dev`:
1. Turnstile is **disabled** on localhost (you can submit without verification)
2. To enable and test locally with `vercel dev`:
   - Set `VITE_TURNSTILE_SITE_KEY` in `.env.local`
   - Set `TURNSTILE_SECRET_KEY` in `.env.local`
   - Run `vercel dev` instead of `npm run dev`
   - Turnstile will now show and verify

---

## 📚 References

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [CSP Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
