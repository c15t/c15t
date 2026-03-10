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

		externalId: null,
		identityProvider: 'anonymous',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('findOrCreateSubject', () => {
		describe('when subjectId is provided', () => {
			it('should return existing subject when found', async () => {
				const mockSubject = createMockSubject({
					id: 'sub_existing',
					externalId: 'ext_123',
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

			it('should create new subject when subjectId not found', async () => {
				const createdSubject = createMockSubject({
					id: 'sub_new',
					externalId: null,
					identityProvider: 'anonymous',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(createdSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					subjectId: 'sub_new',
				});

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_new',
					externalId: null,
					identityProvider: 'anonymous',
				});

				expect(result).toEqual(createdSubject);
			});

			it('should create new subject with externalId when both IDs provided but subject not found', async () => {
				const createdSubject = createMockSubject({
					id: 'sub_new',
					externalId: 'ext_123',
					identityProvider: 'external',
				});

				const db = {
					findFirst: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue(createdSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					subjectId: 'sub_new',
					externalSubjectId: 'ext_123',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_new',
					externalId: 'ext_123',
					identityProvider: 'external',
				});

				expect(result).toEqual(createdSubject);
			});
		});

		describe('when only externalSubjectId is provided', () => {
			it('should create a new subject with external ID', async () => {
				const mockSubject = createMockSubject({
					id: 'sub_test_123',
					externalId: 'ext_existing',
					identityProvider: 'external',
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					externalSubjectId: 'ext_existing',
					ipAddress: '192.168.1.200',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: 'ext_existing',
					identityProvider: 'external',
				});

				expect(result).toEqual(mockSubject);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating subject with external ID (legacy flow)',
					{ externalSubjectId: 'ext_existing' }
				);
			});

			it('should use custom identity provider when specified', async () => {
				const mockSubject = createMockSubject({
					id: 'sub_test_123',
					externalId: 'ext_new',
					identityProvider: 'google',
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				const result = await registry.findOrCreateSubject({
					externalSubjectId: 'ext_new',
					identityProvider: 'google',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: 'ext_new',
					identityProvider: 'google',
				});

				expect(result).toEqual(mockSubject);
			});

			it('should default identityProvider to "external"', async () => {
				const mockSubject = createMockSubject({
					externalId: 'ext_test',
				});

				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					externalSubjectId: 'ext_test',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: 'ext_test',
					identityProvider: 'external',
				});
			});
		});

		describe('when no identifiers are provided (anonymous subject)', () => {
			it('should create a new anonymous subject', async () => {
				const mockSubject = createMockSubject({
					externalId: null,
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
				});

				expect(result).toEqual(mockSubject);
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Creating new anonymous subject'
				);
			});

			it('should create anonymous subject when no arguments provided', async () => {
				const mockSubject = createMockSubject({
					externalId: null,
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
				});
			});
		});

		describe('database query construction', () => {
			it('should construct correct findFirst query for subjectId lookup', async () => {
				const mockSubject = createMockSubject();
				const db = {
					findFirst: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					subjectId: 'sub_test',
				});

				expect(db.findFirst).toHaveBeenCalledWith('subject', {
					where: expect.any(Function),
				});
			});

			it('should construct correct create call for externalSubjectId', async () => {
				const mockSubject = createMockSubject();
				const db = {
					create: vi.fn().mockResolvedValue(mockSubject),
				};

				const registry = subjectRegistry({
					db,
					ctx: { logger: mockLogger },
				} as unknown as Registry);

				await registry.findOrCreateSubject({
					externalSubjectId: 'ext_test',
				});

				expect(db.create).toHaveBeenCalledWith('subject', {
					id: 'sub_test_123',
					externalId: 'ext_test',
					identityProvider: 'external',
				});
			});
		});
	});
});
