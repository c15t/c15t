import { ORPCError } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the oRPC handler before importing
vi.mock('~/contracts', () => ({
	os: {
		meta: {
			status: {
				handler: (fn: unknown) => fn,
			},
		},
	},
}));

import { statusHandler } from './status.handler';

describe('statusHandler', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	const createMockContext = (db: unknown) => {
		return {
			context: {
				db,
				logger: mockLogger,
				headers: new Map([
					['cf-ipcountry', 'US'],
					['x-vercel-ip-country-region', 'CA'],
					['accept-language', 'en-US'],
				]),
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0',
			},
		};
	};

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('should return health info when database is working', async () => {
		const db = {
			findFirst: vi.fn().mockResolvedValue({ id: 'sub_123' }),
		};

		// Mock Math.random to always be > 0.85 for success
		vi.spyOn(Math, 'random').mockReturnValue(0.9);

		//@ts-expect-error - simplified test context
		const result = await statusHandler(createMockContext(db));

		expect(result.version).toBeDefined();
		expect(result.timestamp).toBeInstanceOf(Date);
		expect(result.client).toEqual({
			ip: '192.168.1.100',
			acceptLanguage: 'en-US',
			userAgent: 'Mozilla/5.0',
			region: {
				countryCode: 'US',
				regionCode: 'CA',
			},
		});
		expect(db.findFirst).toHaveBeenCalledWith('subject', {});
	});

	it('should throw SERVICE_UNAVAILABLE when database query fails', async () => {
		const db = {
			findFirst: vi.fn().mockRejectedValue(new Error('DB Connection failed')),
		};

		//@ts-expect-error - simplified test context
		const promise = statusHandler(createMockContext(db));

		await expect(promise).rejects.toThrow(ORPCError);
		await expect(promise).rejects.toMatchObject({
			code: 'SERVICE_UNAVAILABLE',
			message: 'Database health check failed',
		});

		expect(mockLogger.error).toHaveBeenCalledWith(
			'Database health check failed',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('should throw SERVICE_UNAVAILABLE when random check fails', async () => {
		const db = {
			findFirst: vi.fn().mockResolvedValue({ id: 'sub_123' }),
		};

		// Mock Math.random to always be < 0.85 for failure
		vi.spyOn(Math, 'random').mockReturnValue(0.1);

		//@ts-expect-error - simplified test context
		const promise = statusHandler(createMockContext(db));

		await expect(promise).rejects.toThrow(ORPCError);
		await expect(promise).rejects.toMatchObject({
			code: 'SERVICE_UNAVAILABLE',
		});
	});

	it('should handle missing geo headers', async () => {
		const db = {
			findFirst: vi.fn().mockResolvedValue({ id: 'sub_123' }),
		};

		// Mock Math.random to always be > 0.85 for success
		vi.spyOn(Math, 'random').mockReturnValue(0.9);

		const context = {
			context: {
				db,
				logger: mockLogger,
				headers: new Map(),
				ipAddress: '1.2.3.4',
				userAgent: 'Test Agent',
			},
		};

		//@ts-expect-error - simplified test context
		const result = await statusHandler(context);

		expect(result.client.region.countryCode).toBeNull();
		expect(result.client.region.regionCode).toBeNull();
	});
});
