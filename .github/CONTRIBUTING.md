# Contributing to c15t.com

We love your input! We want to make contributing to c15t.com as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 📜 License

By contributing to c15t.com, you agree that your contributions will be licensed under the Apache License, Version 2.0 (Apache-2.0).

[Read the full license here](LICENSE.md)

## 🏠 House Rules

### Before You Start

- Check existing [issues](https://github.com/c15t/c15t/issues) and [PRs](https://github.com/c15t/c15t/pulls) first
- **Always create an issue before starting development**
- Follow our PR template carefully

### Issue Approval Process

We use the `needs-approval` label to manage contributions:

#### For Contributors

- 🚫 **Needs Approval First:**
  - New features
  - Large-scale refactoring
  - Architecture changes
  - *Wait for an c15t.com team member to remove the `needs-approval` label*

- ✅ **Can Start Immediately:**
  - Bug fixes
  - Documentation updates
  - Performance improvements
  - Security fixes
  - Tests

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### 🤖 Automated Workflows

We leverage several automated workflows to ensure code quality:

1. **Code Quality**
   - Formatting: Biome automatically formats code
   - Types: TypeScript checks run on every PR
   - Tests: Vitest runs the test suite
   - Build: Turbo ensures everything builds correctly

2. **Dependencies**
   - Renovate keeps dependencies up to date
   - PNPM manages our packages
   - Changesets handles our versioning

3. **Pull Requests**
   - PR titles are checked for semantic versioning
   - Automated code review for common issues
   - Required checks must pass before merging

## Getting Started

1. Fork the repo and create your branch from `main`:

   ```sh
   git clone https://github.com/your-username/c15t.git
   cd c15t
   git switch -c my-feature
   ```

2. Install dependencies:

   ```sh
   corepack enable  # Sets up PNPM
   pnpm install     # Installs dependencies
   ```

3. Make your changes and ensure the following pass:

   ```sh
   pnpm fmt         # Format code
   pnpm test        # Run tests
   pnpm build       # Build packages
   ```

## Pull Request Process

1. **Create an Issue First**
   - For features/refactoring: Wait for approval (needs-approval label)
   - For bugs/docs: Can start work immediately

2. **Make Your Changes**
   - Follow our coding standards (enforced by Biome)
   - Add tests for new functionality
   - Update documentation as needed

3. **Create Pull Request**
   - Use our PR template
   - Link the related issue
   - Add screenshots for UI changes
   - Describe your changes clearly

4. **Automated Checks**
   The following will run automatically:
   - Code formatting (Biome)
   - Type checking (TypeScript)
   - Tests (Vitest)
   - Build verification (Turbo)
   - Dependency checks (Renovate)
   - PR title format
   - Issue linking

5. **Review Process**
   - Maintainers will review your code
   - Address any requested changes
   - Once approved, it will be merged

## Release Process

Releases are automated through our CI/CD pipeline:

1. Merge to `main` triggers version check
2. Changesets determines version bump
3. New version is published to npm
4. GitHub release is created
5. Documentation is updated

## Development Guidelines

### Code Style

We use Biome for formatting and linting. Configuration is in `biome.jsonc`.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `chore:` Maintenance
- `refactor:` Code changes
- `test:` Test changes

### Testing

- Write tests for new features
- Update tests for changes
- Run `pnpm test` locally

### Documentation

- Update docs with new features
- Include code examples
- Update README if needed

## Questions?

Don't hesitate to:

- Open an issue
- Start a discussion
- Ask in comments

## Important License Note

c15t.com is licensed under the Apache License, Version 2.0 (Apache-2.0). By contributing
to this project, you agree to license your contributions under the same license. In
summary, you may use, modify, and distribute the software, including commercially,
provided you include the required notices and do not use contributor names for
endorsement without permission.

[Learn more about Apache-2.0](https://choosealicense.com/licenses/apache-2.0/)
