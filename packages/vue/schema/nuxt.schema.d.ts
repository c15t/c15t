// Import from the built declarations: the published tarball ships `dist` and
// `schema` only, so a `src` import would leave consumers' Nuxt schema type
// generation resolving a missing file.
import type { C15tNuxtAppConfig, C15tNuxtConfig } from '../dist/module.mjs';

export interface NuxtCustomSchema {
	appConfig?: {
		c15t?: Partial<C15tNuxtAppConfig>;
	};
	runtimeConfig?: {
		c15t?: Partial<C15tNuxtConfig>;
		public?: {
			c15t?: Partial<C15tNuxtConfig>;
		};
	};
}
