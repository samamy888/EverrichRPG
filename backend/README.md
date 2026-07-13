# EVERRICH RPG 後台

後台是一個獨立 Vite app，部署在主站同網域的 `/backend`。

## 路徑規劃

- 玩家前台：`/`
- 後台管理：`/backend`
- 共用 API：`/api/v1`

## 本地開發

```powershell
npm run backend:dev
```

預設網址：`http://localhost:5174/backend/`

本地開發時 API 會讀：`http://127.0.0.1:5080/api/v1`
正式部署時 API 會讀：`/api/v1`

## 建置

```powershell
npm run backend:build
```

輸出位置：`dist/backend`

完整 IIS 建置：

```powershell
npm run build:iis
```

會同時建置：

- 前台遊戲到 `dist/`
- 後台管理到 `dist/backend/`
- 複製根目錄 `web.config` 到 `dist/web.config`

## 第一階段功能

- 營運總覽
- 商品清單讀取 `/api/v1/shops/catalog`
- 旅客清單讀取 `/api/v1/travelers`

## 下一階段

- 商品 CRUD API
- 旅客 CRUD API
- 後台登入與權限
- 紙娃娃 recipe 預覽
- 商店/任務資料管理
