/**
 * Wiring tests for `resolveConsent` from `@c15t/svelte/server` on top of
 * `resolveRequestConsent` in `@c15t/core/server`, whose suite pins the
 * rules (GPC source, forwarding, self-route guard, budget, merge). These
 * check what this entry passes: the headers, the request URL, the cookie
 * header and the framework fetch.
 */
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { MANIFEST_FIXTURE } from '../../lib/kit/__tests__/manifest-fixture';
import { resolveConsent } from '../../lib/server';

const INIT = {
	branding: 'c15t',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					id: 'gdpr',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		})
	),
	translations: { language: 'de', translations: {} },
};

const backend = () =>
	vi.fn<typeof globalThis.fetch>(() =>
		Promise.resolve(
			new Response(JSON.stringify(INIT), {
				headers: { 'x-c15t-policy-contract': '1' },
			})
		)
	);

describe('@c15t/svelte/server resolveConsent', () => {
	test('hands a snapshot session report to the caller before it finishes', async () => {
		let finish: ((response: Response) => void) | undefined;
		const fetch = vi.fn<typeof globalThis.fetch>(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		const onBackgroundRevalidate = vi.fn();
		const state = await resolveConsent({
			backendURL: 'https://consent.example.com',
			fetch,
			headers: new Headers({ 'cf-ipcountry': 'DE' }),
			manifest: MANIFEST_FIXTURE,
			onBackgroundRevalidate,
		});
		expect(state.initialPolicyResolution?.status).toBe('matched');
		expect(fetch).toHaveBeenCalledWith(
			'https://consent.example.com/sessions',
			expect.objectContaining({ method: 'POST' })
		);
		expect(onBackgroundRevalidate).toHaveBeenCalledTimes(1);
		const task = onBackgroundRevalidate.mock.calls[0]?.[0];
		expect(task).toBeInstanceOf(Promise);
		finish?.(new Response(null, { status: 204 }));
		await task;
	});

	test.each([
		{
			backendURL: 'https://consent.example.com',
			country: 'DE',
			language: 'de',
			policyId: 'eu-opt-in',
		},
		{
			backendURL: undefined,
			country: 'US',
			language: 'en',
			policyId: 'notice-default',
		},
	])(
		'resolves a snapshot for $country without fetching policy',
		async ({ backendURL, country, language, policyId }) => {
			const fetch = backend();
			const state = await resolveConsent({
				backendURL,
				fetch,
				headers: new Headers({
					'accept-language': language,
					'cf-ipcountry': country,
					cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1234567890',
					'sec-gpc': '1',
				}),
				manifest: MANIFEST_FIXTURE,
				reportSessions: false,
			});
			expect(fetch).not.toHaveBeenCalled();
			expect(state.initialPolicyResolution).toMatchObject({
				policyId,
				status: 'matched',
			});
			expect(state.initialTranslations?.language).toBe(language);
			expect(state.initialRecords?.choice?.categories.marketing?.value).toBe(
				true
			);
			expect(state.initialPrivacySignals).toEqual({ gpc: true });
		}
	);

	test('reads geo, language and the consent cookie without a backend', async () => {
		const fetch = backend();
		const state = await resolveConsent({
			fetch,
			headers: new Headers({
				'accept-language': 'de-DE,de;q=0.9',
				'cf-ipcountry': 'DE',
				cookie: 'c15t=c.necessary:1,c.marketing:1,i.t:1234567890',
			}),
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(state.initialOverrides).toEqual({ country: 'DE', language: 'de' });
		expect(state.initialRecords?.choice?.categories.marketing?.value).toBe(
			true
		);
		expect(state.initialPrivacySignals).toEqual({ gpc: undefined });
	});

	test('resolves a relative backend against requestURL and forwards the consent cookie alone', async () => {
		const fetch = backend();
		const state = await resolveConsent({
			backendURL: '/consent',
			fetch,
			headers: new Headers({
				cookie: 'session=secret; c15t=stored',
				'x-forwarded-host': 'attacker.example',
			}),
			requestURL: 'https://app.example.com/page',
		});
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://app.example.com/consent/init'
		);
		const sent = new Headers(fetch.mock.calls[0]?.[1]?.headers);
		expect(sent.get('cookie')).toBe('c15t=stored');
		expect(state.initialPolicyResolution?.status).toBe('matched');
	});

	test('a framework fetch answers same-origin backends in-process', async () => {
		const fetch = backend();
		const frameworkFetch = backend();
		await resolveConsent({
			backendURL: 'https://app.example.com/api/self-host',
			fetch,
			frameworkFetch,
			headers: new Headers(),
			requestURL: 'https://app.example.com/',
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(frameworkFetch.mock.calls[0]?.[0]).toBe('/api/self-host/init');
	});

	test('a failed backend leaves the request-only state', async () => {
		const state = await resolveConsent({
			backendURL: 'https://api.example.com',
			fetch: vi.fn<typeof globalThis.fetch>(() =>
				Promise.reject(new Error('down'))
			),
			headers: new Headers({ 'cf-ipcountry': 'DE' }),
		});
		expect(state.initialOverrides?.country).toBe('DE');
		expect(state.initialPolicyResolution).toBeUndefined();
	});
});
