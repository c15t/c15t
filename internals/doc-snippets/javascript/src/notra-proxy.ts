// #region docs:notra-proxy-scripts title="src/consent-scripts.ts"
import { notraAnalytics } from '@c15t/integrations/notra-analytics';

export const scripts = [
	notraAnalytics({
		endpoint: 'https://notra.example.com',
		webKey: 'nwk.your_web_key',
	}),
];
// #endregion docs:notra-proxy-scripts
