# Schema Guide

This guide is based on the vendored Schema module and common repo usage in `./.repos/effect`.

Key source files:

- `./.repos/effect/packages/effect/src/Schema.ts`
- `./.repos/effect/packages/effect/src/SchemaTransformation.ts`
- `./.repos/effect/packages/effect/src/SchemaGetter.ts`
- `./.repos/effect/packages/effect/src/SchemaIssue.ts`
- `./.repos/effect/packages/effect/src/JsonSchema.ts`

Representative repo usage:

- `./.repos/effect/packages/tools/ai-codegen/src/Config.ts`
- `./.repos/effect/packages/platform-node/test/fixtures/rpc-schemas.ts`
- `./.repos/effect/packages/platform-browser/test/IndexedDbQueryBuilder.test.ts`
- `./.repos/effect/packages/tools/openapi-generator/`

## Mental Model

Schema is the standard way to:

- define data shapes
- validate unknown input
- encode typed values back to serialized form
- transform between encoded and decoded representations
- attach metadata and constraints

The repo uses Schema pervasively for:

- protocol payloads
- configuration
- HTTP and RPC contracts
- database row decoding
- error types
- derived tooling such as JSON Schema and arbitrary generation

## Preferred Rule

Prefer Schema-based types whenever data crosses a boundary or should be validated, transformed, documented, or encoded.

Typical boundaries:

- HTTP requests and responses
- RPC payloads
- database rows
- config files
- worker messages
- persisted data
- domain errors

## What A Schema Actually Is

A schema is not just a static shape.

It is a contract between:

- the decoded in-memory value you want to work with
- the encoded representation that comes from or goes to some boundary

This is the most important thing many implementations get wrong.

Do not think of Schema as “a typed struct definition.”
Think of it as:

- validation
- decoding
- encoding
- transformation
- metadata
- reuse across boundaries

Because of that, schemas should not be duplicated unless there is a real semantic difference.

If two schemas describe the same logical model but differ only because one boundary encodes a field differently, prefer one schema with transformations instead of two parallel schemas.

## Avoid Duplicating Schemas

Do not create multiple parallel schemas for the same logical entity unless they truly represent different models.

Bad pattern:

```ts
const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})

const TodoSql = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.BooleanFromBit
})
```

This is usually a sign that transformations are not being used properly.

If the model is still “Todo”, do not define a second schema just because one boundary stores `completed` as a bit.

Prefer deriving or transforming the representation instead.

Why duplication is bad:

- the same model is now maintained in multiple places
- fields drift over time
- boundary logic gets copied instead of centralized
- refactors become error-prone

Only duplicate schemas when there is a real semantic difference, for example:

- a creation payload really is a different model from a persisted entity
- a public API contract intentionally differs from an internal domain model
- a projection or partial view is intentionally a different type

If the difference is only encoding, use a transformation.

## Prefer `Class` Variants Over `Struct` Variants When Possible

When a schema represents a named domain model, reusable payload, or long-lived API shape, prefer `Schema.Class`, `Schema.TaggedClass`, or `Schema.TaggedErrorClass` over a bare `Schema.Struct`.

Prefer:

```ts
import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}
```

Over:

```ts
import { Schema } from "effect"

export const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String
})
```

Why `Class` variants are usually better:

- the schema has a stable, named identity
- reusable models are easier to recognize in code and traces
- constructors and validation are packaged together
- extension patterns are clearer
- named schemas read better in contracts and tooling output

Use `Struct` when:

- the shape is local and anonymous
- it is a small inline request or response shape
- introducing a class would add unnecessary ceremony
- the schema is primarily a one-off composition fragment

Good rule of thumb:

- reusable named model: `Class`
- reusable tagged union member: `TaggedClass`
- reusable error payload: `TaggedErrorClass`
- small inline object shape: `Struct`

## One Logical Model, Multiple Representations

The right Schema mindset is:

- one logical model
- multiple encoded forms when needed
- transformations connecting them

For example, a `Todo` may be:

- a boolean in memory
- a bit in SQL
- a string in some external API

That does not automatically mean you need three separate top-level schemas.

Prefer:

- one main schema for the logical model
- transformed field schemas or transformed object schemas for boundary-specific encoding
- derived request/result schemas when the shape is actually different

## Common Schema Building Blocks

Common primitives and collections used throughout the repo:

- `Schema.String`
- `Schema.Number`
- `Schema.Boolean`
- `Schema.BigInt`
- `Schema.Array(...)`
- `Schema.Record(key, value)`
- `Schema.Tuple([...])`
- `Schema.Struct({...})`
- `Schema.Union([...])`

Example:

```ts
const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean
})
```

## `Class`, `TaggedClass`, and `TaggedErrorClass`

### `Schema.Class`

Use for named reusable schema-backed models.

```ts
class Product extends Schema.Class<Product>("Product")({
  id: Schema.String,
  price: Schema.Number
}) {}
```

### Constructor Rule

