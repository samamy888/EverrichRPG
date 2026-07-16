# 文件總覽

本資料夾只保存跨功能、需要長期維護的規範。功能細節應放在程式碼、測試或對應 feature 目錄，不為單一畫面、單一 API 或暫時決策新增文件。

## 文件職責

| 文件 | 唯一職責 | 不應放入的內容 |
| --- | --- | --- |
| `ARCHITECTURE.md` | 說明前端、後台、API、資料庫與遊戲資產之間的系統邊界及依賴方向 | UI 色票、詳細部署步驟、單一功能實作 |
| `DATABASE.md` | 說明 MySQL、EF Core、migration 與資料庫維護原則 | API 行為、遊戲資料內容、部署拓撲 |
| `DEPLOYMENT.md` | 說明 GitHub Actions、Docker、IIS 與環境設定 | 程式碼風格、資料表設計、美術規格 |
| `DESIGN_SYSTEM.md` | 規範網站與後台 UI 的 token、資訊層級、互動及無障礙 | 遊戲場景 Tile、Sprite、光影與地圖製作流程 |
| `GAME_ART_GUIDE.md` | 規範遊戲世界的美術方向、資產拆分、生產流程與驗收方式 | 網站 UI、劇情設定、個別地圖擺放資料 |
| `IMPLEMENTATION_STANDARDS.md` | 規範跨專案的程式碼品質、測試、安全與交付原則 | 各模組內部設計、部署操作、美術方向 |

## 文件維護規則

1. 新規則先放入職責最接近的既有文件。
2. 只有當內容具有獨立讀者、獨立生命週期，而且放入既有文件會混淆職責時，才新增 Markdown。
3. 同一規則只保留一份原文；其他文件使用連結，不複製內容。
4. 地圖、角色或功能專屬資料應使用 manifest、JSON、測試或 feature README，不擴充成全域規範。
5. 文件接近 300 至 400 行時，先刪除過期與重複內容；仍有兩個明確職責才考慮拆分。
6. 新增或拆分文件時，同步更新本頁的職責表。

## 建議閱讀順序

- 新進開發者：`ARCHITECTURE.md` → `IMPLEMENTATION_STANDARDS.md` → 所屬領域文件。
- 前端與後台 UI：再閱讀 `DESIGN_SYSTEM.md`。
- 遊戲場景與美術資產：再閱讀 `GAME_ART_GUIDE.md`。
- 部署與維運：再閱讀 `DATABASE.md` 與 `DEPLOYMENT.md`。
