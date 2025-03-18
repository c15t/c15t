# Type Guards for Doubletie

The Doubletie library includes a comprehensive set of type guards to ensure type safety at runtime. These guards help catch errors that TypeScript's static type checking might miss, especially when dealing with user input or external data.

## What Are Type Guards?

Type guards are functions that check if a value matches a specific type. They return a boolean and have special return type signatures that help TypeScript narrow down the type of a variable in conditional blocks.

## Available Type Guards

### Basic Type Guards

```typescript
import { 
  isObject, 
  isFieldType,
  assertCondition,
  assertType 
} from '@doubletie/core';

// Check if a value is a non-null object
if (isObject(someValue)) {
  // TypeScript now knows someValue is a Record<string, unknown>
  console.log(someValue.propertyName);
}

// Check if a string is a valid field type
if (isFieldType(fieldTypeString)) {
  // TypeScript now knows fieldTypeString is a FieldType
}

// Assert a condition or throw with a custom message
assertCondition(
  isObject(config) && 'adapter' in config,
  'Configuration must have an adapter property'
);

// Assert a type or throw with a custom message
const entity = assertType(
  entityValue,
  isEntityStructure,
  'Invalid entity: missing required properties'
);
// TypeScript now knows entity is an EntityStructure
```

### Entity and Schema Guards

```typescript
import { 
  isEntityStructure, 
  isEntitySchemaDefinition,
  isSchemaField,
  isStandardSchema
} from '@doubletie/core';

// Check if a value is a valid entity structure
if (isEntityStructure(entity)) {
  // TypeScript now knows entity has name and fields properties
  console.log(entity.name, Object.keys(entity.fields));
}

// Check if a value is a valid entity schema definition
if (isEntitySchemaDefinition(schema)) {
  // TypeScript now knows schema has all required properties
}

// Check if a value is a valid schema field
if (isSchemaField(field)) {
  // TypeScript now knows field has a type property
  console.log(field.type);
}

// Check if a value is a valid Standard Schema validator
if (isStandardSchema(validator)) {
  // TypeScript now knows validator has a ~standard.validate method
}
```

### Relationship Type Guards

```typescript
import { 
  isRelationshipType, 
  isRelationshipConfig 
} from '@doubletie/core';

// Check if a string is a valid relationship type
if (isRelationshipType(relType)) {
  // TypeScript now knows relType is 'oneToOne', 'oneToMany', etc.
}

// Check if an object is a valid relationship configuration
if (isRelationshipConfig(relConfig)) {
  // TypeScript now knows relConfig has a type property
  switch (relConfig.type) {
    case 'oneToOne':
      // Handle one-to-one relationship
      break;
    case 'manyToMany':
      // Handle many-to-many relationship
      console.log(relConfig.joinTable);
      break;
  }
}
```

### Database Type Guards

```typescript
import { 
  isDatabaseConfig, 
  isTableDefinition,
  isResolvedEntitySchema
} from '@doubletie/core';

// Check if an object is a valid database configuration
if (isDatabaseConfig(config)) {
  // TypeScript now knows config has an adapter property
  console.log(config.adapter);
}

// Check if an object is a valid table definition
if (isTableDefinition(table)) {
  // TypeScript now knows table has methods like getSqlSchema
  const sql = table.getSqlSchema('postgresql');
}

// Check if an object is a resolved entity schema
if (isResolvedEntitySchema(resolvedSchema)) {
  // TypeScript now knows resolvedSchema has entityName, entityPrefix, etc.
}
```

### Collection Type Guards

```typescript
import { isRecordOf, isArrayOf } from '@doubletie/core';

// Check if a value is a record of a specific type
if (isRecordOf(fieldsObj, isSchemaField)) {
  // TypeScript now knows fieldsObj is a Record<string, SchemaField>
  for (const [name, field] of Object.entries(fieldsObj)) {
    console.log(name, field.type);
  }
}

// Check if a value is an array of a specific type
if (isArrayOf(entitiesArray, isEntityStructure)) {
  // TypeScript now knows entitiesArray is EntityStructure[]
  entitiesArray.forEach(entity => console.log(entity.name));
}
```

## Error Handling with Type Guards

```typescript
import { isValidationError } from '@doubletie/core';

try {
  const result = await entity.validate(data);
  // Process result
} catch (error) {
  if (isValidationError(error)) {
    // TypeScript now knows error has an issues property
    error.issues.forEach(issue => {
      console.error(`Field ${issue.field}: ${issue.issues}`);
    });
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Use type guards for external data**: Always validate data coming from external sources like API responses or user input.

2. **Combine with TypeScript types**: Use type guards in conjunction with TypeScript's static typing for maximum safety.

3. **Use assertion functions for critical paths**: In code paths where type safety is critical, use assertion functions that throw errors when validation fails.

4. **Create custom type guards for domain objects**: Extend the built-in type guards with your own for domain-specific objects.

## Example: Complete Validation Flow

```typescript
import { 
  isObject, 
  isEntitySchemaDefinition, 
  isStandardSchema, 
  assertCondition 
} from '@doubletie/core';

function validateEntityData(data: unknown, schema: unknown, validator?: unknown) {
  // First, validate the data is an object
  assertCondition(
    isObject(data),
    'Entity data must be an object'
  );
  
  // Then, validate the schema
  assertCondition(
    isEntitySchemaDefinition(schema),
    'Invalid entity schema: missing required properties'
  );
  
  // If a validator is provided, make sure it's valid
  if (validator !== undefined) {
    assertCondition(
      isStandardSchema(validator),
      'Invalid validator: must be a Standard Schema'
    );
  }
  
  console.log('All validations passed!');
  return true;
}
```

By consistently using these type guards throughout your code, you can catch many common errors at runtime that might otherwise lead to subtle bugs or unexpected behavior. 