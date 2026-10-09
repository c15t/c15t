// #region docs:consent-options
import { PUBLIC_C15T_BACKEND_URL } from '$app/env/public';
import type { ConsentManifestOptions } from '@c15t/svelte/kit';
// The policy consentManifest() in vite.config.ts downloaded. Server code
// only: the browser bundle gets `undefined`.
import { snapshot } from 'c15t/generated';

export const consentOptions = {
	// Consent choices and visit reports still go to the backend.
	backendURL: PUBLIC_C15T_BACKEND_URL,
	manifest: snapshot,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
