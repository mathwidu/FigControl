#!/usr/bin/env bash
set -euo pipefail

DATABASE_NAME="${FIGCONTROL_BACKUP_DATABASE:-figcontrol_db}"
DATABASE_USER="${FIGCONTROL_BACKUP_USER:-postgres}"
BACKUP_DIR="${FIGCONTROL_BACKUP_DIR:-backups}"
POSTGRES_CONTAINER="$(
  docker ps -q -f "name=${FIGCONTROL_POSTGRES_CONTAINER_NAME:-postgres_postgres}" | head -n 1
)"

if [ -z "${POSTGRES_CONTAINER}" ]; then
  echo "Container Postgres nao encontrado. Ajuste FIGCONTROL_POSTGRES_CONTAINER_NAME."
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_$(date +%Y%m%d_%H%M%S).dump"

docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${DATABASE_USER}" -Fc "${DATABASE_NAME}" > "${BACKUP_FILE}"

echo "Backup criado em ${BACKUP_FILE}"
