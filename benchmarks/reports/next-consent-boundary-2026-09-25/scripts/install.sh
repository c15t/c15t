#!/usr/bin/env bash
# Pack c15t from a built checkout and install the paint consumer against the
# tarballs, outside the workspace, so it resolves the published exports map.
# Usage: install.sh <built-c15t-checkout> <work-dir>
# Build the checkout first: bun turbo run build --filter=c15t --filter=@c15t/dev-tools
set -euo pipefail
REPO="$(cd "$1" && pwd)"
WORK="$2"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$WORK/tarballs"
for pkg in c15t core react nextjs ui vue tanstack-start schema translations iab dev-tools; do
	(cd "$REPO/packages/$pkg" && bun pm pack --ignore-scripts --destination "$WORK/tarballs" >/dev/null)
done
# Stable names so package.json overrides never change between checkouts.
for f in "$WORK"/tarballs/*.tgz; do
	base=$(basename "$f" | sed -E 's/-[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?\.tgz$//')
	[ "$f" = "$WORK/tarballs/$base.tgz" ] || mv "$f" "$WORK/tarballs/$base.tgz"
done
git -C "$REPO" rev-parse HEAD > "$WORK/tarballs/SOURCE_SHA"
cp "$HERE/consumer/package.template.json" "$WORK/package.json"
(cd "$WORK" && npm install --no-audit --no-fund --loglevel=error)
echo "installed c15t $(cat "$WORK/tarballs/SOURCE_SHA") into $WORK"
