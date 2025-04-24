<div align="center">
  <img src="https://c15t.com/logo-icon.png" alt="c15t Logo" width="64" height="64" />
  <h1>@c15t/react</h1>
  <p>Transform privacy consent from a compliance checkbox into a fully observable system</p>

  [![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
  [![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
  [![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)]([LICENSE.md](https://github.com/c15t/c15t/blob/main/LICENSE.md))
  [![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.com/discord)
</div>

React components for building privacy-first user interfaces.

## Features

- 🎯 **Privacy-First Components**: Pre-built UI components for consent management
- 🎨 **Highly Customizable**: Flexible theming and styling system
- ♿ **Accessible**: WCAG compliant with full keyboard navigation
- 🌐 **Regulation Ready**: Built to meet GDPR, CCPA, and other privacy requirements
- 🔧 **Composable**: Uses compound component pattern for maximum flexibility

## Documentation

For detailed documentation and examples, visit:
[https://c15t.com/docs/react/quickstart](https://c15t.com/docs/react/quickstart)

## ⚡ Quick Start Via CLI

```bash
# Generates the schema + code
npx @c15t/cli generate 
pnpm dlx @c15t/cli generate
bunx --bun @c15t/cli generate

# Database Migrations (If you're self hosting c15t)
npx @c15t/cli migrate
pnpm dlx @c15t/cli migrate
bunx --bun @c15t/cli migrate
```

After running the CLI, you can use the following code to get started:

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

## 📜 License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md) - See [LICENSE]([LICENSE.md](https://github.com/c15t/c15t/blob/main/LICENSE.md)) for details.

---

<div align="center">
  <strong>Built with ❤️ by the <a href="www.consent.io"/>consent.io</a> team</strong>
</div>
