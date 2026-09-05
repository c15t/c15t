/**
 * Shared InitOutput/InitResponse mapping — the single fold every framework
 * server helper and transport uses (shared-logic audit #4).
 */
import { describe, expect, test } from 'vitest';

import {
	initOutputToKernelConfig,
	mapInitOutputToInitResponse,
	mergeInitResponseIntoKernelConfig,
} from '../transports/init-output';

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
		expect(config.initialOverrides).toEqual({
			country: 'DE',
			language: 'de',
		});
		// The detected header signal is a privacy signal, not an override.
		expect(config.initialPrivacySignals).toEqual({ gpc: true });
		expect(config.initialPolicy?.id).toBe('p1');
		expect(config.initialBranding).toBe('c15t');
		// A producer that sent no `policyResolution` and declared no contract
		// is a legacy producer: its policy is lifted on the server, once.
		expect(config.initialPolicyResolution).toMatchObject({
			policyId: 'p1',
			status: 'matched',
		});
	});
});
