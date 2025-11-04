# Repository Guidelines

## 專案結構與模組組織
- 根目錄：`index.html`、`vite.config.ts`、`tsconfig.json`、`package.json`。
- 原始碼：`src/`
  - `src/scenes/`：Phaser 場景（如 `TerminalScene.ts`、`StoreScene.ts`）。
  - `src/ui/`：UI 元件（如 `UIOverlay.ts`）。
  - `src/data/`：靜態資料/組態（如 `items.ts`）。
- 輸出目錄：`dist/`（已在 `.gitignore`）。靜態資產請放 `public/`。

## 建置、測試與開發指令
- 建議使用 Node.js LTS；首次安裝：`npm ci`。
- 開發伺服器（HMR）：`npm run dev`（預設 localhost）。
- 產生正式版：`npm run build`（輸出至 `dist/`）。
- 本機預覽正式版：`npm run preview`。
- 測試：目前未配置。若新增測試，建議以 Vitest 並提供 `npm run test` 指令。

## 程式風格與命名規範
- 語言：TypeScript（ES modules）。縮排 2 空格，包含分號；匯入保持排序。
- 命名：`PascalCase`（類別與場景/UI 檔案）、`camelCase`（函式/變數）、`UPPER_SNAKE_CASE`（常數）；資料/組態檔使用小寫（例：`items.ts`）。
- 匯出：偏好具名匯出以提昇可讀性與維護性。

## 測試指南
- 尚未導入測試框架；若加入，建議：
  - 單元測試使用 Vitest，檔名為 `*.spec.ts`，可置於來源旁或 `tests/`。
  - 優先測純函式與工具；場景邏輯保持輕量。
  - UI/E2E 可考慮 Playwright 於互動成熟後再導入。

## Commit 與 Pull Request 規範
- Commit 採 Conventional Commits：如 `feat: 新增商店場景`、`fix: 修正縮放重置問題`、`chore: 更新相依套件`。
- PR 請提供：變更摘要、關聯議題、UI 變更的截圖/GIF。維持聚焦與小範圍；新增指令或功能時同步更新 `README.md`。

## 安全與設定建議
- 不要提交機密；以 Vite 環境變數（`VITE_*`）並於 `.env.local` 設定，避免提交至版本控制。
- 大型二進位資產請優化體積；必要時將重資產託管於倉庫外部。

## 實務小訣竅
- 新增資產放在 `public/`，建置輸出於 `dist/`。
- 場景邏輯盡量薄化，將重複邏輯抽至 `src/ui/`、`src/data/` 或共用工具，利於測試與重用。

