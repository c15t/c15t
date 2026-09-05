import { createConsentKernel } from '@c15t/core';
import { expect, test, vi } from 'vitest';

import {
	readInitialConsentConfig,
	prefetchInitialConsent,
} from '../lib/server';

const now = 1780000000000;
test('Svelte raw Sec-GPC stays separate from developer override', async () => {
	const config = await readInitialConsentConfig({
		headers: new Headers({ 'sec-gpc': '1' }),
		now,
	});
	expect(config.initialPrivacySignals).toEqual({ gpc: true });
	expect(config.initialOverrides?.gpc).toBeUndefined();
});
test('Svelte server init forwards cookie, signal, geo, language and explicit custom headers', async () => {
	const fetch = vi.fn().mockResolvedValue(
		new Response(
			JSON.stringify({
				location: { countryCode: null, regionCode: null },
				policyResolution: { policy: null, status: 'no-match', version: 1 },
				translations: { language: 'en', translations: {} },
			}),
			{ headers: { 'x-c15t-policy-contract': '1' } }
		)
	);
	await prefetchInitialConsent({
		backendURL: 'https://backend.test',
		fetch,
		forwardHeaders: ['x-review'],
		headers: new Headers({
			'accept-language': 'de-DE',
			cookie: 'session=literal',
			'sec-gpc': '1',
			'x-review': 'review',
			'x-vercel-ip-country': 'DE',
			'x-vercel-ip-country-region': 'BE',
		}),
		now,
	});
	expect(fetch).toHaveBeenCalledTimes(1);
	const headers = new Headers(fetch.mock.calls[0]?.[1].headers);
	expect(Object.fromEntries(headers)).toMatchObject({
		'accept-language': 'de-DE',
		cookie: 'session=literal',
		'sec-gpc': '1',
		'x-c15t-country': 'DE',
		'x-c15t-policy-contract': '1',
		'x-c15t-region': 'BE',
		'x-review': 'review',
	});
});
test('Svelte prefetch preserves a backend literal subject without manufacturing consent', async () => {
	const fetch = vi.fn().mockResolvedValue(
		new Response(
			JSON.stringify({
				consents: { marketing: true },
				hasConsented: true,
				location: { countryCode: null, regionCode: null },
				policyResolution: { policy: null, status: 'no-match', version: 1 },
				subjectId: 'backend+literal',
				translations: { language: 'en', translations: {} },
			}),
			{ headers: { 'x-c15t-policy-contract': '1' } }
		)
	);
	const config = await prefetchInitialConsent({
		backendURL: 'https://backend.test',
		fetch,
		headers: new Headers(),
		now,
	});
	const kernel = createConsentKernel(config);
	try {
		expect(kernel.getSnapshot().subject?.subjectId).toBe('backend+literal');
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	} finally {
		kernel.dispose();
	}
});
