import { describe, expect, test } from 'vitest';

import {
	matchPolicyRules,
	parsePolicyContractHeader,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	readPolicyResolutionWire,
	resolvePolicyRules,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
	SAFE_FALLBACK_POLICY_ID,
	safeFallbackPolicyInput,
	safeFallbackPolicyRule,
	writePolicyResolutionWire,
} from './policy-resolution';
import type { PolicyResolutionWire } from './policy-resolution';
import {
	collectResolvedPolicyRuleIssues,
	normalizePolicyRule,
} from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';

const europe: PolicyRule = {
	id: 'europe',
	match: { countries: ['DE', 'FR'], fallback: true },
	model: 'opt-in',
	prompt: 'choice',
};
const california: PolicyRule = {
	id: 'california',
	match: { regions: [{ country: 'US', region: 'CA' }] },
	model: 'opt-out',
	privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
	prompt: 'none',
};
const world: PolicyRule = {
	id: 'world',
	match: { isDefault: true },
	model: 'opt-out',
	prompt: 'notice',
};

const authored: PolicyRule = {
	categories: ['marketing'],
	id: 'review',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};
const policy = normalizePolicyRule(authored);
const matchedWire = {
	fingerprints: createPolicyRuleFingerprints(policy),
	matchedBy: 'default',
	policy,
	policyId: 'review',
	status: 'matched',
	version: 1,
};
const changed = (patch: Record<string, unknown>) => ({
	...matchedWire,
	policy: { ...policy, ...patch },
});

describe('resolvePolicyRules', () => {
	test('distinguishes unconfigured, matched, no-match and failed outcomes', () => {
		expect(resolvePolicyRules({ countryCode: 'DE', regionCode: null })).toEqual(
			{
				policy: null,
				status: 'unconfigured',
			}
		);

		const matched = resolvePolicyRules({
			countryCode: 'us',
			regionCode: 'US-CA',
			rules: [europe, california],
		});
		expect(matched).toMatchObject({
			matchedBy: 'region',
			policyId: 'california',
			status: 'matched',
		});
		if (matched.status === 'matched') {
			expect(matched.policy.privacySignals.gpc.denyCategories).toEqual([
				'marketing',
				'measurement',
			]);
			expect(matched.fingerprints).toEqual(
				createPolicyRuleFingerprints(matched.policy)
			);
		}

		expect(
			resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'NY',
				rules: [europe],
			})
		).toEqual({ policy: null, status: 'no-match' });

		expect(
			resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [{ ...europe, match: { countries: ['DE'] } }],
			})
		).toEqual({
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
		});

		expect(
			resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [{ ...europe, prompt: 'notice' }],
			})
		).toEqual({
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
		});
	});

	test('an explicit empty pack is configured and matches nothing', () => {
		expect(
			resolvePolicyRules({ countryCode: null, regionCode: null, rules: [] })
		).toEqual({ policy: null, status: 'no-match' });
	});

	test('uses fallback for unknown locations and default for known ones', () => {
		expect(
			resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [europe, world],
			})
		).toMatchObject({ matchedBy: 'fallback', policyId: 'europe' });
		expect(
			resolvePolicyRules({
				countryCode: 'BR',
				regionCode: null,
				rules: [europe, world],
			})
		).toMatchObject({ matchedBy: 'default', policyId: 'world' });
		expect(
			resolvePolicyRules({
				countryCode: 'fr',
				regionCode: null,
				rules: [europe, world],
			})
		).toMatchObject({ matchedBy: 'country', policyId: 'europe' });
	});

	test.each([
		{ countries: [1] },
		{ regions: [null] },
		{ regions: [{ country: 'US' }] },
	])('malformed matcher %j fails without throwing', (match) => {
		expect(
			resolvePolicyRules({
				countryCode: 'US',
				regionCode: 'CA',
				rules: [{ ...authored, match }],
			})
		).toEqual({
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
		});
	});

	test('non-array rules fail as invalid configuration', () => {
		expect(
			resolvePolicyRules({ countryCode: 'US', regionCode: null, rules: 'nope' })
		).toMatchObject({ reason: 'invalid-configuration', status: 'failed' });
	});
});

