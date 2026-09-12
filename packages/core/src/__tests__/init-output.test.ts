/**
 * Shared InitOutput/InitResponse mapping — the single fold every framework
 * server helper and transport uses (shared-logic audit #4).
 */
import { enTranslations } from '@c15t/translations';
import { describe, expect, test } from 'vitest';

import {
	initOutputToKernelConfig,
	kernelConfigToInitResponse,
	mapInitOutputToInitResponse,
	mergeInitResponseIntoKernelConfig,
} from '../transports/init-output';
import type { KernelConfig } from '../types';
import { matchedResolution, optInRule } from './fixtures/kernel-fixtures';

const POLICY = {
	...matchedResolution(optInRule({ id: 'p1' })),
	version: 1 as const,
};

const BASE_PAYLOAD = {
	location: { countryCode: 'DE', regionCode: null },
	translations: {
		language: 'en',
		translations: {},
	},
	// oxlint-disable-next-line typescript/no-explicit-any -- minimal rich-init fixture
} as any;

describe('mapInitOutputToInitResponse: consent inference', () => {
	test('receipt-free booleans cannot seed authority', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true } },
			{}
		);
		expect(mapped).not.toHaveProperty('consents');
		// Without this, opt-in fresh-visitor defaults would reset the values
		// and re-show the banner — and the client fold would disagree with
		// the server prefetch merge.
		expect(mapped).not.toHaveProperty('hasConsented');
	});

	test('legacy false marker is not forwarded', () => {
		const mapped = mapInitOutputToInitResponse(
			{ ...BASE_PAYLOAD, consents: { marketing: true }, hasConsented: false },
			{}
		);
		expect(mapped).not.toHaveProperty('hasConsented');
	});

	test('legacy true marker is not forwarded', () => {
		expect(mapInitOutputToInitResponse(BASE_PAYLOAD, {})).not.toHaveProperty(
			'hasConsented'
		);
		expect(
			mapInitOutputToInitResponse({ ...BASE_PAYLOAD, hasConsented: true }, {})
		).not.toHaveProperty('hasConsented');
	});
});

describe('mergeInitResponseIntoKernelConfig', () => {
	test('undefined response returns base untouched', () => {
		const base = { initialRecords: { subject: { subjectId: 'sub_1' } } };
		expect(mergeInitResponseIntoKernelConfig(base, undefined)).toBe(base);
	});

	test('derives overrides from location/translations; resolvedOverrides win', () => {
		const merged = mergeInitResponseIntoKernelConfig(
			{ initialOverrides: { gpc: true, language: 'en' } },
			{
				location: { countryCode: 'DE', regionCode: 'BE' },
				resolvedOverrides: { country: 'FR' },
				translations: { language: 'de', translations: enTranslations },
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

	test('init preserves the local draft without accepting server draft input', () => {
		const response = { consents: { marketing: true }, resolvedOverrides: {} };
		const merged = mergeInitResponseIntoKernelConfig(
			{ initialDraft: { measurement: false } },
			response
		);
		expect(merged.initialDraft).toEqual({ measurement: false });
		expect(merged).not.toHaveProperty('initialHasConsented');
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
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal fixture
				policyResolution: POLICY,
				policySnapshotToken: 'tok',

				subjectId: 'sub_9',
			}
		);
		expect(merged.initialRecords?.subject?.subjectId).toBe('sub_9');
		expect(merged.initialPolicyResolution).toMatchObject({
			policyId: 'p1',
			status: 'matched',
		});
		expect(merged).not.toHaveProperty('initialPolicyDecision');
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
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
				policyResolution: POLICY,

				translations: { language: 'de', translations: enTranslations },
			},
			{ 'sec-gpc': '1' }
		);
		expect(config.initialOverrides).toEqual({
			country: 'DE',
			language: 'de',
		});
		// The detected header signal is a privacy signal, not an override.
		expect(config.initialPrivacySignals).toEqual({ gpc: true });
		expect(config.initialPolicyResolution).toMatchObject({
			policyId: 'p1',
			status: 'matched',
		});
		expect(config.initialBranding).toBe('c15t');
		// A producer that sent no `policyResolution` and declared no contract
		// is a legacy producer: its policy is lifted on the server, once.
		expect(config.initialPolicyResolution).toMatchObject({
			policyId: 'p1',
			status: 'matched',
		});
	});
});

describe('kernelConfigToInitResponse', () => {
	test('round-trips policy outcomes, records, signals and metadata', () => {
		const records = {
			choice: null,
			now: 1700000000000,
			subject: { subjectId: 'sub_cookie' },
		};
		const resolutions = [
			matchedResolution(optInRule({ id: 'p1' })),
			{ policy: null, status: 'no-match' },
			{ policy: null, status: 'unconfigured' },
			{ policy: null, reason: 'transport', status: 'failed' },
		] as const;
		for (const initialPolicyResolution of resolutions) {
			const base: KernelConfig = { initialRecords: records };
			const config: KernelConfig = {
				...base,
				initialBranding: 'c15t',
				initialLocation: { countryCode: 'DE', regionCode: null },
				initialOverrides: { country: 'DE', gpc: false, language: 'de' },
				initialPolicyResolution,
				initialPrivacySignals: { gpc: true },
				initialTranslations: { language: 'de', translations: enTranslations },
			};
			if (initialPolicyResolution.status === 'matched') {
				config.initialIab = {
					cmpId: 28,
					customVendors: [],
					enabled: false,
					gvl: null,
				};
				config.initialPolicySnapshotToken = 'token';
			}

			expect(
				mergeInitResponseIntoKernelConfig(
					base,
					kernelConfigToInitResponse(config)
				)
			).toEqual(config);
		}
	});
	test('leaves records-only configurations for the transport to resolve', () => {
		expect(
			kernelConfigToInitResponse({ initialRecords: { choice: null } })
		).toBeUndefined();
	});
	test('does not serialize transport or empty overrides', () => {
		const response = kernelConfigToInitResponse({
			initialOverrides: {},
			initialPolicyResolution: matchedResolution(optInRule()),
			transport: { init: () => Promise.resolve({}) },
		});
		expect(response).not.toHaveProperty('transport');
		expect(response).not.toHaveProperty('resolvedOverrides');
		expect(response?.policyResolution?.status).toBe('matched');
	});
});
