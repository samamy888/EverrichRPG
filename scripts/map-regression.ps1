param(
  [string]$UrlBase = "http://127.0.0.1:5173/",
  [string]$Tag = "tilecap",
  [int]$MapWidth = 6000,
  [int]$MapHeight = 3472,
  [int]$TileWidth = 1536,
  [int]$TileHeight = 864,
  [int]$WaitSeconds = 2,
  [switch]$SkipBuild,
  [switch]$NoAutoStartDev
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot "debug"

function Test-UrlReady {
  param([string]$TargetUrl)
  try {
    $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 4
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
  } catch {
    return $false
  }
}

function Ensure-DevServer {
  param(
    [string]$HealthUrl,
    [int]$WaitSecondsAfterStart,
    [switch]$DisableAutoStart
  )

  if (Test-UrlReady -TargetUrl $HealthUrl) {
    Write-Host "[map] dev server ready"
    return
  }

  if ($DisableAutoStart) {
    throw "Dev server is not reachable at $HealthUrl"
  }

  Write-Host "[map] dev server not found, starting Vite on 127.0.0.1:5173"
  Start-Process -FilePath "node" -ArgumentList @(
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
    "--open=false"
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null

  for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    if (Test-UrlReady -TargetUrl $HealthUrl) {
      Start-Sleep -Seconds $WaitSecondsAfterStart
      Write-Host "[map] dev server started"
      return
    }
  }

  throw "Vite did not become ready at $HealthUrl"
}

function Resolve-BrowserPath {
  $candidates = @(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  throw "No supported browser executable was found (Chrome/Edge)."
}

function Build-TileCaptureUrl {
  param(
    [string]$BaseUrl,
    [int]$ScrollX,
    [int]$ScrollY
  )

  $cleanBase = $BaseUrl
  if ([string]::IsNullOrWhiteSpace($cleanBase)) { $cleanBase = "http://127.0.0.1:5173/" }
  $cleanBase = $cleanBase.Trim()
  $cleanBase = $cleanBase.TrimEnd('#')
  $join = if ($cleanBase.Contains('?')) { '&' } else { '?' }
  return ($cleanBase + $join + "autostart=1&cleanhud=1&skipui=1&tilecap=1&tcx=$ScrollX&tcy=$ScrollY")
}

function Invoke-MapshotCapture {
  param(
    [string]$BrowserExe,
    [string]$ShotPath,
    [string]$ProfileDir,
    [string]$Url,
    [int]$Width,
    [int]$Height
  )

  if (Test-Path $ShotPath) { Remove-Item -LiteralPath $ShotPath -Force }
  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

  $baseArgs = @(
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    "--window-size=$Width,$Height",
    '--virtual-time-budget=12000',
    "--user-data-dir=$ProfileDir",
    "--screenshot=$ShotPath",
    $Url
  )

  $attempts = @(
    @('--headless=new') + $baseArgs,
    @('--headless') + $baseArgs
  )

  foreach ($args in $attempts) {
    $proc = Start-Process -FilePath $BrowserExe -ArgumentList $args -PassThru -Wait
    if (-not (Test-Path $ShotPath)) {
      for ($i = 0; $i -lt 5; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $ShotPath) { break }
      }
    }
    if ($proc.ExitCode -eq 0 -and (Test-Path $ShotPath)) {
      return @{ ok = $true; exitCode = $proc.ExitCode }
    }
  }

  return @{ ok = $false; exitCode = $proc.ExitCode }
}

function Get-CoverPositions {
  param([int]$Total, [int]$Tile)
  if ($Tile -le 0) { throw "Tile size must be > 0" }
  if ($Total -le $Tile) { return @(0) }

  $maxStart = [Math]::Max(0, $Total - $Tile)
  $vals = New-Object System.Collections.Generic.List[int]
  $cur = 0
  $vals.Add(0)

  while ($cur -lt $maxStart) {
    $next = $cur + $Tile
    if ($next -gt $maxStart) { $next = $maxStart }
    if ($vals[$vals.Count - 1] -eq $next) { break }
    $vals.Add([int]$next)
    $cur = $next
  }

  return $vals.ToArray()
}

Set-Location $projectRoot
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

if (-not $SkipBuild) {
  Write-Host "[map] build start"
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Stop map verification run."
  }
  Write-Host "[map] build ok"
}

Ensure-DevServer -HealthUrl "http://127.0.0.1:5173/" -WaitSecondsAfterStart $WaitSeconds -DisableAutoStart:$NoAutoStartDev

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tileDir = Join-Path $debugDir ("{0}-tiles-{1}" -f $Tag, $stamp)
$outPng = Join-Path $debugDir ("{0}-full-{1}.png" -f $Tag, $stamp)
$outJson = Join-Path $debugDir ("{0}-full-{1}.json" -f $Tag, $stamp)

New-Item -ItemType Directory -Force -Path $tileDir | Out-Null

$xs = Get-CoverPositions -Total $MapWidth -Tile $TileWidth
$ys = Get-CoverPositions -Total $MapHeight -Tile $TileHeight
$totalShots = $xs.Length * $ys.Length

$browserExe = Resolve-BrowserPath
Write-Host "[map] browser: $browserExe"
Write-Host "[map] tiles: $($xs.Length)x$($ys.Length) = $totalShots"

$idx = 0
foreach ($y in $ys) {
  foreach ($x in $xs) {
    $idx++
    $shot = Join-Path $tileDir ("map-tile-x{0}-y{1}.png" -f $x, $y)
    $profile = Join-Path $tileDir ("profile-x{0}-y{1}" -f $x, $y)
    $url = Build-TileCaptureUrl -BaseUrl $UrlBase -ScrollX $x -ScrollY $y
    Write-Host ("[map] capture {0}/{1} x={2} y={3}" -f $idx, $totalShots, $x, $y)

    $capture = Invoke-MapshotCapture -BrowserExe $browserExe -ShotPath $shot -ProfileDir $profile -Url $url -Width $TileWidth -Height $TileHeight
    if (-not $capture.ok) {
      Write-Host "[map] capture exit code: $($capture.exitCode)"
      Write-Host "[map] capture file exists: $(Test-Path $shot)"
      Write-Host "[map] capture url: $url"
      throw "Map tile capture failed at x=$x y=$y"
    }
  }
}

Write-Host "[map] stitch+verify start"
node "$PSScriptRoot\stitch-mapshot.cjs" --inputDir "$tileDir" --out "$outPng" --report "$outJson" --mapWidth "$MapWidth" --mapHeight "$MapHeight"
if ($LASTEXITCODE -ne 0) {
  throw "Map stitch/verify failed."
}

Write-Host "[map] PASS"
Write-Host "[map] output: $outPng"
Write-Host "[map] report: $outJson"
Write-Host "[map] tiles: $tileDir"
