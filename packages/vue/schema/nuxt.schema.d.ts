import type { ConsentConfig } from '../src/runtime/config';

export interface NuxtCustomSchema {
	appConfig?: {
		c15t?: Partial<ConsentConfig>;
	};
	runtimeConfig?: {
		public?: {
			c15t?: Partial<ConsentConfig>;
		};
	};
}
