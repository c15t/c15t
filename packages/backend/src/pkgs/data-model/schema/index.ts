/**
 * Schema Module
 *
 * This module provides schema definition utilities for the data model system.
 */

// Export core types
export type {
	SchemaDefinition,
	TableDefinition,
	SchemaMap,
	EntitySchemaConfig,
	EntityField,
} from './types';

export {
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './parser';

// Export get-schema utilities
export {
	getSchema,
	getSchemaForTable,
	getSchemaForEntity,
} from './get-schema';

// Re-export all the table definitions
export * from './schemas';
