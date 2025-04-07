# DB Adapters Package

This package provides a collection of database adapters for different database engines. It includes:

- **Memory Adapter**: In-memory storage for development and testing
- **Kysely Adapter**: SQL-based storage via the Kysely query builder (supports PostgreSQL, MySQL, SQLite)
- **Prisma Adapter**: ORM-based storage via Prisma
- **Drizzle Adapter**: SQL-based storage via Drizzle ORM

## Usage

### Memory Adapter

```typescript
import { memoryAdapter } from '~/pkgs/db-adapters';
import type { C15TOptions } from '~/types';

// Create an empty in-memory database
const db = {};

// Configure the adapter in your C15T options
const options: C15TOptions = {
  // ...other options
  storage: memoryAdapter(db)
};
```

### Kysely Adapter

```typescript
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { kyselyAdapter } from '~/pkgs/db-adapters';
import type { C15TOptions } from '~/types';

// Create a Postgres connection pool
const pool = new Pool({
  host: 'localhost',
  database: 'consent_db',
  user: 'postgres',
  password: 'password'
});

// Create Kysely instance
const db = new Kysely({
  dialect: new PostgresDialect({ pool })
});

// Configure the adapter in your C15T options
const options: C15TOptions = {
  // ...other options
  storage: kyselyAdapter(db, { type: 'postgres' })
};
```

### Automatic Adapter Selection

The package also provides a utility to automatically select the appropriate adapter based on your configuration:

```typescript
import { getAdapter } from '~/db/utils/adapter-factory';
import type { C15TOptions } from '~/types';

// Configure C15T with database options
const options: C15TOptions = {
  // ...other options
  database: {
    type: 'postgres',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'consent_db'
    }
  }
};

// Create the adapter
const adapter = await getAdapter(options);
```

## Adapter Interface

All adapters implement a common interface providing standard methods for database operations:

- `create`: Create a new record
- `findOne`: Find a single record
- `findMany`: Find multiple records
- `count`: Count records
- `update`: Update a single record
- `updateMany`: Update multiple records
- `delete`: Delete a single record
- `deleteMany`: Delete multiple records
- `transaction`: Execute operations in a transaction 