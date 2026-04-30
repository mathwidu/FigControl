#!/bin/sh
set -eu

file_env() {
  var="$1"
  file_var="${var}_FILE"

  var_value="$(printenv "$var" 2>/dev/null || true)"
  file_value="$(printenv "$file_var" 2>/dev/null || true)"

  if [ -n "$var_value" ] && [ -n "$file_value" ]; then
    echo "error: both $var and $file_var are set" >&2
    exit 1
  fi

  if [ -n "$file_value" ]; then
    if [ ! -r "$file_value" ]; then
      echo "error: $file_var points to unreadable file: $file_value" >&2
      exit 1
    fi
    value="$(tr -d '\r\n' < "$file_value")"
    export "$var=$value"
    unset "$file_var"
  fi
}

file_env DATABASE_URL
file_env JWT_ACCESS_SECRET
file_env JWT_REFRESH_SECRET
file_env FIGCONTROL_EMAIL_RESEND_API_KEY

npm exec -- prisma migrate deploy --schema prisma/schema.prisma
node dist/prisma/seed.js

exec "$@"
