#!/usr/bin/env bash
set -euo pipefail

DUMP_FILE="${1:-}"
DATABASE_NAME="${FIGCONTROL_RESTORE_DATABASE:-figcontrol_db}"
DATABASE_USER="${FIGCONTROL_RESTORE_USER:-postgres}"
POSTGRES_CONTAINER="$(
  docker ps -q -f "name=${FIGCONTROL_POSTGRES_CONTAINER_NAME:-postgres_postgres}" | head -n 1
)"

if [ -z "${DUMP_FILE}" ]; then
  echo "Uso: scripts/postgres-restore.sh caminho/backup.dump"
  exit 1
fi

if [ ! -f "${DUMP_FILE}" ]; then
  echo "Arquivo nao encontrado: ${DUMP_FILE}"
  exit 1
fi

if [ -z "${POSTGRES_CONTAINER}" ]; then
  echo "Container Postgres nao encontrado. Ajuste FIGCONTROL_POSTGRES_CONTAINER_NAME."
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "${DATABASE_NAME}" ]; then
  echo "Restauracao bloqueada. Rode com CONFIRM_RESTORE=${DATABASE_NAME} para confirmar."
  exit 1
fi

cat "${DUMP_FILE}" | docker exec -i "${POSTGRES_CONTAINER}" \
  pg_restore --clean --if-exists -U "${DATABASE_USER}" -d "${DATABASE_NAME}"

echo "Backup ${DUMP_FILE} restaurado em ${DATABASE_NAME}"
