<div align="center">
  <img src="https://c15t.com/logo-icon.png" alt="c15t Logo" width="64" height="64" />
  <h1>c15t</h1>
  <p>Transform privacy consent from a compliance checkbox into a fully observable system</p>

  [![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
  [![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
  [![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](LICENSE.md)
  [![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.com/discord)
</div>

## 🎯 Overview

c15t (consent management) unifies analytics, consent tracking, and privacy controls into a single performant solution. Built for modern development teams, it transforms privacy management from a compliance burden into a fully observable system.

### Why c15t.com?

- 🚫 No more slow cookie banners
- 👁️ Complete visibility into consent choices
- 🔄 Unified multi-vendor implementation
- 📊 Clear privacy policy tracking
- ⚡ Performance-first design

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| `c15t` | Core consent and event management | [![npm](https://img.shields.io/npm/v/c15t?style=flat-square)](https://www.npmjs.com/package/c15t) |
| `@c15t/react` | Best in class React Components | [![npm](https://img.shields.io/npm/v/@c15t/react?style=flat-square)](https://www.npmjs.com/package/@c15t/react) |
| `@c15t/dev-tools` | Development and debugging tools | [![npm](https://img.shields.io/npm/v/@c15t/dev-tools?style=flat-square)](https://www.npmjs.com/package/@c15t/dev-tools) |

## ⚡ Quick Start Via CLI

```bash
# Generates the schema + code
npx @c15t/cli generate 

# Database Migrations (If you're self hosting c15t)
npx @c15t/cli migrate
```

After running the CLI, you can use the following code to get started:

```tsx
import { ConsentManagerProvider, CookieBanner, ConsentManagerDialog } from "@c15t/react";
import { c15tConfig } from "./c15tConfig";

export default function App() {
  return (
    <ConsentManagerProvider config={c15tConfig}>
      <CookieBanner />
      <ConsentManagerDialog/>
      {/* Your app content */}
    </ConsentManagerProvider>
  );
}
```

## ✨ Key Features

- 🎨 **Beautiful UI Components**: Custom built for performance and design
- 📱 **Server Components Ready**: Full Next.js app directory support
- 🔒 **Privacy by Design**: GDPR, CCPA, and LGPD compliant
- 🛠️ **Developer Tools**: Real-time consent debugging
- 🎯 **Type Safety**: Full TypeScript support

## 🏗️ Development

Prerequisites:
- Node.js >= 18
- pnpm >= 8

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

We use Vitest and Playwright for testing:

```bash
# Run unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test
```

## 📚 Documentation

- [Getting Started](https://c15t.com/docs)
- [Javascript Core](https://c15t.com/docs/javascript)
- [NextJS Quick Start](https://c15t.com/docs/nextjs/quickstart)
- [UI Components](https://c15t.com/docs/components/react/cookie-banner)

## 🤝 Contributing

We welcome contributions!

- 🐛 [Report bugs](https://github.com/c15t/c15t/issues/new?template=bug_report.yml)
- ✨ [Request features](https://github.com/c15t/c15t/issues/new?template=feature_request.yml)
- 📚 [Improve docs](https://github.com/c15t/c15t/issues/new?template=doc_report.yml)
- 🧪 [Fix tests](https://github.com/c15t/c15t/issues/new?template=test.yml)
- ⚡ [Report performance issues](https://github.com/c15t/c15t/issues/new?template=performance.yml)


## 📜 License

[GNU General Public License v3.0](LICENSE.md) - See [LICENSE](LICENSE.md) for details.

---

<div align="center">
  <strong>Built with ❤️ by the consent.io team</strong>
</div>
