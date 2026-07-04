import type { ConsentConfig as BaseConsentConfig } from '@c15t/schema/config';
import type { HTMLAttributes } from 'vue';

export interface ConsentManifestNuxtConfig {
	/**
	 * Enables Nuxt same-origin manifest mode. When true, the module registers
	 * server routes and the client prefetches init from `initRoute`.
	 */
	manifest?: boolean;

	/**
	 * Backend manifest URL fetched by the Nuxt server route. Defaults to
	 * `${backendURL}/manifest`.
	 */
	manifestURL?: string;

	/**
	 * Same-origin Nuxt init route used by the client. Defaults to
	 * `/api/c15t/init`.
	 */
	initRoute?: string;

	/**
	 * Same-origin Nuxt manifest passthrough route. Defaults to
	 * `/api/c15t/manifest`.
	 */
	manifestRoute?: string;
}

export interface ConsentConfig
	extends BaseConsentConfig<HTMLAttributes>,
		ConsentManifestNuxtConfig {}
