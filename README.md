# Everrich RPG

這個分支是全新版本的架構起點。舊遊戲內容、美術資產、地圖、角色、商品、任務與遷移資料均已移除。

## 保留的系統

- Vite + TypeScript 前端
- Vite + TypeScript 管理後台（`/backend/`）
- .NET 10 Clean Architecture API
- EF Core + MySQL migration 架構
- Serilog、健康檢查、CORS 與錯誤處理
- GitHub Actions、Docker、IIS 部署設定
- 單元測試與整合測試專案

## 開發指令

```powershell
npm install
npm run dev
npm run backend:dev
dotnet run --project server/src/EverrichRPG.Api/EverrichRPG.Api.csproj
```

MySQL 可使用 `docker compose up database` 啟動。本機預設不會自動執行 migration；需要時設定 `Database__ApplyMigrations=true`。

專案文件的用途與閱讀順序請參考 [文件總覽](docs/README.md)。
