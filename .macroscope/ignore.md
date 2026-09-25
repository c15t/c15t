# Macroscope review exclusions
# Source: https://docs.macroscope.com/bug-detection-and-fixes#default-ignore-patterns
# Defaults copied 2026-09-25. This file replaces the built-in defaults.
# Keep one glob per line, without Markdown lists or code fences.

# Markdown and MDX at any depth, including executable MDX components.
*.md
*.mdx

# === Vendored / dependency directories ===
**/.git/**
**/__pycache__/**
**/.pytest_cache/**
**/.mypy_cache/**
**/.ruff_cache/**
**/venv/**
**/.venv/**
**/node_modules/**
**/site-packages/**
**/.pnpm-store/**
**/__Snapshots__/**
**/__snapshots__/**
**/.agents/skills/**
**/.claude/skills/**
**/.github/skills/**
**/bower_components/**
**/jspm_packages/**
**/.next/**
**/.svelte-kit/**
**/.nuxt/**
**/.output/**
**/.vercel/**
**/.angular/**
**/vendor/**
**/_vendor/**
**/third_party/**
**/Pods/**
**/.bundle/**

# === Root-anchored ambiguous directories ===
build/**
out/**
env/**
ENV/**

# === Generated / build-output directories (match anywhere) ===
**/target/**
**/dist/**
**/generated/**
**/intermediates/**
**/generated_sources/**
**/generated-sources/**
**/generated-src/**
**/src/main/generated/**

# === Minified build output ===
**/*.min.js
**/*.min.css
**/*.bundle.js

# === Yarn PnP loader files ===
**/.pnp.cjs
**/.pnp.loader.mjs

# === Generated protobuf / codegen files ===
**/*_pb.d.ts
**/*_pb.js
**/*.pb.go
**/*_pb2.py
**/*_pb2_grpc.py
**/*_pb2.pyi
**/*.grpc.swift
**/*.pb.swift
**/*.sql.go
**/*.designer.cs
**/*.g.dart
**/*.pb.dart
**/*_pb.rb
**/*.d.ts
**/*.gen.ts
**/*.gen.tsx
**/*.gen.js
**/*.gen.jsx

# === Package manager files ===
**/go.mod
**/package.json
**/*.pbxproj
**/*.xcstrings
**/*.strings
**/*.properties
**/pom.xml
**/Package.swift
**/bun.lock
**/.eslintrc
**/.eslintignore

# === Lock / sum files ===
**/go.sum
**/package-lock.json
**/pnpm-lock.yaml
**/yarn.lock
**/Package.resolved

# === Images ===
**/*.jpg
**/*.jpeg
**/*.png
**/*.gif
**/*.svg
**/*.ico
**/*.webp
**/*.bmp
**/*.tiff

# === Fonts ===
**/*.woff
**/*.woff2
**/*.ttf
**/*.eot
**/*.otf

# === Media ===
**/*.mp3
**/*.mp4
**/*.wav
**/*.avi
**/*.mov
**/*.mkv
**/*.flac
**/*.ogg
**/*.srt

# === Archives ===
**/*.zip
**/*.tar
**/*.gz
**/*.rar
**/*.7z
**/*.bz2

# === Documents ===
**/*.pdf
**/*.doc
**/*.docx
**/*.xls
**/*.xlsx
**/*.ppt
**/*.pptx

# === Data / serialized ===
**/*.db
**/*.sqlite
**/*.sqlite3
**/*.parquet
**/*.avro
**/*.arrow
**/*.npy
**/*.pkl
**/*.jsonl

# === ML models ===
**/*.onnx
**/*.tflite
**/*.h5
**/*.safetensors

# === Compiled / binary ===
**/*.exe
**/*.dll
**/*.so
**/*.dylib
**/*.bin
**/*.pyc
**/*.class
**/*.o
**/*.a
**/*.wasm

# === Certificates / keys ===
**/*.cer
**/*.pem
**/*.p12

# === Platform-specific / non-reviewable ===
**/*.stringsdict
**/*.snap
**/*.adoc
**/*.arb
**/*.lock
**/*.po
**/*.fbx
**/*.log
**/*.xib
**/*.meta
**/*.kml
**/*.prefab
**/*.eml
**/*.csv
**/*.grpc.reflection
**/*.js.map

