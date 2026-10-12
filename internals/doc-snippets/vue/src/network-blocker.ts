// #region docs:network-blocker title="src/network-blocker.ts"
import type { UseNetworkBlockerOptions } from 'c15t/vue/vue-plugin';

export const networkBlocker = {
	onRequestBlocked: (info) => {
		console.info('Blocked until consent', info.method, info.url);
	},
	rules: [
		{ category: 'measurement', domain: 'google-analytics.com' },
		{
			category: 'marketing',
			domain: 'facebook.com',
			methods: ['POST'],
			pathIncludes: '/tr',
		},
	],
} satisfies UseNetworkBlockerOptions;
// #endregion docs:network-blocker
