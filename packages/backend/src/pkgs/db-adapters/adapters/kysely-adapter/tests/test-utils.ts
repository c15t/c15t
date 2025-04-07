import { type Kysely, type Migration, sql } from 'kysely';
import type { C15TOptions } from '../../../../types';
import type { Adapter } from '../../../adapters/types';
import type { Database } from '../types';

/**
 * Database configuration for tests
 */
export interface DbConfig {
	name: string;
	instance: Kysely<Database>;
	type: string;
	connectionString: string;
	cleanup: () => Promise<void>;
	skipGenerateIdTest?: boolean;
	migrationErrorPattern?: RegExp;
	disableTransactions?: boolean;
}

/**
 * Expected tables to be created by the migrations
 */
export const expectedTables = [
	'subject',
	'consent_purpose',
	'consent_policy',
	'domain',
	'geo_location',
	'consent',
	'consent_purpose_junction',
	'consent_geo_location',
	'consent_withdrawal',
	'audit_log',
	'consent_record',
];

/**
 * Run migrations on a database
 */
export async function runMigrations(
	db: Kysely<Database>,
	migrationTableName: string,
	errorPattern?: RegExp,
	disableTransactions?: boolean
): Promise<void> {
	try {
		// First check if the migration table exists
		const tables = await db.introspection.getTables();

		const migrationTableExists = tables.some(
			(table) => table.name === migrationTableName
		);

		if (!migrationTableExists) {
			// Create the migrations table
			await db.schema
				.createTable(migrationTableName)
				.addColumn('id', 'serial', (col) => col.primaryKey())
				.addColumn('name', 'varchar(255)', (col) => col.notNull())
				.addColumn('timestamp', 'timestamp', (col) =>
					col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
				)
				.execute();
		}

		// Check if we already have the initial migration
		const hasMigration = await db
			.selectFrom(migrationTableName)
			.select('name')
			.where('name', '=', 'initial')
			.executeTakeFirst();

		if (hasMigration) {
			// Migration already run
			return;
		}

		// Run our test migrations
		const runResult = await db.transaction().execute(async (trx) => {
			// Create tables
			// Basic subject table with required fields
			await trx.schema
				.createTable('subject')
				.addColumn('id', 'text', (col) => col.primaryKey().notNull())
				.addColumn('isIdentified', 'boolean', (col) =>
					col.notNull().defaultTo(false)
				)
				.addColumn('externalId', 'text')
				.addColumn('identityProvider', 'text')
				.addColumn('lastIpAddress', 'text')
				.addColumn('subjectTimezone', 'text')
				.addColumn('createdAt', 'timestamp', (col) => col.notNull())
				.addColumn('updatedAt', 'timestamp', (col) => col.notNull())
				.execute();

			// Create other tables
			for (const table of [
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
			]) {
				await trx.schema
					.createTable(table)
					.addColumn('id', 'text', (col) => col.primaryKey().notNull())
					.addColumn('createdAt', 'timestamp', (col) => col.notNull())
					.execute();
			}

			// Record the migration
			if (disableTransactions) {
				// Use direct SQL for SQLite
				await trx.executeQuery(sql`
					INSERT INTO ${sql.identifier([migrationTableName])} (name, timestamp)
					VALUES ('initial', CURRENT_TIMESTAMP)
				`);
			} else {
				// Use Kysely for other databases
				await trx
					.insertInto(migrationTableName)
					.values({
						name: 'initial',
						timestamp: new Date(),
					})
					.execute();
			}
		});

		return;
	} catch (err) {
		// If error matches pattern, this is expected
		const errorMessage = err instanceof Error ? err.message : String(err);
		if (errorPattern && errorPattern.test(errorMessage)) {
			return;
		}

		// Otherwise rethrow
		throw err;
	}
}

/**
 * Create C15T options for testing
 */
export function createOptions(dbConfig: DbConfig): C15TOptions {
	return {
		database: {
			db: dbConfig.instance,
			type: dbConfig.type as any,
		},
		secret: 'test-secret-for-encryption',
	};
}

/**
 * Create test migrations for database setup
 */
export function createTestMigrations(): Record<string, Migration> {
	return {
		initial: {
			async up(db) {
				try {
					// Create the subject table with required fields
					await db.schema
						.createTable('subject')
						.addColumn('id', 'text', (col) => col.primaryKey().notNull())
						.addColumn('isIdentified', 'boolean', (col) => col.notNull())
						.addColumn('externalId', 'text')
						.addColumn('identityProvider', 'text')
						.addColumn('lastIpAddress', 'text')
						.addColumn('subjectTimezone', 'text')
						.addColumn('createdAt', 'timestamp', (col) => col.notNull())
						.addColumn('updatedAt', 'timestamp', (col) => col.notNull())
						.execute();

					// Create other tables
					for (const table of [
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
					]) {
						await db.schema
							.createTable(table)
							.addColumn('id', 'text', (col) => col.primaryKey().notNull())
							.addColumn('createdAt', 'timestamp', (col) => col.notNull())
							.execute();
					}
				} catch (err) {
					throw err;
				}
			},

			async down(db) {
				// Drop tables in reverse dependency order
				try {
					for (const table of [
						'auditLog',
						'consentWithdrawal',
						'consentGeoLocation',
						'consentRecord',
						'consentPurposeJunction',
						'consent',
						'consentPolicy',
						'geoLocation',
						'domain',
						'consentPurpose',
						'subject',
					]) {
						await db.schema.dropTable(table).execute();
					}
				} catch (err) {
					// Ignore errors in migration down
				}
			},
		},
	};
}

