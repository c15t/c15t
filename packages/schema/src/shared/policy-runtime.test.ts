import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createMaterialPolicyFingerprint } from './policy-fingerprint';
import {
	createPolicyFingerprint,
	hashSha256Hex,
	inspectPolicies,
	policyMatchers,
	resolvePolicyDecision,
} from './policy-runtime';

const originalCrypto = globalThis.crypto;

const longPolicyLikeJson =
	'{"consent":{"categories":["necessary","measurement"],"expiryDays":365,"scopeMode":"strict"},"id":"policy_runtime_us_ca","model":"opt-in","ui":{"banner":{"actionLayout":"inline","actionOrder":["accept","reject"],"allowedActions":["accept","reject"],"primaryAction":"accept","scrollLock":true,"uiProfile":"balanced"},"mode":"banner"}}';

const goldenVectors = [
	{
		label: 'empty string',
		input: '',
		expected:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	},
	{
		label: 'short ascii',
		input: 'c15t',
		expected:
			'022db6788d676d5212e4249243ac3ee4f6b5e2dd77a298b4d4443d4c5826c6ac',
	},
	{
		label: 'long policy-like json',
		input: longPolicyLikeJson,
		expected:
			'8c405bf9f6e15ebff1236fe0338be1831c802752bc18f933c6f76d0637da6a8b',
	},
] as const;

afterEach(() => {
	Object.defineProperty(globalThis, 'crypto', {
		value: originalCrypto,
		configurable: true,
		writable: true,
	});
});

describe('hashSha256Hex', () => {
	it.each(
		goldenVectors
	)('computes the expected sha256 for $label using the pure-js reference path', async ({
		input,
		expected,
	}) => {
		await expect(hashSha256Hex(input, 'pure-js')).resolves.toBe(expected);
	});

	it('matches across node, webcrypto, and pure-js hash strategies', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			value: webcrypto,
			configurable: true,
			writable: true,
		});

		const nodeHash = await hashSha256Hex(longPolicyLikeJson, 'node');
		const webcryptoHash = await hashSha256Hex(longPolicyLikeJson, 'webcrypto');
		const pureJsHash = await hashSha256Hex(longPolicyLikeJson, 'pure-js');

		expect(nodeHash).toBe(webcryptoHash);
		expect(nodeHash).toBe(pureJsHash);
		expect(nodeHash).toBe(goldenVectors[2].expected);
	});

	it('does not throw in auto mode when globalThis.crypto is unavailable', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			value: undefined,
			configurable: true,
			writable: true,
		});

		await expect(hashSha256Hex('c15t')).resolves.toBe(
			goldenVectors[1].expected
		);
	});
});

describe('resolvePolicyDecision', () => {
	it('returns stable fingerprints across repeated calls', async () => {
		const params: Parameters<typeof resolvePolicyDecision>[0] = {
			policies: [
				{
					id: 'policy_runtime_us_ca',
					match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
					consent: {
						model: 'opt-in',
						expiryDays: 365,
						scopeMode: 'strict',
						categories: ['necessary', 'measurement'],
					},
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
							primaryAction: 'accept',
							actionOrder: ['accept', 'reject'],
							actionLayout: 'inline',
							uiProfile: 'balanced',
							scrollLock: true,
						},
					},
				},
			],
			countryCode: 'US',
			regionCode: 'CA',
			jurisdiction: 'CCPA',
		};

		const first = await resolvePolicyDecision(params);
		const second = await resolvePolicyDecision(params);

		expect(first?.fingerprint).toBe(second?.fingerprint);
		expect(first?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
	});

	it('creates the same policy fingerprint across all hash strategies', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			value: webcrypto,
			configurable: true,
			writable: true,
		});

		const policy: Parameters<typeof createPolicyFingerprint>[0] = {
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			consent: {
				expiryDays: 365,
				scopeMode: 'strict',
				categories: ['necessary', 'measurement'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'accept',
					actionOrder: ['accept', 'reject'],
					actionLayout: 'inline',
					uiProfile: 'balanced',
					scrollLock: true,
				},
			},
		};

		const nodeFingerprint = await createPolicyFingerprint(policy, 'node');
		const webcryptoFingerprint = await createPolicyFingerprint(
			policy,
			'webcrypto'
		);
		const pureJsFingerprint = await createPolicyFingerprint(policy, 'pure-js');

		expect(nodeFingerprint).toBe(webcryptoFingerprint);
		expect(nodeFingerprint).toBe(pureJsFingerprint);
		expect(nodeFingerprint).toBe(goldenVectors[2].expected);
	});

	it('ignores presentation-only fields in the material policy fingerprint', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			i18n: {
				language: 'en',
				messageProfile: 'default',
			},
			consent: {
				expiryDays: 365,
				scopeMode: 'strict',
				categories: ['necessary', 'measurement'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'accept',
					actionOrder: ['accept', 'reject'],
					actionLayout: 'inline',
					uiProfile: 'balanced',
					scrollLock: true,
				},
			},
		};

		const presentationVariant: Parameters<
			typeof createMaterialPolicyFingerprint
		>[0] = {
			...basePolicy,
			id: 'policy_runtime_us_ca_v2',
			i18n: {
				language: 'de',
				messageProfile: 'regional',
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'accept',
					actionOrder: ['accept', 'reject'],
					actionLayout: 'split',
					uiProfile: 'strict',
					scrollLock: false,
				},
			},
		};

		await expect(createMaterialPolicyFingerprint(basePolicy)).resolves.toBe(
			await createMaterialPolicyFingerprint(presentationVariant)
		);
	});

	it('changes the material policy fingerprint when consent semantics change', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			consent: {
				expiryDays: 365,
				scopeMode: 'strict',
				categories: ['necessary', 'measurement'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'accept',
					actionOrder: ['accept', 'reject'],
				},
			},
			proof: {
				storeIp: true,
			},
		};

		const changedPolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] =
			{
				...basePolicy,
				consent: {
					...basePolicy.consent,
					categories: ['necessary', 'measurement', 'marketing'],
				},
			};

		await expect(createMaterialPolicyFingerprint(basePolicy)).resolves.not.toBe(
			await createMaterialPolicyFingerprint(changedPolicy)
		);
	});
});

