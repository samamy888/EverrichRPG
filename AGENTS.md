# Repository Guidelines

## 專案結構與模組組織
- 根目錄：`index.html`、`vite.config.ts`、`tsconfig.json`、`package.json`。
- 原始碼：`src/`
  - `src/scenes/`：Phaser 場景（如 `TerminalScene.ts`、`StoreScene.ts`）。
  - `src/ui/`：UI 元件（如 `UIOverlay.ts`）。
  - `src/data/`：靜態資料與設定（如 `items.ts`）。
- 靜態資產：`public/`（新資產請放此處）。
- 產出目錄：`dist/`（已加入 `.gitignore`）。

## 建置、測試與開發命令
- `npm ci`：依 lockfile 安裝依賴（建議首次 clone 後使用）。
- `npm run dev`：啟動 Vite 本機開發伺服器（含 HMR）。
- `npm run build`：進行生產環境建置到 `dist/`。
- `npm run preview`：以本機伺服器預覽 `dist/`。

## 程式風格與命名慣例
- 語言：TypeScript（ES modules）。縮排 2 空格；使用分號；`import` 請排序。
- 檔名與命名：
  - 類別、Scene/UI 檔：`PascalCase`（例：`TerminalScene.ts`）。
  - 變數/函式：`camelCase`；常數：`UPPER_SNAKE_CASE`。
  - 資料/設定檔：小寫（例：`items.ts`）。
- 匯出：優先使用具名匯出以提升可讀性與重構友善度。

## 測試指南
- 專案尚未配置測試框架；若新增，建議使用 Vitest。
- 測試檔放置 `tests/` 或與原檔同層命名為 `*.spec.ts`。
- 優先測試純函式與工具，Scene 內保持薄邏輯；測試需快速且可重現。

## Commit 與 Pull Request
- Commit：請使用 Conventional Commits（如：`feat:`、`fix:`、`refactor:`、`chore:`、`docs:`），訊息簡潔且聚焦。
- PR：提供摘要、關聯 Issue、必要截圖/GIF（UI 變更），並更新相關文件（如 `README.md`）。

## 安全與設定
- 請勿提交機密。環境變數使用 Vite 規則（`VITE_*`），放於 `.env.local`，避免納入版控。
- 大型二進位資產請先優化；過重資產建議外部託管。

## 代理與協作提示
- 本檔適用於整個倉庫；若子資料夾另有 `AGENTS.md`，以較深層者優先。
- 修改結構或指令時，務必同步更新文件與範例，以降低進入成本。
