// #region docs:runtime
import { hosted } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

import { scripts } from './scripts';

// One runtime for the page: policy, stored choices, script loading,
// iframe blocking and the reload after a revocation.
export const runtime = createConsentRuntime({
	mode: hosted({ url: 'https://your-project.inth.app' }),
	scripts,
});
// #endregion docs:runtime
