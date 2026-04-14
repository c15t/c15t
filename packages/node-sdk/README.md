<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=repopage_%40c15t%2Fnode-sdk" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
  <br />
  <h1 align="center">@c15t/node-sdk: Type-Safe Node.js API Client</h1>
</p>

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Fnode-sdk?style=flat-square)](https://www.npmjs.com/package/@c15t/node-sdk)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

A fully typed, lightweight Node.js SDK for seamless interaction with the c15t consent management platform API.

## Key Features

- **Type-safe API client** with full TypeScript support
- **Zero-config setup** with environment variable auto-detection
- **Result-like error handling** with `unwrap()`, `unwrapOr()`, and `expect()` helpers
- **Custom error class** (`C15TError`) for typed error handling
- **Automatic retries** with exponential backoff
- **Namespaced API methods** for intuitive organization
- **Lightweight** with minimal dependencies

## Prerequisites

- Node.js 18.17.0 or later
- A Hosted [c15t instance](https://consent.io) (free sign-up) or [self-hosted deployment](https://c15t.com/docs/self-host/v2)

## Installation

```bash
# npm
npm install @c15t/node-sdk

# pnpm
pnpm add @c15t/node-sdk

# yarn
yarn add @c15t/node-sdk

# bun
bun add @c15t/node-sdk
```

## Quick Start

### Basic Setup

```typescript
import { c15tClient } from '@c15t/node-sdk';

// Auto-configure from environment variables
// Reads C15T_API_URL and C15T_API_TOKEN automatically
const client = c15tClient();

// Or provide explicit configuration
const client = c15tClient({
  baseUrl: 'https://api.example.com',
  token: 'your-api-token',
});
```

### Environment Variables

The SDK automatically reads these environment variables:

- `C15T_API_URL` - Base URL for the API server
- `C15T_API_TOKEN` - Authentication token

### Check Consent Status

```typescript
const result = await client.checkConsent({
  externalId: 'user_123',
  type: 'analytics',
});

if (result.ok) {
  console.log('Has consent:', result.data?.results.analytics?.hasConsent);
} else {
  console.error('Error:', result.error?.message);
}
```

### Using Result Helpers

The SDK provides ergonomic helper methods inspired by Rust's Result type:

```typescript
// Unwrap data or throw if error
const subject = (await client.getSubject('sub_123')).unwrap();

// Unwrap with custom error message
const subject = (await client.getSubject('sub_123')).expect('Subject not found');

// Unwrap with default value
const subject = (await client.getSubject('sub_123')).unwrapOr(defaultSubject);

// Transform data with map
const name = (await client.getSubject('sub_123')).map(s => s.externalId);
```

### Error Handling

```typescript
import { c15tClient, C15TError, isC15TError } from '@c15t/node-sdk';

const client = c15tClient();

try {
  const subject = (await client.getSubject('sub_123')).unwrap();
} catch (error) {
  if (isC15TError(error)) {
    console.log('Status:', error.status);     // 404
    console.log('Code:', error.code);         // 'NOT_FOUND'
    console.log('Details:', error.details);
    
    if (error.isNotFound()) {
      // Handle not found
    } else if (error.isServerError()) {
      // Handle server error
    }
  }
}
```

### Create Subject with Consent

```typescript
const result = await client.createSubject({
  type: 'cookie_banner',
  subjectId: 'sub_123',
  externalSubjectId: 'user_123',
  domain: 'example.com',
  preferences: {
    analytics: true,
    marketing: false,
  },
  givenAt: Date.now(),
});

if (result.ok) {
  console.log('Subject created:', result.data?.subjectId);
}
```

### Server Component Usage (Next.js)

```typescript
// lib/c15t-client.ts
import { c15tClient } from '@c15t/node-sdk';

export const consentClient = c15tClient({
  baseUrl: process.env.C15T_API_URL || 'http://localhost:3000/api/self-host',
});

// app/consent-check/page.tsx
import { consentClient } from '@/lib/c15t-client';

export default async function ConsentCheckPage({ searchParams }) {
  const { externalId } = await searchParams;
  
  const result = await consentClient.checkConsent({
    externalId,
    type: 'analytics',
  });

  if (!result.ok) {
    return <div>Error: {result.error?.message}</div>;
  }

  return <pre>{JSON.stringify(result.data, null, 2)}</pre>;
}
```

## API Reference

### Client Methods

| Method | Description |
|--------|-------------|
| `client.status()` | Check API status |
| `client.init()` | Initialize consent manager |
| `client.checkConsent(query)` | Check consent status |
| `client.createSubject(input)` | Create a new subject |
| `client.getSubject(id)` | Get subject by ID |
| `client.patchSubject(id, input)` | Update subject |
| `client.listSubjects(query)` | List subjects |

### Namespaced Methods

```typescript
// Meta operations
client.meta.status();
client.meta.init();

// Consent operations
client.consent.check(query);

// Subject operations
client.subjects.create(input);
client.subjects.get(id);
client.subjects.patch(id, input);
client.subjects.list(query);
```

### ResponseContext

All methods return a `ResponseContext<T>` with:

```typescript
interface ResponseContext<T> {
  data: T | null;           // Response data
  error: {...} | null;      // Error details
  ok: boolean;              // Success status
  response: Response | null; // Raw Response object
  
  // Helper methods
  unwrap(): T;              // Get data or throw
  unwrapOr(default: T): T;  // Get data or return default
  expect(msg: string): T;   // Get data or throw with custom message
  map<U>(fn: (T) => U): ResponseContext<U>; // Transform data
}
```

### Configuration Options

```typescript
interface C15TClientOptions {
  baseUrl?: string;           // API base URL (or use C15T_API_URL env var)
  token?: string;             // Auth token (or use C15T_API_TOKEN env var)
  headers?: Record<string, string>; // Custom headers
  prefix?: string;            // API path prefix
  retryConfig?: {
    maxRetries?: number;      // Default: 3
    initialDelayMs?: number;  // Default: 100
    backoffFactor?: number;   // Default: 2
    retryableStatusCodes?: number[]; // Default: [500, 502, 503, 504]
    retryOnNetworkError?: boolean;   // Default: true
  };
}
```

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [consent.io](https://consent.io) and use the chat widget
- Contact our support team via email [support@consent.io](mailto:support@consent.io)

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

**Built by [Inth](https://inth.com?utm_source=github&utm_medium=repopage_%40c15t%2Fnode-sdk)**
