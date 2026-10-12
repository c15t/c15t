#!/usr/bin/env sh

set -eu

# The vendored Effect source is a research aid for the effect-ts skill, not a
# build input. CI never reads it, so skip the clone there rather than adding
# network and disk to every install.
if [ -n "${CI:-}" ]; then
	exit 0
fi

repo_dir=".repos/effect"
# The canonical repository. Effect v4 was developed in `effect-smol` and now
# lives here: at the time of writing that repo is on 4.0.0-beta.98 and has not
# been pushed since July, while this one is on beta.103 and the version pinned
# in `package.json` is beta.102. A skill answering API questions from a
# checkout older than the installed package is worse than one with no checkout,
# because it is confidently wrong.
repo_url="https://github.com/Effect-TS/effect"

# An existing checkout of the old repository is stale rather than merely
# different, so it is replaced rather than left alone.
if [ -d "$repo_dir/.git" ]; then
	current=$(git -C "$repo_dir" remote get-url origin 2>/dev/null || echo '')
	case "$current" in
	*Effect-TS/effect.git | *Effect-TS/effect)
		exit 0
		;;
	*)
		echo "prepare-effect: replacing vendored checkout from ${current:-unknown}" >&2
		rm -rf "$repo_dir"
		;;
	esac
fi

if [ -d "$repo_dir" ]; then
	rm -rf "$repo_dir"
fi

mkdir -p ".repos"

# Never fail the install. This runs from the root `prepare` script, so Bun
# executes it on every `bun install` — and under `set -e` a clone that failed
# for any ordinary reason (offline, a proxy, a firewall, GitHub having a bad
# minute) took the entire install down with it. The checkout is optional by
# construction: the skill prompts for it when it is missing.
#
# `--depth 1` because only the working tree is ever read, and the history was
# most of what made this expensive.
if ! git clone --depth 1 "$repo_url" "$repo_dir" 2>/dev/null; then
	rm -rf "$repo_dir"
	echo "prepare-effect: could not clone $repo_url — skipping." >&2
	echo "prepare-effect: the effect-ts skill will ask for it when needed." >&2
	exit 0
fi
