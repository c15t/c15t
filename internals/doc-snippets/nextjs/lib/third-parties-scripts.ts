// #region docs:third-parties-scripts title="lib/scripts.ts"
import { gtag } from '@c15t/integrations/google-tag';
import { googleTagManager } from '@c15t/integrations/google-tag-manager';
import type { Script } from 'c15t';

export const scripts: Script[] = [
	// Replaces <GoogleAnalytics gaId="G-XXXXXXXXXX" />
	gtag({ category: 'measurement', id: 'G-XXXXXXXXXX' }),
	// Replaces <GoogleTagManager gtmId="GTM-XXXXXXX" />
	googleTagManager({ id: 'GTM-XXXXXXX' }),
];
// #endregion docs:third-parties-scripts