# === Go ===
**/*_test.go

# === TypeScript / JavaScript ===
**/*.test.ts
**/*.test.tsx
**/*.test.js
**/*.test.jsx
**/*.test.mjs
**/*.test.cjs
**/*.test.mts
**/*.test.cts
**/*.spec.ts
**/*.spec.tsx
**/*.spec.js
**/*.spec.jsx
**/*.spec.mjs
**/*.spec.cjs
**/*.spec.mts
**/*.spec.cts
**/*.e2e.ts
**/*.e2e.tsx
**/*.e2e.js
**/*.e2e.jsx
**/*.e2e.mjs
**/*.e2e.cjs
**/*.integration.ts
**/*.integration.tsx
**/*.integration.js
**/*.integration.jsx
**/*.integration.mjs
**/*.integration.cjs
**/__tests__/**

# === Python ===
**/test_*.py
**/*_test.py

# === Java / Kotlin ===
**/*Test.java
**/*Tests.java
**/*Spec.java
**/*IT.java
**/*ITCase.java
**/*Test.kt
**/*Tests.kt
**/*Spec.kt
**/*IT.kt
**/*ITCase.kt
**/src/test/java/**
**/src/test/kotlin/**
**/src/androidTest/**
**/src/integrationTest/**

# === Swift ===
**/*Tests.swift
**/*UITests.swift
**/*Tests/**
**/*UITests/**

# === Rust ===
**/tests/*.rs
**/*_test.rs
**/test_*.rs

# === Ruby ===
**/*_test.rb
**/*_spec.rb
**/test_*.rb

# === Generic test directories ===
**/test/**
**/tests/**
**/spec/**
**/specs/**
**/e2e/**

# Additional exclusions from .gitignore
**/node_modules
**/.pnp
**/.pnp/**
**/.pnp.js
**/.pnp.js/**
**/.pnpm-store
**/.dev.vars
**/.dev.vars/**
**/.*.vars
**/.*.vars/**
**/.env
**/.env/**
**/.env.local
**/.env.local/**
**/.env.development.local
**/.env.development.local/**
**/.env.test.local
**/.env.test.local/**
**/.env.production.local
**/.env.production.local/**
**/coverage
**/coverage/**
**/.turbo
**/.turbo/**
**/.wrangler
**/.wrangler/**
**/.vercel
**/out/**
**/build
**/build/**
**/dist
packages/core/docs
packages/core/docs/**
packages/core/AGENTS.md
packages/core/AGENTS.md/**
packages/react/docs
packages/react/docs/**
packages/react/AGENTS.md
packages/react/AGENTS.md/**
packages/nextjs/docs
packages/nextjs/docs/**
packages/nextjs/AGENTS.md
packages/nextjs/AGENTS.md/**
packages/backend/docs
packages/backend/docs/**
packages/backend/AGENTS.md
packages/backend/AGENTS.md/**
packages/scripts/docs
packages/scripts/docs/**
packages/scripts/AGENTS.md
packages/scripts/AGENTS.md/**
packages/cli/docs
packages/cli/docs/**
packages/cli/AGENTS.md
packages/cli/AGENTS.md/**
**/.merge_file_*
**/.merge_file_*/**
**/dist-types
**/dist-types/**
apps/bundle-bench-react/.bundle-bench-dist/**
**/npm-debug.log*
**/npm-debug.log*/**
**/yarn-debug.log*
**/yarn-debug.log*/**
**/yarn-error.log*
**/yarn-error.log*/**
**/.DS_Store
**/.DS_Store/**
**/*.pem/**
docs/public/r/*
docs/public/r/*/**
**/.docs
**/.docs/**
**/*.tsbuildinfo
**/*.tsbuildinfo/**
**/coverage.json
**/coverage.json/**
**/version.ts
**/version.ts/**
**/i18n.cache
**/i18n.cache/**
**/.test-apps/**
**/.benchmarks/**
**/.c15t-state.json
**/.c15t-state.json/**
**/.gstack/**
**/storybook-static/**
**/debug-storybook.log
**/debug-storybook.log/**
.claude/worktrees/**
**/live-vendors-report.json
**/live-vendors-report.json/**

# Additional exclusions from examples/.gitignore
examples/**/vercel-c15t
examples/**/vercel-c15t/**
examples/**/v1
examples/**/v1/**
examples/**/tailwind-3
examples/**/tailwind-3/**
examples/demo/next-env.d.ts
examples/demo/next-env.d.ts/**

# Additional exclusions from packages/cli/.gitignore
packages/cli/**/c15t.config.*
packages/cli/**/c15t.config.*/**
packages/cli/**/c15t.backend.*
packages/cli/**/c15t.backend.*/**

# Additional exclusions from packages/nextjs/.gitignore
packages/nextjs/**/dist/**
packages/nextjs/**/coverage/**
packages/nextjs/**/node_modules/**
packages/nextjs/**/.turbo/**
packages/nextjs/**/*.log
packages/nextjs/**/*.log/**
packages/nextjs/**/.DS_Store
packages/nextjs/**/.DS_Store/**

# Keep repository exclusions in sync with the referenced .gitignore files.
# Macroscope does not document Git-style negation. Environment globs above
# preserve template exceptions. Copied defaults still exclude lockfiles,
# package manifests and dist output, including Git-tracked exceptions.
