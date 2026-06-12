# EverrichRPG Backend

## Requirements

- .NET SDK `10.0.301` or a compatible `10.0.x` SDK
- PostgreSQL 18, or Docker Desktop / Docker Engine with Compose

## Local API

Development uses an in-memory database and automatically imports the shop catalog, so PostgreSQL is not required for local frontend integration.

Run the API:

```powershell
dotnet run --project server/src/EverrichRPG.Api --urls http://localhost:5080
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

The API is available at `http://localhost:5080`. The container applies pending migrations when it starts.

Docker explicitly selects PostgreSQL. The credentials in `compose.yaml` are development-only defaults. Production secrets must come from environment variables or a secret store.

## IIS

Publish:

```powershell
dotnet publish server/src/EverrichRPG.Api `
  --configuration Release `
  --output server/publish/api
```

Install the .NET 10 Hosting Bundle on Windows Server, create an IIS application for `server/publish/api`, and configure these environment variables:

- `ConnectionStrings__GameDatabase`
- `Database__Provider=PostgreSql`
- `Database__ApplyMigrations=false`
- `Cors__AllowedOrigins__0`

Run migrations as a deployment step before recycling the IIS application. Do not let multiple production instances apply migrations concurrently.

## Validation

```powershell
dotnet build server/EverrichRPG.slnx
dotnet test server/EverrichRPG.slnx
docker compose config
```
