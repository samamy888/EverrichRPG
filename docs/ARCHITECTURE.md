# 系統架構

## 前端

`src/app` 負責組裝畫面，`src/core` 放置跨功能設定與基礎服務。未來功能應放在 `src/features/<feature>`，不得把領域規則塞進 DOM 元件。

## 管理後台

`backend` 是獨立 Vite 入口，部署於 `/backend/`。後台只透過公開 API contract 讀寫資料，不直接依賴遊戲前端模組。

## 後端

後端採 Domain → Application → Infrastructure → API 的依賴方向。Domain 不得引用資料庫或 Web 套件；API 是唯一 composition root。

## 資料庫

MySQL schema 由 EF Core migration 管理。禁止在正式環境手動改表後不補 migration。測試使用 InMemory provider，正式與整合環境以 MySQL 為準。
