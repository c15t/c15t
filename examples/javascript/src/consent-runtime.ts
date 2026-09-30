// #region docs:runtime
import { hosted } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

import { scripts } from './scripts';
// #hide docs
import { testBackend } from './test-backend';
// #endhide docs

// One runtime for the page: policy, stored choices, script loading,
// iframe blocking and the reload after a revocation.
export const runtime = createConsentRuntime({
	mode: hosted({
		url: 'https://your-project.inth.app',
		// #hide docs
		...testBackend('url'),
		// #endhide docs
	}),
	scripts,
});
// #endregion docs:runtime
