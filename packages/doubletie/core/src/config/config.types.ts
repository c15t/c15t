import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FieldValueType, SchemaField } from '../schema/schema.types';

/**
 * Field override configuration options
 */
export interface FieldOverrideConfig {
	fieldName?: string; // Override the field name in the database
	required?: boolean; // Override whether the field is required
	defaultValue?: FieldValueType; // Override the default value
	relationship?: {
		model?: string; // Override the referenced model name
		field?: string; // Override the referenced field
	};
	// Validator override
	validator?: StandardSchemaV1<unknown, FieldValueType>;
}

/**
 * Entity override configuration options
 */
export interface EntityOverrideConfig {
	entityName?: string; // Override the entity name
	entityPrefix?: string; // Override the entity prefix
	fieldAliases?: Record<string, string>; // Simple field name overrides
	fieldOverrides?: Record<string, FieldOverrideConfig>; // Full field configurations
	additionalFields?: Record<string, SchemaField>; // Extra fields to add
	expiresIn?: number; // Time in milliseconds before entity records expire
	updateAge?: number; // Time in milliseconds to determine if a record needs updating
	// Entity validator override
	validator?: StandardSchemaV1<unknown, Record<string, FieldValueType>>;
}

/**
 * Database configuration options
 */
export interface DatabaseConfig {
	tables?: Record<string, EntityOverrideConfig>;
}