When constructing schema classes, prefer `X.make(...)` over `new X(...)`.

Prefer:

```ts
const todo = Todo.make({
  id: 1,
  title: "write docs",
  completed: false
})
```

Over:

```ts
const todo = new Todo({
  id: 1,
  title: "write docs",
  completed: false
})
```

Why:

- it is the intended schema-class construction style
- it makes schema-backed construction explicit
- it keeps the codebase consistent
- it reads better across `Class`, `TaggedClass`, and `TaggedErrorClass`

Use this rule consistently for:

- `Schema.Class`
- `Schema.TaggedClass`
- `Schema.TaggedErrorClass`

### `Schema.TaggedClass`

Use for members of tagged unions.

```ts
class Circle extends Schema.TaggedClass<Circle>()("Circle", {
  radius: Schema.Number
}) {}

class Rectangle extends Schema.TaggedClass<Rectangle>()("Rectangle", {
  width: Schema.Number,
  height: Schema.Number
}) {}
```

### `Schema.TaggedErrorClass`

Use for schema-backed typed errors.

```ts
class NotFound extends Schema.TaggedErrorClass<NotFound>()("NotFound", {
  id: Schema.String
}) {}
```

## Optional Fields

Be precise about optionality.

Important rule from the vendored docs:

- `Schema.optional(schema)` means `T | undefined`
- `Schema.optionalKey(schema)` means an exact optional property in a struct

Prefer `optionalKey` for object fields.

Prefer:

```ts
const Query = Schema.Struct({
  search: Schema.optionalKey(Schema.String)
})
```

Use `optional` when the value itself should be `A | undefined`, not just an omitted field.

## Unions

Use `Schema.Union([...])` for ordinary unions.

```ts
const Id = Schema.Union([
  Schema.String,
  Schema.Number
])
```

Prefer tagged unions for domain variants.

```ts
class Created extends Schema.TaggedClass<Created>()("Created", {
  id: Schema.String
}) {}

class Deleted extends Schema.TaggedClass<Deleted>()("Deleted", {
  id: Schema.String
}) {}

const TodoEvent = Schema.Union([Created, Deleted])
```

Why:

- decoding and branching are clearer
- `_tag`-based matching aligns with Effect code style

## Recursive Schemas

Use `Schema.suspend` for recursive schemas.

```ts
type Tree = {
  readonly name: string
  readonly children: ReadonlyArray<Tree>
}

const Tree: Schema.Schema<Tree> = Schema.Struct({
  name: Schema.String,
  children: Schema.Array(Schema.suspend((): Schema.Schema<Tree> => Tree))
})
```

Use it whenever a schema refers to itself, directly or indirectly.

Without `suspend`, recursive definitions will not work correctly.

## Transformations

Transformations are one of the most important Schema features.

Use them when decoded and encoded shapes differ.

This is the main tool that avoids needless schema duplication.

If your instinct is “I need another schema because this boundary encodes the same value differently”, stop and first ask whether this should be one schema with a transformation instead.

### `Schema.decodeTo`

Use `decodeTo` when you want one schema to decode into another schema's type.

```ts
const TrimmedString = Schema.String.pipe(
  Schema.decodeTo(Schema.String, {
    decode: (value) => value.trim(),
    encode: (value) => value
  })
)
```

The vendored docs explicitly note that `decodeTo` is curried and should be used with `pipe`.

### `Schema.encodeTo`

Use `encodeTo` when the reverse direction reads more clearly.

### `SchemaTransformation.transformOrFail`

Use `transformOrFail` when the transformation itself is effectful or may fail.

```ts
import * as Effect from "effect/Effect"
import * as SchemaTransformation from "effect/SchemaTransformation"

const VerifiedString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformOrFail({
      decode: (value) => Effect.succeed(value.trim()),
      encode: (value) => Effect.succeed(value)
    })
  )
)
```

Use this when:

- validation depends on services or effects
- decoding can fail with structured issues
- encoding also needs logic beyond identity

## Field-Level Transformations

Very often, the right answer is not a second object schema but a transformed field schema.

Example shape:

```ts
const Completed = Schema.BooleanFromBit

const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Completed
})
```

In this pattern:

- the logical model still has `completed: boolean`
- the encoded SQL-facing representation can still be a bit
- the transformation lives at the field where it belongs

This is usually better than defining `Todo` and `TodoSql` as separate object schemas.

## Object-Level Transformations

Use object-level transformations when the whole object encoding differs, not just one field.

Good use cases:

- external keys differ from internal keys
- several fields need coordinated transformation
- the encoded shape is a structurally different representation of the same model

Still prefer a single logical schema plus a transformation pipeline over maintaining multiple duplicated top-level schemas.

## Rename Keys

Schema supports key renaming through struct transformations.

The vendored `Schema.ts` implements key renaming by mapping fields and using decode/encode transformations with renamed key maps.

Use key renaming when:

- external payload keys differ from internal keys
- you want stable internal names while honoring external contract names

