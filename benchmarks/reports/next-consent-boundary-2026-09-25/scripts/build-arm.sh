#!/usr/bin/env bash
# Build one layout arm of the paint consumer. Only components/arm.tsx differs
# between arms.
# Usage: build-arm.sh <work-dir> <label> <arm a|b|c|e> <cacheComponents 1|0>
#   a: browser initialization, no server resolution
#   b: resolveConsent awaited inside a page-wide <Suspense fallback={null}>
#   c: the pending resolveConsent promise passed to the provider
#   e: resolveConsent awaited in an async layout, no Suspense (cacheComponents 0 only)
set -euo pipefail
WORK="$(cd "$1" && pwd)"
LABEL="$2"
ARM="$3"
CC="$4"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$WORK/builds/$LABEL"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$HERE/consumer/." "$DEST/"
rm -rf "$DEST/arms"
mv "$DEST/package.template.json" "$DEST/package.json"
mv "$DEST/tsconfig.template.json" "$DEST/tsconfig.json"
cp "$HERE/consumer/arms/$ARM.tsx" "$DEST/components/arm.tsx"
# APFS/reflink clone where available; a plain copy elsewhere.
cp -cR "$WORK/node_modules" "$DEST/node_modules" 2>/dev/null ||
	cp -R "$WORK/node_modules" "$DEST/node_modules"
cd "$DEST"
printf '%s\n' "arm=$ARM cacheComponents=$CC c15t=$(cat "$WORK/tarballs/SOURCE_SHA")" > BUILD_INFO
BENCH_CACHE_COMPONENTS="$CC" ./node_modules/.bin/next build > "$WORK/builds/$LABEL.build.log" 2>&1
grep -E '^[├└┌] ' "$WORK/builds/$LABEL.build.log"
