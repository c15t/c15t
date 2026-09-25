import type { ConsentConfig } from './runtime/config';

/** Module-only options. They stay out of runtime config. */
export interface ConsentModuleOptions {
	/**
	 * Add a c15t tab to Nuxt DevTools in development. The tab embeds c15t
	 * DevTools for the app's consent kernel. @default true
	 */
	devtools?: boolean;
}

/** Options accepted by the Nuxt module. */
export type ModuleOptions = Partial<ConsentConfig> & ConsentModuleOptions;
