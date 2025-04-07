import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import type { Adapter } from '~/pkgs/db-adapters';
import { logger } from '~/pkgs/logger';
import { getMigrations } from '~/pkgs/migrations';
import { type KyselyDatabaseType, kyselyAdapter } from '../index';
import type { Database } from '../types';
import {
	DbConfig,
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

		// Verify that all adapters are instances of the same class
		// biome-ignore lint/suspicious/noMisplacedAssertion: its in a harness test suite
		expect(
			adapters.every((a) => a.constructor === adapters[0]?.constructor)
		).toBe(true);
	});

	describe('Postgres Tests', () => {
		// Initialize PGlite for in-memory Postgres
		let pgLiteClient: PGlite;

		// Create Kysely instance with PGlite
		let postgresKy: Kysely<Database>;

		let postgresConfig: DbConfig;
		let postgresAdapter: Adapter;

		// Setup before tests
		beforeAll(async () => {
			// Create in-memory PGlite instance
			pgLiteClient = new PGlite();
			logger.info('Created in-memory PGlite instance');

			// Create Kysely instance with KyselyPGlite dialect
			const kyselyPGlite = new KyselyPGlite(pgLiteClient);

			postgresKy = new Kysely<Database>({
				dialect: kyselyPGlite.dialect,
			});

			postgresConfig = {
				name: 'PGlite',
				instance: postgresKy,
				type: 'postgres',
				cleanup: async () => {
					try {
						// Drop all test tables to clean up
						for (const table of expectedTables) {
							try {
								await pgLiteClient.query(
									`DROP TABLE IF EXISTS "${table}" CASCADE`
								);
							} catch (err) {
								logger.warn(`Error dropping table ${table}:`, err);
							}
						}

						// Also try to drop the migrations table
						try {
							await pgLiteClient.query(
								`DROP TABLE IF EXISTS "c15t_migrations" CASCADE`
							);
						} catch (err) {
							logger.debug('Error dropping migrations table:', err);
						}
					} catch (err) {
						logger.error('Error during cleanup:', err);
					}
				},
			};

			// Clean up any existing tables
			await postgresConfig.cleanup?.();

			// Create configuration options using shared function
			const options = createOptions(postgresConfig);
			logger.info('Created test options for PGlite');

			// Initialize migrations
			logger.info('Getting migrations for PGlite test');
			const migrationResult = await getMigrations({
				...options,
				logger: { level: 'info' },
			});

			// Run migrations
			logger.info('Running migrations for PGlite test');
			try {
				await migrationResult.runMigrations();
				logger.info('Successfully completed migrations for PGlite test');
			} catch (err) {
				logger.error('Failed to run migrations:', err);
				throw err;
			}

			// Check which tables were created
			const tablesResult = await pgLiteClient.query(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
			);
			const tables = (tablesResult.rows as Array<{ table_name: string }>).map(
				(row) => row.table_name
			);
			logger.info(`Tables created by migration: ${tables.join(', ')}`);

			// Verify that the necessary tables exist using shared function
			await verifyRequiredTables(tables, logger);

			// Create the adapter for tests to use
			postgresAdapter = kyselyAdapter(postgresConfig.instance, {
				type: postgresConfig.type as KyselyDatabaseType,
			})(options);

			// Add to the adapter collection for compatibility test
			adapters.push(postgresAdapter);
			logger.info('PGlite test setup complete');
		}, hookTimeout);

		afterAll(async () => {
			// Clean up the tables when finished
			await postgresConfig.cleanup?.();
			logger.info('PGlite test cleanup complete');
		}, hookTimeout);

		// Test to verify tables are created
		test('PGlite: verify database tables', async () => {
			let tables: string[] = [];

			// Query using PGlite
			try {
				const result = await pgLiteClient.query(
					"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
				);
				tables = (result.rows as Array<{ table_name: string }>).map(
					(row) => row.table_name
				);
				logger.info(`Found tables in PGlite: ${tables.join(', ')}`);
			} catch (error) {
				logger.error('Error querying tables:', error);
			}

			// Verify that all expected tables exist
			for (const table of expectedTables) {
				expect(tables).toContain(table);
			}

			// Verify that the number of tables matches or exceeds the expected number
			expect(tables.length).toBeGreaterThanOrEqual(expectedTables.length);
		});

		// Before running the adapter tests, verify we can access the subject table
		test('PGlite: verify subject table is accessible', async () => {
			// Check if we can insert and select from the subject table
			try {
				// Insert test data
				await pgLiteClient.query(
					`INSERT INTO "subject" (id, "isIdentified", "createdAt", "updatedAt") 
					 VALUES ('test-direct-sql', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
				);

				// Select the test data
				const selectResult = await pgLiteClient.query(
					`SELECT * FROM "subject" WHERE id = 'test-direct-sql'`
				);

				// Verify we got a result
				expect(selectResult.rows.length).toBeGreaterThan(0);
				const row = selectResult.rows[0] as Record<string, unknown>;
				expect(row.id).toBe('test-direct-sql');
			} catch (err) {
				logger.error('Error during subject table verification:', err);
				throw err;
			}
		});

		// Run the adapter tests for PGlite
		runAdapterTests({
			name: 'PGlite',
			getAdapter: async () => postgresAdapter,
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
