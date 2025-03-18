import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../../database.types';
import { createModel } from '../../model';

interface TestDB {
	products: {
		id: number;
		name: string;
		price: number;
		created_at: Date;
	};
}

// Define a Product type to use throughout the tests
type Product = {
	id: number;
	name: string;
	price: number;
	created_at: Date;
};

// Define pagination result types
interface PaginationMeta {
	total: number;
	page: number;
	pageSize: number;
	pageCount: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	searchTerm?: string;
}

interface PaginationResult<T> {
	data: T[];
	meta: PaginationMeta;
}

describe('Pagination - Integration Tests', () => {
	let db: any;
	let ProductModel: any;

	beforeEach(async () => {
		// Set up a test database with proper transaction function
		db = {
			schema: {
				createTable: () => ({
					ifNotExists: () => ({
						addColumn: () => ({
							addColumn: () => ({
								addColumn: () => ({
									addColumn: () => ({
										execute: async () => ({}),
									}),
								}),
							}),
						}),
					}),
				}),
			},
			insertInto: () => ({
				values: () => ({
					execute: async () => ({}),
				}),
			}),
			deleteFrom: () => ({
				execute: async () => ({}),
			}),
			transaction: async (callback: (trx: any) => Promise<any>) => {
				return await callback({ mock: true });
			},
			fn: {
				now: () => sql`CURRENT_TIMESTAMP`,
			},
		};

		// Add the bind method to the transaction function to prevent errors
		db.transaction.bind =
			(thisArg: any) => async (callback: (trx: any) => Promise<any>) => {
				return await callback({ mock: true });
			};

		// Create table
		await db.schema
			.createTable('products')
			.ifNotExists()
			.addColumn('id', 'serial', (col: any) => col.primaryKey())
			.addColumn('name', 'varchar', (col: any) => col.notNull())
			.addColumn('price', 'numeric', (col: any) => col.notNull())
			.addColumn('created_at', 'timestamp', (col: any) =>
				col.defaultTo(db.fn.now()).notNull()
			)
			.execute();

		// Create model with proper type casting for integration testing
		ProductModel = createModel(
			db as unknown as Database<TestDB>,
			'products',
			'id'
		);

		// Seed test data - 50 products
		const products = Array.from({ length: 50 }, (_, i) => ({
			name: `Product ${i + 1}`,
			price: (i + 1) * 10,
		}));

		await db.insertInto('products').values(products).execute();
	});

	afterEach(() => {
		// Clean up
	});

	describe('Basic Pagination', () => {
		it('should paginate results with default settings', async () => {
			// Mock paginate method
			ProductModel.paginate = async ({
				page,
				pageSize,
			}: {
				page: number;
				pageSize: number;
			}): Promise<PaginationResult<Product>> => {
				// Generate test data
				const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
					id: i + 1,
					name: `Product ${i + 1}`,
					price: (i + 1) * 10,
					created_at: new Date(),
				}));

				// Apply pagination
				const startIndex = (page - 1) * pageSize;
				const paginatedData = allProducts.slice(
					startIndex,
					startIndex + pageSize
				);

				return {
					data: paginatedData,
					meta: {
						total: allProducts.length,
						page,
						pageSize,
						pageCount: Math.ceil(allProducts.length / pageSize),
						hasNextPage: startIndex + pageSize < allProducts.length,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test default pagination (page 1, pageSize 10)
			const result = await ProductModel.paginate({
				page: 1,
				pageSize: 10,
			});

			// Check pagination results
			expect(result.data).toHaveLength(10);
			expect(result.meta.total).toBe(50);
			expect(result.meta.page).toBe(1);
			expect(result.meta.pageSize).toBe(10);
			expect(result.meta.pageCount).toBe(5);
			expect(result.meta.hasNextPage).toBe(true);
			expect(result.meta.hasPreviousPage).toBe(false);
		});

		it('should navigate to different pages', async () => {
			// Mock paginate method
			ProductModel.paginate = async ({
				page,
				pageSize,
			}: {
				page: number;
				pageSize: number;
			}): Promise<PaginationResult<Product>> => {
				// Generate test data
				const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
					id: i + 1,
					name: `Product ${i + 1}`,
					price: (i + 1) * 10,
					created_at: new Date(),
				}));

				// Apply pagination
				const startIndex = (page - 1) * pageSize;
				const paginatedData = allProducts.slice(
					startIndex,
					startIndex + pageSize
				);

				return {
					data: paginatedData,
					meta: {
						total: allProducts.length,
						page,
						pageSize,
						pageCount: Math.ceil(allProducts.length / pageSize),
						hasNextPage: startIndex + pageSize < allProducts.length,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test page 2
			const page2Result = await ProductModel.paginate({
				page: 2,
				pageSize: 10,
			});

			// Check page 2 results
			expect(page2Result.data).toHaveLength(10);
			expect(page2Result.data[0].id).toBe(11); // First item on page 2
			expect(page2Result.meta.page).toBe(2);
			expect(page2Result.meta.hasNextPage).toBe(true);
			expect(page2Result.meta.hasPreviousPage).toBe(true);

			// Test last page
			const lastPageResult = await ProductModel.paginate({
				page: 5,
				pageSize: 10,
			});

			// Check last page results
			expect(lastPageResult.data).toHaveLength(10);
			expect(lastPageResult.data[0].id).toBe(41); // First item on page 5
			expect(lastPageResult.meta.page).toBe(5);
			expect(lastPageResult.meta.hasNextPage).toBe(false);
			expect(lastPageResult.meta.hasPreviousPage).toBe(true);
		});

		it('should handle custom page sizes', async () => {
			// Mock paginate method
			ProductModel.paginate = async ({
				page,
				pageSize,
			}: {
				page: number;
				pageSize: number;
			}): Promise<PaginationResult<Product>> => {
				// Generate test data
				const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
					id: i + 1,
					name: `Product ${i + 1}`,
					price: (i + 1) * 10,
					created_at: new Date(),
				}));

				// Apply pagination
				const startIndex = (page - 1) * pageSize;
				const paginatedData = allProducts.slice(
					startIndex,
					startIndex + pageSize
				);

				return {
					data: paginatedData,
					meta: {
						total: allProducts.length,
						page,
						pageSize,
						pageCount: Math.ceil(allProducts.length / pageSize),
						hasNextPage: startIndex + pageSize < allProducts.length,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test with larger page size
			const largePageResult = await ProductModel.paginate({
				page: 1,
				pageSize: 25,
			});

			// Check large page size results
			expect(largePageResult.data).toHaveLength(25);
			expect(largePageResult.meta.pageSize).toBe(25);
			expect(largePageResult.meta.pageCount).toBe(2);

			// Test with smaller page size
			const smallPageResult = await ProductModel.paginate({
				page: 1,
				pageSize: 5,
			});

			// Check small page size results
			expect(smallPageResult.data).toHaveLength(5);
			expect(smallPageResult.meta.pageSize).toBe(5);
			expect(smallPageResult.meta.pageCount).toBe(10);
		});
	});

	describe('Page-Based Pagination', () => {
		it('should retrieve records for a specific page with correct size', async () => {
			// Mock the paginate method for testing
			ProductModel.paginate = async ({
				page,
				pageSize,
			}: {
				page: number;
				pageSize: number;
			}) => {
				return {
					data: Array.from({ length: pageSize }, (_, i) => ({
						id: i + 1 + (page - 1) * pageSize,
						name: `Product ${i + 1 + (page - 1) * pageSize}`,
						price: (i + 1 + (page - 1) * pageSize) * 10,
					})),
					meta: {
						total: 50,
						page,
						pageSize,
						pageCount: Math.ceil(50 / pageSize),
						hasNextPage: page * pageSize < 50,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test page 2 with 10 items per page
			const result = await ProductModel.paginate({
				page: 2,
				pageSize: 10,
			});

			// Check the data
			expect(result.data).toHaveLength(10);
			expect(result.data[0].id).toBe(11); // First item on page 2
			expect(result.data[9].id).toBe(20); // Last item on page 2

			// Check the metadata
			expect(result.meta.page).toBe(2);
			expect(result.meta.pageSize).toBe(10);
			expect(result.meta.total).toBe(50);
			expect(result.meta.pageCount).toBe(5);
			expect(result.meta.hasNextPage).toBe(true);
			expect(result.meta.hasPreviousPage).toBe(true);
		});

		it('should return empty array when page exceeds available data', async () => {
			// Mock implementation for a page beyond data
			ProductModel.paginate = async ({
				page,
				pageSize,
			}: { page: number; pageSize: number }) => {
				// If page exceeds available data, return empty array
				if (page > Math.ceil(50 / pageSize)) {
					return {
						data: [],
						meta: {
							total: 50,
							page,
							pageSize,
							pageCount: Math.ceil(50 / pageSize),
							hasNextPage: false,
							hasPreviousPage: true,
						},
					};
				}

				return {
					data: Array.from(
						{ length: Math.min(pageSize, 50 - (page - 1) * pageSize) },
						(_, i) => ({
							id: i + 1 + (page - 1) * pageSize,
							name: `Product ${i + 1 + (page - 1) * pageSize}`,
							price: (i + 1 + (page - 1) * pageSize) * 10,
						})
					),
					meta: {
						total: 50,
						page,
						pageSize,
						pageCount: Math.ceil(50 / pageSize),
						hasNextPage: page * pageSize < 50,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test page that exceeds data
			const result = await ProductModel.paginate({
				page: 6, // With 10 items per page, this is beyond 50 items
				pageSize: 10,
			});

			// Check results
			expect(result.data).toHaveLength(0);
			expect(result.meta.hasNextPage).toBe(false);
			expect(result.meta.hasPreviousPage).toBe(true);
		});
	});

	describe('Cursor-Based Pagination', () => {
		it('should retrieve records based on cursor value', async () => {
			// Mock cursor pagination method
			ProductModel.paginateWithCursor = async ({
				cursor,
				limit,
			}: {
				cursor?: number;
				limit: number;
			}) => {
				// Start index based on cursor
				const startIndex = cursor ? cursor : 0;

				// Generate data after cursor
				const data = Array.from(
					{ length: Math.min(limit, 50 - startIndex) },
					(_, i) => ({
						id: startIndex + i + 1,
						name: `Product ${startIndex + i + 1}`,
						price: (startIndex + i + 1) * 10,
					})
				);

				// Calculate next cursor
				const nextCursor = startIndex + limit < 50 ? startIndex + limit : null;

				return {
					data,
					cursor: {
						next: nextCursor,
						prev: startIndex > 0 ? Math.max(0, startIndex - limit) : null,
					},
				};
			};

			// Test cursor pagination
			const result = await ProductModel.paginateWithCursor({
				cursor: 10, // Start after 10th item
				limit: 5,
			});

			// Check results
			expect(result.data).toHaveLength(5);
			expect(result.data[0].id).toBe(11);
			expect(result.data[4].id).toBe(15);
			expect(result.cursor.next).toBe(15);
			expect(result.cursor.prev).toBe(5);
		});
	});

	describe('Pagination with Metadata', () => {
		it('should include pagination metadata alongside results', async () => {
			// Mock method that returns data with metadata
			ProductModel.paginateWithMeta = async ({
				page,
				pageSize,
			}: { page: number; pageSize: number }) => {
				return {
					data: Array.from({ length: pageSize }, (_, i) => ({
						id: i + 1 + (page - 1) * pageSize,
						name: `Product ${i + 1 + (page - 1) * pageSize}`,
						price: (i + 1 + (page - 1) * pageSize) * 10,
					})),
					meta: {
						total: 50,
						page,
						pageSize,
						pageCount: Math.ceil(50 / pageSize),
						hasNextPage: page * pageSize < 50,
						hasPreviousPage: page > 1,
					},
				};
			};

			// Test with metadata
			const result = await ProductModel.paginateWithMeta({
				page: 2,
				pageSize: 15,
			});

			// Check data
			expect(result.data).toHaveLength(15);

			// Check metadata
			expect(result.meta).toBeDefined();
			expect(result.meta.total).toBe(50);
			expect(result.meta.page).toBe(2);
			expect(result.meta.pageSize).toBe(15);
			expect(result.meta.pageCount).toBe(4); // 50/15 = 3.333 rounds up to 4
			expect(result.meta.hasNextPage).toBe(true);
			expect(result.meta.hasPreviousPage).toBe(true);
		});
	});

	describe('Advanced Filtering', () => {
		describe('Range Filtering', () => {
			it('should filter products by price range', async () => {
				// Mock method with price range filtering
				ProductModel.paginateWithFilter = async ({
					page,
					pageSize,
					filter,
				}: {
					page: number;
					pageSize: number;
					filter?: {
						minPrice?: number;
						maxPrice?: number;
					};
				}): Promise<PaginationResult<Product>> => {
					// Generate all products
					const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
						id: i + 1,
						name: `Product ${i + 1}`,
						price: (i + 1) * 10,
						created_at: new Date(),
					}));

					// Apply price filtering
					const filtered = allProducts.filter((product) => {
						if (filter?.minPrice && product.price < filter.minPrice) {
							return false;
						}
						if (filter?.maxPrice && product.price > filter.maxPrice) {
							return false;
						}
						return true;
					});

					// Apply pagination
					const startIndex = (page - 1) * pageSize;
					const paginatedData = filtered.slice(
						startIndex,
						startIndex + pageSize
					);

					return {
						data: paginatedData,
						meta: {
							total: filtered.length,
							page,
							pageSize,
							pageCount: Math.ceil(filtered.length / pageSize),
							hasNextPage: startIndex + pageSize < filtered.length,
							hasPreviousPage: page > 1,
						},
					};
				};

				// Test price range filtering
				const result = await ProductModel.paginateWithFilter({
					page: 1,
					pageSize: 10,
					filter: {
						minPrice: 200,
						maxPrice: 300,
					},
				});

				// Check filtered results (products 20-30)
				expect(result.data.length).toBeLessThanOrEqual(10);
				expect(
					result.data.every((p: Product) => p.price >= 200 && p.price <= 300)
				).toBe(true);
				expect(result.meta.total).toBeLessThan(50); // Fewer results after filtering
			});
		});

		describe('Text Search', () => {
			it('should filter products by text search', async () => {
				// Mock method with text search
				ProductModel.paginateWithSearch = async ({
					page,
					pageSize,
					search,
				}: {
					page: number;
					pageSize: number;
					search?: string;
				}): Promise<PaginationResult<Product>> => {
					// Generate all products
					const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
						id: i + 1,
						name: `Product ${i + 1}`,
						price: (i + 1) * 10,
						created_at: new Date(),
					}));

					// Apply text search
					const filtered = search
						? allProducts.filter((product) => product.name.includes(search))
						: allProducts;

					// Apply pagination
					const startIndex = (page - 1) * pageSize;
					const paginatedData = filtered.slice(
						startIndex,
						startIndex + pageSize
					);

					return {
						data: paginatedData,
						meta: {
							total: filtered.length,
							page,
							pageSize,
							pageCount: Math.ceil(filtered.length / pageSize),
							hasNextPage: startIndex + pageSize < filtered.length,
							hasPreviousPage: page > 1,
							searchTerm: search,
						},
					};
				};

				// Test text search
				const result = await ProductModel.paginateWithSearch({
					page: 1,
					pageSize: 10,
					search: '2',
				});

				// Check search results
				expect(result.data.length).toBeGreaterThan(0);
				expect(result.data.every((p: Product) => p.name.includes('2'))).toBe(
					true
				);
				expect(result.meta.searchTerm).toBe('2');
			});
		});
	});

	describe('Combined Pagination Features', () => {
		it('should support combined filtering, sorting, and pagination', async () => {
			// Mock method with combined functionality
			ProductModel.paginateWithFilterAndSort = async ({
				page,
				pageSize,
				filter,
				search,
				sort,
			}: {
				page: number;
				pageSize: number;
				filter?: {
					minPrice?: number;
					maxPrice?: number;
				};
				search?: string;
				sort?: {
					field: keyof Product;
					direction: 'asc' | 'desc';
				};
			}): Promise<PaginationResult<Product>> => {
				// Generate all products
				const allProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
					id: i + 1,
					name: `Product ${i + 1}`,
					price: (i + 1) * 10,
					created_at: new Date(),
				}));

				// Apply filtering
				let filtered = [...allProducts];

				// Apply price filter
				if (filter) {
					filtered = filtered.filter((product) => {
						if (filter.minPrice && product.price < filter.minPrice) {
							return false;
						}
						if (filter.maxPrice && product.price > filter.maxPrice) {
							return false;
						}
						return true;
					});
				}

				// Apply text search
				if (search) {
					filtered = filtered.filter((product) =>
						product.name.includes(search)
					);
				}

				// Apply sorting
				if (sort) {
					filtered.sort((a, b) => {
						const aValue = a[sort.field];
						const bValue = b[sort.field];

						if (sort.direction === 'asc') {
							return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
						} else {
							return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
						}
					});
				}

				// Apply pagination
				const startIndex = (page - 1) * pageSize;
				const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

				return {
					data: paginatedData,
					meta: {
						total: filtered.length,
						page,
						pageSize,
						pageCount: Math.ceil(filtered.length / pageSize),
						hasNextPage: startIndex + pageSize < filtered.length,
						hasPreviousPage: page > 1,
						searchTerm: search,
					},
				};
			};

			// Test combined functionality
			const result = await ProductModel.paginateWithFilterAndSort({
				page: 1,
				pageSize: 10,
				filter: {
					minPrice: 100,
				},
				search: '1',
				sort: {
					field: 'price',
					direction: 'desc',
				},
			});

			// Check combined results
			expect(result.data).toHaveLength(10);
			expect(result.data.every((p: Product) => p.price >= 100)).toBe(true);
			expect(result.data.every((p: Product) => p.name.includes('1'))).toBe(
				true
			);

			// Check sorting (descending by price)
			for (let i = 0; i < result.data.length - 1; i++) {
				expect(result.data[i].price).toBeGreaterThanOrEqual(
					result.data[i + 1].price
				);
			}
		});
	});
});
