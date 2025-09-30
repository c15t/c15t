/**
 * Migration Package
 *
 * This package provides a complete system for generating and executing database migrations
 * based on schema definitions. It handles schema comparison, migration planning, and execution
 * for different database adapters.
 *
 * The migration system automatically detects changes between the desired schema (from your
 * code) and the actual database schema, then generates the necessary migration operations.
 */

// Core migration functionality
export { getMigrations } from './get-migration';
// Schema generation utilities
export { getSchema } from './get-schema';
export {
	buildColumnAddMigrations,
	buildTableCreateMigrations,
} from './migration-builders';
export { createMigrationExecutors } from './migration-execution';
export { analyzeSchemaChanges } from './schema-comparison';
export { getType, matchType } from './type-mapping';

// Types
export type {
	ColumnsToAdd,
	MigrationOperation,
	MigrationResult,
	TableToCreate,
} from './types';
