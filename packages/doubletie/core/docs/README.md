# Core Package Documentation

The `@doubletie/core` package provides a flexible, type-safe foundation for defining data schemas and working with databases across different environments.

## Key Features

- **Schema Definition System**: Define your data models once with full type safety
- **Custom Field Types**: Specialized field types for common patterns (IDs, timestamps, etc.)
- **Database Adapter System**: Support for different database systems without changing your models
- **Validation**: Zod-powered validation for all your data
- **Type Safety**: Full TypeScript support with inferred types from your schemas

## Getting Started

```typescript
// Using the full package
import { 
  defineEntity, 
  uuidField, 
  stringField, 
  emailField, 
  createdAtField, 
  generateSQLForEntity 
} from '@doubletie/core';

// Or using modular imports for smaller bundle size
import { defineEntity } from '@doubletie/core/entity';
import { uuidField, stringField, emailField, createdAtField } from '@doubletie/core/schema';
import { generateSQLForEntity } from '@doubletie/core/db';

// Define a user entity
const userEntity = defineEntity({
  name: 'user',
  fields: {
    id: uuidField(),
    username: stringField({ required: true }),
    email: emailField({ required: true }),
    createdAt: createdAtField()
  },
  description: 'User account information'
});

// Validate user data
const userData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'johndoe',
  email: 'john@example.com'
};

const validatedUser = userEntity.validate(userData);
// validatedUser has the correct types and includes an auto-generated createdAt timestamp

// Generate SQL for different databases
const sqliteSQL = generateSQLForEntity(userEntity, 'sqlite');
const mysqlSQL = generateSQLForEntity(userEntity, 'mysql');
const postgresSQL = generateSQLForEntity(userEntity, 'postgres');
```

## Documentation Sections

- [Schema Definition](./schema-definition.md): Learn how to define entities and fields
- [Field Types](./field-types.md): Overview of available field types and custom field creation
- [Database Adapters](./database-adapters.md): Working with different database systems
- [Validation](./validation.md): Data validation and transformation
- [Type Safety](./type-safety.md): Leveraging TypeScript types
- [Modular Imports](./modular-imports.md): Using granular imports to reduce bundle size

## Schema Definition

At the core of the package is the `defineEntity` function, which allows you to define your data models with type safety:

```typescript
const productEntity = defineEntity({
  name: 'product',
  fields: {
    id: uuidField(),
    name: stringField({ required: true }),
    price: numberField({ 
      required: true,
      databaseHints: { precision: 10, scale: 2 }
    }),
    description: stringField(),
    createdAt: createdAtField(),
    updatedAt: updatedAtField()
  },
  description: 'Product information'
});
```

## Field Types

The package provides specialized field types for common data patterns:

```typescript
// ID fields
const id = uuidField();
const autoId = incrementalIdField(1000);
const prefixedId = prefixedIdField('usr_');

// String fields
const name = stringField({ minLength: 2, maxLength: 100 });
const email = emailField({ required: true });
const slug = slugField();

// Date fields
const created = createdAtField();
const updated = updatedAtField();
const deleted = deletedAtField();

// Complex fields
const metadata = jsonField();
const tags = stringArrayField();
```

## Database Support

The package includes adapters for different database systems:

- SQLite
- MySQL
- PostgreSQL

You can generate database-specific SQL or table definitions:

```typescript
import { generateSQLForEntity, getAdapter } from '@doubletie/core';

// Generate SQL for a specific database
const sql = generateSQLForEntity(userEntity, 'postgres');

// Or work directly with the adapter
const adapter = getAdapter('mysql');
const tableDef = adapter.generateTableDefinition(userEntity);
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details on how to contribute to this package. 