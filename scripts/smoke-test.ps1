param(
  [Parameter(Mandatory = $false)]
  [string]$BaseUrl = "http://localhost:3000",

  [Parameter(Mandatory = $false)]
  [string]$HealthSecret = "",

  [Parameter(Mandatory = $false)]
  [switch]$RunLiveUpstreamChecks
)

$ErrorActionPreference = "Stop"

function Assert-Ok($ok, $message) {
  if (-not $ok) { throw $message }
}

function Get-Json($uri, $headers = @{}) {
  $resp = Invoke-WebRequest -Uri $uri -Headers $headers -Method GET -UseBasicParsing
  return ($resp.Content | ConvertFrom-Json)
}

function Post-Json($uri, $bodyObj, $headers = @{}) {
  $json = ($bodyObj | ConvertTo-Json -Depth 12)
  $resp = Invoke-WebRequest -Uri $uri -Headers $headers -Method POST -ContentType "application/json" -Body $json -UseBasicParsing
  return ($resp.Content | ConvertFrom-Json)
}

$base = $BaseUrl.TrimEnd("/")
Write-Host "Revrom smoke test"
Write-Host "Base URL: $base"

# 1) Site HTML + headers
$home = Invoke-WebRequest -Uri "$base/" -Method GET -UseBasicParsing
Assert-Ok ($home.StatusCode -ge 200 -and $home.StatusCode -lt 400) "Home page did not return 2xx/3xx."

$csp = $home.Headers["Content-Security-Policy"]
if ([string]::IsNullOrWhiteSpace($csp)) {
  Write-Warning "Missing Content-Security-Policy header (expected on Vercel via vercel.json)."
} else {
  Write-Host "CSP header: present"
}

# 2) Health (optional)
if (-not [string]::IsNullOrWhiteSpace($HealthSecret)) {
  $hsHeaders = @{ "X-Health-Check" = $HealthSecret }
  $healthUrl = "$base/api/health"
  if ($RunLiveUpstreamChecks) { $healthUrl = "$healthUrl?runTests=true" }
  $health = Get-Json $healthUrl $hsHeaders
  Assert-Ok ($health.ok -eq $true) "Health endpoint returned ok=false."
  Write-Host "Health: ok"
} else {
  Write-Host "Health: skipped (no -HealthSecret provided)"
}

# 3) Geoapify proxy endpoints (no Turnstile required)
$geo = Post-Json "$base/api/geoapify/geocode" @{ text = "Leh" }
Assert-Ok ($geo.lat -is [double] -or $geo.lat -is [int]) "Geocode missing lat."
Assert-Ok ($geo.lon -is [double] -or $geo.lon -is [int]) "Geocode missing lon."
Write-Host ("Geocode: ok ({0}, {1})" -f $geo.lat, $geo.lon)

$places = Post-Json "$base/api/geoapify/places" @{
  lat = $geo.lat
  lon = $geo.lon
  radiusMeters = 50000
  limit = 5
  interestTags = @("mountain")
}

if ($places.error) {
  throw ("Places returned error: " + $places.error)
}

$count = 0
if ($places.places) { $count = @($places.places).Count }
Write-Host "Places: ok ($count results)"

Write-Host ""
Write-Host "Manual steps (Turnstile-gated):"
Write-Host "- Booking: submit inquiry -> verify modal -> should save lead then open WhatsApp/email"
Write-Host "- Contact: submit message -> verify modal -> should save message then open WhatsApp/email"
Write-Host "- Newsletter: verify modal -> subscribe (duplicate should still succeed)"

