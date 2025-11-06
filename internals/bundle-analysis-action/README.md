# Bundle Analysis Action

A GitHub Action for analyzing bundle size differences using rsdoctor data.

## Features

- Analyzes bundle differences between base and current branches
- Generates markdown reports with detailed bundle statistics
- Automatically comments on pull requests with analysis results
- Supports sticky comments (updates existing comments)

## Usage

```yaml
- uses: ./internals/bundle-analysis-action
  with:
    base_dir: .bundle-base          # Directory with base branch data
    current_dir: .                   # Directory with current branch data
    github_token: ${{ secrets.GITHUB_TOKEN }}
    fail_on_increase: false          # Fail action on >10% increases
```

## Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `base_dir` | Directory containing base branch rsdoctor data | `.bundle-base` | No |
| `current_dir` | Directory containing current branch rsdoctor data | `.` | No |
| `github_token` | GitHub token for posting comments | - | Yes |
| `header` | Header identifier for sticky comments | `bundle-analysis` | No |
| `pr_number` | Pull request number (auto-detected) | - | No |
| `skip_comment` | Skip posting comment | `false` | No |
| `fail_on_increase` | Fail if bundle increases >10% | `false` | No |

## Outputs

| Output | Description |
|--------|-------------|
| `report_path` | Path to the generated bundle diff report |
| `has_changes` | Whether bundle changes were detected |
| `total_diff_percent` | Total bundle size change percentage |

## Development

```bash
# Install dependencies
pnpm install

# Build action
pnpm build

# Type check
pnpm check-types

# Lint
pnpm lint
```

