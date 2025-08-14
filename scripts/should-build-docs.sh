#!/bin/bash

# Exit with 0 (skip build) if no docs-related changes
# Exit with 1 (continue build) if docs changes detected

echo "🔍 Checking for documentation-related changes..."

# Check if any docs-related files changed
if git diff HEAD^ HEAD --quiet -- \
  'docs/**' \
  'packages/*/src/**' \
  'packages/*/package.json' \
  'scripts/setup-docs.ts' \
  'vercel.json' \
  'package.json'; then
  echo "❌ No documentation-related changes detected. Skipping build."
  exit 0
else
  echo "✅ Documentation-related changes found. Proceeding with build."
  exit 1
fi
