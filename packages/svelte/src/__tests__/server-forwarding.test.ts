import { createConsentKernel } from '@c15t/core';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
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
test.each([undefined, 'fr-CA'])(
	'Svelte server init forwards request headers with language override %s',
	async (language) => {
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
			language,
			now,
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		const headers = new Headers(fetch.mock.calls[0]?.[1].headers);
		expect(Object.fromEntries(headers)).toMatchObject({
			'accept-language': language ?? 'de-DE',
			cookie: 'session=literal',
			'sec-gpc': '1',
			'x-c15t-country': 'DE',
			'x-c15t-policy-contract': '1',
			'x-c15t-region': 'BE',
			'x-review': 'review',
		});
	}
);
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

test.each(['public', 'cookie', 'header', 'custom-fetch'] as const)(
	'hosted Svelte retains GVL with %s access',
	async (access) => {
		const { completeGVL } =
			await import('../../../iab/src/__tests__/fixtures/gvl-sample');
		const headers = new Headers();
		if (access === 'cookie') {
			headers.set('cookie', 'session=private');
		}
		if (access === 'header') {
			headers.set('authorization', 'Bearer private');
		}
		const fetch = vi.fn().mockResolvedValue(
			Response.json(
				{
					cmpId: 28,
					gvl: completeGVL,
					location: { countryCode: 'DE', regionCode: null },
					policyResolution: writePolicyResolutionWire(
						resolvePolicyRules({
							countryCode: 'DE',
							regionCode: null,
							rules: [
								{
									id: 'iab',
									match: { isDefault: true },
									model: 'iab',
									prompt: 'choice',
								},
							],
						})
					),
					translations: { language: 'en', translations: {} },
				},
				{ headers: { 'x-c15t-policy-contract': '1' } }
			)
		);
		vi.stubGlobal('fetch', fetch);
		try {
			const config = await prefetchInitialConsent({
				backendURL: 'https://private.test',
				fetch: access === 'custom-fetch' ? fetch : undefined,
				forwardHeaders: access === 'header' ? ['authorization'] : undefined,
				headers,
			});
			expect(Boolean(config.initialIab?.gvl)).toBe(access !== 'public');
			expect(Boolean(config.initialIab?.gvlReference)).toBe(
				access === 'public'
			);
			expect(JSON.stringify(config)).not.toContain('Bearer private');
		} finally {
			vi.unstubAllGlobals();
		}
	}
);
