<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fnode-sdk" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/node-sdk: Type-Safe Node.js API Client

[![Latest NPM Version](https://shieldcn.dev/npm/%40c15t%2Fnode-sdk.svg?variant=outline)](https://www.npmjs.com/package/@c15t/node-sdk)
[![Stars](https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline)](https://github.com/c15t/c15t)
[![License](https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline)](https://c15t.link/discord)
[![Skills](https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline)](https://skills.sh/c15t/skills/c15t)
[![Made by Inth](https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&color=ffc803&labelTextColor=000000&valueColor=000000)](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fnode-sdk)

Type-safe Node.js SDK for hosted and self-hosted c15t consent APIs, consent records, privacy preferences, and backend automation.

## Key Features

- Type-safe API client with full TypeScript support
- Works with hosted c15t instances on inth.com and self-hosted @c15t/backend deployments
- Read and write consent records, subjects, and privacy preferences from Node.js
- Flexible client configuration with authentication and custom headers
- Supports dynamic base URL and API prefix configuration
- Built on top of @orpc/client for robust API interactions
- Comprehensive error handling and URL validation

## Prerequisites

- Node.js 18.17.0 or later
- A hosted [c15t instance](https://inth.com) (free sign-up) or [self-hosted deployment](https://c15t.com/docs/self-host/quickstart)

## Manual Installation

```bash
pnpm add @c15t/node-sdk
```

## Usage

1. Import `c15tClient` from `@c15t/node-sdk`
2. Configure with a base URL and token, or set `C15T_API_URL` and `C15T_API_TOKEN` so the client picks them up automatically
3. Call API methods on `client.meta`, `client.subjects`, etc. — every method is fully typed

```ts
// server.ts
import { c15tClient } from '@c15t/node-sdk'

// Auto-configure from C15T_API_URL + C15T_API_TOKEN env vars
const client = c15tClient()

// Or pass options explicitly
// const client = c15tClient({
//   baseUrl: process.env.C15T_API_URL!,
//   token: process.env.C15T_API_TOKEN!,
// })

try {
  const status = await client.meta.status()
  console.log('c15t API status:', status)

  const subject = await client.subjects.create({
    type: 'cookie_banner',
    subjectId: 'sub_123',
    domain: 'example.com',
    preferences: { analytics: true },
    givenAt: Date.now(),
  })
  console.log('Created subject', subject.id)
} catch (error) {
  console.error('c15t request failed:', error)
}
```

## Common Use Cases

- Sync consent records between your application and c15t
- Build admin tooling around hosted or self-hosted consent APIs
- Automate privacy preference workflows from server-side jobs
- Integrate c15t consent records with internal data systems

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fnode-sdk)**
