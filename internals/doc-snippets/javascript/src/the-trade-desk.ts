// #region docs:the-trade-desk-scripts title="src/consent-scripts.ts"
import { theTradeDeskPixel } from '@c15t/integrations/the-trade-desk';

export const scripts = [
	theTradeDeskPixel({ advertiserId: 'ADVERTISER_ID', pixelIds: ['PIXEL_ID'] }),
];
// #endregion docs:the-trade-desk-scripts
