<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=repopage_%40c15t%2Fbackend" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
  <br />
  <h1 align="center">@c15t/backend: Consent Management Backend</h1>
</p>

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Fbackend?style=flat-square)](https://www.npmjs.com/package/@c15t/backend)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

Consent policy engine and API for c15t. Powers the cookie banner, consent manager, and preferences centre. Webhooks, audit logs, storage adapters. Self host or use consent.io

## Key Features

- Consent Management: Track and manage user consent preferences
- Geo-Location: Identify user's location to show relevant consent preferences
- Server-Side Translation: Reduce banner bundle size by translating consent preferences on the server
- Audit Logging: Comprehensive logging of all consent-related actions
- Domain Management: Handle multiple domains and subdomains
- Policy Management: Version and manage consent policies

## Prerequisites

- Node.js 18.17.0 or later
- npm, pnpm, or yarn package manager

## Installation

Install the backend package using your preferred package manager
Configure your database adapter (supports Drizzle, Kysely, Prisma, TypeORM, and Mongo)

## Usage

1. Import the backend package in your project
2. Configure your database connection
3. Use the provided router and schema for consent management
4. Implement consent tracking and management in your application

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/self-host/v2).

## Support

- Join our [Discord community](https://c15t.link/discord)
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

**Built with ❤️ by the [consent.io](https://www.consent.io?utm_source=github&utm_medium=repopage_%40c15t%2Fbackend) team**
