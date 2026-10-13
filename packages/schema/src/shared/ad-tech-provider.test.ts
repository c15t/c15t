import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	AD_TECH_PROVIDER_FETCH_TIMEOUT_MS,
	adTechProviderFetchSignal,
	adTechProviderListUrl,
	MAX_AD_TECH_PROVIDER_QUERY_IDS,
	normalizeAdTechProviderIds,
	parseAdTechProviderList,
} from './ad-tech-provider';
import { buildConsentManifestFromConfig } from './consent-manifest';

const payload = {
	providers: {
		'2577': {
			id: 2577,
			name: ' Second ',
			policyUrl: 'https://second.example/privacy',
		},
		'89': { id: 89, name: 'First', policyUrl: 'https://first.example/p' },
		'99': { id: 99, name: 'Unrequested', policyUrl: 'https://x.example' },
		bad: { id: 5, name: 'No URL', policyUrl: 'ftp://files.example/privacy' },
	},
};

describe('Google Additional Consent provider lists', () => {
	test('keep requested providers Google lists, sorted by ID', () => {
		expect(parseAdTechProviderList(payload, [89, 2577, 5, 404])).toEqual([
			{ id: 89, name: 'First', policyUrl: 'https://first.example/p' },
			{ id: 2577, name: 'Second', policyUrl: 'https://second.example/privacy' },
		]);
	});

	test('reject a response without a provider map', () => {
		expect(parseAdTechProviderList({}, [89])).toBeNull();
		expect(parseAdTechProviderList(null, [89])).toBeNull();
	});

	test('carry the filter until it no longer fits a request line', () => {
		expect(
			adTechProviderListUrl('/ac', normalizeAdTechProviderIds([2577, 89, 89]))
		).toBe('/ac?providerIds=89%2C2577');
		const many = Array.from(
			{ length: MAX_AD_TECH_PROVIDER_QUERY_IDS + 1 },
			(_, index) => index + 1
		);
		expect(adTechProviderListUrl('/ac', many)).toBe('/ac');
	});
});

describe('manifest Additional Consent', () => {
	test('lists normalized providers with the default endpoint', async () => {
		const manifest = await buildConsentManifestFromConfig({
			iab: {
				additionalConsent: { providers: [2572, 89, 89, 0] },
				enabled: true,
			},
		});
		expect(manifest.iab?.additionalConsent).toEqual({
			providers: [89, 2572],
			url: 'https://gvl.inth.app/additional-consent',
		});
	});

	test('leaves an unconfigured manifest and its revision unchanged', async () => {
		const plain = await buildConsentManifestFromConfig({
			iab: { enabled: true },
		});
		const empty = await buildConsentManifestFromConfig({
			iab: { additionalConsent: { providers: [] }, enabled: true },
		});
		expect(plain.iab).not.toHaveProperty('additionalConsent');
		expect(empty.revision).toBe(plain.revision);
	});
});

describe('provider list request timeout', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test('aborts without AbortSignal.timeout, so the IAB runtime is not held', () => {
		vi.useFakeTimers();
		vi.stubGlobal('AbortSignal', { timeout: undefined });

		const signal = adTechProviderFetchSignal();

		expect(signal?.aborted).toBe(false);
		vi.advanceTimersByTime(AD_TECH_PROVIDER_FETCH_TIMEOUT_MS);
		expect(signal?.aborted).toBe(true);
	});
});
