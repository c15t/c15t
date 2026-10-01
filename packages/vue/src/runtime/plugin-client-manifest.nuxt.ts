/**
 * Registered only in client manifest mode. That mode resolves the manifest
 * in the browser as the app starts, so the resolver and translations are
 * imported statically here: the bundler puts them in the entry and the page
 * preloads them, instead of the kernel fetching its own chunk after the
 * entry runs. The other modes never load them.
 */
import { defineNuxtPlugin } from '#imports';

import * as clientManifest from './client-manifest';
import { registerClientManifest } from './kernel';

export default defineNuxtPlugin({
	enforce: 'pre',
	name: 'c15t:client-manifest',
	setup() {
		registerClientManifest(clientManifest);
	},
});
