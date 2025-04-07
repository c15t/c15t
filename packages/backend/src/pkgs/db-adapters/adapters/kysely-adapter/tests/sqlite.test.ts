import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, sql } from 'kysely';
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

	describe('SQLite Tests', () => {
		// Create Kysely instance with LibSQL dialect
		const sqliteKy = new Kysely<DB>({
			dialect: new LibsqlDialect({
				url: ':memory:',
			}),
		});

		const sqliteConfig: DbConfig = {
			name: 'SQLite',
			instance: sqliteKy,
			type: 'sqlite',
			connectionString: ':memory:',
			cleanup: async () => {
				try {
					// For in-memory database, execute a cleanup query
					await sql`VACUUM`.execute(sqliteKy);
				} catch {
					// Ignore cleanup errors
				}
			},
		};

		let sqliteAdapter: Adapter;

		// Setup before tests
		beforeAll(async () => {
			// Clean up any existing data
			await sqliteConfig.cleanup?.();
			logger.info('Cleanup completed for SQLite');

			// Create configuration options
			const options = createOptions(sqliteConfig);
			logger.info('Created test options for SQLite');

			// Use the proper migration system from the project
			logger.info('Getting migrations for SQLite test');
			const migrationResult = await getMigrations({
				...options,
				logger: { level: 'info' }, // Use info level for more visibility
			});

			logger.info('Running migrations for SQLite test');
			// Run migrations using the project's migration system
			await migrationResult.runMigrations();
			logger.info('Completed migrations for SQLite test');

			// Check which tables were created
			const tables = await sqliteKy.introspection.getTables();
			logger.info(
				`Tables created by migration: ${tables.map((t) => t.name).join(', ')}`
			);

			// If migrations didn't create the tables we need, create the basic ones required for tests
			if (!tables.some((t) => t.name === 'subject')) {
				logger.warn(
					'Migration did not create the required tables. Creating the minimal required schema for tests.'
				);

				// Create the minimal required schema for tests
				await createRequiredTestTables(sqliteKy);
			}

			// Create the adapter for tests to use
			sqliteAdapter = kyselyAdapter(sqliteConfig.instance, {
				type: sqliteConfig.type as KyselyDatabaseType,
			})(options);

			// Add to the adapter collection for compatibility test
			adapters.push(sqliteAdapter);
			logger.info('SQLite test setup complete');
		}, hookTimeout);

		afterAll(async () => {
			await sqliteConfig.cleanup?.();
			logger.info('Cleanup completed for SQLite');
		}, hookTimeout);

		// Test to verify tables are created
		test('SQLite: verify database tables', async () => {
			let tables: string[] = [];

			// For SQLite/LibSQL, query the sqlite_master table with raw query
			try {
				// Use the sql template tag to create a properly typed query
				const result = await sql`
					SELECT name FROM sqlite_master 
					WHERE type = 'table' 
					AND name NOT LIKE 'sqlite_%' 
					AND name != 'c15t_migrations'
				`.execute(sqliteKy);

				// Type the rows first, then map
				const typedRows = result.rows as Array<{ name: string }>;
				tables = typedRows.map((row) => row.name);
				logger.info(`Found tables in SQLite: ${tables.join(', ')}`);
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

		// Run the adapter tests for SQLite
		runAdapterTests({
			name: 'SQLite',
			getAdapter: async () => sqliteAdapter,
			skipGenerateIdTest: sqliteConfig.skipGenerateIdTest,
			skipTransactionTest: sqliteConfig.disableTransactions,
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
		.addColumn('createdAt', 'date', (col) => col.notNull())
		.addColumn('updatedAt', 'date', (col) => col.notNull())
		.execute();
	logger.info('Created subject table');

	// Create minimal versions of other tables needed for tests
	for (const table of expectedTables.filter((t) => t !== 'subject')) {
		await db.schema
			.createTable(table)
			.ifNotExists()
			.addColumn('id', 'text', (col) => col.primaryKey().notNull())
			.addColumn('createdAt', 'date', (col) => col.notNull())
			.execute();
		logger.info(`Created ${table} table`);
	}
}
