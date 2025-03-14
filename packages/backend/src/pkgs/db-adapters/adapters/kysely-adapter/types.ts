import type { Database as SQLiteDatabase } from 'better-sqlite3';
import type { Dialect, Kysely, MysqlPool, PostgresPool } from 'kysely';
import type { EntityTypeMap } from '~/db/core/types';
import type { Database as KyselyDatabase } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';
import { AdapterInstance } from '~/pkgs/db-adapters/types';

/**
 * Database interface for Kysely that uses the EntityTypeMap
 * to ensure all table names and record types are properly typed.
 *
 * This allows Kysely operations to be type-safe throughout the adapter.
 *
 * @remarks
 * The Database interface is extended from EntityTypeMap, which contains
 * all the entity types defined in your c15t configuration. This provides
 * strong typing for database operations across the entire adapter.
 *
 * @example
 * ```typescript
 * // The interface is used internally by the adapter to provide
 * // type safety for database operations
 * const query = db
 *   .selectFrom('consent')  // Type-safe table name
 *   .select(['id', 'subjectId', 'purposeId']) // Type-safe column names
 *   .where('subjectId', '=', subjectId)
 *   .executeTakeFirst();
 * ```
 */
export interface Database extends EntityTypeMap {
	// Add any adapter-specific table types here if needed
	// These are tables that are created and managed by the adapter itself
	// rather than being part of the core schema

	/**
	 * Migration history table used by the adapter to track schema changes
	 */
	migrations: {
		id: string;
		name: string;
		applied_at: Date;
		batch: number;
	};

	/**
	 * Temporary tables used during migrations
	 * These are created and dropped during the migration process
	 */
	_migration_temp: {
		id: string;
		table_name: string;
		created_at: Date;
	};
}

/**
 * Database types supported by the Kysely adapter
 *
 * These represent the major SQL database engines that can be used with the adapter.
 *
 * @example
 * ```typescript
 * // Explicitly specify the database type when creating an adapter
 * const adapter = kyselyAdapter(db, { type: 'postgres' });
 * ```
 */
export type KyselyDatabaseType = 'postgres' | 'mysql' | 'sqlite' | 'mssql';

/**
 * Type alias for PostgreSQL connection pool configuration
 *
 * Used when configuring a PostgreSQL database connection.
 *
 * @see {@link https://node-postgres.com/apis/pool | PostgreSQL Pool documentation}
 *
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 *
 * // Create a PostgreSQL connection pool
 * const pool: PostgresPoolConfig = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db',
 *   user: 'postgres',
 *   password: 'password'
 * });
 * ```
 */
export type PostgresPoolConfig = PostgresPool;

/**
 * Type alias for MySQL connection pool configuration
 *
 * Used when configuring a MySQL database connection.
 *
 * @see {@link https://github.com/sidorares/node-mysql2#using-connection-pools | MySQL Pool documentation}
 *
 * @example
 * ```typescript
 * import mysql from 'mysql2';
 *
 * // Create a MySQL connection pool
 * const pool: MysqlPoolConfig = mysql.createPool({
 *   host: 'localhost',
 *   user: 'user',
 *   database: 'consent_db',
 *   password: 'password',
 *   waitForConnections: true,
 *   connectionLimit: 10,
 *   queueLimit: 0
 * });
 * ```
 */
export type MysqlPoolConfig = MysqlPool;

/**
 * Type alias for SQLite database configuration
 *
 * Used when configuring a SQLite database connection.
 *
 * @see {@link https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md | Better-SQLite3 documentation}
 *
 * @example
 * ```typescript
 * import Database from 'better-sqlite3';
 *
 * // Create a SQLite database connection
 * const db: SQLiteDatabaseConfig = new Database('consent.db', {
 *   readonly: false,
 *   fileMustExist: false
 * });
 * ```
 */
export type SQLiteDatabaseConfig = SQLiteDatabase;

/**
 * Configuration for a Kysely dialect
 *
 * This interface allows direct configuration of a Kysely dialect
 * with explicit type information.
 *
 * @example
 * ```typescript
 * import { PostgresDialect } from 'kysely';
 * import { Pool } from 'pg';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create a PostgreSQL connection pool
 * const pool = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db'
 * });
 *
 * // Create a dialect config
 * const dialectConfig: DialectConfig = {
 *   dialect: new PostgresDialect({ pool }),
 *   type: 'postgres',
 *   casing: 'camel'
 * };
 *
 * // Use in c15t configuration
 * const c15t = c15tInstance({
 *   storage: kyselyAdapter(dialectConfig),
 *   secret: process.env.SECRET_KEY
 * });
 * ```
 */
