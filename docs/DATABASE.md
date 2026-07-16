# MySQL 架構

## 基線

- MySQL 8.4
- EF Core provider：`MySql.EntityFrameworkCore`
- DbContext：`AppDbContext`
- Connection string key：`ConnectionStrings:AppDatabase`
- 預設字元集：`utf8mb4`
- 預設 collation：`utf8mb4_unicode_ci`

## Migration

```powershell
dotnet tool run dotnet-ef migrations add <Name> `
  --project server/src/EverrichRPG.Infrastructure/EverrichRPG.Infrastructure.csproj `
  --startup-project server/src/EverrichRPG.Api/EverrichRPG.Api.csproj `
  --context AppDbContext `
  --output-dir Persistence/Migrations
```

正式部署由 `Database__ApplyMigrations=true` 控制自動套用。重新建立資料庫是破壞性操作，只能透過明確的維護流程執行。
