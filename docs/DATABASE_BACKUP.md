# Database Backups — Yarne (Railway PostgreSQL)

## Do you need off-Railway backups?

**Yes.** Railway's managed PostgreSQL is reliable, but Railway itself is not a backup strategy:

- Railway's free/hobby tier does **not** include automatic point-in-time recovery.
- The paid tier includes some snapshots, but they are stored on Railway's infrastructure — a single point of failure.
- If you accidentally `DROP TABLE` or run a bad migration, Railway snapshots may not be granular enough to recover.

**Recommendation:** maintain your own periodic `pg_dump` exports stored in at least one location you control (encrypted local storage, S3, Google Drive, etc.).

---

## Railway built-in backup options

| Tier | What you get |
|------|--------------|
| Hobby / free | No automatic backups |
| Pro | Railway takes periodic snapshots (retention varies by plan) |
| Any | You can always run `pg_dump` manually or on a schedule |

Check your current plan at **Railway → Project → Settings → Backups** to see what is automatically retained.

Even on Pro, treat Railway snapshots as a "last resort" — keep independent exports.

---

## Taking a manual backup with `pg_dump`

### Prerequisites

- `pg_dump` installed locally (comes with PostgreSQL client tools)
  - Windows: install PostgreSQL from https://postgresql.org or `winget install PostgreSQL.PostgreSQL`
  - Mac: `brew install postgresql`
  - Linux: `apt install postgresql-client`
- `DATABASE_URL` from `secrets.md` (Railway → Postgres → Connect tab)

### One-off backup

```powershell
# PowerShell — replace with your real DATABASE_URL from secrets.md
$env:DATABASE_URL = "postgresql://user:password@host:port/dbname"

pg_dump $env:DATABASE_URL `
  --format=custom `
  --no-acl `
  --no-owner `
  --file="yarne_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

```bash
# Bash / Mac / Linux
DATABASE_URL="postgresql://user:password@host:port/dbname"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-acl \
  --no-owner \
  --file="yarne_backup_$(date +%Y%m%d_%H%M%S).dump"
```

`--format=custom` produces a compressed binary dump that is the most flexible for restore.

### Scheduled backup (Windows Task Scheduler — weekly example)

1. Save the script below as `backup-yarne.ps1` (outside the repo, with your real credentials):

```powershell
$env:DATABASE_URL = "postgresql://user:password@host:port/dbname"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = "C:\YarneBackups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
pg_dump $env:DATABASE_URL --format=custom --no-acl --no-owner --file="$outDir\yarne_$timestamp.dump"

# Keep only the last 8 backups
Get-ChildItem "$outDir\yarne_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 8 | Remove-Item
```

2. Open **Task Scheduler** → **Create Basic Task** → Weekly, run `powershell.exe -File "C:\path\backup-yarne.ps1"`.

---

## Restoring from a dump

> Test your restore procedure before you actually need it.

```bash
# Restore to a NEW database (safest — never overwrite production directly)
createdb yarne_restore_test --connection-string="postgresql://user:password@host:port/postgres"

pg_restore \
  --dbname="postgresql://user:password@host:port/yarne_restore_test" \
  --no-acl \
  --no-owner \
  --verbose \
  yarne_backup_20260101_120000.dump
```

High-level restore procedure for production:

1. Put the app in maintenance mode or scale API down to 0.
2. Create a new Railway Postgres service (or use the existing one if schema is intact).
3. Run `pg_restore` against the target database URL.
4. Verify data (spot-check products, orders, users).
5. Redeploy API.

---

## What NOT to do

- **Do not rely on "hard disk copy" on Railway.** Railway containers are ephemeral; there is no persistent local filesystem on the Postgres node that you can zip and copy.
- **Do not store unencrypted dumps in a public location.** Dumps contain all customer emails, order history, and hashed passwords. Encrypt with `gpg` or store in a private, access-controlled location.
- **Do not commit `DATABASE_URL` or dump files to the repo.**

---

## Recommended backup strategy

| Frequency | Method | Storage |
|-----------|--------|---------|
| Weekly (minimum) | `pg_dump --format=custom` | Encrypted folder on your machine + cloud storage (Google Drive, S3, etc.) |
| Before every major migration or deploy | `pg_dump --format=custom` | Local drive |
| Railway Pro automatic | Built-in snapshots | Railway infrastructure (secondary only) |

Store at least **two independent copies** in different locations.