describe('matchPolicyRules', () => {
	test('normalizes codes and dashed regions', () => {
		const entries = [california, europe];
		expect(
			matchPolicyRules({ countryCode: ' us ', entries, regionCode: 'us-ca' })
		).toEqual({ index: 0, matchedBy: 'region', status: 'matched' });
		expect(
			matchPolicyRules({ countryCode: 'DE', entries, regionCode: undefined })
		).toEqual({ index: 1, matchedBy: 'country', status: 'matched' });
	});
});

describe('wire round trip', () => {
	test('a matched producer resolution survives JSON', () => {
		const resolved = resolvePolicyRules({
			countryCode: 'US',
			regionCode: 'CA',
			rules: [authored],
		});
		expect(resolved.status).toBe('matched');
		const wire = writePolicyResolutionWire(resolved);
		expect(wire.version).toBe(POLICY_CONTRACT_VERSION);
		expect(readPolicyResolutionWire(JSON.parse(JSON.stringify(wire)))).toEqual(
			resolved
		);
	});

	test('every null outcome stays distinct', () => {
		for (const resolution of [
			{ policy: null, status: 'no-match' } as const,
			{ policy: null, status: 'unconfigured' } as const,
			{
				policy: null,
				reason: 'insufficient-inputs',
				status: 'failed',
			} as const,
		]) {
			expect(
				readPolicyResolutionWire(
					JSON.parse(JSON.stringify(writePolicyResolutionWire(resolution)))
				)
			).toEqual(resolution);
		}
	});
});

describe('readPolicyResolutionWire', () => {
	test.each([undefined, null, {}, { status: 'no-match', version: 1 }])(
		'a missing or incomplete wire %j is an invalid payload, never unconfigured',
		(input) => {
			expect(readPolicyResolutionWire(input)).toEqual({
				policy: null,
				reason: 'invalid-payload',
				status: 'failed',
			});
		}
	);

	test('matched with a null policy is invalid', () => {
		expect(
			readPolicyResolutionWire({ policy: null, status: 'matched', version: 1 })
		).toMatchObject({ reason: 'invalid-payload', status: 'failed' });
	});

	test.each([
		{ input: { ...matchedWire, version: 99 }, label: 'unknown version' },
		{ input: { ...matchedWire, status: 'pending' }, label: 'unknown status' },
		{ input: changed({ model: 'notice' }), label: 'unknown model' },
		{ input: changed({ prompt: 'future' }), label: 'unknown prompt' },
		{ input: changed({ scope: ['unknown'] }), label: 'unknown scope category' },
		{
			input: changed({
				actions: { ...policy.actions, allowed: ['accept', 'reject', 'snooze'] },
			}),
			label: 'unknown action',
		},
		{
			input: changed({ rights: ['disclosure', 'preferences', 'erasure'] }),
			label: 'unknown right',
		},
		{ input: changed({ scopeMode: 'loose' }), label: 'unknown scope mode' },
		{
			input: { ...matchedWire, matchedBy: 'magic' },
			label: 'unknown matchedBy',
		},
		{
			input: { policy: null, reason: 'meh', status: 'failed', version: 1 },
			label: 'unknown failure reason',
		},
		{ input: changed({ unknown: true }), label: 'unknown rule field' },
		{ input: { ...matchedWire, extra: 1 }, label: 'unknown wire field' },
		{
			input: changed({
				privacySignals: {
					gpc: { denyCategories: [], informedException: true },
				},
			}),
			label: 'unknown nested field',
		},
		{
			input: {
				...matchedWire,
				fingerprints: { ...matchedWire.fingerprints, presentation: 'x' },
			},
			label: 'unknown fingerprint field',
		},
	])('$label fails as unsupported contract', ({ input }) => {
		expect(readPolicyResolutionWire(input)).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});

	test('cannot inherit required fields', () => {
		expect(readPolicyResolutionWire(Object.create(matchedWire)).status).toBe(
			'failed'
		);
		expect(
			readPolicyResolutionWire({
				...matchedWire,
				policy: Object.create(policy),
			}).status
		).toBe('failed');
	});

	test.each([
		{
			label: 'notice actions on choice',
			patch: {
				actions: {
					allowed: ['dismiss'],
					equivalent: [],
					required: ['dismiss'],
				},
				rights: [],
			},
		},
		{
			label: 'no required actions',
			patch: {
				actions: {
					allowed: ['accept', 'reject'],
					equivalent: [['accept', 'reject']],
					required: [],
				},
			},
		},
		{
			label: 'allowed drops reject',
			patch: {
				actions: {
					allowed: ['accept'],
					equivalent: [['accept', 'reject']],
					required: ['accept', 'reject'],
				},
			},
		},
		{
			label: 'no equivalence group',
			patch: {
				actions: {
					allowed: ['accept', 'reject'],
					equivalent: [],
					required: ['accept', 'reject'],
				},
			},
		},
		{ label: 'disclosure only', patch: { rights: ['disclosure'] } },
		{ label: 'preferences only', patch: { rights: ['preferences'] } },
		{ label: 'invalid pairing', patch: { model: 'opt-out', prompt: 'notice' } },
		{
			label: 'duplicate GPC mapping',
			patch: {
				privacySignals: { gpc: { denyCategories: ['marketing', 'marketing'] } },
			},
		},
		{
			label: 'GPC outside scope',
			patch: { privacySignals: { gpc: { denyCategories: ['measurement'] } } },
		},
		{
			label: 'preselection outside scope',
			patch: { preselectedCategories: ['measurement'] },
		},
		{
			label: 'iab preselection',
			patch: { model: 'iab', preselectedCategories: ['marketing'] },
		},
		{ label: 'duplicate scope', patch: { scope: ['marketing', 'marketing'] } },
		{
			label: 'unsafe validity',
			patch: { validity: { choiceMs: Number.MAX_VALUE, noticeMs: 1 } },
		},
		{
			label: 'zero validity',
			patch: { validity: { choiceMs: 0, noticeMs: 1 } },
		},
		{ label: 'empty copy revision', patch: { copyRevision: '' } },
		{ label: 'policyId mismatch', patch: { id: 'other' } },
	])('$label fails as invalid payload', ({ patch }) => {
		expect(readPolicyResolutionWire(changed(patch))).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
	});

	test('re-sorts sets on read so the result equals the authored rule', () => {
		const shuffled = changed({
			rights: ['preferences', 'disclosure'],
			scope: [...policy.scope].reverse(),
		});
		const read = readPolicyResolutionWire(shuffled);
		expect(read.status).toBe('matched');
		if (read.status === 'matched') {
			expect(read.policy).toEqual(policy);
			expect(collectResolvedPolicyRuleIssues(read.policy)).toEqual([]);
		}
	});

	test('keeps an optional legacy material fingerprint', () => {
		const wire: PolicyResolutionWire = {
			...matchedWire,
			fingerprints: { ...matchedWire.fingerprints, legacyMaterial: 'abc' },
		} as PolicyResolutionWire;
		const read = readPolicyResolutionWire(wire);
		expect(read.status === 'matched' && read.fingerprints.legacyMaterial).toBe(
			'abc'
		);
	});
});

