# EverrichRPG Backend

## Requirements

- .NET SDK `10.0.301` or a compatible `10.0.x` SDK
- MySQL 8.x, or Docker Desktop / Docker Engine with Compose

## Local API

Development uses MySQL by default, applies committed EF migrations, and imports missing shop and traveler seed data.

Run the API:

```powershell
dotnet run --project server/src/EverrichRPG.Api --urls http://localhost:5080
```

If you do not want to store the database password in `appsettings.Development.json`, set it before running:

```powershell
$env:ConnectionStrings__GameDatabase='Server=127.0.0.1;Port=3306;Database=everrich_rpg;User=root;Password=你的密碼;TreatTinyAsBoolean=true'
```

Endpoints:

- `GET http://localhost:5080/api/v1/health`
- `GET http://localhost:5080/api/v1/health/ready`
- `GET http://localhost:5080/api/v1/version`
- `GET http://localhost:5080/api/v1/shops/catalog`
- `GET http://localhost:5080/api/v1/shops/{shopId}/products`
- `GET http://localhost:5080/openapi/v1.json` in Development

## Docker

```powershell
docker compose up --build
```

The API is available at `http://localhost:5080`. The container creates the MySQL database and schema when it starts.

Docker explicitly selects MySQL. The credentials in `compose.yaml` are development-only defaults. Production secrets must come from environment variables or a secret store.

## IIS

Publish:

```powershell
dotnet publish server/src/EverrichRPG.Api `
  --configuration Release `
  --output server/publish/api
```

Install the .NET 10 Hosting Bundle on Windows Server, create an IIS application for `server/publish/api`, and configure these environment variables:

- `ConnectionStrings__GameDatabase`
- `Database__Provider=MySql`
- `Database__ApplyMigrations=true`

See `../docs/PRODUCTION_DATABASE.md` for DBeaver, firewall, and GitHub Actions settings.
- `Cors__AllowedOrigins__0`

MySQL is the only persistent database provider. InMemory is reserved for automated tests. The API creates the database when missing, applies committed migrations, and records versions in `__EFMigrationsHistory`.

## Schema changes

After changing an EF entity or configuration:

```powershell
dotnet tool restore
dotnet ef migrations add YourMigrationName `
  --project server/src/EverrichRPG.Infrastructure `
  --startup-project server/src/EverrichRPG.Api `
  --context GameDbContext `
  --output-dir Persistence/Migrations

dotnet tool run dotnet-ef migrations has-pending-model-changes `
  --project server/src/EverrichRPG.Infrastructure `
  --startup-project server/src/EverrichRPG.Api `
  --context GameDbContext
```

Commit the generated migration and snapshot with the model change. CI rejects a model change that has no matching migration.

## Validation

```powershell
dotnet build server/EverrichRPG.slnx
dotnet test server/EverrichRPG.slnx
dotnet tool run dotnet-ef migrations has-pending-model-changes --project server/src/EverrichRPG.Infrastructure --startup-project server/src/EverrichRPG.Api --context GameDbContext
docker compose config
```
