import { custom } from '@c15t/core';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import type { ConsentManagerOptions } from '../lib/types';
import { policyFixture } from './policy-fixture';

export const iabStyleOptions = (
	overrides: Partial<ConsentManagerOptions> = {}
): ConsentManagerOptions => ({
	disableAnimation: true,
	iab: { cmpId: 28 },
	mode: custom({}),
	persistence: false,
	prefetch: {
		...policyFixture({}, { categories: ['marketing'], model: 'iab' }),
		initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
	},
	...overrides,
});
