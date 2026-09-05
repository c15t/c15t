import { baseTranslations } from '@c15t/translations/all';
import { describe, expect, test } from 'vitest';

import type { ResolvedPolicy } from '~/api/init';

import {
	buildConsentManifestFromConfig,
	buildDefaultOptInPolicy,
	resolveInitFromManifest,
	resolvePolicyResolutionFromManifest,
} from './consent-manifest';
import type { ConsentManifest } from './consent-manifest';
import {
	createMaterialPolicyFingerprint,
	createMaterialPolicyFingerprintSync,
	createPolicyFingerprint,
} from './policy-fingerprint';
import {
	liftLegacyPolicyConfig,
	liftLegacyResolvedPolicy,
} from './policy-legacy-bridge';
import { policyPackPresets } from './policy-pack-defaults';
import { readPolicyResolutionWire } from './policy-resolution';
import { normalizePolicyRule } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import { policyRulePresets } from './policy-rule-presets';
import { createResolvedPolicyFromConfig } from './policy-runtime';
import type { PolicyConfig } from './policy-runtime';

const manifest = {
	branding: 'c15t',
	revision: 'translations-test',
	schemaVersion: 1,
} satisfies ConsentManifest;

describe('buildDefaultOptInPolicy', () => {
	test('builds the shared bare-offline opt-in banner policy', () => {
		expect(buildDefaultOptInPolicy()).toEqual({
			consent: {
				categories: [
					'necessary',
					'functionality',
					'marketing',
					'measurement',
					'experience',
				],
				scopeMode: 'permissive',
			},
			id: 'default-opt-in',
			model: 'opt-in',
			ui: {
				mode: 'banner',
			},
		});
	});

	test('uses explicit inline categories when provided', () => {
		expect(buildDefaultOptInPolicy(['necessary', 'marketing']).consent).toEqual(
			{
				categories: ['necessary', 'marketing'],
				scopeMode: 'permissive',
			}
		);
	});
});

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

