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

## Quick Start

1. Configure your Next.js app:

```typescript
// next.config.js
const { withC15T } = require('@c15t/nextjs');

module.exports = withC15T({
  baseUrl: 'https://api.example.com',
  token: 'your-auth-token'
});
```

2. Add the provider to your app:

```tsx
// app/layout.tsx
import { C15TNextProvider } from '@c15t/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <C15TNextProvider>
          {children}
        </C15TNextProvider>
      </body>
    </html>
  );
}
```

3. Use the consent components in your pages:

```tsx
// app/page.tsx
import { ConsentBanner } from '@c15t/nextjs';

export default function Home() {
  return (
    <main>
      <ConsentBanner />
      <h1>Welcome to my app</h1>
    </main>
  );
}
```

## Configuration

The `withC15T` function accepts the following configuration options:

```typescript
interface C15TNextConfig {
  // Base URL for the API server
  baseUrl: string;
  
  // Authentication token (if needed)
  token?: string;
  
  // Additional headers to include with each request
  headers?: Record<string, string>;
  
  // Prefix path for API endpoints
  prefix?: string;
  
  // Whether to enable the middleware
  enableMiddleware?: boolean;
  
  // Paths to exclude from middleware processing
  excludePaths?: string[];
}
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

## Contributing

Please read our [contributing guide](../../CONTRIBUTING.md) to learn about our development process.

## License

This package is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details. 