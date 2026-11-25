import { definePlugin } from 'nitro';
import {
	getRouteRules,
	useAppConfig,
	useRuntimeConfig,
	useServerHooks,
} from 'nuxt/server';

import { writeInitPrefetchTag } from './init-prefetch';
import type { InitPrefetchRender } from './init-prefetch';

export default definePlugin(() => {
	useServerHooks().hook('render:html', (html, { event, streaming }) => {
		const routeRules = getRouteRules(event) as InitPrefetchRender['routeRules'];
		writeInitPrefetchTag({
			appConfig: useAppConfig(event) as InitPrefetchRender['appConfig'],
			context: event.context as InitPrefetchRender['context'],
			head: html.head,
			// Nuxt gives every route `ssr: true`, and Nitro 3 drops the key
			// from a route whose rule sets `ssr: false`, so that route reads
			// `{}`. Nuxt's renderer treats a missing `ssr` as a shell too.
			routeRules: { ...routeRules, ssr: Boolean(routeRules.ssr) },
			runtimeConfig:
				useRuntimeConfig() as unknown as InitPrefetchRender['runtimeConfig'],
			streaming,
		});
	});
});
