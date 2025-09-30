import { randomBytes } from 'node:crypto';
import type { InferFumaDB } from 'fumadb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DB } from '~/v2/db/schema';
import { generateUniqueId } from './generate-id';

type MockDB = ReturnType<InferFumaDB<typeof DB>['orm']>;

// Define regex patterns at the top level for performance
const SUBJECT_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;
const CONSENT_ID_PATTERN = /^cns_[A-Za-z0-9]+$/;
const DOMAIN_ID_PATTERN = /^dom_[A-Za-z0-9]+$/;

describe('generateUniqueId', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	// Ensure crypto.getRandomValues exists in Node/Vitest environments
	// that may not provide a Web Crypto global by default.
	if (
		!(globalThis as { crypto?: { getRandomValues?: unknown } }).crypto
			?.getRandomValues
	) {
		(
			globalThis as {
				crypto: { getRandomValues: (a: Uint8Array) => Uint8Array };
			}
		).crypto = {
			getRandomValues: (array: Uint8Array) => {
				const bytes = randomBytes(array.length);
				array.set(bytes);
				return array;
			},
		};
	}

	it('should return unique ID on first attempt when no collision exists', async () => {
		const mockDb = {
			findFirst: vi.fn().mockResolvedValue(null), // No existing record found
		} as unknown as MockDB;

		const result = await generateUniqueId(mockDb, 'subject');

		expect(mockDb.findFirst).toHaveBeenCalledTimes(1);
		expect(mockDb.findFirst).toHaveBeenCalledWith('subject', {
			where: expect.any(Function),
		});
		expect(result).toMatch(SUBJECT_ID_PATTERN); // Should have 'sub_' prefix
		expect(result.length).toBeGreaterThan(4); // Should be longer than just prefix
	});

	it('should retry when ID collision occurs and return unique ID on second attempt', async () => {
		const mockExistingRecord = { id: 'mock_existing' };
		const mockDb = {
			findFirst: vi
				.fn()
				.mockResolvedValueOnce(mockExistingRecord) // First call returns existing record
				.mockResolvedValueOnce(null), // Second call returns null (unique)
		} as unknown as MockDB;

		const result = await generateUniqueId(mockDb, 'consent');

		expect(mockDb.findFirst).toHaveBeenCalledTimes(2);
		expect(result).toMatch(CONSENT_ID_PATTERN); // Should have 'cns_' prefix
	});

	it('should handle multiple collisions before finding unique ID', async () => {
		const mockExistingRecord = { id: 'mock_existing' };
		const mockDb = {
			findFirst: vi
				.fn()
				.mockResolvedValueOnce(mockExistingRecord) // First collision
				.mockResolvedValueOnce(mockExistingRecord) // Second collision
				.mockResolvedValueOnce(mockExistingRecord) // Third collision
				.mockResolvedValueOnce(null), // Finally unique
		} as unknown as MockDB;

		const result = await generateUniqueId(mockDb, 'domain');

		expect(mockDb.findFirst).toHaveBeenCalledTimes(4);
		expect(result).toMatch(DOMAIN_ID_PATTERN); // Should have 'dom_' prefix
	});

	it('should work with different model types and use correct prefixes', async () => {
		const mockDb = {
			findFirst: vi.fn().mockResolvedValue(null),
		} as unknown as MockDB;

		const testCases = [
			{ model: 'auditLog' as const, expectedPrefix: 'log_' },
			{ model: 'consent' as const, expectedPrefix: 'cns_' },
			{ model: 'consentPolicy' as const, expectedPrefix: 'pol_' },
			{ model: 'consentPurpose' as const, expectedPrefix: 'pur_' },
			{ model: 'consentRecord' as const, expectedPrefix: 'rec_' },
			{ model: 'domain' as const, expectedPrefix: 'dom_' },
			{ model: 'subject' as const, expectedPrefix: 'sub_' },
		];

		for (const { model, expectedPrefix } of testCases) {
			const result = await generateUniqueId(mockDb, model);
			expect(result).toMatch(
				new RegExp(
					`^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9]+$`
				)
			);
		}

		expect(mockDb.findFirst).toHaveBeenCalledTimes(testCases.length);
	});

	it('should call findFirst with correct where clause function', async () => {
		const mockDb = {
			findFirst: vi.fn().mockResolvedValue(null),
		} as unknown as MockDB;

		await generateUniqueId(mockDb, 'subject');

		const mockFindFirst = vi.mocked(mockDb.findFirst);
		const [model, options] = mockFindFirst.mock.calls[0] as [
			string,
			{ where: (builder: unknown) => void },
		];
		expect(mockFindFirst.mock.calls).toHaveLength(1);
		expect(model).toBe('subject');
		expect(options).toHaveProperty('where');
		expect(typeof options.where).toBe('function');

		// Test the where function behavior
		const mockBuilder = vi.fn();
		options.where(mockBuilder);
		expect(mockBuilder).toHaveBeenCalledWith(
			'id',
			'=',
			expect.stringMatching(SUBJECT_ID_PATTERN)
		);
	});

	it('should generate different IDs on subsequent calls', async () => {
		const mockDb = {
			findFirst: vi.fn().mockResolvedValue(null),
		} as unknown as MockDB;

		const id1 = await generateUniqueId(mockDb, 'subject');
		const id2 = await generateUniqueId(mockDb, 'subject');
		const id3 = await generateUniqueId(mockDb, 'subject');

		expect(id1).not.toBe(id2);
		expect(id2).not.toBe(id3);
		expect(id1).not.toBe(id3);

		// All should have the same prefix
		expect(id1).toMatch(SUBJECT_ID_PATTERN);
		expect(id2).toMatch(SUBJECT_ID_PATTERN);
		expect(id3).toMatch(SUBJECT_ID_PATTERN);
	});

	it('should throw an error when max retries is exceeded', async () => {
		const mockExistingRecord = { id: 'mock_existing' };
		const mockLogger = {
			error: vi.fn(),
			debug: vi.fn(),
			info: vi.fn(),
			success: vi.fn(),
			warn: vi.fn(),
		};
		const mockCtx = { logger: mockLogger };

		const mockDb = {
			findFirst: vi.fn().mockResolvedValue(mockExistingRecord), // Always return a collision
		} as unknown as MockDB;

		// Use a small maxRetries value for faster test execution
		await expect(
			generateUniqueId(mockDb, 'subject', mockCtx, { maxRetries: 3 })
		).rejects.toThrow(
			'Failed to generate unique ID for subject after 3 attempts'
		);

		// Should have attempted exactly maxRetries times
		expect(mockDb.findFirst).toHaveBeenCalledTimes(3);
		expect(mockLogger.error).toHaveBeenCalledWith(
			'ID generation failed',
			expect.objectContaining({ model: 'subject', maxRetries: 3 })
		);
	});

	it('should respect custom retry options', async () => {
		const mockExistingRecord = { id: 'mock_existing' };
		const mockDb = {
			findFirst: vi
				.fn()
				.mockResolvedValueOnce(mockExistingRecord) // First call returns existing record
				.mockResolvedValueOnce(null), // Second call returns null (unique)
		} as unknown as MockDB;

		// Mock the setTimeout function directly
		const originalSetTimeout = global.setTimeout;
		global.setTimeout = vi.fn((callback) => {
			// Execute callback immediately
			callback();
			return 1; // Return a timeout ID
		}) as any;

		try {
			const result = await generateUniqueId(mockDb, 'subject', undefined, {
				baseDelay: 100,
			});

			expect(mockDb.findFirst).toHaveBeenCalledTimes(2);
			expect(result).toMatch(SUBJECT_ID_PATTERN);
		} finally {
			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		}
	});
});
