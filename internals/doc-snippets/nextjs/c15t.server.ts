// #region docs:consent-server title="c15t.server.ts"
import { createConsentServer } from 'c15t/next/server';

import { consentManifest } from '@/c15t-manifest';
import { consentConfig } from '@/c15t.config';

export const consent = createConsentServer({
	config: consentConfig,
	manifest: consentManifest,
});
// #endregion docs:consent-server
