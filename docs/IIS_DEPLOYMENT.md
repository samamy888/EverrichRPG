# IIS 部署流程

本專案統一使用 `.github/workflows/azure-iis-cicd.yml` 部署到 Windows IIS。push 到 `main` / `master` 會執行一般部署，也可從 GitHub Actions 手動執行。

完整的 runner、IIS variables、App Pool、健康檢查與 rollback 設定請見 `AZURE_IIS_CICD.md`。

## 部署內容

Workflow 會：

1. 驗證 Tiled 地圖並執行前端測試。
2. 建置遊戲前台與 `/backend` 管理後台。
3. 執行 .NET 測試。
4. 驗證 EF model 有對應的 MySQL migration。
5. publish ASP.NET Core API。
6. 備份目前的 IIS 前台與 API 目錄。
7. 部署檔案並重啟 App Pool。
8. 執行內部、公開健康檢查與 API smoke tests。

## IIS 架構

- 前台 physical path：GitHub variable `IIS_FRONTEND_PATH`
- API physical path：GitHub variable `IIS_API_PATH`
- 公開 `/api/*` 由前台 `web.config` 反向代理至 API IIS site。
- `/backend/` 與遊戲前台部署在同一個前台目錄，不需要獨立 IIS site。

API 使用：

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__GameDatabase=<GitHub secret IIS_DATABASE_CONNECTION_STRING>
Database__Provider=MySql
Database__ApplyMigrations=true
```

## 一般部署

push 到 `main`，或到：

```text
Actions → Azure IIS CI/CD → Run workflow
```

一般部署不要勾選 `recreate_database`。API 啟動時只會套用尚未執行的 migration，不會清空既有資料。

## 第一次重建 MySQL schema

舊資料允許全部清空時，手動執行 workflow 並勾選 `recreate_database`。該次部署會：

1. 刪除既有 MySQL database。
2. 依 MySQL migrations 重建 schema。
3. 建立 `__EFMigrationsHistory`。
4. 匯入初始商店、商品及旅客資料。

這個選項只對該次手動執行有效。

## 部署後檢查

```text
https://你的網域/
https://你的網域/backend/
https://你的網域/api/v1/health
https://你的網域/api/v1/health/ready
```
