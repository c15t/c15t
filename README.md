<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/c15t-banner-readme-dark.svg">
  <img src="docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner">
</picture>

&nbsp;

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/licence-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.com/discord)
[![npm version](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

## 🎯 Overview

c15t is a headless consent engine that transforms privacy management from a compliance checkbox into a fully observable system. Built for modern development teams, it provides a flexible, performant solution for managing user consent across web applications.

### Why c15t?

- 🌐 First fully open-source TypeScript consent engine
- 🔒 Complete end-to-end solution (frontend + backend)
- 🏠 Self-hostable with comprehensive privacy controls
- 👁️ Complete visibility into user consent choices
- 🔄 Unified multi-vendor implementation
- 📊 Transparent privacy policy tracking
- ⚡ Performance-first design
- 🛡️ Privacy by Design (GDPR, CCPA, LGPD compliant)

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| `c15t` | Headless Consent Engine | [![npm](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t) |
| `@c15t/react` | React Components for NextJS | [![npm](https://img.shields.io/npm/v/@c15t/react?style=flat-square)](https://www.npmjs.com/package/@c15t/react) |
| `@c15t/nextjs` | NextJS Integration | [![npm](https://img.shields.io/npm/v/@c15t/nextjs?style=flat-square)](https://www.npmjs.com/package/@c15t/nextjs) |
| `@c15t/translations` | Internationalization Support | [![npm](https://img.shields.io/npm/v/@c15t/translations?style=flat-square)](https://www.npmjs.com/package/@c15t/translations) |
| `@c15t/cli` | Command-line Interface | [![npm](https://img.shields.io/npm/v/@c15t/cli?style=flat-square)](https://www.npmjs.com/package/@c15t/cli) |
| `@c15t/backend` | Self-hosted Node Instance and Database | [![npm](https://img.shields.io/npm/v/@c15t/backend?style=flat-square)](https://www.npmjs.com/package/@c15t/backend) |

## ⚡ Quick Start

```bash
# Generate schema and code
npx @c15t/cli generate 
pnpm dlx @c15t/cli generate
bunx --bun @c15t/cli generate

# Database Migrations (for self-hosting)
npx @c15t/cli migrate
```

Integrate into your React app:

```tsx
import { ConsentManagerProvider, CookieBanner, ConsentManagerDialog } from "@c15t/react";
import { c15tConfig } from "./c15t.client";

export default function App() {
  return (
    <ConsentManagerProvider options={c15tConfig}>
      <CookieBanner />
      <ConsentManagerDialog/>
      {/* Your app content */}
    </ConsentManagerProvider>
  );
}
```

## ✨ Key Features

- 🎨 **Headless UI Components**: Fully customizable consent management
- 📱 **NextJS & React First**: Optimized for modern web frameworks
- 🔒 **Privacy by Design**: GDPR, CCPA, and LGPD compliant
- 🛠️ **Developer Tools**: Real-time consent debugging
- 🎯 **Type Safety**: Full TypeScript support

## 🏗️ Development

Prerequisites:

- Node.js >= 22
- pnpm >= 9

```bash
# Clone repository
git clone https://github.com/c15t/c15t.git
cd c15t

# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test
```

## 🧪 Testing

We use Vitest and Playwright for comprehensive testing:

```bash
# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Run all tests
pnpm test
```

## 📚 Documentation

- [Getting Started](/docs/frameworks/react/quickstart)
- [JavaScript Quickstart](/docs/frameworks/javascript/quickstart)
- [Next.js Quickstart](/docs/frameworks/next/quickstart)
- [CookieBanner Component](/docs/frameworks/next/components/cookie-banner)
- [ConsentManagerDialog Component](/docs/frameworks/next/components/consent-manager-dialog)

## 🤝 Contributing

We welcome contributions! Help us improve:

- 🐛 [Report bugs](https://github.com/c15t/c15t/issues/new?template=bug_report.yml)

- ✨ [Request features](https://github.com/c15t/c15t/issues/new?template=feature_request.yml)

- 📚 [Improve docs](https://github.com/c15t/c15t/issues/new?template=doc_report.yml)

- 🧪 [Fix tests](https://github.com/c15t/c15t/issues/new?template=test.yml)

- ⚡ [Report performance issues](https://github.com/c15t/c15t/issues/new?template=performance.yml)

## 📜 License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built with ❤️ by the [consent.io](https://consent.io) team**
