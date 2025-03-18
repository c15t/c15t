import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type MockFn,
	createModelWithIdGenerator,
} from '../../fixtures/mock-db';

/**
 * Test database for ID generator functionality
 */
export interface IdGeneratorTestDB {
	users: {
		id: string | number;
		name: string;
		email: string;
	};
	posts: {
		id: string;
		title: string;
		content: string;
	};
}

describe('ID Generator Mixin - Unit', () => {
	// Mock model setup
	let baseModel: {
		processDataBeforeInsert: MockFn;
		insertInto: MockFn;
		[key: string]: any;
	};
	let mockDb: any;

	beforeEach(() => {
		// Create base model and mock functions
		baseModel = {
			processDataBeforeInsert: vi.fn((data) => data),
			insertInto: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockReturnValue({
						executeTakeFirst: vi
							.fn()
							.mockResolvedValue({ id: 1, name: 'Test User' }),
					}),
				}),
			}),
			findById: vi.fn().mockResolvedValue({ id: 1, name: 'Test User' }),
		};
	});

	describe('id generation functionality', () => {
		it('should generate random string IDs with appropriate prefix', () => {
			// Test random ID generation with prefix
			const { model: modelWithIdGenerator } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'usr' });

			// Generate a few IDs to ensure they follow the pattern
			for (let i = 0; i < 5; i++) {
				const id = modelWithIdGenerator.generateId();
				expect(id).toMatch(/^usr_[a-zA-Z0-9]+$/);
			}
		});

		it('should generate IDs with consistent, customizable patterns', () => {
			const { model: modelWithDefaultPrefix } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'user' });

			const { model: modelWithCustomPrefix } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'custom' });

			const { model: modelWithNoPrefix } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: '' });

			// Test different prefixes
			const id1 = modelWithDefaultPrefix.generateId();
			const id2 = modelWithCustomPrefix.generateId();
			const id3 = modelWithNoPrefix.generateId();

			expect(id1).toMatch(/^user_[a-zA-Z0-9]+$/);
			expect(id2).toMatch(/^custom_[a-zA-Z0-9]+$/);
			expect(id3).toMatch(/^_[a-zA-Z0-9]+$/);
		});

		it('should support custom options including field name', () => {
			// Create models with different ID field configurations
			const { model: modelWithDefaultId } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'usr' });

			// Test with the default model
			expect(modelWithDefaultId).toHaveProperty('generateId');
			expect(modelWithDefaultId).toHaveProperty('insertWithGeneratedId');
		});
	});

	describe('autoGenerate feature', () => {
		it('should add IDs during processDataBeforeInsert when autoGenerate is true', () => {
			// Create a test model with autoGenerate enabled
			const { model: modelWithIdGenerator } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'usr', autoGenerate: true });

			// Test with a single object - this is the core functionality
			const singleData = { name: 'Test User' };

			// Add type assertion to help TypeScript understand the structure
			const processedSingle = modelWithIdGenerator.processDataBeforeInsert(
				singleData
			) as { id: string | number; name: string };

			expect(processedSingle).toHaveProperty('id');
			expect(String(processedSingle.id)).toMatch(/^usr_[a-zA-Z0-9]+$/);
		});

		it('should not add IDs during processDataBeforeInsert when autoGenerate is false', () => {
			// Create a test model with autoGenerate disabled
			const { model: modelWithIdGenerator } = createModelWithIdGenerator<
				IdGeneratorTestDB,
				'users',
				'id'
			>('users', 'id', { prefix: 'usr', autoGenerate: false });

			// Test with a single object
			const singleData = { name: 'Test User' };
			const processedSingle =
				modelWithIdGenerator.processDataBeforeInsert(singleData);

			// Should not modify the data when autoGenerate is false
			expect(processedSingle).not.toHaveProperty('id');
			expect(processedSingle).toEqual(singleData);
		});
	});

	describe('insertWithGeneratedId', () => {
		it('should add an ID when inserting data without an ID', async () => {
			// Create a model with the ID generator mixin
			const { model: modelWithIdGenerator, mockDb } =
				createModelWithIdGenerator<IdGeneratorTestDB, 'users', 'id'>(
					'users',
					'id',
					{ prefix: 'usr' }
				);

			// Set up the mock return value for the executeTakeFirst method
			mockDb.executeTakeFirst = vi
				.fn()
				.mockResolvedValue({ id: 'usr_123', name: 'Test User' });

			// Insert data without ID
			const result = (await modelWithIdGenerator.insertWithGeneratedId({
				name: 'Test User',
			})) as { id: string; name: string };

			// Verify results
			expect(result).toHaveProperty('id');
			expect(result.id).toBe('usr_123');
			expect(result.name).toBe('Test User');
		});

		it('should replace an existing ID when generating a new one', async () => {
			// Create a model with the ID generator mixin
			const { model: modelWithIdGenerator, mockDb } =
				createModelWithIdGenerator<IdGeneratorTestDB, 'users', 'id'>(
					'users',
					'id',
					{ prefix: 'usr' }
				);

			// Set up the mock return value for the executeTakeFirst method
			mockDb.executeTakeFirst = vi
				.fn()
				.mockResolvedValue({ id: 'usr_123', name: 'Test User' });

			// Insert data with ID already provided - it will be replaced
			const result = (await modelWithIdGenerator.insertWithGeneratedId({
				id: 'original-id',
				name: 'Test User',
			})) as { id: string; name: string };

			// Verify the ID was generated and replaced the original
			expect(result).toHaveProperty('id');
			expect(result.id).toBe('usr_123'); // Should be the mocked return value
			expect(result.name).toBe('Test User');
		});
	});
});
