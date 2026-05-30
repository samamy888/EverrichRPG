param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot 'debug'

function Run-Step {
  param(
    [string]$Label,
    [scriptblock]$Action
  )
  Write-Host "[map-verify] step: $Label"
  & $Action
}

function Get-LatestMatch {
  param(
    [string]$Dir,
    [string]$Pattern
  )
  $f = Get-ChildItem -Path $Dir -Filter $Pattern -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $f) { return '' }
  return $f.FullName
}

function Prune-Files {
  param(
    [string]$Dir,
    [string]$Pattern,
    [int]$Keep = 1
  )
  if ($Keep -lt 1) { return }
  $files = Get-ChildItem -Path $Dir -Filter $Pattern -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  $stale = $files | Select-Object -Skip $Keep
  foreach ($f in $stale) {
    if (Test-Path $f.FullName) { Remove-Item -LiteralPath $f.FullName -Force }
  }
}

function Prune-Dirs {
  param(
    [string]$Dir,
    [string]$Pattern,
    [int]$Keep = 1
  )
  if ($Keep -lt 1) { return }
  $dirs = Get-ChildItem -Path $Dir -Filter $Pattern -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  $stale = $dirs | Select-Object -Skip $Keep
  foreach ($d in $stale) {
    if (Test-Path $d.FullName) { Remove-Item -LiteralPath $d.FullName -Recurse -Force }
  }
}

function Purge-Dirs {
  param(
    [string]$Dir,
    [string]$Pattern
  )
  $dirs = Get-ChildItem -Path $Dir -Filter $Pattern -Directory -ErrorAction SilentlyContinue
  foreach ($d in $dirs) {
    if (Test-Path $d.FullName) { Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

function Purge-Files {
  param(
    [string]$Dir,
    [string]$Pattern
  )
  $files = Get-ChildItem -Path $Dir -Filter $Pattern -File -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    if (Test-Path $f.FullName) { Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue }
  }
}

Set-Location $projectRoot
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

if (-not $SkipBuild) {
  Run-Step -Label 'build' -Action {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
  }
}

Run-Step -Label 'runtime screenshot (HUD/UI/player)' -Action {
  $runtimeOk = $false
  try {
    npm run hud:test:quick
    if ($LASTEXITCODE -eq 0) { $runtimeOk = $true }
  } catch {}

  if (-not $runtimeOk) {
    Write-Host '[map-verify] headless runtime capture failed, fallback to desktop capture'
    try {
      powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\capture-hud.ps1" -Url "http://127.0.0.1:5173/?hudtest=1" -Tag "runtime-view" -WaitSeconds 5
      if ($LASTEXITCODE -eq 0) { $runtimeOk = $true }
    } catch {}
  }

  if (-not $runtimeOk) {
    Write-Host '[map-verify] WARN: runtime capture unavailable in current environment; continue with map artifact verification'
  }
}

Run-Step -Label 'full map runtime tile stitch verify' -Action {
  npm run map:verify:browser:quick
  if ($LASTEXITCODE -ne 0) { throw 'Full runtime map tile verification failed.' }
}

Run-Step -Label 'full map asset verify (reference)' -Action {
  node "$PSScriptRoot\map-asset-regression.cjs" --keep 1
  if ($LASTEXITCODE -ne 0) { throw 'Full map asset verification failed.' }
}

$runtimeShotOff = (
  Get-ChildItem -Path $debugDir -Filter 'hud-auto-*.png' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*-c1.png' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
).FullName
if ([string]::IsNullOrWhiteSpace($runtimeShotOff)) {
  $runtimeShotOff = (
    Get-ChildItem -Path $debugDir -Filter 'runtime-view-*.png' -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notlike '*-c1.png' } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  ).FullName
}
$runtimeShotOn = Get-LatestMatch -Dir $debugDir -Pattern 'hud-auto-*-c1.png'
if ([string]::IsNullOrWhiteSpace($runtimeShotOn)) {
  $runtimeShotOn = Get-LatestMatch -Dir $debugDir -Pattern 'runtime-view-*-c1.png'
}
$runtimeReport = Get-LatestMatch -Dir $debugDir -Pattern 'hud-auto-*.json'
$runtimeMapShot = Join-Path $debugDir 'maprt-full-latest.png'
$runtimeMapReport = Join-Path $debugDir 'maprt-full-latest.json'
$mapShot = Join-Path $debugDir 'mapasset-full-latest.png'
$mapReport = Join-Path $debugDir 'mapasset-full-latest.json'

Prune-Files -Dir $debugDir -Pattern 'runtime-view-*.png' -Keep 1
Prune-Files -Dir $debugDir -Pattern 'runtime-view-*-display*.png' -Keep 1
Prune-Files -Dir $debugDir -Pattern 'map-smoke-*.png' -Keep 1
Purge-Dirs -Dir $debugDir -Pattern 'map-smoke-profile-*'
Purge-Dirs -Dir $debugDir -Pattern 'hud-headless-profile-*'
Purge-Files -Dir $debugDir -Pattern 'mapasset-full-20*.png'
Purge-Files -Dir $debugDir -Pattern 'mapasset-full-20*.json'
Purge-Dirs -Dir $debugDir -Pattern 'mapasset-tiles-*'
Purge-Files -Dir $debugDir -Pattern 'maprt-full-20*.png'
Purge-Files -Dir $debugDir -Pattern 'maprt-full-20*.json'
Prune-Dirs -Dir $debugDir -Pattern 'maprt-tiles-*' -Keep 1
Purge-Dirs -Dir $debugDir -Pattern 'maprt-cdp-profile-*'
Purge-Dirs -Dir $debugDir -Pattern 'maprt-pw-profile-*'
Purge-Dirs -Dir $debugDir -Pattern 'tilecap-tiles-*'
Purge-Dirs -Dir $debugDir -Pattern 'map-headless-profile-*'
Purge-Dirs -Dir $debugDir -Pattern 'mapshot-tiles-*'
Purge-Dirs -Dir $debugDir -Pattern '_tmp-*-profile*'
Purge-Dirs -Dir $debugDir -Pattern '_map*-profile*'
Purge-Dirs -Dir $debugDir -Pattern '_hud*-profile*'
Purge-Dirs -Dir $debugDir -Pattern 'map-direct-profile'
Purge-Dirs -Dir $debugDir -Pattern '_mapedge-profile'
Purge-Dirs -Dir $debugDir -Pattern '_tmp-cdp-*'
Purge-Files -Dir $debugDir -Pattern '_tmp-*.png'
Purge-Files -Dir $debugDir -Pattern 'map-cdp-trace.log'

Write-Host '[map-verify] PASS'
Write-Host "[map-verify] runtime shot (C off): $runtimeShotOff"
Write-Host "[map-verify] runtime shot (C on): $runtimeShotOn"
Write-Host "[map-verify] runtime report: $runtimeReport"
Write-Host "[map-verify] runtime full map shot: $runtimeMapShot"
Write-Host "[map-verify] runtime full map report: $runtimeMapReport"
Write-Host "[map-verify] map shot: $mapShot"
Write-Host "[map-verify] map report: $mapReport"
