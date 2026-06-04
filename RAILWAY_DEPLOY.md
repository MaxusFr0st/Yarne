# Railway Deployment (Yarne) — PostgreSQL + Code-First

This runbook matches the current stack:

- **Frontend**: `YarneFront/` (Vite → `serve` on port 8080)
- **Backend**: `YarneBack/YarneAPIBack/YarneAPIBack/` (.NET 9, Npgsql, EF migrations on startup)
- **Database**: Railway **PostgreSQL** plugin (no SQL Server container, no `YarneDB/*.sql` for deploy)

## Railway services (3)

| Service | Root directory | Config file |
|---------|----------------|-------------|
| **Postgres** | (Railway plugin) | — |
| **API** | `YarneBack/YarneAPIBack/YarneAPIBack` | `railway.toml` |
| **Frontend** | `YarneFront` | `railway.toml` |

## Deploy files in this repo

| File | Role |
|------|------|
| `YarneBack/.../railway.toml` | Docker build, health check `GET /healthz`, restart on failure |
| `YarneFront/railway.toml` | Docker build, health check `GET /`, restart on failure |
| `YarneBack/.../Dockerfile` | Multi-stage .NET publish, `PORT` + `ASPNETCORE_URLS` |
| `YarneFront/Dockerfile` | Vite build with `VITE_API_URL`, static `serve` |
| `railway.env.example` | Variable template (no real secrets) |

## .NET classes / mechanisms (Railway parity)

| Class | Mechanism |
|-------|-----------|
| `RailwayDatabaseConfiguration` | Resolves `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `PG*`, or appsettings; rejects unresolved `${{...}}` and SQL Server strings; sets SSL for public hosts |
| `PostgresConnection` | Normalizes `postgres://` URLs → Npgsql connection string |
| `DatabaseStartup` | Retries `MigrateAsync()` until Postgres is ready |
| `ProductionStartupValidator` | Fails fast in Production if `Jwt__Secret` is missing/weak |
| `SeedData` | Dev-only sample products (skipped in Production) |
| `Program.cs` | Binds `PORT`, `GET /healthz`, forwarded headers, CORS, JWT (`JWT_SECRET` fallback) |

Schema is applied by **EF Core migrations** (`Data/Migrations/`) on API startup — not by SQL scripts.

## 1) Create Postgres on Railway

1. In your project: **+ New** → **Database** → **PostgreSQL**.
2. On the **API** service → **Variables** → **Add variable reference** → select Postgres → **`DATABASE_URL`**.
3. Do **not** use a raw `${{Postgres.DATABASE_URL}}` string unless it is linked; unresolved `${{...}}` is ignored by the API.

## 2) Backend service (API)

**Settings**

- **Root Directory**: `YarneBack/YarneAPIBack/YarneAPIBack`
- **Builder**: Dockerfile (from `railway.toml`)

### Link Postgres (required — fixes startup crash)

1. Open **API** (`mindful-flexibility`) → **Variables**.
2. **Delete** `DATABASE_URL` completely (logs show it still resolves to SQL Server `Server=...`, not Postgres).
3. **Delete** `ConnectionStrings__DefaultConnection`.
4. **New variable** → **Variable Reference** → Service: **Postgres** → Variable: **`DATABASE_URL`**.
   - In Railway, open the variable and confirm the value starts with **`postgresql://`** (not `Server=`).
5. **Alternative:** add 5 references from Postgres: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`.
6. **Frontend** (`Yarne`): delete `DATABASE_URL`; keep only `VITE_API_URL`.
7. Redeploy API.

Do **not** paste `${{Postgres.DATABASE_URL}}` as plain text unless it is a linked reference (unresolved `${{...}}` is ignored).

**Variables** (see `railway.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Reference from linked Postgres (required) |
| `ASPNETCORE_ENVIRONMENT` | `Production` (also set in Dockerfile) |
| `ASPNETCORE_URLS` | `http://0.0.0.0:8080` (optional; `PORT` is also honored) |
| `Jwt__Issuer` | `YarneAPI` |
| `Jwt__Audience` | `YarneApp` |
| `Jwt__Secret` | Strong secret, ≥ 32 chars (or `JWT_SECRET`) |
| `Cors__AllowedOrigins__0` | `https://<your-frontend-domain>` |

Do **not** wrap values in quotes.

**Health check**: Railway uses `GET /healthz` → `{"status":"ok"}`. The API now starts listening **before** DB migrations, so deploy health checks pass even while migrations run.

**After deploy**: Check logs for `Database migrations applied successfully.` and `Catalog seed completed.`

### Seed data (automatic)

On startup, if the database has **no products**, the API seeds (from `YarneDB/SQLQuery1.sql`):

- 6 products with images, colors, sizes, variant stock
- Roles, countries, payment methods, categories, collections

**Admin user** (if no admin exists yet):

| Field | Value |
|-------|--------|
| Email | `max@gmail.com` |
| Username | `maxadmin` |
| Password | `Millenium2468` (override with `APP_SEED_ADMIN_PASSWORD` on Railway) |

To **re-run seed** on an empty catalog: ensure `Product` table is empty, then redeploy API.

To **change admin password** after first seed: set `APP_SEED_ADMIN_PASSWORD` and redeploy (only applies when no admin role exists yet), or reset via DB / register flow.

## 3) Frontend service

**Settings**

- **Root Directory**: `YarneFront`

**Variables**

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | `https://<your-api-domain>` (no trailing slash) |

Rebuild/redeploy frontend after changing this (baked into Vite build).

**Health check**: `GET /` (static index).

## 4) Verification

1. API: `GET https://<api>/healthz` → 200
2. API: `GET https://<api>/api/products` → 200 (needs DB + migrations)
3. Frontend loads and calls the API URL from `VITE_API_URL`

## 5) Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| API crash on startup: “No PostgreSQL connection configured” | `DATABASE_URL` missing or still `${{...}}` unresolved — use **variable reference** from Postgres |
| `/healthz` OK, `/api/*` 500 | DB not linked, migrations failed, or wrong credentials |
| `Format of the initialization string... index 0` | `DATABASE_URL` is not a Postgres URL (often still SQL Server `Server=...`, or value wrapped in quotes). Link Postgres reference; value must start with `postgresql://` |
| CORS errors | `Cors__AllowedOrigins__0` must match exact frontend origin (scheme + host) |
| Frontend calls wrong API | `VITE_API_URL` wrong or frontend not redeployed after change |

## 6) Local vs Railway

- **Local `appsettings`**: still has SQL Server-style `DefaultConnection` for legacy/local use; **do not rely on it on Railway**.
- **Railway**: always use linked **`DATABASE_URL`** (Postgres).

## 7) Deprecated (old SQL Server deploy)

Do **not** deploy `YarneDB/Dockerfile` or run `YarneDB/SQLQuery1.sql` for production anymore unless you intentionally maintain a SQL Server fork.
