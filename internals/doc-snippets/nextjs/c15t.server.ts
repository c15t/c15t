// #region docs:consent-options
// The policy withConsentManifest in next.config.ts downloaded. Server code
// only: importing it from a client component fails the build.
import { snapshot } from 'c15t/generated';
import type { ConsentManifestOptions } from 'c15t/next/server';

import { consentConfig } from '@/c15t.config';

export const consentOptions = {
	config: consentConfig,
	manifest: snapshot,
} satisfies ConsentManifestOptions;
// #endregion docs:consent-options
