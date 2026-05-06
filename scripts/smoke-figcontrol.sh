#!/usr/bin/env bash
set -euo pipefail

WEB_URL="${FIGCONTROL_SMOKE_WEB_URL:-https://figcontrol-dev.matheusduarte.dev.br}"
API_URL="${FIGCONTROL_SMOKE_API_URL:-https://figcontrol-api-dev.matheusduarte.dev.br}"
SMOKE_EMAIL="${FIGCONTROL_SMOKE_EMAIL:-}"
SMOKE_PASSWORD="${FIGCONTROL_SMOKE_PASSWORD:-}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

curl_json() {
  curl -fsS --retry 3 --retry-delay 2 "$@"
}

echo "Smoke: API health em ${API_URL}"
HEALTH_FILE="${TMP_DIR}/health.json"
curl_json "${API_URL}/health" > "${HEALTH_FILE}"
FILE="${HEALTH_FILE}" node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
if (data.status !== "ok") {
  throw new Error("Health endpoint nao retornou status ok.");
}
'

echo "Smoke: Web manifest em ${WEB_URL}"
MANIFEST_FILE="${TMP_DIR}/manifest.json"
curl_json "${WEB_URL}/manifest.webmanifest" > "${MANIFEST_FILE}"
FILE="${MANIFEST_FILE}" node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
if (!data.name || !data.start_url) {
  throw new Error("Manifest PWA incompleto.");
}
'

echo "Smoke: catalogo publico"
CATALOG_FILE="${TMP_DIR}/catalog.json"
curl_json "${API_URL}/catalog/world-cup-2026" > "${CATALOG_FILE}"
FILE="${CATALOG_FILE}" node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
if (data.baseStickerCount !== 980) {
  throw new Error(`baseStickerCount esperado 980, recebido ${data.baseStickerCount}`);
}
if (data.trackedStickerCount !== 994) {
  throw new Error(`trackedStickerCount esperado 994, recebido ${data.trackedStickerCount}`);
}
if (!Array.isArray(data.sections) || data.sections.length < 49) {
  throw new Error("Catalogo sem secoes esperadas.");
}
'

if [ -z "${SMOKE_EMAIL}" ] || [ -z "${SMOKE_PASSWORD}" ]; then
  echo "Smoke: pulando fluxo autenticado porque FIGCONTROL_SMOKE_EMAIL/PASSWORD nao foram definidos."
  exit 0
fi

echo "Smoke: login autenticado"
LOGIN_BODY="$(
  SMOKE_EMAIL="${SMOKE_EMAIL}" SMOKE_PASSWORD="${SMOKE_PASSWORD}" node -e '
  process.stdout.write(JSON.stringify({
    email: process.env.SMOKE_EMAIL,
    password: process.env.SMOKE_PASSWORD
  }));
  '
)"
LOGIN_FILE="${TMP_DIR}/login.json"
curl_json -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${LOGIN_BODY}" > "${LOGIN_FILE}"

ACCESS_TOKEN="$(
  FILE="${LOGIN_FILE}" node -e '
  const fs = require("fs");
  const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
  if (!data.accessToken) throw new Error("Login sem accessToken.");
  process.stdout.write(data.accessToken);
  '
)"

echo "Smoke: colecao autenticada"
COLLECTION_FILE="${TMP_DIR}/collection.json"
curl_json "${API_URL}/me/collection/world-cup-2026" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" > "${COLLECTION_FILE}"
FILE="${COLLECTION_FILE}" node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
if (data.summary?.base?.total !== 980) {
  throw new Error("Resumo base autenticado inconsistente.");
}
if (data.summary?.tracked?.total !== 994) {
  throw new Error("Resumo total autenticado inconsistente.");
}
'

echo "Smoke: atualizacao de figurinha"
PATCH_FILE="${TMP_DIR}/patch.json"
curl_json -X PATCH "${API_URL}/me/collection/world-cup-2026/stickers/BRA20" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"quantity":2}' > "${PATCH_FILE}"
FILE="${PATCH_FILE}" node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
const sticker = data.sections
  ?.flatMap((section) => section.stickers)
  .find((item) => item.code === "BRA20");
if (!sticker || sticker.quantity !== 2) {
  throw new Error("BRA20 nao foi atualizado para quantity 2.");
}
'

echo "Smoke concluido com sucesso."
