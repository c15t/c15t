import { describe, expect, test, vi } from 'vitest';
import { toEntitySchemaDefinition } from '../utils/type-conversion';

// We need to test that specific modules can be imported independently
describe('Modular Imports', () => {
	test('Entity module can be imported independently', async () => {
		// Import only entity-related functionality
		const { defineEntity } = await import('../entity/entity');

		// Verify the import worked
		expect(defineEntity).toBeDefined();
		expect(typeof defineEntity).toBe('function');

		// Test basic functionality
		const simpleEntity = defineEntity({
			name: 'test',
			fields: {},
		});

		expect(simpleEntity).toBeDefined();
		expect(simpleEntity.name).toBe('test');
	});

	test('Schema fields module can be imported independently', async () => {
		// Import only schema field utilities
		const { createdAtField, emailField, stringField, uuidField } = await import(
			'../schema/fields'
		);

		// Verify imports worked
		expect(createdAtField).toBeDefined();
		expect(emailField).toBeDefined();
		expect(stringField).toBeDefined();
		expect(uuidField).toBeDefined();

		// Test basic functionality
		const idField = uuidField();
		const nameField = stringField({ required: true });
		const emailField1 = emailField({ required: true });
		const timestampField = createdAtField();

		expect(idField.type).toBe('string');
		expect(nameField.required).toBe(true);
		expect(emailField1.validator).toBeDefined();
		expect(timestampField.defaultValue).toBeDefined();
	});

	test('Database module can be imported independently', async () => {
		// Mock UUID for consistent snapshots
		vi.mock('uuid', () => ({
			v4: () => '123e4567-e89b-12d3-a456-426614174000',
		}));

		// Import only database-related functionality
		const { generateSQLForEntity, generateTableDefinition } = await import(
			'../db'
		);

		// Import dependencies needed to create an entity
		const { defineEntity } = await import('../entity/entity');
		const { uuidField, stringField, emailField, createdAtField } = await import(
			'../schema/fields'
		);

		// Create a test entity
		const userEntity = defineEntity({
			name: 'user',
			fields: {
				id: uuidField(),
				username: stringField({
					required: true,
					databaseHints: { maxSize: 50, unique: true },
				}),
				email: emailField({ required: true }),
				createdAt: createdAtField(),
			},
		});

		// Verify database functions work
		expect(generateSQLForEntity).toBeDefined();
		expect(generateTableDefinition).toBeDefined();

		const sqliteDef = generateTableDefinition(
			toEntitySchemaDefinition(userEntity),
			'sqlite'
		);

		// Basic verification of table definition
		expect(sqliteDef).toBeDefined();
		expect(sqliteDef.name).toBe('user');

		// Find columns by name
		const idColumn = sqliteDef.columns.find((col) => col.name === 'id');
		const usernameColumn = sqliteDef.columns.find(
			(col) => col.name === 'username'
		);
		const emailColumn = sqliteDef.columns.find((col) => col.name === 'email');

		expect(idColumn).toBeDefined();
		expect(usernameColumn).toBeDefined();
		expect(emailColumn).toBeDefined();

		// Create SQL for the entity
		const sqliteSQL = generateSQLForEntity(
			toEntitySchemaDefinition(userEntity),
			'sqlite'
		);
		const postgresSQL = generateSQLForEntity(
			toEntitySchemaDefinition(userEntity),
			'postgres'
		);

		// Basic SQL verification
		expect(sqliteSQL).toContain('CREATE TABLE');
		expect(sqliteSQL).toContain('user');
		expect(postgresSQL).toContain('CREATE TABLE');
		expect(postgresSQL).toContain('user');

		// Use snapshots for SQL validation
		expect(sqliteSQL).toMatchSnapshot('sqlite-sql');
		expect(postgresSQL).toMatchSnapshot('postgres-sql');
	});

	// Skip validation tests for now since they require more complex setup
	test.skip('Validation module can be imported independently', async () => {
		// This test is skipped until we can properly mock the validation dependencies
	});

	test.skip('A complete example works with modular imports', async () => {
		// This test is skipped until we can properly mock the validation dependencies
	});
});
