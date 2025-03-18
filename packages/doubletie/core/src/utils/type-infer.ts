/**
 * Type inference utility for doubletie core
 *
 * This file contains utility types that help with type inference.
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
	EntityFromDefinition,
	EntityStructure,
	EntityWithRelationships,
} from '../entity/entity.types';
import type { EntityFieldReference } from '../entity/relationship.types';
import type { FieldValueType, SchemaField } from '../schema/schema.types';
import type {
	FieldType,
	FieldTypeToValueType,
} from '../validation/type-conversion';

/**
 * Infer the entity type from a relationship reference
 */
export type InferEntityFromReference<T extends EntityFieldReference> =
	T extends EntityFieldReference<infer S, infer E, infer F> ? E : never;

/**
 * Infer the field type from a relationship reference
 */
export type InferFieldFromReference<T extends EntityFieldReference> =
	T extends EntityFieldReference<infer S, infer E, infer F> ? F : never;

/**
 * Infer the source entity type from a relationship reference
 */
export type InferSourceFromReference<T extends EntityFieldReference> =
	T extends EntityFieldReference<infer S, infer E, infer F> ? S : never;

/**
 * Infer the value type from a schema field
 */
export type InferValueFromField<F extends SchemaField> = F extends SchemaField<
	infer T,
	infer V
>
	? V extends FieldValueType
		? FieldTypeToValueType<T & FieldType>
		: V
	: never;

/**
 * Extract all field values from an entity as a record type
 */
export type EntityRecord<T extends EntityStructure> = {
	[K in keyof T['fields']]: InferValueFromField<T['fields'][K]>;
};

/**
 * Extract relationships from an entity with relationships
 */
export type EntityRelationships<
	T extends EntityWithRelationships<
		EntityStructure,
		Record<string, EntityFieldReference>
	>,
> = T extends EntityWithRelationships<EntityStructure, infer R>
	? R
	: Record<string, never>;

/**
 * Get the input type for an entity (for validation)
 */
export type EntityInput<T extends EntityFromDefinition> =
	T extends EntityFromDefinition<infer S, infer V>
		? V extends StandardSchemaV1
			? StandardSchemaV1.InferInput<V>
			: EntityRecord<T>
		: Record<string, FieldValueType>;

/**
 * Extract a type from a relationship field
 */
export type RelatedEntityType<
	TEntity extends EntityWithRelationships<
		EntityStructure,
		Record<string, EntityFieldReference>
	>,
	TFieldName extends keyof EntityRelationships<TEntity>,
> = InferEntityFromReference<EntityRelationships<TEntity>[TFieldName & string]>;

/**
 * Check if a type is an array type
 */
export type IsArray<T> = T extends Array<unknown> ? true : false;

/**
 * Create a deep partial type that makes all properties optional recursively
 */
export type DeepPartial<T> = T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

/**
 * Create a type with non-nullable fields
 */
export type NonNullableFields<T> = {
	[P in keyof T]: NonNullable<T[P]>;
};

/**
 * Makes properties in T with types that match K non-nullable
 */
export type RequireFields<T, K extends keyof T> = T & {
	[P in K]-?: NonNullable<T[P]>;
};

/**
 * Extract the type of properties with a specific field type
 */
export type FieldsByType<
	T extends EntityStructure,
	TFieldType extends FieldType,
> = {
	[K in keyof T['fields']]: T['fields'][K] extends SchemaField<
		TFieldType,
		infer V
	>
		? InferValueFromField<T['fields'][K]>
		: never;
};

/**
 * Creates a record type with all required fields from an entity
 */
export type RequiredEntityRecord<T extends EntityStructure> = {
	[K in keyof T['fields'] as T['fields'][K]['required'] extends true
		? K
		: never]-?: InferValueFromField<T['fields'][K]>;
} & {
	[K in keyof T['fields'] as T['fields'][K]['required'] extends true
		? never
		: K]?: InferValueFromField<T['fields'][K]>;
};
