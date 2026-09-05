import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { applyPatch, buildNextSnapshot, snapshotChanged } from '../patch';
import { buildInitialSnapshot } from '../snapshot';

describe('applyPatch', () => {
	test('increments revision by exactly 1 and returns a frozen snapshot', () => {
		const initial = buildInitialSnapshot({ now: NOW });
		const next = applyPatch(initial, { subject: { subjectId: 'sub_1' } });
		expect(next.revision).toBe(1);
		expect(Object.isFrozen(next)).toBe(true);
		const after = applyPatch(next, { subject: null });
		expect(after.revision).toBe(2);
		expect(initial.revision).toBe(0);
	});

	test('undefined fields preserve current values, null clears them', () => {
		const initial = buildInitialSnapshot({
			initialRecords: { subject: { subjectId: 'sub_1' } },
			initialUser: { externalId: 'u1' },
			now: NOW,
		});
		const kept = applyPatch(initial, { branding: 'consent' });
		expect(kept.user).toBe(initial.user);
		expect(kept.subject).toBe(initial.subject);
		const cleared = applyPatch(initial, { subject: null, user: null });
		expect(cleared.user).toBeNull();
		expect(cleared.subject).toBeNull();
		expect(cleared.subject?.subjectId ?? null).toBeNull();
	});

	test('derived fields keep their reference when their value is unchanged', () => {
		const initial = buildInitialSnapshot({ now: NOW });
		const next = buildNextSnapshot(initial, { now: NOW + 1000 });
		expect(next.effectivePermissions).toBe(initial.effectivePermissions);
		expect(next.effectivePermissions).toBe(initial.effectivePermissions);
		expect(next.promptRequirement).toBe(initial.promptRequirement);
		expect(next.restrictions).toBe(initial.restrictions);
		expect(next.privacySignals).toBe(initial.privacySignals);
		expect(next.evaluationPolicy).toBe(initial.evaluationPolicy);
		expect(snapshotChanged(initial, next)).toBe(false);
	});

	test('a choice patch re-derives permissions and the prompt', () => {
		const initial = buildInitialSnapshot({ now: NOW });
		const records = choiceRecords({
			experience: false,
			functionality: false,
			marketing: true,
			measurement: false,
		});
		const next = applyPatch(initial, { explicitChoice: records.choice });
		expect(next.effectivePermissions.marketing).toBe(true);
		expect(next.effectivePermissions).toBe(next.effectivePermissions);
		expect(next.hasConsented).toBe(true);
		expect(next.promptRequirement).toEqual({ kind: 'none' });
		expect(next.activeUI).toBe('none');
		expect(snapshotChanged(initial, next)).toBe(true);
	});

	test('a resolution patch replaces the rule and the model', () => {
		const initial = buildInitialSnapshot({ now: NOW });
		expect(initial.model).toBe('opt-in');
		const next = applyPatch(initial, {
			resolution: matchedResolution(optOutRule({ prompt: 'none' })),
		});
		expect(next.model).toBe('opt-out');
		expect(next.policyRule.id).toBe('test-opt-out');
		expect(next.policyRule.model).toBe('opt-out');
		expect(next.policyRule.prompt).toBe('none');
		expect(next.promptRequirement).toEqual({ kind: 'none' });
		expect(next.effectivePermissions.marketing).toBe(true);
		expect(next.activeUI).toBe('none');
	});

	test('an explicit activeUI patch survives an unrelated re-evaluation', () => {
		const initial = buildInitialSnapshot({
			initialPolicyResolution: matchedResolution(optInRule()),
			now: NOW,
		});
		const opened = applyPatch(initial, { activeUI: 'dialog' });
		const later = applyPatch(opened, { now: NOW + 1000 });
		expect(later.activeUI).toBe('dialog');
	});
});
