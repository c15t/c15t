/**
 * Nitro plugin: writes the `/init` script into the HTML shell of every
 * `ssr: false` page (see `./init-prefetch`). The module registers it unless
 * its `initPrefetch` option is `false`.
 *
 * Nitro's `#imports` gives Nuxt's `useAppConfig`, which reads
 * `app.config.ts`; the one in `nitropack/runtime` does not.
 */
import { defu } from 'defu';

import {
	defineNitroPlugin,
	getRouteRules,
	useAppConfig,
	useRuntimeConfig,
} from '#imports';

import type { RuntimeConsentConfig } from '../kernel';
import { buildInitPrefetchTag, insertInitPrefetchTag } from './init-prefetch';
import type { InitPrefetchRouteRule } from './init-prefetch';

export default defineNitroPlugin((nitroApp) => {
	nitroApp.hooks.hook('render:html', (html, { event, streaming }) => {
		// Nuxt streams server-rendered pages only, never a shell.
		if (streaming) {
			return;
		}
		const runtimeConfig = useRuntimeConfig(event) as {
			c15t?: { ssr?: boolean };
			public: { c15t?: Partial<RuntimeConsentConfig> };
		};
		const appConfig = useAppConfig(event) as {
			c15t?: Partial<RuntimeConsentConfig>;
		};
		const rules = getRouteRules(event) as {
			c15t?: InitPrefetchRouteRule;
			ssr?: boolean;
		};
		const context = event.context as {
			nuxt?: { noSSR?: boolean };
			security?: { nonce?: string };
		};
		const tag = buildInitPrefetchTag({
			// The same merge the Nuxt plugin makes in the browser.
			config: defu(appConfig.c15t, runtimeConfig.public.c15t),
			nonce: context.security?.nonce,
			routeRule: rules.c15t,
			// What Nuxt's renderer checks to send a shell.
			shell:
				runtimeConfig.c15t?.ssr === false ||
				rules.ssr === false ||
				context.nuxt?.noSSR === true,
		});
		if (tag) {
			insertInitPrefetchTag(html.head, tag);
		}
	});
});
