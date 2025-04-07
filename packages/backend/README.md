# C15T Backend

A robust consent management system backend that provides flexible database adapters, comprehensive audit logging, and a powerful plugin system.

## Features

### Database Adapters
- **Memory Adapter**: In-memory storage for development and testing
- **Kysely Adapter**: Type-safe SQL query builder with support for multiple databases
- **Prisma Adapter**: Integration with Prisma ORM
- **Drizzle Adapter**: Integration with Drizzle ORM

### Core Functionality
- **Consent Management**: Track and manage user consent preferences
- **Audit Logging**: Comprehensive logging of all consent-related actions
- **Domain Management**: Handle multiple domains and subdomains
- **Policy Management**: Version and manage consent policies

## Getting Started

### Installation

```bash
npm install @c15t/backend
```

### Basic Usage

```typescript
import { c15tInstance } from '@c15t/backend';
import { memoryAdapter } from '@c15t/backend/db/adapters/memory';

const instance = c15tInstance({
  baseURL: 'http://localhost:3000',
  database: memoryAdapter({}),
});

// Handle requests
const response = await instance.handler(request);
```

### Database Configuration

```typescript
// Using Kysely adapter
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';

const instance = c15tInstance({
  baseURL: 'http://localhost:3000',
  database: kyselyAdapter({
    dialect: 'postgres',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'c15t',
      user: 'postgres',
      password: 'password',
    },
  }),
});
```

### Plugin System

```typescript
const customPlugin = {
  id: 'custom-plugin',
  name: 'Custom Plugin',
  type: 'test',
  init: () => ({
    context: {
      customField: 'value',
    },
  }),
  onRequest: async (request, ctx) => {
    // Modify request
    return { request: modifiedRequest };
  },
  onResponse: async (response, ctx) => {
    // Modify response
    return { response: modifiedResponse };
  },
};

const instance = c15tInstance({
  baseURL: 'http://localhost:3000',
  database: memoryAdapter({}),
  plugins: [customPlugin],
});
```

## API Documentation

### Core Instance

```typescript
interface C15TInstance {
  options: C15TOptions;
  $context: Promise<Result<C15TContext, C15TError>>;
  handler: (request: Request) => Promise<Result<Response, C15TError>>;
  getApi: () => Promise<Result<Record<string, unknown>, C15TError>>;
}
```

### Database Adapters

Each adapter provides a consistent interface for database operations:

```typescript
interface DatabaseAdapter {
  create: <T extends Record<string, unknown>>(table: string, data: T) => Promise<T>;
  find: <T extends Record<string, unknown>>(table: string, query: Query) => Promise<T[]>;
  update: <T extends Record<string, unknown>>(table: string, query: Query, data: Partial<T>) => Promise<T>;
  delete: (table: string, query: Query) => Promise<void>;
}
```

### Plugin System

Plugins can extend the system's functionality:

```typescript
interface C15TPlugin {
  id: string;
  name: string;
  type: string;
  init?: () => Promise<{ context: Record<string, unknown> }>;
  onRequest?: (request: Request, ctx: C15TContext) => Promise<{ request: Request } | { response: Response } | undefined>;
  onResponse?: (response: Response, ctx: C15TContext) => Promise<{ response: Response } | undefined>;
}
```

## Error Handling

The system uses a Result type for error handling:

```typescript
type Result<T, E> = { isOk: true; value: T } | { isOk: false; error: E };
```

## Security Features

- Origin validation for CORS
- Request validation
- Audit logging
- Secure ID generation
- Input sanitization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
