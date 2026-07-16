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

## 目前功能

- 營運總覽
- 商品清單讀取 `/api/v1/shops/catalog`
- 商品新增、編輯與軟刪除 `/api/v1/products`
- 旅客清單讀取 `/api/v1/travelers`
- 旅客新增、編輯與軟刪除 `/api/v1/travelers`
- 商品價格、促銷期間、庫存與顯示順序管理
- 旅客紙娃娃外觀、對話與 AI 移動參數管理
- 資產清冊：自動盤點已部署與來源資產，支援搜尋、分類、格式及重複檔案篩選

資產清冊由 `scripts/build-asset-inventory.mjs` 在後台開發或建置前自動產生，掃描 Git 追蹤中的 `public/assets` 與 `game/assets`，不需要人工維護清單。

## 下一階段

- 後台登入與權限
- 紙娃娃 recipe 預覽
- 商店/任務資料管理
