# Azure IIS CI/CD 設定

本專案提供完整 GitHub Actions CI/CD：

```text
push main/master
→ 建置前端
→ 測試前端
→ 測試後端
→ publish ASP.NET Core API
→ 上傳部署包
→ Azure IIS self-hosted runner 下載部署包
→ 備份舊站台
→ 覆蓋 frontend / api 資料夾
→ 重啟 IIS App Pool
→ 健康檢查
```

Workflow 檔案：

```text
.github/workflows/azure-iis-cicd.yml
```

## 1. 推薦架構

建議在 Azure Windows VM / IIS 主機上安裝 GitHub self-hosted runner。

優點：

- 不需要開 Web Deploy 連接埠。
- 不需要把 IIS 帳密放到 GitHub。
- 可以直接操作本機 IIS App Pool 與資料夾。
- 部署流程最接近真實 IIS。

## 2. Azure IIS 主機需求

請在 Azure IIS VM 安裝：

- IIS
- IIS URL Rewrite Module
- ASP.NET Core Hosting Bundle，版本需相容 `global.json`
- GitHub Actions self-hosted runner

Runner labels 建議設定：

```text
self-hosted
windows
iis
```

Workflow 的 deploy job 會找：

```yaml
runs-on:
  - self-hosted
  - windows
  - iis
```

## 3. GitHub Variables

到 GitHub repo：

```text
Settings → Environments → New environment → production
```

在 `production` environment 裡設定 IIS 部署用 Variables：

| Variable | 必填 | 範例 | 說明 |
| --- | --- | --- | --- |
| `IIS_FRONTEND_PATH` | 是 | `C:\inetpub\EverrichRPG\frontend` | 前端站台資料夾 |
| `IIS_API_PATH` | 是 | `C:\inetpub\EverrichRPG\api` | API 應用程式資料夾 |
| `IIS_API_APP_POOL` | 是 | `EverrichRPG.Api` | API App Pool 名稱 |
| `IIS_FRONTEND_APP_POOL` | 否 | `EverrichRPG.Frontend` | 前端 App Pool 名稱，若前端純靜態且共用可留空 |
| `IIS_HEALTH_URL` | 否 | `https://你的網域/api/v1/health` | 部署後健康檢查 URL |
| `IIS_BACKUP_ROOT` | 否 | `D:\IISBackups\EverrichRPG` | 舊版備份位置 |

另外到：

```text
Settings → Secrets and variables → Actions → Variables
```

可選擇設定 Repository Variable：

| Variable | 必填 | 範例 | 說明 |
| --- | --- | --- | --- |
| `PRODUCTION_API_BASE_URL` | 否 | `https://你的網域/api/v1` | 前端 build 時使用的 API URL |

如果前端和 API 同網域，且 API 對外路徑是 `/api/v1`，`PRODUCTION_API_BASE_URL` 可以不填。

## 4. IIS 建議設定

### 前端

前端 site 指向：

```text
C:\inetpub\EverrichRPG\frontend
```

前端包內會包含 `web.config`，用於 SPA fallback。

### API

API application 指向：

```text
C:\inetpub\EverrichRPG\api
```

API App Pool 建議：

```text
.NET CLR version: No Managed Code
Managed pipeline mode: Integrated
```

## 5. 後端正式環境變數

在 IIS API App Pool 或站台設定正式環境變數：

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__GameDatabase=你的正式資料庫連線字串
Database__Provider=PostgreSql
Database__ApplyMigrations=false
Cors__AllowedOrigins__0=https://你的前端網域
```

如果你要讓 API 啟動時自動 migration：

```text
Database__ApplyMigrations=true
```

正式環境通常建議先手動控管 migration，再部署 API。

## 6. 執行部署

### 自動部署

push 到 `main` 或 `master`：

```text
git push origin main
```

就會自動執行完整 CI/CD。

### 手動部署

到 GitHub：

```text
Actions → Azure IIS CI/CD → Run workflow
```

如果需要覆蓋 API URL，可以填：

```text
api_base_url=https://你的網域/api/v1
```

## 7. Rollback

每次部署前 workflow 會備份：

```text
IIS_BACKUP_ROOT/yyyyMMdd-HHmmss/frontend
IIS_BACKUP_ROOT/yyyyMMdd-HHmmss/api
```

如果部署後有問題：

1. 停止 App Pool。
2. 把備份資料夾內容複製回 IIS 對應資料夾。
3. 啟動 App Pool。

## 8. 注意事項

- self-hosted runner 的 Windows 帳號需要有 IIS 資料夾寫入權限。
- runner 帳號需要能執行 `C:\Windows\System32\inetsrv\appcmd.exe`。
- 部署段使用 Windows 內建 `powershell`，不需要另外安裝 PowerShell 7 `pwsh`。
- 如果 Health Check 失敗，workflow 會失敗，但目前不會自動 rollback。
- 若你之後想做自動 rollback，可以再加一個失敗時還原 `BACKUP_PATH` 的 step。
