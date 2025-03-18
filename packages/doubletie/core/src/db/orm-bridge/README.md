# ORM Bridge Adapters

This module provides bridge adapters to connect the core database interface with various ORMs and query builders.

## Supported ORMs

- **Prisma**: Full-featured ORM with schema definition, migrations, and type safety
- **Drizzle**: Lightweight, type-safe SQL query builder
- **Kysely**: SQL query builder with type safety
- **Memory**: In-memory database for testing

## Usage

Each ORM bridge provides a consistent API while allowing you to leverage the unique features and benefits of your chosen ORM.

### Basic Usage Pattern

```typescript
// 1. Create or import your ORM/query builder client
const prisma = new PrismaClient();

// 2. Create the bridge adapter
const adapter = createPrismaAdapter(prisma, { provider: 'postgresql' });

// 3. Initialize the adapter with your entity definitions
adapter.initialize({
  entities: {
    user: userEntity,
    post: postEntity,
  },
  adapter: 'prisma',
  options: {
    provider: 'postgresql',
  }
});

// 4. Use the adapter with the same API as direct database adapters
const user = await adapter.findById('user', 'user-123');
```

### Configuration-based Initialization

You can also initialize the appropriate adapter based on your application configuration:

```typescript
// Database configuration
const dbConfig = {
  adapter: 'prisma', // Or 'drizzle', 'kysely', 'memory'
  entities: {
    user: userEntity,
    post: postEntity,
  },
  options: {
    provider: 'postgresql',
  }
};

// External clients provided by your application
const externalClients = {
  prisma: new PrismaClient(),
  drizzle: drizzle(sqlite),
  kysely: kyselyDb,
};

// Initialize the adapter based on configuration
const adapter = initializeOrmAdapter(dbConfig, externalClients);

if (adapter) {
  adapter.initialize(dbConfig);
  // Use the adapter...
}
```

## Adapter-Specific Features

### Prisma

- Schema generation for Prisma schema files
- Support for all Prisma database providers (PostgreSQL, MySQL, SQLite, etc.)
- Transactions with Prisma's transaction API

### Drizzle

- Direct integration with Drizzle's query builder
- Support for all Drizzle database drivers
- Efficient and lightweight

### Kysely

- Type-safe query building
- Support for all Kysely database dialects
- Extensible with Kysely plugins

### Memory

- In-memory database for testing
- No database setup required
- Fast and isolated test environment

## CRUD Operations

All adapters support the core CRUD operations:

- **Create**: `adapter.insert(tableName, data)`
- **Read**: 
  - `adapter.findById(tableName, id)`
  - `adapter.findOne(tableName, filter)`
  - `adapter.find(tableName, filter, options)`
  - `adapter.count(tableName, filter)`
- **Update**:
  - `adapter.updateById(tableName, id, data)`
  - `adapter.update(tableName, filter, data)`
- **Delete**:
  - `adapter.deleteById(tableName, id)`
  - `adapter.delete(tableName, filter)`

## Query Conditions

You can use a familiar MongoDB-like query syntax:

```typescript
// Find users with complex filtering
const users = await adapter.find('user', {
  // Simple equality
  role: 'admin',
  
  // Operators
  age: { $gt: 21 },
  name: { $contains: 'Smith' },
  
  // Logical operators
  $or: [
    { city: 'New York' },
    { city: 'Boston' }
  ]
});
```

## Transactions

All adapters support transactions for atomic operations:

```typescript
await adapter.transaction(async (tx) => {
  // Create a user
  const user = await tx.insert('user', { name: 'John', email: 'john@example.com' });
  
  // Create a profile for the user
  await tx.insert('profile', { userId: user.id, bio: 'Developer' });
});
```

## Schema Generation

Some adapters support generating schema definitions:

```typescript
if (adapter.adapter.createSchema) {
  const schema = await adapter.adapter.createSchema({
    entities: {
      user: userEntity,
    },
    config: {
      adapter: 'prisma',
    }
  });
  
  // Write the schema to a file
  writeFileSync(schema.path, schema.code);
}
```

## Extending the Bridge

You can create your own bridge adapter by implementing the `Adapter` interface and creating a bridge adapter with `OrmBridgeAdapter`. 