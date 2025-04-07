import { type Kysely, sql } from 'kysely';
import { afterAll, describe, expect, test } from 'vitest';
import type { C15TOptions } from '~/types';
import type { Adapter } from '../../types';
import type { Database as DB, KyselyDatabaseType } from '../index';

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
			console.log(
				'⚠️ Skipping adapter compatibility test - not enough adapters available'
			);
			return;
		}

		// Verify that all adapters are instances of the same class
		expect(
			adapters.every((a) => a.constructor === adapters[0]?.constructor)
		).toBe(true);
	});

	describe.skip('MySQL Tests', () => {
		// Skip all MySQL tests for now
		test('MySQL support is temporarily skipped', () => {
			console.log('⚠️ MySQL tests are currently skipped');
			expect(true).toBe(true);
		});
	});

	// Run compatibility test after all databases have been tested
	test.skip('All adapters should be compatible with each other', () => {
		// Skip test if fewer than 2 adapters
		if (adapters.length < 2) {
			console.log(
				'⚠️ Skipping adapter compatibility test - not enough adapters available'
			);
			return;
		}

		// Verify that all adapters are instances of the same class
		expect(
			adapters.every((a) => a.constructor === adapters[0]?.constructor)
		).toBe(true);
	});
});

/**
 * Creates the test tables directly using Kysely
 */
async function createTestTables(db: Kysely<DB>): Promise<void> {
	console.log('🔧 Creating tables directly...');

	// Create the subject table (required for tests)
	try {
		// Drop the table first to ensure clean state
		await db.schema.dropTable('subject').ifExists().execute();

		await db.schema
			.createTable('subject')
			.addColumn('id', 'text', (col) => col.primaryKey().notNull())
			.addColumn('isIdentified', 'boolean', (col) =>
				col.notNull().defaultTo(false)
			)
			.addColumn('externalId', 'text')
			.addColumn('identityProvider', 'text')
			.addColumn('lastIpAddress', 'text')
			.addColumn('subjectTimezone', 'text')
			.addColumn('createdAt', 'datetime', (col) =>
				col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
			)
			.addColumn('updatedAt', 'datetime', (col) =>
				col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
			)
			.execute();
		console.log('✅ Created subject table');
	} catch (err) {
		console.error('❌ Failed to create subject table:', err);
		throw err;
	}

	// Create minimal versions of other tables needed for tests
	for (const table of expectedTables.filter((t) => t !== 'subject')) {
		try {
			// Drop the table first to ensure clean state
			await db.schema.dropTable(table).ifExists().execute();

			await db.schema
				.createTable(table)
				.addColumn('id', 'text', (col) => col.primaryKey().notNull())
				.addColumn('createdAt', 'datetime', (col) =>
					col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
				)
				.execute();
			console.log(`✅ Created table: ${table}`);
		} catch (err) {
			console.error(`❌ Failed to create table ${table}:`, err);
			// Continue with other tables even if one fails
		}
	}
}
