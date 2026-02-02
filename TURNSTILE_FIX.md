# 🔧 Turnstile Error 600010 - CONFIGURATION FIX

## ⚠️ Current Problem
**Error 600010: "Configuration error - check that www.revrom.in is added to allowed domains"**

This means your Cloudflare Turnstile widget is NOT configured to allow `www.revrom.in` as a domain.

---

## ✅ STEP-BY-STEP FIX

### 1️⃣ Go to Cloudflare Dashboard
- Visit: https://dash.cloudflare.com/
- Login with your Cloudflare account

### 2️⃣ Navigate to Turnstile
- In the left sidebar, click **"Turnstile"**
- You should see your widget(s) listed

### 3️⃣ Click on Your Widget
- Find the widget with the site key you're using (starts with `0x4AAAAAACM...`)
- Click on it to open settings

### 4️⃣ Add Allowed Domains
In the **"Domains"** section, you need to add ALL these domains:
```
www.revrom.in
revrom.in
localhost
```

**How to add:**
- Look for "Domain" or "Allowed Domains" field
- Click "Add domain" or similar button
- Enter each domain one by one
- Click Save

### 5️⃣ Verify Site Key and Secret Key
While you're there, **copy both keys** (you'll need them for Vercel):

**Site Key** (starts with `0x4...`):
- This goes in the **client-side** (public)
- Used in your website's frontend

**Secret Key** (starts with `0x...`):
- This goes in the **server-side** (private)
- Used in your API routes

---

## 🔐 UPDATE VERCEL ENVIRONMENT VARIABLES

### Go to Vercel Dashboard:
https://vercel.com/your-project/settings/environment-variables

### Add/Update These Variables:

#### 1. **VITE_TURNSTILE_SITE_KEY** (Client-side, PUBLIC)
```
Value: 0x4AAAAAACM... (the SITE key from Cloudflare)
Environment: Production, Preview, Development
```

#### 2. **TURNSTILE_SECRET_KEY** (Server-side, SECRET)
```
Value: 0x4AAAAAACM... (the SECRET key from Cloudflare - DIFFERENT from site key!)
Environment: Production, Preview, Development
```

⚠️ **CRITICAL:** Make sure you're NOT using the same key for both! The secret key is different from the site key.

---

## 🔍 How to Tell Which Key is Which

In Cloudflare Turnstile dashboard:
- **Sitekey** = Public, shows first, for frontend
- **Secret** = Below sitekey, marked as "Secret", for backend

---

## 🚀 AFTER UPDATING

1. **Redeploy on Vercel:**
   - Vercel should auto-redeploy after environment variable changes
   - If not, trigger a manual redeploy

2. **Clear Browser Cache:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

3. **Test the Contact Form:**
   - Go to https://www.revrom.in/#view=contact
   - Fill out the form
   - You should see "✓ Verified" instead of error

---

## 📋 VERIFICATION CHECKLIST

- [ ] Added `www.revrom.in` to Cloudflare Turnstile allowed domains
- [ ] Added `revrom.in` to Cloudflare Turnstile allowed domains
- [ ] Added `localhost` to Cloudflare Turnstile allowed domains
- [ ] Copied the **Site Key** (starts with 0x4...)
- [ ] Copied the **Secret Key** (different from site key)
- [ ] Set `VITE_TURNSTILE_SITE_KEY` in Vercel (site key)
- [ ] Set `TURNSTILE_SECRET_KEY` in Vercel (secret key)
- [ ] Triggered Vercel redeploy
- [ ] Cleared browser cache
- [ ] Tested contact form

---

## 🆘 Still Not Working?

### Check Console Logs:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[Turnstile]` messages
4. Share the full error output

### Common Issues:
- **401 Error**: Wrong secret key (you used site key instead of secret key)
- **600010 Error**: Domain not whitelisted (add to Cloudflare)
- **110420 Error**: Hostname mismatch (check domain spelling)

---

## 📞 Need More Help?

1. Check Cloudflare Turnstile docs: https://developers.cloudflare.com/turnstile/
2. Verify your keys match between Cloudflare and Vercel
3. Make sure you're testing on the correct domain (not a preview URL)