describe('fallback policy resolution', () => {
	const fallbackPolicy = {
		id: 'strict_fallback',
		match: policyMatchers.fallback(),
		consent: { model: 'opt-in' as const },
		ui: { mode: 'banner' as const },
	};

	const defaultPolicy = {
		id: 'world_default',
		match: policyMatchers.default(),
		consent: { model: 'none' as const },
		ui: { mode: 'none' as const },
	};

	const euPolicy = {
		id: 'eu',
		match: policyMatchers.countries(['DE']),
		consent: { model: 'opt-in' as const },
	};

	it('resolves fallback when countryCode is null', async () => {
		const result = await resolvePolicyDecision({
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			countryCode: null,
			regionCode: null,
			jurisdiction: 'NONE',
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('strict_fallback');
		expect(result?.matchedBy).toBe('fallback');
	});

	it('does NOT use fallback when countryCode is present but unmatched', async () => {
		const result = await resolvePolicyDecision({
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'NONE',
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('world_default');
		expect(result?.matchedBy).toBe('default');
	});

	it('does NOT use fallback when countryCode matches a country policy', async () => {
		const result = await resolvePolicyDecision({
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('eu');
		expect(result?.matchedBy).toBe('country');
	});

	it('resolves fallback when disableGeoLocation forces null geo (simulated)', async () => {
		// When disableGeoLocation=true, the backend sets countryCode=null,
		// regionCode=null, jurisdiction='GDPR'. The europeOptIn preset includes
		// fallback: true, so it should activate in this scenario.
		const { policyPackPresets } = await import('./policy-pack-defaults');
		const result = await resolvePolicyDecision({
			policies: [
				policyPackPresets.europeOptIn(),
				policyPackPresets.californiaOptOut(),
				policyPackPresets.worldNoBanner(),
			],
			countryCode: null,
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('europe_opt_in');
		expect(result?.policy.model).toBe('opt-in');
		expect(result?.matchedBy).toBe('fallback');
	});

	it('falls through to default when no fallback is configured and location is null', async () => {
		const result = await resolvePolicyDecision({
			policies: [euPolicy, defaultPolicy],
			countryCode: null,
			regionCode: null,
			jurisdiction: 'NONE',
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('world_default');
		expect(result?.matchedBy).toBe('default');
	});
});

describe('inspectPolicies validation', () => {
	it('errors when primaryAction is not in allowedActions', () => {
		const result = inspectPolicies([
			{
				id: 'test',
				match: { isDefault: true },
				consent: { model: 'opt-in' },
				ui: {
					mode: 'banner',
					banner: {
						allowedActions: ['accept', 'reject'],
						primaryAction: 'customize',
					},
				},
			},
		]);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors.some((e) => e.includes('primaryAction'))).toBe(true);
	});

	it('errors when actionOrder contains actions not in allowedActions', () => {
		const result = inspectPolicies([
			{
				id: 'test',
				match: { isDefault: true },
				consent: { model: 'opt-in' },
				ui: {
					mode: 'banner',
					banner: {
						allowedActions: ['accept', 'reject'],
						actionOrder: ['accept', 'customize'],
					},
				},
			},
		]);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(
			result.errors.some(
				(e) => e.includes('actionOrder') && e.includes('customize')
			)
		).toBe(true);
	});

	it('passes when primaryAction is in allowedActions', () => {
		const result = inspectPolicies([
			{
				id: 'test',
				match: { isDefault: true },
				consent: { model: 'opt-in' },
				ui: {
					mode: 'banner',
					banner: {
						allowedActions: ['accept', 'reject'],
						primaryAction: 'accept',
					},
				},
			},
		]);

		expect(
			result.errors.filter((e) => e.includes('primaryAction')).length
		).toBe(0);
	});

	it('errors when multiple fallback policies are defined', () => {
		const result = inspectPolicies([
			{
				id: 'fallback1',
				match: { fallback: true },
				consent: { model: 'opt-in' },
			},
			{
				id: 'fallback2',
				match: { fallback: true },
				consent: { model: 'opt-in' },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('Only one fallback policy'))
		).toBe(true);
	});

	it('accepts a policy with only match.fallback=true as valid', () => {
		const result = inspectPolicies([
			{
				id: 'fallback_only',
				match: { fallback: true },
				consent: { model: 'opt-in' },
			},
		]);

		expect(result.errors.some((e) => e.includes('no matcher'))).toBe(false);
	});

	it('warns when no fallback policy is configured', () => {
		const result = inspectPolicies([
			{
				id: 'default_only',
				match: { isDefault: true },
				consent: { model: 'none' },
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('No fallback policy configured'))
		).toBe(true);
	});

	it('does not warn about fallback when a fallback is configured', () => {
		const result = inspectPolicies([
			{
				id: 'with_fallback',
				match: { fallback: true },
				consent: { model: 'opt-in' },
			},
			{
				id: 'default',
				match: { isDefault: true },
				consent: { model: 'none' },
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('No fallback policy configured'))
		).toBe(false);
	});
});

describe('edge cases', () => {
	// -------------------------------------------------------------------------
	// Empty / missing policy ID
	// -------------------------------------------------------------------------

	it('errors on empty-string policy ID', () => {
		const result = inspectPolicies([
			{
				id: '',
				match: { isDefault: true },
				consent: { model: 'none' },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('missing a non-empty id'))
		).toBe(true);
	});

	it('errors on whitespace-only policy ID', () => {
		const result = inspectPolicies([
			{
				id: '   ',
				match: { isDefault: true },
				consent: { model: 'none' },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('missing a non-empty id'))
		).toBe(true);
	});

	it('errors on duplicate policy IDs', () => {
		const result = inspectPolicies([
			{
				id: 'same_id',
				match: policyMatchers.countries(['DE']),
				consent: { model: 'opt-in' },
			},
			{
				id: 'same_id',
				match: policyMatchers.countries(['FR']),
				consent: { model: 'opt-in' },
			},
		]);

		expect(result.errors.some((e) => e.includes('Duplicate id'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// No-matcher validation
	// -------------------------------------------------------------------------

	it('errors on policy with no matcher and not default/fallback', () => {
		const result = inspectPolicies([
			{
				id: 'orphan',
				match: {},
				consent: { model: 'opt-in' },
			},
		]);

		expect(result.errors.some((e) => e.includes('no matcher'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Resolution returns undefined when nothing matches
	// -------------------------------------------------------------------------

	it('returns undefined when no policy matches and no default exists', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'US',
			regionCode: null,
			jurisdiction: 'NONE',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined for undefined policies input', async () => {
		const result = await resolvePolicyDecision({
			policies: undefined,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined for empty policies array', async () => {
		const result = await resolvePolicyDecision({
			policies: [],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeUndefined();
	});

	// -------------------------------------------------------------------------
	// Case insensitivity in matching
	// -------------------------------------------------------------------------

	it('matches country codes case-insensitively', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'eu',
					match: policyMatchers.countries(['de']),
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.id).toBe('eu');
		expect(result?.matchedBy).toBe('country');
	});

	it('matches region codes case-insensitively', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'ca',
					match: policyMatchers.regions([{ country: 'us', region: 'ca' }]),
					consent: { model: 'opt-out' },
				},
			],
			countryCode: 'US',
			regionCode: 'CA',
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.id).toBe('ca');
		expect(result?.matchedBy).toBe('region');
	});

	// -------------------------------------------------------------------------
	// First-match-wins by array order
	// -------------------------------------------------------------------------

	it('first match wins when multiple policies match the same country', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'first',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-in' },
				},
				{
					id: 'second',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-out' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.id).toBe('first');
	});

	// -------------------------------------------------------------------------
	// Overlapping matcher warnings
	// -------------------------------------------------------------------------

	it('warns on overlapping country matchers', () => {
		const result = inspectPolicies([
			{
				id: 'policy_a',
				match: policyMatchers.countries(['DE', 'FR']),
				consent: { model: 'opt-in' },
			},
			{
				id: 'policy_b',
				match: policyMatchers.countries(['DE']),
				consent: { model: 'opt-out' },
			},
			{
				id: 'default',
				match: policyMatchers.default(),
				consent: { model: 'none' },
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('DE') && w.includes('multiple'))
		).toBe(true);
	});

	it('warns on overlapping region matchers', () => {
		const result = inspectPolicies([
			{
				id: 'policy_a',
				match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
				consent: { model: 'opt-in' },
			},
			{
				id: 'policy_b',
				match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
				consent: { model: 'opt-out' },
			},
			{
				id: 'default',
				match: policyMatchers.default(),
				consent: { model: 'none' },
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('US-CA') && w.includes('multiple'))
		).toBe(true);
	});

	it('warns when default policy also has explicit matchers', () => {
		const result = inspectPolicies([
			{
				id: 'confused',
				match: { isDefault: true, countries: ['DE'] },
				consent: { model: 'opt-in' },
			},
		]);

		expect(
			result.warnings.some(
				(w) => w.includes('default') && w.includes('explicit matchers')
			)
		).toBe(true);
	});

	// -------------------------------------------------------------------------
	// IAB validation
	// -------------------------------------------------------------------------

	it('errors on IAB model without iab.enabled', () => {
		const result = inspectPolicies(
			[
				{
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'iab' },
				},
			],
			{ iabEnabled: false }
		);

		expect(result.errors.some((e) => e.includes('iab.enabled'))).toBe(true);
	});

	it('errors on IAB policy with UI overrides', () => {
		const result = inspectPolicies(
			[
				{
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'iab' },
					ui: {
						mode: 'banner',
						banner: {
							allowedActions: ['accept', 'reject'],
						},
					},
				},
			],
			{ iabEnabled: true }
		);

		expect(
			result.errors.some((e) => e.includes('iab') && e.includes('ui'))
		).toBe(true);
	});

	it('errors on IAB policy with preselectedCategories', () => {
		const result = inspectPolicies(
			[
				{
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'iab', preselectedCategories: ['marketing'] },
				},
			],
			{ iabEnabled: true }
		);

		expect(
			result.errors.some(
				(e) => e.includes('iab') && e.includes('preselectedCategories')
			)
		).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Parse errors (invalid input to inspectPolicies / resolvePolicyDecision)
	// -------------------------------------------------------------------------

	it('inspectPolicies returns parse errors for completely invalid input', () => {
		const result = inspectPolicies('not an array');

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.warnings).toEqual([]);
	});

	it('inspectPolicies returns parse errors for invalid policy objects', () => {
		const result = inspectPolicies([{ invalid: true }]);

		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('resolvePolicyDecision returns undefined for invalid policy input', async () => {
		const result = await resolvePolicyDecision({
			policies: 'garbage',
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeUndefined();
	});

	it('resolvePolicyDecision returns undefined for semantically invalid policies', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'same_id',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-in' },
				},
				{
					id: 'same_id',
					match: policyMatchers.countries(['FR']),
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result).toBeUndefined();
	});

	it('resolvePolicyDecision does not require jurisdiction', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
		});

		expect(result?.policy.id).toBe('eu');
	});

	// -------------------------------------------------------------------------
	// Normalization edge cases
	// -------------------------------------------------------------------------

	it('IAB model forces categories to wildcard', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'iab', categories: ['necessary', 'marketing'] },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			iabEnabled: true,
		});

		expect(result?.policy.consent?.categories).toEqual(['*']);
	});

	it('IAB model strips UI config from resolved policy', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'iab' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			iabEnabled: true,
		});

		expect(result?.policy.ui).toBeUndefined();
	});

	// -------------------------------------------------------------------------
	// Matcher merge helper
	// -------------------------------------------------------------------------

	it('policyMatchers.merge combines countries and regions', () => {
		const merged = policyMatchers.merge(
			policyMatchers.countries(['DE', 'FR']),
			policyMatchers.regions([{ country: 'US', region: 'CA' }])
		);

		expect(merged.countries).toEqual(['DE', 'FR']);
		expect(merged.regions).toEqual([{ country: 'US', region: 'CA' }]);
	});

	it('policyMatchers.merge propagates fallback flag', () => {
		const merged = policyMatchers.merge(
			policyMatchers.eea(),
			policyMatchers.fallback()
		);

		expect(merged.fallback).toBe(true);
		expect(merged.countries?.length).toBeGreaterThan(0);
	});

	it('policyMatchers.merge propagates isDefault flag', () => {
		const merged = policyMatchers.merge(
			policyMatchers.countries(['JP']),
			policyMatchers.default()
		);

		expect(merged.isDefault).toBe(true);
		expect(merged.countries).toEqual(['JP']);
	});

	it('policyMatchers.merge deduplicates countries', () => {
		const merged = policyMatchers.merge(
			policyMatchers.countries(['DE', 'FR']),
			policyMatchers.countries(['FR', 'IT'])
		);

		expect(merged.countries).toEqual(['DE', 'FR', 'IT']);
	});

	it('policyMatchers.merge deduplicates regions', () => {
		const merged = policyMatchers.merge(
			policyMatchers.regions([{ country: 'US', region: 'CA' }]),
			policyMatchers.regions([
				{ country: 'US', region: 'CA' },
				{ country: 'CA', region: 'QC' },
			])
		);

		expect(merged.regions).toEqual([
			{ country: 'US', region: 'CA' },
			{ country: 'CA', region: 'QC' },
		]);
	});

	// -------------------------------------------------------------------------
	// Region takes priority over country
	// -------------------------------------------------------------------------

	it('region match takes priority over country match on the same request', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'us_ca',
					match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
					consent: { model: 'opt-in' },
				},
				{
					id: 'us',
					match: policyMatchers.countries(['US']),
					consent: { model: 'opt-out' },
				},
			],
			countryCode: 'US',
			regionCode: 'CA',
			jurisdiction: 'CCPA',
		});

		expect(result?.policy.id).toBe('us_ca');
		expect(result?.matchedBy).toBe('region');
	});

	// -------------------------------------------------------------------------
	// Multiple defaults
	// -------------------------------------------------------------------------

	it('errors on multiple default policies', () => {
		const result = inspectPolicies([
			{
				id: 'default1',
				match: { isDefault: true },
				consent: { model: 'none' },
			},
			{
				id: 'default2',
				match: { isDefault: true },
				consent: { model: 'opt-out' },
			},
		]);

		expect(result.errors.some((e) => e.includes('Only one default'))).toBe(
			true
		);
	});

	// -------------------------------------------------------------------------
	// Dialog surface validation
	// -------------------------------------------------------------------------

	it('errors when dialog primaryAction is not in allowedActions', () => {
		const result = inspectPolicies([
			{
				id: 'test',
				match: { isDefault: true },
				consent: { model: 'opt-in' },
				ui: {
					mode: 'dialog',
					dialog: {
						allowedActions: ['accept', 'reject'],
						primaryAction: 'customize',
					},
				},
			},
		]);

		expect(
			result.errors.some(
				(e) => e.includes('dialog') && e.includes('primaryAction')
			)
		).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Fingerprint stability with normalization
	// -------------------------------------------------------------------------

	it('produces identical fingerprints regardless of country code casing in match', async () => {
		const policyLower = [
			{
				id: 'eu',
				match: policyMatchers.countries(['de']),
				consent: {
					model: 'opt-in' as const,
					categories: ['necessary'],
				},
			},
		];
		const policyUpper = [
			{
				id: 'eu',
				match: policyMatchers.countries(['DE']),
				consent: {
					model: 'opt-in' as const,
					categories: ['necessary'],
				},
			},
		];

		const resultLower = await resolvePolicyDecision({
			policies: policyLower,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});
		const resultUpper = await resolvePolicyDecision({
			policies: policyUpper,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(resultLower?.fingerprint).toBe(resultUpper?.fingerprint);
	});

	// -------------------------------------------------------------------------
	// GPC in resolved policy
	// -------------------------------------------------------------------------

	it('gpc defaults to undefined when not specified', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'basic',
					match: policyMatchers.default(),
					consent: { model: 'opt-in' },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.consent?.gpc).toBeUndefined();
	});

	it('gpc=false is preserved in resolved policy', async () => {
		const result = await resolvePolicyDecision({
			policies: [
				{
					id: 'eu',
					match: policyMatchers.default(),
					consent: { model: 'opt-in', gpc: false },
				},
			],
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(result?.policy.consent?.gpc).toBe(false);
	});
});
