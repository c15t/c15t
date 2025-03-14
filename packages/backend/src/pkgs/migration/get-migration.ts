import type { C15TOptions } from '~/pkgs/types';
import { createLogger } from '~/utils/logger';

import { createKyselyAdapter } from '~/pkgs/db-adapters';
import {
	buildColumnAddMigrations,
	buildTableCreateMigrations,
} from './migration-builders';
import { createMigrationExecutors } from './migration-execution';
import { analyzeSchemaChanges } from './schema-comparison';
import type { MigrationResult } from './types';

/**
 * Generates database migrations based on schema differences
 *
 * This is the main entry point for the migration system. It orchestrates
 * the entire process from connecting to the database to generating migrations.
 *
 * @param config - C15T configuration containing database connection and schema details
 *
 * @returns MigrationResult containing:
 *   - toBeCreated: Tables that need to be created
 *   - toBeAdded: Columns that need to be added to existing tables
 *   - runMigrations: Function to execute all migrations
 *   - compileMigrations: Function to compile migrations to SQL without executing
 *
 * @throws Will exit the process if the Kysely adapter is not available
 *
 * @example
 * ```typescript
 * // Generate migrations and execute them
 * const { runMigrations } = await getMigrations(config);
 * await runMigrations();
 *
 * // Or generate migrations and get the SQL
 * const { compileMigrations } = await getMigrations(config);
 * const sql = await compileMigrations();
 * console.log("Migration SQL:", sql);
 * ```
 */
export async function getMigrations(
	config: C15TOptions
): Promise<MigrationResult> {
	const logger = createLogger(config.logger);

	// Initialize database connection
	let { kysely: db, databaseType: dbType } = await createKyselyAdapter(config);

	// Check if the database type is supported
	if (!dbType) {
		logger.warn(
			'Could not determine database type, defaulting to sqlite. Please provide a type in the database options to avoid this.'
		);
		dbType = 'sqlite';
	}

	// Check if the database is connected
	if (!db) {
		logger.error(
			"Only kysely adapter is supported for migrations. You can use `generate` command to generate the schema, if you're using a different adapter."
		);
		process.exit(1);
	}

	// Get database metadata
	const tableMetadata = await db.introspection.getTables();

	// Analyze schema differences
	const { toBeCreated, toBeAdded } = analyzeSchemaChanges(
		config,
		tableMetadata,
		dbType
	);

	// Build migration operations
	const columnMigrations = buildColumnAddMigrations(db, toBeAdded, dbType);
	const tableMigrations = buildTableCreateMigrations(db, toBeCreated, dbType);
	const migrations = [...columnMigrations, ...tableMigrations];

	// Create migration executors
	const { runMigrations, compileMigrations } =
		createMigrationExecutors(migrations);

	return {
		toBeCreated,
		toBeAdded,
		runMigrations,
		compileMigrations,
	};
}
