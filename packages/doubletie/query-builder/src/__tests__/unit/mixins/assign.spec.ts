import type { Selectable } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import withAssign from '../../../mixins/assign';
import type { ModelFunctions } from '../../../model';
import type { DB } from '../../fixtures/migration';

// Define a type for a user record
type UserRecord = Selectable<DB['users']>;

describe('unit: assign mixin', () => {
	let mockModel: ModelFunctions<DB, 'users', 'id'>;
	let modelWithAssign: ReturnType<typeof withAssign<DB, 'users', 'id'>>;

	beforeEach(() => {
		// Create base mock model
		mockModel = {
			table: 'users',
			id: 'id',
		} as any;

		// Apply mixin
		modelWithAssign = withAssign(mockModel);
	});

	describe('assign', () => {
		it('should assign data to the model instance', () => {
			// Create a model instance with some initial data
			const instance = {
				...modelWithAssign,
				id: '1',
				name: 'Original Name',
				email: 'original@example.com',
			};

			// Data to assign
			const data = {
				name: 'Updated Name',
				email: 'updated@example.com',
				status: 'active',
				followersCount: 10,
				username: 'updatedusername',
				password: 'updatedpassword',
				updatedAt: new Date(),
				createdAt: new Date(),
				id: '1',
			};

			// Call assign method
			const result = instance.assign(data);

			// Verify the result
			expect(result).toEqual({
				...instance,
				...data,
			});

			// Ensure original instance is not modified (immutability)
			expect(instance.name).toBe('Original Name');
			expect(instance.email).toBe('original@example.com');
			expect(instance).not.toHaveProperty('status');
		});

		it('should handle null or undefined data gracefully', () => {
			// Create a model instance with some initial data
			const instance = {
				...modelWithAssign,
				id: '1',
				name: 'Original Name',
				email: 'original@example.com',
			};

			// Call assign method with null
			const resultWithNull = instance.assign(null as any);

			// Verify the result with null
			expect(resultWithNull).toEqual({
				...instance,
			});

			// Call assign method with undefined
			const resultWithUndefined = instance.assign(undefined);

			// Verify the result with undefined
			expect(resultWithUndefined).toEqual({
				...instance,
			});
		});

		it('should override existing properties with new values', () => {
			// Create a model instance with some initial data
			const instance = {
				...modelWithAssign,
				id: '1',
				name: 'Original Name',
				email: 'original@example.com',
				status: 'inactive',
				followersCount: 0,
			};

			// Data to assign (partially overlapping with instance)
			const data = {
				name: 'Updated Name',
				status: 'active',
				followersCount: 10,
				username: 'updatedusername',
				password: 'updatedpassword',
				updatedAt: new Date(),
				createdAt: new Date(),
				email: 'original@example.com',
				id: '1',
			};

			// Call assign method
			const result = instance.assign(data);

			// Verify the result
			expect(result).toEqual({
				...instance,
				...data,
			});

			// Check specific properties
			expect(result.id).toBe('1');
			expect(result.name).toBe('Updated Name');
			expect(result.email).toBe('original@example.com');
			expect(result.status).toBe('active');
			expect(result.followersCount).toBe(10);
		});

		it('should add new properties that did not exist on the instance', () => {
			// Create a model instance with some initial data
			const instance = {
				...modelWithAssign,
				id: '1',
				name: 'Original Name',
			};

			// Data to assign with new properties
			const data = {
				email: 'new@example.com',
				status: 'active',
				followersCount: 5,
				username: 'updatedusername',
				password: 'updatedpassword',
				updatedAt: new Date(),
				createdAt: new Date(),
				name: 'Original Name',
				id: '1',
			};

			// Call assign method
			const result = instance.assign(data);

			// Verify the result
			expect(result).toEqual({
				...instance,
				...data,
			});

			// Check that new properties were added
			expect(result.email).toBe('new@example.com');
			expect(result.status).toBe('active');
			expect(result.followersCount).toBe(5);
		});
	});
});
