import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Subject } from '../schema';
import { subjectRegistry } from './subject';
import type { Registry } from './types';

// Mock generateUniqueId to return a predictable value for assertions
vi.mock('./utils/generate-id', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('sub_test_123'),
}));

describe('subjectRegistry', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	const createMockSubject = (overrides: Partial<Subject> = {}): Subject => ({
		id: 'sub_test_123',
		isIdentified: false,
		externalId: null,
		identityProvider: 'anonymous',
		lastIpAddress: '192.168.1.1',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('findOrCreateSubject', () => {
		describe('when both subjectId and externalSubjectId are provided', () => {
			it('should return the subject when both IDs match an existing subject', async () => {
				const mockSubject = createMockSubject({
					id: 'sub_existing',
					externalId: 'ext_123',
					isIdentified: true,
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					subjectId: 'sub_existing',
					externalSubjectId: 'ext_123',
					ipAddress: '192.168.1.1',
				});

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});

				expect(result).toEqual(mockSubject);
			});

			it('should throw ORPCError when both IDs are provided but no matching subject exists', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateSubject({
					subjectId: 'sub_nonexistent',
					externalSubjectId: 'ext_nonexistent',
				});

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						code: 'SUBJECT_NOT_FOUND',
						status: 404,
						data: {
							providedSubjectId: 'sub_nonexistent',
							providedExternalId: 'ext_nonexistent',
						},
					})
				);

				expect(mockLogger.error).toHaveBeenCalledWith('Subject not found', {
					providedSubjectId: 'sub_nonexistent',
					providedExternalId: 'ext_nonexistent',
				});
			});
		});

		describe('when only subjectId is provided', () => {
			it('should return the subject when found by subjectId', async () => {
				const mockSubject = createMockSubject({
					id: 'sub_existing',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					subjectId: 'sub_existing',
				});

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});

				expect(result).toEqual(mockSubject);
			});

			it('should throw ORPCError when subject not found by subjectId', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const promise = registry.findOrCreateSubject({
					subjectId: 'sub_nonexistent',
				});

				await expect(promise).rejects.toBeInstanceOf(ORPCError);
				await expect(promise).rejects.toEqual(
					expect.objectContaining({
						code: 'SUBJECT_NOT_FOUND',
						status: 404,
						data: { subjectId: 'sub_nonexistent' },
					})
				);
			});
		});

		describe('when only externalSubjectId is provided', () => {
			it('should find existing subject by externalSubjectId', async () => {
				const mockSubject = createMockSubject({
					externalId: 'ext_existing',
					isIdentified: true,
					lastIpAddress: '192.168.1.100',
				});

				const db = {
					upsert: vi.fn().mockResolvedValue(undefined),
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					externalSubjectId: 'ext_existing',
					ipAddress: '192.168.1.200',
				});

				expect(db.upsert).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
					create: {
						id: 'sub_test_123',
						externalId: 'ext_existing',
						identityProvider: 'anonymous',
						lastIpAddress: '192.168.1.200',
						isIdentified: true,
					},
					update: { lastIpAddress: '192.168.1.200' },
				});

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});

				expect(result).toEqual(mockSubject);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Finding/Creating subject with external id'
				);
			});

			it('should create new subject when externalSubjectId does not exist', async () => {
				const mockSubject = createMockSubject({
					externalId: 'ext_new',
					isIdentified: true,
					lastIpAddress: '192.168.1.200',
				});

				const db = {
					upsert: vi.fn().mockResolvedValue(undefined),
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					externalSubjectId: 'ext_new',
					ipAddress: '192.168.1.200',
				});

				expect(db.upsert).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
					create: {
						id: 'sub_test_123',
						externalId: 'ext_new',
						identityProvider: 'anonymous',
						lastIpAddress: '192.168.1.200',
						isIdentified: true,
					},
					update: { lastIpAddress: '192.168.1.200' },
				});

				expect(result).toEqual(mockSubject);
			});

			it('should use default IP address when not provided', async () => {
				const mockSubject = createMockSubject({
					externalId: 'ext_test',
					lastIpAddress: 'unknown',
				});

				const db = {
					upsert: vi.fn().mockResolvedValue(undefined),
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					externalSubjectId: 'ext_test',
				});

				expect(db.upsert).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
					create: {
						id: 'sub_test_123',
						externalId: 'ext_test',
						identityProvider: 'anonymous',
						lastIpAddress: 'unknown',
						isIdentified: true,
					},
					update: { lastIpAddress: 'unknown' },
				});
			});
		});

		describe('when no identifiers are provided (anonymous subject)', () => {
			it('should create a new anonymous subject', async () => {
				const mockSubject = createMockSubject({
					externalId: null,
					isIdentified: false,
					lastIpAddress: '10.0.0.1',
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					ipAddress: '10.0.0.1',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: null,
					identityProvider: 'anonymous',
					lastIpAddress: '10.0.0.1',
					isIdentified: false,
				});

				expect(result).toEqual(mockSubject);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating new anonymous subject'
				);
			});

			it('should use default IP address for anonymous subject when not provided', async () => {
				const mockSubject = createMockSubject({
					externalId: null,
					isIdentified: false,
					lastIpAddress: 'unknown',
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: null,
					identityProvider: 'anonymous',
					lastIpAddress: 'unknown',
					isIdentified: false,
				});

				expect(result).toEqual(mockSubject);
			});
		});

		describe('edge cases and error handling', () => {
			it('should handle empty string externalSubjectId as falsy', async () => {
				const mockSubject = createMockSubject();

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					externalSubjectId: '',
				});

				// Should create anonymous subject since empty string is falsy
				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: null,
					identityProvider: 'anonymous',
					lastIpAddress: 'unknown',
					isIdentified: false,
				});
			});

			it('should handle empty string subjectId as falsy', async () => {
				const mockSubject = createMockSubject();

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					subjectId: '',
				});

				// Should create anonymous subject since empty string is falsy
				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: null,
					identityProvider: 'anonymous',
					lastIpAddress: 'unknown',
					isIdentified: false,
				});
			});

			it('should preserve special IP addresses', async () => {
				const specialIPs = ['127.0.0.1', '::1', '0.0.0.0', 'localhost'];

				for (const ip of specialIPs) {
					const mockSubject = createMockSubject({
						lastIpAddress: ip,
					});

					const db = {
						create: vi.fn().mockResolvedValue(mockSubject),
					};

					const registry = subjectRegistry({
						db,
						ctx: { logger: mockLogger },
					} as unknown as Registry);

					await registry.findOrCreateSubject({
						ipAddress: ip,
					});

					expect(db.create).toHaveBeenCalledWith('subject', {
						id: 'sub_test_123',
						externalId: null,
						identityProvider: 'anonymous',
						lastIpAddress: ip,
						isIdentified: false,
					});

					vi.clearAllMocks();
				}
			});
		});

		describe('database query construction', () => {
			it('should construct correct query for dual identifier lookup', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				try {
					await registry.findOrCreateSubject({
						subjectId: 'sub_test',
						externalSubjectId: 'ext_test',
					});
				} catch {
					// Expected to throw
				}

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});
			});

			it('should construct correct query for single subjectId lookup', async () => {
				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				try {
					await registry.findOrCreateSubject({
						subjectId: 'sub_test',
					});
				} catch {
					// Expected to throw
				}

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});
			});

			it('should construct correct upsert for externalSubjectId', async () => {
				const mockSubject = createMockSubject();
				const db = {
					upsert: vi.fn().mockResolvedValue(undefined),
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					externalSubjectId: 'ext_test',
				});

				expect(db.upsert).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
					create: expect.objectContaining({
						id: 'sub_test_123',
						externalId: 'ext_test',
						identityProvider: 'anonymous',
						lastIpAddress: 'unknown',
						isIdentified: true,
					}),
					update: { lastIpAddress: 'unknown' },
				});
			});
		});
	});
});
