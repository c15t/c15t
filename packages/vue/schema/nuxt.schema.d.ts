// Import from the built declarations: the published tarball ships `dist` and
// `schema` only, so a `src` import would leave consumers' Nuxt schema type
// generation resolving a missing file.
import type { ConsentConfig } from '../dist/runtime/config';

export interface NuxtCustomSchema {
	appConfig?: {
		c15t?: Partial<ConsentConfig>;
	};
	runtimeConfig?: {
		c15t?: Partial<ConsentConfig>;
		public?: {
			c15t?: Partial<ConsentConfig>;
		};
	};
}
