// #region docs:consent-options
import { PUBLIC_C15T_BACKEND_URL } from '$app/env/public';
import type { ConsentManifestOptions } from '@c15t/svelte/kit';

// Written by the consentManifest plugin in vite.config.ts.
import { consentManifest } from './c15t-manifest';

export const consentOptions = {
	// Consent choices and visit reports still go to the backend.
	backendURL: PUBLIC_C15T_BACKEND_URL,
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
