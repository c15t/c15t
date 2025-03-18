/**
 * Type inference utilities for kysley-orm
 * These help with inferring types from user-provided models and database schemas
 *
 * @module type-inference
 */
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Helper type to infer the database schema from a model registry
 *
 * @typeParam TRegistry - The model registry type
 * @returns A mapped type representing the database schema
 */
export type InferDatabaseSchema<TRegistry> = {
	[TTableName in keyof TRegistry]: TRegistry[TTableName] extends {
		schema: infer TSchema;
	}
		? TSchema extends { fields: infer TFields }
			? TFields
			: never
		: never;
};

/**
 * Helper type to extract a model type from a registry
 *
 * @typeParam TRegistry - The model registry type
 * @typeParam TTableName - The name of the table in the registry
 * @returns The model type for the specified table
 */
export type ExtractModelType<
	TRegistry,
	TTableName extends keyof TRegistry,
> = TRegistry[TTableName] extends { schema: { fields: infer TFields } }
	? TFields
	: never;

/**
 * Helper type for model insert operations
 * Uses Kysely's Insertable type to derive an insert type for a model
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - The name of the table in the database
 */
export type ModelInsertType<
	TDatabase,
	TTableName extends keyof TDatabase & string,
> = Insertable<TDatabase[TTableName]>;

/**
 * Helper type for model update operations
 * Uses Kysely's Updateable type to derive an update type for a model
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - The name of the table in the database
 */
export type ModelUpdateType<
	TDatabase,
	TTableName extends keyof TDatabase & string,
> = Updateable<TDatabase[TTableName]>;

/**
 * Helper type for model select operations
 * Uses Kysely's Selectable type to derive a select type for a model
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - The name of the table in the database
 */
export type ModelSelectType<
	TDatabase,
	TTableName extends keyof TDatabase & string,
> = Selectable<TDatabase[TTableName]>;

/**
 * Extract keys of a type that match a specific type condition
 *
 * @typeParam TSource - The source type
 * @typeParam TMatch - The type condition to match
 * @returns Union of keys in TSource whose values extend TMatch
 *
 * @example
 * ```typescript
 * // Extract string keys from an object type
 * type User = { id: number; name: string; email: string };
 * type StringKeys = ExtractKeysOfType<User, string>; // 'name' | 'email'
 * ```
 */
export type ExtractKeysOfType<TSource, TMatch> = {
	[TKey in keyof TSource]: TSource[TKey] extends TMatch ? TKey : never;
}[keyof TSource];

/**
 * Make specific properties of a type required
 *
 * @typeParam TSource - The source type
 * @typeParam TKeys - Keys to make required
 * @returns Type with specified keys required
 *
 * @example
 * ```typescript
 * type User = { id?: number; name?: string };
 * type UserWithRequiredId = RequireKeys<User, 'id'>; // { id: number; name?: string }
 * ```
 */
export type RequireKeys<TSource, TKeys extends keyof TSource> = TSource & {
	[TProp in TKeys]-?: TSource[TProp];
};

/**
 * Extract all fields of a model type that are not nullable or undefined
 *
 * @typeParam TEntity - The model type
 * @returns Union of keys that have non-nullable, non-undefined values
 */
export type NonNullableFields<TEntity> = {
	[TKey in keyof TEntity]: null extends TEntity[TKey]
		? never
		: undefined extends TEntity[TKey]
			? never
			: TKey;
}[keyof TEntity];

/**
 * Create a type with only the required fields of a model
 *
 * @typeParam TEntity - The model type
 * @returns Type containing only the required fields
 */
export type RequiredFields<TEntity> = {
	[TKey in NonNullableFields<TEntity>]: TEntity[TKey];
};

/**
 * Create a type with specific fields made optional
 *
 * @typeParam TSource - The source type
 * @typeParam TKeys - Keys to make optional
 * @returns Type with specified keys optional
 */
export type WithOptional<TSource, TKeys extends keyof TSource> = Omit<
	TSource,
	TKeys
> &
	Partial<Pick<TSource, TKeys>>;

/**
 * Create a type with specific fields made required
 *
 * @typeParam TSource - The source type
 * @typeParam TKeys - Keys to make required
 * @returns Type with specified keys required
 */
export type WithRequired<TSource, TKeys extends keyof TSource> = Omit<
	TSource,
	TKeys
> &
	Required<Pick<TSource, TKeys>>;

/**
 * Helper for defining validation errors for specific fields
 *
 * @typeParam TEntity - The model type
 * @returns Type mapping field names to array of error messages
 */
export type ValidationErrors<TEntity> = Partial<
	Record<keyof TEntity, string[]>
>;

/**
 * Helper to create a mapping between original DB field names and camelCase names
 *
 * @typeParam TEntity - The model type
 * @returns Type mapping field names to their database column names
 */
export type FieldMapping<TEntity> = {
	[TKey in keyof TEntity]: string;
};

/**
 * Helper type for handling fields with auto-generated values
 *
 * @typeParam TValue - The value type
 * @returns Type representing a field that may be automatically generated
 */
export type GeneratedField<TValue> = Generated<TValue>;
