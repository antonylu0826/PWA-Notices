#!/bin/sh
set -e

# Auto-enable on first run (no environment.json means not yet enabled)
if [ ! -f /zrok/.zrok/environment.json ]; then
  if [ -z "$ZROK_ENABLE_TOKEN" ]; then
    echo "[zrok] ERROR: ZROK_ENABLE_TOKEN is not set in .env"
    exit 1
  fi
  echo "[zrok] First run — enabling environment..."
  zrok enable "$ZROK_ENABLE_TOKEN"
  echo "[zrok] Environment enabled."
fi

echo "[zrok] Starting tunnel → http://client:80"
exec zrok share public --headless http://client:80
