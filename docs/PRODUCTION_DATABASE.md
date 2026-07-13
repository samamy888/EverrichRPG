# EVERRICH RPG MySQL 正式資料庫設定

MySQL 是本專案唯一的持久化資料庫；InMemory 僅供自動測試。正式機與本機可以使用同一組帳密，但密碼不要提交到 Git；請用環境變數或 GitHub Actions Secret 注入。

## 1. 建立資料庫

API 啟動時會先建立不存在的 `everrich_rpg` database，再套用已提交的 EF Core MySQL migrations。版本會記錄在 `__EFMigrationsHistory`。你也可以先在 VM 或本機 MySQL 手動執行：

```sql
CREATE DATABASE IF NOT EXISTS everrich_rpg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

如果你的 MySQL 版本不支援 `utf8mb4_0900_ai_ci`，改用：

```sql
CREATE DATABASE IF NOT EXISTS everrich_rpg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## 2. 本機 API 連線

PowerShell 啟動 API 前設定：

```powershell
$env:ConnectionStrings__GameDatabase='Server=127.0.0.1;Port=3306;Database=everrich_rpg;User=root;Password=你的密碼;TreatTinyAsBoolean=true'
$env:Database__Provider='MySql'
$env:Database__ApplyMigrations='true'
dotnet run --project server/src/EverrichRPG.Api --urls http://localhost:5080
```

健康檢查：

```powershell
Invoke-WebRequest http://localhost:5080/api/v1/health/ready -UseBasicParsing
```

## 3. GitHub Actions 設定

到 GitHub repo 的 `Settings > Secrets and variables > Actions` 設定：

Secrets：

```text
IIS_DATABASE_CONNECTION_STRING
```

值：

```text
Server=127.0.0.1;Port=3306;Database=everrich_rpg;User=root;Password=你的密碼;TreatTinyAsBoolean=true
```

Variables：

```text
IIS_DATABASE_PROVIDER=MySql
```

如果 API 與 MySQL 在同一台 VM，`Server=127.0.0.1` 最穩，不需要開放 MySQL 對外連線。

## 4. Schema migration 管理

修改 Domain entity 或 EF configuration 後，必須產生 migration：

```powershell
dotnet tool restore
dotnet ef migrations add YourMigrationName `
  --project server/src/EverrichRPG.Infrastructure `
  --startup-project server/src/EverrichRPG.Api `
  --context GameDbContext `
  --output-dir Persistence/Migrations
```

確認 model 與 migration 一致：

```powershell
dotnet tool run dotnet-ef migrations has-pending-model-changes `
  --project server/src/EverrichRPG.Infrastructure `
  --startup-project server/src/EverrichRPG.Api `
  --context GameDbContext
```

CI/CD 會執行相同檢查。一般部署由 API 啟動時呼叫 `MigrateAsync()`，只套用尚未執行的 migration。

若要第一次接管舊 DB 並允許清空全部資料，到 GitHub：

```text
Actions → Azure IIS CI/CD → Run workflow
```

勾選 `recreate_database` 後執行。只有這次手動 workflow 會刪除並重建 MySQL database；一般 push、後續部署及 IIS 重啟都不會自動清空資料。

## 5. DBeaver 連線

Driver 選 `MySQL`。

```text
Host: VM 固定 IP 或 127.0.0.1
Port: 3306
Database: everrich_rpg
Username: root
Password: 你的密碼
```

JDBC URL：

```text
jdbc:mysql://你的VM固定IP:3306/everrich_rpg
```

如果要從自己的電腦遠端連 VM 的 MySQL，請只開放你的固定 IP，避免把 `3306` 公開給所有來源。

## 6. VM 防火牆檢查

API 與 MySQL 同機時，只要確認 MySQL 有在本機聽 `3306`：

```powershell
Test-NetConnection 127.0.0.1 -Port 3306
```

如果要遠端用 DBeaver 連線，Windows 防火牆可加規則：

```powershell
New-NetFirewallRule `
  -DisplayName "MySQL 3306 from my IP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3306 `
  -RemoteAddress "你的固定IP" `
  -Action Allow
```

Azure NSG 也要加同樣來源 IP 的 `TCP 3306 Allow` 規則。

## 7. CI/CD 失敗排查

如果 `Check internal API health` 顯示 `500`，優先看 API log：

```powershell
Get-ChildItem "你的 API IIS 路徑\logs" -Filter "app-*.clef" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  Get-Content -Tail 120
```

常見原因：

- MySQL 沒啟動或沒有聽 `3306`
- `IIS_DATABASE_CONNECTION_STRING` 沒設定或密碼錯誤
- root 帳號沒有 `CREATE DATABASE` 權限，導致 `everrich_rpg` 無法自動建立
- migration 執行失敗，請檢查 `__EFMigrationsHistory` 與 API log
- IIS App Pool 沒有讀取 API 目錄或寫入 `logs` 目錄權限
