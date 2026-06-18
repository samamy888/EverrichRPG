# EVERRICH RPG API Log 查錯指南

API 使用 Serilog 輸出結構化 log。

## Log 位置

正式機 API 目錄底下：

```text
logs/app-YYYYMMDD.clef
```

ASP.NET Core stdout：

```text
logs/stdout*.log
```

`.clef` 是 compact JSON，一行一筆事件，適合直接貼給我一起查。

## 快速看最近 log

```powershell
Get-ChildItem "你的 API IIS 路徑\logs" -Filter "app-*.clef" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1 |
  Get-Content -Tail 120
```

## 用 traceId 找錯

API 發生 500 時，response 會帶：

```json
{
  "traceId": "..."
}
```

在 VM 上搜尋：

```powershell
Select-String -Path "你的 API IIS 路徑\logs\app-*.clef" -Pattern "traceId值"
```

## 遠端讀最近 log

如果有設定 GitHub Secret：

```text
IIS_DIAGNOSTICS_LOG_ACCESS_TOKEN
```

可以呼叫：

```powershell
Invoke-WebRequest `
  -Uri "https://www.biudream.com/api/v1/diagnostics/logs/recent?lines=120" `
  -Headers @{ "X-Diagnostics-Token" = "你的Token" } `
  -UseBasicParsing
```

沒有設定 token 時，這個 endpoint 會回 `404`，避免 log 被公開。

## 常見查錯順序

1. 看 GitHub Actions 的 `Recent structured API logs`。
2. 找 `traceId` 對應的錯誤。
3. 看 `Exception` 或 `@x` 欄位。
4. 如果 API 根本沒啟動，再看 `stdout*.log`。
