import { describe, expect, test } from 'vitest';

import { legacyPresetMaterial } from './legacy-preset-material';
import {
	createMaterialPolicyFingerprint,
	createMaterialPolicyFingerprintSync,
} from './policy-fingerprint';
import {
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
	safeFallbackPolicyRule,
} from './policy-resolution';
import { normalizePolicyRule } from './policy-rule';
import type { PolicyRule, ResolvedPolicyRule } from './policy-rule';
import {
	CHOICE_PROMPT_FINGERPRINT_VERSION,
	choicePromptFingerprintInput,
	createPolicyRuleFingerprints,
	createPresentationFingerprint,
	NOTICE_PROMPT_FINGERPRINT_VERSION,
	noticePromptFingerprintInput,
	POLICY_FINGERPRINT_VERSION,
	policyFingerprintInput,
} from './policy-rule-fingerprint';

const choiceRule: PolicyRule = {
	id: 'review',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
};

const base = normalizePolicyRule(choiceRule);
const initial = createPolicyRuleFingerprints(base);

const withPatch = (patch: Partial<ResolvedPolicyRule>) =>
	createPolicyRuleFingerprints({ ...base, ...patch });

describe('fingerprint domains', () => {
	test('policy, choice and notice hashes differ for the same rule', () => {
		expect(new Set([initial.policy, initial.choice, initial.notice]).size).toBe(
			3
		);
		expect(initial.choice).toMatch(/^[0-9a-f]{64}$/u);
	});

	test('inputs carry their domain, version and the configured prompt', () => {
		expect(policyFingerprintInput(base)).toMatchObject({
			domain: 'policy',
			prompt: 'choice',
			version: POLICY_FINGERPRINT_VERSION,
		});
		expect(choicePromptFingerprintInput(base)).toMatchObject({
			domain: 'choice',
			prompt: 'choice',
			version: CHOICE_PROMPT_FINGERPRINT_VERSION,
		});
		expect(noticePromptFingerprintInput(base)).toMatchObject({
			domain: 'notice',
			prompt: 'choice',
			scopeMode: 'permissive',
			version: NOTICE_PROMPT_FINGERPRINT_VERSION,
		});
	});

	test('changing the configured prompt changes both prompt hashes', () => {
		const changed = withPatch({ prompt: 'notice' });
		expect(changed.choice).not.toBe(initial.choice);
		expect(changed.notice).not.toBe(initial.notice);
		expect(changed.policy).not.toBe(initial.policy);
	});

	test('choice and notice validity are independent', () => {
		const choiceChange = withPatch({
			validity: { ...base.validity, choiceMs: base.validity.choiceMs + 1 },
		});
		expect(choiceChange.choice).not.toBe(initial.choice);
		expect(choiceChange.notice).toBe(initial.notice);
		expect(choiceChange.policy).not.toBe(initial.policy);

		const noticeChange = withPatch({
			validity: { ...base.validity, noticeMs: base.validity.noticeMs + 1 },
		});
		expect(noticeChange.choice).toBe(initial.choice);
		expect(noticeChange.notice).not.toBe(initial.notice);
		expect(noticeChange.policy).not.toBe(initial.policy);
	});

	test('material inputs change every relevant domain', () => {
		const scope = withPatch({ scope: ['marketing'] });
		expect(scope.choice).not.toBe(initial.choice);
		expect(scope.notice).not.toBe(initial.notice);

		const scopeMode = withPatch({ scopeMode: 'strict' });
		expect(scopeMode.choice).not.toBe(initial.choice);
		expect(scopeMode.notice).not.toBe(initial.notice);

		const rights = withPatch({
			rights: ['disclosure', 'opt-out', 'preferences'],
		});
		expect(rights.choice).not.toBe(initial.choice);
		expect(rights.notice).not.toBe(initial.notice);

		const gpc = withPatch({
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
		});
		expect(gpc.policy).not.toBe(initial.policy);
		expect(gpc.choice).not.toBe(initial.choice);
		expect(gpc.notice).not.toBe(initial.notice);

		const copy = withPatch({ copyRevision: 'v2' });
		expect(copy.choice).not.toBe(initial.choice);
		expect(copy.notice).not.toBe(initial.notice);
	});

	test('exact-policy inputs outside the prompt contract change only the policy hash', () => {
		const preselected = withPatch({ preselectedCategories: ['marketing'] });
		expect(preselected.policy).not.toBe(initial.policy);
		expect(preselected.choice).toBe(initial.choice);
		expect(preselected.notice).toBe(initial.notice);

		const proof = withPatch({
			proof: { storeIp: true, storeLanguage: false, storeUserAgent: false },
		});
		expect(proof.policy).not.toBe(initial.policy);
		expect(proof.choice).toBe(initial.choice);
		expect(proof.notice).toBe(initial.notice);

		const customize = withPatch({
			actions: { ...base.actions, allowed: ['accept', 'reject'] },
		});
		expect(customize.policy).not.toBe(initial.policy);
		expect(customize.choice).toBe(initial.choice);
	});

	test('cosmetic and identity inputs change nothing', () => {
		expect(withPatch({ id: 'other' })).toEqual(initial);
		expect(
			withPatch({ i18n: { language: 'fr', messageProfile: 'eu' } })
		).toEqual(initial);
		expect(
			createPolicyRuleFingerprints(
				normalizePolicyRule({
					...choiceRule,
					match: { countries: ['DE'] },
					review: { sources: ['https://example.test'], status: 'pending' },
				})
			)
		).toEqual(initial);
	});

	test('set order and duplicates do not change any hash', () => {
		const first = normalizePolicyRule({
			...choiceRule,
			actions: ['customize', 'accept', 'reject'],
			categories: ['measurement', 'marketing', 'marketing'],
			privacySignals: { gpc: { denyCategories: ['measurement', 'marketing'] } },
			rights: ['opt-out', 'disclosure'],
		});
		const second = normalizePolicyRule({
			...choiceRule,
			actions: ['accept', 'reject', 'customize'],
			categories: ['marketing', 'measurement'],
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			rights: ['opt-out'],
		});
		expect(createPolicyRuleFingerprints(first)).toEqual(
			createPolicyRuleFingerprints(second)
		);
		const unsorted: ResolvedPolicyRule = {
			...second,
			actions: {
				...second.actions,
				allowed: ['reject', 'customize', 'accept'],
			},
			scope: ['measurement', 'marketing'],
		};
		expect(createPolicyRuleFingerprints(unsorted)).toEqual(
			createPolicyRuleFingerprints(second)
		);
	});

	test('is deterministic across calls', () => {
		expect(createPolicyRuleFingerprints(base)).toEqual(initial);
	});
});

