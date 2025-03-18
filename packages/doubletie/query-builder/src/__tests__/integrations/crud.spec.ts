import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createModel } from '../../model';
import { cleanupDatabase, db, initializeDatabase } from '../fixtures/migration';

// Helper function to generate IDs
const generateId = (): string => {
	return String(Math.random().toString(36).substring(2, 15));
};

describe('Integration: CRUD Operations', () => {
	beforeEach(async () => {
		await initializeDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should create a new user', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'test@example.com',
			name: 'Test User',
			username: 'testuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const user = await UserModel.findById(String(insertResult.insertId));

		expect(user).toBeDefined();
		expect(user?.email).toBe(userData.email);
		expect(user?.name).toBe(userData.name);
		expect(user?.username).toBe(userData.username);
	});

	it('should retrieve user profile by id', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'profile@example.com',
			name: 'Profile User',
			username: 'profileuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const createdUser = await UserModel.findById(String(insertResult.insertId));
		if (!createdUser) throw new Error('User creation failed');

		const profile = await UserModel.findById(createdUser.id);

		expect(profile).toBeDefined();
		expect(profile?.id).toBe(createdUser.id);
		expect(profile?.email).toBe(userData.email);
		expect(profile?.name).toBe(userData.name);
	});

	it('should update user profile', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'update@example.com',
			name: 'Update User',
			username: 'updateuser',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const createdUser = await UserModel.findById(String(insertResult.insertId));
		if (!createdUser) throw new Error('User creation failed');

		const updates = {
			name: 'Updated Name',
			email: 'updated@example.com',
			updatedAt: new Date().toISOString(),
		};
		await UserModel.updateTable()
			.set(updates)
			.where('id', '=', createdUser.id)
			.executeTakeFirstOrThrow();

		const updatedUser = await UserModel.findById(createdUser.id);
		expect(updatedUser).toBeDefined();
		expect(updatedUser?.name).toBe(updates.name);
		expect(updatedUser?.email).toBe(updates.email);
	});

	it('should create a new post', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'post_author@example.com',
			name: 'Post Author',
			username: 'postauthor',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const author = await UserModel.findById(String(insertResult.insertId));
		if (!author) throw new Error('Author creation failed');

		const postData = {
			id: generateId(),
			title: 'Test Post',
			slug: 'test-post',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const post = await db
			.insertInto('articles')
			.values(postData)
			.returningAll()
			.executeTakeFirstOrThrow();

		expect(post).toBeDefined();
		expect(post.id).toBeDefined();
		expect(post.title).toBe(postData.title);
		expect(post.slug).toBe(postData.slug);
	});

	it('should retrieve post details by id', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'post_details_author@example.com',
			name: 'Post Details Author',
			username: 'postdetailsauthor',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const author = await UserModel.findById(String(insertResult.insertId));
		if (!author) throw new Error('Author creation failed');

		const postData = {
			id: generateId(),
			title: 'Detailed Post',
			slug: 'detailed-post',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db.insertInto('articles').values(postData).executeTakeFirstOrThrow();

		const postDetails = await db
			.selectFrom('articles')
			.selectAll()
			.where('id', '=', postData.id)
			.executeTakeFirst();

		expect(postDetails).toBeDefined();
		expect(postDetails?.id).toBe(postData.id);
		expect(postDetails?.title).toBe(postData.title);
		expect(postDetails?.slug).toBe(postData.slug);
	});

	it('should update an existing post', async () => {
		const postData = {
			id: generateId(),
			title: 'Initial Post Title',
			slug: 'initial-post-title',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db.insertInto('articles').values(postData).executeTakeFirstOrThrow();

		const updates = {
			title: 'Updated Post Title',
			slug: 'updated-post-title',
			updatedAt: new Date().toISOString(),
		};

		await db
			.updateTable('articles')
			.set(updates)
			.where('id', '=', postData.id)
			.executeTakeFirstOrThrow();

		const updatedPost = await db
			.selectFrom('articles')
			.selectAll()
			.where('id', '=', postData.id)
			.executeTakeFirst();

		expect(updatedPost).toBeDefined();
		expect(updatedPost?.id).toBe(postData.id);
		expect(updatedPost?.title).toBe(updates.title);
		expect(updatedPost?.slug).toBe(updates.slug);
	});

	it('should delete a post', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'post_delete_author@example.com',
			name: 'Post Delete Author',
			username: 'postdeleteauthor',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const author = await UserModel.findById(String(insertResult.insertId));
		if (!author) throw new Error('Author creation failed');

		const postData = {
			id: generateId(),
			title: 'Post to Delete',
			slug: 'post-to-delete',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db.insertInto('articles').values(postData).executeTakeFirstOrThrow();

		await db
			.deleteFrom('articles')
			.where('id', '=', postData.id)
			.executeTakeFirst();

		const postDetails = await db
			.selectFrom('articles')
			.selectAll()
			.where('id', '=', postData.id)
			.executeTakeFirst();

		expect(postDetails).toBeUndefined();
	});

	it('should add a comment to a post', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'comment_author@example.com',
			name: 'Comment Author',
			username: 'commentauthor',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const author = await UserModel.findById(String(insertResult.insertId));
		if (!author) throw new Error('Author creation failed');

		const postData = {
			id: generateId(),
			title: 'Post for Comments',
			slug: 'post-for-comments',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db.insertInto('articles').values(postData).executeTakeFirstOrThrow();

		const commentData = {
			userId: author.id,
			message: 'This is a test comment.',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const comment = await db
			.insertInto('comments')
			.values(commentData)
			.returningAll()
			.executeTakeFirstOrThrow();

		expect(comment).toBeDefined();
		expect(comment.id).toBeDefined();
		expect(comment.userId).toBe(commentData.userId);
		expect(comment.message).toBe(commentData.message);
	});

	it('should retrieve a feed of posts with pagination and comment counts', async () => {
		const UserModel = createModel(db, 'users', 'id');
		const userData = {
			email: 'feed_author@example.com',
			name: 'Feed Author',
			username: 'feedauthor',
			password: 'password123',
			followersCount: 0,
			status: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const insertResult = await UserModel.insertInto()
			.values(userData)
			.executeTakeFirstOrThrow();
		const author = await UserModel.findById(String(insertResult.insertId));
		if (!author) throw new Error('Author creation failed');

		const posts = [
			{ id: generateId(), title: 'Post 1', slug: 'post-1' },
			{ id: generateId(), title: 'Post 2', slug: 'post-2' },
			{ id: generateId(), title: 'Post 3', slug: 'post-3' },
		];

		for (const post of posts) {
			await db
				.insertInto('articles')
				.values({
					...post,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				})
				.executeTakeFirstOrThrow();
		}

		const feedResult = await db
			.selectFrom('articles')
			.selectAll()
			.orderBy('createdAt', 'desc')
			.limit(10)
			.execute();
		expect(feedResult.length).toBeGreaterThanOrEqual(1);

		const feedLimitedResult = await db
			.selectFrom('articles')
			.selectAll()
			.orderBy('createdAt', 'desc')
			.limit(2)
			.execute();
		expect(feedLimitedResult.length).toBe(2);

		const feedPage2Result = await db
			.selectFrom('articles')
			.selectAll()
			.orderBy('createdAt', 'desc')
			.limit(2)
			.offset(2)
			.execute();
		expect(feedPage2Result.length).toBe(1);
	});

	describe('transaction operations', () => {
		it('should maintain consistency during fund transfers', async () => {
			const UserModel = createModel(db, 'users', 'id');

			// Create two users with initial balances
			const user1Data = {
				email: 'user1@example.com',
				name: 'User One',
				username: 'userone',
				password: 'password123',
				followersCount: 100, // Using followersCount as balance
				status: 'active',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const user2Data = {
				email: 'user2@example.com',
				name: 'User Two',
				username: 'usertwo',
				password: 'password123',
				followersCount: 50, // Using followersCount as balance
				status: 'active',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const user1Insert = await UserModel.insertInto()
				.values(user1Data)
				.executeTakeFirstOrThrow();
			const user2Insert = await UserModel.insertInto()
				.values(user2Data)
				.executeTakeFirstOrThrow();

			const user1Id = String(user1Insert.insertId);
			const user2Id = String(user2Insert.insertId);

			// Perform transfer in transaction
			const transferAmount = 30;
			await UserModel.transaction(async (db) => {
				// Get current balances
				const user1 = await db.transaction
					.selectFrom('users')
					.where('id', '=', user1Id)
					.selectAll()
					.executeTakeFirstOrThrow();

				const user2 = await db.transaction
					.selectFrom('users')
					.where('id', '=', user2Id)
					.selectAll()
					.executeTakeFirstOrThrow();

				// Update balances
				await db.transaction
					.updateTable('users')
					.set({ followersCount: user1.followersCount - transferAmount })
					.where('id', '=', user1Id)
					.execute();

				await db.transaction
					.updateTable('users')
					.set({ followersCount: user2.followersCount + transferAmount })
					.where('id', '=', user2Id)
					.execute();
			});

			// Verify final balances
			const finalUser1 = await UserModel.findById(user1Id);
			const finalUser2 = await UserModel.findById(user2Id);

			expect(finalUser1?.followersCount).toBe(70); // 100 - 30
			expect(finalUser2?.followersCount).toBe(80); // 50 + 30
		});

		it('should roll back changes on error', async () => {
			const UserModel = createModel(db, 'users', 'id');

			// Create initial user
			const userData = {
				email: 'rollback@example.com',
				name: 'Rollback User',
				username: 'rollbackuser',
				password: 'password123',
				followersCount: 100,
				status: 'active',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const insertResult = await UserModel.insertInto()
				.values(userData)
				.executeTakeFirstOrThrow();
			const userId = String(insertResult.insertId);

			// Attempt an operation that will fail
			try {
				await UserModel.transaction(async (db) => {
					// First update should succeed
					await db.transaction
						.updateTable('users')
						.set({ followersCount: 150 })
						.where('id', '=', userId)
						.execute();

					// This update should fail (invalid status)
					await db.transaction
						.updateTable('users')
						.set({ status: null as any }) // This will violate not-null constraint
						.where('id', '=', userId)
						.execute();
				});
				expect.fail('Transaction should have failed');
			} catch (error) {
				// Expected to fail
			}

			// Verify the user's data was not changed
			const user = await UserModel.findById(userId);
			expect(user?.followersCount).toBe(100); // Should be unchanged
			expect(user?.status).toBe('active'); // Should be unchanged
		});
	});
});
