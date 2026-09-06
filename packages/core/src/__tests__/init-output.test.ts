/**
 * Shared InitOutput/InitResponse mapping — the single fold every framework
 * server helper and transport uses (shared-logic audit #4).
 */
import { describe, expect, test } from 'vitest';

import {
	initOutputToKernelConfig,
	kernelConfigToInitResponse,
	mapInitOutputToInitResponse,
	mergeInitResponseIntoKernelConfig,
} from '../transports/init-output';
import type { KernelConfig } from '../types';

const BASE_PAYLOAD = {
	location: { countryCode: 'DE', regionCode: null },
	translations: {
		language: 'en',
		translations: {},
	},
	// oxlint-disable-next-line typescript/no-explicit-any -- minimal rich-init fixture
} as any;

describe('mapInitOutputToInitResponse: consent inference', () => {
	test('consent-bearing payload implies hasConsented', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true } },
			{}
		);
		expect(mapped.consents).toEqual({ marketing: true });
		// Without this, opt-in fresh-visitor defaults would reset the values
		// and re-show the banner — and the client fold would disagree with
		// the server prefetch merge.
		expect(mapped.hasConsented).toBe(true);
	});

	test('explicit hasConsented: false wins over the inference', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true }, hasConsented: false },
			{}
		);
		expect(mapped.hasConsented).toBe(false);
	});

	test('no consents → hasConsented passes through untouched', () => {
		expect(
			mapInitOutputToInitResponse(BASE_PAYLOAD, {}).hasConsented
		).toBeUndefined();
		expect(
			mapInitOutputToInitResponse({ ...BASE_PAYLOAD, hasConsented: true }, {})
				.hasConsented
		).toBe(true);
	});
});

describe('mergeInitResponseIntoKernelConfig', () => {
	test('undefined response returns base untouched', () => {
		const base = { initialSubjectId: 'sub_1' };
		expect(mergeInitResponseIntoKernelConfig(base, undefined)).toBe(base);
	});

	test('derives overrides from location/translations; resolvedOverrides win', () => {
		const merged = mergeInitResponseIntoKernelConfig(
			{ initialOverrides: { gpc: true, language: 'en' } },
			{
				location: { countryCode: 'DE', regionCode: 'BE' },
				resolvedOverrides: { country: 'FR' },
				translations: { language: 'de', translations: {} },
			}
		);
		// base < derived < resolvedOverrides
		expect(merged.initialOverrides).toEqual({
			country: 'FR',
			gpc: true,
			language: 'de',
			region: 'BE',
		});
	});

	test('consents merge implies hasConsented; explicit false wins', () => {
		const inferred = mergeInitResponseIntoKernelConfig(
			{},
			{ consents: { marketing: true } }
		);
		expect(inferred.initialConsents).toEqual({ marketing: true });
		expect(inferred.initialHasConsented).toBe(true);

		const explicit = mergeInitResponseIntoKernelConfig(
			{},
			{ consents: { marketing: true }, hasConsented: false }
		);
		expect(explicit.initialHasConsented).toBe(false);
	});

	test("branding 'none' is filtered — KernelBranding has no 'none'", () => {
		const merged = mergeInitResponseIntoKernelConfig(
			{},
			// oxlint-disable-next-line typescript/no-explicit-any -- backend can send 'none'
			{ branding: 'none' as any }
		);
		expect(merged.initialBranding).toBeUndefined();
		expect(
			mergeInitResponseIntoKernelConfig({}, { branding: 'c15t' })
				.initialBranding
		).toBe('c15t');
	});

	test('policy trio + subjectId fold through', () => {
		const merged = mergeInitResponseIntoKernelConfig(
			{},
			{
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
				policy: { id: 'p1', model: 'opt-in', ui: { mode: 'banner' } } as any,
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal fixture
				policyDecision: { policyId: 'p1' } as any,
				policySnapshotToken: 'tok',

				subjectId: 'sub_9',
			}
		);
		expect(merged.initialSubjectId).toBe('sub_9');
		expect(merged.initialPolicy?.id).toBe('p1');
		expect(merged.initialPolicyDecision).toBeDefined();
		expect(merged.initialPolicySnapshotToken).toBe('tok');
	});

	test('IAB folding: gvl null disables, fields accumulate', () => {
		const withGvl = mergeInitResponseIntoKernelConfig(
			{},
			// oxlint-disable-next-line typescript/no-explicit-any -- minimal gvl fixture
			{ cmpId: 28, gvl: { vendors: {} } as any }
		);
		expect(withGvl.initialIab?.enabled).toBe(true);
		expect(withGvl.initialIab?.cmpId).toBe(28);

		const disabled = mergeInitResponseIntoKernelConfig({}, { gvl: null });
		expect(disabled.initialIab?.enabled).toBe(false);
	});

	test('initOutputToKernelConfig wraps the full pipeline', () => {
		const config = initOutputToKernelConfig(
			{
				branding: 'c15t',
				location: { countryCode: 'DE', regionCode: null },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
				policy: { id: 'p1', model: 'opt-in', ui: { mode: 'banner' } } as any,

				translations: { language: 'de', translations: {} },
			},
			{ 'sec-gpc': '1' }
		);
		expect(config.initialOverrides).toMatchObject({
			country: 'DE',
			gpc: true,
			language: 'de',
		});
		expect(config.initialPolicy?.id).toBe('p1');
		expect(config.initialBranding).toBe('c15t');
	});
});

