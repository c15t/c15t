import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { DatabaseConfig } from '../config/config.types';
import type { TableDefinition, TableOptions } from '../db/table';
import type {
	EntitySchemaDefinition,
	FieldValueType,
	SchemaField,
} from '../schema/schema.types';
import type { EntityInput } from '../utils/type-infer';
import type {
	EntityFieldReference,
	RelationshipHelpers,
} from './relationship.types';

/**
 * Extract all field names from an entity with their types
 * @template TEntity The entity type to extract fields from
 * @template TFieldType Optional field type filter
 */
export type EntityFields<
	TEntity extends EntityStructure,
	TFieldType extends string = string,
> = keyof {
	[K in keyof TEntity['fields'] as TEntity['fields'][K]['type'] extends TFieldType
		? K
		: never]: any;
};

/**
 * Extract the value type for a given field
 * @template TEntity The entity containing fields
 * @template TFieldName The name of the field to get the type for
 */
export type EntityFieldValue<
	TEntity extends { fields: Record<string, SchemaField<any>> },
	TFieldName extends keyof TEntity['fields'] & string,
> = TEntity['fields'][TFieldName] extends SchemaField<infer TType, infer TValue>
	? TValue
	: unknown;

/**
 * Type to represent the structure of an entity
 * @template TName The entity name type
 * @template TFields The entity fields record type
 */
export interface EntityStructure<
	TName extends string = string,
	TFields extends Record<string, SchemaField<any>> = Record<
		string,
		SchemaField<any>
	>,
> {
	name: TName;
	fields: TFields;
	description?: string;
}

/**
 * Type-safe relationship reference - alias for EntityFieldReference for backward compatibility
 * @template TEntity Target entity type
 * @template TFieldName Field name in target entity
 */
export type TypedRelationshipReference<
	TEntity extends EntityStructure,
	TFieldName extends keyof TEntity['fields'] &
		string = keyof TEntity['fields'] & string,
> = EntityFieldReference<EntityStructure, TEntity, TFieldName>;

/**
 * Entity result type after applying relationships
 * @template TEntity The base entity type
 * @template TRelationships Record of relationship references
 */
export type EntityWithRelationships<
	TEntity extends EntityStructure,
	TRelationships extends Record<string, TypedRelationshipReference<any>>,
> = TEntity & {
	relationships: TRelationships;
};

/**
 * Extracts the name type from a schema definition
 */
export type SchemaName<TSchema extends EntitySchemaDefinition> =
	TSchema['name'] extends string ? TSchema['name'] : string;

/**
 * Extracts the fields type from a schema definition
 */
export type SchemaFields<TSchema extends EntitySchemaDefinition> =
	TSchema['fields'] extends Record<string, SchemaField<any>>
		? TSchema['fields']
		: Record<string, SchemaField<any>>;

/**
 * Map of entity fields with proper typing
 */
export type EntityFieldsMap<T extends Record<string, SchemaField>> = {
	[K in keyof T]: T[K] extends SchemaField<any, infer TValue>
		? TValue
		: FieldValueType;
};

/**
 * Base entity with validation and relationship methods
 */
export interface EntityFromDefinition<
	TSchema extends EntitySchemaDefinition = EntitySchemaDefinition,
	TValidator extends StandardSchemaV1<
		unknown,
		Record<string, FieldValueType>
	> = StandardSchemaV1<unknown, Record<string, FieldValueType>>,
> extends EntityStructure<TSchema['name'], TSchema['fields']> {
	// Inherited from EntityStructure
	validator?: TValidator;
	description?: TSchema['description'];
	config: Record<string, FieldValueType>;
	prefix: string;
	order: number;

	// Type references for better developer experience
	type: EntityInput<EntityFromDefinition<TSchema, TValidator>>;
	outputType: EntityFieldsMap<SchemaFields<TSchema>>;

	// Data validation
	validate<TInput extends StandardSchemaV1.InferInput<TValidator>>(
		data: TInput
	): Promise<EntityFieldsMap<SchemaFields<TSchema>>>;

	// Table definition
	getTable: GetTableMethod<TSchema>;

	// Configure relationships
	withRelationships<
		TRel extends Record<string, TypedRelationshipReference<EntityStructure>>,
	>(
		relationshipFn: (
			helpers: RelationshipHelpers<EntityFromDefinition<TSchema, TValidator>>
		) => TRel
	): EntityWithRelationships<EntityFromDefinition<TSchema, TValidator>, TRel>;
}

/**
 * Helper type to infer an entity's relationship capabilities
 * @template TEntity The base entity type
 */
export type WithRelationships<TEntity extends EntityStructure> = TEntity & {
	withRelationships: <
		TRel extends Record<string, TypedRelationshipReference<EntityStructure>>,
	>(
		relationshipFn: (
			helpers: RelationshipHelpers<TEntity | EntityStructure>
		) => TRel
	) => EntityWithRelationships<TEntity, TRel>;
};

/**
 * Get required fields from an entity
 * @template TEntity The entity to extract required fields from
 */
export type EntityRequiredFields<TEntity extends EntityStructure> = keyof {
	[K in keyof TEntity['fields'] as TEntity['fields'][K]['required'] extends true
		? K
		: never]: any;
};

/**
 * Create a type-safe input object for an entity
 * @template TEntity The entity to create input type for
 */
export type TypedEntityInput<TEntity extends EntityStructure> = {
	[K in EntityRequiredFields<TEntity>]: EntityFieldValue<TEntity, K>;
} & {
	[K in Exclude<
		keyof TEntity['fields'] & string,
		EntityRequiredFields<TEntity>
	>]?: EntityFieldValue<TEntity, K>;
};

/**
 * Method to generate a table definition for the entity
 */
export type GetTableMethod<TSchema extends EntitySchemaDefinition> = <
	TOptions extends TableOptions = TableOptions,
>(
	config?: DatabaseConfig
) => TableDefinition<TOptions>;
