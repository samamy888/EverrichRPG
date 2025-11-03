# EverrichRPG

專案規劃與開發進度請見 `TODO.md`。

## 本地開發（原型）

需求：Node.js 18+ 建議。

1. 安裝依賴
   - `npm install`
2. 啟動開發伺服器
   - `npm run dev`
3. 瀏覽器會自動開啟 `http://localhost:5173/`

操作說明（M0 原型）
- 航站樓（TerminalScene）：方向鍵/WASD 移動，靠近門口按 `E` 進店。
- 商店（StoreScene）：上下選擇商品，`Space/Enter` 加入購物籃，`Esc` 返回走道。
- UI 顯示：左上角登機倒數、錢包與購物籃金額。

技術棧：TypeScript + Vite + Phaser 3（像素渲染）。
