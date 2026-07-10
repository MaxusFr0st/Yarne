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
| `SeedData` | Catalog seed (always) + first-time admin from env vars (never resets passwords on redeploy) |
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
| `APP_SEED_ADMIN_EMAIL` | First-deploy admin email (optional, ignored once any admin exists) |
| `APP_SEED_ADMIN_PASSWORD` | First-deploy admin password, min 12 chars (optional, never re-applied) |
| `ADMIN_BOOTSTRAP_TOKEN` | Random secret ≥ 32 chars for `POST /api/admin/bootstrap` one-time endpoint (optional) |

Do **not** wrap values in quotes.

**Health check**: Railway uses `GET /healthz` → `{"status":"ok"}`. The API now starts listening **before** DB migrations, so deploy health checks pass even while migrations run.

**After deploy**: Check logs for `Database migrations applied successfully.` and `Catalog seed completed.`

### Seed data (automatic)

On startup, if the database has **no products**, the API seeds (from `YarneDB/SQLQuery1.sql`):

- 6 products with images, colors, sizes, variant stock
- Roles, countries, payment methods, categories, collections

**Admin user** — no hardcoded credentials. Use one of these four approaches:

#### Option 1 — Env seed on first deploy (recommended for automated setups)

Set both variables **before** first deploy. The API creates the admin user once; it will never reset or overwrite the password on subsequent deploys.

| Variable | Requirement |
|----------|-------------|
| `APP_SEED_ADMIN_EMAIL` | any valid email |
| `APP_SEED_ADMIN_PASSWORD` | min 12 chars |

Once an admin exists in the DB, these variables are ignored even if present.

#### Option 2 — Bootstrap token endpoint (one-time, any time)

Set a strong random token (min 32 chars) in `ADMIN_BOOTSTRAP_TOKEN`, then POST once:

```
POST /api/admin/bootstrap
X-Admin-Bootstrap-Token: <your token>
Content-Type: application/json

{ "email": "you@example.com", "password": "StrongPass123!" }
```

Returns 403 immediately after the first admin exists. Rate-limited like `/api/auth/login`.

#### Option 3 — SQL script (manual promotion, no password involved)

Run against Railway's Postgres (open **Connect** → copy `DATABASE_URL`):

```bash
psql "$DATABASE_URL" -v email='you@example.com' -f YarneDB/scripts/promote-user-to-admin.sql
```

The user must already exist in `Customer` (registered via the app). The script is idempotent.

#### Option 4 — Existing admin promotes via API

```
POST /api/users/{id}/roles/admin        # grant Admin role
DELETE /api/users/{id}/roles/admin      # revoke (cannot demote yourself)
```

Requires a valid Admin JWT in `Authorization: Bearer <token>`.

---

To **re-run catalog seed** on an empty catalog: ensure `Product` table is empty, then redeploy API.

## 3) Frontend service

**Settings**

- **Root Directory**: `YarneFront`

**Variables**

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | `https://<your-api-domain>` (no trailing slash) — **required**. Without it, `/uploads/...` images load from the frontend host and show placeholders on phones/tablets. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client ID (optional — hides Google button if unset) |
| `VITE_APPLE_CLIENT_ID` | Apple Services ID (optional) |
| `VITE_APPLE_REDIRECT_URI` | Frontend origin, e.g. `https://yarne-production.up.railway.app` (optional) |

Rebuild/redeploy frontend after changing any `VITE_*` variable (baked into the Docker build via `YarneFront/Dockerfile` `ARG`/`ENV`).

**Example:** if API is `https://mindful-flexibility-production.up.railway.app`, set exactly that on the **Yarne** frontend service (not on Postgres).

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

## 6) Admin uploads & persistent images

Uploaded images are stored under `wwwroot/uploads` on the API container. **Railway’s filesystem is ephemeral** unless you attach a volume.

1. In the API service → **Volumes** → mount path: `/app/wwwroot/uploads` (or your container’s `wwwroot/uploads` path).
2. Redeploy the API after adding the volume.

Without a volume, uploads disappear after redeploy and are **not shared** across multiple API instances.

**Storefront layout** (carousel, home sections, featured showcase / “Editorial Picks”) is stored in Postgres via `AppSetting` and syncs across devices after admin saves.

**One-time sync after deploy:** open **Admin** on the computer that shows the correct Editorial Picks layout (while logged in as admin). The app will upload that browser’s layout to the server automatically if the server has no config yet. Then hard-refresh other devices (or clear site data once).

## 7) Local vs Railway

- **Local `appsettings`**: still has SQL Server-style `DefaultConnection` for legacy/local use; **do not rely on it on Railway**.
- **Railway**: always use linked **`DATABASE_URL`** (Postgres).

## 8) Deprecated (old SQL Server deploy)

Do **not** deploy `YarneDB/Dockerfile` or run `YarneDB/SQLQuery1.sql` for production anymore unless you intentionally maintain a SQL Server fork.
