#!/usr/bin/env bash
# Serve a built arm with optional backend latency or a failing manifest.
# Usage: serve.sh <work-dir> <label> <port> [latencyMs] [500|hang]
# Stop: kill $(lsof -t -iTCP:<port> -sTCP:LISTEN)
set -euo pipefail
WORK="$(cd "$1" && pwd)"
LABEL="$2"
PORT="$3"
LATENCY="${4:-0}"
FAIL="${5:-}"
cd "$WORK/builds/$LABEL"
# `next start` renames its process to "next-server", so stop by port.
for pid in $(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null); do
	kill "$pid" 2>/dev/null || true
done
for _ in $(seq 1 50); do
	lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
	sleep 0.1
done
if [ -n "$FAIL" ]; then
	export C15T_BENCH_MANIFEST_FAIL="$FAIL"
fi
export C15T_BENCH_INIT_LATENCY_MS="$LATENCY"
(nohup ./node_modules/.bin/next start -H 127.0.0.1 -p "$PORT" < /dev/null > "$WORK/builds/$LABEL.$PORT.log" 2>&1 &)
for _ in $(seq 1 100); do
	if curl -s --max-time 2 -o /dev/null "http://127.0.0.1:$PORT/api/bench-consent/stats"; then
		echo "serving $LABEL on http://127.0.0.1:$PORT latency=$LATENCY fail=$FAIL"
		exit 0
	fi
	sleep 0.2
done
echo "server for $LABEL did not start; see $WORK/builds/$LABEL.$PORT.log" >&2
exit 1
