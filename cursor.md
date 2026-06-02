# YarneApp — Project Context (for Cursor / future me)

## 1) Repo overview

This repository is a full-stack app with:

- **Frontend (React/Vite)**: `YarneFront/`
- **Backend (.NET 9 API)**: `YarneBack/YarneAPIBack/YarneAPIBack/`
- **Database scripts (SQL Server)**: `YarneDB/`

It is designed to run locally via Docker Compose (backend + SQL Server) and deploy to Railway as multiple services.

## 2) Frontend

### Location
- `YarneFront/`

### Build & runtime
- Dockerfile: `YarneFront/Dockerfile`
  - Builds Vite app
  - Serves `dist/` via `serve` on port `8080`

### API base URL logic
- `YarneFront/src/app/api/base.ts`
  - Uses `VITE_API_URL` if provided (normalizes missing scheme / removes quotes).
  - Local fallback uses `http://localhost:8080`.
  - Production fallback is same-origin if `VITE_API_URL` missing.

### Important Railway variable
- `VITE_API_URL=https://<backend-public-domain>`

## 3) Backend

### Location
- `YarneBack/YarneAPIBack/YarneAPIBack/`

### Docker
- `YarneBack/YarneAPIBack/YarneAPIBack/Dockerfile`
  - Builds/publishes .NET 9
  - Exposes `8080`

### Core startup logic (key file)
- `YarneBack/YarneAPIBack/YarneAPIBack/Program.cs`

Important behavior added/confirmed during deployment troubleshooting:

- **Railway port binding**
  - Reads `PORT` and binds `http://0.0.0.0:$PORT` when present.
- **DB connection string sources**
  - Prefers `DATABASE_URL`
  - Falls back to `ConnectionStrings:DefaultConnection`
  - Rejects `Trusted_Connection`/IntegratedSecurity in production.
- **SQL Server flags**
  - Ensures `TrustServerCertificate=True` and `Encrypt=False` if not present.
- **Startup DB patch**
  - There is a startup SQL patch for column `[Order].EstimatedDelivery`.
  - It retries (transient startup), and in production it does **not** block app startup forever.
- **Health endpoint**
  - `GET /healthz` returns `{ "status": "ok" }` even if DB is down. Useful to separate “app up” vs “DB reachable”.
- **JWT secret compatibility**
  - Canonical is `Jwt__Secret`.
  - Legacy env var `JWT_SECRET` is accepted as a fallback.

### CORS
Backend uses config section `Cors:AllowedOrigins` (array). On Railway, easiest is:

- `Cors__AllowedOrigins__0=https://<frontend-public-domain>`

## 4) Database

### Type
- Microsoft SQL Server in a container.

### Schema / seed strategy
This project does **not** use EF Core migrations (no `Migrations/*.cs`).
Instead it uses:

- **Baseline schema + seed**: `YarneDB/SQLQuery1.sql`
- **Incremental SQL migrations**: `YarneDB/Migrations/*.sql`

Migration scripts found:
- `YarneDB/Migrations/001_AddProductImage_Table.sql`
- `YarneDB/Migrations/002_PromoteMaxToAdmin.sql`
- `YarneDB/Migrations/003_AddColor_Table.sql`
- `YarneDB/Migrations/004_AddProductColorImage.sql`
- `YarneDB/Migrations/005_AddSizeAndColorSizeImageModel.sql`

### Baseline script safety
`YarneDB/SQLQuery1.sql` originally dropped the DB unconditionally. It was updated to be safer:

- Adds `DECLARE @ResetDatabase BIT = 0;`
- Only drops DB if `@ResetDatabase = 1`

### Local Docker Compose
`YarneBack/YarneAPIBack/docker-compose.yml`:
- Starts SQL Server 2022 container
- `db-init` runs baseline SQL script on first run
- API connects to `Server=db;Database=Yarne1.0;User Id=sa;Password=...`

## 5) Railway deployment model (target)

Railway services:

1) **Frontend service**
   - Builds `YarneFront`
   - Env: `VITE_API_URL=https://<backend-public-domain>`

2) **Backend service**
   - Builds `YarneBack/YarneAPIBack/YarneAPIBack`
   - Needs DB connection string + JWT + CORS

3) **DB service**
   - SQL Server container
   - Prefer private networking for app-to-db traffic.

## 6) Important Railway variables (known working shapes)

### Frontend
- `VITE_API_URL=https://<backend-public-domain>`

### Backend (minimum)
- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=http://0.0.0.0:8080`
- `DATABASE_URL=Server=server.railway.internal,1433;Database=Yarne1.0;User Id=sa;Password=<pwd>;TrustServerCertificate=True;Encrypt=False;`
- `ConnectionStrings__DefaultConnection=<same as DATABASE_URL>`
- `Jwt__Issuer=YarneAPI`
- `Jwt__Audience=YarneApp`
- `Jwt__Secret=<strong secret>` (or legacy `JWT_SECRET`)
- `Cors__AllowedOrigins__0=https://<frontend-public-domain>`

### DB
- `ACCEPT_EULA=Y`
- `MSSQL_PID=Developer`
- `MSSQL_SA_PASSWORD=<pwd>`

## 7) Railway-specific incident history (what happened)

### Symptoms
- Frontend deployed OK.
- Backend initially returned `502` from Railway edge.
  - Root cause: backend process crashed during startup DB SQL call.
  - Fix: backend startup now retries and does not hard-crash production startup for DB patch.
- After backend remained up, API endpoints returned `500` (DB unreachable).

### SQL Server on Railway issues
The DB container repeatedly failed with:

- `/.system could not be created ... Permission denied`

Workarounds attempted/added to repo:

- Custom SQL Server Dockerfile(s) in `YarneDB/` to influence startup behavior.
- Switched base image between SQL Server 2022 and 2019.

Important: some Railway plans with low memory (e.g., ~1GB) may be insufficient for reliable SQL Server startup/handshake.

### External DB access (SSMS/sqlcmd)
Using Railway TCP proxy and connecting from local machine resulted in:

- SSMS: pre-login handshake `10054`
- `sqlcmd` with ODBC 13 and ODBC 17: pre-login failure / connection forcibly closed

This indicates the DB service wasn’t reliably accepting pre-login, or the platform/proxy + SQL Server container combination was unstable under constraints.

## 8) How to initialize DB (when reachable)

Once you can connect to SQL Server (SSMS or `sqlcmd`), run scripts in order:

1. `YarneDB/SQLQuery1.sql`  (baseline schema + seed)
2. `YarneDB/Migrations/001_AddProductImage_Table.sql`
3. `YarneDB/Migrations/002_PromoteMaxToAdmin.sql`
4. `YarneDB/Migrations/003_AddColor_Table.sql`
5. `YarneDB/Migrations/004_AddProductColorImage.sql`
6. `YarneDB/Migrations/005_AddSizeAndColorSizeImageModel.sql`

## 9) Local verification endpoints

- Backend health (no DB required): `GET /healthz`
- Example API: `GET /api/products` (requires DB)

## 10) Files added/edited during deployment help (in this workspace)

- Added: `RAILWAY_DEPLOY.md` (deployment runbook)
- Added: `YarneDB/Dockerfile` (DB build in Railway repo mode)
- Edited: `YarneDB/SQLQuery1.sql` (safe reset toggle)
- Edited: `YarneBack/YarneAPIBack/YarneAPIBack/Program.cs` (Railway PORT + DB env + retry + /healthz + JWT_SECRET fallback)

