# 產生中文位圖字型（.fnt + .png）
# 需求：已安裝 Node.js（提供 npx），並可使用 msdf-bmfont-xml 或位圖輸出相容工具。
# 建議：使用 AngelCode BMFont（圖形介面）更直覺；此腳本提供指令列備選方案。

param(
  [string]$TtfPath = "C:\\Windows\\Fonts\\msjh.ttc",   # 預設使用系統字（示例），建議改為你的像素/授權字型
  [int]$FontSize = 16,                                     # 字體大小（實際依字型而異，12~16 建議）
  [string]$Charset = "charset_zh-Hant.txt",               # 字集檔案路徑
  [string]$OutBase = "han",                               # 輸出檔名（han.fnt / han.png）
  [string]$TextureSize = "1024,1024"                      # 貼圖大小（必要時可調大）
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

Write-Host "[執行] $($cmd -join ' ')"
& $cmd 2>&1 | Tee-Object -Variable output | Write-Host

if (Test-Path "$OutBase.fnt" -and Test-Path "$OutBase.png") {
  Write-Host "[完成] 已輸出 $OutBase.fnt 與 $OutBase.png"
} else {
  Write-Host "[提醒] 產生失敗。請確認已安裝 Node.js，且可連線下載 npx 套件，或改用 BMFont（圖形介面）。"
}

