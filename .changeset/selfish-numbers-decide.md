---
"@c15t-examples/astro-react": patch
"@c15t-examples/cf-worker": patch
"@c15t-examples/vite-react": patch
"@c15t/vitest-config": patch
"docs": patch
---

1. **CI Pipeline Improvements**
   - Added new workflow jobs: lint_and_check, build, and test
   - Added Biome with Reviewdog for linting
   - Implemented proper test coverage collection and reporting
   - Added coverage artifact upload

2. **GitHub Workflows**
   - Removed `.github/actions/install/action.yaml`
   - Added `add-changeset.yml` for dependency updates in PRs
   - Added `check-pr-title.yml` for conventional commits validation
   - Added workflow for coverage reporting on PRs
   - Added `release.yml` for release automation
   - Updated Renovate scheduler to run Mondays at 5AM UTC
   - Removed semantic PR validation workflow

3. **Package Configuration**
   - Added new vitest config package `@c15t/vitest-config`
   - Added scripts: "changeset", "check-types", "view-report"
   - Updated "release" script to use "build:libs"
   - Updated pnpm to version 10.8.0
   - Updated Node engine requirement to ">=22"
   - Added resolutions for "@libsql/kysely-libsql"

4. **Dependencies Updates**
   - Added "@changesets/changelog-github"
   - Added "@vitest/coverage-istanbul"
   - Updated OpenTelemetry packages
   - Updated React peer dependencies to include "^19.0.0-rc"

5. **Configuration Changes**
   - Updated Turbo pipeline configuration
   - Added coverage.json to .gitignore
   - Updated tsconfig settings for various packages
   - Updated Biome configuration with ignore patterns

6. **Code Formatting**
   - Fixed import statement semicolons
   - Updated CSS formatting in branding components
   - Standardized array and object formatting

7. **Changeset Configuration**
   - Changed changelog to use "@changesets/changelog-github"
   - Replaced "fixed" array with "linked" array
   - Added "@c15t-examples/*" to "ignore" array
