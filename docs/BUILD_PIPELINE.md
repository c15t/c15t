---
title: Build Pipeline
description: How the C15t documentation build and deployment pipeline works, from GitHub Actions to Vercel.
---

## Overview

The C15t documentation build pipeline automatically builds and deploys documentation previews for pull requests and production deployments to Vercel. The system uses a simple, direct approach: clone the monorepo, install dependencies, and deploy directly from the `docs/c15t` directory.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              GitHub Repository (c15t/c15t)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     GitHub Actions Workflow (deploy-docs.yml)        │   │
│  │                                                        │   │
│  │  1. Checkout c15t repository                          │   │
│  │  2. Clone monorepo (consentdotio/monorepo)            │   │
│  │  3. Install monorepo dependencies                      │   │
│  │  4. Run c15t-github-action                            │   │
│  │     ├─ Check deployment policies                      │   │
│  │     ├─ Detect relevant changes                        │   │
│  │     └─ Deploy to Vercel                               │   │
│  │  5. Post PR comment with deployment URL               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Vercel Deployment Platform                  │   │
│  │                                                        │   │
│  │  1. Receive deployment request                         │   │
│  │  2. Build from docs/c15t directory                    │   │
│  │     ├─ Install dependencies (pnpm install)            │   │
│  │     ├─ Run prebuild (build-pipeline.ts)               │   │
│  │     └─ Build Next.js app                              │   │
│  │  3. Deploy to Vercel edge network                     │   │
│  │  4. Assign preview/production domains                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Simple Build Flow

The build process follows a straightforward path:

1. **GitHub Actions clones the monorepo** into the workspace (`monorepo/` directory)
2. **Install dependencies** at the monorepo root using `pnpm install --frozen-lockfile`
3. **Deploy directly from `monorepo/docs/c15t`** - Vercel builds from this directory
4. **No copying, no workspace setup** - just use the monorepo structure as-is

## Workflow Triggers

The `deploy-docs.yml` workflow triggers on:

### Pull Requests
- **When**: Any PR targeting any branch
- **Type**: Preview deployment
- **Behavior**: 
  - Only deploys if PR base branch is `main` or `canary`
  - Only deploys if relevant files changed
  - Creates preview URL: `pr-{number}.c15t.dev`
  - Posts sticky PR comment with deployment link

### Push Events
- **When**: Push to `main` or `canary` branches
- **Type**: Production (main) or Canary (canary) deployment
- **Behavior**:
  - Always deploys (no change detection)
  - Assigns production domain: `c15t.com` (main) or `canary.c15t.com` (canary)

### Manual Dispatch
- **When**: Manual workflow trigger via GitHub UI
- **Type**: Preview or Production (user-selected)
- **Behavior**: Full control over deployment type and branch

## Build Pipeline Flow

### Phase 1: GitHub Actions Setup

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Checkout c15t Repository                           │
│ - Checks out PR head (for PRs) or specified branch         │
│ - Full git history fetched                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Setup pnpm + Node.js                                │
│ - Installs pnpm@10.8.0                                      │
│ - Sets up Node.js 20                                        │
│ - Configures pnpm cache                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Clone Monorepo                                     │
│ - Clones consentdotio/monorepo to monorepo/ directory       │
│ - Checks out appropriate branch (from PR base or push)      │
│ - Falls back to 'main' if branch not found                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Install Monorepo Dependencies                       │
│ - Runs: pnpm install --frozen-lockfile (from monorepo/)     │
│ - Installs all workspace dependencies                       │
│ - Sets up pnpm workspace structure                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Run c15t-github-action                             │
│ - Deploys from monorepo/docs/c15t directory                 │
│ - No setup-docs script needed (setup_docs: false)          │
│ (See Phase 2 for details)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: c15t GitHub Action Execution

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Authentication                                           │
│    - Uses GitHub App or GITHUB_TOKEN                        │
│    - Creates authenticated Octokit client                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Policy Check                                             │
│    - Checks if branch is allowed for deployment             │
│    - For PRs: checks if base branch is in allowed list     │
│    - Skips if policy prevents deployment                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Change Detection (if only_if_changed=true)              │
│    - Analyzes changed files in PR/push                      │
│    - Checks against change_globs patterns                   │
│    - Skips if no relevant changes detected                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Vercel Deployment                                       │
│    - Creates GitHub Deployment record                       │
│    - Calls Vercel CLI to deploy                             │
│    - Uses working_directory: monorepo/docs/c15t             │
│    - Vercel reads vercel.json from docs/c15t                │
│    - Assigns preview/production domains                     │
│    - Returns deployment URL                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PR Comment Management                                    │
│    - Finds existing sticky comment (by header)              │
│    - Creates or updates comment with deployment URL         │
│    - Appends to existing comment if configured               │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Vercel Build Process

