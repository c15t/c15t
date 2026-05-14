/**
 * MSW Handlers for IAB E2E Tests
 *
 * Network-level mocks for GVL and other IAB-related endpoints.
 */

import { HttpResponse, http } from 'msw';
import { mockGVL } from './fixtures/mock-consent-state';

/**
 * Default handlers for IAB tests
 */
export const handlers = [
	// Mock GVL endpoint - use wildcard pattern to match with or without trailing slash and query params
	http.get('https://gvl.consent.io*', ({ request }) => {
		console.log('[MSW] GVL request intercepted:', request.url);
		const url = new URL(request.url);
		const vendorIds = url.searchParams.get('vendorIds');

		// If specific vendor IDs requested, filter the GVL
		if (vendorIds) {
			const ids = vendorIds.split(',').map(Number);
			const filteredVendors: typeof mockGVL.vendors = {};
			for (const id of ids) {
				if (mockGVL.vendors[id]) {
					filteredVendors[id] = mockGVL.vendors[id];
				}
			}
			return HttpResponse.json({
				...mockGVL,
				vendors: filteredVendors,
			});
		}

		return HttpResponse.json(mockGVL);
	}),
];

/**
 * Handler that returns 204 (non-IAB region)
 */
export const nonIABRegionHandler = http.get('https://gvl.consent.io*', () => {
	console.log('[MSW] Returning 204 (non-IAB region)');
	return new HttpResponse(null, { status: 204 });
});

/**
 * Handler that returns an error
 */
export const errorHandler = http.get('https://gvl.consent.io*', () => {
	console.log('[MSW] Returning error');
	return HttpResponse.error();
});

/**
 * Handler that returns invalid GVL data
 */
export const invalidGVLHandler = http.get('https://gvl.consent.io*', () => {
	console.log('[MSW] Returning invalid GVL');
	return HttpResponse.json({ invalid: 'data' });
});
