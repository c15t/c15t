// The snippets that import consent options share this module. The
// same-origin route docs publish it, because the route and the server
// function must resolve from the same backend and manifest.
// #region docs:consent-options
// The policy consentManifest() in vite.config.ts downloaded.
import { snapshot } from 'c15t/generated';
import type { ConsentManifestOptions } from 'c15t/tanstack-start/server';

export const consentOptions = {
	backendURL: 'https://your-project.inth.app',
	manifest: snapshot,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
