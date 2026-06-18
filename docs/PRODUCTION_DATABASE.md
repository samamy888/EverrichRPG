# EVERRICH RPG 正式機 PostgreSQL 設定

正式機建議使用 PostgreSQL，不要把 SQLite 當遠端資料庫使用。SQLite 是檔案型 DB，適合本地開發；正式機若要用 DBeaver 遠端維護，請用 PostgreSQL。

## 1. GitHub Actions Secret

在 GitHub repo 的 `Settings > Secrets and variables > Actions > Secrets` 新增：

```text
IIS_DATABASE_CONNECTION_STRING
```

值請用正式機本機連線字串：

```text
Host=localhost;Port=5432;Database=everrich_rpg;Username=everrich_app;Password=你的強密碼;Pooling=true;Include Error Detail=false
```

如果你想明確指定 provider，也可以在 `Settings > Secrets and variables > Actions > Variables` 新增：

```text
IIS_DATABASE_PROVIDER=PostgreSql
```

## 2. DBeaver 遠端連線資訊

Driver 選 `PostgreSQL`。

```text
Host: 你的 VM 固定 IP
Port: 5432
Database: everrich_rpg
Username: everrich_app
Password: 你的強密碼
```

JDBC URL 範例：

```text
jdbc:postgresql://你的VM固定IP:5432/everrich_rpg
```

## 3. VM 防火牆與安全建議

請不要把 `5432` 對全世界開放。建議只允許你的固定 IP 連線。

Azure NSG 入站規則：

```text
Source: 你的家裡/公司固定 IP
Destination port: 5432
Protocol: TCP
Action: Allow
Priority: 低於 deny 規則即可
```

Windows 防火牆也只允許你的 IP：

```powershell
New-NetFirewallRule `
  -DisplayName "PostgreSQL 5432 from my IP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5432 `
  -RemoteAddress "你的固定IP" `
  -Action Allow
```

## 4. 正式 API 如何吃 PostgreSQL

CI/CD 會在部署 API 時產生：

```text
appsettings.Production.json
```

內容會由 GitHub Secret 寫入：

- `ConnectionStrings:GameDatabase`
- `Database:Provider`
- `Database:ApplyMigrations=true`

所以正式機 IIS 不需要手改 repo 內的 `appsettings.json`。

## 5. 本地仍使用 SQLite

本地 `Development` 環境仍吃：

```text
server/src/EverrichRPG.Api/appsettings.Development.json
```

目前是：

```text
Data Source=everrich-rpg-dev.db
```

這樣本地開發不需要安裝 PostgreSQL。
