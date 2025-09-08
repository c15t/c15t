<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=c15t_react" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner">
    </picture>
  </a>
  <br />
  <h1 align="center">@c15t/react: React Consent Components</h1>
</p>

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.com/discord)
[![npm version](https://img.shields.io/npm/v/https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40c15t%2Freact?style=flat-square)](https://www.npmjs.com/package/@c15t/react)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

Developer-first CMP for React: cookie banner, consent manager, preferences centre. GDPR ready with minimal setup and rich customization

## Key Features

- Works with React 19, 18, 17, and 16.8
- Full 'use client' support for React Server Components
- Headless and fully customizable UI components
- Automatic GDPR, CCPA, and LGPD compliance
- Minimal configuration with TypeScript-first design
- Comprehensive Consent Management Platform (CMP)
- Flexible Cookie Banner and Consent Dialog components
- Built-in internationalization support
- Seamless consent storage and tracking

## Prerequisites

- React 16.8 or later
- Node.js 18.17.0 or later
- A hosted [c15t instance](https://consent.io) (free sign-up) or [self-hosted deployment](https://c15t.com/docs/self-host/v2)

## Quick Start

Easiest setup with @c15t/cli:

```bash
# Generate schema and code
pnpm dlx @c15t/cli generate
# Alternatives:
# npx @c15t/cli generate
# bunx --bun @c15t/cli generate
```

The CLI will:

- Install necessary packages
- Configure your c15t instance
- Set up environment variables
- Add consent management components to your app

## Manual Installation

```bash
pnpm add @c15t/react
```

To manually install, run the following the guide on our [docs - manual setup](https://c15t.com/docs/frameworks/react/quickstart#manual-setup).

## Usage

1. Import `ConsentManagerProvider` in your app's root component
2. Add `CookieBanner` and `ConsentManagerDialog` components
3. Customise styling and behaviour to fit your app
4. For full implementation details, see the [React quickstart docs](https://c15t.com/docs/frameworks/react/quickstart)

```tsx
// App.tsx
import { ConsentManagerProvider, CookieBanner } from '@c15t/react'

function App() {
  return (
    <ConsentManagerProvider>
      <YourApp />
      <CookieBanner />
    </ConsentManagerProvider>
  )
}
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/react/quickstart).

## Support

- Join our [Discord community](https://c15t.com/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [consent.io](https://consent.io) and use the chat widget
- Contact our support team via email [support@consent.io](mailto:support@consent.io)

## Contributing

- We're open to all community contributions!
- Read our [Contribution Guidelines](https://c15t.com/docs/oss/contributing)
- Review our [Code of Conduct](https://c15t.com/docs/oss/code-of-conduct)
- Fork the repository
- Create a new branch for your feature
- Submit a pull request
- **All contributions, big or small, are welcome and appreciated!**

## Security

If you believe you have found a security vulnerability in c15t, we encourage you to **_responsibly disclose this and NOT open a public issue_**. We will investigate all legitimate reports.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our Open Source Software. To do this, please visit [https://github.com/c15t/c15t/security](https://github.com/c15t/c15t/security) and click the "Report a vulnerability" button.

### Security Policy

- Please do not share security vulnerabilities in public forums, issues, or pull requests
- Provide detailed information about the potential vulnerability
- Allow reasonable time for us to address the issue before any public disclosure
- We are committed to addressing security concerns promptly and transparently

## License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built with ❤️ by the [consent.io](https://www.consent.io) team**
