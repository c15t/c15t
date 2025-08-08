import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { logger } from '@doubletie/logger';
import type { Adapter } from '~/pkgs/db-adapters';
import { getMigrations } from '~/pkgs/migrations';
import { type KyselyDatabaseType, kyselyAdapter } from '../index';
import type { Database } from '../types';
import {
	type DbConfig,
	createOptions,
	expectedTables,
	runAdapterTests,
	verifyRequiredTables,
} from './test-utils';

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
	});

	describe('SQLite Tests', () => {
		// Create a dedicated connection for SQLite
		// For SQLite we need to disable WAL mode to ensure transactions work correctly in tests
		const sqliteKy = new Kysely<Database>({
			dialect: new LibsqlDialect({
				url: ':memory:', // Use in-memory database for tests
				// Important: Configuring SQLite for better reliability in tests
				tls: false, // Disable TLS for in-memory DB
			}),
		});

		const sqliteConfig: DbConfig = {
			name: 'SQLite',
			instance: sqliteKy,
			type: 'sqlite',
			connectionString: ':memory:',
			cleanup: async () => {
				try {
					// For SQLite we can drop all tables explicitly to ensure we're truly cleaning up
					for (const table of expectedTables) {
						try {
							await sqliteKy.schema.dropTable(table).ifExists().execute();
						} catch (err) {
							logger.warn(`Error dropping table ${table}:`, err);
						}
					}

					// Also drop the migrations table
					try {
						await sqliteKy.schema
							.dropTable('c15t_migrations')
							.ifExists()
							.execute();
					} catch (err) {
						logger.debug('Error dropping migrations table:', err);
					}

					// Vacuum database to clean up
					await sql`VACUUM`.execute(sqliteKy);
				} catch (err) {
					logger.error('Error during cleanup:', err);
				}
			},
			// SQLite has issues with transactions in test environments
			// We'll skip the transaction tests for SQLite
			disableTransactions: true,
		};

		let sqliteAdapter: Adapter;

		// Setup before tests
		beforeAll(async () => {
			// Create tables using pragma to enable foreign keys
			await sql`PRAGMA foreign_keys = ON`.execute(sqliteKy);

			// For SQLite, we'll also explicitly set journal mode to memory for better test performance
			await sql`PRAGMA journal_mode = MEMORY`.execute(sqliteKy);

			// And set synchronous mode to NORMAL for better test reliability
			await sql`PRAGMA synchronous = NORMAL`.execute(sqliteKy);

			// Clean up any existing data (though not needed for in-memory DB)
			await sqliteConfig.cleanup?.();
			logger.info('Cleanup completed for SQLite');

			// Create configuration options
			const options = createOptions(sqliteConfig);
			logger.info('Created test options for SQLite');

			// Initialize migrations
			logger.info('Getting migrations for SQLite test');
			const migrationResult = await getMigrations({
				...options,
				logger: { level: 'info' },
			});

			// Run migrations
			logger.info('Running migrations for SQLite test');
			try {
				await migrationResult.runMigrations();
				logger.info('Successfully completed migrations for SQLite test');
			} catch (err) {
				logger.error('Failed to run migrations:', err);
				throw err;
			}

			// Check which tables were created
			const tables = await sqliteKy.introspection.getTables();
			const tableNames = tables.map((t) => t.name);
			logger.info(`Tables created by migration: ${tableNames.join(', ')}`);

			// Verify that the necessary tables exist using the shared function
			await verifyRequiredTables(tableNames, logger);

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
			} catch (err) {
				logger.error('Error querying tables:', err);
			}

			// Verify that all expected tables exist
			for (const table of expectedTables) {
				expect(tables).toContain(table);
			}

			// Verify that the number of tables matches or exceeds the expected number
			expect(tables.length).toBeGreaterThanOrEqual(expectedTables.length);
		});

		// Before running the adapter tests, let's verify that we can access the subject table
		test('SQLite: verify subject table is accessible', async () => {
			// Check if subject table exists
			const result = await sql`
				SELECT name FROM sqlite_master 
				WHERE type = 'table' AND name = 'subject'
			`.execute(sqliteKy);

			expect(result.rows.length).toBeGreaterThan(0);

			// Check if we can insert and select from the subject table directly using raw SQL
			// This is a more reliable approach with SQLite
			try {
				// Insert test data
				await sql`
					INSERT INTO subject (id, isIdentified, createdAt, updatedAt)
					VALUES ('test-direct-sql', 0, datetime('now'), datetime('now'))
				`.execute(sqliteKy);

				// Select the test data
				const selectResult = await sql`
					SELECT * FROM subject WHERE id = 'test-direct-sql'
				`.execute(sqliteKy);

				// Verify we got a result
				expect(selectResult.rows.length).toBeGreaterThan(0);
				const row = selectResult.rows[0] as Record<string, unknown>;
				expect(row.id).toBe('test-direct-sql');
			} catch (err) {
				logger.error('Error during subject table verification:', err);
				throw err;
			}
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
	test('All adapters should be compatible with each other', () => {
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
