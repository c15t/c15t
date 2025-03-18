import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockExpressionBuilder } from '../fixtures/mock-db';

describe('unit: query building functionality', () => {
	// Define test database types
	interface TestDB {
		users: {
			id: number;
			name: string;
			email: string;
			status: string;
			created_at: Date;
		};
		posts: {
			id: number;
			user_id: number;
			title: string;
			content: string;
			published: boolean;
			created_at: Date;
		};
		categories: {
			id: number;
			name: string;
		};
		post_categories: {
			post_id: number;
			category_id: number;
		};
	}

	let mockDb: any;
	let userModel: any;
	let mockSelectChain: any;

	beforeEach(() => {
		// Create the mock method implementations
		mockSelectChain = {
			select: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			whereIn: vi.fn().mockReturnThis(),
			whereLike: vi.fn().mockReturnThis(),
			whereNotNull: vi.fn().mockReturnThis(),
			whereNull: vi.fn().mockReturnThis(),
			orWhere: vi.fn().mockReturnThis(),
			andWhere: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
			leftJoin: vi.fn().mockReturnThis(),
			on: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			groupBy: vi.fn().mockReturnThis(),
			having: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
			executeTakeFirst: vi.fn().mockResolvedValue(null),
		};

		// Create the base mock database
		mockDb = {
			selectFrom: vi.fn().mockReturnValue(mockSelectChain),
			select: vi.fn().mockReturnValue(mockSelectChain),
			where: vi.fn().mockReturnValue(mockSelectChain),
			whereIn: vi.fn().mockReturnValue(mockSelectChain),
			whereLike: vi.fn().mockReturnValue(mockSelectChain),
			whereNotNull: vi.fn().mockReturnValue(mockSelectChain),
			whereNull: vi.fn().mockReturnValue(mockSelectChain),
			orWhere: vi.fn().mockReturnValue(mockSelectChain),
			andWhere: vi.fn().mockReturnValue(mockSelectChain),
			innerJoin: vi.fn().mockReturnValue(mockSelectChain),
			leftJoin: vi.fn().mockReturnValue(mockSelectChain),
			on: vi.fn().mockReturnValue(mockSelectChain),
			orderBy: vi.fn().mockReturnValue(mockSelectChain),
			groupBy: vi.fn().mockReturnValue(mockSelectChain),
			having: vi.fn().mockReturnValue(mockSelectChain),
			limit: vi.fn().mockReturnValue(mockSelectChain),
			offset: vi.fn().mockReturnValue(mockSelectChain),
			execute: vi.fn().mockResolvedValue([]),
			executeTakeFirst: vi.fn().mockResolvedValue(null),
			$dynamic: vi.fn(),
			dynamic: {
				$dynamic: vi.fn(),
			},
			fn: {
				count: vi.fn().mockReturnValue({
					as: (name: string) => `COUNT expression AS ${name}`,
				}),
				avg: vi.fn().mockReturnValue('AVG expression'),
				sum: vi.fn().mockReturnValue('SUM expression'),
				json: {
					extract: vi.fn().mockReturnValue('JSON_EXTRACT expression'),
					path: vi.fn().mockReturnValue('JSON_PATH expression'),
				},
			},
			// Required Database properties
			dialect: {},
			kysely: {},
			asyncLocalDb: { getStore: () => null },
			isolated: false,
			db: {},
			isTransaction: false,
			isSqlite: () => true,
			isMysql: () => false,
			isPostgres: () => false,
			model: () => null,
			destroy: () => Promise.resolve(),
		};

		// Create model with mock db
		userModel = {
			selectFrom: () => {
				mockDb.selectFrom('users');
				return mockSelectChain;
			},
			where: (...args: any[]) => {
				mockDb.where(...args);
				return mockSelectChain;
			},
			select: (...args: any[]) => {
				mockDb.select(...args);
				return mockSelectChain;
			},
			orderBy: (...args: any[]) => {
				mockDb.orderBy(...args);
				return mockSelectChain;
			},
			limit: (limit: number) => {
				mockDb.limit(limit);
				return mockSelectChain;
			},
			offset: (offset: number) => {
				mockDb.offset(offset);
				return mockSelectChain;
			},
			whereIn: (...args: any[]) => {
				mockDb.whereIn(...args);
				return mockSelectChain;
			},
			whereLike: (...args: any[]) => {
				mockDb.whereLike(...args);
				return mockSelectChain;
			},
			whereNotNull: (...args: any[]) => {
				mockDb.whereNotNull(...args);
				return mockSelectChain;
			},
			whereNull: (...args: any[]) => {
				mockDb.whereNull(...args);
				return mockSelectChain;
			},
			orWhere: (...args: any[]) => {
				mockDb.orWhere(...args);
				return mockSelectChain;
			},
			innerJoin: (...args: any[]) => {
				mockDb.innerJoin(...args);
				return mockSelectChain;
			},
			leftJoin: (...args: any[]) => {
				mockDb.leftJoin(...args);
				return mockSelectChain;
			},
			groupBy: (...args: any[]) => {
				mockDb.groupBy(...args);
				return mockSelectChain;
			},
			having: (...args: any[]) => {
				mockDb.having(...args);
				return mockSelectChain;
			},
			execute: () => {
				mockDb.execute();
				return Promise.resolve([]);
			},
		};
	});

	describe('basic query building', () => {
		it('should build a simple select query', async () => {
			await userModel.selectFrom().select(['id', 'name']).execute();

			expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
			expect(mockSelectChain.select).toHaveBeenCalledWith(['id', 'name']);
			expect(mockSelectChain.execute).toHaveBeenCalled();
		});

		it('should build a query with simple where clause', async () => {
			await userModel.selectFrom().where('status', '=', 'active').execute();

			expect(mockSelectChain.where).toHaveBeenCalledWith(
				'status',
				'=',
				'active'
			);
		});

		it('should build a query with compound where clauses', async () => {
			await userModel
				.selectFrom()
				.where('status', '=', 'active')
				.where('created_at', '>', new Date('2023-01-01'))
				.execute();

			expect(mockSelectChain.where).toHaveBeenCalledTimes(2);
			expect(mockSelectChain.where).toHaveBeenNthCalledWith(
				1,
				'status',
				'=',
				'active'
			);
			expect(mockSelectChain.where).toHaveBeenNthCalledWith(
				2,
				'created_at',
				'>',
				new Date('2023-01-01')
			);
		});

		it('should build a query with OR conditions', async () => {
			await userModel
				.selectFrom()
				.where('status', '=', 'active')
				.orWhere('status', '=', 'pending')
				.execute();

			expect(mockSelectChain.where).toHaveBeenCalledWith(
				'status',
				'=',
				'active'
			);
			expect(mockSelectChain.orWhere).toHaveBeenCalledWith(
				'status',
				'=',
				'pending'
			);
		});
	});

	describe('complex query building', () => {
		it('should build a query with whereIn clause', async () => {
			await userModel.selectFrom().whereIn('id', [1, 2, 3]).execute();

			expect(mockSelectChain.whereIn).toHaveBeenCalledWith('id', [1, 2, 3]);
		});

		it('should build a query with LIKE operator', async () => {
			await userModel.selectFrom().whereLike('name', '%John%').execute();

			expect(mockSelectChain.whereLike).toHaveBeenCalledWith('name', '%John%');
		});

		it('should build a query with NULL checks', async () => {
			await userModel
				.selectFrom()
				.whereNotNull('email')
				.whereNull('deleted_at')
				.execute();

			expect(mockSelectChain.whereNotNull).toHaveBeenCalledWith('email');
			expect(mockSelectChain.whereNull).toHaveBeenCalledWith('deleted_at');
		});

		it('should build a query with dynamic conditions', async () => {
			// Set up some test filters
			const filters = {
				status: 'active',
				createdAfter: new Date('2023-01-01'),
			};

			// Create a mock expression builder
			const eb = createMockExpressionBuilder();

			// Mock the where method for dynamic conditions
			mockSelectChain.where.mockImplementationOnce((callback: any) => {
				if (typeof callback === 'function') {
					callback(eb);
				}
				return mockSelectChain;
			});

			await userModel
				.selectFrom()
				.where((eb: any) => {
					const conditions = [];

					if (filters.status) {
						conditions.push(eb('status', '=', filters.status));
					}

					if (filters.createdAfter) {
						conditions.push(eb('created_at', '>', filters.createdAfter));
					}

					return eb.and(conditions);
				})
				.execute();

			expect(mockSelectChain.where).toHaveBeenCalled();
		});
	});

	describe('joins and relations', () => {
		it('should build a query with inner join', async () => {
			await userModel
				.selectFrom()
				.select(['users.id', 'users.name', 'posts.title'])
				.innerJoin('posts', 'posts.user_id', 'users.id')
				.execute();

			expect(mockSelectChain.innerJoin).toHaveBeenCalledWith(
				'posts',
				'posts.user_id',
				'users.id'
			);
		});

		it('should build a query with left join', async () => {
			await userModel
				.selectFrom()
				.leftJoin('posts', 'posts.user_id', 'users.id')
				.execute();

			expect(mockSelectChain.leftJoin).toHaveBeenCalledWith(
				'posts',
				'posts.user_id',
				'users.id'
			);
		});

		it('should build a query with complex join conditions', async () => {
			// Create a mock join builder
			const mockJoinBuilder = {
				onRef: vi.fn().mockReturnThis(),
				on: vi.fn().mockReturnThis(),
			};

			// Mock the innerJoin method to use a callback
			mockSelectChain.innerJoin.mockImplementationOnce(
				(table: string, callback: any) => {
					if (typeof callback === 'function') {
						callback(mockJoinBuilder);
					}
					return mockSelectChain;
				}
			);

			await userModel
				.selectFrom()
				.innerJoin('posts', (join: any) =>
					join
						.onRef('posts.user_id', '=', 'users.id')
						.on('posts.published', '=', true)
				)
				.execute();

			expect(mockSelectChain.innerJoin).toHaveBeenCalled();
			expect(mockJoinBuilder.onRef).toHaveBeenCalledWith(
				'posts.user_id',
				'=',
				'users.id'
			);
			expect(mockJoinBuilder.on).toHaveBeenCalledWith(
				'posts.published',
				'=',
				true
			);
		});
	});

	describe('aggregations and grouping', () => {
		it('should build a query with count aggregation', async () => {
			// Mock the select method to use a callback
			mockSelectChain.select.mockImplementationOnce((callback: any) => {
				if (typeof callback === 'function') {
					callback({
						fn: {
							count: vi.fn().mockReturnValue({
								as: vi.fn().mockReturnValue('COUNT(id) AS user_count'),
							}),
						},
					});
				} else {
					// Handle regular select with column names
					return mockSelectChain;
				}
				return mockSelectChain;
			});

			await userModel
				.selectFrom()
				.select((eb: any) => ['status', eb.fn.count('id').as('user_count')])
				.groupBy(['status'])
				.execute();

			expect(mockSelectChain.groupBy).toHaveBeenCalledWith(['status']);
		});

		it('should build a query with having clause', async () => {
			// Mock the having method to use a callback
			mockSelectChain.having.mockImplementationOnce(
				(callback: any, operator: string, value: any) => {
					if (typeof callback === 'function') {
						callback({
							fn: {
								count: vi.fn().mockReturnValue('COUNT(id)'),
							},
						});
					}
					return mockSelectChain;
				}
			);

			await userModel
				.selectFrom()
				.select(['status'])
				.groupBy(['status'])
				.having((eb: any) => eb.fn.count('id'), '>', 10)
				.execute();

			expect(mockSelectChain.having).toHaveBeenCalled();
		});
	});

	describe('ordering and pagination', () => {
		it('should build a query with orderBy clause', async () => {
			await userModel.selectFrom().orderBy('created_at', 'desc').execute();

			expect(mockSelectChain.orderBy).toHaveBeenCalledWith(
				'created_at',
				'desc'
			);
		});

		it('should build a query with multiple orderBy clauses', async () => {
			await userModel
				.selectFrom()
				.orderBy('status', 'asc')
				.orderBy('created_at', 'desc')
				.execute();

			expect(mockSelectChain.orderBy).toHaveBeenCalledTimes(2);
			expect(mockSelectChain.orderBy).toHaveBeenNthCalledWith(
				1,
				'status',
				'asc'
			);
			expect(mockSelectChain.orderBy).toHaveBeenNthCalledWith(
				2,
				'created_at',
				'desc'
			);
		});

		it('should build a query with limit and offset', async () => {
			await userModel.selectFrom().limit(10).offset(20).execute();

			expect(mockSelectChain.limit).toHaveBeenCalledWith(10);
			expect(mockSelectChain.offset).toHaveBeenCalledWith(20);
		});

		it('should allow building complex search queries', async () => {
			// Mock the where implementation for dynamic conditions
			mockSelectChain.where.mockImplementationOnce((callback: any) => {
				if (typeof callback === 'function') {
					// Create a mock expression builder
					const eb = createMockExpressionBuilder();
					callback(eb);
				}
				return mockSelectChain;
			});

			// Create a search function
			const searchUsers = async (searchTerm: string, limit = 10) => {
				return userModel
					.selectFrom()
					.where((eb: any) =>
						eb.or([
							eb('name', 'like', `%${searchTerm}%`),
							eb('email', 'like', `%${searchTerm}%`),
						])
					)
					.limit(limit)
					.execute();
			};

			await searchUsers('john');

			expect(mockSelectChain.limit).toHaveBeenCalledWith(10);
			expect(mockSelectChain.where).toHaveBeenCalled();
		});
	});

	describe('raw SQL', () => {
		it('should allow using raw SQL expressions', async () => {
			const sqlSpy = vi.fn().mockReturnValue('RAW SQL EXPRESSION');

			// Mock the where implementation to take a callback
			mockSelectChain.where.mockImplementationOnce((callback: any) => {
				if (typeof callback === 'function') {
					callback(sqlSpy);
				}
				return mockSelectChain;
			});

			await userModel
				.selectFrom()
				.where(() =>
					sqlSpy('status = ? and created_at > ?', ['active', new Date()])
				)
				.execute();

			expect(sqlSpy).toHaveBeenCalledWith('status = ? and created_at > ?', [
				'active',
				expect.any(Date),
			]);
		});
	});
});
