# EverrichRPG

EverrichRPG 是以 Phaser 3 + TypeScript 製作的 2D RPG 專案，場景以機場動線與商業空間互動為核心。

## 開發與執行

```powershell
npm ci
npm run dev
```

- 前端預設：`http://localhost:5173`
- 建置：

```powershell
npm run build
npm run preview
```

## 專案結構

- `src/scenes/`：Phaser 場景
- `src/ui/`：HUD / Overlay / 互動 UI
- `src/data/`：靜態資料
- `public/`：圖片、字型、地圖資產
- `server/`：後端（ASP.NET Core）

## 目前進度（2026-05-27）

### 地圖分層方向（已確立）

- 改為乾淨分層，不再把可互動物件烤進底圖。
- 目標分層：
  1. 地板層（區域色塊、可走/不可走大形狀）
  2. 建築/牆體層（牆、柱、玻璃邊界、短牆）
  3. 互動物件層（櫃台、電梯、安檢機、ATM、店面等 runtime props）
  4. 標籤/UI 層（Gate、品牌、服務名稱）

### HUD/UI（第一版完成）

- 上方：薄導覽條（地點資訊）
- 底部：RPG 訊息窗（互動提示）
- 左下：角色狀態框只顯示金錢（`$` + 數值）
- 右上：保留小地圖，移除右上額外狀態框
- Debug 控制列：預設隱藏，按 `~`（Backquote）切換顯示

### 本次已落地的具體調整

- 移除「左下包包數量」顯示，僅保留金錢資訊
- 左下金錢框改為較舒適的 RPG 面板比例後，再收斂為單列版本
- 底部懸浮 debug 列改為不常駐，避免破壞遊戲沉浸感

## 下一步建議

1. 依最新 debug 截圖做第二輪 UI 精修（字級、內距、透明度、描邊）
2. 若要擴充左下框，建議用 config 控制可選欄位（角色名/HP/任務狀態）
3. 持續把地圖物件拆為 runtime props，維持高可維護性