describe('createPresentationFingerprint', () => {
	test('reacts to layout changes and ignores key order and undefined members', () => {
		const row = createPresentationFingerprint({
			layout: 'row',
			variant: 'primary',
		});
		const column = createPresentationFingerprint({
			layout: 'column',
			variant: 'primary',
		});
		expect(row).not.toBe(column);
		expect(
			createPresentationFingerprint({
				extra: undefined,
				layout: 'row',
				variant: 'primary',
			})
		).toBe(row);
	});

	test('never equals a policy domain hash of the same content', () => {
		expect(
			createPresentationFingerprint(policyFingerprintInput(base))
		).not.toBe(initial.policy);
	});
});

describe('safe fallback constants', () => {
	test('match the hashes of the fallback rule', () => {
		expect(createPolicyRuleFingerprints(safeFallbackPolicyRule())).toEqual(
			SAFE_FALLBACK_POLICY_FINGERPRINTS
		);
	});
});

describe('legacy fingerprint bytes', () => {
	const resolved = legacyPresetMaterial.europeOptIn.input;

	test('createMaterialPolicyFingerprint keeps its v2 bytes', async () => {
		await expect(createMaterialPolicyFingerprint(resolved)).resolves.toBe(
			'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230'
		);
		expect(createMaterialPolicyFingerprintSync(resolved)).toBe(
			'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230'
		);
	});

	test('the v3 domains never collide with the v2 material hash', () => {
		const lifted = normalizePolicyRule({
			...choiceRule,
			id: 'europe_opt_in',
			proof: resolved.proof,
			validity: { choiceDays: 365 },
		});
		const fingerprints = createPolicyRuleFingerprints(lifted);
		expect(Object.values(fingerprints)).not.toContain(
			'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230'
		);
	});
});
