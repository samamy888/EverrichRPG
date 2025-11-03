# 中文像素字型指引（位圖字）

本遊戲支援「中文位圖字型」，用於介面中文字的清晰呈現。請將產生的字型檔放在本資料夾，開場的 BootScene 會自動載入。

放置檔案
- `public/fonts/han.fnt`
- `public/fonts/han.png`

推薦流程（Windows：AngelCode BMFont）
1. 安裝 BMFont。
2. 開啟你的中文字型（需確認授權可再散布）。
3. 參數建議：
   - 字體大小：12～14 px（配合遊戲 UI）
   - 平滑/抗鋸齒：關閉；外框：0；Padding：1～2；Spacing：0/0
   - 字集：選「從檔案讀取字元」，指向 `charset_zh-Hant.txt`
   - 輸出：類型選「Text（.fnt）」；貼圖 PNG（8-bit），不必強制 2 的次方
4. 輸出為 `han.fnt` + `han.png` 到此資料夾。
5. 重新整理頁面，若檔案存在遊戲會自動切換為像素中文字體。

替代方案（Node CLI：msdf-bmfont-xml）
- 亦可使用 CLI 產生點陣字；Phaser 建議使用傳統 `.fnt + .png` 位圖輸出。
- 已提供 PowerShell 腳本：`generate-font.ps1`（中文註解），可直接在此資料夾執行。

注意事項
- 目前 UI 的中文字集見 `charset_zh-Hant.txt`，若有新字請補上並重新產生字型。
- 數字（時間、金額）使用獨立的 5×7 位圖字以確保極致清晰；中文標籤使用 `han` 位圖字。
