// #region docs:consent-options
import type { ConsentManifestOptions } from 'c15t/tanstack-start/server';

import { consentManifest } from './c15t-manifest';

export const consentOptions = {
	backendURL:
		import.meta.env.VITE_C15T_BACKEND_URL ?? 'https://benchmarks-inth.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
