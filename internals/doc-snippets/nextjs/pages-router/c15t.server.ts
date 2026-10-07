// #region docs:pages-consent-options title="c15t.server.ts"
import type { ConsentManifestOptions } from 'c15t/next/pages';

import { consentManifest } from '@/c15t-manifest';
import { consentConfig } from '@/c15t.config';

export const consentOptions = {
	config: consentConfig,
	manifest: consentManifest,
} satisfies ConsentManifestOptions;
// #endregion docs:pages-consent-options
