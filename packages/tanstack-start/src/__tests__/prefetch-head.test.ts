/**
 * `consentPrefetchHead()` starts the init request before hydration; the
 * boundary must find that promise again so the provider consumes it
 * instead of issuing a second request.
 */
import { primePrefetchedInitialData } from '@c15t/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	consentPrefetchHead,
	readPrefetchedInitialData,
} from '../libs/prefetch-head';

const ORIGIN = 'https://app.example.com';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('consentPrefetchHead', () => {
	test('returns a head() fragment with one inline script', () => {
		const head = consentPrefetchHead({ backendURL: '/api/c15t' });
		expect(head.scripts).toHaveLength(1);
		expect(head.scripts[0]?.id).toBe('c15t-initial-data-prefetch');
		expect(head.scripts[0]?.children).toContain('/init');
	});
});

describe('readPrefetchedInitialData', () => {
	test('is undefined on the server', () => {
		expect(
			readPrefetchedInitialData({
				backendURL: `${ORIGIN}/consent`,
				initRoute: undefined,
				overrides: undefined,
			})
		).toBeUndefined();
	});

	test('finds the promise a head prefetch stored for the init route base', async () => {
		vi.stubGlobal('window', {
			location: { hostname: 'app.example.com', origin: ORIGIN },
		});
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ policy: { id: 'prefetched' } }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		vi.stubGlobal('fetch', fetchSpy);

		const primed = primePrefetchedInitialData({
			backendURL: `${ORIGIN}/api/c15t`,
		});
		const found = readPrefetchedInitialData({
			backendURL: 'https://consent.example.com',
			initRoute: `${ORIGIN}/api/c15t/init`,
			overrides: undefined,
		});

		expect(found).toBe(primed);
		await expect(found).resolves.toMatchObject({
			init: { policy: { id: 'prefetched' } },
		});
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('matches a head prefetch that carried the boundary GPC override', () => {
		vi.stubGlobal('window', {
			location: { hostname: 'app.example.com', origin: ORIGIN },
			navigator: { globalPrivacyControl: false },
		});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));

		const primed = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { gpc: true },
		});
		expect(
			readPrefetchedInitialData({
				backendURL: '/api/c15t',
				initRoute: undefined,
				overrides: { gpc: true },
			})
		).toBe(primed);
		expect(
			readPrefetchedInitialData({
				backendURL: '/api/c15t',
				initRoute: undefined,
				overrides: undefined,
			})
		).toBeUndefined();
	});
});
