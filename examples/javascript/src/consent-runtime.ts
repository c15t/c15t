// #region docs:runtime
import { hosted } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

import { scripts } from './scripts';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}

// One runtime for the page: policy, stored choices, script loading,
// iframe blocking and the reload after a revocation.
export const runtime = createConsentRuntime({
	mode: hosted({ url: backendURL }),
	scripts,
});
// #endregion docs:runtime
