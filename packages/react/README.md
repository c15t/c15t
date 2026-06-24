<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/react: React Consent Components

[![Latest NPM Version](https://shieldcn.dev/npm/%40c15t%2Freact.svg?variant=outline)](https://www.npmjs.com/package/@c15t/react)
[![Stars](https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline)](https://github.com/c15t/c15t)
[![License](https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline)](https://c15t.link/discord)
[![Skills](https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline)](https://skills.sh/c15t/skills/c15t)
[![Made by Inth](https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8%2BPHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg%3D%3D&color=ffc803&labelTextColor=000000&valueColor=000000)](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact)

React cookie banner, consent manager, preference center, and headless CMP components for modern React apps.

## Key Features

- Works with React 19, 18, 17, and 16.8
- Full 'use client' support for React Server Components
- Prebuilt and fully customizable cookie banner, consent dialog, and preference center UI
- Headless hooks for custom consent flows
- Minimal configuration with TypeScript-first design
- Comprehensive Consent Management Platform (CMP)
- IAB TCF 2.3 UI and hooks through the @c15t/react/iab subpath
- Google Tag Manager, Google Consent Mode v2, Meta Pixel, and analytics integrations through @c15t/scripts
- Built-in internationalization support
- Seamless consent storage and tracking

## Prerequisites

- React 16.8 or later
- Node.js 18.17.0 or later
- A hosted [c15t instance](https://inth.com) (free sign-up), [self-hosted deployment](https://c15t.com/docs/self-host/quickstart), or offline mode for local-only storage

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
pnpm add @c15t/react
```

Then add the prebuilt stylesheet to your app-level CSS entrypoint:

```css
/* src/index.css */
@import "@c15t/react/styles.css";
```

If you use the prebuilt IAB TCF UI, also import `@c15t/react/iab/styles.css`. It is published separately so non-IAB apps do not ship those component rules.

To manually install, follow the guide in our [docs – manual setup](https://c15t.com/docs/frameworks/react/quickstart#manual-setup).

## Usage

1. Import `ConsentManagerProvider` in your app's root component
2. Add `ConsentBanner` and `ConsentDialog` components
3. Customize styling and behavior to fit your app
4. For full implementation details, see the [React quickstart docs](https://c15t.com/docs/frameworks/react/quickstart)

```tsx
// App.tsx
import {
  ConsentManagerProvider,
  ConsentBanner,
  ConsentDialog,
} from '@c15t/react'

function App() {
  return (
    <ConsentManagerProvider>
      <YourApp />
      <ConsentBanner />
      <ConsentDialog />
    </ConsentManagerProvider>
  )
}
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/react/quickstart).

## Deployment Modes

- **Hosted on inth.com**: Hosted c15t backend for policy storage, audit history, and hosted infrastructure
- **Self-hosted backend**: Use @c15t/backend when you need full infrastructure control
- **Offline mode**: Browser-only consent storage for local development, demos, previews, static sites, or fallback scenarios

## Popular Integrations

- Google Tag Manager with Google Consent Mode v2
- Google Analytics 4 and Google Ads through gtag.js
- Meta Pixel, TikTok Pixel, LinkedIn Insights, Microsoft UET, X Pixel, Reddit Pixel, and Snapchat Pixel
- PostHog, Segment, Mixpanel, Microsoft Clarity, Hotjar, Plausible, Fathom, Matomo, Umami, and Vercel Analytics
- Intercom and Crisp chat widgets

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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Freact)**
