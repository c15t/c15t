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
packages/react/docs
packages/react/docs/**
packages/nextjs/docs
packages/nextjs/docs/**
packages/backend/docs
packages/backend/docs/**
packages/browser/docs
packages/browser/docs/**
**/.merge_file_*
**/.merge_file_*/**
**/dist-types
**/dist-types/**
apps/bundle-bench-react/.bundle-bench-dist/**
examples/astro-demo/.astro/**
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
packages/vue/.nuxt
packages/vue/.nuxt/**
packages/vue/playground/.nuxt
packages/vue/playground/.nuxt/**
packages/vue/playground/.output
packages/vue/playground/.output/**
inrepo_modules/**
.inrepo/**
.claude/worktrees/**
**/live-vendors-report.json
**/live-vendors-report.json/**
.repos/effect
.repos/effect/**
packages/*/docs/**
packages/*/AGENTS.md
packages/*/AGENTS.md/**
packages/*/SKILL.md
packages/*/SKILL.md/**
ci-plan.json
ci-plan.json/**
ci-build.tar
ci-build.tar/**
ci-build-cache.tar
ci-build-cache.tar/**
.ci-reports/**
# Narrow .env* rules to preserve the committed .env.example templates.
**/.env.development
**/.env.test
**/.env.production
**/.env.staging
**/.env.preview
**/.env.*.local

