# EverrichRPG Server

ASP.NET Core 8 後端，負責玩家狀態、聊天室、即時位置同步與前端錯誤日誌。

## 功能

- WebSocket `/ws`：玩家加入、離開、移動、聊天、心跳。
- REST API `/api/players`：取得目前玩家快照。
- REST API `/api/chat?limit=50`：取得最近聊天訊息。
- REST API `/api/profile`：保存玩家基本資料。
- REST API `/api/logs`：接收前端日誌並寫入 JSON Lines。
- `data-snapshot.json`：本機檔案式狀態保存，不需要外部資料庫。

## 啟動

需要 .NET 8 SDK。

```powershell
cd server
$env:ASPNETCORE_URLS="http://localhost:5000"
dotnet run
```

前端開發環境預設連線：

- REST API：`http://localhost:5000/api`
- WebSocket：`ws://localhost:5000/ws`

## WebSocket

連線範例：

```text
ws://localhost:5000/ws?name=玩家&id=player-id
```

Client 可送出的 JSON：

```json
{ "type": "move", "x": 123, "y": 45, "area": "t2_lobby" }
```

```json
{ "type": "chat", "text": "哈囉" }
```

常見 server event：

- `welcome`
- `player-joined`
- `player-moved`
- `player-left`
- `chat`
- `pong`

## 日誌上報

端點：

```text
POST /api/logs
```

可送單筆物件或陣列。伺服器會寫入 `server/logs/app-YYYY-MM-DD.log`。

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
  "extra": { "scene": "TPE2LobbyScene" }
}
```

伺服器會自動補上接收時間、IP、User-Agent 與 referer。

## 開發備註

- CORS 已允許 Vite 開發站台 `http://localhost:5173`。
- WebSocket 狀態目前以記憶體為主，並由 `FileStateStore` 寫入快照。
- 若未來要換成 LiteDB/SQLite，可新增對應 store 並替換 `IStateStore` 實作。
