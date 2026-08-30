---
name: creating-a-package
description: |
  Scaffold a new workspace package in the c15t monorepo. Use when adding a
  package under packages/, wiring up rslib builds, vitest, turbo, exports
  maps, or deciding whether a package joins the linked changeset group.
---

# Creating a c15t Package

Copy the shape of an existing package rather than inventing one. `packages/logger` is the minimal template; `packages/core` shows `prebuild`/version generation and bundled docs; `packages/react` shows subpath exports, CSS entrypoints, and browser tests.

## Checklist

1. **Directory**: `packages/<name>` (auto-included by the root `workspaces` globs). Use kebab-case file names throughout.

2. **package.json** — match the house shape:
   - `"name": "@c15t/<name>"`, same `version` as the linked group if it will join it, `"type": "module"`, `"sideEffects": false` where true, Apache-2.0 license, `repository.directory` set.
   - Exports map pointing at build output (ESM-only — no CJS build, no
     `require` condition, no `module` field; `default` mirrors `import` and
     must come last):

     ```json
     "exports": { ".": { "types": "./dist-types/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js" } },
     "main": "./dist/index.js", "types": "./dist-types/index.d.ts",
     "files": ["dist", "dist-types"]
     ```

   - Standard scripts (copy from logger): `build` (rslib + `normalize-dist-types.mjs`), `dev` (rslib watch, `--no-dts --no-clean`), `check-types` (`tsc --noEmit`), `lint` (`bun oxlint ./src`), `fmt` (`bun oxfmt .`), `test` (`vitest run`, add `--passWithNoTests` until tests exist). Core SDK packages additionally run `prepack` (`bun ../../scripts/verify-package-artifacts.ts`) — add it if the package ships to end users.
   - Workspace deps use `"workspace:*"`. Dev deps include `@c15t/typescript-config` and, if tested, `@c15t/vitest-config`.

3. **rslib.config.ts**: a single ESM lib (v3 is ESM-only) with `dts.distPath: './dist-types'`, `source.exclude` for test globs, `getRsdoctorPlugins()` from `../shared/rslib-utils`. If the package needs a runtime version string, add the `prebuild` genversion script like core (`src/version.ts` is generated — gitignore it).

4. **tsconfig.json**: extend `@c15t/typescript-config/base.json` (or `next.json`/`node.json`). Don't relax strictness.

5. **vitest.config.ts**: extend `@c15t/vitest-config` base config; add the package to root `vitest.workspace.ts` if it should run in the workspace suite. Browser tests follow `packages/react/vitest.config.ts` (`@vitest/browser-playwright`, Chromium).

6. **turbo.json**: the generic `build`/`test`/`lint` tasks cover most packages. Add a package-specific entry only if outputs differ (e.g. bundled docs add `AGENTS.md` + `docs/**` to build outputs) or the demo should watch it (`@c15t/example-demo#dev.with`).

7. **Changesets**: decide whether it joins the `linked` group in `.changeset/config.json` (core SDK packages that must version together) or versions independently (utilities like logger/schema/ui).

8. **README**: user-facing published packages get a generated `README.md` — create `readme.json` (see `packages/react/readme.json`) and run `bun run generate:readmes`; don't hand-write README.md. Internal utility packages (like schema/ui today) may skip it.

9. **Bundled docs** (only for user-facing SDK packages): add a config entry in `scripts/generate-package-docs.ts` and include `"AGENTS.md", "docs"` in `files` plus a `build:docs` script.

10. **knip.json**: add one if the package has intentional unused-export patterns; run `bun run knip` to check.

## Verify

```bash
bun install
bun turbo run build check-types lint test --filter=@c15t/<name>
bun pm pack --dry-run --cwd packages/<name>
```