describe('contract header', () => {
	test('parses only plain integers', () => {
		expect(POLICY_CONTRACT_HEADER).toBe('x-c15t-policy-contract');
		expect(parsePolicyContractHeader('1')).toBe(1);
		expect(parsePolicyContractHeader(' 2 ')).toBe(2);
		expect(parsePolicyContractHeader('1junk')).toBeUndefined();
		expect(parsePolicyContractHeader(null)).toBeUndefined();
	});
});

describe('safe fallback', () => {
	test('is a strict opt-in choice rule with precomputed fingerprints', () => {
		const rule = safeFallbackPolicyRule();
		expect([rule.id, rule.model, rule.prompt, rule.scopeMode]).toEqual([
			SAFE_FALLBACK_POLICY_ID,
			'opt-in',
			'choice',
			'strict',
		]);
		expect(rule.privacySignals.gpc.denyCategories).toEqual([]);
		expect(collectResolvedPolicyRuleIssues(rule)).toEqual([]);
		expect(rule).toEqual(
			normalizePolicyRule({
				id: SAFE_FALLBACK_POLICY_ID,
				match: { isDefault: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
			})
		);
		const input = safeFallbackPolicyInput();
		expect(input.fingerprints).toEqual(SAFE_FALLBACK_POLICY_FINGERPRINTS);
		expect(input.fingerprints).not.toBe(SAFE_FALLBACK_POLICY_FINGERPRINTS);
		expect(input.policy).not.toBe(rule);
	});
});
