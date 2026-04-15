FROM mcr.microsoft.com/mssql/server:2019-latest

# Use the official startup behavior for SQL Server 2019.
# Railway variables (ACCEPT_EULA, MSSQL_PID, MSSQL_SA_PASSWORD) are provided in service settings.
EXPOSE 1433

CMD ["/opt/mssql/bin/sqlservr"]