Preferred pattern:

- keep the internal decoded shape idiomatic
- use schema-level transformation or field-mapping to adapt external keys

This is another example of avoiding duplication. If the only difference is key naming, do not define a second schema just to rename fields manually later.

In practice, use struct field mapping helpers and transformation composition rather than manual post-parse object rewriting.

## Opaque And Branded Types

Use opaque or branded schemas when a value should stay distinct from its structural base type.

### `Schema.brand`

Use `brand` for refined nominal distinctions.

```ts
const UserId = Schema.String.pipe(
  Schema.brand("UserId")
)
```

This is useful for:

- IDs
- validated domain scalars
- preventing accidental interchange of same-shaped values

### `Schema.Opaque`

Use `Opaque` when you want an opaque schema-backed type with the same structure as its underlying schema.

This is especially useful when the type should remain distinct at the type level without changing its runtime shape.

## Picking, Omitting, Partial Shapes, And Mutability

Common struct operations include:

- `pick`
- `omit`
- `partial`
- `mutable`

Use them to derive variations instead of redefining near-identical schemas manually.

Good examples:

- request subset from a domain model
- patch/update payloads
- mutable representations for specific adapters

Prefer deriving from one source schema rather than maintaining parallel copies.

This is the second major tool for avoiding duplication:

- use transformations when encoded and decoded representations differ
- use derivation when one schema is a subset, superset, or variation of another

## Constraints And Validation

Use schema checks and filters for validation.

Examples from the module docs include:

- `isMinLength`
- `isGreaterThan`
- `isPattern`
- `isUUID`

Attach them with `.check(...)`.

Use this when:

- the validation is intrinsic to the schema
- the rule belongs to the data contract

For business-rule validation that depends on services or current state, prefer effectful logic outside the schema or use effectful transformations.

## Decoding And Encoding

Common operations:

- `Schema.decodeUnknownSync`
- `Schema.decodeUnknownEffect`
- `Schema.decodeUnknownExit`
- `Schema.encodeUnknownSync`
- `Schema.encodeUnknownEffect`

Preferred rule:

- use `decodeUnknownEffect` and `encodeUnknownEffect` in Effect code
- avoid throwing sync decode APIs in application flows unless you are intentionally at a sync boundary

Good pattern:

```ts
const decodeUser = Schema.decodeUnknownEffect(User)
```

## Schema Metadata And Derived Tooling

Schema is also used for:

- annotations and documentation metadata
- JSON Schema generation
- arbitrary generation for tests
- derived equivalence

Useful operations from the module docs:

- `.annotate(...)`
- `Schema.toJsonSchemaDocument(...)`
- `Schema.toArbitrary(...)`
- `Schema.toEquivalence(...)`

Use annotations when the schema participates in:

- API docs
- codegen
- contract generation

## Common Repo Patterns

Patterns visible in the vendored repo:

- `Schema.Class` for named reusable contract types
- `Schema.Struct` for inline shapes and anonymous fragments
- `Schema.Union` for alternative payloads
- `Schema.optionalKey` for request/query/body optional fields
- `Schema.suspend` for recursive generated schemas
- `Schema.decodeTo` and `transformOrFail` for non-trivial decode/encode logic
- `Schema.TaggedErrorClass` for typed error payloads

## Best Practices

1. Prefer `Class` variants over plain `Struct` for named reusable schemas.
2. Prefer tagged variants for unions and errors.
3. Prefer `optionalKey` for optional object properties.
4. Do not duplicate schemas unless there is a real semantic difference.
5. Prefer schema-level transformations over ad hoc post-parse object rewriting.
6. Prefer deriving schema variants with `pick`, `omit`, `partial`, and `mutable` instead of duplicating definitions.
7. Prefer field-level transformations when only a field encoding differs.
8. Prefer branded or opaque types for important domain identifiers.
9. Prefer `decodeUnknownEffect` in application code.
10. Keep internal decoded shapes idiomatic and use schema transforms for external representation differences.

## Anti-Patterns

- using plain `Struct` for every reusable domain model even when `Class` would give a clearer named type
- duplicating whole schemas when only one field encoding differs
- creating `Foo` and `FooSql` schemas for the same logical model when a transformation would do
- using `optional` when you actually want an optional key
- duplicating near-identical schemas instead of deriving variants
- rewriting keys manually after decode instead of using schema transformations
- hand-validating external data after decode when the constraint belongs in the schema
- exposing unvalidated external payloads deep into business logic

## Good Repo Examples To Study

- `./.repos/effect/packages/tools/ai-codegen/src/Config.ts`
- `./.repos/effect/packages/platform-node/test/fixtures/rpc-schemas.ts`
- `./.repos/effect/packages/platform-browser/test/IndexedDbQueryBuilder.test.ts`
- `./.repos/effect/packages/tools/openapi-generator/src/JsonSchemaGenerator.ts`
- `./.repos/effect/packages/effect/src/Schema.ts`
