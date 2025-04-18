import {
	type Dialect,
	Kysely,
	MssqlDialect,
	MysqlDialect,
	type MysqlPool,
	PostgresDialect,
	type PostgresPool,
	type SqliteDatabase,
	SqliteDialect,
} from 'kysely';
import type { C15TOptions } from '~/types';
import type {
	Database,
	DatabaseConfiguration,
	DialectConfig,
	KyselyDatabaseType,
	KyselyInstanceConfig,
} from './types';

/**
 * Determines the database type from a database configuration
 *
 * This function analyzes a database configuration object to determine
 * which type of database it represents (SQLite, MySQL, PostgreSQL, MSSQL).
 * It handles different configuration formats including direct dialect instances,
 * connection pools, and raw database connections.
 *
 * @internal This function is used internally by the createKyselyAdapter function
 * @param db - The database configuration to analyze
 * @returns The detected database type or null if unable to determine
 */
function getDatabaseType(
	db: DatabaseConfiguration | undefined
): KyselyDatabaseType | null {
	if (!db) {
		return null;
	}
	if ('dialect' in db) {
		return getDatabaseType(db.dialect as Dialect);
	}
	if (db && typeof db === 'object' && 'createDriver' in db) {
		if (db instanceof SqliteDialect) {
			return 'sqlite';
		}
		if (db instanceof MysqlDialect) {
			return 'mysql';
		}
		if (db instanceof PostgresDialect) {
			return 'postgres';
		}
		if (db instanceof MssqlDialect) {
			return 'mssql';
		}
	}
	if (db && typeof db === 'object' && 'aggregate' in db) {
		return 'sqlite';
	}

	if (db && typeof db === 'object' && 'getConnection' in db) {
		return 'mysql';
	}
	if (db && typeof db === 'object' && 'connect' in db) {
		return 'postgres';
	}

	return null;
}

/**
 * Creates a Kysely adapter from the provided configuration
 *
 * This function analyzes the database configuration in C15TOptions and creates
 * an appropriate Kysely instance with the correct dialect. It handles several
 * different configuration formats including:
 * - Direct Kysely instances
 * - Dialect configurations
 * - Raw database connections (SQLite, MySQL, PostgreSQL)
 * - Kysely dialect instances
 *
 * @param config - The C15T configuration options containing database settings
 * @returns An object containing the initialized Kysely instance and database type
 *
 * @example
 * ```typescript
 * // Using with a pre-configured Kysely instance
 * import { Kysely, PostgresDialect } from 'kysely';
 * import { Pool } from 'pg';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create a Postgres connection pool
 * const pool = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db',
 *   user: 'postgres',
 *   password: 'password'
 * });
 *
 * // Create Kysely instance
 * const db = new Kysely({
 *   dialect: new PostgresDialect({ pool })
 * });
 *
 * // Use in c15t configuration
 * const c15t = c15tInstance({
 *   database: { db, type: 'postgres' } // Pre-configured Kysely instance
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with a direct connection pool
 * import { Pool } from 'pg';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create a Postgres connection pool
 * const pool = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db',
 *   user: 'postgres',
 *   password: 'password'
 * });
 *
 * // Pass the pool directly to c15t
 * const c15t = c15tInstance({
 *   database: pool // The adapter will detect it's a Postgres pool
 * });
 * ```
 *
 * @throws {Error} Will throw an error if the database configuration is invalid or if a connection cannot be established
 */
export const createKyselyAdapter = async (
	config: C15TOptions
): Promise<{
	kysely: Kysely<Database> | null;
	databaseType: KyselyDatabaseType | null;
}> => {
	// Safe type assertion for the database
	const db = config.database as DatabaseConfiguration;

	if (!db) {
		return {
			kysely: null,
			databaseType: null,
		};
	}

	if (db && typeof db === 'object' && 'db' in db) {
		const kyselyConfig = db as KyselyInstanceConfig;
		return {
			kysely: kyselyConfig.db,
			databaseType: kyselyConfig.type,
		};
	}

	if (db && typeof db === 'object' && 'dialect' in db) {
		const dialectConfig = db as DialectConfig;
		return {
			kysely: new Kysely({ dialect: dialectConfig.dialect }),
			databaseType: dialectConfig.type,
		};
	}

	let dialect: Dialect | undefined;

	const databaseType = getDatabaseType(db);

	if (db && typeof db === 'object' && 'createDriver' in db) {
		// If it has createDriver, assume it's already a proper dialect
		dialect = db as unknown as Dialect;
	}

	if (db && typeof db === 'object' && 'aggregate' in db) {
		dialect = new SqliteDialect({
			database: db as unknown as SqliteDatabase,
		});
	}

	if (db && typeof db === 'object' && 'getConnection' in db) {
		dialect = new MysqlDialect({
			pool: db as unknown as MysqlPool,
		});
	}

	if (db && typeof db === 'object' && 'connect' in db) {
		dialect = new PostgresDialect({
			pool: db as unknown as PostgresPool,
		});
	}

	return {
		kysely: dialect ? new Kysely({ dialect }) : null,
		databaseType,
	};
};
