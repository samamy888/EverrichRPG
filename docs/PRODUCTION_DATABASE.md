# EVERRICH RPG MySQL 正式資料庫設定

後端目前以 MySQL 為主要資料庫。正式機與本機可以使用同一組帳密，但密碼不要提交到 Git；請用環境變數或 GitHub Actions Secret 注入。

## 1. 建立資料庫

在 VM 或本機 MySQL 執行：

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

## 4. DBeaver 連線

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

## 5. VM 防火牆檢查

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

## 6. CI/CD 失敗排查

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
- `everrich_rpg` 資料庫尚未建立
- IIS App Pool 沒有讀取 API 目錄或寫入 `logs` 目錄權限