describe('v3 policy contract on manifests', () => {
	const rules = [
		policyRulePresets.europeOptIn(),
		{
			id: 'notice_rule',
			match: { countries: ['US'] },
			model: 'opt-out',
			prompt: 'notice',
		} satisfies PolicyRule,
	];

	test('builds a schemaVersion 2 manifest from rules with v2 bridge fields', async () => {
		const built = await buildConsentManifestFromConfig({ policyRules: rules });
		expect(built.schemaVersion).toBe(2);
		expect(built.policyFailure).toBeUndefined();
		expect(built.policyPacks).toHaveLength(2);
		const [europe, notice] = built.policyPacks ?? [];
		expect(europe?.rule).toEqual(normalizePolicyRule(rules[0]));
		expect(europe?.fingerprints).toEqual(
			createPolicyRuleFingerprints(normalizePolicyRule(rules[0]))
		);
		expect(europe?.fingerprints?.legacyMaterial).toBeUndefined();
		expect(europe?.resolvedPolicy.model).toBe('opt-in');
		expect(europe?.policy.match).toEqual(rules[0].match);
		expect(europe?.fingerprint).toBe(
			await createPolicyFingerprint(europe?.resolvedPolicy as ResolvedPolicy)
		);
		// A notice rule has no v2 representation: old clients get the safe banner.
		expect(notice?.rule?.prompt).toBe('notice');
		expect(notice?.resolvedPolicy).toMatchObject({
			model: 'opt-in',
			ui: { mode: 'banner' },
		});
	});

	test('lifts legacy packs and keeps the v2 fingerprint bytes', async () => {
		const legacyPacks = [
			policyPackPresets.europeOptIn(),
			policyPackPresets.worldNoBanner(),
		];
		const built = await buildConsentManifestFromConfig({
			policyPacks: legacyPacks,
		});
		expect(built.schemaVersion).toBe(2);
		const [europe, world] = built.policyPacks ?? [];
		const resolved = createResolvedPolicyFromConfig(
			legacyPacks[0] as PolicyConfig
		);
		expect(europe?.fingerprint).toBe(await createPolicyFingerprint(resolved));
		expect(europe?.fingerprints?.legacyMaterial).toBe(
			await createMaterialPolicyFingerprint(resolved)
		);
		expect(europe?.rule).toEqual(
			normalizePolicyRule(
				liftLegacyPolicyConfig(legacyPacks[0] as PolicyConfig)
			)
		);
		expect(world?.rule).toMatchObject({ model: 'opt-out', prompt: 'none' });
	});

	test('records a policy failure instead of throwing on invalid rules', async () => {
		const built = await buildConsentManifestFromConfig({
			policyRules: [{ ...rules[0], prompt: 'notice' }],
		});
		expect(built.policyFailure).toEqual({
			errors: [expect.stringContaining('allows prompts [choice]')],
			reason: 'invalid-configuration',
		});
		expect(built.policyPacks).toEqual([]);
		const init = resolveInitFromManifest(built, { country: 'DE' });
		expect(init.policyResolution).toEqual({
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
			version: 1,
		});
	});

	test('rejects mixed rule and pack configuration', async () => {
		await expect(
			buildConsentManifestFromConfig({
				policyPacks: [policyPackPresets.europeOptIn()],
				policyRules: rules,
			})
		).rejects.toThrow(/either policyRules or policyPacks/u);
	});

	test('resolves every outcome from a manifest and keeps the v2 fields', async () => {
		const built = await buildConsentManifestFromConfig({ policyRules: rules });

		const matched = resolveInitFromManifest(built, { country: 'DE' });
		expect(matched.policyResolution).toMatchObject({
			matchedBy: 'country',
			policyId: 'europe_opt_in',
			status: 'matched',
			version: 1,
		});
		expect(matched.policy?.id).toBe('europe_opt_in');
		expect(matched.policyDecision?.fingerprint).toBe(
			built.policyPacks?.[0]?.fingerprint
		);
		if (matched.policyResolution?.status === 'matched') {
			expect(matched.policyResolution.fingerprints).toBe(
				built.policyPacks?.[0]?.fingerprints
			);
		}

		const notice = resolveInitFromManifest(built, { country: 'US' });
		expect(notice.policyResolution).toMatchObject({
			policy: { prompt: 'notice' },
			status: 'matched',
		});
		expect(notice.policy).toMatchObject({
			model: 'opt-in',
			ui: { mode: 'banner' },
		});

		const noMatch = resolveInitFromManifest(built, { country: 'BR' });
		expect(noMatch.policyResolution).toEqual({
			policy: null,
			status: 'no-match',
			version: 1,
		});
		expect(noMatch.policy?.id).toBe('no_banner');

		const unknown = resolveInitFromManifest(
			await buildConsentManifestFromConfig({
				policyRules: [{ ...rules[0], match: { countries: ['DE'] } }],
			}),
			{ country: null }
		);
		expect(unknown.policyResolution).toEqual({
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
			version: 1,
		});

		const unconfigured = resolveInitFromManifest(
			await buildConsentManifestFromConfig({}),
			{ country: 'DE' }
		);
		expect(unconfigured.policyResolution).toEqual({
			policy: null,
			status: 'unconfigured',
			version: 1,
		});
		expect(unconfigured.policy).toBeUndefined();

		const empty = resolveInitFromManifest(
			await buildConsentManifestFromConfig({ policyRules: [] }),
			{ country: 'DE' }
		);
		expect(empty.policyResolution).toEqual({
			policy: null,
			status: 'no-match',
			version: 1,
		});
	});

	test('a schemaVersion 1 manifest from an older producer is lifted per request', () => {
		const resolved = createResolvedPolicyFromConfig(
			policyPackPresets.europeOptIn()
		);
		const legacyManifest: ConsentManifest = {
			branding: 'c15t',
			policyPacks: [
				{
					fingerprint: 'legacy',
					policy: policyPackPresets.europeOptIn(),
					resolvedPolicy: resolved,
				},
			],
			revision: 'legacy',
			schemaVersion: 1,
		};
		const init = resolveInitFromManifest(legacyManifest, { country: 'FR' });
		expect(init.policyResolution).toMatchObject({
			policyId: 'europe_opt_in',
			status: 'matched',
		});
		if (init.policyResolution?.status === 'matched') {
			expect(init.policyResolution.fingerprints.legacyMaterial).toBe(
				createMaterialPolicyFingerprintSync(resolved)
			);
			expect(init.policyResolution.policy).toEqual(
				liftLegacyResolvedPolicy(resolved)
			);
		}
		expect(init.policyDecision?.fingerprint).toBe('legacy');
	});

	test('unknown manifest versions and incomplete v2 packs fail instead of lifting', async () => {
		const built = await buildConsentManifestFromConfig({ policyRules: rules });
		expect(
			resolvePolicyResolutionFromManifest(
				{ ...built, schemaVersion: 99 as unknown as 2 },
				{ countryCode: 'DE', regionCode: null }
			)
		).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
		for (const field of ['rule', 'fingerprints'] as const) {
			const incomplete = structuredClone(built);
			for (const pack of incomplete.policyPacks ?? []) {
				Reflect.deleteProperty(pack, field);
			}
			expect(
				resolvePolicyResolutionFromManifest(incomplete, {
					countryCode: 'DE',
					regionCode: null,
				})
			).toEqual({
				policy: null,
				reason: 'invalid-configuration',
				status: 'failed',
			});
		}
	});

	test('the wire survives JSON and the strict reader', async () => {
		const built = await buildConsentManifestFromConfig({ policyRules: rules });
		const init = JSON.parse(
			JSON.stringify(resolveInitFromManifest(built, { country: 'DE' }))
		) as { policyResolution: unknown };
		const read = readPolicyResolutionWire(init.policyResolution);
		expect(read.status).toBe('matched');
		if (read.status === 'matched') {
			expect(read.policy).toEqual(normalizePolicyRule(rules[0]));
		}
	});
});
