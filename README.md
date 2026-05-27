# EverrichRPG

像素風機場免稅店 RPG 原型。玩家可以登入角色，在桃園機場/T2 大廳地圖移動，與設施、店員和商品清單互動，並透過 WebSocket 看見其他玩家與聊天室訊息。

## 專案狀態

- 前端：TypeScript + Vite + Phaser 3
- 後端：ASP.NET Core 8，提供 REST API、WebSocket、檔案式狀態快照
- 目前重點：機場導覽、免稅店購物、NPC/旅客、小地圖、多人位置同步與聊天

## 開發與執行

建議使用 Node.js 20.12+。

```powershell
npm ci
npm run dev
```

開發伺服器預設在 http://localhost:5173。

其他常用指令：

```powershell
npm run build
npm run preview
npx tsc --noEmit
```

後端伺服器：

```powershell
cd server
$env:ASPNETCORE_URLS="http://localhost:5000"
dotnet run
```

前端預設會在開發環境連到 `http://localhost:5000/api` 與 `ws://localhost:5000/ws`。

## 目前玩法

- 登入畫面：輸入電子郵件、顯示名稱、性別，選擇起始場景。
- T2 大廳：使用 `WASD` 或方向鍵移動，靠近設施時按 `E` 互動。
- 地圖場景：可切換 TPE-01 至 TPE-12 等機場平面圖，玩家位置會顯示在小地圖。
- 商店：靠近店員按 `E` 對話，使用 `W/S` 或方向鍵選商品，按 `E` 購買。
- 購物籃：透過 ESC 選單開啟，可檢視與移除商品。
- 聊天/多人：登入後會建立 WebSocket 連線，同步玩家移動與聊天訊息。
- 縮放工具：右下角可調整 Snap 縮放、聊天、小地圖人群與連線狀態。

## 專案結構

```text
src/
  actors/      玩家與 NPC 角色
  api/         REST API 呼叫
  data/        商品、旅客、設施等靜態資料
  i18n/        介面文案
  net/         WebSocket、HTTP、其他玩家同步
  scenes/      Phaser 場景
  ui/          HUD、對話、購物籃、小地圖、聊天 UI
public/
  fonts/       HanPixel 字型
  map/         TPE/TPE2 地圖與道具
  sprites/     角色圖集與動畫素材
server/
  ASP.NET Core 即時同步與 API 伺服器
```

## 字型與顯示

- WebFont：`public/fonts/han.ttf`，字族名 `HanPixel`。
- BitmapFont：網址加上 `?useBitmapFont=1` 可改用 `public/fonts/han.fnt/png`。
- Phaser 以 320x180 為基準解析度，透過整數縮放保持像素風清晰。

## 部署

執行 `npm run build` 後會輸出到 `dist/`。IIS 部署可使用 `public/web.config`，其中包含 SPA fallback 與常見 MIME 設定。
