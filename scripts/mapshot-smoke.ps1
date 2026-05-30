param(
  [string]$BaseUrl = "http://127.0.0.1:5173/",
  [int]$Width = 1536,
  [int]$Height = 864
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot "debug"
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

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

function Build-TestUrl {
  param([string]$UrlBase, [string]$Mode)
  $base = $UrlBase.Trim().TrimEnd('#')
  $join = if ($base.Contains('?')) { '&' } else { '?' }
  if ($Mode -eq 'mapshot') {
    return "$base$join`hudtest=1&mapshot=1&autostart=1&cleanhud=1&msx=0&msy=0"
  }
  return "$base$join`hudtest=1"
}

function Capture-One {
  param([string]$BrowserExe, [string]$Url, [string]$OutPath, [string]$ProfileDir, [int]$W, [int]$H)
  if (Test-Path $OutPath) { Remove-Item -LiteralPath $OutPath -Force }
  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

  $baseArgs = @(
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    "--window-size=$W,$H",
    '--virtual-time-budget=12000',
    "--user-data-dir=$ProfileDir",
    "--screenshot=$OutPath",
    $Url
  )
  $variants = @(
    @('--headless=new') + $baseArgs,
    @('--headless') + $baseArgs
  )

  foreach ($args in $variants) {
    $p = Start-Process -FilePath $BrowserExe -ArgumentList $args -PassThru -Wait
    $exists = Test-Path $OutPath
    if (-not $exists) {
      for ($i = 0; $i -lt 5; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $OutPath) {
          $exists = $true
          break
        }
      }
    }
    if ($p.ExitCode -eq 0 -and $exists) {
      return @{ exitCode = $p.ExitCode; exists = $exists }
    }
  }
  return @{ exitCode = $p.ExitCode; exists = (Test-Path $OutPath) }
}

$browser = Resolve-BrowserPath
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outHud = Join-Path $debugDir ("map-smoke-hud-" + $stamp + ".png")
$outMap = Join-Path $debugDir ("map-smoke-mapshot-" + $stamp + ".png")
$profileHud = Join-Path $debugDir ("map-smoke-profile-hud-" + $stamp)
$profileMap = Join-Path $debugDir ("map-smoke-profile-map-" + $stamp)

$hudUrl = Build-TestUrl -UrlBase $BaseUrl -Mode 'hud'
$mapUrl = Build-TestUrl -UrlBase $BaseUrl -Mode 'mapshot'

Write-Host "[smoke] browser: $browser"
Write-Host "[smoke] hud url: $hudUrl"
$hud = Capture-One -BrowserExe $browser -Url $hudUrl -OutPath $outHud -ProfileDir $profileHud -W $Width -H $Height
Write-Host "[smoke] hud exit=$($hud.exitCode) file=$($hud.exists)"

Write-Host "[smoke] mapshot url: $mapUrl"
$map = Capture-One -BrowserExe $browser -Url $mapUrl -OutPath $outMap -ProfileDir $profileMap -W $Width -H $Height
Write-Host "[smoke] mapshot exit=$($map.exitCode) file=$($map.exists)"

if (-not $hud.exists) { throw "HUD smoke capture failed." }
if (-not $map.exists) { throw "Mapshot smoke capture failed." }

Write-Host "[smoke] PASS"
Write-Host "[smoke] hud shot: $outHud"
Write-Host "[smoke] mapshot shot: $outMap"
