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
