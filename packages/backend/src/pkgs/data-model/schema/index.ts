/**
 * Schema Module
 *
 * This module provides schema definition utilities for the data model system.
 */

// Re-export all the table definitions
export * from './schemas';
// Export core types
export type {
	EntityField,
	EntityInput,
	EntityName,
	EntityOutput,
	EntityTypeMap,
	PluginSchema,
	SchemaDefinition,
	TableDefinition,
} from './types';
