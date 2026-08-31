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
	'{"consent":{"categories":["necessary","measurement"],"expiryDays":365,"scopeMode":"strict"},"id":"policy_runtime_us_ca","model":"opt-in","ui":{"banner":{"allowedActions":["accept","reject"],"direction":"row","layout":[["accept","reject"]],"primaryActions":["accept"],"scrollLock":true,"uiProfile":"balanced"},"mode":"banner"}}';

const goldenVectors = [
	{
		expected:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		input: '',
		label: 'empty string',
	},
	{
		expected:
			'022db6788d676d5212e4249243ac3ee4f6b5e2dd77a298b4d4443d4c5826c6ac',
		input: 'c15t',
		label: 'short ascii',
	},
	{
		expected:
			'bea550f2f6980f42116a90db2160985178f75ef96d08331a1147530524abbbc2',
		input: longPolicyLikeJson,
		label: 'long policy-like json',
	},
] as const;

afterEach(() => {
	Object.defineProperty(globalThis, 'crypto', {
		configurable: true,
		value: originalCrypto,
		writable: true,
	});
});

describe('hashSha256Hex', () => {
	it.each(goldenVectors)(
		'computes the expected sha256 for $label',
		async ({ input, expected }) => {
			await expect(hashSha256Hex(input)).resolves.toBe(expected);
		}
	);

	it('produces consistent hashes with crypto.subtle available', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: webcrypto,
			writable: true,
		});

		const hash = await hashSha256Hex(longPolicyLikeJson);
		expect(hash).toBe(goldenVectors[2].expected);
	});

	it('falls back to pure-JS when globalThis.crypto is unavailable', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: undefined,
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
			countryCode: 'US',
			jurisdiction: 'CCPA',
			policies: [
				{
					consent: {
						categories: ['necessary', 'measurement'],

						expiryDays: 365,
						model: 'opt-in',
						scopeMode: 'strict',
					},
					id: 'policy_runtime_us_ca',
					match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
					ui: {
						banner: {
							allowedActions: ['accept', 'reject'],
							direction: 'row',
							layout: [['accept', 'reject']],
							primaryActions: ['accept'],
							scrollLock: true,

							uiProfile: 'balanced',
						},

						mode: 'banner',
					},
				},
			],
			regionCode: 'CA',
		};

		const first = await resolvePolicyDecision(params);
		const second = await resolvePolicyDecision(params);

		expect(first?.fingerprint).toBe(second?.fingerprint);
		expect(first?.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
	});

	it('filters preselected categories only when policy scope is strict', async () => {
		const strict = await resolvePolicyDecision({
			countryCode: 'GB',
			jurisdiction: 'UK_GDPR',
			policies: [
				{
					consent: {
						categories: ['necessary', 'functionality'],
						model: 'opt-in',
						preselectedCategories: ['functionality', 'marketing'],

						scopeMode: 'strict',
					},

					id: 'strict_policy',
					match: policyMatchers.countries(['GB']),
				},
			],
			regionCode: null,
		});
		const permissive = await resolvePolicyDecision({
			countryCode: 'GB',
			jurisdiction: 'UK_GDPR',
			policies: [
				{
					consent: {
						categories: ['necessary'],
						model: 'opt-in',
						preselectedCategories: ['marketing'],

						scopeMode: 'permissive',
					},

					id: 'permissive_policy',
					match: policyMatchers.countries(['GB']),
				},
			],
			regionCode: null,
		});

		expect(strict?.policy.consent?.preselectedCategories).toEqual([
			'functionality',
		]);
		expect(permissive?.policy.consent?.preselectedCategories).toEqual([
			'marketing',
		]);
	});

	it('creates the same policy fingerprint across all hash strategies', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: webcrypto,
			writable: true,
		});

		const policy: Parameters<typeof createPolicyFingerprint>[0] = {
			consent: {
				categories: ['necessary', 'measurement'],
				expiryDays: 365,
				scopeMode: 'strict',
			},
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			ui: {
				banner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['accept', 'reject']],
					primaryActions: ['accept'],
					scrollLock: true,
					uiProfile: 'balanced',
				},
				mode: 'banner',
			},
		};

		const fingerprint = await createPolicyFingerprint(policy);
		expect(fingerprint).toBe(goldenVectors[2].expected);
	});

	it('ignores presentation-only fields in the material policy fingerprint', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			consent: {
				categories: ['necessary', 'measurement'],
				expiryDays: 365,
				scopeMode: 'strict',
			},
			i18n: {
				language: 'en',
				messageProfile: 'default',
			},
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			ui: {
				banner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['accept', 'reject']],
					primaryActions: ['accept'],
					scrollLock: true,
					uiProfile: 'balanced',
				},
				mode: 'banner',
			},
		};

		const presentationVariant: Parameters<
			typeof createMaterialPolicyFingerprint
		>[0] = {
			...basePolicy,
			i18n: {
				language: 'de',
				messageProfile: 'regional',
			},
			id: 'policy_runtime_us_ca_v2',
			ui: {
				banner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['accept', 'reject']],
					primaryActions: ['accept'],
					scrollLock: false,
					uiProfile: 'strict',
				},
				mode: 'banner',
			},
		};

		await expect(createMaterialPolicyFingerprint(basePolicy)).resolves.toBe(
			await createMaterialPolicyFingerprint(presentationVariant)
		);
	});

	it('changes the material policy fingerprint when banner layout changes', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			consent: {
				categories: ['necessary', 'measurement'],
				expiryDays: 365,
				scopeMode: 'strict',
			},
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			ui: {
				banner: {
					allowedActions: ['accept', 'reject', 'customize'],
					direction: 'row',
					layout: [['accept', 'reject'], 'customize'],
					primaryActions: ['accept'],
				},
				mode: 'banner',
			},
		};

		const changedPolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] =
			{
				...basePolicy,
				ui: {
					banner: {
						...(basePolicy.ui?.banner ?? {}),
						layout: [['accept', 'reject', 'customize']],
					},
					mode: 'banner',
				},
			};

		await expect(createMaterialPolicyFingerprint(basePolicy)).resolves.not.toBe(
			await createMaterialPolicyFingerprint(changedPolicy)
		);
	});

	it('changes the material policy fingerprint when banner direction changes', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			consent: {
				categories: ['necessary', 'measurement'],
				expiryDays: 365,
				scopeMode: 'strict',
			},
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			ui: {
				banner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['accept', 'reject']],
					primaryActions: ['accept'],
				},
				mode: 'banner',
			},
		};

		const changedPolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] =
			{
				...basePolicy,
				ui: {
					banner: {
						...(basePolicy.ui?.banner ?? {}),
						direction: 'column',
					},
					mode: 'banner',
				},
			};

		await expect(createMaterialPolicyFingerprint(basePolicy)).resolves.not.toBe(
			await createMaterialPolicyFingerprint(changedPolicy)
		);
	});

	it('changes the material policy fingerprint when consent semantics change', async () => {
		const basePolicy: Parameters<typeof createMaterialPolicyFingerprint>[0] = {
			consent: {
				categories: ['necessary', 'measurement'],
				expiryDays: 365,
				scopeMode: 'strict',
			},
			id: 'policy_runtime_us_ca',
			model: 'opt-in',
			proof: {
				storeIp: true,
			},
			ui: {
				banner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['accept', 'reject']],
					primaryActions: ['accept'],
				},
				mode: 'banner',
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
		consent: { model: 'opt-in' as const },
		id: 'strict_fallback',
		match: policyMatchers.fallback(),
		ui: { mode: 'banner' as const },
	};

	const defaultPolicy = {
		consent: { model: 'none' as const },
		id: 'world_default',
		match: policyMatchers.default(),
		ui: { mode: 'none' as const },
	};

	const euPolicy = {
		consent: { model: 'opt-in' as const },
		id: 'eu',
		match: policyMatchers.countries(['DE']),
	};

	it('resolves fallback when countryCode is null', async () => {
		const result = await resolvePolicyDecision({
			countryCode: null,
			jurisdiction: 'NONE',
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			regionCode: null,
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('strict_fallback');
		expect(result?.matchedBy).toBe('fallback');
	});

	it('does NOT use fallback when countryCode is present but unmatched', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'US',
			jurisdiction: 'NONE',
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			regionCode: null,
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('world_default');
		expect(result?.matchedBy).toBe('default');
	});

	it('does NOT use fallback when countryCode matches a country policy', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [euPolicy, fallbackPolicy, defaultPolicy],
			regionCode: null,
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
			countryCode: null,
			jurisdiction: 'GDPR',
			policies: [
				policyPackPresets.europeOptIn(),
				policyPackPresets.californiaOptOut(),
				policyPackPresets.worldNoBanner(),
			],
			regionCode: null,
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('europe_opt_in');
		expect(result?.policy.model).toBe('opt-in');
		expect(result?.matchedBy).toBe('fallback');
	});

	it('falls through to default when no fallback is configured and location is null', async () => {
		const result = await resolvePolicyDecision({
			countryCode: null,
			jurisdiction: 'NONE',
			policies: [euPolicy, defaultPolicy],
			regionCode: null,
		});

		expect(result).toBeDefined();
		expect(result?.policy.id).toBe('world_default');
		expect(result?.matchedBy).toBe('default');
	});
});

