// #region docs:network-blocker title="src/lib/network-blocker.ts"
import type { UseNetworkBlockerOptions } from '@c15t/svelte';

// Pass as `networkBlocker={networkBlocker}` on ConsentManagerProvider.
export const networkBlocker: UseNetworkBlockerOptions = {
	onRequestBlocked: ({ method, url }) => {
		console.info('Blocked until consent', method, url);
	},
	rules: [
		{
			category: 'measurement',
			domain: 'google-analytics.com',
			id: 'google-analytics',
		},
		{
			category: 'marketing',
			domain: 'connect.facebook.net',
			id: 'meta-pixel',
			pathIncludes: '/signals',
		},
	],
};
// #endregion docs:network-blocker
