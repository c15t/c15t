# Database Migration Package

This package provides a complete system for generating and executing database migrations based on schema definitions. It includes tools for schema comparison, migration planning, and execution across different database adapters.

## Key Features

- **Schema Comparison**: Detects differences between the desired schema and the actual database schema
- **Migration Planning**: Generates migration plans based on schema differences
- **Migration Execution**: Executes migrations safely across different database systems
- **Type Mapping**: Maps abstract field types to specific database column types

## Usage

### Generating Migrations

```typescript
import { getMigrations } from '~/pkgs/migration';
import { getAdapter } from '~/db/utils/adapter-factory';
import type { C15TOptions } from '~/types';

async function generateMigrations(options: C15TOptions) {
  const adapter = await getAdapter(options);
  
  // Generate migration operations based on schema differences
  const migrations = await getMigrations({
    adapter,
    options
  });
  
  console.log(`Generated ${migrations.length} migration operations`);
  
  return migrations;
}
```

### Executing Migrations

```typescript
import { getMigrations, executeMigration } from '~/pkgs/migration';
import { getAdapter } from '~/db/utils/adapter-factory';
import type { C15TOptions } from '~/types';

async function runMigrations(options: C15TOptions) {
  const adapter = await getAdapter(options);
  
  // Generate migration operations
  const migrations = await getMigrations({
    adapter,
    options
  });
  
  // Execute each migration operation
  for (const migration of migrations) {
    await executeMigration({
      migration,
      adapter,
      options
    });
    console.log(`Executed migration: ${migration.type} for ${migration.table}`);
  }
}
```

## Architecture

The migration system is composed of several key components:

1. **Schema Generation**: Extracts the desired schema from your code
2. **Schema Comparison**: Identifies differences between the desired and actual schema
3. **Migration Planning**: Creates a sequence of operations to transform the database
4. **Migration Execution**: Safely applies the migration operations to the database

Each component is designed to be modular and adaptable to different database systems. 