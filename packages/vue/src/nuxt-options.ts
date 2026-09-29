import type { ConsentConfig } from './runtime/config';
import type {
	RuntimeConsentConfig,
	UseNetworkBlockerOptions,
} from './runtime/kernel';

/** The Nuxt module's configuration under the `c15t` key. */
export interface C15tNuxtConfig
	extends
		ConsentConfig,
		Pick<
			RuntimeConsentConfig,
			'domain' | 'iframeBlocker' | 'nonce' | 'storageConfig'
		> {
	/**
	 * Block `fetch` and XHR requests that match these rules until the
	 * visitor's consent allows them. Omitted or `false` disables it.
	 *
	 * Module options reach the browser through `runtimeConfig.public` as
	 * JSON, so the `onRequestBlocked` callback is not accepted here. Set it
	 * under `c15t.networkBlocker` in `app.config.ts` instead.
	 */
	networkBlocker?: Omit<UseNetworkBlockerOptions, 'onRequestBlocked'> | false;
}

/** Options accepted by the Nuxt module. */
export type ModuleOptions = Partial<C15tNuxtConfig>;

/**
 * The `c15t` key of `app.config.ts`, merged over the module options when
 * the app starts. App config is bundled with the app instead of passing
 * through JSON, so it also accepts functions such as
 * `networkBlocker.onRequestBlocked`.
 *
 * @example
 * ```ts
 * // app/app.config.ts
 * export default defineAppConfig({
 * 	c15t: {
 * 		networkBlocker: {
 * 			rules: [{ category: 'measurement', domain: 'tracker.example' }],
 * 			onRequestBlocked: (info) => console.info('Blocked', info.url),
 * 		},
 * 	},
 * });
 * ```
 */
export interface C15tNuxtAppConfig extends Omit<
	C15tNuxtConfig,
	'networkBlocker'
> {
	/**
	 * Block `fetch` and XHR requests that match these rules until the
	 * visitor's consent allows them. Omitted or `false` disables it. Rules
	 * set here are added to rules from the module options.
	 */
	networkBlocker?: UseNetworkBlockerOptions | false;
}
