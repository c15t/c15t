#!/usr/bin/env bash
# Build the cold-start consumers from packed c15t artifacts.
#
#   prepare.sh <built-c15t-checkout | directory of packed tarballs>
#
# Packs the published packages (or reuses tarballs named c15t.tgz,
# c15t-core.tgz, ...), installs them into a copy of harness/consumer outside
# the workspace, runs `next build`, builds the no-c15t baseline, and clones
# the output into independent server directories so warm and cold processes
# never share a `.next/cache`:
#
#   $COLD_BENCH_DIR/builds/{D-warm,D-cold,S-warm,S-cold,baseline}
#
# COLD_BENCH_DIR defaults to /tmp/c15t-cold-start.
set -euo pipefail

HARNESS=$(cd "$(dirname "$0")" && pwd)
SOURCE=$(cd "$1" && pwd)
WORK=${COLD_BENCH_DIR:-/tmp/c15t-cold-start}

rm -rf "$WORK/consumer" "$WORK/consumer-baseline" "$WORK/builds"
mkdir -p "$WORK/consumer" "$WORK/builds"
cp -R "$HARNESS/consumer/." "$WORK/consumer/"
mv "$WORK/consumer/package.template.json" "$WORK/consumer/package.json"
mkdir -p "$WORK/consumer/tarballs"

if [ -f "$SOURCE/c15t.tgz" ]; then
	cp "$SOURCE"/*.tgz "$WORK/consumer/tarballs/"
else
	for pkg in c15t core react nextjs ui vue tanstack-start schema translations iab dev-tools; do
		(cd "$SOURCE/packages/$pkg" && bun pm pack --ignore-scripts --destination "$WORK/consumer/tarballs" >/dev/null)
	done
	# Stable names so the consumer's overrides never change between builds.
	for f in "$WORK/consumer/tarballs"/*.tgz; do
		name=$(basename "$f" | sed -E 's/-[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?\.tgz$//')
		mv "$f" "$WORK/consumer/tarballs/$name.tgz"
	done
	git -C "$SOURCE" rev-parse HEAD > "$WORK/consumer/tarballs/SOURCE_SHA"
fi

cd "$WORK/consumer"
npm install --no-audit --no-fund --loglevel=error
NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build

# The same app with every c15t import removed.
mkdir -p "$WORK/consumer-baseline"
cp -R app public fixture instrumentation.ts next.config.mjs package.json tsconfig.json node_modules tarballs "$WORK/consumer-baseline/"
cd "$WORK/consumer-baseline"
rm -rf app/c15t app/server-consent.tsx app/consent-manager.tsx app/probe.tsx app/mark-*.ts
cp -R "$HARNESS/baseline/app/." app/
NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build

clone() {
	local from=$1 to=$2
	mkdir -p "$WORK/builds/$to"
	cp -R "$from/.next" "$from/node_modules" "$from/app" "$from/public" "$from/fixture" \
		"$from/package.json" "$from/next.config.mjs" "$from/instrumentation.ts" "$WORK/builds/$to/"
}
for b in D-warm D-cold S-warm S-cold; do
	clone "$WORK/consumer" "$b"
done
clone "$WORK/consumer-baseline" baseline
echo "built consumers in $WORK/builds"
