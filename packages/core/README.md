<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=c15t" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# c15t: Developer-First Consent Management Platform

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

Headless cookie banner, consent manager & preference center for JavaScript / TypeScript. GDPR, CCPA, LGPD and IAB TCF compliant.

## Key Features

- Developer-First Design: Easy integration with minimal configuration
- Framework Agnostic: Works across JavaScript frameworks
- GDPR Compliance: Built-in support for privacy regulations
- Customizable Consent Management: Flexible consent preferences
- Server-Side Rendering Support: Compatible with SSR frameworks
- Internationalization: Built-in translation support

## Prerequisites

- JavaScript or TypeScript project
- Node.js 18.17.0 or later
- npm, pnpm, or yarn package manager
- A hosted [c15t instance](https://inth.com) (free sign-up) or [self-hosted deployment](https://c15t.com/docs/self-host/v2)

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

## Manual Installation

```bash
pnpm add c15t
```

To manually install, follow the guide in our [docs – manual setup](https://c15t.com/docs/frameworks/javascript/quickstart#manual-setup).

## Usage

1. Import the c15t core library
2. Configure your consent preferences
3. Manage user consent across your application
4. Customize consent banners and preference centers
5. For full implementation details, see the [JavaScript quickstart docs](https://c15t.com/docs/frameworks/javascript/quickstart)

```typescript
// Example usage
import { ConsentManager } from 'c15t'

const consentManager = new ConsentManager({
  // Your configuration
})
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/javascript/quickstart).

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=c15t)**
