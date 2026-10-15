/**
 * Nitro plugin: writes the `/init` script into the HTML shell of every
 * `ssr: false` page (see `./init-prefetch`). The module registers it unless
 * its `initPrefetch` option is `false`.
 *
 * `app.config.ts` comes from `#c15t/server-app-config`, a Nitro virtual the
 * module registers, because `useAppConfig` from `nitropack/runtime` does not
 * read `app.config.ts` on Nuxt 4. When the virtual has no config, the plugin
 * writes nothing.
 */
import {
	defineNitroPlugin,
	getRouteRules,
	useRuntimeConfig,
} from 'nitropack/runtime';

import { useServerAppConfig } from '#c15t/server-app-config';

import { writeInitPrefetchTag } from './init-prefetch';
import type { InitPrefetchRender } from './init-prefetch';

export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('render:html', (html, { event, streaming }) => {
		writeInitPrefetchTag({
			appConfig: useServerAppConfig(event) as InitPrefetchRender['appConfig'],
			context: event.context as InitPrefetchRender['context'],
			head: html.head,
			routeRules: getRouteRules(event) as InitPrefetchRender['routeRules'],
			runtimeConfig: useRuntimeConfig(
				event
			) as unknown as InitPrefetchRender['runtimeConfig'],
			streaming,
		});
	});
});
