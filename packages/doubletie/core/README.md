# Doubletie Core

A flexible and type-safe schema definition system for building database abstractions with validation.

## Features

- Fully type-safe schema definitions
- Standard Schema validation integration
- Field name and entity overrides
- Builder pattern for type-safe references with autocompletion
- Runtime validation of references
- **Build-time type validation** using TypeScript's type system
- Database field mapping

## Installation

```bash
npm install @doubletie/core
```

## Basic Usage

```typescript
import { z } from 'zod';
import { defineEntity, field } from '@doubletie/core';

// Define an entity with validation
const userEntity = defineEntity(
  {
    name: 'user',
    fields: {
      id: field('uuid', {
        required: true,
        validator: z.string().uuid()
      }),
      email: field('string', {
        required: true,
        validator: z.string().email()
      })
    }
  },
  // Entity-level validator
  z.object({
    id: z.string().uuid(),
    email: z.string().email()
  })
);

// Use the entity
async function createUser(data) {
  const validData = await userEntity.validate(data);
  return validData;
}
```

## Type-Safe References with Validation

The builder pattern allows for type-safe references between entities with full validation:

```typescript
// Define entities first
const postEntity = defineEntity({
  name: 'post',
  fields: {
    id: field('uuid', { required: true }),
    title: field('string', { required: true }),
    authorName: field('string', { required: true })
  }
});

const commentEntity = defineEntity({
  name: 'comment',
  fields: {
    id: field('uuid', { required: true }),
    content: field('string', { required: true }),
    // Define the field structure without reference details
    postId: field('string', { required: true })
  }
})
// Add type-safe references with autocomplete
.withReferences(refs => ({
  // TypeScript will provide autocomplete for all fields from postEntity
  // Start typing and press Ctrl+Space to see the available fields (id, title, authorName)
  postId: refs.to(postEntity, 'id') // Only valid field names are accepted
}));
```

## Relationship Types

Doubletie supports various relationship types between entities:

### 1. One-to-One Relationships

```typescript
const userEntity = defineEntity({
  name: 'user',
  fields: {
    id: field('uuid', { required: true }),
    // other fields...
  }
});

const profileEntity = defineEntity({
  name: 'profile',
  fields: {
    id: field('uuid', { required: true }),
    userId: field('uuid', { required: true }),
    // other profile fields...
  }
}).withReferences(refs => ({
  // One-to-one relationship
  userId: refs.to(userEntity, 'id', {
    type: 'oneToOne'
  })
}));
```

### 2. One-to-Many Relationships

```typescript
const authorEntity = defineEntity({
  name: 'author',
  fields: {
    id: field('uuid', { required: true }),
    name: field('string', { required: true }),
    // other fields...
  }
});

const bookEntity = defineEntity({
  name: 'book',
  fields: {
    id: field('uuid', { required: true }),
    title: field('string', { required: true }),
    authorId: field('uuid', { required: true }),
    // other fields...
  }
});

// Express the relationship from the "one" side
const authorWithBooks = authorEntity.withReferences(refs => ({
  books: refs.to(bookEntity, 'id', {
    type: 'oneToMany',
    foreignKey: 'authorId'
  })
}));

// Express the relationship from the "many" side
const bookWithAuthor = bookEntity.withReferences(refs => ({
  authorId: refs.to(authorEntity, 'id', {
    type: 'manyToOne'
  })
}));
```

### 3. Many-to-Many Relationships

```typescript
const studentEntity = defineEntity({
  name: 'student',
  fields: {
    id: field('uuid', { required: true }),
    name: field('string', { required: true }),
    // other fields...
  }
});

const courseEntity = defineEntity({
  name: 'course',
  fields: {
    id: field('uuid', { required: true }),
    title: field('string', { required: true }),
    // other fields...
  }
});

// Many-to-many relationship from student to courses
const studentWithCourses = studentEntity.withReferences(refs => ({
  courses: refs.to(courseEntity, 'id', {
    type: 'manyToMany',
    joinTable: {
      tableName: 'student_courses',
      sourceColumn: 'studentId',
      targetColumn: 'courseId',
      // Optional: additional columns in the join table
      additionalColumns: {
        enrollmentDate: field('date', { required: true })
      }
    }
  })
}));

// Many-to-many relationship from course to students
const courseWithStudents = courseEntity.withReferences(refs => ({
  students: refs.to(studentEntity, 'id', {
    type: 'manyToMany',
    joinTable: {
      tableName: 'student_courses',
      sourceColumn: 'courseId',
      targetColumn: 'studentId'
    }
  })
}));
```

