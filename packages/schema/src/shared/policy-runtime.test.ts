import { webcrypto } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { hashSha256Hex } from './policy-fingerprint';
import { resolvePolicyRules } from './policy-resolution';
import { inspectPolicyRules } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { policyMatchers } from './policy-runtime';

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

const entry = (id: string, match: PolicyRule['match']): PolicyRule => ({
	id,
	match,
	model: 'opt-in',
	prompt: 'choice',
});
describe('canonical matcher migration', () => {
	const rules = [
		entry('default', { isDefault: true }),
		entry('country', { countries: ['US'] }),
		entry('region', { regions: [{ country: 'US', region: 'CA' }] }),
		entry('fallback', { fallback: true }),
	];
	it.each([
		['us', 'US-ca', 'region'],
		['US', null, 'country'],
		['BR', null, 'default'],
		[null, null, 'fallback'],
	])(
		'resolves %s/%s with established precedence',
		(countryCode, regionCode, id) => {
			expect(
				resolvePolicyRules({ countryCode, regionCode, rules })
			).toMatchObject({ policyId: id, status: 'matched' });
		}
	);
	it('uses the first overlapping match and reports the overlap', () => {
		const overlaps = [
			entry('first', { countries: ['US'] }),
			entry('second', { countries: ['US'] }),
		];
		expect(
			resolvePolicyRules({
				countryCode: 'US',
				regionCode: null,
				rules: overlaps,
			})
		).toMatchObject({ policyId: 'first' });
		expect(inspectPolicyRules(overlaps).warnings.length).toBeGreaterThan(0);
	});
	it('merges normalized matcher sets without losing fallback or default', () => {
		expect(
			policyMatchers.merge(
				policyMatchers.countries([' us ', 'US']),
				policyMatchers.regions([{ country: 'ca', region: 'qc' }]),
				policyMatchers.default(),
				policyMatchers.fallback()
			)
		).toEqual({
			countries: ['US'],
			fallback: true,
			isDefault: true,
			regions: [{ country: 'CA', region: 'QC' }],
		});
	});
	it('keeps insufficient input distinct from a known no-match', () => {
		const scoped = [entry('US', { countries: ['US'] })];
		expect(
			resolvePolicyRules({ countryCode: null, regionCode: null, rules: scoped })
		).toMatchObject({ reason: 'insufficient-inputs', status: 'failed' });
		expect(
			resolvePolicyRules({ countryCode: 'BR', regionCode: null, rules: scoped })
		).toEqual({ policy: null, status: 'no-match' });
	});
});
