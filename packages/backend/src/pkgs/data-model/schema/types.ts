import type { z } from 'zod';
import type { Field } from '~/pkgs/data-model';
import type { C15TDBSchema } from '~/schema/definition';

/**
 * Entity field configuration
 * Defines a field in the context of an entity schema
 */
export interface EntityField extends Field {
	/**
	 * Whether the field should be included in the schema
	 */
	include?: boolean;
}

/**
 * Entity schema configuration
 * Defines configuration for a database entity schema
 */
export interface EntitySchemaConfig {
	/**
	 * Fields to include in the schema
	 */
	fields: Record<string, EntityField>;
}

/**
 * Table definition for creating schema definitions
 */
export interface TableDefinition {
	/**
	 * Entity name for the table
	 */
	entityName: string;

	/**
	 * Entity prefix for ID generation
	 */
	entityPrefix: string;

	/**
	 * Zod schema for the table
	 */
	// biome-ignore lint/suspicious/noExplicitAny: we might not know the type
	schema: z.ZodType<any>;

	/**
	 * Field definitions for the table
	 */
	fields: Record<string, Field>;

	/**
	 * Execution order during migrations (lower numbers run first)
	 */
	order: number;
}

/**
 * Schema definition for a set of tables
 */
export interface SchemaDefinition {
	/**
	 * Map of table name to table definition
	 */
	[tableName: string]: TableDefinition;
}

/**
 * Map of schema name to schema definition
 */
export interface SchemaMap {
	/**
	 * Map of schema name to schema definition
	 */
	[schemaName: string]: SchemaDefinition;
}

/**
 * Plugin-provided schema type with proper typing.
 * Defines the structure of schemas that plugins can provide to extend the system.
 *
 * @template TEntityKey - The entity key in the schema
 */
export type PluginSchema = Record<
	string,
	{
		fields: Record<string, Field>;
		entityName?: string;
	}
>;

/**
 * Maps entity keys to their corresponding data structures.
 * Provides type access to all entities defined in the database schema.
 *
 * @template TKey - Entity key in the database schema
 */
export type EntityTypeMap = {
	[TKey in keyof C15TDBSchema]: C15TDBSchema[TKey];
};

/**
 * All valid entity names in the database schema.
 * This type represents the keys of all entities that can be used in queries.
 */
export type EntityName = keyof C15TDBSchema;

/**
 * Input type for entity operations, allowing partial fields and additional properties.
 * Used when creating or updating entity records.
 *
 * @template TEntity - The entity type being operated on
 */
export type EntityInput<TEntity extends EntityName> = Partial<
	EntityTypeMap[TEntity]
> &
	Record<string, unknown>;

/**
 * Output type for entity operations returned from the database.
 * Represents the full structure of an entity as returned from queries.
 *
 * @template TEntity - The entity type being returned
 */
export type EntityOutput<TEntity extends EntityName> = EntityTypeMap[TEntity] &
	Record<string, unknown>;
