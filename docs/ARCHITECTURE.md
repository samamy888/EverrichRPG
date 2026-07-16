# 系統架構

## 前端

`src/app` 負責組裝畫面，`src/core` 放置跨功能設定與基礎服務。未來功能應放在 `src/features/<feature>`，不得把領域規則塞進 DOM 元件。

## 管理後台

`backend` 是獨立 Vite 入口，部署於 `/backend/`。後台只透過公開 API contract 讀寫資料，不直接依賴遊戲前端模組。

## 後端

後端採 Domain → Application → Infrastructure → API 的依賴方向。Domain 不得引用資料庫或 Web 套件；API 是唯一 composition root。

## 資料庫

MySQL schema 由 EF Core migration 管理。禁止在正式環境手動改表後不補 migration。測試使用 InMemory provider，正式與整合環境以 MySQL 為準。

## 遊戲資產

地圖視覺、runtime 物件與玩法資料必須分離：地面與結構使用 Tile／Chunk，Props 與 Actors 使用獨立透明資產，碰撞、事件、出入口及出生點使用結構化 metadata。完整場景母版只作為美術參考與驗收依據，不直接充當可遊玩的地圖。

詳細的拆分、生產與驗收規則統一維護於 [遊戲美術與資產製作規範](GAME_ART_GUIDE.md)。
