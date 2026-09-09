import type { KernelTranslations } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import { decisionInputsFromConfig } from '../libs/decision-seed';
import { policyFixture } from './policy-fixture';

const NO_TRANSLATIONS = {} as KernelTranslations['translations'];

describe('decisionInputsFromConfig', () => {
	test('is undefined without a resolved policy decision', () => {
		expect(decisionInputsFromConfig(undefined)).toBeUndefined();
		expect(
			decisionInputsFromConfig({
				initialTranslations: { language: 'en', translations: NO_TRANSLATIONS },
			})
		).toBeUndefined();
	});

	test('maps the prefetched decision into transport inputs', () => {
		expect(
			decisionInputsFromConfig({
				initialLocation: { countryCode: 'DE', regionCode: 'BE' },
				initialOverrides: { gpc: true },
				...policyFixture({}, { id: 'eu-opt-in' }),
				initialTranslations: { language: 'de', translations: NO_TRANSLATIONS },
			})
		).toEqual({
			country: 'DE',
			fingerprint: expect.any(String),
			gpc: true,
			language: 'de',
			policyId: 'eu-opt-in',
			region: 'BE',
		});
	});
});

describe('decisionInputsFromConfig: client overrides', () => {
	const config = {
		initialLocation: { countryCode: 'DE', regionCode: null },
		initialOverrides: { gpc: false },
		...policyFixture({}, { id: 'eu-opt-in' }),
		initialTranslations: { language: 'de', translations: NO_TRANSLATIONS },
	} as const;

	test('keeps the seed when overrides agree with the prefetched inputs', () => {
		expect(
			decisionInputsFromConfig(config, { country: 'DE', language: 'de-AT' })
		).toMatchObject({ policyId: 'eu-opt-in' });
	});

	test.each([
		{ label: 'country', overrides: { country: 'US' } },
		{ label: 'region', overrides: { region: 'BY' } },
		{ label: 'language', overrides: { language: 'fr' } },
		{ label: 'gpc', overrides: { gpc: true } },
	])('drops the seed when the $label override differs', ({ overrides }) => {
		expect(decisionInputsFromConfig(config, overrides)).toBeUndefined();
	});
});
