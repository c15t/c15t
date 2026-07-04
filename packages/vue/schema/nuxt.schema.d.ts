import type { ConsentConfig } from '../src/runtime/config';

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
