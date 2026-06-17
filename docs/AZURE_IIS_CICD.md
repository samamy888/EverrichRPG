# Azure IIS CI/CD 部署說明

這份文件說明如何把 Everrich RPG 部署到 Azure Windows VM + IIS，並透過 GitHub Actions self-hosted runner 自動建置、發布與健康檢查。

## 部署架構

```text
GitHub push main/master
→ 建置前端
→ 測試前端
→ 建置 ASP.NET Core API
→ 測試 API
→ 打包 frontend / api
→ self-hosted runner 複製到 IIS 目錄
→ 重啟 IIS App Pool
→ 檢查 API 內部健康狀態
→ 選擇性檢查公開網址反向代理
```

Workflow 檔案：

```text
.github/workflows/azure-iis-cicd.yml
```

## IIS 必要元件

Azure Windows VM / IIS 需要安裝：

- IIS
- IIS URL Rewrite Module
- Application Request Routing，並啟用 `Proxy`
- ASP.NET Core Hosting Bundle，版本需符合 `global.json`
- GitHub Actions self-hosted runner

Runner labels 需要包含：

```text
self-hosted
windows
iis
```

## GitHub Variables

請到 GitHub repo：

```text
Settings → Environments → production → Variables
```

設定部署用變數：

| Variable | 必填 | 建議值 | 說明 |
| --- | --- | --- | --- |
| `IIS_FRONTEND_PATH` | 是 | `C:\inetpub\EverrichRPG\frontend` | 前端 IIS 站台目錄 |
| `IIS_API_PATH` | 是 | `C:\inetpub\EverrichRPG\api` | API IIS 站台目錄 |
| `IIS_API_APP_POOL` | 是 | `EverrichRPG.Api` | API App Pool 名稱 |
| `IIS_FRONTEND_APP_POOL` | 否 | `EverrichRPG.Frontend` | 前端 App Pool 名稱 |
| `IIS_BACKUP_ROOT` | 否 | `D:\IISBackups\EverrichRPG` | 部署前備份目錄 |
| `IIS_INTERNAL_HEALTH_URL` | 否 | `http://localhost:5080/api/v1/health` | runner 在 IIS 主機上直接檢查 API |
| `IIS_HEALTH_URL` | 否 | `https://www.biudream.com/api/v1/health` | 公開網址健康檢查 |
| `IIS_REQUIRE_PUBLIC_HEALTH` | 否 | `false` | 是否讓公開網址健康檢查失敗時中止部署 |

Repository variables 可另外設定：

| Variable | 必填 | 建議值 | 說明 |
| --- | --- | --- | --- |
| `PRODUCTION_API_BASE_URL` | 否 | 空白或 `/api/v1` | 前端 build 使用的 API base URL |

目前建議先讓 `IIS_INTERNAL_HEALTH_URL` 維持預設值，確認 API 本身可運作後，再設定 `IIS_HEALTH_URL` 檢查公開網域。

## IIS 站台設定

### 前端站台

前端 physical path：

```text
C:\inetpub\EverrichRPG\frontend
```

前端站台負責：

- 提供 Vite build 後的靜態檔案
- SPA fallback
- 透過 `web.config` 將 `/api/*` 反向代理到 API 站台
- 提供 `.tmj` / `.tsj` Tiled 地圖與 tileset JSON

`web.config` 目前會把：

```text
https://www.biudream.com/api/v1/health
```

反向代理到：

```text
http://localhost:5080/api/v1/health
```

如果公開健康檢查回 502，通常代表其中一項有問題：

- API 站台沒有聽在 `localhost:5080`
- API App Pool 沒有成功啟動
- IIS 沒安裝或沒啟用 Application Request Routing Proxy
- URL Rewrite 規則沒有套用
- 防火牆、NSG 或 HTTPS binding 設定不完整

### API 站台

API physical path：

```text
C:\inetpub\EverrichRPG\api
```

API binding 建議：

```text
http://localhost:5080
```

API App Pool 建議：

```text
.NET CLR version: No Managed Code
Managed pipeline mode: Integrated
```

先在 IIS 主機上測試：

```powershell
Invoke-WebRequest http://localhost:5080/api/v1/health -UseBasicParsing
```

這個通過後，再測試公開網址：

```powershell
Invoke-WebRequest https://www.biudream.com/api/v1/health -UseBasicParsing
```

## API 環境變數

在 API App Pool 或系統環境變數設定：

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__GameDatabase=你的資料庫連線字串
Database__Provider=PostgreSql
Database__ApplyMigrations=false
Cors__AllowedOrigins__0=https://www.biudream.com
```

如果要讓 API 啟動時自動套用 migration：

```text
Database__ApplyMigrations=true
```

正式環境建議先備份資料庫，再開啟自動 migration。

## 健康檢查策略

CI/CD 現在有兩層健康檢查：

1. `Check internal API health`：必要，直接打 `http://localhost:5080/api/v1/health`，用來確認 API 站台本身有起來。
2. `Check public health endpoint`：選擇性，打 `IIS_HEALTH_URL`，用來確認前端站台、URL Rewrite、ARR Proxy、HTTPS binding 都正常。

如果公開健康檢查失敗但 `IIS_REQUIRE_PUBLIC_HEALTH=false`，workflow 會警告但不會判定部署失敗。

若要公開檢查失敗也讓部署失敗，設定：

```text
IIS_REQUIRE_PUBLIC_HEALTH=true
```

## 手動部署

到 GitHub：

```text
Actions → Azure IIS CI/CD → Run workflow
```

如果沒有特殊需求，`api_base_url` 留空，讓前端使用 `/api/v1` 即可。

## Rollback

每次部署前會備份目前 IIS 目錄：

```text
IIS_BACKUP_ROOT/yyyyMMdd-HHmmss/frontend
IIS_BACKUP_ROOT/yyyyMMdd-HHmmss/api
```

需要 rollback 時：

1. 停止 frontend / api App Pool。
2. 將備份資料夾複製回 IIS physical path。
3. 重新啟動 App Pool。
