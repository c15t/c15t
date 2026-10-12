/**
 * Nitro plugin: applies `NUXT_PUBLIC_INTH_PROJECT_URL` to each request's
 * runtime config before Nuxt renders or the consent route answers, so the
 * server render, the route and the browser (through the payload) read one
 * value. See `./inth-project-url`.
 */
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';

import { applyInthProjectURL } from './inth-project-url';
import type { InthRuntimeConfig } from './inth-project-url';

export default defineNitroPlugin((nitroApp) => {
	const env = globalThis.process?.env ?? {};
	if (!env.NUXT_PUBLIC_INTH_PROJECT_URL) {
		return;
	}
	nitroApp.hooks.hook('request', (event) => {
		applyInthProjectURL(
			useRuntimeConfig(event) as unknown as InthRuntimeConfig,
			env
		);
	});
});
