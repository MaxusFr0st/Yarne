# Running Yarne with Docker

## Quick Start

From the `YarneBack/YarneAPIBack` directory:

```bash
docker compose up -d --build
```

**First run can take 1–2 minutes** (SQL Server startup + init).

This starts:
- **SQL Server** on port 1433
- **DB init** (runs schema + seed, retries until ready)
- **API** on port 8080

## Frontend

The frontend defaults to `http://localhost:8080` (Docker API port).

- **With Docker**: Use default or `VITE_API_URL=http://localhost:8080`
- **With local VS/dotnet run**: Create `.env` with `VITE_API_URL=http://localhost:5000`

```bash
cd YarneFront
npm run dev
```

## Swagger

- **Docker**: Manually open **http://localhost:8080/swagger** (browser does not auto-open)
- **VS**: Swagger opens automatically when you run the backend (F5 / Start Debugging)

## Troubleshooting

### "Cannot open database Yarne1.0" / "Login failed for user sa"
The database was not created before the API started. Fix:

1. **Clean start** (removes existing DB):
   ```bash
   docker compose down -v
   docker compose up -d --build
   ```

2. Wait 1–2 minutes, then check:
   ```bash
   docker compose logs db-init
   ```
   You should see "Database initialized successfully". If you see errors, db-init failed.

3. Verify the database exists:
   ```bash
   docker exec yarne-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YarneStrong123!' -C -Q "SELECT name FROM sys.databases"
   ```

### Backend doesn't start
1. Ensure DB is healthy: `docker compose ps` — db should show "healthy"
2. Check logs: `docker compose logs api` and `docker compose logs db-init`
3. Run init manually if needed:
   ```bash
   docker cp ../../YarneDB/SQLQuery1.sql yarne-db:/tmp/SQLQuery1.sql
   docker exec yarne-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YarneStrong123!' -C -i /tmp/SQLQuery1.sql
   docker compose restart api
   ```

### Connection refused on frontend
- Backend must be running (Docker or VS)
- Docker API: port 8080
- Local dotnet run: port 5000
