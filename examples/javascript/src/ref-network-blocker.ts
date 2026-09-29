// Reference code for the network blocker page. No page in this example
// imports it; `bun run check-types` compiles it with the rest of the app.
// #region docs:network-blocker title="src/network-blocker.ts"
import type { ConsentKernel } from 'c15t';
import { createNetworkBlocker } from 'c15t/modules/network-blocker';

export const blockTracking = function blockTracking(kernel: ConsentKernel) {
	return createNetworkBlocker({
		kernel,
		onRequestBlocked: ({ method, url, rule }) => {
			console.info('Held back', method, url, rule?.id);
		},
		rules: [
			{
				category: 'measurement',
				domain: 'collect.example.com',
				id: 'collector',
			},
			{
				category: 'measurement',
				domain: 'example.com',
				id: 'events',
				methods: ['POST'],
				pathIncludes: '/api/track',
			},
		],
	});
};
// #endregion docs:network-blocker
