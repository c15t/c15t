// #region docs:adobe-target-websdk title="src/consent-scripts.ts"
import { adobeTarget } from '@c15t/integrations/adobe-target';

export const scripts = [
	adobeTarget({
		datastreamId: 'YOUR_DATASTREAM_ID',
		mode: 'websdk',
		orgId: 'YOUR_ORG_ID@AdobeOrg',
		version: '2.30.0',
	}),
];
// #endregion docs:adobe-target-websdk
