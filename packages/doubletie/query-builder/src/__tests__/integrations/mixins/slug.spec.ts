import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type SlugModelType, withSlug } from '../../../mixins/slug';
import { createModel } from '../../../model';
import {
	type DB,
	cleanupDatabase,
	db,
	initializeDatabase,
	toSqliteDate,
} from '../../fixtures/migration';

describe('integration: slug mixin', () => {
	let PostModel: SlugModelType<DB, 'articles', 'id'>;

	beforeEach(async () => {
		await initializeDatabase();
		const baseModel = createModel(db, 'articles', 'id');
		const slugMixin = withSlug(baseModel, 'slug', 'title');
		if (typeof slugMixin === 'function') {
			throw new Error('Expected SlugModelType, got function');
		}
		PostModel = slugMixin;
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should generate a slug during insertion', async () => {
		const post = await PostModel.insertWithSlug({
			title: 'Test Integration Post',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		expect(post).toBeDefined();
		expect(post.id).toBeDefined();
		expect(post.title).toBe('Test Integration Post');
		expect(post.slug).toBe('test-integration-post');
	});

	it('should find a record by slug', async () => {
		// Insert a post
		const inserted = await PostModel.insertWithSlug({
			title: 'Findable Post',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		// Find by slug
		const found = await PostModel.findBySlug('findable-post');

		expect(found).toBeDefined();
		expect(found?.id).toBe(inserted.id);
		expect(found?.title).toBe('Findable Post');
		expect(found?.slug).toBe('findable-post');
	});

	it('should handle insertIfNotExistsWithSlug for new record', async () => {
		const post = await PostModel.insertIfNotExistsWithSlug(
			{
				title: 'Unique Post',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
			'title'
		);

		expect(post).toBeDefined();
		if (!post) throw new Error('Post should be defined');
		expect(post.title).toBe('Unique Post');
		expect(post.slug).toBe('unique-post');

		// Try to insert again with same title
		const duplicatePost = await PostModel.insertIfNotExistsWithSlug(
			{
				title: 'Unique Post',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
			'title'
		);

		expect(duplicatePost).toBeDefined();
		if (!duplicatePost) throw new Error('Duplicate post should be defined');
		expect(duplicatePost.id).toBe(post.id);
		expect(duplicatePost.slug).toBe('unique-post');
	});

	it('should handle duplicate slugs with incremental suffixes', async () => {
		// Insert first post
		const post1 = await PostModel.insertWithSlug({
			title: 'Duplicate Title',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		// Insert second post with same title
		const post2 = await PostModel.insertWithSlug({
			title: 'Duplicate Title',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		// Insert third post with same title
		const post3 = await PostModel.insertWithSlug({
			title: 'Duplicate Title',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		expect(post1.slug).toBe('duplicate-title');
		expect(post2.slug).toBe('duplicate-title-2');
		expect(post3.slug).toBe('duplicate-title-3');
	});

	it('should upsert with slug generation', async () => {
		// First insert
		const initial = await PostModel.insertWithSlug({
			title: 'Initial Title',
			createdAt: toSqliteDate(new Date()),
			updatedAt: toSqliteDate(new Date()),
		});

		expect(initial.slug).toBe('initial-title');

		// Then upsert
		const updated = await PostModel.upsertWithSlug(
			{ column: 'id', value: initial.id },
			{
				title: 'Updated Title',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			}
		);

		expect(updated).toBeDefined();
		if (!updated) throw new Error('Updated post should be defined');
		expect(updated.title).toBe('Updated Title');
		expect(updated.slug).toBe('updated-title');
	});

	it('should handle batch inserts with slug generation', async () => {
		const posts = await PostModel.insertMany([
			{
				title: 'Post One',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
			{
				title: 'Post Two',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
			{
				title: 'Post Three',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
			{
				title: 'Post Four',
				slug: 'custom-slug',
				createdAt: toSqliteDate(new Date()),
				updatedAt: toSqliteDate(new Date()),
			},
		]);

		expect(posts).toHaveLength(4);
		expect(posts[0]?.slug).toBe('post-one');
		expect(posts[1]?.slug).toBe('post-two');
		expect(posts[2]?.slug).toBe('post-three');
		expect(posts[3]?.slug).toBe('custom-slug');

		// Verify all posts exist in database
		const dbPosts = await db
			.selectFrom('articles')
			.selectAll()
			.orderBy('id')
			.execute();

		expect(dbPosts).toHaveLength(4);
		expect(dbPosts[0]?.slug).toBe('post-one');
		expect(dbPosts[1]?.slug).toBe('post-two');
		expect(dbPosts[2]?.slug).toBe('post-three');
		expect(dbPosts[3]?.slug).toBe('custom-slug');
	});
});
