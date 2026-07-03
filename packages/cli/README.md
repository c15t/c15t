<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fcli" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/cli: c15t's CLI

[![Latest NPM Version](https://shieldcn.dev/npm/%40c15t%2Fcli.svg?variant=outline)](https://www.npmjs.com/package/@c15t/cli)
[![Stars](https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline)](https://github.com/c15t/c15t)
[![License](https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline)](https://c15t.link/discord)
[![Skills](https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline)](https://skills.sh/c15t/skills/c15t)
[![Made by Inth](https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&color=ffc803&labelTextColor=000000&valueColor=000000)](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fcli)

CLI for c15t setup. Scaffold React and Next.js cookie banners, choose hosted/self-hosted/offline mode, and add consent integrations.

## Key Features

- Cookie Banner Setup: Scaffold React and Next.js consent UI
- Mode Selection: Choose hosted on inth.com, self-hosted backend, or offline mode
- Script Integrations: Add Google Tag Manager, Google Consent Mode v2, Meta Pixel, and other consent-aware scripts
- Configuration Generation: Automatically generate schema and code for consent management
- Database Migrations: Simplified database schema updates
- Multi-Framework Support: Works seamlessly across different web frameworks
- Interactive CLI: User-friendly command-line interface with guided workflows
- Agent Skills: Install reusable c15t agent skills for AI tooling
- GitHub Integration: Easy way to star and support the project
- Documentation Access: Quick access to project documentation

## Prerequisites

- Node.js 18.17.0 or later
- npm, pnpm, or yarn package manager

## Quick Start

Easiest setup with @c15t/cli:

```bash
# Set up c15t in your project
pnpm dlx @c15t/cli setup
# Alternatives:
# npx @c15t/cli setup
# bunx --bun @c15t/cli setup
```

The CLI will:

- Install necessary packages
- Configure your c15t instance
- Set up environment variables
- Add consent management components to your app

## Usage

1. Run `@c15t/cli setup` to create initial configuration
2. Use the docs bundled in installed c15t packages under `docs/` for local agent context
3. Customize consent settings in generated files
4. Integrate with your web application
5. Use `@c15t/cli self-host migrate` for self-hosted database schema updates

## Available Commands

- `setup`: Set up c15t in your project
- `codemods`: Run migration codemods for c15t upgrades
- `self-host`: Self-hosted workflow commands (currently database migrations)
- `skills`: Install c15t agent skills for AI-assisted development
- `changelog`: Open the c15t changelog in your browser
- `github`: Open the project's GitHub repository to star the project
- `docs`: Open the c15t documentation in your browser

## Global Flags

- `--help`: Display help menu
- `--version`: Show CLI version
- `--no-telemetry`: Disable anonymous usage data collection

## Telemetry

Anonymous usage data collection to help improve the CLI

- Not personally identifiable
- Used to prioritize features and improvements
- Completely optional

Disable telemetry by:

- Use the `--no-telemetry` flag
- Set `C15T_TELEMETRY_DISABLED=1` in your environment

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/cli/overview).

## Setup Paths

- **Hosted on inth.com**: Configure a hosted c15t instance
- **Self-hosted backend**: Generate config and run database migrations for @c15t/backend
- **Offline mode**: Generate browser-only consent setup for demos, local development, previews, or static sites

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [inth.com](https://inth.com) and use the chat widget
- Contact our support team via email [support@inth.com](mailto:support@inth.com)

## Contributing

- We're open to all community contributions.
- Read our [Contribution Guidelines](https://c15t.com/docs/oss/contributing)
- Review our [Code of Conduct](https://c15t.com/docs/oss/code-of-conduct)
- Fork the repository
- Create a new branch for your feature
- Submit a pull request
- **All contributions, big or small, are welcome and appreciated.**

## Security

If you believe you have found a security vulnerability in c15t, we encourage you to **_responsibly disclose this and NOT open a public issue_**. We will investigate all legitimate reports.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our open-source software. To do this, please visit [https://github.com/c15t/c15t/security](https://github.com/c15t/c15t/security) and click the "Report a vulnerability" button.

### Security Policy

- Please do not share security vulnerabilities in public forums, issues, or pull requests
- Provide detailed information about the potential vulnerability
- Allow reasonable time for us to address the issue before any public disclosure
- We are committed to addressing security concerns promptly and transparently

## License

[Apache License 2.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fcli)**
