#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
HEALTH_SECRET="${HEALTH_CHECK_SECRET:-}"
RUN_LIVE="${RUN_LIVE_UPSTREAM_CHECKS:-false}"

base="${BASE_URL%/}"

echo "Revrom smoke test"
echo "Base URL: $base"

command -v node >/dev/null 2>&1 || { echo "Missing 'node' (required to parse JSON in this script)."; exit 1; }

echo ""
echo "1) Site HTML + CSP header"
headers="$(curl -fsSI "$base/" || true)"
if echo "$headers" | grep -qi '^content-security-policy:'; then
  echo "CSP header: present"
else
  echo "CSP header: MISSING (expected on Vercel via vercel.json)"
fi

echo ""
echo "2) Health (optional)"
if [[ -n "$HEALTH_SECRET" ]]; then
  health_url="$base/api/health"
  if [[ "$RUN_LIVE" == "true" ]]; then
    health_url="$health_url?runTests=true"
  fi
  curl -fsS "$health_url" -H "X-Health-Check: $HEALTH_SECRET" | jq -e '.ok == true' >/dev/null
  echo "Health: ok"
else
  echo "Health: skipped (set HEALTH_CHECK_SECRET env to enable)"
fi

echo ""
echo "3) Geoapify proxy endpoints (no Turnstile required)"
geo_json="$(curl -fsS "$base/api/geoapify/geocode" -H 'Content-Type: application/json' -d '{"text":"Leh"}')"
lat="$(node -e 'const s=process.argv[1]; const j=JSON.parse(s); process.stdout.write(String(j.lat ?? ""))' "$geo_json")"
lon="$(node -e 'const s=process.argv[1]; const j=JSON.parse(s); process.stdout.write(String(j.lon ?? ""))' "$geo_json")"
if [[ "$lat" == "null" || "$lon" == "null" ]]; then
  echo "$geo_json"
  echo "Geocode: FAILED (missing lat/lon)"
  exit 1
fi
echo "Geocode: ok ($lat, $lon)"

places_json="$(curl -fsS "$base/api/geoapify/places" -H 'Content-Type: application/json' -d "{\"lat\":$lat,\"lon\":$lon,\"radiusMeters\":50000,\"limit\":5,\"interestTags\":[\"mountain\"]}")"
err="$(node -e 'const s=process.argv[1]; const j=JSON.parse(s); process.stdout.write(String(j.error ?? ""))' "$places_json")"
if [[ -n "$err" ]]; then
  echo "$places_json"
  echo "Places: FAILED ($err)"
  exit 1
fi
count="$(node -e 'const s=process.argv[1]; const j=JSON.parse(s); const n=Array.isArray(j.places)?j.places.length:0; process.stdout.write(String(n))' "$places_json")"
echo "Places: ok ($count results)"

echo ""
echo "Manual steps (Turnstile-gated):"
echo "- Booking: submit inquiry -> verify modal -> should save lead then open WhatsApp/email"
echo "- Contact: submit message -> verify modal -> should save message then open WhatsApp/email"
echo "- Newsletter: verify modal -> subscribe (duplicate should still succeed)"
