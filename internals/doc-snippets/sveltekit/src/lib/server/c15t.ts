// #region docs:consent-options title="src/lib/server/c15t.ts"
import type { ConsentManifestOptions } from '@c15t/svelte/kit';

import { consentManifest } from './c15t-manifest';

export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
