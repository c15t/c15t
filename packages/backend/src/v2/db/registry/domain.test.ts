import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Domain } from '../schema';
import { domainRegistry } from './domain';
import type { Registry } from './types';

describe('domainRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	vi.mock('./utils/generate-id', () => ({
		generateUniqueId: vi.fn().mockResolvedValue('dom_test'),
	}));

	/**
	 * Creates a mock domain object with the specified overrides
	 *
	 * @param overrides - Partial domain properties to override defaults
	 * @returns A complete Domain object for testing
	 */
	const createMockDomain = (overrides: Partial<Domain> = {}): Domain => ({
		id: 'dom_test',
		name: 'example.com',
		description: 'Auto-created domain for example.com',
		allowedOrigins: [],
		isVerified: true,
		isActive: true,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('findDomainByName', () => {
		it('should return domain when found by name', async () => {
			const mockDomain = createMockDomain({
				name: 'example.com',
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(mockDomain),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findDomainByName('example.com');

			expect(db.findFirst).toHaveBeenCalledWith('domain', {
				where: expect.any(Function),
			});

			expect(result).toEqual(mockDomain);
		});

		it('should return null when domain not found by name', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findDomainByName('nonexistent.com');

			expect(db.findFirst).toHaveBeenCalledWith('domain', {
				where: expect.any(Function),
			});

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('No domain found', {
				name: 'nonexistent.com',
			});
		});

		it('should handle empty string domain name', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findDomainByName('');

			expect(db.findFirst).toHaveBeenCalledWith('domain', {
				where: expect.any(Function),
			});

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('No domain found', {
				name: '',
			});
		});
	});

	describe('findOrCreateDomain', () => {
		describe('when domain exists', () => {
			it('should return existing domain when found', async () => {
				const mockDomain = createMockDomain({
					name: 'existing.com',
					description: 'Existing domain description',
					isVerified: false,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockDomain),
					create: vi.fn(),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateDomain('existing.com');

				expect(db.findFirst).toHaveBeenCalledWith('domain', {
					where: expect.any(Function),
				});

				expect(db.create).not.toHaveBeenCalled();
				expect(result).toEqual(mockDomain);
				expect(mockLogger.debug).toHaveBeenCalledWith('Found existing domain', {
					name: 'existing.com',
				});
			});
		});

		describe('when domain does not exist', () => {
			it('should create and return new domain', async () => {
				const newMockDomain = createMockDomain({
					name: 'new.com',
					description: 'Auto-created domain for new.com',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(newMockDomain),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateDomain('new.com');

				expect(db.findFirst).toHaveBeenCalledWith('domain', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('domain', {
					id: 'dom_test',
					name: 'new.com',
					description: 'Auto-created domain for new.com',
					isActive: true,
					isVerified: true,
					allowedOrigins: [],
				});

				expect(result).toEqual(newMockDomain);
				expect(mockLogger.debug).toHaveBeenCalledWith('Creating new domain', {
					name: 'new.com',
				});
			});

			it('should create domain with correct default values', async () => {
				const newMockDomain = createMockDomain({
					name: 'test.org',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(newMockDomain),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateDomain('test.org');

				expect(db.create).toHaveBeenCalledWith('domain', {
					id: 'dom_test',
					name: 'test.org',
					description: 'Auto-created domain for test.org',
					isActive: true,
					isVerified: true,
					allowedOrigins: [],
				});
			});

			it('should handle special domain names correctly', async () => {
				const specialDomains = [
					'localhost',
					'127.0.0.1',
					'sub.domain.example.com',
					'domain-with-hyphens.co.uk',
					'123numeric.com',
				];

				for (const domainName of specialDomains) {
					const mockDomain = createMockDomain({
						name: domainName,
						description: `Auto-created domain for ${domainName}`,
					});

					const db = {
						findFirst: vi.fn().mockResolvedValue(null),
						create: vi.fn().mockResolvedValue(mockDomain),
					};

					const registry = domainRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					const result = await registry.findOrCreateDomain(domainName);

					expect(db.create).toHaveBeenCalledWith('domain', {
						id: 'dom_test',
						name: domainName,
						description: `Auto-created domain for ${domainName}`,
						isActive: true,
						isVerified: true,
						allowedOrigins: [],
					});

					expect(result).toEqual(mockDomain);

					vi.clearAllMocks();
				}
			});
		});

		describe('error handling', () => {
			it('should throw ORPCError when domain creation fails', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(null),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateDomain('failed.com');

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create domain',
						code: 'DOMAIN_CREATION_FAILED',
						status: 503,
					})
				);

				expect(db.findFirst).toHaveBeenCalledWith('domain', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('domain', {
					id: 'dom_test',
					name: 'failed.com',
					description: 'Auto-created domain for failed.com',
					isActive: true,
					isVerified: true,
					allowedOrigins: [],
				});

				expect(mockLogger.debug).toHaveBeenCalledWith('Creating new domain', {
					name: 'failed.com',
				});
			});

			it('should throw ORPCError when domain creation returns undefined', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(undefined),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateDomain('undefined.com');

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						message: 'Failed to create domain',
						code: 'DOMAIN_CREATION_FAILED',
						status: 503,
					})
				);
			});

			it('should propagate database findFirst errors', async () => {
				const dbError = new Error('Database connection failed');
				const db = {
					findFirst: vi.fn().mockRejectedValue(dbError),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateDomain('error.com');

				await expect(promise).rejects.toThrow('Database connection failed');
			});

			it('should propagate database create errors', async () => {
				const dbError = new Error('Create operation failed');
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockRejectedValue(dbError),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateDomain('create-error.com');

				await expect(promise).rejects.toThrow('Create operation failed');
			});
		});
	});

	describe('database query construction', () => {
		it('should construct correct query for domain lookup by name', async () => {
			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			await registry.findDomainByName('query-test.com');

			expect(db.findFirst).toHaveBeenCalledWith('domain', {
				where: expect.any(Function),
			});

			// Verify the where function is properly constructed
			const whereCall = db.findFirst.mock.calls[0]?.[1];
			expect(whereCall).toHaveProperty('where');
			expect(typeof whereCall?.where).toBe('function');
		});

		it('should construct correct query for findOrCreateDomain lookup', async () => {
			const mockDomain = createMockDomain();
			const db = {
				findFirst: vi.fn().mockResolvedValue(mockDomain),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			await registry.findOrCreateDomain('query-existing.com');

			expect(db.findFirst).toHaveBeenCalledWith('domain', {
				where: expect.any(Function),
			});

			// Verify the where function is properly constructed
			const whereCall = db.findFirst.mock.calls[0]?.[1];
			expect(whereCall).toHaveProperty('where');
			expect(typeof whereCall?.where).toBe('function');
		});
	});

	describe('edge cases', () => {
		it('should handle domain names with various formats', async () => {
			const edgeCaseDomains = [
				'a.b', // Minimal valid domain
				'very-long-subdomain.example.org', // Long subdomain
				'test.co.uk', // Multiple TLDs
				'xn--nxasmq6b.xn--o3cw4h', // IDN (internationalized domain)
			];

			for (const domainName of edgeCaseDomains) {
				const mockDomain = createMockDomain({
					name: domainName,
					description: `Auto-created domain for ${domainName}`,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(mockDomain),
				};

				const registry = domainRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateDomain(domainName);

				expect(result.name).toBe(domainName);
				expect(result.description).toBe(
					`Auto-created domain for ${domainName}`
				);

				vi.clearAllMocks();
			}
		});

		it('should maintain domain name case sensitivity', async () => {
			const upperCaseDomain = 'EXAMPLE.COM';
			const mockDomain = createMockDomain({
				name: upperCaseDomain,
			});

			const db = {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue(mockDomain),
			};

			const registry = domainRegistry({
				db,
				ctx: { logger: mockLogger },
			} as unknown as Registry);

			const result = await registry.findOrCreateDomain(upperCaseDomain);

			expect(db.create).toHaveBeenCalledWith('domain', {
				id: 'dom_test',
				name: upperCaseDomain,
				description: `Auto-created domain for ${upperCaseDomain}`,
				isActive: true,
				isVerified: true,
				allowedOrigins: [],
			});

			expect(result.name).toBe(upperCaseDomain);
		});
	});
});
