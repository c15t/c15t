import type { ModuleOptions } from './nuxt-options';
import type { ConsentConfig } from './runtime/config';

// `app.config.ts` is typed by the `CustomAppConfig` augmentation in
// `module.ts`, which ships with the module's declarations.
declare module 'nuxt/schema' {
	interface NuxtConfig {
		c15t?: ModuleOptions;
	}
	interface PublicRuntimeConfig {
		c15t?: Partial<ConsentConfig>;
	}
}

export {};
