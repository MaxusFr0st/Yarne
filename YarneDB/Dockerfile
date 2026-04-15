FROM mcr.microsoft.com/mssql/server:2019-latest

USER root

# Railway can run SQL Server 2022 as non-root; some environments fail when sqlservr
# tries to create '/.system'. Pre-create both expected locations with mssql ownership.
RUN mkdir -p /.system /var/opt/mssql/.system /var/opt/mssql/data /var/opt/mssql/log /var/opt/mssql/backups \
    && chown -R 10001:0 /.system /var/opt/mssql \
    && chmod -R g=u /.system /var/opt/mssql

ENV HOME=/var/opt/mssql
ENV MSSQL_DATA_DIR=/var/opt/mssql/data
ENV MSSQL_LOG_DIR=/var/opt/mssql/log
ENV MSSQL_BACKUP_DIR=/var/opt/mssql/backups

USER 10001

EXPOSE 1433

CMD ["/opt/mssql/bin/sqlservr"]
