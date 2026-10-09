import type { ConsentConfig } from './runtime/config';
import type {
	RuntimeConsentConfig,
	UseNetworkBlockerOptions,
} from './runtime/kernel';
import type { NuxtConsentModeConfig } from './runtime/nuxt-mode';

/** The Nuxt module's configuration under the `c15t` key. */
export interface C15tNuxtConfig
	extends
		ConsentConfig,
		NuxtConsentModeConfig,
		Pick<
			RuntimeConsentConfig,
			'gpp' | 'iframeBlocker' | 'nonce' | 'storageConfig'
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

/** Module-only options. They stay out of runtime config. */
export interface ConsentModuleOptions {
	/**
	 * What a failed build-time manifest download does in `manifest()` mode.
	 * `'fail'` stops `nuxt build` and `nuxt dev`. `'runtime'` logs a
	 * warning, and the policy is read at runtime instead. Unset, `nuxt build`
	 * fails and `nuxt dev` warns. A missing backend URL counts as a failed
	 * download. The `C15T_ON_BUILD_ERROR` environment variable overrides this
	 * option. The download waits at most 10 seconds; `nuxt prepare` never
	 * downloads.
	 */
	onBuildError?: 'fail' | 'runtime';
	/**
	 * Add a c15t tab to Nuxt DevTools in development. The tab embeds c15t
	 * DevTools for the app's consent kernel. @default true
	 */
	devtools?: boolean;
	/**
	 * Start the policy request from the HTML of `ssr: false` pages, before
	 * the app's JavaScript loads. A small inline script in the page head
	 * calls the backend's `/init`, and the app uses that response instead of
	 * sending its own request. Applies in `hosted()` mode when no
	 * `consentSource`, `experiment` or init `headers` are configured;
	 * server-rendered pages are unchanged.
	 *
	 * The script carries `nuxt-security`'s per-request nonce, or the
	 * `nonce` option. Set `false` when your Content Security Policy cannot
	 * allow it. To turn it off for some routes only, set
	 * `routeRules: { '/path': { c15t: { initPrefetch: false } } }`, for
	 * example where a client plugin changes c15t's config for that route.
	 *
	 * @default true
	 */
	initPrefetch?: boolean;
}

/** Options accepted by the Nuxt module. */
export type ModuleOptions = Partial<C15tNuxtConfig> & ConsentModuleOptions;

/**
 * The `c15t` key of `app.config.ts`, merged over the module options when
 * the app starts. App config is bundled with the app instead of passing
 * through JSON, so it also accepts functions such as
 * `networkBlocker.onRequestBlocked`. `mode` and `routePrefix` decide what
 * the build bundles and which routes the server has, so they are set in
 * `nuxt.config.ts` only.
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
	'mode' | 'networkBlocker' | 'routePrefix'
> {
	/**
	 * Block `fetch` and XHR requests that match these rules until the
	 * visitor's consent allows them. Omitted or `false` disables it. Rules
	 * set here are added to rules from the module options.
	 */
	networkBlocker?: UseNetworkBlockerOptions | false;
}
