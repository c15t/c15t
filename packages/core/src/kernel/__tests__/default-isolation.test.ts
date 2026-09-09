import { expect, test } from 'vitest';

import { createConsentKernel } from '..';
import { evaluateConsentRecord } from '../../consent-record/evaluate';

test('default derivations agree with the evaluator across clocks and GPC inputs', () => {
	for (const now of [0, 1_900_000_000_000]) {
		for (const gpc of [false, true]) {
			const kernel = createConsentKernel({
				initialPrivacySignals: { gpc },
				now,
			});
			const snapshot = kernel.getSnapshot();
			const evaluated = evaluateConsentRecord({
				choice: null,
				gpc,
				noticeDismissal: null,
				now,
				optOuts: [],
				policy: snapshot.evaluationPolicy,
			});
			expect(snapshot.evaluatedAt).toBe(now);
			expect(snapshot.effectivePermissions).toEqual(evaluated.permissions);
			expect(snapshot.promptRequirement).toEqual(evaluated.promptRequirement);
			expect(snapshot.restrictions).toEqual(evaluated.restrictions);
			expect(snapshot.nextDeadline).toBe(evaluated.nextDeadline);
			kernel.dispose();
		}
	}
});

test('default kernels isolate choices, draft, overrides and subscribers', async () => {
	const first = createConsentKernel({
		initialDraft: { marketing: true },
		now: 1,
	});
	const second = createConsentKernel({ now: 2 });
	const untouched = second.getSnapshot();
	let secondEvents = 0;
	second.subscribe(() => {
		secondEvents += 1;
	});
	second.events.on('choice:recorded', () => {
		secondEvents += 1;
	});
	try {
		first.set.overrides({ country: 'DE', gpc: true });
		const saved = await first.commands.save('all');
		expect(saved.ok).toBe(true);
		expect(
			first.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(true);
		expect(second.getSnapshot()).toBe(untouched);
		expect(second.getSnapshot().explicitChoice).toBeNull();
		expect(second.getSnapshot().overrides).toEqual({});
		expect(second.getSnapshot().privacySignals.gpc.active).toBe(false);
		expect(secondEvents).toBe(0);
		const third = createConsentKernel();
		try {
			expect(third.getSnapshot().effectivePermissions.marketing).toBe(false);
			expect(third.getSnapshot().explicitChoice).toBeNull();
		} finally {
			third.dispose();
		}
	} finally {
		first.dispose();
		second.dispose();
	}
});

test('shared default policy and evaluator data cannot be mutated through a snapshot', () => {
	const first = createConsentKernel();
	const second = createConsentKernel();
	try {
		const snapshot = first.getSnapshot();
		expect(Reflect.set(snapshot.policyRule.validity, 'choiceMs', 0)).toBe(
			false
		);
		expect(Reflect.set(snapshot.effectivePermissions, 'marketing', true)).toBe(
			false
		);
		expect(Reflect.set(snapshot.evaluationPolicy.choice, 'maxAgeMs', 0)).toBe(
			false
		);
		expect(Reflect.set(snapshot.privacySignals.gpc, 'active', true)).toBe(
			false
		);
		expect(
			Reflect.set(snapshot.policyRule.actions.required, '0', 'customize')
		).toBe(false);
		expect(second.getSnapshot().policyRule.validity.choiceMs).toBe(
			31_536_000_000
		);
		expect(second.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(second.getSnapshot().privacySignals.gpc.active).toBe(false);
	} finally {
		first.dispose();
		second.dispose();
	}
});
