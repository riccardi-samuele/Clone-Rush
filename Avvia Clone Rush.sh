#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT_NUMBER="${CLONE_RUSH_PORT:-18766}"
case "$PORT_NUMBER" in
  ''|*[!0-9]*) echo "CLONE_RUSH_PORT deve essere un numero." >&2; exit 1 ;;
esac
if (( PORT_NUMBER < 1 || PORT_NUMBER > 65535 )); then
  echo "La porta deve essere compresa tra 1 e 65535." >&2
  exit 1
fi
if [[ ! -f "$ROOT_DIR/dist/index.html" ]]; then
  cd "$ROOT_DIR"
  npm run build
fi
ADDRESS="http://127.0.0.1:$PORT_NUMBER/"
if RESPONSE="$(curl -fsS "$ADDRESS" 2>/dev/null)"; then
  if [[ "$RESPONSE" != *'<title>Clone Rush</title>'* ]]; then
    echo "La porta $PORT_NUMBER è occupata. Scegli un'altra CLONE_RUSH_PORT." >&2
    exit 1
  fi
else
  nohup python3 -m http.server "$PORT_NUMBER" --bind 127.0.0.1 --directory "$ROOT_DIR/dist" \
    >"/tmp/clone-rush-http-$PORT_NUMBER.log" 2>&1 &
  READY=0
  for ATTEMPT in {1..30}; do
    if RESPONSE="$(curl -fsS "$ADDRESS" 2>/dev/null)" && [[ "$RESPONSE" == *'<title>Clone Rush</title>'* ]]; then
      READY=1
      break
    fi
    sleep 0.2
  done
  if [[ "$READY" != 1 ]]; then
    echo "Server non disponibile. Consulta /tmp/clone-rush-http-$PORT_NUMBER.log." >&2
    exit 1
  fi
fi
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$ADDRESS" >/dev/null 2>&1 &
fi
echo "Clone Rush: $ADDRESS"
