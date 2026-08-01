#!/usr/bin/env sh

set -eu

# The vendored Effect source is a research aid for the effect-ts skill, not a
# build input. CI never reads it, so skip the clone there rather than adding
# ~64 MB of network and disk to every install.
if [ -n "${CI:-}" ]; then
	exit 0
fi

repo_dir=".repos/effect"
repo_url="https://github.com/Effect-TS/effect-smol"

if [ -d "$repo_dir/.git" ]; then
	exit 0
fi

if [ -d "$repo_dir" ]; then
	rm -rf "$repo_dir"
fi

mkdir -p ".repos"
git clone "$repo_url" "$repo_dir"
