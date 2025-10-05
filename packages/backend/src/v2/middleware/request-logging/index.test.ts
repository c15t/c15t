/**
 * @fileoverview Unit tests for request logging middleware.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createRequestLoggingMiddleware,
	createResponseLoggingMiddleware,
} from './index';

describe('Request Logging Middleware', () => {
	let mockLogger: any;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
		};
	});

	describe('Request Logging', () => {
		it('should log basic request information', async () => {
			const middleware = createRequestLoggingMiddleware(mockLogger);
			const context = {
				request: {
					headers: {
						'user-agent': 'Mozilla/5.0',
					},
					ip: '192.168.1.1',
					method: 'POST',
					url: '/analytics/process',
				},
			};
			const input = { events: [], consent: {} };

			const result = await middleware.handler(input, context);

			expect(result).toBe(input);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request received',
				expect.objectContaining({
					method: 'POST',
					path: '/analytics/process',
					userAgent: 'Mozilla/5.0',
					ip: '192.168.1.1',
					timestamp: expect.any(String),
				})
			);
		});

		it('should log headers when enabled', async () => {
			const middleware = createRequestLoggingMiddleware(mockLogger, {
				logHeaders: true,
			});
			const context = {
				request: {
					headers: {
						'user-agent': 'Mozilla/5.0',
						'content-type': 'application/json',
					},
					ip: '192.168.1.1',
				},
			};
			const input = { events: [], consent: {} };

			await middleware.handler(input, context);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request received',
				expect.objectContaining({
					headers: {
						'user-agent': 'Mozilla/5.0',
						'content-type': 'application/json',
					},
				})
			);
		});

		it('should log request body when enabled', async () => {
			const middleware = createRequestLoggingMiddleware(mockLogger, {
				logRequestBody: true,
			});
			const context = {
				request: {
					headers: {},
					ip: '192.168.1.1',
				},
			};
			const input = {
				events: [{ type: 'track' }],
				consent: { necessary: true },
			};

			await middleware.handler(input, context);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request received',
				expect.objectContaining({
					body: input,
				})
			);
		});

		it('should truncate large request bodies', async () => {
			const middleware = createRequestLoggingMiddleware(mockLogger, {
				logRequestBody: true,
				maxBodySize: 10,
			});
			const context = {
				request: {
					headers: {},
					ip: '192.168.1.1',
				},
			};
			const input = { events: [{ type: 'track', data: 'very long data' }] };

			await middleware.handler(input, context);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request received',
				expect.objectContaining({
					body: '[Body too large to log]',
				})
			);
		});

		it('should handle missing request properties gracefully', async () => {
			const middleware = createRequestLoggingMiddleware(mockLogger);
			const context = {
				request: {
					headers: {},
				},
			};
			const input = { events: [], consent: {} };

			const result = await middleware.handler(input, context);

			expect(result).toBe(input);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request received',
				expect.objectContaining({
					method: 'POST',
					path: '/analytics/process',
					userAgent: undefined,
					ip: undefined,
				})
			);
		});
	});

	describe('Response Logging', () => {
		it('should log basic response information', async () => {
			const middleware = createResponseLoggingMiddleware(mockLogger);
			const context = {
				request: {
					headers: {
						'user-agent': 'Mozilla/5.0',
					},
					ip: '192.168.1.1',
					method: 'POST',
					url: '/analytics/process',
				},
			};
			const output = { success: true, processed: 1 };

			const result = await middleware.handler(output, context);

			expect(result).toBe(output);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request completed',
				expect.objectContaining({
					method: 'POST',
					path: '/analytics/process',
					userAgent: 'Mozilla/5.0',
					ip: '192.168.1.1',
					duration: expect.any(Number),
					timestamp: expect.any(String),
				})
			);
		});

		it('should log response body when enabled', async () => {
			const middleware = createResponseLoggingMiddleware(mockLogger, {
				logResponseBody: true,
			});
			const context = {
				request: {
					headers: {},
					ip: '192.168.1.1',
				},
			};
			const output = { success: true, processed: 1, results: [] };

			await middleware.handler(output, context);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request completed',
				expect.objectContaining({
					body: output,
				})
			);
		});

		it('should truncate large response bodies', async () => {
			const middleware = createResponseLoggingMiddleware(mockLogger, {
				logResponseBody: true,
				maxBodySize: 10,
			});
			const context = {
				request: {
					headers: {},
					ip: '192.168.1.1',
				},
			};
			const output = {
				success: true,
				processed: 1,
				largeData: 'very long response data',
			};

			await middleware.handler(output, context);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Analytics request completed',
				expect.objectContaining({
					body: '[Body too large to log]',
				})
			);
		});
	});
});
