import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RelationshipConfig } from '../entity/relationship.types';
import type { DatabaseHints } from './fields/field-hints';

/**
 * Base type for all supported field value types
 */
export type FieldValueType =
	| string
	| number
	| boolean
	| Date
	| object
	| null
	| undefined;

/**
 * Represents a field in an entity schema
 * @template TFieldType The type of field (string, number, etc.)
 * @template TValueType The JavaScript type that this field represents
 * @template TValidatorType The validator type
 */
export interface SchemaField<
	TFieldType extends string = string,
	TValueType = FieldValueType,
	TValidatorType extends StandardSchemaV1<
		unknown,
		TValueType
	> = StandardSchemaV1<unknown, TValueType>,
> {
	type: TFieldType;
	required?: boolean;
	defaultValue?: TValueType | (() => TValueType);
	/**
	 * Relationship to another entity's field
	 * For type-safety, use the withRelationships builder pattern instead of setting this directly
	 */
	relationship?: {
		entity: string;
		field: string;
		relationship?: RelationshipConfig;
	};
	// Standard Schema validation
	validator?: TValidatorType;
	// Transform functions for input/output
	transform?: {
		input?: (value: FieldValueType) => TValueType;
		output?: <T extends TValueType>(value: T) => FieldValueType;
	};
	// Whether this field is the primary key (or part of a composite primary key)
	primaryKey?: boolean;
	// Database-specific hints for adapters
	databaseHints?: DatabaseHints;
	// Field description
	description?: string;
}

/**
 * Entity schema definition
 */
export interface EntitySchemaDefinition {
	name: string;
	prefix?: string;
	fields: Record<string, SchemaField<string>>;
	config?: Record<string, FieldValueType>;
	order?: number;
	// Add Standard Schema for the entire entity
	validator?: StandardSchemaV1<unknown, Record<string, FieldValueType>>;
	// Entity description
	description?: string | undefined;
}

/**
 * A field with resolved configuration
 */
export type ResolvedField = SchemaField<string> & {
	fieldName: string;
};
