# 部署架構

- GitHub Actions 在 Windows runner 建置前端、後台與 .NET API。
- 前端與 `/backend/` 靜態檔案部署到 IIS frontend site。
- `/api/*` 由 IIS URL Rewrite 反向代理至 ASP.NET Core API。
- API 使用獨立 app pool，MySQL 連線字串由 GitHub Environment secret 注入。
- Docker Compose 提供本機 MySQL 與 API 執行環境。

部署前必須通過 TypeScript、前端測試、.NET 測試與 EF migration model check。
