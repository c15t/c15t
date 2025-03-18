# 🪢 @doubletie/query-builder

A type-safe, functional query builder and model layer built on top of [Kysely](https://github.com/koskimas/kysely). Provides an elegant and intuitive API for database operations while maintaining full type safety and excellent developer experience.

## Features

- 🔒 **Fully Type-Safe**: Complete TypeScript support with inferred types from your database schema
- 🎯 **Functional Approach**: Clean, functional programming style API
- 🔄 **Transaction Support**: Robust transaction handling with async/await and afterCommit hooks
- 🎨 **Query Building**: Powerful query building capabilities inherited from Kysely with additional utilities
- 🛠 **Model Layer**: Type-safe model abstractions for common database operations
- 📦 **Multi-Dialect Support**: Works with PostgreSQL, MySQL, and SQLite through Kysely
- 🔍 **Query Utilities**: Helper methods for common database operations
- 🚀 **Performance Focused**: Minimal overhead on top of Kysely
- ⬆️ **Always Current**: Maintained in sync with the latest Kysely releases

## Installation

```bash
npm install @doubletie/query-builder kysely
# or
yarn add @doubletie/query-builder kysely
```

## Prerequisites

@doubletie/query-builder is a query builder and model layer that works with existing database schemas. You'll need:

1. An existing database with tables
2. A migration system (you can use Kysely's built-in migrator)
3. TypeScript definitions for your database schema

## Basic Usage

### 1. Define Your Database Schema Types

```typescript
interface Database {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: Date;
  };
  posts: {
    id: number;
    title: string;
    content: string;
    user_id: number;
    created_at: Date;
  };
}
```

### 2. Create Database Instance

```typescript
import { createDatabase } from '@doubletie/query-builder';
import { PostgresDialect } from 'kysely';

const db = createDatabase<Database>({
  dialect: new PostgresDialect({
    host: 'localhost',
    database: 'mydb',
    user: 'postgres',
    password: 'password'
  }),
  // Optional configuration
  debug: true,
  log: (event) => console.log(event)
});
```

### 3. Define Model Layer

```typescript
import { createModel, ModelSchema } from '@doubletie/query-builder';

// Define type-safe model schema
const userSchema: ModelSchema<Database['users']> = {
  fields: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string' },
    created_at: { type: 'date' }
  },
  // Define query helpers and utilities
  extensions: {
    async findByEmail(email: string) {
      return this.findOne('email', email);
    }
  }
};

// Register model schemas
const models = {
  users: {
    schema: userSchema,
    primaryKey: { field: 'id' }
  }
};

db.registerModels(models);

// Get the model interface
const userModel = db.getModel('users');
```

### 4. Use the Model Layer for Queries

```typescript
// Type-safe queries
const user = await userModel.findById(1);

// Complex queries with type checking
const users = await userModel.selectFrom()
  .leftJoin('posts', 'users.id', 'posts.user_id')
  .where('email', 'like', '%@example.com')
  .selectAll()
  .execute();

// Bulk operations
const newUsers = await userModel.insertInto()
  .values([
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' }
  ])
  .execute();
```

### 5. Transaction Support with Hooks

```typescript
await db.transaction(async ({ transaction, afterCommit }) => {
  const user = await userModel.findById(1);
  
  const post = await postModel.insertInto()
    .values({
      title: 'New Post',
      user_id: user.id
    })
    .execute();

  // Register a callback to run after successful commit
  afterCommit(async () => {
    await sendNotification(user.id, 'New post created!');
  });
});
```

## Query Utilities

### Row Locking

```typescript
// Get a record with FOR UPDATE lock
const user = await userModel.getByIdForUpdate(1);
```

### Expression Queries

```typescript
// Using SQL expressions for dynamic limits
const users = await userModel.withExpressionLimit(
  sql`(SELECT COUNT(*) / 2 FROM users)`
).execute();
```

### Tuple Comparisons

```typescript
// Multi-column queries
const users = await userModel.findByTuple(
  ['name', 'email'],
  ['John Doe', 'john@example.com']
);
```

## Type Safety Examples

```typescript
// TypeScript will catch invalid column names
userModel.find('invalid_column', 123); // ❌ Type error

// Type-safe updates
userModel.updateTable()
  .set({ 
    name: 'John',    // ✅ OK
    invalid: 'test'  // ❌ Type error
  })
  .execute();
```

## Best Practices

1. **Use Transactions**: Always use transactions for operations that modify multiple records
2. **Leverage Type Safety**: Define complete database schema types
3. **Use Query Utilities**: Take advantage of the built-in query helpers
4. **Handle Errors**: Use try-catch blocks and proper error handling
5. **Use Logging**: Enable the built-in logging capabilities for debugging
6. **Use Prepared Statements**: Leverage Kysely's built-in SQL injection protection

## Database Migrations

For database migrations, we recommend using Kysely's migration system directly:

```typescript
import { Migrator, FileMigrationProvider } from 'kysely';

const migrator = db.createMigrator({
  provider: new FileMigrationProvider({
    migrationFolder: './migrations'
  })
});

// Run migrations
await migrator.migrateToLatest();
```

## Comparison with Kysely ORM

While Kysely ORM provides a traditional ORM experience, @doubletie/query-builder takes a different approach by focusing on functional programming patterns and developer experience. We offer built-in transaction hooks, zero-cost type safety, and intuitive query utilities while maintaining minimal overhead. Our library is ideal for developers who prefer explicit, predictable behavior and clean APIs over traditional ORM features. If you need advanced transaction handling, efficient bulk operations, and excellent TypeScript support without the complexity of a full ORM, @doubletie/query-builder is the better choice.


## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details