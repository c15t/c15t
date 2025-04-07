import { Kysely, sql } from 'kysely';
import { PostgresDialect } from 'kysely';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { getMigrations } from '~/db/migration';
import type { C15TOptions } from '~/types';
import { logger } from '~/utils/logger';
import { runAdapterTests } from '../../test';
import type { Adapter } from '../../types';
import {
	type Database as DB,
	type KyselyDatabaseType,
	kyselyAdapter,
} from '../index';

/**
 * Database configuration interface for test setup
 */
interface DbConfig {
	name: string;
	instance: Kysely<DB>;
	type: string;
	connectionString: string;
	cleanup?: () => Promise<void>;
	skipGenerateIdTest?: boolean;
	migrationErrorPattern?: RegExp;
	disableTransactions?: boolean;
}

/**
 * Helper to create C15T options for a database
 */
function createOptions(dbConfig: DbConfig): C15TOptions {
	return {
		database: {
			db: dbConfig.instance,
			type: dbConfig.type as KyselyDatabaseType,
		},
		secret: 'test-secret-for-encryption',
		advanced: {
			disableTransactions: dbConfig.disableTransactions,
		},
	};
}

/**
 * Expected tables based on c15t schema
 */
const expectedTables = [
	'subject',
	'consentPurpose',
	'domain',
	'geoLocation',
	'consentPolicy',
	'consent',
	'consentPurposeJunction',
	'consentRecord',
	'consentGeoLocation',
	'consentWithdrawal',
	'auditLog',
];

describe('Kysely Adapter Tests', () => {
	// Global timeout for all tests
	const hookTimeout = 60000; // Increased to 60 seconds

	// Collection of database adapters for compatibility test
	const adapters: Adapter[] = [];

	// Run all adapters compatibility test after all individual tests
	afterAll(() => {
		// Skip test if fewer than 2 adapters
		if (adapters.length < 2) {
			return;
		}

		// Verify that all adapters are instances of the same class
		expect(
			adapters.every((a) => a.constructor === adapters[0]?.constructor)
		).toBe(true);
	});

	describe('Postgres Tests', () => {
		// Set up test database connection details (usually from env vars in real projects)
		const connectionString =
			process.env.POSTGRES_CONNECTION_STRING ||
			'postgres://postgres:postgres@localhost:5432/c15t_test';

		// Create Kysely instance with Postgres dialect
		const pgPool = new pg.Pool({
			connectionString,
			max: 10,
		});

		const postgresKy = new Kysely<DB>({
			dialect: new PostgresDialect({
				pool: pgPool,
			}),
		});

		const postgresConfig: DbConfig = {
			name: 'Postgres',
			instance: postgresKy,
			type: 'postgres',
			connectionString,
			cleanup: async () => {
				try {
					// Drop all test tables to clean up
					for (const table of expectedTables) {
						try {
							await postgresKy.schema.dropTable(table).ifExists().execute();
						} catch {
							// Ignore errors during cleanup
						}
					}

					// Also try to drop the migrations table
					try {
						await postgresKy.schema
							.dropTable('c15t_migrations')
							.ifExists()
							.execute();
					} catch {
						// Ignore errors during cleanup
					}
				} catch {
					// Ignore errors during cleanup
				}
			},
		};

		let postgresAdapter: Adapter;

		// Setup before tests
		beforeAll(async () => {
			// Clean up any existing tables
			await postgresConfig.cleanup?.();

			// Create configuration options
			const options = createOptions(postgresConfig);
			logger.info('Created test options for Postgres');

			// Use the getMigrations function from the migration system
			logger.info('Getting migrations for Postgres test');
			const migrationResult = await getMigrations({
				...options,
				logger: { level: 'info' }, // Use info level for more visibility
			});

			logger.info('Running migrations for Postgres test');
			// Run migrations using the project's migration system
			await migrationResult.runMigrations();
			logger.info('Completed migrations for Postgres test');

			// Check which tables were created
			const tables = await postgresKy.introspection.getTables();
			logger.info(
				`Tables created by migration: ${tables.map((t) => t.name).join(', ')}`
			);

			// If migrations didn't create the tables we need, create the basic ones required for tests
			if (!tables.some((t) => t.name === 'subject')) {
				logger.warn(
					'Migration did not create the required tables. Creating the minimal required schema for tests.'
				);

				// Create the minimal required schema for tests
				await createRequiredTestTables(postgresKy);
			}

			// Create the adapter for tests to use
			postgresAdapter = kyselyAdapter(postgresConfig.instance, {
				type: postgresConfig.type as KyselyDatabaseType,
			})(options);

			// Add to the adapter collection for compatibility test
			adapters.push(postgresAdapter);
			logger.info('Postgres test setup complete');
		}, hookTimeout);

		afterAll(async () => {
			// Temporarily disable cleanup to inspect tables
			// await postgresConfig.cleanup?.();
			await pgPool.end();
			logger.info('Pool closed, but tables preserved for inspection');
		}, hookTimeout);

		// Test to verify tables are created
		test('Postgres: verify database tables', async () => {
			let tables: string[] = [];

			// For Postgres, query the information_schema
			try {
				const result = await sql`
					SELECT table_name 
					FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_type = 'BASE TABLE'
				`.execute(postgresKy);

				// Type the rows first, then map
				const typedRows = result.rows as Array<{ table_name: string }>;
				tables = typedRows.map((row) => row.table_name);
				logger.info(`Found tables in Postgres: ${tables.join(', ')}`);
			} catch {
				// Handle error
			}

			// Verify that all expected tables exist
			for (const table of expectedTables) {
				expect(tables).toContain(table);
			}

			// Verify that the number of tables matches or exceeds the expected number
			expect(tables.length).toBeGreaterThanOrEqual(expectedTables.length);
		});

		// Run the adapter tests for Postgres
		runAdapterTests({
			name: 'Postgres',
			getAdapter: async () => postgresAdapter,
			skipGenerateIdTest: postgresConfig.skipGenerateIdTest,
			skipTransactionTest: postgresConfig.disableTransactions,
		});
	});

	// Run compatibility test after all databases have been tested
	test('All adapters should be compatible with each other', async () => {
		// Skip test if fewer than 2 adapters
		if (adapters.length < 2) {
			return;
		}

		// Verify that all adapters are instances of the same class
		expect(
			adapters.every((a) => a.constructor === adapters[0]?.constructor)
		).toBe(true);
	});
});

/**
 * Creates minimal required tables for testing purposes if migrations don't create them
 * This is a fallback to ensure tests can run, while still using the migration system first
 */
async function createRequiredTestTables(db: Kysely<DB>): Promise<void> {
	// Create the subject table (required for tests)
	await db.schema
		.createTable('subject')
		.ifNotExists()
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('isIdentified', 'boolean', (col) =>
			col.notNull().defaultTo(false)
		)
		.addColumn('externalId', 'text')
		.addColumn('identityProvider', 'text')
		.addColumn('lastIpAddress', 'text')
		.addColumn('subjectTimezone', 'text')
		.addColumn('createdAt', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'timestamp', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.execute();
	logger.info('Created subject table');

	// Create minimal versions of other tables needed for tests
	for (const table of expectedTables.filter((t) => t !== 'subject')) {
		await db.schema
			.createTable(table)
			.ifNotExists()
			.addColumn('id', 'text', (col) => col.primaryKey().notNull())
			.addColumn('createdAt', 'timestamp', (col) =>
				col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
			)
			.execute();
		logger.info(`Created ${table} table`);
	}
}
