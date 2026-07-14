#!/bin/bash
# Ejecutar UNA SOLA VEZ, despues del primer "docker compose up -d",
# para crear la base de datos dentro del contenedor de SQL Server.
set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "Error: variable DB_PASSWORD no definida. Verifica tu archivo .env"
  exit 1
fi

echo "Esperando a que SQL Server este listo..."
sleep 5

docker exec -it todo_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$DB_PASSWORD" -C \
  -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'tododb') CREATE DATABASE tododb"

echo "Base de datos 'tododb' creada (o ya existia). Reinicia el backend si hace falta:"
echo "  docker compose restart backend"
