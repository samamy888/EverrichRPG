# EverrichRPG

像素風逛免稅店的小品遊戲（Stardew‑like 走動 + 採買）。

## 開發與執行

需求：Node.js 18+

- 安裝依賴：`npm ci`
- 開發模式：`npm run dev`（http://localhost:5173）
- 打包發布：`npm run build`（輸出 `dist/`）
- 預覽打包：`npm run preview`

IIS 部署：將 `dist/` 上傳到站台，專案已提供 `public/web.config`（SPA 回退與常見 MIME）。

## 目前玩法（v0.1）

- 場景與移動
  - 大廳（Concourse）：WASD/方向鍵移動。靠近左右兩側的門按 `E` 進入商店。
  - 商店（化妝品/酒類）：店內走動、靠近店員按 `E` 對話 → 顯示商品清單。
- 商品與購物
  - 清單導覽：`W/S` 或 方向鍵上下 切換；`E` 選擇（購買）。
  - 結束對話：清單最後一項「結束對話」，按 `E` 返回走動。
  - 退出商店：走到左下角出口按 `E` 返回大廳。
- 全域購物籃（任何場景）
  - `ESC` 開啟/關閉購物籃面板（底部對話框樣式）。
  - `W/S` 或 方向鍵上下 選擇；`E` 移除選中的商品；下方顯示合計。
  - 左上提示會在購物籃開啟時顯示操作說明，關閉後恢復原提示。
- 縮放與顯示
  - 視窗自適應（Cover/Fit 切換、整數縮放 Snap）。右下角有縮放控制，預設整數 5x。
  - 右上角顯示所在位置與小圖示（大廳/化妝品/酒類）。

## 字型

- WebFont：`public/fonts/han.ttf`（字族名 `HanPixel`）。啟動時會主動載入。
- BitmapFont（可選）：加上 `?useBitmapFont=1` 會改用位圖字型（需提供 `han.fnt/png`）。

## 技術棧

TypeScript + Vite + Phaser 3。程式架構：`src/scenes/*`（場景）、`src/ui/*`（UI 覆蓋層）、`src/data/*`（靜態資料）。
