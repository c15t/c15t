import { baseTranslations } from '@c15t/translations/all';
import { assert, describe, expect, test } from 'vitest';

import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
	resolvePolicyResolutionFromManifest,
	createConsentManifestPolicyPack,
} from './consent-manifest';
import type { ConsentManifest } from './consent-manifest';
import { readPolicyResolutionWire } from './policy-resolution';
import { policyRulePresets } from './policy-rule-presets';

const manifest = {
	branding: 'c15t',
	revision: 'translations-test',
	schemaVersion: 2,
} satisfies ConsentManifest;
describe('resolveInitFromManifest translations', () => {
	test('resolves German when base translations are provided', () => {
		const result = resolveInitFromManifest(
			manifest,
			{ language: 'de-DE' },
			{ baseTranslations }
		);

		expect(result.translations.language).toBe('de');
		expect(result.translations.translations.common.acceptAll).toBe(
			'Alle akzeptieren'
		);
	});

	test('falls back to English and warns once without base translations', () => {
		const warnings: string[] = [];
		const logger = {
			warn(message: string) {
				warnings.push(message);
			},
		};

		const first = resolveInitFromManifest(
			manifest,
			{ language: 'de-DE' },
			{ logger }
		);
		resolveInitFromManifest(manifest, { language: 'de-DE' }, { logger });

		expect(first.translations.language).toBe('en');
		expect(first.translations.translations.common.acceptAll).toBe('Accept All');
		expect(warnings).toEqual([
			"Base translations were not provided for 'de'. Falling back to English translations.",
		]);
	});
});

describe('canonical manifest contract', () => {
	test('contains only canonical pack fields and required resolution', async () => {
		const rule = policyRulePresets.europeOptIn();
		const built = await buildConsentManifestFromConfig({ policyRules: [rule] });
		expect(Object.keys(built.policyPacks?.[0] ?? {}).sort()).toEqual([
			'fingerprints',
			'match',
			'rule',
		]);
		const init = resolveInitFromManifest(built, { country: 'DE' });
		expect(init.policyResolution).toMatchObject({
			policyId: rule.id,
			status: 'matched',
			version: 1,
		});
		expect(init).not.toHaveProperty('policy');
		expect(init).not.toHaveProperty('policyDecision');
		expect(
			readPolicyResolutionWire(
				JSON.parse(JSON.stringify(init.policyResolution))
			)
		).toMatchObject({ status: 'matched' });
	});
	test.each([1, 99])(
		'refuses manifest version %s without lifting',
		(schemaVersion) => {
			const old = { ...manifest, schemaVersion } as unknown as ConsentManifest;
			expect(
				resolvePolicyResolutionFromManifest(old, {
					countryCode: 'DE',
					regionCode: null,
				})
			).toEqual({
				policy: null,
				reason: 'unsupported-contract',
				status: 'failed',
			});
		}
	);
	test.each(['rule', 'fingerprints', 'match'])(
		'fails incomplete packs missing %s',
		(field) => {
			const pack = createConsentManifestPolicyPack(
				policyRulePresets.europeOptIn()
			);
			Reflect.deleteProperty(pack, field);
			expect(
				resolveInitFromManifest(
					{ ...manifest, policyPacks: [pack] },
					{ country: 'DE' }
				).policyResolution
			).toMatchObject({ policy: null, status: 'failed' });
		}
	);
	test('rejects an invalid unmatched pack and duplicate default rules', async () => {
		const built = await buildConsentManifestFromConfig({
			policyRules: [
				{ ...policyRulePresets.europeOptIn(), match: { isDefault: true } },
			],
		});
		const firstPack = built.policyPacks?.[0];
		assert(firstPack);
		const corrupt = structuredClone(firstPack);
		Reflect.set(corrupt.rule, 'prompt', 'unknown');
		expect(
			resolveInitFromManifest(
				{ ...built, policyPacks: [firstPack, corrupt] },
				{}
			).policyResolution
		).toMatchObject({ status: 'failed' });
	});
	test('preserves unconfigured, empty, no-match, insufficient input and invalid configuration', async () => {
		const rule = {
			...policyRulePresets.europeOptIn(),
			match: { countries: ['DE'] },
		};
		expect(
			resolveInitFromManifest(await buildConsentManifestFromConfig({}), {})
				.policyResolution
		).toEqual({ policy: null, status: 'unconfigured', version: 1 });
		expect(
			resolveInitFromManifest(
				await buildConsentManifestFromConfig({ policyRules: [] }),
				{}
			).policyResolution
		).toEqual({ policy: null, status: 'no-match', version: 1 });
		const built = await buildConsentManifestFromConfig({ policyRules: [rule] });
		expect(
			resolveInitFromManifest(built, { country: 'BR' }).policyResolution
		).toEqual({ policy: null, status: 'no-match', version: 1 });
		expect(resolveInitFromManifest(built, {}).policyResolution).toMatchObject({
			reason: 'insufficient-inputs',
			status: 'failed',
		});
		const invalid = await buildConsentManifestFromConfig({
			policyRules: [{ ...rule, prompt: 'notice' }],
		});
		expect(
			resolveInitFromManifest(invalid, { country: 'DE' }).policyResolution
		).toMatchObject({ reason: 'invalid-configuration', status: 'failed' });
	});
	test('never includes IAB authority outside a matched IAB result', async () => {
		const config = { iab: { cmpId: 123, customVendors: [], enabled: true } };
		const unconfigured = await buildConsentManifestFromConfig(config);
		const init = resolveInitFromManifest(unconfigured, {});
		expect(init).not.toHaveProperty('cmpId');
		expect(init).not.toHaveProperty('customVendors');
		const matched = resolveInitFromManifest(
			await buildConsentManifestFromConfig({
				...config,
				policyRules: [policyRulePresets.europeIab()],
			}),
			{ country: 'DE' }
		);
		expect(matched.cmpId).toBe(123);
	});
});
