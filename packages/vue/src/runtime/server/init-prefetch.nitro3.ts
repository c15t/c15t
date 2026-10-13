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
		writeInitPrefetchTag({
			appConfig: useAppConfig(event) as InitPrefetchRender['appConfig'],
			context: event.context as InitPrefetchRender['context'],
			head: html.head,
			routeRules: getRouteRules(event) as InitPrefetchRender['routeRules'],
			runtimeConfig:
				useRuntimeConfig() as unknown as InitPrefetchRender['runtimeConfig'],
			streaming,
		});
	});
});
