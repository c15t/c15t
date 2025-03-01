import type { EntityTypeMap } from '~/db/core/types';

/**
 * Database interface for Kysely that uses the EntityTypeMap
 * to ensure all table names and record types are properly typed.
 *
 * This allows Kysely operations to be type-safe throughout the adapter.
 */
export interface Database extends EntityTypeMap {
	// Add any adapter-specific table types here if needed
}

/**
 * Database types supported by the Kysely adapter
 */
export type KyselyDatabaseType = 'postgres' | 'mysql' | 'sqlite' | 'mssql';
