# @c15t/middleware

<div align="center">
  <img src="https://c15t.com/logo-icon.png" alt="c15t Logo" width="64" height="64" />
  <p><strong>Transform privacy consent from a compliance checkbox into a fully observable system</strong></p>

  [![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
  [![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
  [![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
  [![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.com/discord)
</div>

## Overview

The `@c15t/middleware` package provides middleware for Next.js to handle consent banner functionality.

## Quick Start

### 1. Install the Package

```bash
# Using npm
npm install @c15t/middleware

# Using pnpm
pnpm add @c15t/middleware

# Using Yarn
yarn add @c15t/middleware
```

### 2. Add the Middleware to Your App

```tsx title="app/middleware.ts"
import { type NextRequest, NextResponse } from 'next/server';
import c15tMiddleware from '@c15t/middleware/next';

export default async function middleware(request: NextRequest) {
	await c15tMiddleware(request);
	return NextResponse.next();
}
```

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