# Additional exclusions from apps/parity-runner/.gitignore
apps/parity-runner/**/parity-diffs/**
apps/parity-runner/**/test-results/**
apps/parity-runner/**/playwright-report/**

# Additional exclusions from benchmarks/astro-browser-bench/.gitignore
benchmarks/astro-browser-bench/**/node_modules
benchmarks/astro-browser-bench/**/node_modules/**
benchmarks/astro-browser-bench/dist
benchmarks/astro-browser-bench/dist/**
benchmarks/astro-browser-bench/dist-hosted
benchmarks/astro-browser-bench/dist-hosted/**
benchmarks/astro-browser-bench/dist-baseline
benchmarks/astro-browser-bench/dist-baseline/**
benchmarks/astro-browser-bench/.astro
benchmarks/astro-browser-bench/.astro/**
benchmarks/astro-browser-bench/.turbo
benchmarks/astro-browser-bench/.turbo/**

# Additional exclusions from benchmarks/nuxt-browser-bench/.gitignore
benchmarks/nuxt-browser-bench/**/.nuxt
benchmarks/nuxt-browser-bench/**/.nuxt/**
benchmarks/nuxt-browser-bench/**/.output
benchmarks/nuxt-browser-bench/**/.output/**
benchmarks/nuxt-browser-bench/**/node_modules
benchmarks/nuxt-browser-bench/**/node_modules/**
benchmarks/nuxt-browser-bench/**/.nuxt-baseline/**

# Additional exclusions from benchmarks/sveltekit-browser-bench/.gitignore
benchmarks/sveltekit-browser-bench/**/node_modules
benchmarks/sveltekit-browser-bench/**/node_modules/**
benchmarks/sveltekit-browser-bench/build
benchmarks/sveltekit-browser-bench/build/**
benchmarks/sveltekit-browser-bench/.svelte-kit
benchmarks/sveltekit-browser-bench/.svelte-kit/**
benchmarks/sveltekit-browser-bench/.turbo
benchmarks/sveltekit-browser-bench/.turbo/**
benchmarks/sveltekit-browser-bench/**/vite.config.ts.timestamp-*
benchmarks/sveltekit-browser-bench/**/vite.config.ts.timestamp-*/**

# Additional exclusions from benchmarks/tanstack-start-browser-bench/.gitignore
benchmarks/tanstack-start-browser-bench/**/node_modules
benchmarks/tanstack-start-browser-bench/**/node_modules/**
benchmarks/tanstack-start-browser-bench/**/dist
benchmarks/tanstack-start-browser-bench/**/dist/**
benchmarks/tanstack-start-browser-bench/**/dist-root
benchmarks/tanstack-start-browser-bench/**/dist-root/**
benchmarks/tanstack-start-browser-bench/**/.output
benchmarks/tanstack-start-browser-bench/**/.output/**
benchmarks/tanstack-start-browser-bench/**/.tanstack
benchmarks/tanstack-start-browser-bench/**/.tanstack/**
benchmarks/tanstack-start-browser-bench/**/.nitro
benchmarks/tanstack-start-browser-bench/**/.nitro/**
benchmarks/tanstack-start-browser-bench/src/routeTree.gen.ts
benchmarks/tanstack-start-browser-bench/src/routeTree.gen.ts/**

# Additional exclusions from examples/.gitignore
examples/**/vercel-c15t
examples/**/vercel-c15t/**
examples/**/v1
examples/**/v1/**
examples/**/tailwind-3
examples/**/tailwind-3/**
examples/demo/next-env.d.ts
examples/demo/next-env.d.ts/**

# Additional exclusions from examples/nuxt/.gitignore
examples/nuxt/**/.output
examples/nuxt/**/.output/**
examples/nuxt/**/.nuxt
examples/nuxt/**/.nuxt/**
examples/nuxt/**/node_modules
examples/nuxt/**/node_modules/**
examples/nuxt/**/.pgdata
examples/nuxt/**/.pgdata/**

# Additional exclusions from examples/shared/.gitignore
examples/shared/**/artifacts/**

# Additional exclusions from examples/tanstack-start/.gitignore
examples/tanstack-start/**/node_modules
examples/tanstack-start/**/node_modules/**
examples/tanstack-start/**/dist
examples/tanstack-start/**/dist/**
examples/tanstack-start/**/.output
examples/tanstack-start/**/.output/**
examples/tanstack-start/**/.tanstack
examples/tanstack-start/**/.tanstack/**
examples/tanstack-start/**/.nitro
examples/tanstack-start/**/.nitro/**
examples/tanstack-start/src/routeTree.gen.ts
examples/tanstack-start/src/routeTree.gen.ts/**
examples/tanstack-start/**/.pgdata
examples/tanstack-start/**/.pgdata/**

# Additional exclusions from internals/next-compat/next-16-static-export/.gitignore
internals/next-compat/next-16-static-export/lib/consent-manifest.generated.ts
internals/next-compat/next-16-static-export/lib/consent-manifest.generated.ts/**

# Additional exclusions from packages/browser/.gitignore
packages/browser/**/dist
packages/browser/**/dist/**
packages/browser/**/dist-types
packages/browser/**/dist-types/**
packages/browser/**/coverage
packages/browser/**/coverage/**
packages/browser/src/version.ts
packages/browser/src/version.ts/**
packages/browser/src/generated/**
packages/browser/**/.vitest-attachments/**
packages/browser/src/**/__screenshots__/**

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

# Additional exclusions from packages/tanstack-start/.gitignore
packages/tanstack-start/**/dist/**
packages/tanstack-start/**/coverage/**
packages/tanstack-start/**/node_modules/**
packages/tanstack-start/**/.turbo/**
packages/tanstack-start/**/*.log
packages/tanstack-start/**/*.log/**
packages/tanstack-start/**/.DS_Store
packages/tanstack-start/**/.DS_Store/**

# Additional exclusions from packages/vue/playground/.gitignore
packages/vue/playground/**/.nuxt
packages/vue/playground/**/.nuxt/**
packages/vue/playground/**/.output
packages/vue/playground/**/.output/**
packages/vue/playground/**/dist
packages/vue/playground/**/dist/**
packages/vue/playground/**/.env
packages/vue/playground/**/.env/**

# Keep repository exclusions in sync with the referenced .gitignore files.
# Macroscope does not document Git-style negation. Environment globs above
# preserve template exceptions. Copied defaults still exclude lockfiles,
# package manifests and dist output, including Git-tracked exceptions.
