import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import withCreatedAt from '../../../mixins/created-at';
import { type InsertObjectOrList, createModel } from '../../../model';
import {
	type DB,
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../../fixtures/migration';

describe('integration: createdAt mixin', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should automatically set createdAt on insert', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const UserWithCreatedAt = withCreatedAt(UserModel, 'createdAt');

		const user = await UserWithCreatedAt.insertInto()
			.values({
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				followersCount: 0,
				status: 'active',
				updatedAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		expect(user.createdAt).toBeDefined();
		expect(
			user.createdAt instanceof Date || typeof user.createdAt === 'string'
		).toBe(true);
	});

	it('should handle batch inserts with createdAt', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const UserWithCreatedAt = withCreatedAt(UserModel, 'createdAt');

		const users = await UserWithCreatedAt.insertInto()
			.values([
				{
					email: 'user1@example.com',
					name: 'User One',
					username: 'userone',
					password: 'password123',
					followersCount: 0,
					status: 'active',
					updatedAt: toSqliteDate(new Date()),
				},
				{
					email: 'user2@example.com',
					name: 'User Two',
					username: 'usertwo',
					password: 'password123',
					followersCount: 0,
					status: 'active',
					updatedAt: toSqliteDate(new Date()),
				},
			])
			.returningAll()
			.execute();

		expect(users).toHaveLength(2);
		users.forEach((user) => {
			expect(user.createdAt).toBeDefined();
			expect(
				user.createdAt instanceof Date || typeof user.createdAt === 'string'
			).toBe(true);
		});
	});

	it('should preserve existing createdAt values', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const UserWithCreatedAt = withCreatedAt(UserModel, 'createdAt');

		const existingDate = new Date('2023-01-01').toISOString();

		const user = await UserWithCreatedAt.insertInto()
			.values({
				email: 'test@example.com',
				name: 'Test User',
				username: 'testuser',
				password: 'password123',
				followersCount: 0,
				status: 'active',
				createdAt: existingDate,
				updatedAt: toSqliteDate(new Date()),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		expect(user.createdAt).toBe(existingDate);
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

		const UserWithBoth = withCreatedAt(UserWithStatus, 'createdAt');

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
		expect(user.createdAt).toBeDefined();
		expect(user.status).toBe('processed');
	});
});
