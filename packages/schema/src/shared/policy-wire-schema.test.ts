import * as v from 'valibot';
import { describe, expect, test } from 'vitest';

import { initOutputSchema } from '../api/init';
import {
	readPolicyResolutionWire,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from './policy-resolution';
import { normalizePolicyRule } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import {
	policyResolutionWireSchema,
	resolvedPolicyRuleSchema,
} from './policy-wire-schema';

const authored: PolicyRule = {
	categories: ['marketing'],
	id: 'review',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};
const policy = normalizePolicyRule(authored);
const matched = {
	fingerprints: createPolicyRuleFingerprints(policy),
	matchedBy: 'default',
	policy,
	policyId: 'review',
	status: 'matched',
	version: 1,
};
const changed = (patch: Record<string, unknown>) => ({
	...matched,
	policy: { ...policy, ...patch },
});

const accepted = (input: unknown) =>
	v.safeParse(policyResolutionWireSchema, input).success;

describe('policyResolutionWireSchema', () => {
	test('accepts every producer outcome', () => {
		for (const resolution of [
			resolvePolicyRules({ countryCode: 'DE', regionCode: null }),
			resolvePolicyRules({ countryCode: 'DE', regionCode: null, rules: [] }),
			resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [authored],
			}),
			resolvePolicyRules({ countryCode: 'DE', regionCode: null, rules: 'x' }),
		]) {
			const wire = JSON.parse(
				JSON.stringify(writePolicyResolutionWire(resolution))
			) as unknown;
			expect(accepted(wire)).toBe(true);
			expect(readPolicyResolutionWire(wire)).toEqual(resolution);
		}
	});

	test.each([
		{ input: { ...matched, version: 2 }, label: 'unknown version' },
		{ input: { ...matched, status: 'pending' }, label: 'unknown status' },
		{ input: { ...matched, extra: true }, label: 'extra wire field' },
		{ input: { ...matched, policy: null }, label: 'matched with null policy' },
		{
			input: { policy, status: 'no-match', version: 1 },
			label: 'no-match with a policy',
		},
		{ input: changed({ model: 'notice' }), label: 'unknown model' },
		{ input: changed({ prompt: 'future' }), label: 'unknown prompt' },
		{ input: changed({ unknown: true }), label: 'unknown rule field' },
		{
			input: changed({
				privacySignals: {
					gpc: { denyCategories: [], informedException: true },
				},
			}),
			label: 'unknown nested field',
		},
		{
			input: changed({ model: 'opt-out', prompt: 'notice' }),
			label: 'invalid pairing',
		},
		{
			input: changed({
				actions: {
					allowed: ['dismiss'],
					equivalent: [],
					required: ['dismiss'],
				},
			}),
			label: 'notice actions on choice',
		},
		{
			input: changed({ actions: { ...policy.actions, equivalent: [] } }),
			label: 'missing equivalence',
		},
		{
			input: changed({ rights: ['disclosure'] }),
			label: 'missing preferences right',
		},
		{
			input: changed({
				privacySignals: { gpc: { denyCategories: ['marketing', 'marketing'] } },
			}),
			label: 'duplicate GPC mapping',
		},
		{
			input: changed({
				privacySignals: { gpc: { denyCategories: ['measurement'] } },
			}),
			label: 'GPC outside scope',
		},
		{
			input: changed({ preselectedCategories: ['measurement'] }),
			label: 'preselection outside scope',
		},
		{
			input: changed({ validity: { choiceMs: Number.MAX_VALUE, noticeMs: 1 } }),
			label: 'unsafe validity',
		},
		{
			input: changed({ validity: { choiceMs: 0, noticeMs: 1 } }),
			label: 'zero validity',
		},
		{ input: changed({ copyRevision: '' }), label: 'empty copy revision' },
		{
			input: { ...matched, fingerprints: { choice: 'b', policy: 'a' } },
			label: 'missing fingerprint',
		},
	])('rejects $label exactly like the client reader', ({ input }) => {
		expect(accepted(input)).toBe(false);
		expect(readPolicyResolutionWire(input).status).toBe('failed');
	});

	test('resolvedPolicyRuleSchema reports the shared invariant message', () => {
		const result = v.safeParse(resolvedPolicyRuleSchema, {
			...policy,
			rights: ['disclosure'],
		});
		expect(result.success).toBe(false);
		expect(result.issues?.map((issue) => issue.message)).toEqual([
			'model "opt-in" requires rights [disclosure, preferences]',
		]);
	});
});

describe('initOutputSchema', () => {
	test('carries policyResolution next to the v2 fields', () => {
		const output = v.parse(initOutputSchema, {
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: { countryCode: 'DE', regionCode: null },
			policyResolution: JSON.parse(JSON.stringify(matched)) as unknown,
			translations: {
				language: 'en',
				translations: {
					common: {},
					consentManagerDialog: {},
					consentTypes: {},
					cookieBanner: {},
				},
			},
		});
		expect(output.policyResolution?.status).toBe('matched');
		expect(output.policy).toBeUndefined();
	});
});
