import { hosted } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

// One runtime for the page: policy, stored choices, script loading,
// iframe blocking and the reload after a revocation.
export const runtime = createConsentRuntime({
	mode: hosted({
		backendURL: 'https://your-project.inth.app',
		...testBackend('url'),
	}),
	scripts,
});
