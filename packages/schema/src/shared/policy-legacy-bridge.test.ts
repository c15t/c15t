import { describe, expect, test } from 'vitest';

import type { ResolvedPolicy } from '~/api/init';

import { createMaterialPolicyFingerprintSync } from './policy-fingerprint';
import {
	describeLegacyProjection,
	isPolicyRuleLegacyExpressible,
	liftLegacyPolicyConfig,
	liftLegacyResolvedPolicy,
	projectPolicyRuleToLegacy,
	projectPolicyRuleToLegacyConfig,
	readLegacyPolicyWire,
} from './policy-legacy-bridge';
import { policyPackPresets } from './policy-pack-defaults';
import { normalizePolicyRule } from './policy-rule';
import type { PolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import { createResolvedPolicyFromConfig } from './policy-runtime';
import type { PolicyConfig } from './policy-runtime';

const legacy = (
	consent: PolicyConfig['consent'],
	ui?: PolicyConfig['ui']
): PolicyConfig => ({
	consent,
	id: 'legacy',
	match: { isDefault: true },
	ui,
});

const normalizeLifted = (policy: PolicyConfig) =>
	normalizePolicyRule(liftLegacyPolicyConfig(policy));

describe('liftLegacyPolicyConfig', () => {
	test.each([
		{
			expected: ['opt-in', 'choice'],
			label: 'opt-in',
			policy: legacy({ model: 'opt-in' }, { mode: 'banner' }),
		},
		{
			expected: ['opt-in', 'choice'],
			label: 'default model',
			policy: legacy(undefined),
		},
		{
			expected: ['iab', 'choice'],
			label: 'iab',
			policy: legacy({ model: 'iab' }),
		},
		{
			expected: ['opt-out', 'choice'],
			label: 'opt-out banner',
			policy: legacy({ model: 'opt-out' }, { mode: 'banner' }),
		},
		{
			expected: ['opt-out', 'choice'],
			label: 'opt-out dialog',
			policy: legacy({ model: 'opt-out' }, { mode: 'dialog' }),
		},
		{
			expected: ['opt-out', 'choice'],
			label: 'opt-out without ui',
			policy: legacy({ model: 'opt-out' }),
		},
		{
			expected: ['opt-out', 'none'],
			label: 'opt-out ui none',
			policy: legacy({ model: 'opt-out' }, { mode: 'none' }),
		},
		{
			expected: ['opt-out', 'none'],
			label: 'none',
			policy: legacy({ model: 'none' }, { mode: 'none' }),
		},
	])('maps $label', ({ policy, expected }) => {
		const rule = liftLegacyPolicyConfig(policy);
		expect([rule.model, rule.prompt]).toEqual(expected);
		expect(() => normalizePolicyRule(rule)).not.toThrow();
	});

	test('maps gpc, expiry, actions, scope and preselection', () => {
		const rule = liftLegacyPolicyConfig(
			legacy(
				{
					categories: ['necessary', 'marketing', 'analytics'],
					expiryDays: 180,
					gpc: true,
					model: 'opt-out',
					preselectedCategories: ['marketing', 'measurement'],
					scopeMode: 'strict',
				},
				{ banner: { allowedActions: ['accept', 'customize'] }, mode: 'banner' }
			)
		);
		expect(rule).toMatchObject({
			actions: ['accept', 'reject', 'customize'],
			categories: ['marketing'],
			preselectedCategories: ['marketing'],
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			scopeMode: 'strict',
			validity: { choiceDays: 180 },
		});
	});

	test('keeps the v2 wildcard scope for iab', () => {
		const rule = normalizeLifted(
			legacy({ categories: ['marketing'], model: 'iab', scopeMode: 'strict' })
		);
		expect(rule.scope).toHaveLength(4);
		expect(rule.scopeMode).toBe('permissive');
	});

	test('ignores unbounded or invalid expiry', () => {
		expect(
			liftLegacyPolicyConfig(legacy({ expiryDays: 0 })).validity
		).toBeUndefined();
		expect(liftLegacyPolicyConfig(legacy({})).validity).toBeUndefined();
	});
});

describe('projectPolicyRuleToLegacy', () => {
	const rule = (patch: Partial<PolicyRule>) =>
		normalizePolicyRule({
			id: 'rule',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
			...patch,
		});

	test('opt-in choice becomes an opt-in banner with allowed actions', () => {
		expect(projectPolicyRuleToLegacy(rule({}))).toEqual({
			consent: {
				categories: undefined,
				expiryDays: 365,
				gpc: undefined,
				preselectedCategories: undefined,
				scopeMode: 'permissive',
			},
			i18n: undefined,
			id: 'rule',
			model: 'opt-in',
			proof: { storeIp: false, storeLanguage: false, storeUserAgent: false },
			ui: {
				banner: { allowedActions: ['accept', 'reject', 'customize'] },
				dialog: { allowedActions: ['accept', 'reject', 'customize'] },
				mode: 'banner',
			},
		});
	});

	test('restricted scope lists necessary plus the scope', () => {
		expect(
			projectPolicyRuleToLegacy(rule({ categories: ['marketing'] })).consent
				?.categories
		).toEqual(['necessary', 'marketing']);
	});

	test('iab keeps the wildcard scope and no ui', () => {
		const projected = projectPolicyRuleToLegacy(rule({ model: 'iab' }));
		expect(projected.model).toBe('iab');
		expect(projected.consent?.categories).toEqual(['*']);
		expect(projected.ui).toBeUndefined();
	});

	test('opt-out none keeps ui none', () => {
		const projected = projectPolicyRuleToLegacy(
			rule({ model: 'opt-out', prompt: 'none' })
		);
		expect(projected.ui).toEqual({ mode: 'none' });
		expect(projected.consent?.gpc).toBeUndefined();
	});

	test('any GPC mapping projects to the safe opt-in banner without the v2 gpc flag', () => {
		const projected = projectPolicyRuleToLegacy(
			rule({
				model: 'opt-out',
				privacySignals: {
					gpc: { denyCategories: ['marketing', 'measurement'] },
				},
				prompt: 'none',
			})
		);
		expect(projected).toMatchObject({
			model: 'opt-in',
			ui: { mode: 'banner' },
		});
		expect(projected.consent?.gpc).toBeUndefined();
	});

	test('a scoped or strict IAB rule projects to the safe opt-in banner', () => {
		const projected = projectPolicyRuleToLegacy(
			rule({ categories: ['marketing'], model: 'iab', scopeMode: 'strict' })
		);
		expect(projected.model).toBe('opt-in');
		expect(projected.consent?.categories).toEqual(['necessary', 'marketing']);
	});

	test('a notice prompt projects to the safe opt-in banner under the same id', () => {
		const projected = projectPolicyRuleToLegacy(
			rule({ model: 'opt-out', prompt: 'notice' })
		);
		expect(projected).toMatchObject({
			consent: { scopeMode: 'strict' },
			id: 'rule',
			model: 'opt-in',
			ui: { mode: 'banner' },
		});
	});

	test('describes fidelity honestly', () => {
		expect(describeLegacyProjection(rule({}))).toEqual({
			fidelity: 'exact',
			limitations: [],
		});
		const none = describeLegacyProjection(
			rule({ copyRevision: 'v2', model: 'opt-out', prompt: 'none' })
		);
		expect(none.fidelity).toBe('degraded');
		expect(none.limitations).toEqual([
			expect.stringContaining('rights access depends on the host'),
			expect.stringContaining('copy revision'),
		]);
		for (const candidate of [
			rule({ model: 'opt-out', prompt: 'notice' }),
			rule({
				model: 'opt-out',
				privacySignals: {
					gpc: { denyCategories: ['marketing', 'measurement'] },
				},
				prompt: 'none',
			}),
			rule({ categories: ['marketing'], model: 'iab' }),
			rule({ model: 'iab', scopeMode: 'strict' }),
		]) {
			expect(describeLegacyProjection(candidate).fidelity).toBe('fallback');
			expect(isPolicyRuleLegacyExpressible(candidate)).toBe(false);
		}
	});

	test('lifting a projection round-trips the behavior of exact rules', () => {
		for (const candidate of [
			rule({}),
			rule({ categories: ['marketing', 'measurement'], scopeMode: 'strict' }),
			rule({ model: 'opt-out', prompt: 'none' }),
			rule({ model: 'iab' }),
		]) {
			const projected = projectPolicyRuleToLegacy(candidate);
			const config: PolicyConfig = {
				consent: { ...projected.consent, model: projected.model },
				id: projected.id,
				match: { isDefault: true },
				proof: projected.proof,
				ui: projected.ui,
			};
			expect(createPolicyRuleFingerprints(normalizeLifted(config))).toEqual(
				createPolicyRuleFingerprints(candidate)
			);
		}
	});

	test('projectPolicyRuleToLegacyConfig keeps the matcher', () => {
		const config = projectPolicyRuleToLegacyConfig({
			id: 'rule',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
		});
		expect(config.match).toEqual({ countries: ['DE'] });
		expect(config.consent?.model).toBe('opt-in');
	});
});

describe('liftLegacyResolvedPolicy', () => {
	test('lifts the v2 wire shape', () => {
		const resolved = createResolvedPolicyFromConfig(
			policyPackPresets.californiaOptOut()
		);
		const rule = liftLegacyResolvedPolicy(resolved);
		expect(rule).toMatchObject({
			id: 'california_opt_out',
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			prompt: 'none',
			rights: ['disclosure', 'opt-out', 'preferences'],
		});
	});
});

describe('readLegacyPolicyWire', () => {
	const resolved = createResolvedPolicyFromConfig(
		policyPackPresets.europeOptIn()
	);

	test('absent policy is unconfigured in the v2 meaning', () => {
		expect(readLegacyPolicyWire({})).toEqual({
			policy: null,
			status: 'unconfigured',
		});
		expect(readLegacyPolicyWire({ policy: null })).toEqual({
			policy: null,
			status: 'unconfigured',
		});
	});

	test('the no_banner sentinel is a no-match', () => {
		expect(
			readLegacyPolicyWire({
				policy: { id: 'no_banner', model: 'none', ui: { mode: 'none' } },
			})
		).toEqual({ policy: null, status: 'no-match' });
	});

	test('lifts a matched policy with the v2 material fingerprint', () => {
		const read = readLegacyPolicyWire({
			policy: resolved,
			policyDecision: {
				country: 'DE',
				fingerprint: 'x',
				jurisdiction: 'GDPR',
				matchedBy: 'country',
				policyId: resolved.id,
				region: null,
			},
		});
		expect(read).toMatchObject({
			matchedBy: 'country',
			policyId: 'europe_opt_in',
			status: 'matched',
		});
		if (read.status === 'matched') {
			expect(read.fingerprints.legacyMaterial).toBe(
				createMaterialPolicyFingerprintSync(resolved)
			);
			expect(read.fingerprints.legacyMaterial).toBe(
				'7d6f3c71d9c6c6dae0730bd6cfec93f79dbdee423f854ae0efd43e974b657230'
			);
			expect(read.policy).toEqual(liftLegacyResolvedPolicy(resolved));
		}
	});

	test('a policy it cannot lift fails as invalid payload', () => {
		const broken = {
			consent: { model: 'opt-out', preselectedCategories: 'x' },
			id: 'broken',
			model: 'opt-out',
		} as unknown as ResolvedPolicy;
		expect(readLegacyPolicyWire({ policy: broken })).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
	});
});
