import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createMaterialPolicyFingerprint } from './policy-fingerprint';
import {
	createPolicyFingerprint,
	hashSha256Hex,
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