### Additional Configuration Options

Relationship configuration also supports:

```typescript
// Cascade example
userId: refs.to(userEntity, 'id', {
  type: 'oneToOne',
  cascade: true // Delete related records when the source is deleted
});

// Fetch strategy example
authorId: refs.to(authorEntity, 'id', {
  type: 'manyToOne',
  fetch: 'eager' // Automatically fetch the related entity when querying
});
```

## Build-Time Type Validation

Doubletie Core provides powerful type utilities for validating references at build time:

### 1. Check if a Field Exists

```typescript
import { IsValidReference } from '@doubletie/core';

// These are purely type-level checks (no runtime overhead)
type PostHasId = IsValidReference<typeof postEntity, 'id'>; // true
type PostHasInvalidField = IsValidReference<typeof postEntity, 'nonExistent'>; // false

// Can be used for conditional types
type FieldType<E, F extends string> = 
  IsValidReference<E, F> extends true ? string : never;
```

### 2. Extract Entity Field Names

```typescript
import { EntityFields } from '@doubletie/core';

type PostFields = EntityFields<typeof postEntity>; // 'id' | 'title' | 'authorName'
 
// Create type-safe functions that work with entity fields
function getFieldValue<E, F extends EntityFields<E>>(
  entity: E,
  fieldName: F, // Only valid field names are accepted
  data: Record<string, unknown>
): unknown {
  return data[fieldName as string];
}
```

### 3. Validate References at Build Time

```typescript
import { ValidateReferences } from '@doubletie/core';

// Define the shape of your references
type CommentReferences = {
  postId: { model: 'post', field: 'id' }, // Valid
  authorId: { model: 'user', field: 'nonExistent' } // Invalid!
};

// This will contain 'never' types for invalid references
type ValidatedRefs = ValidateReferences<typeof commentEntity, CommentReferences>;

// TypeScript will show errors for invalid references at build time
```

### Benefits of Build-Time Validation

1. **Zero Runtime Overhead** - Type checks happen only during development
2. **Earlier Error Detection** - Catch reference issues at build time instead of runtime
3. **Better IDE Support** - Get immediate feedback in your editor
4. **Type-Safe Functions** - Build functions that can only operate on valid entity fields
5. **Reference Integrity** - Ensure all references point to valid fields

### Runtime Reference Validation

In addition to type checking, references are validated at runtime:

```typescript
try {
  // This will throw an error because 'nonExistentField' doesn't exist on postEntity
  const invalidEntity = defineEntity({
    name: 'invalid',
    fields: {
      linkField: field('string', { required: true }),
    }
  }).withReferences(refs => ({
    linkField: refs.to(postEntity, 'nonExistentField') // Runtime error!
  }));
} catch (error) {
  console.error(error.message);
  // Prints: "Reference Error: Field 'nonExistentField' does not exist in entity 'post'.
  // Available fields: id, title, authorName"
}
```

## Field vs Entity Validation

Doubletie Core supports two levels of validation:

### Field-Level Validation

```typescript
title: field('string', {
  required: true,
  validator: z.string().min(5).max(100)
})
```

### Entity-Level Validation

```typescript
defineEntity(
  { /* schema definition */ },
  // Entity-level validator
  z.object({
    title: z.string().min(5),
    tags: z.array(z.string()).min(1)
  })
)
```

Entity-level validation is useful for validating relationships between fields, while field-level validation is great for field-specific constraints.

## Configuration and Overrides

You can provide configuration to override field names and entity properties:

```typescript
const config = {
  tables: {
    user: {
      entityName: 'app_users', // Override table name
      fields: {
        email: 'user_email' // Override field name
      }
    }
  }
};

// Use configuration
const userTable = userEntity.getTable(config);
```

## License

MIT