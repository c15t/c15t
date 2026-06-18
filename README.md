<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=repo_homepage" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

&nbsp;

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)
[![skills.sh](https://skills.sh/b/c15t/skills)](https://skills.sh/c15t/skills)

c15t is a developer-first consent management platform (CMP) used by [2,100+ sites](https://www.wappalyzer.com/technologies/cookie-compliance/c15t/), including expo.dev, zed.dev, and unkey.dev. It helps JavaScript, React, and Next.js teams build cookie banners, preference centers, privacy preferences, and fully headless consent flows, with integrations for Google Tag Manager, Google Consent Mode v2, Meta Pixel, IAB TCF 2.3, and more.

## Overview

c15t keeps consent management inside your application stack instead of a black-box third-party snippet. Use the prebuilt UI for cookie banners, consent dialogs, and preference centers, or use the headless APIs to build a fully custom consent experience.

c15t can run with a managed backend on [inth.com](https://inth.com), a self-hosted consent backend, or offline/local-only mode for development, previews, and static deployments. Hosted and self-hosted modes support durable consent records, backend policy state, audit logs, and server-side visibility.

## Why c15t

- Build cookie banners, consent dialogs, and preference centers for JavaScript, React, and Next.js
- Use prebuilt UI components, headless hooks, or framework-native primitives
- Gate analytics, ads, pixels, tag managers, and chat widgets behind consent
- Support Google Tag Manager and Google Consent Mode v2 without hand-rolling consent updates
- Manage Meta Pixel and other conversion pixels with marketing consent
- Add IAB TCF 2.3 support for programmatic advertising workflows
- Choose managed hosting on inth.com, a self-hosted backend, or offline mode

## Integrations

Load analytics, pixels, tag managers, and widgets through c15t so consent state controls when they run. [@c15t/scripts](https://www.npmjs.com/package/@c15t/scripts) ships prebuilt, consent-aware loaders for 25+ tools:

- **Google Tag Manager** - loads at page start with Google Consent Mode v2 defaults set to denied; GTM-managed tags fire only once matching consent is granted ([guide](https://c15t.com/docs/integrations/google-tag-manager))
- **Google Analytics 4 + Google Ads (gtag.js)** - automatic Consent Mode v2 defaults and consent updates when users make a choice ([guide](https://c15t.com/docs/integrations/google-tag))
- **Conversion pixels** gated behind marketing consent: Meta Pixel, TikTok Pixel, LinkedIn Insights, Microsoft UET (Bing Ads), X Pixel, Reddit Pixel, Snapchat Pixel
- **Analytics** gated behind measurement consent: PostHog, Segment, Mixpanel, Microsoft Clarity, Hotjar, Plausible, Fathom, Matomo, Umami, Vercel Analytics
- **Chat widgets** gated behind functional consent: Intercom, Crisp

See the [full integrations list](https://c15t.com/docs/integrations).

## Deployment Modes

- **Managed on inth.com** - use a hosted c15t backend with managed infrastructure, policy storage, audit history, and dashboard workflows
- **Self-hosted backend** - deploy [@c15t/backend](https://www.npmjs.com/package/@c15t/backend) with your own database and infrastructure for full control
- **Offline mode** - store consent locally in the browser for local development, demos, previews, static sites, or controlled fallback scenarios

## Talk

Watch the Next.js Conf 2025 talk: [Why Your Consent Banner Should Be in Your Bundle](https://c15t.link/talk).

## Packages

| Package | Description | Key Features | Version |
|---------|-------------|--------------|---------|
| `c15t` | Headless JavaScript consent management platform | Cookie consent, privacy preferences, local storage, SSR support, framework-agnostic APIs | [![npm](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t) |
| `@c15t/react` | React cookie banner and consent manager | React 19/18/17/16.8, prebuilt UI, headless hooks, RSC-compatible, IAB subpath support | [![npm](https://img.shields.io/npm/v/@c15t/react?style=flat-square)](https://www.npmjs.com/package/@c15t/react) |
| `@c15t/nextjs` | Next.js cookie banner and CMP integration | App Router, Pages Router, SSR, React Server Components, same-origin backend proxy support | [![npm](https://img.shields.io/npm/v/@c15t/nextjs?style=flat-square)](https://www.npmjs.com/package/@c15t/nextjs) |
| `@c15t/translations` | Internationalization Support | Type-safe translation interfaces, Modular translation imports, Supports partial and complete translations, Defines translation types for consent components | [![npm](https://img.shields.io/npm/v/@c15t/translations?style=flat-square)](https://www.npmjs.com/package/@c15t/translations) |
| `@c15t/scripts` | Consent-aware script integrations | Google Tag Manager, Google Consent Mode v2, GA4, Google Ads, Meta Pixel, PostHog, Intercom, and more. [See full list ->](./docs/integrations/overview.mdx) | [![npm](https://img.shields.io/npm/v/@c15t/scripts?style=flat-square)](https://www.npmjs.com/package/@c15t/scripts) |
| `@c15t/iab` | IAB TCF 2.3 addon | TC String generation, GVL support, TCF APIs, vendor and purpose controls for programmatic ads | [![npm](https://img.shields.io/npm/v/@c15t/iab?style=flat-square)](https://www.npmjs.com/package/@c15t/iab) |
| `@c15t/dev-tools` | Developer Tooling | Experimental developer utilities, React component library with utility tools, Radix UI and Tailwind CSS integration, State management and UI component helpers, Currently under active development | [![npm](https://img.shields.io/npm/v/@c15t/dev-tools?style=flat-square)](https://www.npmjs.com/package/@c15t/dev-tools) |
| `@c15t/cli` | Command-line Interface | Configuration Generation, Database Migrations, Multi-Framework Support, Interactive Guided Workflows, GitHub Integration | [![npm](https://img.shields.io/npm/v/@c15t/cli?style=flat-square)](https://www.npmjs.com/package/@c15t/cli) |
| `@c15t/backend` | Self-hosted consent backend | Policy engine, geolocation, server-side translation, audit logs, domain management, storage adapters | [![npm](https://img.shields.io/npm/v/@c15t/backend?style=flat-square)](https://www.npmjs.com/package/@c15t/backend) |
| `@c15t/node-sdk` | Type-safe Node.js API client | Hosted and self-hosted API access, typed methods, dynamic base URLs, token auth, error handling | [![npm](https://img.shields.io/npm/v/@c15t/node-sdk?style=flat-square)](https://www.npmjs.com/package/@c15t/node-sdk) |

## Documentation

Comprehensive guides for different frameworks:

- [Next.js Quickstart](https://c15t.link/next-js)
- [React Quickstart](https://c15t.link/react)
- [JavaScript Quickstart](https://c15t.link/javascript)

## Local Workflows

- `bun run dev` starts the main product demo in `examples/demo`
- `bun run bench:ci` runs the benchmark suites that publish `.benchmarks/**` artifacts
- `bun run compat:styles:review` launches the Tailwind 3, Tailwind 4, plain CSS, and preview compatibility harnesses

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [inth.com](https://inth.com) and use the chat widget
- Contact our support team via email [support@inth.com](mailto:support@inth.com)

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

[Apache License 2.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)


---

**Built by [Inth](https://inth.com?utm_source=github&utm_medium=repo_homepage)**
