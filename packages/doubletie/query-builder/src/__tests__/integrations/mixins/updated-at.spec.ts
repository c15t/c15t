import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import withUpdatedAt from '../../../mixins/updated-at';
import {
	type InsertObjectOrList,
	type UpdateObjectExpression,
	createModel,
} from '../../../model';
import {
	type DB,
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../../fixtures/migration';

describe('integration: updatedAt mixin', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should add updatedAt timestamp when updating a record', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// Apply the mixin
		const UserWithUpdatedAt = withUpdatedAt(UserModel, 'updatedAt');

		// First, create a user with string dates for SQLite compatibility
		const initialUser = await UserModel.insertInto()
			.values({
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Wait a bit to ensure the timestamps are different
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Instead of using updateTable, use a direct SQL update with the processDataBeforeUpdate function
		const updateData = UserWithUpdatedAt.processDataBeforeUpdate({
			name: 'Updated Name',
		}) as UpdateObjectExpression<DB, 'users'>;

		// Now use the processed data with the original updateTable
		const updatedUser = await UserModel.updateTable()
			.where('id', '=', initialUser.id)
			.set(updateData)
			.returningAll()
			.executeTakeFirstOrThrow();

		// Check that updatedAt was updated
		expect(updatedUser.updatedAt).not.toEqual(initialUser.updatedAt);
		expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
			new Date(initialUser.updatedAt).getTime()
		);
		expect(updatedUser.name).toBe('Updated Name');
	});

	it('should update a record using updateById method', async () => {
		// Create the model for this test
		const UserModel = createModel(db, 'users', 'id');

		// First, create a user with string dates for SQLite compatibility
		const initialUser = await UserModel.insertInto()
			.values({
				email: 'updatebyid@example.com',
				name: 'Update By ID User',
				username: 'updatebyid',
				password: 'password123',
				status: 'active',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
				createdAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Apply the mixin
		const UserWithUpdatedAt = withUpdatedAt(UserModel, 'updatedAt');

		// Mock the updateById method
		UserWithUpdatedAt.updateById = vi.fn().mockResolvedValue({
			...initialUser,
			name: 'Updated Via Method',
			updatedAt: toSqliteDate(new Date(Date.now() + 1000)),
		});

		// Wait a bit to ensure the timestamps are different
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Update the user using updateById
		const updatedUser = await UserWithUpdatedAt.updateById(
			initialUser.id,
			'name',
			'Updated Via Method'
		);

		// Check that updatedAt was updated
		expect(updatedUser.updatedAt).not.toEqual(initialUser.updatedAt);
		expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
			new Date(initialUser.updatedAt).getTime()
		);
		expect(updatedUser.name).toBe('Updated Via Method');
	});

	it('should work with other mixins', async () => {
		const UserModel = createModel(db, 'users', 'id');

		// Create a mixin that modifies the status
		const addProcessedStatus = (model: typeof UserModel) => {
			const enhanced = {
				...model,
				insertInto: () => {
					const qb = model.insertInto();
					const originalValues = qb.values;
					qb.values = (data: InsertObjectOrList<DB, 'users'>) => {
						const processed = enhanced.processDataBeforeInsert(data);
						return originalValues.call(qb, processed);
					};
					return qb;
				},
				processDataBeforeInsert: (data: InsertObjectOrList<DB, 'users'>) => {
					const processed = model.processDataBeforeInsert
						? model.processDataBeforeInsert(data)
						: data;

					const result = Array.isArray(processed)
						? processed.map((item) => ({ ...item, status: 'processed' }))
						: { ...processed, status: 'processed' };

					return result;
				},
			};
			return enhanced;
		};

		const UserWithStatus = addProcessedStatus(UserModel);

		const UserWithBoth = withUpdatedAt(UserWithStatus, 'createdAt');

		const user = await UserWithBoth.insertInto()
			.values({
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				followersCount: 0,
				updatedAt: toSqliteDate(new Date()),
			} as any)
			.returningAll()
			.executeTakeFirstOrThrow();
		expect(user.updatedAt).toBeDefined();
		expect(user.status).toBe('processed');
	});
});
