EverrichRPG Server (ASP.NET Core 8)

本伺服器提供：
- WebSocket 即時連線（/ws）：玩家加入、位置同步、聊天室
- REST API：/api/players（線上玩家快照）、/api/chat?limit=50（簡易聊天紀錄）
- 檔案型快照 data-snapshot.json（無需安裝資料庫）
 - 日誌上報 /api/logs（JSON Lines 落地到 logs/）

啟動
- 需要 .NET 8 SDK（https://dotnet.microsoft.com/）
- 指令：
  - cd server
  - dotnet run
- 預設埠：隨機（Kestrel 動態），可用 ASPNETCORE_URLS 指定：
  - Windows PowerShell：$env:ASPNETCORE_URLS="http://localhost:5080"; dotnet run

前端連線範例（WebSocket）
- ws://localhost:5080/ws?name=你的小名&id=任意ID
- 訊息格式（JSON）：
  - 送出移動：{ "type":"move", "x":123, "y":45, "area":"hall" }
  - 送出聊天：{ "type":"chat", "text":"哈囉" }
  - 伺服器事件：welcome / player-joined / player-moved / player-left / chat

資料儲存
- 預設使用記憶體 + 啟動/關閉時寫入 data-snapshot.json（無外部 DB）
- 若要切換嵌入式 DB（LiteDB/SQLite），可在 csproj 新增套件並實作替代的 Store

日誌上報（/api/logs）
- 端點：POST /api/logs
- 內容：單筆物件或陣列，伺服器會寫入 JSON Lines 至 `server/logs/app-YYYY-MM-DD.log`
- 範例 Payload：
  ```json
  {
    "level": "error",
    "message": "Something went wrong",
    "url": "https://example/game",
    "ts": "2024-01-01T00:00:00.000Z",
    "pid": "user-123",
    "sid": "session-abc",
    "name": "玩家",
    "gender": "M",
    "extra": { "scene": "Terminal" }
  }
  ```
- 伺服器會自動加入 `ts`（接收時間 UTC）、`ip`、`ua`（User-Agent）、`referer` 欄位。

開發備註
- 已啟用 CORS（http://localhost:5173）供 Vite 前端存取 /api
- WebSocket 允許跨來源（瀏覽器連線由前端程式碼決定）
