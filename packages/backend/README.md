<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbackend" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/backend: Consent Management Backend

[![Latest NPM Version](https://shieldcn.dev/npm/%40c15t%2Fbackend.svg?variant=outline)](https://www.npmjs.com/package/@c15t/backend)
[![Stars](https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline)](https://github.com/c15t/c15t)
[![License](https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline)](https://c15t.link/discord)
[![Skills](https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline)](https://skills.sh/c15t/skills/c15t)
[![Made by Inth](https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&color=ffc803&labelTextColor=000000&valueColor=000000)](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbackend)

Self-hostable consent management backend for c15t. Powers cookie banners, consent managers, preference centers, policy resolution, audit logs, and consent records.

## Key Features

- Self-hosted CMP backend: Run c15t on your own infrastructure with your own database
- Consent Management: Track and manage user consent preferences and consent records
- Geo-Location: Identify a user's location to show relevant consent preferences
- Server-Side Translation: Reduce banner bundle size by translating consent preferences on the server
- Audit Logging: Comprehensive logging of all consent-related actions
- Domain Management: Handle multiple domains and subdomains
- Policy Management: Version and manage consent policies
- IAB TCF 2.3 support: Configure GVL, CMP registration, and custom vendors

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

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/self-host/quickstart).

## Hosted or Self-Hosted

Use [inth.com](https://inth.com) when you want a hosted c15t backend with no infrastructure to maintain. Use @c15t/backend when you need full control over hosting, database, CORS origins, policy configuration, audit logs, and deployment topology.

## Related Packages

- [c15t](https://www.npmjs.com/package/c15t): Headless JavaScript consent engine
- [@c15t/react](https://www.npmjs.com/package/@c15t/react): React consent UI and headless hooks
- [@c15t/nextjs](https://www.npmjs.com/package/@c15t/nextjs): Next.js App Router and Pages Router integration
- [@c15t/node-sdk](https://www.npmjs.com/package/@c15t/node-sdk): Type-safe Node.js API client

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fbackend)**
