<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fnextjs" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# @c15t/nextjs: Next.js Integration

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Fnextjs?style=flat-square)](https://www.npmjs.com/package/@c15t/nextjs)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

Next.js cookie banner and consent management platform for App Router, Pages Router, SSR, and headless consent flows.

## Key Features

- Works with Next.js 16, 15, 14, and 13
- Full 'use client' support for React Server Components
- Server-side rendering support for both app and pages routers
- Prebuilt and customizable cookie banner, consent dialog, and preference center UI
- Headless hooks for custom consent flows
- Minimal configuration with TypeScript-first design
- IAB TCF 2.3 UI and hooks through the @c15t/react/iab subpath
- Google Tag Manager, Google Consent Mode v2, Meta Pixel, and analytics integrations through @c15t/scripts
- Built-in internationalization support
- Seamless consent storage and tracking

## Prerequisites

- Next.js 13.5.4 or later
- React 18 or later
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
pnpm add @c15t/nextjs
```

Then add the prebuilt stylesheet to your app-level CSS entrypoint:

```css
/* app/globals.css */
@import "@c15t/nextjs/styles.css";
```

To manually install, follow the guide in our [docs – manual setup](https://c15t.com/docs/frameworks/next/quickstart#manual-setup).

## Usage

1. Import `ConsentManagerProvider` in your app's root layout
2. Add `ConsentBanner` and `ConsentDialog` components
3. Customize styling and behavior to fit your app
4. For full implementation details, see the [Next.js quickstart docs](https://c15t.com/docs/frameworks/next/quickstart)

```tsx
// app/layout.tsx
import {
  ConsentManagerProvider,
  ConsentBanner,
  ConsentDialog,
} from '@c15t/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConsentManagerProvider>
          {children}
          <ConsentBanner />
          <ConsentDialog />
        </ConsentManagerProvider>
      </body>
    </html>
  )
}
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/docs/frameworks/next/quickstart).

## Deployment Modes

- **Hosted on inth.com**: Hosted c15t backend for policy storage, audit history, and hosted infrastructure
- **Self-hosted backend**: Use @c15t/backend with your own database and infrastructure
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

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=%40c15t%2Fnextjs)**
