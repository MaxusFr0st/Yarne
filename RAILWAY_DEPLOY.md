# Railway Deployment Runbook (Yarne)

This runbook is specific to this repository:

- Frontend: `YarneFront`
- Backend: `YarneBack/YarneAPIBack/YarneAPIBack`
- Database scripts: `YarneDB/SQLQuery1.sql` + `YarneDB/Migrations/*.sql`

## 1) Current status

- Backend container is healthy when `GET /healthz` returns `{"status":"ok"}`.
- If `/api/*` returns 500 with long duration, DB connectivity is failing.
- Your DB logs show SQL Server is crashing at startup with:
  - `Error: The system directory [/.system] could not be created ... Permission denied`

## 2) Fix SQL Server service startup first

In Railway DB service (`server`), set these extra variables:

- `HOME=/var/opt/mssql`
- `MSSQL_DATA_DIR=/var/opt/mssql/data`
- `MSSQL_LOG_DIR=/var/opt/mssql/log`
- `MSSQL_BACKUP_DIR=/var/opt/mssql/backups`

Keep existing:

- `ACCEPT_EULA=Y`
- `MSSQL_PID=Developer`
- `MSSQL_SA_PASSWORD=<strong password>`

If `/.system` error continues, use this repo's DB Dockerfile:

- Path: `YarneDB/Dockerfile`
- Base image: `mcr.microsoft.com/mssql/server:2019-latest`
- It pre-creates `/.system` and SQL directories with `mssql` user ownership before startup.
- In Railway DB service settings:
  - Source repo: this repository
  - Root directory: `YarneDB`

This is the most reliable workaround when SQL Server 2022 non-root startup conflicts with platform filesystem constraints.

## 3) Backend variables (exact format)

Set these in backend service (`mindful-flexibility`):

- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=http://0.0.0.0:8080`
- `DATABASE_URL=Server=${{server.RAILWAY_PRIVATE_DOMAIN}},${{server.RAILWAY_TCP_APPLICATION_PORT}};Database=Yarne1.0;User Id=sa;Password=${{server.MSSQL_SA_PASSWORD}};TrustServerCertificate=True;Encrypt=False;`
- `ConnectionStrings__DefaultConnection=Server=${{server.RAILWAY_PRIVATE_DOMAIN}},${{server.RAILWAY_TCP_APPLICATION_PORT}};Database=Yarne1.0;User Id=sa;Password=${{server.MSSQL_SA_PASSWORD}};TrustServerCertificate=True;Encrypt=False;`
- `Jwt__Issuer=YarneAPI`
- `Jwt__Audience=YarneApp`
- `Jwt__Secret=<new strong secret>`
- `Cors__AllowedOrigins__0=https://yarne-production.up.railway.app`

Notes:

- Do not wrap values in quotes.
- `JWT_SECRET` is now supported as fallback by backend code, but use `Jwt__Secret` as canonical.

## 4) Frontend variables

In frontend service (`Yarne`):

- `VITE_API_URL=https://mindful-flexibility-production.up.railway.app`

## 5) Database initialization order (SQL scripts)

After DB service is stable, initialize schema in this order:

1. `YarneDB/SQLQuery1.sql`
2. `YarneDB/Migrations/001_AddProductImage_Table.sql`
3. `YarneDB/Migrations/002_PromoteMaxToAdmin.sql`
4. `YarneDB/Migrations/003_AddColor_Table.sql`
5. `YarneDB/Migrations/004_AddProductColorImage.sql`
6. `YarneDB/Migrations/005_AddSizeAndColorSizeImageModel.sql`

Important:

- `YarneDB/SQLQuery1.sql` is now production-safe by default (`@ResetDatabase = 0`).
- Set `@ResetDatabase = 1` only for local destructive reset.

## 6) Verification checklist

1. DB logs: no `/.system` errors and SQL is listening.
2. Backend: `GET /healthz` returns 200.
3. Backend: `GET /api/products` returns 200.
4. Frontend loads products from production API URL.

