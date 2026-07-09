# EverrichRPG Backend

## Requirements

- .NET SDK `10.0.301` or a compatible `10.0.x` SDK
- MySQL 8.x, or Docker Desktop / Docker Engine with Compose

## Local API

Development uses MySQL by default and automatically imports the shop catalog and traveler roster.

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

For a remotely maintainable production database, use MySQL instead of SQLite.
See `../docs/PRODUCTION_DATABASE.md` for DBeaver, firewall, and GitHub Actions settings.
- `Database__ApplyMigrations=false`
- `Cors__AllowedOrigins__0`

MySQL currently creates the database and schema from the EF model on startup. When schema changes become more formal, generate MySQL-specific migrations and run them as a deployment step before recycling the IIS application.

## Validation

```powershell
dotnet build server/EverrichRPG.slnx
dotnet test server/EverrichRPG.slnx
docker compose config
```
