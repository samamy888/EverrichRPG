# Repository Guidelines

本文件為本專案的代理人（Codex/其他 AI coding agent）工作指引。  
若子目錄有更深層 `AGENTS.md`，以更深層檔案優先。

## 專案結構

- 根目錄：`index.html`、`vite.config.ts`、`tsconfig.json`、`package.json`
- 原始碼：`src/`
  - `src/scenes/`：Phaser 場景
  - `src/ui/`：介面元件與 overlay（含 `UIOverlay.ts`）
  - `src/data/`：靜態資料/設定
- 靜態資產：`public/`
- 產物：`dist/`（可重建）

## 常用指令

- 安裝：`npm ci`
- 開發：`npm run dev`
- 建置：`npm run build`
- 預覽：`npm run preview`

## 程式風格

- TypeScript（ESM）
- 縮排 2 spaces、使用分號
- 檔名：
  - Scene/UI/Class：PascalCase
  - 變數/函式：camelCase
  - 常數：UPPER_SNAKE_CASE
- 盡量使用具名匯出

## 協作原則

- 避免不相干的大型重構
- 優先延續現有架構與命名
- 修改 UI 時，請附上變更摘要（位置、目的、使用者影響）

## 目前交接狀態（2026-05-27）

### 地圖策略

- 已明確採用「地板/牆體/互動物件/標示」分層設計
- 不再把櫃台、電梯、店面等互動物件烤進底圖

### HUD/UI 已完成

- 上方改為薄導覽條（主顯示地點）
- 底部改為 RPG 訊息窗（提示文字）
- 左下角色框目前只顯示金錢（包包已移除）
- 右上僅保留小地圖（取消右上狀態框）
- Debug 控制列預設隱藏，按 `~` 切換

### 主要修改檔案（近期）

- `src/ui/UIOverlay.ts`
- `src/main.ts`

## 下一位 Agent 建議

1. 依 `debug/` 最新截圖進行 HUD 第二輪精修
2. 讓左下角色框支援 config 化（欄位可開關）
3. 持續把場景互動物件改為 runtime props，避免回烤到底圖
