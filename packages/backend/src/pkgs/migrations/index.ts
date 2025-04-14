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
export { createMigrationExecutors } from './migration-execution';
export {
	buildTableCreateMigrations,
	buildColumnAddMigrations,
} from './migration-builders';
export { analyzeSchemaChanges } from './schema-comparison';
export { matchType, getType } from './type-mapping';

// Schema generation utilities
export { getSchema } from './get-schema';

// Types
export type {
	MigrationResult,
	MigrationOperation,
	ColumnsToAdd,
	TableToCreate,
} from './types';
