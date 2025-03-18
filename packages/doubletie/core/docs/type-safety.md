# Type Safety Enhancements in Doubletie

This document outlines the type safety features available in the Doubletie library and how to leverage them effectively in your applications.

## Overview

Doubletie provides robust type safety through a combination of:

1. **Type Guards** - Runtime type checking functions that verify data structures
2. **Type Inference Utilities** - TypeScript utilities that help extract and transform types
3. **Discriminated Unions** - Pattern for type-safe handling of different types
4. **Assertion Functions** - Functions that validate assumptions and throw errors if conditions aren't met

## Type Guards

Type guards are functions that perform runtime type checking and provide TypeScript with type information. They follow the pattern `isSomething(value): value is Something`.

### Available Type Guards

```typescript
// Core type guards
isObject(value): value is Record<string, unknown>
isFunction(value): value is Function
isArray(value): value is unknown[]
isString(value): value is string
isNumber(value): value is number
isBoolean(value): value is boolean

// Entity type guards
isEntityStructure(value): value is EntityStructure
isEntitySchemaDefinition(value): value is EntitySchemaDefinition
isSchemaField(value): value is SchemaField<any, any>
isStandardSchema(value): value is StandardSchemaV1
isResolvedEntitySchema(value): value is ResolvedEntitySchema

// Relationship type guards
isRelationshipType(value): value is RelationshipType
isRelationshipConfig(value): value is RelationshipConfig

// Database type guards
isDatabaseConfig(value): value is DatabaseConfig
isTableDefinition(value): value is TableDefinition<any>

// Validation type guards
isValidationError(value): value is ValidationError
```

### Using Type Guards

Type guards can be used in conditional statements to narrow down types:

```typescript
if (isEntityStructure(value)) {
  // TypeScript knows that value is an EntityStructure here
  console.log(value.name);
  console.log(value.fields);
}
```

Or with assertion functions:

```typescript
assertType(value, isEntityStructure, 'Invalid entity structure');

// After this line, TypeScript knows value is an EntityStructure
console.log(value.name);
```

## Type Inference Utilities

Type inference utilities help extract types from complex structures and improve type safety.

### Available Type Inference Utilities

```typescript
// Entity type inference
type InferEntityFromReference<T extends EntityFieldReference>
type InferFieldFromReference<T extends EntityFieldReference>
type InferValueFromField<F extends SchemaField>
type EntityRecord<T extends EntityStructure>
type EntityRelationships<T extends EntityWithRelationships>
type EntityInput<T extends EntityFromDefinition>
type EntityOutput<T extends EntityFromDefinition>
type RelatedEntityType<TEntity, TFieldName>

// General purpose utilities
type IsArray<T>
type DeepPartial<T>
type NonNullableFields<T>
type RequireFields<T, K extends keyof T>
type FieldsByType<T extends EntityStructure, TFieldType>
type RequiredEntityRecord<T extends EntityStructure>
```

### Using Type Inference Utilities

These utilities help extract and transform types for better type checking:

```typescript
// Extract entity type from a relationship
type UserEntity = RelatedEntityType<PostEntity, 'author'>;

// Get the input type for validation
type CreateUserInput = EntityInput<UserEntity>;

// Get the output type after validation
type UserData = EntityOutput<UserEntity>;

// Create a partial type for updates
type UpdateUserInput = DeepPartial<EntityRecord<UserEntity>>;

// Create a type with required fields
type RequiredUserInput = RequireFields<UserInput, 'username' | 'email'>;
```

## Type-Safe Validation

Doubletie provides type-safe validation through the `createTypedValidator` function:

```typescript
const userValidator = createTypedValidator<UserEntity>();

// Later in your code
const validateUser = async (userData: DeepPartial<EntityRecord<UserEntity>>) => {
  try {
    // userValidator has proper type inference
    const validatedUser = await userValidator(userData, userEntity);
    return validatedUser; // Fully typed as EntityRecord<UserEntity>
  } catch (error) {
    if (isValidationError(error)) {
      // Handle validation error with typed issues property
      console.error(error.issues);
    }
    throw error;
  }
};
```

## Assertion Functions

Assertion functions validate conditions at runtime and improve type inference:

```typescript
// Assert a condition with a custom error message
assertCondition(value !== null, 'Value cannot be null');

// Assert a type with a type guard and custom error message
assertType(value, isEntityStructure, 'Value must be an entity structure');
```

## Practical Examples

### Type-Safe Entity Definition

```typescript
const userEntity = defineEntity({
  name: 'user',
  fields: {
    id: { type: 'uuid', primaryKey: true },
    username: { type: 'string', required: true },
    email: { type: 'string', required: true },
    createdAt: { type: 'date', defaultValue: () => new Date() }
  }
});

// TypeScript knows the exact structure of this entity
type UserEntityType = typeof userEntity;
```

### Type-Safe Relationships

```typescript
const postEntity = defineEntity({
  name: 'post',
  fields: {
    id: { type: 'uuid', primaryKey: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true }
  }
}).withRelationships(helpers => ({
  // Fully type-safe relationship
  author: helpers.manyToOne(userEntity, 'id')
}));

// The relationship type is fully inferred
type PostAuthorRelationship = RelatedEntityType<typeof postEntity, 'author'>;
```

### Type-Safe Database Operations

```typescript
// Generate a table definition with proper typing
const userTable = userEntity.getTable<{ includeTimestamps: boolean }>({
  includeTimestamps: true
});

// TypeScript knows the structure of the table definition
type UserTable = typeof userTable;
```

## Best Practices

1. **Always use type guards for runtime validation** - They provide both runtime safety and improved types.
2. **Leverage type inference utilities** - They extract precise types from your entities.
3. **Use assertion functions for validating assumptions** - They improve both runtime safety and type inference.
4. **Be explicit with generics when needed** - Sometimes TypeScript needs help with complex types.
5. **Use discriminated unions for different cases** - They provide exhaustive type checking.

## Debugging Type Issues

If you encounter type issues, check:

1. Is the data properly validated with type guards?
2. Are you using the correct type inference utilities?
3. Do you need to add explicit type annotations?
4. Are you asserting types correctly?

## Further Resources

- [TypeScript Handbook: Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)
- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Doubletie API Documentation](../README.md) 