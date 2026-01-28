import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { statusHandler } from './status.handler';

describe('statusHandler', () => {
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	};

	const createMockContext = (db: unknown) => {
		const headers = new Headers();
		headers.set('cf-ipcountry', 'US');
		headers.set('x-vercel-ip-country-region', 'CA');
		headers.set('accept-language', 'en-US');

		const ctx = {
			db,
			logger: mockLogger,
			headers,
			ipAddress: '192.168.1.100',
			userAgent: 'Mozilla/5.0',
		};

		let jsonData: unknown;

		return {
			get: (key: string) => {
				if (key === 'c15tContext') {
					return ctx;
				}
				return undefined;
			},
			json: vi.fn((data) => {
				jsonData = data;
				return data;
			}),
			getJsonData: () => jsonData,
			req: {
				raw: { headers },
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

		const mockCtx = createMockContext(db);
		// @ts-expect-error - simplified test context
		await statusHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			version: string;
			timestamp: Date;
			client: {
				ip: string | null;
				acceptLanguage: string | null;
				userAgent: string | null;
				region: {
					countryCode: string | null;
					regionCode: string | null;
				};
			};
		};

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

	it('should throw HTTPException when database query fails', async () => {
		const db = {
			findFirst: vi.fn().mockRejectedValue(new Error('DB Connection failed')),
		};

		const mockCtx = createMockContext(db);
		// @ts-expect-error - simplified test context
		const promise = statusHandler(mockCtx);

		await expect(promise).rejects.toThrow(HTTPException);
		await expect(promise).rejects.toMatchObject({
			status: 503,
		});

		expect(mockLogger.error).toHaveBeenCalledWith(
			'Database health check failed',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('should handle missing geo headers', async () => {
		const db = {
			findFirst: vi.fn().mockResolvedValue({ id: 'sub_123' }),
		};

		const emptyHeaders = new Headers();
		const ctx = {
			db,
			logger: mockLogger,
			headers: emptyHeaders,
			ipAddress: '1.2.3.4',
			userAgent: 'Test Agent',
		};

		let jsonData: unknown;
		const mockCtx = {
			get: (key: string) => {
				if (key === 'c15tContext') {
					return ctx;
				}
				return undefined;
			},
			json: vi.fn((data) => {
				jsonData = data;
				return data;
			}),
			req: {
				raw: { headers: emptyHeaders },
			},
		};

		// @ts-expect-error - simplified test context
		await statusHandler(mockCtx);

		const result = jsonData as {
			client: {
				region: {
					countryCode: string | null;
					regionCode: string | null;
				};
			};
		};

		expect(result.client.region.countryCode).toBeNull();
		expect(result.client.region.regionCode).toBeNull();
	});
});
