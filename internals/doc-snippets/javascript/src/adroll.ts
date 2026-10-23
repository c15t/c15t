// #region docs:adroll-scripts title="src/consent-scripts.ts"
import { adrollPixel } from '@c15t/integrations/adroll';

export const scripts = [
	adrollPixel({ advertiserId: 'ADVERTISER_ID', pixelId: 'PIXEL_ID' }),
];
// #endregion docs:adroll-scripts
