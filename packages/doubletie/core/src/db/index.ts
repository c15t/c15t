/**
 * Database module exports
 * @module db
 */

// Core DB utilities
export { mergeSchemaWithConfig } from './merge';
export { generateTable } from './table';

// Database adapter exports
export {
	type DatabaseAdapter,
	BaseAdapter,
	SQLiteAdapter,
	PostgresAdapter,
	MySQLAdapter,
	// Adapter registry methods
	getAdapter,
	registerAdapter,
	getAdapters,
} from './adapters';

// Utility functions for working with databases
export {
	generateTableDefinition,
	generateSQLForEntity,
	toDatabaseValue,
	fromDatabaseValue,
} from './utils';

// Column and table definition types
export type {
	ColumnDefinition,
	TableDefinition,
	IndexDefinition,
	ForeignKeyDefinition,
} from './adapters/adapter';

// Import EntityFieldsMap from entity.types
export type { EntityFieldsMap } from '../entity/entity.types';

// Schema merging types
export type { ResolvedEntitySchema } from './merge';

/**
 * Database adapter type for type-safe adapter selection
 */
export type AdapterType = 'sqlite' | 'postgres' | 'mysql';
