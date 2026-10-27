#!/usr/bin/env bash
# Fails unless database, redis and storage are ok. HTTP 200 is not enough.
set -euo pipefail
URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "usage: verify-health.sh <health-url>" >&2
  exit 1
fi

BODY=""
for _ in $(seq 1 24); do
  if BODY="$(curl -fsS --max-time 20 "$URL" 2>/dev/null)"; then
    break
  fi
  sleep 5
done
if [[ -z "$BODY" ]]; then
  echo "health URL did not respond" >&2
  exit 1
fi

check_json() {
  python3 -c 'import json,os,sys
b=json.loads(os.environ["BODY"])
c=b.get("checks") or {}
missing=[n for n in ("database","redis","storage") if c.get(n)!="ok"]
if missing:
    print("health checks failed: " + ",".join(missing), file=sys.stderr)
    sys.exit(1)'
}

if command -v python3 >/dev/null 2>&1; then
  BODY="$BODY" check_json
elif command -v node >/dev/null 2>&1; then
  BODY="$BODY" node -e 'const b=JSON.parse(process.env.BODY); const c=b.checks||{}; const m=["database","redis","storage"].filter((n)=>c[n]!=="ok"); if(m.length){console.error("health checks failed: "+m.join(",")); process.exit(1)}'
else
  echo "python3 or node is required to parse health JSON" >&2
  exit 1
fi
echo "health ok"
