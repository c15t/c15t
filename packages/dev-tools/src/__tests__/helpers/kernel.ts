import { createConsentKernel } from '@c15t/core';
import type {
	ConsentSnapshot,
	ConsentState,
	HydrationRecords,
} from '@c15t/core';

import { resolvePolicyRules } from '../../../../schema/src/types';
import type { PolicyRule } from '../../../../schema/src/types';

export const choiceRecords = (
	values: Partial<ConsentState>,
	confirmedAt = Date.now() - 1
): HydrationRecords => ({
	choice: {
		categories: Object.fromEntries(
			Object.entries(values)
				.filter(([category]) => category !== 'necessary')
				.map(([category, value]) => [
					category,
					{ basis: { kind: 'legacy-v2' }, confirmedAt, value },
				])
		),
		version: 3,
	},
});

export const policyResolution = (input: Partial<PolicyRule> = {}) => {
	const resolution = resolvePolicyRules({
		countryCode: null,
		iabEnabled: input.model === 'iab',
		regionCode: null,
		rules: [
			{
				categories: ['marketing', 'measurement', 'experience', 'functionality'],
				id: 'devtools-test',
				match: { isDefault: true },
				model: 'opt-in',
				prompt: 'choice',
				...input,
			},
		],
	});
	if (resolution.status !== 'matched') {
		throw new Error('Devtools fixture policy must resolve');
	}
	return resolution;
};

export const createConsentSnapshot = (
	overrides: Partial<ConsentSnapshot> = {}
): ConsentSnapshot => ({
	...createConsentKernel().getSnapshot(),
	...overrides,
});
