import { describe, expect, test } from 'vitest';

import { inspectPolicyRules, normalizePolicyRule } from './policy-rule';
import { createPolicyRuleFingerprints } from './policy-rule-fingerprint';
import { policyRulePresets } from './policy-rule-presets';

const presetNames = Object.keys(
	policyRulePresets
) as (keyof typeof policyRulePresets)[];

describe('policyRulePresets', () => {
	test.each(presetNames)('%s normalizes with a dated source review', (name) => {
		const rule = policyRulePresets[name]();
		expect(() => normalizePolicyRule(rule)).not.toThrow();
		expect(rule.review?.status).toBe('reviewed');
		expect(rule.review?.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
		expect(rule.review?.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
		expect(Date.parse(rule.review?.reviewBy ?? '')).toBeGreaterThan(
			Date.parse(rule.review?.reviewedOn ?? '')
		);
		if (name !== 'worldOptOutNoPrompt') {
			expect(rule.review?.sources?.length).toBeGreaterThan(0);
		}
		expect(rule.review?.assumptions?.length).toBeGreaterThan(0);
		expect(rule.model).not.toBe('none');
	});

	test('each Europe variant validates with the regional presets as one pack', () => {
		for (const europe of ['europeOptIn', 'europeIab'] as const) {
			const { errors, warnings } = inspectPolicyRules(
				[
					policyRulePresets[europe](),
					policyRulePresets.californiaOptIn(),
					policyRulePresets.quebecOptIn(),
					policyRulePresets.worldOptOutNoPrompt(),
				],
				{ iabEnabled: true }
			);
			expect(errors).toEqual([]);
			expect(warnings).toEqual([]);
		}
		expect(
			inspectPolicyRules(
				[policyRulePresets.europeOptIn(), policyRulePresets.europeIab()],
				{ iabEnabled: true }
			).errors
		).toEqual(['Only one fallback policy is allowed']);
	});

	test('opt-in and IAB presets require a choice', () => {
		for (const name of [
			'europeOptIn',
			'europeIab',
			'californiaOptIn',
			'quebecOptIn',
		] as const) {
			expect(policyRulePresets[name]().prompt).toBe('choice');
		}
		expect(policyRulePresets.europeIab().model).toBe('iab');
	});

	test('californiaOptOut is an explicit no-prompt opt-out with persistent rights and GPC', () => {
		const rule = normalizePolicyRule(policyRulePresets.californiaOptOut());
		expect(rule).toMatchObject({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
			prompt: 'none',
			rights: ['disclosure', 'opt-out', 'preferences'],
		});
		expect(rule.actions.required).toEqual([]);
	});

	test('worldOptOutNoPrompt replaces worldNoBanner as an explicit default', () => {
		const rule = policyRulePresets.worldOptOutNoPrompt();
		expect(rule.match).toEqual({ isDefault: true });
		expect([rule.model, rule.prompt]).toEqual(['opt-out', 'none']);
		expect(rule.privacySignals).toBeUndefined();
		expect(normalizePolicyRule(rule).rights).toEqual([
			'disclosure',
			'opt-out',
			'preferences',
		]);
		expect('worldNoBanner' in policyRulePresets).toBe(false);
	});

	test('europe presets keep the EEA, UK and geo fallback matcher', () => {
		const rule = policyRulePresets.europeOptIn();
		expect(rule.match.fallback).toBe(true);
		expect(rule.match.countries).toEqual(
			expect.arrayContaining(['DE', 'GB', 'NO'])
		);
	});

	test.each(presetNames)(
		'%s retains frozen receipt compatibility without exposing legacy runtime fields',
		(name) => {
			const rule = policyRulePresets[name]();
			const normalized = normalizePolicyRule(rule);
			const current = createPolicyRuleFingerprints(
				normalized,
				rule.legacyMaterial
			);
			expect(current.legacyMaterial).toMatch(/^[0-9a-f]{64}$/u);
			expect(normalized).not.toHaveProperty('legacyMaterial');
			expect(normalized).not.toHaveProperty('ui');
			expect(
				createPolicyRuleFingerprints(
					{ ...normalized, copyRevision: 'changed' },
					rule.legacyMaterial
				).legacyMaterial
			).not.toBe(current.legacyMaterial);
		}
	);
});
