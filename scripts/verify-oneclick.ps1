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
  Write-Host "[verify-oneclick] step: $Label"
  & $Action
}

function Assert-JsonPassed {
  param(
    [string]$Path,
    [string]$Label
  )
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label report not found: $Path"
  }
  $raw = Get-Content -LiteralPath $Path -Raw
  $obj = $raw | ConvertFrom-Json
  if ($obj.passed -ne $true) {
    throw "$Label report failed: $Path"
  }
}

function Assert-HudDualReport {
  param(
    [string]$Dir
  )
  $hudReport = Get-ChildItem -Path $Dir -Filter 'hud-auto-*.json' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $hudReport) {
    throw "HUD report not found in $Dir"
  }
  $obj = (Get-Content -LiteralPath $hudReport.FullName -Raw) | ConvertFrom-Json
  if ($obj.passed -ne $true) {
    throw "HUD report failed: $($hudReport.FullName)"
  }
  if ($obj.mode -ne 'auto-visual-dual') {
    throw "HUD report mode is not dual: $($obj.mode)"
  }
  if ($null -eq $obj.dualInputs -or [string]::IsNullOrWhiteSpace($obj.dualInputs.off) -or [string]::IsNullOrWhiteSpace($obj.dualInputs.on)) {
    throw "HUD dual inputs missing in report: $($hudReport.FullName)"
  }
  Assert-FileExists -Path $obj.dualInputs.off -Label 'HUD C-off screenshot'
  Assert-FileExists -Path $obj.dualInputs.on -Label 'HUD C-on screenshot'

  $mustPass = @('debugToggleDiff', 'debugCollisionTeal', 'debugCollisionOrange')
  foreach ($k in $mustPass) {
    $match = $obj.checks | Where-Object { $_.key -eq $k } | Select-Object -First 1
    if ($null -eq $match) { throw "HUD check missing: $k" }
    if ($match.pass -ne $true) { throw "HUD check failed: $k" }
  }
}

function Assert-FileExists {
  param(
    [string]$Path,
    [string]$Label
  )
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label missing: $Path"
  }
}

function Assert-MaxDirCount {
  param(
    [string]$Dir,
    [string]$Pattern,
    [int]$MaxCount,
    [string]$Label
  )
  $items = Get-ChildItem -Path $Dir -Directory -Filter $Pattern -ErrorAction SilentlyContinue
  $count = @($items).Count
  if ($count -gt $MaxCount) {
    throw "$Label has too many artifacts ($count > $MaxCount) pattern=$Pattern"
  }
}

Set-Location $projectRoot
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

Run-Step -Label 'runtime full map tiled verify' -Action {
  npm run map:verify:browser:quick
  if ($LASTEXITCODE -ne 0) { throw 'map:verify:browser:quick failed.' }
}

Run-Step -Label 'integration verify' -Action {
  npm run map:verify:quick
  if ($LASTEXITCODE -ne 0) { throw 'map:verify:quick failed.' }
}

if (-not $SkipBuild) {
  Run-Step -Label 'build' -Action {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'build failed.' }
  }
}

Run-Step -Label 'assert latest reports' -Action {
  Assert-FileExists -Path (Join-Path $debugDir 'maprt-full-latest.png') -Label 'runtime map image'
  Assert-FileExists -Path (Join-Path $debugDir 'mapasset-full-latest.png') -Label 'asset map image'
  Assert-JsonPassed -Path (Join-Path $debugDir 'maprt-full-latest.json') -Label 'runtime map'
  Assert-JsonPassed -Path (Join-Path $debugDir 'mapasset-full-latest.json') -Label 'asset map'
  Assert-HudDualReport -Dir $debugDir
}

Run-Step -Label 'assert debug hygiene' -Action {
  Assert-MaxDirCount -Dir $debugDir -Pattern 'maprt-tiles-*' -MaxCount 1 -Label 'runtime tile folders'
  Assert-MaxDirCount -Dir $debugDir -Pattern 'mapasset-tiles-*' -MaxCount 1 -Label 'asset tile folders'
  Assert-MaxDirCount -Dir $debugDir -Pattern 'maprt-pw-profile-*' -MaxCount 0 -Label 'playwright profile folders'
  Assert-MaxDirCount -Dir $debugDir -Pattern 'maprt-cdp-profile-*' -MaxCount 0 -Label 'cdp profile folders'
  Assert-MaxDirCount -Dir $debugDir -Pattern '_tmp-cdp-*' -MaxCount 0 -Label 'tmp cdp folders'
}

Write-Host '[verify-oneclick] PASS'
Write-Host "[verify-oneclick] runtime map: $(Join-Path $debugDir 'maprt-full-latest.png')"
Write-Host "[verify-oneclick] runtime report: $(Join-Path $debugDir 'maprt-full-latest.json')"
Write-Host "[verify-oneclick] asset map: $(Join-Path $debugDir 'mapasset-full-latest.png')"
Write-Host "[verify-oneclick] asset report: $(Join-Path $debugDir 'mapasset-full-latest.json')"
