import { createConsentKernel } from '@c15t/core';
import { expect, it } from 'vitest';

import { readSelection } from '../../core/selection';
import { choiceRecords, policyResolution } from '../helpers/kernel';

it("shows a category on under a 'none' policy, as the evaluator allows it", () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution({
			model: 'none',
			prompt: 'none',
		}),
	});
	const snapshot = kernel.getSnapshot();

	expect(snapshot.effectivePermissions.marketing).toBe(true);
	expect(readSelection(snapshot, {}, 'marketing')).toBe(true);
	kernel.dispose();
});

it('shows a category GPC denies as off until a choice is recorded', () => {
	const options = {
		initialPolicyResolution: policyResolution({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'none',
		}),
		initialPrivacySignals: { gpc: true },
	};
	const kernel = createConsentKernel(options);
	const snapshot = kernel.getSnapshot();

	expect(snapshot.effectivePermissions.marketing).toBe(false);
	expect(readSelection(snapshot, {}, 'marketing')).toBe(false);
	expect(readSelection(snapshot, {}, 'measurement')).toBe(true);
	expect(readSelection(snapshot, { marketing: true }, 'marketing')).toBe(true);
	kernel.dispose();

	const saved = createConsentKernel({
		...options,
		initialRecords: choiceRecords({ marketing: true }),
	});
	expect(readSelection(saved.getSnapshot(), {}, 'marketing')).toBe(true);
	saved.dispose();
});
