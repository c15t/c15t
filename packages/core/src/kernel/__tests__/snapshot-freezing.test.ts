import { describe, expect, test } from 'vitest';

import { createConsentKernel } from '..';
import { NOW } from '../../__tests__/fixtures/kernel-fixtures';
import { evaluateConsentRecord } from '../../consent-record/evaluate';
import { buildInitialSnapshot, freezeSnapshot } from '../snapshot';

const expectFrozenData = (value: unknown): void => {
	if (value === null || typeof value !== 'object') {
		return;
	}
	expect(Object.isFrozen(value)).toBe(true);
	expect(Reflect.set(value, '__mutation', true)).toBe(false);
	for (const nested of Object.values(value)) {
		expectFrozenData(nested);
	}
};

describe('snapshot default freezing', () => {
	test('freezes every nested default before the first snapshot is observed', () => {
		const snapshot = buildInitialSnapshot({ now: NOW });
		expectFrozenData(snapshot);
		const second = buildInitialSnapshot({ now: NOW + 1 });
		expect(second).not.toBe(snapshot);
		expect(second.evaluatedAt).toBe(NOW + 1);
		expect(snapshot.evaluatedAt).toBe(NOW);
	});

	test('freezes mutable copies even when their values equal defaults', () => {
		const snapshot = buildInitialSnapshot({ now: NOW });
		const copied = structuredClone(snapshot);
		expect(Object.isFrozen(copied.evaluationPolicy.choice)).toBe(false);
		expect(freezeSnapshot(copied)).toEqual(snapshot);
		expectFrozenData(copied);
	});

	test('copies caller values without freezing the caller objects', () => {
		const overrides = { country: 'US', gpc: false };
		const user = { externalId: 'before' };
		const snapshot = buildInitialSnapshot({
			initialOverrides: overrides,
			initialPrivacySignals: { gpc: true },
			initialUser: user,
			now: NOW,
		});
		expectFrozenData(snapshot);
		overrides.gpc = true;
		user.externalId = 'after';
		expect(snapshot.overrides.gpc).toBe(false);
		expect(snapshot.privacySignals.gpc).toEqual({
			active: false,
			detected: true,
			override: false,
		});
		expect(snapshot.user?.externalId).toBe('before');
	});

	test('copies and freezes seeded IAB authority without normalizing it early', () => {
		const authority = {
			choiceFingerprint: 'choice-v1:stale',
			confirmedAt: NOW,
			expiresAt: NOW + 1000,
			purposeConsents: { '1': true },
			purposeLegitimateInterests: {},
			specialFeatureOptIns: {},
			tcString: 'stored-tc-string',
			vendorConsents: { '7': true },
			vendorLegitimateInterests: {},
		};
		const snapshot = buildInitialSnapshot({
			initialIab: { authority, enabled: true },
			now: NOW,
		});
		expect(snapshot.iab?.authority).toEqual(authority);
		expect(snapshot.iab?.authority).not.toBe(authority);
		expectFrozenData(snapshot.iab?.authority);
		authority.purposeConsents['1'] = false;
		authority.vendorConsents['7'] = false;
		expect(snapshot.iab?.authority?.purposeConsents['1']).toBe(true);
		expect(snapshot.iab?.authority?.vendorConsents['7']).toBe(true);
	});

	test('keeps full evaluator output and server snapshots across clock changes', () => {
		for (const now of [-1, 0, NOW, Number.NaN, Number.POSITIVE_INFINITY]) {
			for (const gpc of [false, true]) {
				const config = { initialPrivacySignals: { gpc }, now };
				const kernel = createConsentKernel(config);
				try {
					const initial = kernel.getSnapshot();
					const evaluated = evaluateConsentRecord({
						choice: null,
						gpc,
						noticeDismissal: null,
						now,
						optOuts: [],
						policy: initial.evaluationPolicy,
					});
					expect(initial.effectivePermissions).toEqual(evaluated.permissions);
					expect(initial.restrictions).toEqual(evaluated.restrictions);
					expect(initial.promptRequirement).toEqual(
						evaluated.promptRequirement
					);
					expect(initial.nextDeadline).toBe(evaluated.nextDeadline);
					expect(initial).toEqual(buildInitialSnapshot(config));
					expect(initial.evaluatedAt).toBe(now);
					kernel.set.overrides({ gpc: !gpc });
					expect(kernel.getServerSnapshot()).toBe(initial);
					expectFrozenData(initial);
				} finally {
					kernel.dispose();
				}
			}
		}
	});
});