describe('inspectPolicies validation', () => {
	it('errors when primaryActions is not in allowedActions', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'test',
				match: { isDefault: true },
				ui: {
					banner: {
						allowedActions: ['accept', 'reject'],
						primaryActions: ['customize'],
					},
					mode: 'banner',
				},
			},
		]);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors.some((e) => e.includes('primaryActions'))).toBe(true);
	});

	it('errors when layout contains actions not in allowedActions', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'test',
				match: { isDefault: true },
				ui: {
					banner: {
						allowedActions: ['accept', 'reject'],
						layout: [['accept', 'customize']],
					},
					mode: 'banner',
				},
			},
		]);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(
			result.errors.some((e) => e.includes('layout') && e.includes('customize'))
		).toBe(true);
	});

	it('passes when primaryActions is in allowedActions', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'test',
				match: { isDefault: true },
				ui: {
					banner: {
						allowedActions: ['accept', 'reject'],
						primaryActions: ['accept'],
					},
					mode: 'banner',
				},
			},
		]);

		expect(
			result.errors.filter((e) => e.includes('primaryActions')).length
		).toBe(0);
	});

	it('errors when multiple fallback policies are defined', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'fallback1',
				match: { fallback: true },
			},
			{
				consent: { model: 'opt-in' },
				id: 'fallback2',
				match: { fallback: true },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('Only one fallback policy'))
		).toBe(true);
	});

	it('accepts a policy with only match.fallback=true as valid', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'fallback_only',
				match: { fallback: true },
			},
		]);

		expect(result.errors.some((e) => e.includes('no matcher'))).toBe(false);
	});

	it('warns when no fallback policy is configured', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'none' },
				id: 'default_only',
				match: { isDefault: true },
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('No fallback policy configured'))
		).toBe(true);
	});

	it('does not warn about fallback when a fallback is configured', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'with_fallback',
				match: { fallback: true },
			},
			{
				consent: { model: 'none' },
				id: 'default',
				match: { isDefault: true },
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
				consent: { model: 'none' },
				id: '',
				match: { isDefault: true },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('missing a non-empty id'))
		).toBe(true);
	});

	it('errors on whitespace-only policy ID', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'none' },
				id: '   ',
				match: { isDefault: true },
			},
		]);

		expect(
			result.errors.some((e) => e.includes('missing a non-empty id'))
		).toBe(true);
	});

	it('errors on duplicate policy IDs', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'same_id',
				match: policyMatchers.countries(['DE']),
			},
			{
				consent: { model: 'opt-in' },
				id: 'same_id',
				match: policyMatchers.countries(['FR']),
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
				consent: { model: 'opt-in' },
				id: 'orphan',
				match: {},
			},
		]);

		expect(result.errors.some((e) => e.includes('no matcher'))).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Resolution returns undefined when nothing matches
	// -------------------------------------------------------------------------

	it('returns undefined when no policy matches and no default exists', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'US',
			jurisdiction: 'NONE',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'eu',
					match: policyMatchers.countries(['DE']),
				},
			],
			regionCode: null,
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined for undefined policies input', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: undefined,
			regionCode: null,
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined for empty policies array', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [],
			regionCode: null,
		});

		expect(result).toBeUndefined();
	});

	// -------------------------------------------------------------------------
	// Case insensitivity in matching
	// -------------------------------------------------------------------------

	it('matches country codes case-insensitively', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'eu',
					match: policyMatchers.countries(['de']),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.id).toBe('eu');
		expect(result?.matchedBy).toBe('country');
	});

	it('matches region codes case-insensitively', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'US',
			jurisdiction: 'CCPA',
			policies: [
				{
					consent: { model: 'opt-out' },

					id: 'ca',
					match: policyMatchers.regions([{ country: 'us', region: 'ca' }]),
				},
			],
			regionCode: 'CA',
		});

		expect(result?.policy.id).toBe('ca');
		expect(result?.matchedBy).toBe('region');
	});

	// -------------------------------------------------------------------------
	// First-match-wins by array order
	// -------------------------------------------------------------------------

	it('first match wins when multiple policies match the same country', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'first',
					match: policyMatchers.countries(['DE']),
				},
				{
					consent: { model: 'opt-out' },

					id: 'second',
					match: policyMatchers.countries(['DE']),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.id).toBe('first');
	});

	// -------------------------------------------------------------------------
	// Overlapping matcher warnings
	// -------------------------------------------------------------------------

	it('warns on overlapping country matchers', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'policy_a',
				match: policyMatchers.countries(['DE', 'FR']),
			},
			{
				consent: { model: 'opt-out' },
				id: 'policy_b',
				match: policyMatchers.countries(['DE']),
			},
			{
				consent: { model: 'none' },
				id: 'default',
				match: policyMatchers.default(),
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('DE') && w.includes('multiple'))
		).toBe(true);
	});

	it('warns on overlapping region matchers', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'policy_a',
				match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
			},
			{
				consent: { model: 'opt-out' },
				id: 'policy_b',
				match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
			},
			{
				consent: { model: 'none' },
				id: 'default',
				match: policyMatchers.default(),
			},
		]);

		expect(
			result.warnings.some((w) => w.includes('US-CA') && w.includes('multiple'))
		).toBe(true);
	});

	it('warns when default policy also has explicit matchers', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'confused',
				match: { countries: ['DE'], isDefault: true },
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
					consent: { model: 'iab' },
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
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
					consent: { model: 'iab' },
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
					ui: {
						banner: {
							allowedActions: ['accept', 'reject'],
						},
						mode: 'banner',
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
					consent: { model: 'iab', preselectedCategories: ['marketing'] },
					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
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
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: 'garbage',
			regionCode: null,
		});

		expect(result).toBeUndefined();
	});

	it('resolvePolicyDecision returns undefined for semantically invalid policies', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'same_id',
					match: policyMatchers.countries(['DE']),
				},
				{
					consent: { model: 'opt-in' },

					id: 'same_id',
					match: policyMatchers.countries(['FR']),
				},
			],
			regionCode: null,
		});

		expect(result).toBeUndefined();
	});

	it('resolvePolicyDecision does not require jurisdiction', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'eu',
					match: policyMatchers.countries(['DE']),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.id).toBe('eu');
	});

	// -------------------------------------------------------------------------
	// Normalization edge cases
	// -------------------------------------------------------------------------

	it('IAB model forces categories to wildcard', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			iabEnabled: true,
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { categories: ['necessary', 'marketing'], model: 'iab' },

					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.consent?.categories).toEqual(['*']);
	});

	it('IAB model strips UI config from resolved policy', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			iabEnabled: true,
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { model: 'iab' },

					id: 'iab_eu',
					match: policyMatchers.countries(['DE']),
				},
			],
			regionCode: null,
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
			countryCode: 'US',
			jurisdiction: 'CCPA',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'us_ca',
					match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
				},
				{
					consent: { model: 'opt-out' },

					id: 'us',
					match: policyMatchers.countries(['US']),
				},
			],
			regionCode: 'CA',
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
				consent: { model: 'none' },
				id: 'default1',
				match: { isDefault: true },
			},
			{
				consent: { model: 'opt-out' },
				id: 'default2',
				match: { isDefault: true },
			},
		]);

		expect(result.errors.some((e) => e.includes('Only one default'))).toBe(
			true
		);
	});

	// -------------------------------------------------------------------------
	// Dialog surface validation
	// -------------------------------------------------------------------------

	it('errors when dialog primaryActions is not in allowedActions', () => {
		const result = inspectPolicies([
			{
				consent: { model: 'opt-in' },
				id: 'test',
				match: { isDefault: true },
				ui: {
					dialog: {
						allowedActions: ['accept', 'reject'],
						primaryActions: ['customize'],
					},
					mode: 'dialog',
				},
			},
		]);

		expect(
			result.errors.some(
				(e) => e.includes('dialog') && e.includes('primaryActions')
			)
		).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Fingerprint stability with normalization
	// -------------------------------------------------------------------------

	it('produces identical fingerprints regardless of country code casing in match', async () => {
		const policyLower = [
			{
				consent: {
					categories: ['necessary'],
					model: 'opt-in' as const,
				},
				id: 'eu',
				match: policyMatchers.countries(['de']),
			},
		];
		const policyUpper = [
			{
				consent: {
					categories: ['necessary'],
					model: 'opt-in' as const,
				},
				id: 'eu',
				match: policyMatchers.countries(['DE']),
			},
		];

		const resultLower = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: policyLower,
			regionCode: null,
		});
		const resultUpper = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: policyUpper,
			regionCode: null,
		});

		expect(resultLower?.fingerprint).toBe(resultUpper?.fingerprint);
	});

	// -------------------------------------------------------------------------
	// GPC in resolved policy
	// -------------------------------------------------------------------------

	it('gpc defaults to undefined when not specified', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { model: 'opt-in' },

					id: 'basic',
					match: policyMatchers.default(),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.consent?.gpc).toBeUndefined();
	});

	it('gpc=false is preserved in resolved policy', async () => {
		const result = await resolvePolicyDecision({
			countryCode: 'DE',
			jurisdiction: 'GDPR',
			policies: [
				{
					consent: { gpc: false, model: 'opt-in' },

					id: 'eu',
					match: policyMatchers.default(),
				},
			],
			regionCode: null,
		});

		expect(result?.policy.consent?.gpc).toBe(false);
	});
});
