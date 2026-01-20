/**
 * Tests for GVL fetching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGVLCache, fetchGVL, getCachedGVL } from '../fetch-gvl';
import { createMockGVL, setupFetchMock, setupStorageMock } from './test-setup';

describe('GVL Fetching', () => {
	let fetchMock: ReturnType<typeof setupFetchMock>;
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		// Clear cache before each test
		clearGVLCache();

		// Setup mocks
		fetchMock = setupFetchMock();
		storageMock = setupStorageMock();
	});

	afterEach(() => {
		fetchMock.cleanup();
		storageMock.cleanup();
	});

	describe('fetchGVL', () => {
		it('should fetch GVL from endpoint', async () => {
			const gvl = await fetchGVL();

			expect(gvl).toBeDefined();
			expect(gvl.vendorListVersion).toBeDefined();
			expect(gvl.purposes).toBeDefined();
			expect(gvl.vendors).toBeDefined();
		});

		it('should include vendorIds in query params when provided', async () => {
			await fetchGVL([1, 2, 755]);

			expect(fetchMock.mockFetch).toHaveBeenCalled();
			const callUrl = fetchMock.mockFetch.mock.calls[0][0] as string;
			expect(callUrl).toContain('vendorIds=1,2,755');
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

		it('should cache the result in memory', async () => {
			await fetchGVL([1, 2]);
			await fetchGVL([1, 2]);

			// Should only fetch once due to cache
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should bypass cache when bypassCache is true', async () => {
			await fetchGVL([1, 2]);
			await fetchGVL([1, 2], { bypassCache: true });

			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(2);
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
	});

	describe('clearGVLCache', () => {
		it('should clear memory cache', async () => {
			await fetchGVL();
			expect(getCachedGVL()).not.toBeNull();

			clearGVLCache();
			expect(getCachedGVL()).toBeNull();
		});

		it('should clear localStorage cache', async () => {
			await fetchGVL();

			clearGVLCache();

			// Should need to fetch again
			await fetchGVL();
			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('Cache Validation', () => {
		it('should serve from cache when vendor IDs are subset', async () => {
			// First fetch with vendors 1, 2, 10
			await fetchGVL([1, 2, 10]);

			// Second fetch with subset (1, 2) should use cache
			await fetchGVL([1, 2]);

			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should not serve from cache when requesting new vendor IDs', async () => {
			// First fetch with vendors 1, 2
			await fetchGVL([1, 2]);

			// Second fetch with new vendor (755) should fetch again
			await fetchGVL([1, 2, 755]);

			expect(fetchMock.mockFetch).toHaveBeenCalledTimes(2);
		});
	});
});
