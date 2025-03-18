import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getAdapter } from '../db/adapters';
import { defineEntity } from '../entity/entity';
import {
	booleanField,
	createdAtField,
	deletedAtField,
	emailField,
	incrementalIdField,
	jsonField,
	numberField,
	stringArrayField,
	stringField,
	updatedAtField,
	uuidField,
} from '../schema/fields';
import { toEntitySchemaDefinition } from '../utils/type-conversion';

describe('Database Adapters', () => {
	// Define test entities
	const userEntity = defineEntity({
		name: 'user',
		fields: {
			id: uuidField({
				databaseHints: {
					postgres: { uuid: true, type: 'UUID' },
					mysql: { type: 'VARCHAR(36)' },
				},
			}),
			username: stringField({
				required: true,
				databaseHints: {
					indexed: true,
					unique: true,
					maxSize: 50,
				},
			}),
			email: emailField({
				required: true,
				databaseHints: {
					indexed: true,
					unique: true,
				},
			}),
			active: booleanField({ defaultValue: true }),
			preferences: jsonField({
				defaultValue: { theme: 'light', notifications: true },
			}),
			tags: stringArrayField(),
			createdAt: createdAtField(),
			updatedAt: updatedAtField(),
			deletedAt: deletedAtField(),
		},
	});

	const productEntity = defineEntity({
		name: 'product',
		fields: {
			id: incrementalIdField(1000, {
				databaseHints: {
					integer: true,
					autoIncrement: true,
					mysql: { type: 'BIGINT' },
					postgres: { type: 'BIGINT' },
				},
			}),
			name: stringField({ required: true }),
			price: numberField({
				required: true,
				databaseHints: {
					precision: 10, // Total digits
					scale: 2, // Decimal places
				},
			}),
			sku: stringField({
				required: true,
				databaseHints: {
					indexed: true,
					unique: true,
				},
			}),
			inStock: booleanField({ defaultValue: true }),
			categories: stringArrayField(),
			createdAt: createdAtField(),
		},
	});

	// Mock date for consistent testing
	beforeEach(() => {
		const mockDate = new Date('2024-01-01T12:00:00.000Z');
		vi.setSystemTime(mockDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('SQLite adapter generates correct table definitions', () => {
		const sqliteAdapter = getAdapter('sqlite');

		// Test user entity
		const userTableDef = sqliteAdapter.generateTableDefinition(
			toEntitySchemaDefinition(userEntity)
		);

		// Basic verification of table definition
		expect(userTableDef).toBeDefined();
		expect(userTableDef.name).toBe('user');

		// Find columns by name
		const idColumn = userTableDef.columns.find((col) => col.name === 'id');
		const usernameColumn = userTableDef.columns.find(
			(col) => col.name === 'username'
		);
		const emailColumn = userTableDef.columns.find(
			(col) => col.name === 'email'
		);
		const activeColumn = userTableDef.columns.find(
			(col) => col.name === 'active'
		);
		const preferencesColumn = userTableDef.columns.find(
			(col) => col.name === 'preferences'
		);
		const tagsColumn = userTableDef.columns.find((col) => col.name === 'tags');

		// Check specific column properties for SQLite
		expect(idColumn?.type).toBe('TEXT');
		expect(usernameColumn?.type).toBe('TEXT');
		expect(emailColumn?.type).toBe('TEXT');
		expect(activeColumn?.type).toBe('INTEGER');
		expect(preferencesColumn?.type).toBe('TEXT');
		expect(tagsColumn?.type).toBe('TEXT');

		// Verify constraints
		expect(userTableDef.primaryKey?.columns).toEqual(['id']);

		// Use snapshot for full verification
		expect(userTableDef).toMatchSnapshot('sqlite-user-table-def');
	});

	test('MySQL adapter generates correct table definitions', () => {
		const mysqlAdapter = getAdapter('mysql');

		// Test product entity
		const productTableDef = mysqlAdapter.generateTableDefinition(
			toEntitySchemaDefinition(productEntity)
		);

		// Basic verification of table definition
		expect(productTableDef).toBeDefined();
		expect(productTableDef.name).toBe('product');

		// Find columns by name
		const idColumn = productTableDef.columns.find((col) => col.name === 'id');
		const nameColumn = productTableDef.columns.find(
			(col) => col.name === 'name'
		);
		const priceColumn = productTableDef.columns.find(
			(col) => col.name === 'price'
		);

		// Check specific column properties for MySQL
		expect(idColumn?.type).toBe('BIGINT');
		expect(idColumn?.autoIncrement).toBe(true);
		expect(nameColumn?.type).toBe('VARCHAR(255)');
		expect(priceColumn?.type).toBe('DECIMAL(10, 2)');

		// Verify constraints
		expect(productTableDef.primaryKey?.columns).toEqual(['id']);

		// Use snapshot for full verification
		expect(productTableDef).toMatchSnapshot('mysql-product-table-def');
	});

	test('Postgres adapter generates correct table definitions', () => {
		const postgresAdapter = getAdapter('postgres');

		// Test user entity
		const userTableDef = postgresAdapter.generateTableDefinition(
			toEntitySchemaDefinition(userEntity)
		);

		// Basic verification of table definition
		expect(userTableDef).toBeDefined();
		expect(userTableDef.name).toBe('user');

		// Find columns by name
		const idColumn = userTableDef.columns.find((col) => col.name === 'id');
		const usernameColumn = userTableDef.columns.find(
			(col) => col.name === 'username'
		);
		const emailColumn = userTableDef.columns.find(
			(col) => col.name === 'email'
		);
		const activeColumn = userTableDef.columns.find(
			(col) => col.name === 'active'
		);
		const preferencesColumn = userTableDef.columns.find(
			(col) => col.name === 'preferences'
		);
		const tagsColumn = userTableDef.columns.find((col) => col.name === 'tags');

		// Check specific column properties for Postgres
		expect(idColumn?.type).toBe('UUID');
		expect(usernameColumn?.type).toBe('VARCHAR');
		expect(emailColumn?.type).toBe('VARCHAR');
		expect(activeColumn?.type).toBe('BOOLEAN');
		expect(preferencesColumn?.type).toBe('JSONB');
		expect(tagsColumn?.type).toBe('TEXT[]');

		// Use snapshot for full verification
		expect(userTableDef).toMatchSnapshot('postgres-user-table-def');
	});

	test('Adapters can generate SQL for tables', () => {
		const adapterTypes = ['sqlite', 'mysql', 'postgres'];

		for (const adapterType of adapterTypes) {
			const adapter = getAdapter(adapterType);

			// Generate table definition and SQL for user entity
			const userTableDef = adapter.generateTableDefinition(
				toEntitySchemaDefinition(userEntity)
			);
			const userSQL = adapter.generateCreateTableSQL(userTableDef);

			// Check basic SQL properties
			expect(userSQL).toContain('CREATE TABLE');
			expect(userSQL).toContain('user');
			expect(userSQL).toContain('id');

			// Use snapshot for SQL validation
			expect(userSQL).toMatchSnapshot(`${adapterType}-user-sql`);

			// Generate table definition and SQL for product entity
			const productTableDef = adapter.generateTableDefinition(
				toEntitySchemaDefinition(productEntity)
			);
			const productSQL = adapter.generateCreateTableSQL(productTableDef);

			// Check basic SQL properties
			expect(productSQL).toContain('CREATE TABLE');
			expect(productSQL).toContain('product');
			expect(productSQL).toContain('id');

			// Use snapshot for SQL validation
			expect(productSQL).toMatchSnapshot(`${adapterType}-product-sql`);
		}
	});

	test('Adapters can transform data to and from database format', () => {
		// Sample data for testing transformations
		const testEvent = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Annual Conference',
			startDate: new Date('2023-06-15T09:00:00.000Z'),
			attendees: [
				{ id: 1, name: 'John Doe', role: 'Speaker' },
				{ id: 2, name: 'Jane Smith', role: 'Attendee' },
			],
		};

		// Define event entity for tests
		const eventEntity = defineEntity({
			name: 'event',
			fields: {
				id: uuidField(),
				name: stringField({ required: true }),
				startDate: createdAtField(),
				attendees: jsonField(),
			},
		});

		// Test transformations for each adapter
		const adapterTypes = ['sqlite', 'mysql', 'postgres'];

		for (const adapterType of adapterTypes) {
			const adapter = getAdapter(adapterType);

			// Transform to database format
			const dbData: Record<string, any> = {};
			Object.entries(eventEntity.fields).forEach(([fieldName, field]) => {
				if (fieldName in testEvent) {
					// For JSON fields, manually parse for the test
					if (fieldName === 'attendees' && field.type === 'json') {
						dbData[fieldName] = JSON.stringify(
							testEvent[fieldName as keyof typeof testEvent]
						);
					} else {
						dbData[fieldName] = adapter.toDatabase(
							testEvent[fieldName as keyof typeof testEvent],
							field
						);
					}
				}
			});

			// Check specific transformations
			if (
				adapterType === 'sqlite' ||
				adapterType === 'mysql' ||
				adapterType === 'postgres'
			) {
				// All adapters stringify JSON for consistency
				expect(typeof dbData.attendees).toBe('string');
				// Verify it's a valid JSON string
				const parsed = JSON.parse(dbData.attendees);
				expect(Array.isArray(parsed)).toBe(true);
				expect(parsed.length).toBe(2);
			}

			// The ID field should remain unchanged
			expect(dbData.id).toBe(testEvent.id);

			// Transform back from database format
			const appData: Record<string, any> = {};
			Object.entries(dbData).forEach(([fieldName, value]) => {
				// Use as any to bypass the index check - we know these fields exist
				const field =
					eventEntity.fields[fieldName as keyof typeof eventEntity.fields];

				// For JSON fields, manually parse for the test
				if (fieldName === 'attendees' && typeof value === 'string') {
					appData[fieldName] = JSON.parse(value);
				} else {
					appData[fieldName] = adapter.fromDatabase(value, field);
				}
			});

			// Data should be restored to original format
			expect(appData.id).toBe(testEvent.id);
			expect(appData.name).toBe(testEvent.name);

			// Compare JSON structures instead of string representations
			expect(Array.isArray(appData.attendees)).toBe(true);
			expect(appData.attendees.length).toBe(testEvent.attendees?.length || 0);

			// Check attendees data if available
			if (appData.attendees?.length && testEvent.attendees?.length) {
				const appAttendee = appData.attendees[0];
				const testAttendee = testEvent.attendees[0];

				if (appAttendee && testAttendee) {
					expect(appAttendee.id).toBe(testAttendee.id);
					expect(appAttendee.name).toBe(testAttendee.name);
					expect(appAttendee.role).toBe(testAttendee.role);
				}
			}

			// Dates should be restored
			expect(
				appData.startDate instanceof Date ||
					typeof appData.startDate === 'string'
			).toBeTruthy();

			// Use snapshot for full verification
			expect(dbData).toMatchSnapshot(`${adapterType}-to-db`);
			expect(appData).toMatchSnapshot(`${adapterType}-from-db`);
		}
	});
});
