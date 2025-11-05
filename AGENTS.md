# Repository Guidelines

本文件為此專案的貢獻者指南，請在提交程式碼或文件前先閱讀。內容精簡直接，涵蓋專案結構、開發流程、風格規範與常見作業指引。

## 專案結構與模組
- 根目錄：`index.html`、`vite.config.ts`、`tsconfig.json`、`package.json`
- 原始碼：`src/`
  - `src/scenes/` — Phaser 場景（如 `TerminalScene.ts`、`StoreScene.ts`）
  - `src/ui/` — 介面元件（如 `UIOverlay.ts`）
  - `src/data/` — 靜態資料/設定（如 `items.ts`）
- 靜態資產：`public/`（字型、圖片、web.config 等）
- 產出目錄：`dist/`（已忽略）

## 建置、開發與預覽
- `npm ci`：依 lockfile 安裝依賴（建議 Node.js LTS）
- `npm run dev`：啟動 Vite 開發伺服器（含 HMR）
- `npm run build`：生產建置至 `dist/`
- `npm run preview`：本機預覽 `dist/` 內容

## 程式風格與命名
- 語言：TypeScript（ES modules）；縮排 2 空白；必加分號；匯入請維持排序
- 命名：Class/Scene/UI 檔案用 PascalCase；變數/函式用 camelCase；常數用 UPPER_SNAKE_CASE；資料/設定檔以小寫（如 `items.ts`）
- 匯出：偏好具名匯出
- 格式/靜態檢查：未強制，但若新增請用 Prettier + ESLint（TS）

## 測試指引
- 目前未內建測試框架；若新增，建議使用 Vitest
- 測試檔路徑：與原始碼同層以 `*.spec.ts` 或放在 `tests/`
- 原則：快速、可重現；盡量測純函式與工具；互動場景可考慮 Playwright 做 E2E

## Commit 與 PR
- Commit：清楚、聚焦，建議使用 Conventional Commits（如 `feat:`、`fix:`、`refactor:`、`chore:`、`docs:`）
- PR：說明變更重點、連結議題、提供畫面截圖/GIF（UI 變更時），保持小而專注；新增指令或功能請同步更新 `README.md`

## 安全與設定
- 勿提交機密；使用 Vite 環境變數（`VITE_*`），放於 `.env.local` 並避免納入版控
- 大型資產請最佳化；必要時改以外部託管

## Agent/自動化說明
- 本 `AGENTS.md` 對整個倉庫生效；若子目錄另有 `AGENTS.md`，則以較深層為準
- 修改程式碼時，避免不相干調整，保持與現有風格一致；必要時更新相關文件

