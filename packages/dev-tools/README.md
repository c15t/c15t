<div align="center">
   <img src="https://koroflow.com/logo-icon.png" alt="Koroflow Logo" width="64" height="64" />
  <h1>@c15t/dev-tools</h1>
  <p>Transform privacy consent from a compliance checkbox into a fully observable system</p>

  [![GitHub stars](https://img.shields.io/github/stars/consent-management?style=flat-square)](https://github.com/koroflow/consent-management)
  [![CI](https://img.shields.io/github/actions/workflow/status/consent-management/ci.yml?style=flat-square)](https://github.com/koroflow/consent-management/actions/workflows/ci.yml)
  [![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](LICENSE)
  [![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://discord.gg/koroflow)
</div>

## Documentation

For detailed documentation and examples, visit:
[https://c15t.com/docs/framework/react/dev-tool](https://c15t.com/docs/teact/dev-tool)

## Installation

```bash
npm install @c15t/dev-tools
# or
yarn add @c15t/dev-tools
# or
pnpm add @c15t/dev-tools
```

## Quick Start

```tsx
import { ConsentManagerProvider, CookieBanner, ConsentManagerDialog } from "@c15t/react";
import { DevTools } from "@c15t/dev-tools";

export default function App() {
  return (
    <ConsentManagerProvider>
      <CookieBanner />
      <ConsentManagerDialog/>
      <C15TDevTools />
      {/* Your app content */}
    </ConsentManagerProvider>
  );
}
```

## License

[GNU General Public License v3.0](https://github.com/koroflow/consent-management/blob/main/LICENSE)
