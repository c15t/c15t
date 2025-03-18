# Modular Imports

The `@doubletie/core` package is designed with a modular architecture that allows you to import only the specific functionality you need, helping to reduce bundle sizes in your application.

## Available Import Paths

The package exposes the following import paths:

- `@doubletie/core` - The full package with all functionality
- `@doubletie/core/schema` - Schema and field definition utilities
- `@doubletie/core/entity` - Entity definition and relationship utilities
- `@doubletie/core/db` - Database adapters and utilities
- `@doubletie/core/validation` - Validation utilities
- `@doubletie/core/config` - Configuration utilities

## Usage Examples

### Full Import (All Modules)

```typescript
import { 
  defineEntity, 
  uuidField, 
  generateSQLForEntity, 
  validateEntity 
} from '@doubletie/core';
```

### Modular Imports

```typescript
// Only entity-related functionality
import { defineEntity } from '@doubletie/core/entity';

// Only schema field utilities
import { uuidField, stringField } from '@doubletie/core/schema';

// Only database-related functionality
import { generateSQLForEntity } from '@doubletie/core/db';

// Only validation functionality
import { validateEntity } from '@doubletie/core/validation';

// Only configuration functionality
import { appConfig } from '@doubletie/core/config';
```

## Bundle Size Benefits

Using modular imports can significantly reduce your application's bundle size, especially if you only need specific parts of the library:

| Import Path | Approximate Size (Minified) | Use Case |
|-------------|----------------------------|----------|
| Full package | ~150KB | When you need most functionality |
| `/schema` | ~50KB | When you only need field definitions |
| `/entity` | ~35KB | When you only need entity definitions |
| `/db` | ~60KB | When you only need database functionality |
| `/validation` | ~30KB | When you only need validation |
| `/config` | ~15KB | When you only need configuration |

*Note: Sizes are approximate and may vary based on dependencies and bundler configurations.*

## Best Practices

1. **Import Only What You Need**: Use the most specific import path for your needs to minimize bundle size.

2. **Use Module Imports for Library Creation**: If you're building a library on top of `@doubletie/core`, consider using modular imports to keep your library's dependencies minimal.

3. **Dynamic Imports**: For features that are not needed immediately, consider using dynamic imports to load modules on demand:

   ```typescript
   async function generateDatabaseSchema() {
     const { generateSQLForEntity } = await import('@doubletie/core/db');
     return generateSQLForEntity(userEntity, 'postgres');
   }
   ```

4. **Consistent Import Style**: Choose either the full package or modular imports and be consistent throughout your application to avoid redundant code in your bundle.

## Example: Optimized Imports

```typescript
// Before: Importing everything from the main package
import { defineEntity, uuidField, validateEntity } from '@doubletie/core';

// After: Importing only what's needed from specific modules
import { defineEntity } from '@doubletie/core/entity';
import { uuidField } from '@doubletie/core/schema';
import { validateEntity } from '@doubletie/core/validation';
```

## Example Project Structure

```
src/
  models/
    user.ts        # imports from @doubletie/core/entity and @doubletie/core/schema
  database/
    generators.ts  # imports from @doubletie/core/db
  validation/
    forms.ts       # imports from @doubletie/core/validation
  config/
    app.ts         # imports from @doubletie/core/config
```

This approach organizes your code by functionality and minimizes imports to only what's needed in each module. 