import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import {
	buildDraft,
	buildInitialIab,
	buildInitialSnapshot,
	DEFAULT_CONSENTS,
	DEFAULT_IAB,
} from '../snapshot';

describe('buildDraft', () => {
	test('keeps own boolean optional categories only', () => {
		expect(
			buildDraft({
				analytics: true,
				marketing: true,
				measurement: 'yes',
				necessary: true,
			} as unknown as Parameters<typeof buildDraft>[0])
		).toEqual({ marketing: true });
	});

	test('returns null when nothing usable was supplied', () => {
		expect(buildDraft(undefined)).toBeNull();
		expect(buildDraft({ necessary: true })).toBeNull();
	});
});

describe('buildInitialIab', () => {
	test('returns null when no seed', () => {
		expect(buildInitialIab(undefined)).toBeNull();
	});

	test('merges over the IAB defaults when a seed is provided', () => {
		const result = buildInitialIab({ cmpId: 7, enabled: true });
		expect(result?.enabled).toBe(true);
		expect(result?.cmpId).toBe(7);
		expect(result?.gvl).toBeNull();
		expect(result).not.toBe(DEFAULT_IAB);
	});
});

describe('buildInitialSnapshot', () => {
	test('uses the safe opt-in fallback when nothing is configured', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		expect(snap.revision).toBe(0);
		expect(Object.isFrozen(snap)).toBe(true);
		expect(snap.resolution).toEqual({ policy: null, status: 'unconfigured' });
		expect(snap.policyRule.id).toBe('c15t_safe_fallback');
		expect(snap.model).toBe('opt-in');
		expect(snap.effectivePermissions).toEqual(DEFAULT_CONSENTS);
		expect(snap.effectivePermissions).toBe(snap.effectivePermissions);
		expect(snap.explicitChoice).toBeNull();
		expect(snap).not.toHaveProperty('hasConsented');
		expect(snap.explicitChoice).toBeNull();
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(snap.activeUI).toBe('banner');
		expect(snap.evaluatedAt).toBe(NOW);
		expect(snap.subject).toBeNull();
		expect(snap.policyRule.model).toBe('opt-in');
	});

	test('initialDraft seed nothing but the draft', () => {
		const snap = buildInitialSnapshot({
			initialDraft: { marketing: true },
			now: NOW,
		});
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.explicitChoice).toBeNull();
		expect(snap.activeUI).toBe('banner');
	});

	test('initialRecords evaluate at config.now', () => {
		const snap = buildInitialSnapshot({
			initialRecords: choiceRecords(
				{
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
				},
				{ subjectId: 'legacy-id-42' }
			),
			now: NOW,
		});
		expect(Object.keys(snap.explicitChoice?.categories ?? {})).not.toHaveLength(
			0
		);
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
		expect(snap.activeUI).toBe('none');
		expect(snap.subject).toEqual({ subjectId: 'legacy-id-42' });
		expect(snap.subject?.subjectId ?? null).toBe('legacy-id-42');
	});

	test('invalid initialRecords are ignored, not salvaged', () => {
		const snap = buildInitialSnapshot({
			initialRecords: choiceRecords(
				{ marketing: true },
				{ confirmedAt: NOW + 1 }
			),
			now: NOW,
		});
		expect(snap.explicitChoice).toBeNull();
		expect(snap.effectivePermissions.marketing).toBe(false);
	});

	test('a precomputed matched resolution drives model, scope and prompt', () => {
		const snap = buildInitialSnapshot({
			initialPolicyResolution: matchedResolution(
				optOutRule({ categories: ['marketing'], prompt: 'notice' })
			),
			now: NOW,
		});
		expect(snap.model).toBe('opt-out');
		expect(snap.policyRule.scope).toEqual(['marketing']);
		expect(snap.policyRule.scopeMode).toBe('permissive');
		expect(snap.promptRequirement).toEqual({
			kind: 'notice',
			reason: 'missing',
		});
		expect(snap.activeUI).toBe('banner');
		expect(snap.effectivePermissions.marketing).toBe(true);
	});

	test('an unknown legacy initialPolicy cannot establish policy authority', () => {
		const config = {
			initialPolicy: { id: 'legacy', model: 'opt-out' },
			now: NOW,
		};
		const snap = buildInitialSnapshot(config);
		expect(snap.resolution.status).toBe('unconfigured');
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.policyRule.id).toBe('c15t_safe_fallback');
	});

	test('a provisional policy hides the first layer', () => {
		const snap = buildInitialSnapshot({
			initialPolicyPending: true,
			initialPolicyResolution: matchedResolution(optInRule()),
			now: NOW,
		});
		expect(snap.policyPending).toBe(true);
		expect(snap.activeUI).toBe('none');
	});

	test('detected and overridden GPC are kept apart', () => {
		const detected = buildInitialSnapshot({
			initialPrivacySignals: { gpc: true },
			now: NOW,
		});
		expect(detected.privacySignals).toEqual({
			gpc: { active: true, detected: true, override: undefined },
		});
		const overridden = buildInitialSnapshot({
			initialOverrides: { gpc: false },
			initialPrivacySignals: { gpc: true },
			now: NOW,
		});
		expect(overridden.privacySignals.gpc.active).toBe(false);
	});

	test('the normalized policy rule is immutable', () => {
		const snap = buildInitialSnapshot({
			initialPolicyResolution: matchedResolution(optInRule()),
			now: NOW,
		});
		expect(Object.isFrozen(snap.policyRule)).toBe(true);
		expect(Object.isFrozen(snap.policyRule.actions)).toBe(true);
		expect(snap).not.toHaveProperty('policyBanner');
		expect(snap).not.toHaveProperty('policyDialog');
	});

	test('does not share user reference with config', () => {
		const user = { externalId: 'u1' };
		const snap = buildInitialSnapshot({ initialUser: user, now: NOW });
		expect(snap.user).toEqual(user);
		expect(snap.user).not.toBe(user);
	});
});
