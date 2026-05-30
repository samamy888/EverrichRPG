param(
  [string]$Url = "http://127.0.0.1:5173/?hudtest=1",
  [string]$Tag = "hud-auto",
  [int]$WaitSeconds = 2,
  [int]$KeepCount = 1,
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

function Prune-HudRuns {
  param(
    [string]$Dir,
    [string]$TagName,
    [int]$Keep
  )

  if ($Keep -lt 1) { return }

  $jsons = Get-ChildItem -Path $Dir -Filter "$TagName-*.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  $stale = $jsons | Select-Object -Skip $Keep
  foreach ($f in $stale) {
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $png = Join-Path $Dir ($stem + ".png")
    $pngC1 = Join-Path $Dir ($stem + "-c1.png")
    $json = Join-Path $Dir ($stem + ".json")
    if (Test-Path $png) { Remove-Item -LiteralPath $png -Force }
    if (Test-Path $pngC1) { Remove-Item -LiteralPath $pngC1 -Force }
    if (Test-Path $json) { Remove-Item -LiteralPath $json -Force }
  }

  $profiles = Get-ChildItem -Path $Dir -Directory -Filter "hud-headless-profile-*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  $oldProfiles = $profiles | Select-Object -Skip $Keep
  foreach ($d in $oldProfiles) {
    if (Test-Path $d.FullName) { Remove-Item -LiteralPath $d.FullName -Recurse -Force }
  }
}

function Invoke-HudCapture {
  param(
    [string]$BrowserExe,
    [string]$OutShot,
    [string]$OutShotC1,
    [string]$TargetUrl
  )

  if (Test-Path $OutShot) { Remove-Item -LiteralPath $OutShot -Force }
  if (Test-Path $OutShotC1) { Remove-Item -LiteralPath $OutShotC1 -Force }

  $attemptDefs = @(
    @{ settle = '180' },
    @{ settle = '280' },
    @{ settle = '420' }
  )

  $lastExit = -9999
  for ($i = 0; $i -lt $attemptDefs.Count; $i++) {
    $a = $attemptDefs[$i]
    Write-Host ("[hud] capture try {0}/{1} settleMs={2}" -f ($i + 1), $attemptDefs.Count, $a.settle)
    node "$PSScriptRoot\capture-hud-pw.cjs" `
      --browser "$BrowserExe" `
      --url "$TargetUrl" `
      --outOff "$OutShot" `
      --outOn "$OutShotC1" `
      --settleMs "$($a.settle)"
    $lastExit = $LASTEXITCODE
    if (-not (Test-Path $OutShot) -or -not (Test-Path $OutShotC1)) {
      for ($j = 0; $j -lt 4; $j++) {
        Start-Sleep -Seconds 1
        if ((Test-Path $OutShot) -and (Test-Path $OutShotC1)) { break }
      }
    }
    if ($lastExit -eq 0 -and (Test-Path $OutShot) -and (Test-Path $OutShotC1)) {
      return @{ ok = $true; exitCode = $lastExit }
    }
    Write-Host "[hud] try failed exit=$lastExit off=$(Test-Path $OutShot) on=$(Test-Path $OutShotC1)"
  }

  return @{ ok = $false; exitCode = $lastExit }
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
$shotC1 = Join-Path $debugDir ("{0}-{1}-c1.png" -f $Tag, $stamp)
$report = Join-Path $debugDir ("{0}-{1}.json" -f $Tag, $stamp)
$lines = @(
  "timestamp=$timestamp",
  "url=$Url",
  "mode=in-app-browser-auto",
  "screenshotOff=$shot",
  "screenshotOn=$shotC1",
  "report=$report",
  "checklist=1.top-nav 2.bottom-hud 3.money-panel 4.minimap 5.collision-debug-toggle"
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
$capture = Invoke-HudCapture -BrowserExe $browserExe -OutShot $shot -OutShotC1 $shotC1 -TargetUrl $Url
if (-not $capture.ok) {
  Write-Host "[hud] capture exit code: $($capture.exitCode)"
  Write-Host "[hud] capture files exist (off/on): $(Test-Path $shot)/$(Test-Path $shotC1)"
  throw "Headless capture failed."
}

Write-Host "[hud] verify start"
node "$PSScriptRoot\verify-hud.cjs" --inputCOff "$shot" --inputCOn "$shotC1" --report "$report"
if ($LASTEXITCODE -ne 0) {
  Write-Host "[hud] FAIL (see report): $report"
  throw "HUD verification failed."
}

Prune-HudRuns -Dir $debugDir -TagName $Tag -Keep $KeepCount

Write-Host "[hud] PASS"
Write-Host "[hud] screenshot (C off): $shot"
Write-Host "[hud] screenshot (C on): $shotC1"
Write-Host "[hud] report: $report"
Write-Host "[hud] in-app url: $Url"
