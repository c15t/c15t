// #region docs:statable-proxy-scripts title="src/consent-scripts.ts"
import { statableAnalytics } from '@c15t/integrations/statable-analytics';

export const scripts = [
	statableAnalytics({
		scriptUrl: 'https://cdn.example.com/js/{siteId}/s.js',
		siteId: '12345',
		trackingApi: 'https://analytics.example.com/api/event',
	}),
];
// #endregion docs:statable-proxy-scripts
