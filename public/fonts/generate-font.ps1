# 產生中文位圖字型（.fnt + .png）
# 需求：已安裝 Node.js（提供 npx），並可使用 msdf-bmfont-xml 或位圖輸出相容工具。
# 建議：使用 AngelCode BMFont（圖形介面）更直覺；此腳本提供指令列備選方案。

param(
  [string]$TtfPath = "C:\\Windows\\Fonts\\msyh.ttf",   # 預設路徑（請改成你的 TTF/OTF；.ttc 可能失敗）
  [int]$FontSize = 16,                                      # 字體大小（12~16 建議）
  [string]$Charset = "charset_zh-Hant.txt",                # 字集檔案路徑（相對於本資料夾）
  [string]$OutBase = "han",                                # 輸出檔名（han.fnt / han.png）
  [string]$TextureSize = "1024,1024"                       # 貼圖大小（必要時加大）
)

Write-Host "[字型] TTF: $TtfPath"
Write-Host "[字型] 字級: $FontSize"
Write-Host "[字型] 字集: $Charset"
Write-Host "[字型] 輸出: $OutBase.fnt / $OutBase.png"

$cmd = @(
  "npx", "msdf-bmfont-xml", $TtfPath,
  "-o", $OutBase,
  "-f", "png",
  "--pot", "false",
  "--texture-size", $TextureSize,
  "--font-size", "$FontSize",
  "--charset", $Charset
)

Write-Host "[準備] 嘗試使用本機安裝或 npx 產生字型…"

# 優先使用本機安裝（避免 npx 下載失敗）
$localCli = Join-Path (Resolve-Path "./").Path "node_modules/.bin/msdf-bmfont-xml"
if ($IsWindows -and -not (Test-Path $localCli) -and (Test-Path ($localCli + ".cmd"))) { $localCli = $localCli + ".cmd" }

$exe = $null
$args = @()

$charsetPath = if ([System.IO.Path]::IsPathRooted($Charset)) { $Charset } else { Join-Path $PSScriptRoot $Charset }

if (Test-Path $localCli) { $exe = $localCli } else { $exe = 'npx'; $args += 'msdf-bmfont-xml' }

# 檢查支援的參數（不同版本可能使用 --charset / --chars / --chars-file）
$help = & $exe @($args + '--help') 2>&1 | Out-String
$charsetArg = $null
if ($help -match '--charset') { $charsetArg = '--charset' }
elseif ($help -match '--chars-file') { $charsetArg = '--chars-file' }
elseif ($help -match '--chars') { $charsetArg = '--chars' }

# 基本參數
$base = @($TtfPath, '-o', $OutBase, '-f', 'png', '--pot', 'false', '--texture-size', $TextureSize, '--font-size', "$FontSize")

if ($exe -eq 'npx') { $base = @('msdf-bmfont-xml') + $base }

if ($charsetArg -eq '--chars') {
  # 將字集檔內容當成字串參數傳入
  $charsContent = Get-Content $charsetPath -Raw
  $args = $base + @($charsetArg, $charsContent)
} elseif ($charsetArg) {
  # 直接傳遞檔案路徑
  $args = $base + @($charsetArg, $charsetPath)
} else {
  Write-Host "[警告] 此版本工具不支援 charset 參數，將輸出完整字型集（體積較大）。"
  $args = $base
}

Write-Host "[執行] $exe $($args -join ' ')"
$procOut = & $exe @args 2>&1
$procOut | Write-Host

if (Test-Path "$OutBase.fnt" -and Test-Path "$OutBase.png") {
  Write-Host "[完成] 已輸出 $OutBase.fnt 與 $OutBase.png"
} else {
  Write-Host "[提醒] 產生失敗。可能原因："
  Write-Host "  1) 字型路徑不正確或為 .ttc（請改 TTF/OTF）"
  Write-Host "  2) 無法下載 npx 套件（可先 npm i -D msdf-bmfont-xml 後重試）"
  Write-Host "  3) PowerShell 執行原則限制（可用：powershell -ExecutionPolicy Bypass -File generate-font.ps1）"
}