Vercel builds directly from the `docs/c15t` directory in the cloned monorepo:

```
┌─────────────────────────────────────────────────────────────┐
│ Vercel Build Process                                        │
│                                                             │
│ Working Directory: monorepo/docs/c15t                       │
│                                                             │
│ 1. Install Dependencies                                     │
│    - Runs: pnpm install (from monorepo root)                │
│    - Uses existing pnpm workspace                            │
│    - All workspace packages already available                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Run Prebuild Script                                     │
│    - Executes: tsx scripts/build-pipeline.ts --mode=build   │
│    - Converts MDX files to Markdown                         │
│    - Generates OG images                                    │
│    - Processes content                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Build Next.js Application                               │
│    - Runs: next build                                       │
│    - Outputs to .next directory                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Deploy to Vercel                                        │
│    - Uploads build artifacts                                │
│    - Deploys to edge network                                │
│    - Assigns preview/production domain                      │
│    - Returns deployment URL                                 │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Scenarios

### Scenario 1: Pull Request Preview

**Trigger**: PR opened/updated targeting `main` or `canary`

**Flow**:
1. GitHub Actions workflow triggered
2. Checks out PR head branch (c15t repo)
3. Clones monorepo (consentdotio/monorepo) to `monorepo/` directory
4. Installs monorepo dependencies from `monorepo/` root
5. Checks if PR base branch is allowed
6. Detects if relevant files changed
7. Deploys to Vercel from `monorepo/docs/c15t` directory
8. Assigns domain: `pr-{number}.c15t.dev`
9. Posts PR comment with preview link

**Expected Outcome**:
- ✅ Preview deployment created
- ✅ PR comment posted/updated with deployment URL
- ✅ Preview accessible at `pr-{number}.c15t.dev`
- ✅ GitHub deployment status created

**Skip Conditions**:
- PR base branch not in allowed list
- No relevant files changed (if `only_if_changed=true`)
- Fork PRs (skipped automatically)

### Scenario 2: Production Deployment (main)

**Trigger**: Push to `main` branch

**Flow**:
1. GitHub Actions workflow triggered
2. Checks out `main` branch (c15t repo)
3. Clones monorepo to `monorepo/` directory
4. Installs monorepo dependencies from `monorepo/` root
5. Always deploys (no change detection)
6. Deploys to Vercel from `monorepo/docs/c15t` with `production` target
7. Assigns domain: `c15t.com`
8. Creates GitHub deployment status

**Expected Outcome**:
- ✅ Production deployment created
- ✅ Site accessible at `c15t.com`
- ✅ GitHub deployment status: success
- ✅ Previous production deployment replaced

### Scenario 3: Canary Deployment

**Trigger**: Push to `canary` branch

**Flow**:
1. GitHub Actions workflow triggered
2. Checks out `canary` branch (c15t repo)
3. Clones monorepo to `monorepo/` directory
4. Installs monorepo dependencies from `monorepo/` root
5. Always deploys (no change detection)
6. Deploys to Vercel from `monorepo/docs/c15t` with `staging` target
7. Assigns domain: `canary.c15t.com`
8. Creates GitHub deployment status

**Expected Outcome**:
- ✅ Canary deployment created
- ✅ Site accessible at `canary.c15t.com`
- ✅ GitHub deployment status: success
- ✅ Previous canary deployment replaced

### Scenario 4: Manual Deployment

**Trigger**: Manual workflow dispatch

**Flow**:
1. User triggers workflow via GitHub UI
2. User selects deployment type (preview/production)
3. User specifies branch or PR number
4. Workflow clones monorepo and installs dependencies
5. Deploys accordingly

**Expected Outcome**:
- ✅ Deployment created based on user selections
- ✅ Appropriate domain assigned
- ✅ Comments posted if applicable

## Key Components

### 1. `deploy-docs.yml` (GitHub Actions Workflow)

**Location**: `.github/workflows/deploy-docs.yml`

**Responsibilities**:
- Defines workflow triggers
- Clones monorepo repository
- Sets up build environment
- Orchestrates deployment process

**Key Features**:
- Concurrency groups prevent duplicate deployments
- Conditional steps based on event type
- Monorepo cloning and dependency installation

### 2. `c15t-github-action` (Custom GitHub Action)

**Location**: `internals/c15t-github-action/`

**Responsibilities**:
- Orchestrates deployment lifecycle
- Manages PR comments
- Handles authentication
- Coordinates with Vercel

**Key Features**:
- Sticky PR comments with append semantics
- Change detection and gating
- Deployment policy enforcement
- GitHub App authentication support

### 3. `vercel.json` (Vercel Configuration)

**Location**: `monorepo/docs/c15t/vercel.json`

**Configuration**:
```json
{
  "installCommand": "cd ../.. && pnpm install --filter c15t-docs",
  "buildCommand": "pnpm build"
}
```

**Responsibilities**:
- Defines Vercel build process
- Specifies install command (runs from monorepo root, filters to c15t-docs package)
- Configures build command (runs from docs/c15t directory)
- Vercel automatically detects this file when deploying from `monorepo/docs/c15t`

## Expected Outcomes

### Successful Deployment

**For Preview Deployments**:
- ✅ Vercel deployment created
- ✅ Preview URL generated (e.g., `pr-123.c15t.dev`)
- ✅ PR comment posted/updated with deployment link
- ✅ GitHub deployment status: success
- ✅ Preview site accessible and functional

**For Production Deployments**:
- ✅ Vercel deployment created
- ✅ Production domain assigned (`c15t.com` or `canary.c15t.com`)
- ✅ GitHub deployment status: success
- ✅ Site accessible and functional
- ✅ Previous deployment replaced

### Skipped Deployment

**Conditions**:
- No relevant file changes detected
- Branch not in allowed list
- Fork PR (automatic skip)
- Policy prevents deployment

**Outcome**:
- ⏭️ Deployment skipped
- 📝 Skip comment posted (if `post_skip_comment=true`)
- ℹ️ Last successful deployment URL included in comment

### Failed Deployment

**Common Failure Points**:
1. **Setup Phase**:
   - Monorepo clone fails (auth issues, branch not found)
   - Dependency installation failures (lockfile mismatches)

2. **Build Phase**:
   - TypeScript compilation errors
   - Next.js build failures
   - Missing workspace packages (shouldn't happen since we install from monorepo root)

3. **Deployment Phase**:
   - Vercel API errors
   - Network issues
   - Configuration errors (wrong working_directory path)

**Outcome**:
- ❌ Deployment fails
- 📝 Error details logged
- 🔔 GitHub deployment status: failure
- 💬 PR comment may include error details

## Environment Variables

### Required Secrets

**GitHub Actions**:
- `CONSENT_GIT_TOKEN`: Token to access private monorepo
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_PROJECT_ID`: Vercel project identifier
- `VERCEL_ORG_ID`: Vercel organization identifier
- `CONSENT_APP_ID`: GitHub App ID (optional)
- `CONSENT_APP_PRIVATE_KEY`: GitHub App private key (optional)

## Troubleshooting

### Common Issues

1. **"pnpm not found"**
   - **Solution**: Ensure pnpm is set up before Node.js cache setup
   - **Fix**: Reorder workflow steps (pnpm setup before Node.js)

2. **"Workspace package not found"**
   - **Solution**: Ensure monorepo dependencies are installed from root
   - **Fix**: Run `pnpm install` from monorepo root before deployment

3. **"Deployment skipped"**
   - **Solution**: Check change detection and policy settings
   - **Fix**: Review `only_if_changed` and branch policies

4. **"Build fails in Vercel"**
   - **Solution**: Ensure working_directory points to correct path
   - **Fix**: Verify `working_directory` is set to `monorepo/docs/c15t` in workflow
   - **Fix**: Ensure monorepo was cloned successfully before deployment step

## Best Practices

1. **Always test changes locally** before pushing
2. **Use preview deployments** for PR reviews
3. **Monitor deployment logs** for issues
4. **Keep dependencies in sync** between monorepo and docs
5. **Use concurrency groups** to prevent duplicate deployments
6. **Set appropriate branch policies** to control deployments
7. **Monitor Vercel build logs** for detailed error information

## Related Documentation

- [Vercel Build Step Documentation](https://vercel.com/docs/deployments/build-step)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
