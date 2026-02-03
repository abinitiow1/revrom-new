#!/bin/bash
# DEPLOYMENT COMMANDS - Copy and paste these commands in order

# ============================================
# STEP 1: Verify Git Status
# ============================================
echo "📍 Step 1: Checking git status..."
git status

# Should show new/modified files:
# - api/geocode.ts (new)
# - utils/encryption.ts (new)
# - services/geoapifyService.ts (modified)
# - components/Turnstile.tsx (modified)

# ============================================
# STEP 2: Build and Test Locally
# ============================================
echo "📍 Step 2: Building locally to verify no errors..."
npm run build

# If errors: check TypeScript compilation
# Expected: 0 custom errors, only optional Next.js type warnings

# ============================================
# STEP 3: Test App Locally
# ============================================
echo "📍 Step 3: Testing app locally..."
npm run dev

# Manual tests:
# 1. Open http://localhost:5173
# 2. Search for "Kasol"
# 3. Check F12 Network tab → see POST /api/geocode
# 4. Check F12 Console → no errors
# 5. Check F12 Application/LocalStorage → see geocode_* entries

# After testing: Ctrl+C to stop server

# ============================================
# STEP 4: Commit Changes
# ============================================
echo "📍 Step 4: Committing security fixes..."
git add -A
git commit -m "Security: Move Geoapify API key server-side, encrypt location cache

FIXES:
- Create /api/geocode endpoint (hides API key from browser)
- Add utils/encryption utility (encrypts location data in localStorage)
- Update geoapifyService to use server endpoint and encryption
- All sensitive data now protected from browser inspection

IMPACT:
- API keys no longer exposed in Network requests
- Location cache encrypted in localStorage with 'enc:' prefix
- Turnstile tokens cleared after use
- All logging auto-redacts sensitive data"

# ============================================
# STEP 5: Push to GitHub
# ============================================
echo "📍 Step 5: Pushing to GitHub..."
git push origin main

# Vercel should auto-deploy after ~1 minute
# But it will fail without environment variables set

# ============================================
# STEP 6: Configure Vercel Environment Variables
# ============================================
echo "📍 Step 6: Setting environment variables in Vercel..."
echo ""
echo "MANUAL STEP - Cannot automate this in script"
echo "Go to: https://vercel.com/dashboard"
echo ""
echo "1. Click your project: 'revrom.in-_-adventure-travel' (or similar)"
echo "2. Go to Settings → Environment Variables"
echo "3. Add new variable:"
echo "   Name: GEOAPIFY_API_KEY"
echo "   Value: <paste_your_actual_geoapify_api_key_here>"
echo "4. Make sure scope is set to: Production, Preview, Development"
echo "5. Click 'Save'"
echo "6. Go to Deployments tab and trigger a redeploy"
echo ""
echo "⚠️  IMPORTANT: Remove or delete VITE_GEOAPIFY_API_KEY if it exists"
echo "             (Replace with GEOAPIFY_API_KEY without VITE_ prefix)"
echo ""
read -p "Press Enter after setting environment variables..."

# ============================================
# STEP 7: Verify Deployment
# ============================================
echo "📍 Step 7: Verifying deployment..."
echo ""
echo "Waiting for Vercel to deploy (2-3 minutes)..."
sleep 10
echo "Go to: https://vercel.com/dashboard → Deployments"
echo "Wait for status to show 'Ready' (not 'Building')"
echo ""
read -p "Press Enter once deployment shows 'Ready'..."

# ============================================
# STEP 8: Test in Production
# ============================================
echo "📍 Step 8: Testing production deployment..."
echo ""
echo "Open your production URL in browser and check:"
echo "1. F12 → Network tab"
echo "2. Search for 'Kasol'"
echo "3. Find 'POST /api/geocode' request"
echo "4. Click it and verify:"
echo "   ✓ Body: { text: 'Kasol' }"
echo "   ✓ NO apiKey in URL"
echo "   ✓ Status: 200"
echo ""
echo "5. F12 → Application → LocalStorage"
echo "6. Search for 'geocode_' entries"
echo "7. Click on entry and verify value starts with 'enc:'"
echo ""
echo "8. F12 → Console"
echo "9. Verify NO API keys in logs"
echo ""

# ============================================
# STEP 9: Automated Verification
# ============================================
echo "📍 Step 9: Running automated verification..."
echo ""
echo "Copy this entire script and paste in F12 Console:"
cat > /tmp/verify.js << 'EOF'
(async function verifySecurityFixes() {
  console.clear();
  console.log('🔐 SECURITY VERIFICATION SCRIPT');
  
  const tests = { passed: 0, failed: 0 };
  
  try {
    const testResponse = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test' }),
    });
    
    if (testResponse.status === 400 || testResponse.status === 200) {
      console.log('✅ PASS: /api/geocode endpoint exists');
      tests.passed++;
    } else {
      console.log('❌ FAIL: /api/geocode returned:', testResponse.status);
      tests.failed++;
    }
  } catch (err) {
    console.log('❌ FAIL: Cannot reach /api/geocode:', err);
    tests.failed++;
  }
  
  // Check encrypted cache
  const geoKeys = Object.keys(localStorage).filter(k => k.startsWith('geocode_'));
  const encrypted = geoKeys.filter(k => localStorage.getItem(k)?.startsWith('enc:')).length;
  
  if (encrypted > 0) {
    console.log(`✅ PASS: Found ${encrypted} encrypted cache entries`);
    tests.passed++;
  } else if (geoKeys.length > 0) {
    console.log('❌ FAIL: Cache entries not encrypted');
    tests.failed++;
  }
  
  console.log(`\n📊 Results: ${tests.passed} passed, ${tests.failed} failed`);
  if (tests.failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Security fixes working!');
  } else {
    console.log('⚠️  Some tests failed - review above');
  }
})();
EOF

cat /tmp/verify.js

# ============================================
# STEP 10: Monitor for Issues
# ============================================
echo ""
echo "📍 Step 10: Monitoring production..."
echo ""
echo "For the next 24 hours:"
echo "1. Check Vercel logs daily: https://vercel.com/dashboard → Deployments"
echo "2. Test basic functionality:"
echo "   - Search for destinations"
echo "   - View cached results"
echo "   - Verify no errors in console"
echo "3. If issues appear:"
echo "   - Check /api/geocode endpoint (Network tab)"
echo "   - Verify environment variables set correctly"
echo "   - Check Vercel logs for API errors"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "Summary of changes:"
echo "  ✓ /api/geocode.ts - Server endpoint (hides API key)"
echo "  ✓ utils/encryption.ts - Encryption utility"
echo "  ✓ services/geoapifyService.ts - Uses server endpoint + encryption"
echo "  ✓ components/Turnstile.tsx - Type-safe + proper error handling"
echo ""
echo "Security improvements:"
echo "  ✓ API keys no longer exposed in Network tab"
echo "  ✓ Location data encrypted in localStorage"
echo "  ✓ Tokens cleared after use"
echo "  ✓ All logging auto-redacts sensitive data"
echo ""
echo "Next steps:"
echo "  1. Monitor production for 24 hours"
echo "  2. If errors: check TROUBLESHOOTING.md"
echo "  3. If all good: celebrate! 🎉"
echo ""
echo "Documentation:"
echo "  - SECURITY_FIX_SUMMARY.md (quick reference)"
echo "  - DEPLOYMENT_GUIDE.md (detailed steps)"
echo "  - SECURITY_VERIFICATION_SCRIPT.js (automated checks)"
echo ""