/**
 * Run tests for a database adapter
 */
export async function runAdapterTests(opts: {
	name: string;
	getAdapter: () => Promise<Adapter>;
	skipGenerateIdTest?: boolean;
	skipTransactionTest?: boolean;
}) {
	let adapter: Adapter;

	// Setup before tests
	beforeEach(async () => {
		adapter = await opts.getAdapter();
	});

	// Individual test cases
	test(`${opts.name}: create subject`, async () => {
		const res = await adapter.create({
			model: 'subject',
			data: {
				id: 'subject-id-1',
				isIdentified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		expect(res).toBeDefined();
		// @ts-expect-error - id is not a field on the subject model
		expect(res.id).toBe('subject-id-1');
	});

	test(`${opts.name}: find subject`, async () => {
		const res = await adapter.findOne({
			model: 'subject',
			where: [
				{
					field: 'id',
					value: 'subject-id-1',
				},
			],
		});

		expect(res).toBeDefined();
		// @ts-expect-error - id is not a field on the subject model
		expect(res.id).toBe('subject-id-1');
	});

	test(`${opts.name}: update subject`, async () => {
		const res = await adapter.update({
			model: 'subject',
			where: [
				{
					field: 'id',
					value: 'subject-id-1',
				},
			],
			update: {
				isIdentified: true,
				updatedAt: new Date(),
			},
		});

		expect(res).toBeDefined();
		// @ts-expect-error - id is not a field on the subject model
		expect(res.id).toBe('subject-id-1');
		// @ts-expect-error - isIdentified is not a field on the subject model
		expect(res.isIdentified).toBe(true);
	});

	test(`${opts.name}: delete subject`, async () => {
		// Should not throw
		await adapter.delete({
			model: 'subject',
			where: [
				{
					field: 'id',
					value: 'subject-id-1',
				},
			],
		});

		// Verify the subject was deleted
		const res = await adapter.findOne({
			model: 'subject',
			where: [
				{
					field: 'id',
					value: 'subject-id-1',
				},
			],
		});

		expect(res).toBeNull();
	});

	// Skip the generateId test conditionally
	(opts.skipGenerateIdTest ? test.skip : test)(
		`${opts.name}: generate ID`,
		async () => {
			// Create a record with an auto-generated ID
			const res = await adapter.create({
				model: 'subject',
				data: {
					isIdentified: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			expect(res).toBeDefined();
			// @ts-expect-error - id is not a field on the subject model
			expect(res.id).toBeDefined();
			// @ts-expect-error - id is not a field on the subject model
			expect(typeof res.id).toBe('string');
			// @ts-expect-error - id is not a field on the subject model
			expect(res.id.length).toBeGreaterThan(0);
		}
	);

	// Skip the transaction test conditionally
	(opts.skipTransactionTest ? test.skip : test)(
		`${opts.name}: transaction`,
		async () => {
			const recordId = 'txn-test-subject';

			// Run a successful transaction
			await adapter.transaction({
				callback: async (txAdapter) => {
					await txAdapter.create({
						model: 'subject',
						data: {
							id: recordId,
							isIdentified: false,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					});
				},
			});

			// Verify the record was created
			const res = await adapter.findOne({
				model: 'subject',
				where: [
					{
						field: 'id',
						value: recordId,
					},
				],
			});

			expect(res).toBeDefined();
			// @ts-expect-error - id is not a field on the subject model
			expect(res.id).toBe(recordId);

			// Test a failed transaction
			try {
				await adapter.transaction({
					callback: async (txAdapter) => {
						// Create a record first
						await txAdapter.create({
							model: 'subject',
							data: {
								id: 'should-not-exist',
								isIdentified: false,
								createdAt: new Date(),
								updatedAt: new Date(),
							},
						});

						// Throw an error to roll back
						throw new Error('Test transaction rollback');
					},
				});
			} catch (err) {
				// Expected error
			}

			// Verify the record was not created
			const rollbackRes = await adapter.findOne({
				model: 'subject',
				where: [
					{
						field: 'id',
						value: 'should-not-exist',
					},
				],
			});

			expect(rollbackRes).toBeNull();
		}
	);
}