export interface DialectConfig {
	/**
	 * The Kysely dialect instance to use for database operations
	 *
	 * @see {@link https://kysely.dev/docs/dialects | Kysely dialects documentation}
	 */
	dialect: Dialect;

	/**
	 * The type of database being connected to
	 *
	 * This is used by the adapter to adjust query behavior for different database engines.
	 */
	type: KyselyDatabaseType;

	/**
	 * Casing style for table names in the database
	 *
	 * This affects how table names are transformed when interacting with the database.
	 * For example, with 'camel' casing, 'subjectProfile' becomes 'subject_profile' in the database.
	 * With 'snake' casing, it remains as 'subject_profile'.
	 *
	 * @default "camel"
	 */
	casing?: 'snake' | 'camel';

	/**
	 * Whether to apply the casing transformation to column names as well
	 *
	 * When true, column names will be transformed according to the casing setting.
	 * When false, column names will remain in their original case.
	 *
	 * @default true
	 */
	applyCasingToColumns?: boolean;
}

/**
 * Configuration for an existing Kysely instance
 *
 * This allows using a pre-configured Kysely instance with the adapter.
 *
 * @example
 * ```typescript
 * import { Kysely, PostgresDialect } from 'kysely';
 * import { Pool } from 'pg';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create a Postgres connection pool
 * const pool = new Pool({
 *   host: 'localhost',
 *   database: 'consent_db'
 * });
 *
 * // Create a Kysely instance
 * const db = new Kysely<Database>({
 *   dialect: new PostgresDialect({ pool })
 * });
 *
 * // Use the pre-configured instance
 * const config: KyselyInstanceConfig = {
 *   db,
 *   type: 'postgres',
 *   casing: 'camel'
 * };
 *
 * // Pass to c15t configuration
 * const c15t = c15tInstance({
 *   storage: kyselyAdapter(config),
 *   secret: process.env.SECRET_KEY
 * });
 * ```
 */
export interface KyselyInstanceConfig {
	/**
	 * Pre-configured Kysely instance to use for database operations
	 *
	 * This should be a fully initialized Kysely instance with the correct
	 * dialect and configuration for your database.
	 */
	db: Kysely<KyselyDatabase>;

	/**
	 * The type of database the Kysely instance is connected to
	 *
	 * This is used to adjust query behavior for different database engines.
	 */
	type: KyselyDatabaseType;

	/**
	 * Casing style for table names in the database
	 *
	 * This affects how table names are transformed when interacting with the database.
	 * For example, with 'camel' casing, 'subjectProfile' becomes 'subject_profile' in the database.
	 * With 'snake' casing, it remains as 'subject_profile'.
	 *
	 * @default "camel"
	 */
	casing?: 'snake' | 'camel';

	/**
	 * Whether to apply the casing transformation to column names as well
	 *
	 * When true, column names will be transformed according to the casing setting.
	 * When false, column names will remain in their original case.
	 *
	 * @default true
	 */
	applyCasingToColumns?: boolean;
}

/**
 * Union type representing all possible database configurations
 *
 * This comprehensive type allows various ways to configure the database:
 * - Direct connection pools (PostgreSQL, MySQL)
 * - SQLite database instance
 * - Kysely dialect
 * - Custom adapter instance
 * - Dialect configuration
 * - Kysely instance configuration
 *
 * @remarks
 * This flexible approach allows you to use the configuration pattern that
 * works best for your application. You can pass direct database connections,
 * pre-configured Kysely instances, or dialect configurations.
 *
 * @see {@link kyselyAdapter} The function that consumes this configuration
 */
export type DatabaseConfiguration =
	| PostgresPoolConfig
	| MysqlPoolConfig
	| SQLiteDatabaseConfig
	| Dialect
	| AdapterInstance
	| DialectConfig
	| KyselyInstanceConfig
	| {
			provider: string;
			options: DatabaseConfiguration;
	  };
