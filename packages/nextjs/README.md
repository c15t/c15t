
# @c15t/nextjs

Next.js integration for C15T consent management. This package combines `@c15t/node-sdk`, `@c15t/react`, and `@c15t/middleware` into a single, easy-to-use package for Next.js applications.

## Installation

```bash
npm install @c15t/nextjs
# or
yarn add @c15t/nextjs
# or
pnpm add @c15t/nextjs
```

## Features

- 🔄 Automatic middleware integration
- 🎯 Type-safe API client
- 🎨 Pre-built React components
- 🔒 Secure consent management
- 📱 Responsive design
- 🌐 Server-side rendering support

## API Reference

### Components

- `C15TNextProvider`: Provider component for the consent management system
- `ConsentBanner`: Pre-built consent banner component
- `ConsentManager`: Component for managing consent preferences
- `ConsentButton`: Button component for triggering consent dialogs

### Hooks

- `useConsent`: Hook for accessing consent state and methods
- `useConsentPreferences`: Hook for managing consent preferences
- `useConsentBanner`: Hook for controlling the consent banner

### Utilities

- `withC15T`: Higher-order function for configuring Next.js
- `createConsentClient`: Function for creating a consent client instance


## Support

- 📚 [Documentation](https://c15t.com/docs)
- 💬 [Discord Community](https://c15t.com/discord)
- 🐛 [Issue Tracker](https://github.com/c15t/c15t/issues)

## License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

<div align="center">
  <strong>Built with ❤️ by the <a href="https://www.consent.io">consent.io</a> team</strong>
</div>
