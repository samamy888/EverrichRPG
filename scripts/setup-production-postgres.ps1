param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresBin,

  [Parameter(Mandatory = $true)]
  [string]$SuperUser,

  [Parameter(Mandatory = $true)]
  [string]$AppPassword,

  [string]$Database = "everrich_rpg",
  [string]$AppUser = "everrich_app",
  [string]$AllowedRemoteAddress = ""
)

$ErrorActionPreference = "Stop"

$psql = Join-Path $PostgresBin "psql.exe"
if (-not (Test-Path $psql)) {
  throw "psql.exe not found. Pass PostgreSQL bin path, for example: C:\Program Files\PostgreSQL\18\bin"
}

function Invoke-Psql {
  param([string]$Sql)
  & $psql -U $SuperUser -d postgres -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed."
  }
}

$escapedPassword = $AppPassword.Replace("'", "''")

Write-Host "Creating or updating PostgreSQL role '$AppUser'..."
Invoke-Psql @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$AppUser') THEN
    CREATE ROLE $AppUser LOGIN PASSWORD '$escapedPassword';
  ELSE
    ALTER ROLE $AppUser WITH LOGIN PASSWORD '$escapedPassword';
  END IF;
END
`$`$;
"@

Write-Host "Creating database '$Database' when missing..."
$databaseExists = & $psql -U $SuperUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to check database existence."
}
if ($databaseExists.Trim() -ne "1") {
  & $psql -U $SuperUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database OWNER $AppUser;"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create database '$Database'."
  }
}

Write-Host "Granting privileges..."
Invoke-Psql "GRANT ALL PRIVILEGES ON DATABASE $Database TO $AppUser;"
& $psql -U $SuperUser -d $Database -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO $AppUser;"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to grant schema privileges."
}

if ($AllowedRemoteAddress) {
  Write-Host "Adding Windows Firewall rule for $AllowedRemoteAddress..."
  New-NetFirewallRule `
    -DisplayName "PostgreSQL 5432 from $AllowedRemoteAddress" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5432 `
    -RemoteAddress $AllowedRemoteAddress `
    -Action Allow `
    -ErrorAction SilentlyContinue | Out-Null
}

Write-Host "Done."
Write-Host "Application connection string:"
Write-Host "Host=localhost;Port=5432;Database=$Database;Username=$AppUser;Password=<your-password>;Pooling=true;Include Error Detail=false"
Write-Host "DBeaver JDBC URL:"
Write-Host "jdbc:postgresql://<your-vm-fixed-ip>:5432/$Database"
