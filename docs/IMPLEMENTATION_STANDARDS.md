# 實作規範

- TypeScript 與 C# 均啟用 nullable／strict 類型檢查。
- 功能應以小型垂直切片交付，並附上對應測試。
- API 路徑統一使用 `/api/v1`；錯誤回應採 Problem Details。
- 不在原始碼保存密碼、token 或正式連線字串。
- 所有 schema 變更必須由 EF Core migration 表達。
- 產生的檔案、建置輸出與本機日誌不得提交。
- 新增相依套件前需說明其用途，避免為單一小功能引入大型框架。
