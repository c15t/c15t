/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	buildPrefetchScript,
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
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					branding: 'c15t',
					gvl: null,
					jurisdiction: 'CCPA',
					location: { countryCode: 'US', regionCode: 'CA' },
					translations: { language: 'de', translations: {} },
				}),
				{
					headers: {
						'content-type': 'application/json',
					},
					status: 200,
				}
			)
		);
		vi.stubGlobal('fetch', fetchMock);

		const result = primePrefetchedInitialData({
			backendURL: '/api/c15t/',
			credentials: 'same-origin',
			overrides: { language: 'de' },
		});

		await expect(result).resolves.toMatchObject({
			metadata: {
				requestContext: {
					backendURL: `${window.location.origin}/api/c15t`,
					country: null,
					credentials: 'same-origin',
					gpc: true,
					language: 'de',
					region: null,
				},
			},
		});
		expect(fetchMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-c15t-version': expect.any(String),
				}),
			})
		);
	});

	it('includes the c15t version header in generated prefetch scripts', () => {
		const script = buildPrefetchScript({
			backendURL: '/api/c15t',
			overrides: { country: 'DE' },
		});

		expect(script).toContain('"x-c15t-version"');
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
						branding: 'c15t',
						gvl: null,
						jurisdiction: 'GDPR',
						location: { countryCode: 'DE', regionCode: 'BE' },
						translations: { language: 'de', translations: {} },
					}),
					{
						headers: {
							'content-type': 'application/json',
						},
						status: 200,
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
						branding: 'c15t',
						gvl: null,
						jurisdiction: 'CCPA',
						location: { countryCode: 'US', regionCode: 'CA' },
						translations: { language: 'en', translations: {} },
					}),
					{
						headers: {
							'content-type': 'application/json',
						},
						status: 200,
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
