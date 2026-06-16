# IIS 部署流程

本專案可以用 GitHub Actions 產生 IIS 部署包，再手動放到 IIS 主機。

## 1. 執行 CI

到 GitHub 專案頁面：

1. 打開 `Actions`。
2. 選擇 `Build IIS package`。
3. 按 `Run workflow`。
4. 如果前端和 API 同網域同站台，`api_base_url` 留空即可，前端會使用 `/api/v1`。
5. 如果 API 架在不同網域，填入完整 API base URL，例如 `https://api.example.com/api/v1`。

CI 完成後，在 workflow run 的 `Artifacts` 下載 `everrich-rpg-iis-package`。

## 2. 部署包內容

```text
frontend/  Vite 前端靜態網站
api/       ASP.NET Core API publish 輸出
README.md 部署摘要
```

## 3. IIS 建議架構

### 同一台 IIS，同一網域

建議：

- 主站台指向 `frontend/`
- API 建成同站台底下的應用程式，例如 `/api`
- 前端預設會呼叫 `/api/v1`

如果 API 實際路由是 `/api/v1`，可以依 IIS 結構選擇：

- API 應用程式掛在站台根目錄，保留 Controller route `/api/v1`
- 或使用 URL Rewrite / ARR 把 `/api/v1/*` 轉到 API 站台

### 前端與 API 分站台

如果 API 使用不同網域或 port，請在手動執行 workflow 時設定：

```text
api_base_url=https://你的-api-domain/api/v1
```

這會把 `VITE_API_BASE_URL` 寫入前端 build。

## 4. IIS 主機需求

- IIS
- IIS URL Rewrite Module
- ASP.NET Core Hosting Bundle，版本需相容 `global.json`
- 資料庫連線字串

## 5. 後端正式設定

不要把開發用 DB 檔直接部署成正式資料庫。

正式環境建議在 IIS 設定環境變數：

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__GameDatabase=你的正式資料庫連線字串
Database__Provider=PostgreSql
Database__ApplyMigrations=false
Cors__AllowedOrigins__0=https://你的前端網域
```

如果你要讓 API 啟動時自動套 migration，可把：

```text
Database__ApplyMigrations=true
```

但正式環境比較建議先在部署流程或 DBA 流程中控管 migration。

## 6. 手動部署步驟

1. 停止 IIS 對應站台或 App Pool。
2. 備份原本網站資料夾。
3. 清空前端站台資料夾，放入 `frontend/` 內容。
4. 清空 API 應用程式資料夾，放入 `api/` 內容。
5. 設定 IIS 環境變數與 App Pool。
6. 啟動站台。
7. 檢查：

```text
https://你的網域/
https://你的網域/api/v1/health
https://你的網域/api/v1/health/ready
```
