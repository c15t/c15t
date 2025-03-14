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

// Export schema utilities
export {
	getConsentTables,
	parseInputData,
	parseEntityOutputData,
	getAllFields,
} from './schemas';

// Re-export the C15TDBSchema type directly
export type { C15TDBSchema } from '~/db/schema/definition';

// Export get-schema utilities
export {
	getSchemaForTable,
	getSchemaForEntity,
} from './get-schema';
