#!/bin/bash
set -e
echo "=== Yarne DB Init ==="

# Wait for SQL Server to accept connections (healthcheck can pass before DB is fully ready)
for i in $(seq 1 30); do
  if /opt/mssql-tools18/bin/sqlcmd -S db -U sa -P "${MSSQL_SA_PASSWORD}" -C -Q "SELECT 1" -b -o /dev/null 2>/dev/null; then
    echo "SQL Server is ready (attempt $i)"
    break
  fi
  echo "Waiting for SQL Server... ($i/30)"
  sleep 3
  if [ $i -eq 30 ]; then
    echo "ERROR: SQL Server did not become ready in time"
    exit 1
  fi
done

# Extra buffer for first-run model upgrades
sleep 5

echo "Running schema script..."
if /opt/mssql-tools18/bin/sqlcmd -S db -U sa -P "${MSSQL_SA_PASSWORD}" -C -i /tmp/SQLQuery1.sql -b; then
  echo "=== Database initialized successfully ==="
  exit 0
else
  echo "ERROR: Schema script failed"
  exit 1
fi
