param(
  [string]$Url = "http://127.0.0.1:5173/?hudtest=1",
  [string]$Tag = "hud-check",
  [int]$WaitSeconds = 5
)

$ErrorActionPreference = "Stop"
Write-Warning "[hud] capture-hud.ps1 is a legacy screenshot helper. Prefer npm run hud:test for in-app browser verification."

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot "debug"
New-Item -ItemType Directory -Force -Path $debugDir | Out-Null

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Start-Process -FilePath "msedge" -ArgumentList @("--new-window", "--start-maximized", $Url) | Out-Null
Start-Sleep -Seconds $WaitSeconds

$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $debugDir ("{0}-{1}.png" -f $Tag, $stamp)
$bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)

$gfx.Dispose()
$bmp.Dispose()

$allScreens = [System.Windows.Forms.Screen]::AllScreens
Write-Host ("[hud] virtual-screen={0},{1},{2}x{3}" -f $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height)

for ($i = 0; $i -lt $allScreens.Length; $i++) {
  $screen = $allScreens[$i]
  $sb = $screen.Bounds
  Write-Host ("[hud] display{0} device={1} primary={2} bounds={3},{4},{5}x{6}" -f ($i + 1), $screen.DeviceName, $screen.Primary, $sb.X, $sb.Y, $sb.Width, $sb.Height)

  $screenBmp = New-Object System.Drawing.Bitmap $sb.Width, $sb.Height
  $screenGfx = [System.Drawing.Graphics]::FromImage($screenBmp)
  $screenGfx.CopyFromScreen($sb.Location, [System.Drawing.Point]::Empty, $sb.Size)
  $screenFile = Join-Path $debugDir ("{0}-{1}-display{2}.png" -f $Tag, $stamp, ($i + 1))
  $screenBmp.Save($screenFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $screenGfx.Dispose()
  $screenBmp.Dispose()
}

Write-Output $file



