# Kysely Adapter for ORM Bridge

This adapter provides integration between the ORM Bridge and [Kysely](https://kysely.dev/) through the [Doubletie query-builder](https://www.doubletie.com/docs/packages/query-builder).

## Installation

```bash
npm install @doubletie/query-builder kysely
```

## Features

- Fully type-safe integration with Kysely and Doubletie query-builder
- Support for all standard CRUD operations
- Transaction support with automatic rollback on failure
- Comprehensive error handling with clear error messages
- Support for complex queries and filtering

## Usage

### Basic Setup

```typescript
import { createDatabase } from '@doubletie/query-builder';
import { PostgresDialect } from 'kysely';
import { kyselyAdapter, OrmBridgeAdapter } from '@doubletie/core';

// First, create your Doubletie database instance
const db = createDatabase<Database>({
  dialect: new PostgresDialect({
    host: 'localhost',
    database: 'mydb',
    user: 'postgres',
    password: 'password'
  }),
  debug: process.env.NODE_ENV !== 'production'
});

// Define your schema
const schema = {
  user: {
    fields: {
      id: { type: 'string', primary: true },
      name: { type: 'string' },
      email: { type: 'string' },
      active: { type: 'boolean', defaultValue: true },
      createdAt: { type: 'date' }
    }
  }
};

// Create the ORM adapter
const adapter = kyselyAdapter(db, {
  dialect: 'postgres', // or 'mysql' or 'sqlite'
  schema: 'public' // optional schema name
});

// Create the ORM bridge
const orm = new OrmBridgeAdapter({
  adapter: adapter({
    schema: schema,
    config: {
      defaultPageSize: 10
    }
  }),
  defaultPageSize: 10
});

// Use the ORM bridge for database operations
async function createUser() {
  const user = await orm.create('user', {
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  console.log(`Created user with ID: ${user.id}`);
  return user;
}

// Find users with filtering
async function findActiveUsers() {
  const result = await orm.findMany('user', { active: true });
  
  console.log(`Found ${result.totalCount} active users`);
  return result.results;
}
```

### Transactions

```typescript
import { OrmBridgeAdapter } from '@doubletie/core';

async function createUserWithPosts(orm: OrmBridgeAdapter) {
  return await orm.transaction(async (tx) => {
    // Create a user
    const user = await tx.create('user', {
      name: 'Jane Doe',
      email: 'jane@example.com'
    });
    
    // Create a post for the user
    const post = await tx.create('post', {
      title: 'My First Post',
      content: 'Hello, world!',
      userId: user.id
    });
    
    return { user, post };
  });
}
```

## Using with the Doubletie Query Builder

The Kysely adapter is designed to work seamlessly with Doubletie's query-builder, letting you leverage the best of both worlds:

```typescript
// Direct access to Doubletie models when needed
const userModel = db.getModel('user');

// Use the query builder for more complex queries
const results = await userModel.selectFrom()
  .leftJoin('post', 'user.id', 'post.userId')
  .where('user.active', '=', true)
  .select(['user.id', 'user.name', 'post.title'])
  .execute();
```

## Error Handling

The adapter provides detailed error messages to help you debug issues:

```typescript
try {
  await orm.create('user', { email: 'invalid-email' });
} catch (error) {
  console.error(`Failed to create user: ${error.message}`);
}
```

## Supported Operations

The adapter supports all standard operations:

- `create`: Create new records
- `findOne`: Find a single record
- `findMany`: Find multiple records with pagination
- `update`: Update a single record
- `updateMany`: Update multiple records
- `delete`: Delete a single record
- `deleteMany`: Delete multiple records
- `count`: Count records
- `transaction`: Execute operations within a transaction

## Type Safety

When using TypeScript, you get full type safety throughout the adapter:

```typescript
interface Database {
  user: {
    id: string;
    name: string;
    email: string;
    active: boolean;
    createdAt: Date;
  };
  post: {
    id: string;
    title: string;
    content: string;
    userId: string;
    published: boolean;
    createdAt: Date;
  };
}

// The ORM will provide type-checking based on your schema
const user = await orm.findOne('user', { id: '123' });
// user has type: { id: string; name: string; email: string; ... } | null
``` 