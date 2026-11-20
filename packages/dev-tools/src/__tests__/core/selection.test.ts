import { createConsentKernel } from '@c15t/core';
import { expect, it } from 'vitest';

import { readSelection } from '../../core/selection';
import { policyResolution } from '../helpers/kernel';

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
