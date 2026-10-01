import type { ConsentConfig } from './runtime/config';
import type { UseNetworkBlockerOptions } from './runtime/kernel';

/** The Nuxt module's configuration under the `c15t` key. */
export interface C15tNuxtConfig extends ConsentConfig {
	/**
	 * Block `fetch` and XHR requests that match these rules until the
	 * visitor's consent allows them. Omitted or `false` disables it.
	 *
	 * Module options reach the browser through `runtimeConfig.public` as
	 * JSON, so the `onRequestBlocked` callback is not accepted here.
	 */
	networkBlocker?: Omit<UseNetworkBlockerOptions, 'onRequestBlocked'> | false;
}

/** Module-only options. They stay out of runtime config. */
export interface ConsentModuleOptions {
	/**
	 * Add a c15t tab to Nuxt DevTools in development. The tab embeds c15t
	 * DevTools for the app's consent kernel. @default true
	 */
	devtools?: boolean;
}

/** Options accepted by the Nuxt module. */
export type ModuleOptions = Partial<C15tNuxtConfig> & ConsentModuleOptions;
