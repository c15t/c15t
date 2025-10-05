/**
 * @fileoverview Rate limiting middleware for ORPC v2.
 * Provides rate limiting functionality for analytics endpoints.
 */

import type { Logger } from '@doubletie/logger';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/** Time window in milliseconds */
	windowMs: number;
	/** Maximum number of requests per window */
	maxRequests: number;
	/** Key generator function */
	keyGenerator?: (context: { request: { ip?: string } }) => string;
}

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
	windowMs: 60 * 1000, // 1 minute
	maxRequests: 100, // 100 requests per minute
	keyGenerator: (context) => context.request.ip || 'unknown',
};

/**
 * Rate limit entry
 */
interface RateLimitEntry {
	count: number;
	resetTime: number;
}

/**
 * In-memory rate limit store
 */
export class RateLimitStore {
	private requests = new Map<string, RateLimitEntry>();

	get(key: string): RateLimitEntry | undefined {
		return this.requests.get(key);
	}

	set(key: string, entry: RateLimitEntry): void {
		this.requests.set(key, entry);
	}

	delete(key: string): void {
		this.requests.delete(key);
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.requests.entries()) {
			if (now > entry.resetTime) {
				this.requests.delete(key);
			}
		}
	}
}

/**
 * Global rate limit store
 */
const rateLimitStore = new RateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(
	() => {
		rateLimitStore.cleanup();
	},
	5 * 60 * 1000
);

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
	constructor() {
		super('Rate limit exceeded');
		this.name = 'RateLimitError';
	}
}

/**
 * Create rate limiting middleware for ORPC v2
 */
export function createRateLimitMiddleware(
	config: Partial<RateLimitConfig> = {},
	logger?: Logger,
	customStore?: RateLimitStore
) {
	const finalConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
	const store = customStore || rateLimitStore;

	return {
		name: 'rateLimit',
		handler: async (input: unknown, context: { request: { ip?: string } }) => {
			const key = finalConfig.keyGenerator!(context);
			const now = Date.now();

			const current = store.get(key);

			if (!current || now > current.resetTime) {
				// New window or expired window
				store.set(key, {
					count: 1,
					resetTime: now + finalConfig.windowMs,
				});
				return input;
			}

			if (current.count >= finalConfig.maxRequests) {
				logger?.warn('Rate limit exceeded', {
					key,
					count: current.count,
					maxRequests: finalConfig.maxRequests,
					windowMs: finalConfig.windowMs,
				});
				throw new RateLimitError();
			}

			// Increment count
			current.count++;
			store.set(key, current);

			return input;
		},
	};
}
