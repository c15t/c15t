/**
 * @fileoverview Unit tests for rate limiting middleware.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createRateLimitMiddleware,
	RateLimitError,
	type RateLimitStore,
} from './index';

// Create a test store class
class TestRateLimitStore {
	private requests = new Map<string, { count: number; resetTime: number }>();

	get(key: string) {
		return this.requests.get(key);
	}

	set(key: string, entry: { count: number; resetTime: number }) {
		this.requests.set(key, entry);
	}

	delete(key: string) {
		this.requests.delete(key);
	}

	clear() {
		this.requests.clear();
	}

	cleanup(): void {
		// No-op for testing
	}
}

describe('Rate Limiting Middleware', () => {
	let middleware: any;
	let testStore: TestRateLimitStore;

	beforeEach(() => {
		// Create a fresh store and middleware instance for each test
		testStore = new TestRateLimitStore();
		middleware = createRateLimitMiddleware(
			{
				windowMs: 1000, // 1 second for testing
				maxRequests: 2, // 2 requests per window for testing
			},
			undefined,
			testStore as unknown as RateLimitStore
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should allow requests within limit', async () => {
		const context = { request: { ip: '192.168.1.1' } };
		const input = { test: 'data' };

		// First request should pass
		const result1 = await middleware.handler(input, context);
		expect(result1).toBe(input);

		// Second request should pass
		const result2 = await middleware.handler(input, context);
		expect(result2).toBe(input);
	});

	it('should throw RateLimitError when limit exceeded', async () => {
		const context = { request: { ip: '192.168.1.1' } };
		const input = { test: 'data' };

		// First two requests should pass
		await middleware.handler(input, context);
		await middleware.handler(input, context);

		// Third request should be rate limited
		await expect(middleware.handler(input, context)).rejects.toThrow(
			RateLimitError
		);
	});

	it('should use different keys for different IPs', async () => {
		const context1 = { request: { ip: '192.168.1.1' } };
		const context2 = { request: { ip: '192.168.1.2' } };
		const input = { test: 'data' };

		// Both IPs should be able to make requests independently
		await middleware.handler(input, context1);
		await middleware.handler(input, context1);
		await middleware.handler(input, context2);
		await middleware.handler(input, context2);

		// Both should be rate limited now
		await expect(middleware.handler(input, context1)).rejects.toThrow(
			RateLimitError
		);
		await expect(middleware.handler(input, context2)).rejects.toThrow(
			RateLimitError
		);
	});

	it('should reset window after time expires', async () => {
		const context = { request: { ip: '192.168.1.1' } };
		const input = { test: 'data' };

		// Exceed the limit
		await middleware.handler(input, context);
		await middleware.handler(input, context);
		await expect(middleware.handler(input, context)).rejects.toThrow(
			RateLimitError
		);

		// Wait for window to reset
		await new Promise((resolve) => setTimeout(resolve, 1100));

		// Should be able to make requests again
		const result = await middleware.handler(input, context);
		expect(result).toBe(input);
	});

	it('should use custom key generator', async () => {
		const customMiddleware = createRateLimitMiddleware({
			windowMs: 1000,
			maxRequests: 1,
			keyGenerator: (context) => 'custom-key',
		});

		const context1 = { request: { ip: '192.168.1.1' } };
		const context2 = { request: { ip: '192.168.1.2' } };
		const input = { test: 'data' };

		// Both contexts should share the same rate limit since they use the same key
		await customMiddleware.handler(input, context1);
		await expect(customMiddleware.handler(input, context2)).rejects.toThrow(
			RateLimitError
		);
	});

	it('should handle missing IP gracefully', async () => {
		const context = { request: {} };
		const input = { test: 'data' };

		// Should use 'unknown' as the key
		const result = await middleware.handler(input, context);
		expect(result).toBe(input);
	});

	it('should log rate limit violations when logger provided', async () => {
		const mockLogger = {
			warn: vi.fn(),
		};

		const testStoreForLogger = new TestRateLimitStore();
		const middlewareWithLogger = createRateLimitMiddleware(
			{
				windowMs: 1000,
				maxRequests: 1,
			},
			mockLogger as unknown as import('@doubletie/logger').Logger,
			testStoreForLogger as unknown as RateLimitStore
		);

		const context = { request: { ip: '192.168.1.1' } };
		const input = { test: 'data' };

		// First request should pass
		await middlewareWithLogger.handler(input, context);

		// Second request should be rate limited and logged
		await expect(middlewareWithLogger.handler(input, context)).rejects.toThrow(
			RateLimitError
		);

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'Rate limit exceeded',
			expect.objectContaining({
				key: '192.168.1.1',
				count: 1,
				maxRequests: 1,
				windowMs: 1000,
			})
		);
	});
});
