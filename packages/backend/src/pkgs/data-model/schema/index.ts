/**
 * Schema Module
 *
 * This module provides schema definition utilities for the data model system.
 */

// Export core types
export type {
	SchemaDefinition,
	TableDefinition,
	EntityTypeMap,
	EntityField,
	EntityInput,
	EntityName,
	PluginSchema,
	EntityOutput,
} from './types';

// Re-export all the table definitions
export * from './schemas';
