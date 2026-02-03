# 🚨 Security Fixes Required - Priority Order

## Critical (Fix IMMEDIATELY) 🔴

### #1: VITE_GEOAPIFY_API_KEY Exposed in Browser
**Current Risk:** Your Geoapify API key is visible in network requests
**Cost of Breach:** $$$$ (thousands in fraudulent API calls)
**Time to Fix:** 2 hours

**Location:** `services/geoapifyService.ts` lines 11-85

**Current Vulnerable Code:**
```typescript
const clientKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
const url = `https://api.geoapify.com/v1/geocode/search?apiKey=${clientKey}...`;
const res = await fetch(url);  // ← API KEY IN NETWORK REQUEST!
```

**Fix Steps:**
1. Create `/api/geocode.ts` server endpoint
2. Move API key to `GEOAPIFY_API_KEY` (no VITE_ prefix = server-only)
3. Update `geoapifyService.ts` to call `/api/geocode` instead
4. Delete `VITE_GEOAPIFY_API_KEY` from `.env`

**Test:**
- Open DevTools → Network tab
- Make geocoding request
- Verify API key is NOT in URL
- Verify key only used server-side

---

### #2: LocationData Stored Plaintext in LocalStorage
**Current Risk:** Trip locations visible to anyone with console access
**Cost of Breach:** Privacy violation, location tracking
**Time to Fix:** 1 hour

**Location:** `services/geoapifyService.ts` lines 20, 41

**Current Vulnerable Code:**
```typescript
localStorage.setItem(cacheKey, JSON.stringify({
  lat: 32.2264,
  lon: 77.4686,
  formatted: "Kasol, Himachal Pradesh"  // ← READABLE!
}));
```

**Fix Steps:**
1. Install: `npm install crypto-js`
2. Create `utils/encryption.ts` with encrypt/decrypt functions
3. Update geoapifyService to encrypt before storing
4. Update when retrieving to decrypt

**Test:**
- Open DevTools → Application → Storage → LocalStorage
- Check data is encrypted/unreadable
- Verify cache still works after decryption

---

### #3: Turnstile Token in Network Request Body
**Current Risk:** Token could be intercepted/replayed (if attacker is on same network)
**Time to Fix:** 30 min

**Location:** `services/contactMessageService.ts` line 23

**Current Code:**
```typescript
body: JSON.stringify({
  message: input.message,
  turnstileToken: input.turnstileToken,  // ← VISIBLE IN NETWORK!
})
```

**Fix:**
1. Use HTTPS (already should be in production ✅)
2. Add token verification on server-side
3. Clear token immediately after use
4. Consider: Send token via header instead of body

**Test:**
- HTTPS enforced in production
- Token cleared after submission

---

## High Priority (Fix This Week) 🟠

### #4: API Endpoints Not Protected from Direct Access
**Risk:** Someone could call `/api/geocode` repeatedly (DDoS)
**Fix:** Add rate limiting and authentication checks

**Locations:**
- All `/api/*` endpoints need validation
- Consider: `NextApiRequest` rate limiter

---

### #5: React DevTools Enabled in Production
**Risk:** Component state/props visible to hacker
**Fix:** Disable React DevTools in production

**Add to vite.config.ts:**
```typescript
// In production, disable React DevTools
if (import.meta.env.PROD) {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = () => {};
  }
}
```

---

### #6: Console Logs Could Leak Data
**Risk:** If someone adds sensitive data to logs, it's exposed
**Fix:** Use the logger we created - it sanitizes automatically

**Action:** Audit all console calls, replace with logger functions

---

## Medium Priority (Fix Next Sprint) 🟡

### #7: No Content-Security-Policy Headers
**Risk:** XSS attacks, injected scripts
**Fix:** Add CSP headers to `next.config.js` or `vercel.json`

### #8: Trip Data in SessionStorage/Cookies
**Risk:** Unencrypted user preferences visible
**Fix:** Encrypt sensitive user data

### #9: No CORS Restrictions
**Risk:** Other websites could call your APIs
**Fix:** Implement proper CORS policy

---

## Verification Checklist ✅

After fixes, verify security:

```
□ F12 → Network tab: No API keys visible in URLs
□ F12 → Application → Storage: Location data is encrypted/unreadable
□ F12 → Console: No sensitive data logged
□ HTTPS only (never HTTP)
□ React DevTools disabled in production
□ All Turnstile tokens cleared after use
□ API endpoints have rate limiting
□ CORS properly configured
□ Content-Security-Policy headers set
```

---

## Testing Tools

### Chrome DevTools Tests:
1. **Network Tab Test:**
   - Filter by XHR/Fetch
   - Look for API keys in URLs or headers
   - Check response data

2. **Storage Test:**
   - Application → LocalStorage
   - Check if any data is plaintext
   - Try to read location data

3. **Console Test:**
   - Check for leaked secrets
   - Try: `localStorage`, `sessionStorage`
   - Look for API keys

### Browser Extensions:
- **Lighthouse** - Security audit
- **WAVE** - Accessibility/Security
- **Security Headers** - Check security headers

---

## Priority Timeline

| Priority | Items | Estimated Time | Deadline |
|----------|-------|-----------------|----------|
| 🔴 Critical | #1-3 | 3-4 hours | This week |
| 🟠 High | #4-6 | 4-6 hours | Next 2 weeks |
| 🟡 Medium | #7-9 | 6-8 hours | Next sprint |

---

## Questions?

**Q: Will these fixes break my app?**
A: No! They only affect the backend. Frontend looks the same.

**Q: Do I need to migrate existing data?**
A: Yes, run a one-time script to encrypt existing localStorage data.

**Q: What if user has very old cached data?**
A: It will be invalid after encryption. They'll just re-request (no big deal).

**Q: Does this slow down the app?**
A: Maybe 10-50ms per encrypted/decrypted call. Negligible.

**Q: What about offline mode?**
A: Encryption makes offline work slightly harder but still possible.

---

## Next Steps

1. Create `/api/geocode` endpoint (moves API key server-side)
2. Create `utils/encryption.ts` (encrypts sensitive data)
3. Update `geoapifyService.ts` to use new endpoint and encryption
4. Test with DevTools to verify no keys visible
5. Update logger to prevent future data leaks
6. Add rate limiting to API endpoints

**Start with #1 - it's the highest risk! 🚀**
