# Database Adapters

The core package provides a flexible database adapter system that allows your entity schemas to be mapped to different database systems. This documentation explains how to use the adapters, their features, and how to extend them for custom needs.

## Overview

Database adapters bridge the gap between your entity schemas and the specific requirements of database systems. They handle:

1. Type mapping (e.g., mapping schema field types to specific database column types)
2. SQL generation for table creation
3. Value transformation between application and database formats
4. Database-specific features and optimizations

The core package comes with built-in adapters for:
- SQLite
- MySQL
- PostgreSQL

## Using Database Adapters

### Basic Usage

```typescript
import { 
  defineEntity, 
  uuidField, 
  stringField, 
  getAdapter, 
  generateTableDefinition,
  generateSQLForEntity
} from '@doubletie/core';

// Define your entity schema
const userEntity = defineEntity({
  name: 'user',
  fields: {
    id: uuidField(),
    username: stringField({ required: true }),
    email: stringField({ required: true }),
    // ...other fields
  }
});

// Generate SQL for different database systems
const sqliteSQL = generateSQLForEntity(userEntity, 'sqlite');
const mysqlSQL = generateSQLForEntity(userEntity, 'mysql');
const postgresSQL = generateSQLForEntity(userEntity, 'postgres');

console.log(sqliteSQL);
// CREATE TABLE "user" (
//   "id" TEXT NOT NULL,
//   "username" TEXT NOT NULL,
//   "email" TEXT NOT NULL,
//   PRIMARY KEY ("id")
// );

// Get a specific adapter
const postgresAdapter = getAdapter('postgres');

// Generate table definition
const tableDef = postgresAdapter.generateTableDefinition(userEntity);

// Generate SQL directly using the adapter
const sql = postgresAdapter.generateCreateTableSQL(tableDef);
```

### Value Transformations

Adapters also handle transforming values between application format and database format:

```typescript
import { getAdapter } from '@doubletie/core';

const adapter = getAdapter('mysql');
const field = userEntity.fields.createdAt;

// Transform from application to database format
const dbValue = adapter.toDatabase(field, new Date());
// Result: '2023-06-15 09:00:00' (string)

// Transform from database to application format
const appValue = adapter.fromDatabase(field, '2023-06-15 09:00:00');
// Result: Date object
```

## Database Hints

You can provide database-specific hints in your field definitions to customize how fields are mapped to each database system:

```typescript
const productEntity = defineEntity({
  name: 'product',
  fields: {
    id: uuidField(),
    name: stringField({
      required: true,
      databaseHints: {
        // Common hints for all database systems
        indexed: true,
        unique: true,
        maxSize: 100,
        
        // SQLite-specific hints
        sqlite: {
          collation: 'NOCASE'
        },
        
        // MySQL-specific hints
        mysql: {
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci'
        },
        
        // PostgreSQL-specific hints
        postgres: {
          collation: 'C',
          tablespace: 'myspace'
        }
      }
    }),
    price: numberField({
      required: true,
      databaseHints: {
        precision: 10,
        scale: 2
      }
    })
  }
});
```

## Common Database Hints

| Hint | Description | Applicable Types |
|------|-------------|-----------------|
| `maxSize` | Maximum size for strings or binary data | string, binary |
| `precision` | Total number of digits for decimal numbers | number |
| `scale` | Number of decimal places for decimal numbers | number |
| `indexed` | Whether to create an index for this field | all |
| `unique` | Whether values must be unique | all |
| `autoIncrement` | Whether to auto-increment the value | number |
| `collation` | Collation for text comparison | string |
| `integer` | Whether to use integer type instead of float | number |
| `bits` | Bit size for integer types (8, 16, 32, 64) | number |
| `includeTime` | Whether to include time component in date fields | date |
| `includeTimezone` | Whether to include timezone information | date |

## Database-Specific Hints

### SQLite Hints

| Hint | Description |
|------|-------------|
| `collation` | Collation name for string comparisons |

### MySQL Hints

| Hint | Description |
|------|-------------|
| `charset` | Character set for string columns |
| `collation` | Collation for string columns |
| `unsigned` | Whether number is unsigned |
| `zerofill` | Whether to zero-fill numbers to their display width |
| `engine` | Storage engine for the table |

### PostgreSQL Hints

| Hint | Description |
|------|-------------|
| `collation` | Collation name for string columns |
| `tablespace` | Tablespace where to create the table |
| `using` | Index method to use for indexed fields |
| `timezone` | Timezone for timestamptz fields |

## Custom Adapters

You can create your own adapters for other database systems or customize existing ones:

```typescript
import { BaseAdapter, registerAdapter } from '@doubletie/core';

class CustomAdapter extends BaseAdapter {
  type = 'custom-db';
  displayName = 'Custom Database';
  
  // Implement required methods
  mapFieldToColumn(fieldName, field, entityName) {
    // Your implementation
  }
  
  generateCreateTableSQL(tableDef) {
    // Your implementation
  }
  
  // Override transformation methods if needed
  toDatabase(field, value) {
    // Custom transformation logic
  }
  
  fromDatabase(field, value) {
    // Custom transformation logic
  }
}

// Register your custom adapter
registerAdapter(new CustomAdapter());

// Now you can use it
const sql = generateSQLForEntity(userEntity, 'custom-db');
```

## Best Practices

1. **Use Common Database Hints When Possible**: They're automatically mapped to the appropriate database-specific settings.

2. **Keep Database-Specific Logic in Adapters**: Avoid database-specific code in your application logic.

3. **Test with All Target Databases**: Make sure your schema works correctly with all database systems you plan to support.

4. **Use Field Utility Functions**: They provide a clean way to define fields with appropriate hints and validations.

5. **Consider Performance Implications**: Different databases have different performance characteristics for various data types and operations.

## Troubleshooting

- **Type Mapping Issues**: If you see unexpected column types, check the field definition and add appropriate hints.
- **SQL Generation Errors**: Make sure your field definitions are compatible with the target database.
- **Value Transformation Problems**: Check the adapter's transformation methods for the specific field type. 