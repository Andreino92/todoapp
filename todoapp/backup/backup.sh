#!/bin/bash
# Backup automatico de la base de datos SQL Server (correr via cron).
# Ejemplo de crontab (todos los dias a las 3 AM):
# 0 3 * * * /opt/todoapp/backup/backup.sh >> /opt/todoapp/backup/backup.log 2>&1

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$(pwd)/backup/files"
mkdir -p "$BACKUP_DIR"

# Asegura que exista la carpeta de backups dentro del contenedor
docker exec todo_sqlserver mkdir -p /var/opt/mssql/backup

# Genera el backup dentro del contenedor
docker exec todo_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$DB_PASSWORD" -C \
  -Q "BACKUP DATABASE tododb TO DISK = N'/var/opt/mssql/backup/tododb_$TIMESTAMP.bak' WITH FORMAT"

# Copia el .bak fuera del contenedor, al host
docker cp "todo_sqlserver:/var/opt/mssql/backup/tododb_$TIMESTAMP.bak" "$BACKUP_DIR/"

# Borra backups locales de mas de 7 dias (retencion simple)
find "$BACKUP_DIR" -name "*.bak" -mtime +7 -delete

echo "[$(date)] Backup completado: tododb_$TIMESTAMP.bak"
