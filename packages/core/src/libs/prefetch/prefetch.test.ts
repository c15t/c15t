/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getMatchingPrefetchedInitialData,
	primePrefetchedInitialData,
} from './prefetch';

describe('prefetch utilities', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		delete (window as Window & { __c15tInitialDataPromises?: unknown })
			.__c15tInitialDataPromises;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('stores request-context metadata with canonical backend URL, credentials, and ambient GPC', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						jurisdiction: 'CCPA',
						location: { countryCode: 'US', regionCode: 'CA' },
						translations: { language: 'de', translations: {} },
						branding: 'c15t',
						gvl: null,
					}),
					{
						status: 200,
						headers: {
							'content-type': 'application/json',
						},
					}
				)
			)
		);

		const result = primePrefetchedInitialData({
			backendURL: '/api/c15t/',
			overrides: { language: 'de' },
			credentials: 'same-origin',
		});

		await expect(result).resolves.toMatchObject({
			metadata: {
				requestContext: {
					backendURL: `${window.location.origin}/api/c15t`,
					country: null,
					region: null,
					language: 'de',
					gpc: true,
					credentials: 'same-origin',
				},
			},
		});
	});

	it('finds only exact runtime-context matches', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: false,
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						jurisdiction: 'GDPR',
						location: { countryCode: 'DE', regionCode: 'BE' },
						translations: { language: 'de', translations: {} },
						branding: 'c15t',
						gvl: null,
					}),
					{
						status: 200,
						headers: {
							'content-type': 'application/json',
						},
					}
				)
			)
		);

		const dePromise = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { country: 'DE' },
		});
		await dePromise;

		const frPromise = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { country: 'FR' },
		});
		await frPromise;

		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
				overrides: { country: 'DE' },
			})
		).toBe(dePromise);
		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
			})
		).toBeUndefined();
		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
				overrides: { country: 'GB' },
			})
		).toBeUndefined();
	});

	it('does not reuse prefetched data when ambient GPC changes', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: false,
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						jurisdiction: 'CCPA',
						location: { countryCode: 'US', regionCode: 'CA' },
						translations: { language: 'en', translations: {} },
						branding: 'c15t',
						gvl: null,
					}),
					{
						status: 200,
						headers: {
							'content-type': 'application/json',
						},
					}
				)
			)
		);

		await primePrefetchedInitialData({
			backendURL: '/api/c15t',
		});

		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});

		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
			})
		).toBeUndefined();
	});
});