describe('kernelConfigToInitResponse', () => {
	const BANNER_POLICY = {
		id: 'gdpr',
		model: 'opt-in',
		ui: { mode: 'banner' },
		// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
	} as any;

	// Init payloads a hosted `/init` or the manifest transport can produce,
	// covering every field the merge folds into a KernelConfig.
	const INIT_OUTPUTS = [
		{ ...BASE_PAYLOAD, branding: 'c15t', policy: BANNER_POLICY },
		{ ...BASE_PAYLOAD, branding: 'none', policy: BANNER_POLICY },
		{
			...BASE_PAYLOAD,
			branding: 'c15t',
			consents: { marketing: true, measurement: false },
			policy: BANNER_POLICY,
			subjectId: 'sub_9',
		},
		{
			...BASE_PAYLOAD,
			branding: 'c15t',
			consents: { marketing: true },
			hasConsented: false,
			policy: BANNER_POLICY,
		},
		{
			...BASE_PAYLOAD,
			branding: 'c15t',
			cmpId: 28,
			customVendors: [{ id: 'v1', name: 'Vendor' }],
			gvl: { vendors: {} },
			policy: BANNER_POLICY,
			policyDecision: { policyId: 'gdpr' },
			policySnapshotToken: 'tok',
		},
		{
			...BASE_PAYLOAD,
			branding: 'c15t',
			location: { countryCode: 'US', regionCode: 'CA' },
			policy: BANNER_POLICY,
			resolvedOverrides: { country: 'FR' },
			translations: { language: 'fr', translations: {} },
		},
	];

	const BASES: KernelConfig[] = [
		{},
		{ initialOverrides: { gpc: true, language: 'en' } },
		{
			initialConsents: { functionality: true },
			initialHasConsented: true,
			initialSubjectId: 'sub_cookie',
		},
		{ initialIab: { cmpId: 1, enabled: true } },
	];

	const HEADERS = [{}, { 'sec-gpc': '1' }, { 'sec-gpc': '0' }];

	test('round-trips every merged config back through the merge', () => {
		for (const base of BASES) {
			for (const payload of INIT_OUTPUTS) {
				for (const headers of HEADERS) {
					const merged = mergeInitResponseIntoKernelConfig(
						base,
						mapInitOutputToInitResponse(payload, headers)
					);
					const roundTripped = mergeInitResponseIntoKernelConfig(
						base,
						kernelConfigToInitResponse(merged)
					);
					expect(roundTripped).toEqual(merged);
				}
			}
		}
	});

	test('returns undefined when the config carries no policy', () => {
		expect(kernelConfigToInitResponse({})).toBeUndefined();
		expect(
			kernelConfigToInitResponse({
				initialConsents: { marketing: true },
				initialHasConsented: true,
				initialOverrides: { country: 'DE' },
				initialSubjectId: 'sub_cookie',
			})
		).toBeUndefined();
	});

	test('maps every init-derived field to its response key', () => {
		const response = kernelConfigToInitResponse({
			initialBranding: 'c15t',
			initialConsents: { marketing: true },
			initialHasConsented: false,
			initialIab: { cmpId: 28, customVendors: [], enabled: false, gvl: null },
			initialLocation: { countryCode: 'DE', regionCode: null },
			initialOverrides: { country: 'DE', language: 'de' },
			initialPolicy: BANNER_POLICY,
			// oxlint-disable-next-line typescript/no-explicit-any -- minimal fixture
			initialPolicyDecision: { policyId: 'gdpr' } as any,
			initialPolicySnapshotToken: 'tok',
			initialSubjectId: 'sub_9',
			initialTranslations: { language: 'de', translations: {} },
		});
		expect(response).toEqual({
			branding: 'c15t',
			cmpId: 28,
			consents: { marketing: true },
			customVendors: [],
			gvl: null,
			hasConsented: false,
			location: { countryCode: 'DE', regionCode: null },
			policy: BANNER_POLICY,
			policyDecision: { policyId: 'gdpr' },
			policySnapshotToken: 'tok',
			resolvedOverrides: { country: 'DE', language: 'de' },
			subjectId: 'sub_9',
			translations: { language: 'de', translations: {} },
		});
	});

	test('leaves empty overrides and the transport out of the response', () => {
		expect(
			kernelConfigToInitResponse({
				initialOverrides: {},
				initialPolicy: BANNER_POLICY,
				transport: { init: () => Promise.resolve({}) },
			})
		).toEqual({ policy: BANNER_POLICY });
	});
});
