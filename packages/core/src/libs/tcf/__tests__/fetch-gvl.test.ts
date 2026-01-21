/**
 * Tests for GVL fetching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGVLCache, fetchGVL, getCachedGVL } from '../fetch-gvl';
import { setupFetchMock } from './test-setup';

describe('GVL Fetching', () => {
	let fetchMock: ReturnType<typeof setupFetchMock>;

	beforeEach(() => {
		// Clear cache before each test
		clearGVLCache();

		// Setup mocks
		fetchMock = setupFetchMock();
	});

	afterEach(() => {
		fetchMock.cleanup();
	});

	describe('fetchGVL', () => {
		it('should fetch GVL from endpoint', async () => {
			const gvl = await fetchGVL();

			expect(gvl).toBeDefined();
			expect(gvl?.vendorListVersion).toBeDefined();
			expect(gvl?.purposes).toBeDefined();
			expect(gvl?.vendors).toBeDefined();
		});

		it('should include vendorIds in query params when provided', async () => {
			await fetchGVL([1, 2, 755]);

			expect(fetchMock.mockFetch).toHaveBeenCalled();
			const callUrl = fetchMock.mockFetch.mock.calls[0][0] as string;
			// URL encodes commas as %2C
			expect(callUrl).toContain('vendorIds=1%2C2%2C755');
		});

		it('should not include vendorIds when array is empty', async () => {
			await fetchGVL([]);

			const callUrl = fetchMock.mockFetch.mock.calls[0][0] as string;
			expect(callUrl).not.toContain('vendorIds');
		});

		it('should use custom endpoint when provided', async () => {
			await fetchGVL([], { endpoint: 'https://custom.endpoint.com' });

			const callUrl = fetchMock.mockFetch.mock.calls[0][0] as string;
			expect(callUrl).toContain('https://custom.endpoint.com');
		});

		it('should pass headers when provided', async () => {
			await fetchGVL([], {
				headers: { 'x-c15t-country': 'DE' },
			});

			expect(fetchMock.mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: { 'x-c15t-country': 'DE' },
				})
			);
		});

		it('should throw on fetch failure', async () => {
			fetchMock.cleanup();
			fetchMock = {
				mockFetch: vi.fn(() =>
					Promise.resolve(new Response(null, { status: 500 }))
				),
				cleanup: () => {},
			};
			globalThis.fetch = fetchMock.mockFetch as typeof fetch;

			await expect(fetchGVL()).rejects.toThrow('Failed to fetch GVL');
		});

		it('should throw on invalid GVL response', async () => {
			fetchMock.cleanup();
			fetchMock = {
				mockFetch: vi.fn(() =>
					Promise.resolve(
						new Response(JSON.stringify({ invalid: 'data' }), { status: 200 })
					)
				),
				cleanup: () => {},
			};
			globalThis.fetch = fetchMock.mockFetch as typeof fetch;

			await expect(fetchGVL()).rejects.toThrow('Invalid GVL response');
		});

		it('should return null for 204 response (non-IAB region)', async () => {
			fetchMock.cleanup();
			fetchMock = {
				mockFetch: vi.fn(() =>
					Promise.resolve(new Response(null, { status: 204 }))
				),
				cleanup: () => {},
			};
			globalThis.fetch = fetchMock.mockFetch as typeof fetch;

			const result = await fetchGVL();
			expect(result).toBeNull();
		});
	});

	describe('In-flight request deduplication', () => {
		it('should deduplicate concurrent requests', async () => {
			// Start two concurrent requests
			const promise1 = fetchGVL([1, 2]);
			const promise2 = fetchGVL([1, 2]);

			const [result1, result2] = await Promise.all([promise1, promise2]);

			// Should only fetch once
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(1);

			// Both should get the same result
			expect(result1).toBe(result2);
		});

		it('should not deduplicate concurrent requests with different vendorIds', async () => {
			// Start two concurrent requests with different vendorIds
			const promise1 = fetchGVL([1, 2]);
			const promise2 = fetchGVL([3, 4]);

			const [result1, result2] = await Promise.all([promise1, promise2]);

			// Should fetch twice (one for each set of vendorIds)
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(2);

			// Results should be different
			expect(result1).not.toBe(result2);
		});

		it('should allow new fetch after previous completes', async () => {
			await fetchGVL([1, 2]);
			await fetchGVL([1, 2]);

			// Should fetch twice since requests are sequential (not concurrent)
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('getCachedGVL', () => {
		it('should return null when no cache exists', () => {
			const cached = getCachedGVL();
			expect(cached).toBeNull();
		});

		it('should return cached GVL after fetch', async () => {
			await fetchGVL();

			const cached = getCachedGVL();
			expect(cached).not.toBeNull();
			expect(cached?.vendorListVersion).toBeDefined();
		});

		it('should return null after fetch returns 204', async () => {
			fetchMock.cleanup();
			fetchMock = {
				mockFetch: vi.fn(() =>
					Promise.resolve(new Response(null, { status: 204 }))
				),
				cleanup: () => {},
			};
			globalThis.fetch = fetchMock.mockFetch as typeof fetch;

			await fetchGVL();

			const cached = getCachedGVL();
			expect(cached).toBeNull();
		});
	});

	describe('clearGVLCache', () => {
		it('should clear memory cache', async () => {
			await fetchGVL();
			expect(getCachedGVL()).not.toBeNull();

			clearGVLCache();
			expect(getCachedGVL()).toBeNull();
		});
	});
});
