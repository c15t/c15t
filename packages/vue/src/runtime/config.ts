import type { ConsentConfig as BaseConsentConfig } from '@c15t/schema/config';
import type { HTMLAttributes } from 'vue';

export interface ConsentManifestNuxtConfig {
	/**
	 * Enables Nuxt manifest mode. `server` registers same-origin init and
	 * manifest routes; `client` resolves the manifest in the browser and never
	 * fetches an init route. `true` is kept as an alias for `server`.
	 */
	manifest?: 'client' | 'server' | boolean;

	/**
	 * Backend or CDN manifest URL. Server mode fetches this from the Nuxt route;
	 * client mode fetches it directly in the browser. Defaults to
	 * `${backendURL}/manifest` for server routes and `manifestRoute` in client
	 * mode.
	 */
	manifestURL?: string;

	/**
	 * Optional browser-side geo microfetch used by client manifest mode. The
	 * endpoint should return `{ country, region }`. Defaults to no geo fetch,
	 * leaving the resolver on the manifest fallback/strict unknown-geo policy.
	 */
	geoURL?: string | false;

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
	extends BaseConsentConfig<HTMLAttributes>, ConsentManifestNuxtConfig {}
