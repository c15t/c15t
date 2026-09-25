import type { ModuleOptions } from './module-options';
import type { ConsentConfig } from './runtime/config';

declare module 'nuxt/schema' {
	interface NuxtConfig {
		c15t?: ModuleOptions;
	}
	interface PublicRuntimeConfig {
		c15t?: Partial<ConsentConfig>;
	}
	interface AppConfig {
		c15t?: Partial<ConsentConfig>;
	}
}

export {};
