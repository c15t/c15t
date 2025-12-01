# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for the c15t project, organized by purpose using naming prefixes.

## Workflow Categories

### CI/CD (`ci-*`)
- **`ci-main.yml`** - Main CI pipeline (lint, type check, build, test)
- **`ci-autofix.yml`** - Auto-formatting and code fixes on PRs/push
- **`ci-coverage.yml`** - Coverage reporting (depends on CI workflow)

### Deployment (`deploy-*`)
- **`deploy-docs.yml`** - Main docs deployment workflow (handles PR previews and production)
- **`deploy-docs-reusable.yml`** - Reusable workflow for docs deployment (called by deploy-docs.yml)

### Release (`release-*`)
- **`release-production.yml`** - Production releases via Changesets
- **`release-canary.yml`** - Canary snapshot releases
- **`release-sync-canary.yml`** - Syncs main branch to canary via PR

### Analysis (`analysis-*`)
- **`analysis-bundle.yml`** - Bundle size analysis and PR comments

### Maintenance (`maintenance-*`)
- **`maintenance-renovate.yml`** - Automated dependency updates via Renovate

## Workflow Dependencies

```
ci-main.yml
  └─> ci-coverage.yml (runs after CI completes)

deploy-docs.yml
  └─> deploy-docs-reusable.yml (called by deploy-docs)

release-production.yml (independent)
release-canary.yml (independent)
release-sync-canary.yml (independent)

analysis-bundle.yml (independent)
maintenance-renovate.yml (independent)
```

## Naming Convention

Workflows follow the pattern: `{category}-{purpose}.yml`

- **Category**: `ci`, `deploy`, `release`, `analysis`, `maintenance`
- **Purpose**: Descriptive name (e.g., `main`, `docs`, `canary`, `bundle`)

This makes it easy to:
- Find related workflows
- Understand workflow purpose at a glance
- Group workflows by function
- Maintain consistency across the repository

