import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import withCursorable from '../../../mixins/cursorable';
import type { ModelFunctions } from '../../../model';
import type { DB } from '../../fixtures/migration';

describe('unit: cursorable mixin', () => {
	let mockModel: ModelFunctions<DB, 'users', 'id'>;
	let mockSelectFrom: any;
	let mockSelectAll: any;
	let mockWhere: any;
	let mockOrderBy: any;
	let mockLimit: any;
	let mockExecute: any;
	let mockExecuteTakeFirst: any;
	let modelWithCursorable: ReturnType<typeof withCursorable<DB, 'users', 'id'>>;
	let originalBufferFrom: typeof Buffer.from;

	beforeEach(() => {
		// Mock Buffer.from to avoid cursor parsing issues
		originalBufferFrom = Buffer.from;
		// @ts-ignore - Mocking Buffer.from
		Buffer.from = vi.fn().mockImplementation((str) => {
			return {
				toString: () =>
					JSON.stringify([
						{ column: 'createdAt', value: '2023-01-01' },
						{ column: 'id', value: '1' },
					]),
			};
		});

		// Setup mock chain for selectFrom
		mockExecute = vi.fn().mockResolvedValue([
			{ id: '1', name: 'User 1', createdAt: '2023-01-01' },
			{ id: '2', name: 'User 2', createdAt: '2023-01-02' },
		]);
		mockExecuteTakeFirst = vi.fn().mockResolvedValue({ count: 10 });

		// Create a chainable mock for limit
		mockLimit = vi.fn().mockImplementation(() => ({
			execute: mockExecute,
			executeTakeFirst: mockExecuteTakeFirst,
		}));

		// Create a chainable mock for orderBy
		mockOrderBy = vi.fn().mockImplementation(() => ({
			limit: mockLimit,
			orderBy: mockOrderBy,
			execute: mockExecute,
		}));

		// Mock the where function with a builder that has lit and eq methods
		const mockLit = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue(true),
		});

		const mockExpressionBuilder = {
			lit: mockLit,
			fn: {
				count: vi.fn().mockReturnValue({
					as: vi.fn().mockReturnValue('count'),
				}),
			},
		};

		mockWhere = vi.fn().mockImplementation((callback) => {
			// Call the callback with the mock expression builder
			if (typeof callback === 'function') {
				callback(mockExpressionBuilder);
			}
			return {
				orderBy: mockOrderBy,
				limit: mockLimit,
				execute: mockExecute,
				where: mockWhere,
				$getWhereBuilder: vi.fn().mockReturnValue({ status: 'active' }),
			};
		});

		mockSelectAll = vi.fn().mockReturnValue({
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			execute: mockExecute,
		});

		mockSelectFrom = vi.fn().mockReturnValue({
			selectAll: mockSelectAll,
			select: vi.fn().mockReturnValue({
				where: mockWhere,
				executeTakeFirst: mockExecuteTakeFirst,
			}),
		});

		// Create base mock model
		mockModel = {
			table: 'users',
			id: 'id',
			selectFrom: mockSelectFrom,
		} as any;

		// Apply mixin with configuration
		modelWithCursorable = withCursorable(mockModel, {
			sortKeys: {
				default: [
					['createdAt', { direction: 'desc', reversible: true }],
					['id', { direction: 'asc' }],
				],
				name: [
					['name', { direction: 'asc', reversible: true }],
					['id', { direction: 'asc' }],
				],
			},
			limit: 10,
			max: 100,
			sortKey: 'default',
		});
	});

	afterEach(() => {
		// Restore original Buffer.from
		Buffer.from = originalBufferFrom;
	});

	describe('getCursorableQuery', () => {
		it('should build a query with default options', () => {
			const query = modelWithCursorable.getCursorableQuery({});

			expect(mockSelectFrom).toHaveBeenCalled();
			expect(mockSelectAll).toHaveBeenCalled();
			expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
			expect(mockOrderBy).toHaveBeenCalledWith('id', 'asc');
			expect(mockLimit).toHaveBeenCalledWith(11); // Default limit (10) + 1 for oneMore
		});

		it('should build a query with custom limit', () => {
			modelWithCursorable.getCursorableQuery({ first: 20 });

			expect(mockLimit).toHaveBeenCalledWith(21); // Custom limit (20) + 1 for oneMore
		});

		it('should respect max limit', () => {
			modelWithCursorable.getCursorableQuery({ first: 200 });

			expect(mockLimit).toHaveBeenCalledWith(100); // Max limit (100)
		});

		it('should use specified sort key', () => {
			modelWithCursorable.getCursorableQuery({ sortKey: 'name' });

			// Check that orderBy was called with the correct sort key columns
			const orderByCalls = mockOrderBy.mock.calls;
			expect(orderByCalls).toContainEqual(['name', 'asc']);
			expect(orderByCalls).toContainEqual(['id', 'asc']);
		});

		it('should reverse order for backward pagination', () => {
			modelWithCursorable.getCursorableQuery({ last: 10 });

			// Check that orderBy was called with the reversed direction for reversible columns
			const orderByCalls = mockOrderBy.mock.calls;
			expect(orderByCalls).toContainEqual(['createdAt', 'asc']); // Reversed from 'desc'
			expect(orderByCalls).toContainEqual(['id', 'asc']); // Not reversible, stays 'asc'
		});

		it('should apply custom query function', () => {
			const customFunc = vi.fn().mockImplementation((qb) => qb);

			modelWithCursorable.getCursorableQuery({ func: customFunc });

			expect(customFunc).toHaveBeenCalled();
		});
	});

	describe('getCursorable', () => {
		it('should execute the query and return results', async () => {
			const result = await modelWithCursorable.getCursorable({});

			expect(mockExecute).toHaveBeenCalled();
			expect(result).toEqual([
				{ id: '1', name: 'User 1', createdAt: '2023-01-01' },
				{ id: '2', name: 'User 2', createdAt: '2023-01-02' },
			]);
		});
	});

	describe('getLazyCursorableConnection', () => {
		it('should return a connection object with nodes and pageInfo', async () => {
			const connection = await modelWithCursorable.getLazyCursorableConnection(
				{}
			);

			expect(connection).toHaveProperty('nodes');
			expect(connection).toHaveProperty('pageInfo');
			expect(connection.pageInfo).toHaveProperty('hasNextPage');
			expect(connection.pageInfo).toHaveProperty('hasPreviousPage');
			expect(connection.pageInfo).toHaveProperty('startCursor');
			expect(connection.pageInfo).toHaveProperty('endCursor');
		});

		it('should handle empty results', async () => {
			// Mock empty results for this test
			const originalMockExecute = mockExecute;
			mockExecute = vi.fn().mockResolvedValueOnce([]);

			const connection = await modelWithCursorable.getLazyCursorableConnection(
				{}
			);

			expect(connection.nodes).toEqual([]);
			expect(connection.pageInfo.startCursor).toBeNull();
			expect(connection.pageInfo.endCursor).toBeNull();
			expect(connection.pageInfo.hasNextPage).toBe(false);
			expect(connection.pageInfo.hasPreviousPage).toBe(false);

			// Restore the original mock
			mockExecute = originalMockExecute;
		});

		it('should handle forward pagination with after cursor', async () => {
			await modelWithCursorable.getLazyCursorableConnection({
				first: 10,
				after: 'valid-cursor',
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(Buffer.from).toHaveBeenCalled();
		});

		it('should handle backward pagination with before cursor', async () => {
			await modelWithCursorable.getLazyCursorableConnection({
				last: 10,
				before: 'valid-cursor',
			});

			expect(mockWhere).toHaveBeenCalled();
			expect(Buffer.from).toHaveBeenCalled();
			// Order should be reversed for backward pagination
			const orderByCalls = mockOrderBy.mock.calls;
			expect(orderByCalls).toContainEqual(['createdAt', 'asc']);
		});
	});

	describe('getCursorableConnection', () => {
		it('should include totalCount in the connection', async () => {
			const connection = await modelWithCursorable.getCursorableConnection({});

			expect(connection).toHaveProperty('totalCount', 10);
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});

		it('should skip totalCount when oneMore is false', async () => {
			const connection = await modelWithCursorable.getCursorableConnection({
				oneMore: false,
			});

			expect(connection).not.toHaveProperty('totalCount');
		});

		it('should apply custom function to count query', async () => {
			const customFunc = vi.fn().mockImplementation((qb) => {
				// Return a query builder with a $getWhereBuilder method
				qb.where = vi.fn().mockImplementation((callback) => {
					if (typeof callback === 'function') {
						callback({ status: 'active' });
					}
					return qb;
				});
				qb.$getWhereBuilder = vi.fn().mockReturnValue({ status: 'active' });
				return qb;
			});

			await modelWithCursorable.getCursorableConnection({ func: customFunc });

			expect(customFunc).toHaveBeenCalled();
			expect(mockExecuteTakeFirst).toHaveBeenCalled();
		});
	});
});
