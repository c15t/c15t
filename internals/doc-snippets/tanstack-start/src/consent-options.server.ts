// The snippets that import consent options share this module. The
// same-origin route docs publish it, because the route and the server
// function must resolve from the same backend and manifest.
// #region docs:consent-options
import type { ConsentManifestOptions } from 'c15t/tanstack-start/server';

import { consentManifest } from './c15t-manifest';

export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
