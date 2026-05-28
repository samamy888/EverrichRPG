param(
  [string]$Url = "http://127.0.0.1:5173/?hudtest=1",
  [string]$Tag = "hud-auto",
  [int]$WaitSeconds = 2,
  [switch]$SkipBuild,
  [switch]$NoAutoStartDev,
  [switch]$ManualOnly
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot "debug"
$verifyLog = Join-Path $debugDir "hud-inapp-last.txt"

function Test-UrlReady {
  param([string]$TargetUrl)

  try {
    $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 4
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
  }
  catch {
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
    Write-Host "[hud] dev server ready"
    return
  }

  if ($DisableAutoStart) {
    throw "Dev server is not reachable at $HealthUrl"
  }

  Write-Host "[hud] dev server not found, starting Vite on 127.0.0.1:5173"
  Start-Process -FilePath "node" -ArgumentList @(
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
    "--open=false"
  ) -WorkingDirectory $projectRoot -WindowStyle Hidden | Out-Null

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-UrlReady -TargetUrl $HealthUrl) {
      Start-Sleep -Seconds $WaitSecondsAfterStart
      Write-Host "[hud] dev server started"
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

Set-Location $projectRoot
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

if (-not $SkipBuild) {
  Write-Host "[hud] build start"
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed. Stop verification run."
  }
  Write-Host "[hud] build ok"
}

Ensure-DevServer -HealthUrl "http://127.0.0.1:5173/?hudtest=1" -WaitSecondsAfterStart $WaitSeconds -DisableAutoStart:$NoAutoStartDev

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$shot = Join-Path $debugDir ("{0}-{1}.png" -f $Tag, $stamp)
$report = Join-Path $debugDir ("{0}-{1}.json" -f $Tag, $stamp)
$lines = @(
  "timestamp=$timestamp",
  "url=$Url",
  "mode=in-app-browser-auto",
  "screenshot=$shot",
  "report=$report",
  "checklist=1.top-nav 2.bottom-hud 3.money-panel 4.minimap"
)
$lines | Set-Content -Path $verifyLog -Encoding UTF8

if ($ManualOnly) {
  Write-Host "[hud] manual mode ready"
  Write-Host "[hud] open this URL in Codex In-app browser:"
  Write-Output $Url
  Write-Host "[hud] verification log: $verifyLog"
  exit 0
}

Write-Host "[hud] capture start"
$browserExe = Resolve-BrowserPath
Write-Host "[hud] browser: $browserExe"
$browserProfile = Join-Path $debugDir ("hud-headless-profile-" + $stamp)
New-Item -ItemType Directory -Force -Path $browserProfile | Out-Null
$proc = Start-Process -FilePath $browserExe -ArgumentList @(
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1536,864',
  '--virtual-time-budget=12000',
  "--user-data-dir=$browserProfile",
  "--screenshot=$shot",
  $Url
) -PassThru -Wait
if (-not (Test-Path $shot)) {
  for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $shot) { break }
  }
}
if ($proc.ExitCode -ne 0 -or -not (Test-Path $shot)) {
  Write-Host "[hud] capture exit code: $($proc.ExitCode)"
  Write-Host "[hud] capture file exists: $(Test-Path $shot)"
  throw "Headless capture failed."
}

Write-Host "[hud] verify start"
node "$PSScriptRoot\verify-hud.cjs" --input "$shot" --report "$report"
if ($LASTEXITCODE -ne 0) {
  Write-Host "[hud] FAIL (see report): $report"
  throw "HUD verification failed."
}

Write-Host "[hud] PASS"
Write-Host "[hud] screenshot: $shot"
Write-Host "[hud] report: $report"
Write-Host "[hud] in-app url: $Url"



